import type {FailedDocument, Phase, PublishResult} from './publish'

/* One publishing action as it runs, for the progress the Studio shows
   (components/PublishProgress.tsx): its stages, which one it is at, and how
   it ended. Plain functions with no runtime imports, so run.test.ts can run
   them as they are (npm test).

   The stages are the route's own (src/sanity/publish/index.ts): it checks
   every document first, then writes staging, then the live site; the
   Studio adds the live site's rebuild, which it watches through the site's
   build stamp (lib/site.ts). A stage is marked done only when the route
   says it is (or, for the rebuild, when the stamp says so): nothing here
   is a guess or a percentage. */

export type RunKind = 'live' | 'staging' | 'unpublish' | 'delete'
export type StepKey = 'check' | Phase | 'build'
export type StepState = 'pending' | 'running' | 'done' | 'failed'
export type Step = {key: StepKey; label: string; state: StepState}

export type Run = {
  kind: RunKind
  /** What the action takes, as a name: "the site", "Villa Alba", "3 projects" */
  what: string
  steps: Step[]
  startedAt: number
  /** When the route answered (the live site may still be rebuilding after this) */
  finishedAt?: number
  /** Why it failed: the stage marked failed has this message */
  error?: string
  /** Of several documents, the ones the route refused (the rest went through) */
  failed?: FailedDocument[]
  published?: string[]
}

const CHECK = {key: 'check' as const, label: 'Checking'}

/** Each kind's stages, in the order they happen */
export const STEPS: Record<RunKind, {key: StepKey; label: string}[]> = {
  live: [CHECK, {key: 'staging', label: 'Staging'}, {key: 'live', label: 'Live site'}, {key: 'build', label: 'Site rebuild'}],
  staging: [CHECK, {key: 'staging', label: 'Staging'}],
  unpublish: [CHECK, {key: 'live', label: 'Off the live site'}, {key: 'staging', label: 'Off staging'}],
  delete: [CHECK, {key: 'live', label: 'Off the live site'}, {key: 'staging', label: 'Deleted'}],
}

export function startRun(kind: RunKind, what: string, now = Date.now()): Run {
  return {kind, what, startedAt: now, steps: STEPS[kind].map((step, index) => ({...step, state: index === 0 ? 'running' : 'pending'}))}
}

/** A stage the route reports done: it and everything before it are done, the next one is running */
export function advance(run: Run, phase: Phase): Run {
  const at = run.steps.findIndex((step) => step.key === phase)
  if (at < 0) return run
  return {
    ...run,
    steps: run.steps.map((step, index) => ({...step, state: index <= at ? 'done' : index === at + 1 ? 'running' : 'pending'})),
  }
}

/**
 * The route answered. Every stage it runs is done; a live publish is then at
 * its rebuild, which finishes on its own (buildDone). Several documents may
 * have been refused in part: they are kept to be named; refused in full, the
 * run failed at its check, with their reasons.
 */
export function finishRun(run: Run, result: PublishResult, now = Date.now()): Run {
  if (result.published.length === 0 && result.failed.length > 0) {
    return failRun(run, result.failed.map((item) => `${item.id}: ${item.error}`).join('\n'), [], now, result.failed)
  }
  // Nothing written live (a site with nothing saved yet) means nothing to rebuild
  const rebuild = run.kind === 'live' && result.published.length > 0
  return {
    ...run,
    finishedAt: now,
    published: result.published,
    failed: result.failed,
    steps: run.steps.map((step) => ({...step, state: step.key === 'build' ? (rebuild ? 'running' : 'done') : 'done'})),
  }
}

/** The route refused or failed: the stages it had completed stay done, the one it was at is marked failed, the rest never ran */
export function failRun(run: Run, error: string, phases: Phase[], now = Date.now(), failed?: FailedDocument[]): Run {
  const done = new Set<StepKey>(phases)
  if (phases.length > 0) done.add('check')
  let marked = false
  return {
    ...run,
    finishedAt: now,
    error,
    failed,
    steps: run.steps.map((step) => {
      if (done.has(step.key)) return {...step, state: 'done'}
      if (!marked) {
        marked = true
        return {...step, state: 'failed'}
      }
      return {...step, state: 'pending'}
    }),
  }
}

/** The live site has been rebuilt with what was published */
export function buildDone(run: Run): Run {
  return {...run, steps: run.steps.map((step) => (step.key === 'build' ? {...step, state: 'done'} : step))}
}

/** Still going: the route hasn't answered, or the live site is still rebuilding */
export const isActive = (run: Run): boolean => run.steps.some((step) => step.state === 'running')

/** Whether the request itself is still in flight (no second action may start meanwhile) */
export const isBusy = (run: Run | null): boolean => !!run && run.finishedAt === undefined

export const hasFailed = (run: Run): boolean => run.steps.some((step) => step.state === 'failed')

/** The stage the run is at, if any */
export const currentStep = (run: Run): Step | undefined => run.steps.find((step) => step.state === 'running')

const VERB: Record<RunKind, string> = {live: 'published live', staging: 'published to staging', unpublish: 'unpublished', delete: 'deleted'}

/** What the run is doing, or how it ended, in a line */
export function runMessage(run: Run, options: {rebuildSlow?: boolean} = {}): string {
  const current = currentStep(run)
  if (current) {
    switch (current.key) {
      case 'check':
        return run.kind === 'unpublish' || run.kind === 'delete' ? 'Checking that nothing links to it…' : 'Checking links and the saved version…'
      case 'staging':
        return run.kind === 'unpublish' ? 'Taking it off staging…' : run.kind === 'delete' ? 'Deleting it from the Studio…' : 'Publishing to staging…'
      case 'live':
        return run.kind === 'unpublish' || run.kind === 'delete' ? 'Taking it off the live site…' : 'Copying to the live site…'
      case 'build':
        return options.rebuildSlow
          ? 'Published live, but the live site has not rebuilt yet: check the Sanity webhook (README).'
          : 'Published live. The live site is rebuilding: about a minute.'
    }
  }
  if (run.error) return run.error
  const partial = run.failed && run.failed.length > 0 ? ` ${run.failed.length} not: see below.` : ''
  switch (run.kind) {
    case 'live':
      return `${capitalise(run.what)} ${VERB.live}: the live site shows it now.${partial}`
    case 'staging':
      return `${capitalise(run.what)} ${VERB.staging}. The live site is not changed.${partial}`
    case 'unpublish':
      return `${capitalise(run.what)} ${VERB.unpublish}: off staging and the live site, kept here to edit.${partial}`
    case 'delete':
      return `${capitalise(run.what)} ${VERB.delete}.${partial}`
  }
}

const capitalise = (text: string) => text.replace(/^./, (c) => c.toUpperCase())

/** How long a finished run stays on screen before it clears itself, in milliseconds; a failure stays until dismissed */
export const LINGER_MS = 6_000

/** After this long rebuilding, the live site is probably not going to: the webhook may be off */
export const REBUILD_SLOW_MS = 5 * 60_000
