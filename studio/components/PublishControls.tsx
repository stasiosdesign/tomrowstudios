import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {LaunchIcon} from '@sanity/icons/Launch'
import {Button, Flex} from '@sanity/ui'
import {Menu, MenuDivider, MenuItem} from '@sanity/ui/menu'
import {useToast} from '@sanity/ui/toast'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useClient, useEditState, useSchema, useSyncState, useValidationStatus, type SanityDocument} from 'sanity'
import {styled} from 'styled-components'
import {API_VERSION, datasetClients, failText, PublishError, publishLive, publishStaging, unpublish, type Phase, type PublishResult} from '../lib/publish'
import {advance, buildDone, currentStep, failRun, finishRun, hasFailed, isActive, isBusy, LINGER_MS, REBUILD_SLOW_MS, startRun, type Run, type RunKind} from '../lib/run'
import {isPageType, LIVE_ORIGIN, routeFor, STAGING_ORIGIN} from '../lib/site'
import {groupById, groupStatus, logId, publishStatus, STATUS_LABEL, type PublishLog, type PublishStatus, type UnpublishLog} from '../lib/status'
import {LISTEN_OPTIONS, watchReads} from '../lib/watch'
import {PAGES} from '../schemaTypes/pages'
import {AnimatedMenuButton} from './AnimatedMenuButton'
import {ConfirmDialog} from './ConfirmDialog'
import {formatDate} from './format'
import {isPermissionError, usePermissionGate} from './PermissionDialog'
import {PublishProgress} from './PublishProgress'
import {Chip, StatusChip} from './Status'
import {builtSince, useBuildStamp} from './useBuildStamp'

/* The publishing control at the top right of every document (DocumentLayout),
   in Content, in the page editor and in the Visual editor alike: the
   document's status on the left, and a "Publish Live" split button whose menu
   holds the three actions and the links to both sites. While an action runs,
   and until the live site has caught up, its stages show in a row under it
   (PublishProgress).

   The status (lib/status.ts, publishStatus) says where the version in the
   editor is published: Live, Staging, Changes in draft or Unpublished. It is
   read from what the two datasets hold, kept current as they change.

   Every action goes through the site's server route (lib/publish.ts), which
   checks who is asking: Publish live puts the exact revision in the editor on
   staging and the live site, Publish staging only on staging alone, and
   Unpublish takes it off both (the Studio keeps it as a draft). Both publish
   actions stay available when nothing has changed: publishing again simply
   runs again. One action runs at a time: the buttons wait while it does,
   then a failed one can be tried again from the progress row. The route
   reports each stage as it completes (lib/run.ts), and the live site's
   rebuild is watched through its build stamp, so what the row says is what
   has happened.

   The static pages (the page editor's singletons) publish together, the way a
   site builder publishes a site: on any of them, Publish live and Publish
   staging only take every page's latest saved version, not just the open
   one's. They share one status too (groupStatus), the same on every page,
   and have no Unpublish of their own. CMS items publish one at a time and
   are never part of it.

   Publishing, unpublishing and deleting are for the roles that may write:
   anyone else gets the permission dialog (PermissionDialog.tsx) on click,
   and nothing is sent. */

/** The static site: every page's document ID (a singleton's ID is its type) */
const SITE = PAGES.map((page) => page.type)

type SiteState = {live: SanityDocument | null; liveLog: PublishLog | null; stagingLog: UnpublishLog | null}

// What the sites hold beyond the editor's own documents: the live copy and its
// note from production, and the unpublish note from staging, kept current
function useSiteState(id: string): SiteState {
  const client = useClient({apiVersion: API_VERSION})
  const [state, setState] = useState<SiteState>({live: null, liveLog: null, stagingLog: null})
  useEffect(() => {
    const {staging, production} = datasetClients(client)
    const params = {id, logId: logId(id)}
    return watchReads({
      read: () =>
        Promise.all([
          production.fetch<{live: SanityDocument | null; log: PublishLog | null}>(`{"live": *[_id == $id][0], "log": *[_id == $logId][0]}`, params),
          staging.fetch<UnpublishLog | null>(`*[_id == $logId][0]`, params),
        ]),
      listeners: [production.listen(`*[_id in [$id, $logId]]`, params, LISTEN_OPTIONS), staging.listen(`*[_id == $logId]`, params, LISTEN_OPTIONS)],
      onRead: ([{live, log}, stagingLog]) => setState({live, liveLog: log, stagingLog}),
    })
  }, [client, id])
  return state
}

// The static site's one status (lib/status.ts, groupStatus), from every
// page's own, and each page's for the tooltip; kept current
type SiteGroup = {status: PublishStatus | null; pages: {id: string; status: PublishStatus | null}[]}
function useSiteGroup(enabled: boolean): SiteGroup | null {
  const client = useClient({apiVersion: API_VERSION})
  const [group, setGroup] = useState<SiteGroup | null>(null)
  useEffect(() => {
    if (!enabled) return undefined
    const {staging, production} = datasetClients(client)
    const params = {ids: SITE, drafts: SITE.map((id) => `drafts.${id}`), logs: SITE.map(logId)}
    const query = `*[_id in $ids || _id in $drafts || _id in $logs]`
    return watchReads({
      read: () => Promise.all([staging.fetch<SanityDocument[]>(query, params), production.fetch<SanityDocument[]>(query, params)]),
      listeners: [staging, production].map((source) => source.listen(query, params, LISTEN_OPTIONS)),
      onRead: ([onStaging, onLive]) => {
        const byId = groupById(onStaging, onLive)
        const pages = SITE.map((id) => ({id, status: publishStatus(byId.get(id) ?? {})}))
        setGroup({status: groupStatus(pages.map((page) => page.status)), pages})
      },
    })
  }, [client, enabled])
  return group
}

/** One action, as it can be run and run again: what it is, what it takes, and who may */
type Attempt = {kind: RunKind; what: string; restricted: 'publish' | 'unpublish'; action: (onPhase: (phase: Phase) => void) => Promise<PublishResult>}

export function PublishControls({documentId, documentType}: {documentId: string; documentType: string}) {
  const schema = useSchema()
  const schemaType = schema.get(documentType)
  const client = useClient({apiVersion: API_VERSION})
  const toast = useToast()

  const {draft, published, ready} = useEditState(documentId, documentType)
  const {isSyncing} = useSyncState(documentId, documentType)
  const {validation} = useValidationStatus(documentId, documentType, false)
  const {live, liveLog, stagingLog} = useSiteState(documentId)
  const isSite = isPageType(documentType) && SITE.includes(documentId)
  const siteGroup = useSiteGroup(isSite)
  const gate = usePermissionGate()

  const current = draft ?? published
  const isPage = isPageType(documentType)
  const typeTitle = schemaType?.title ?? documentType
  const itemTitle = isPage
    ? typeTitle
    : String((current as {title?: unknown})?.title ?? (current as {name?: unknown})?.name ?? '').trim() || `Untitled ${typeTitle.toLowerCase()}`

  const errors = useMemo(() => validation.filter((marker) => marker.level === 'error'), [validation])
  // A static page shows the site's status, never its own: the pages publish together
  const status = isSite ? (siteGroup?.status ?? null) : publishStatus({draft, published, live, liveLog, stagingLog})

  // The action running, or just run: its stages, kept until it clears itself
  // or is dismissed (lib/run.ts). A ref too, so the handlers below read the
  // latest without being remade.
  const [run, setRun] = useState<Run | null>(null)
  const runRef = useRef<Run | null>(null)
  const attempt = useRef<Attempt | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const update = useCallback((next: Run | null) => {
    runRef.current = next
    if (mounted.current) setRun(next)
  }, [])
  const busy = isBusy(run)
  const awaitingBuild = !!run && currentStep(run)?.key === 'build'

  // The live site's rebuild, watched through its build stamp: the last stage
  // of a live publish is done once the site was built after the live copy
  // changed (for the site, every page changes in the one transaction)
  const liveUpdatedAt = live?._updatedAt
  const buildStamp = useBuildStamp(liveUpdatedAt, awaitingBuild)
  const built = builtSince(buildStamp, liveUpdatedAt)
  const siteBehind = built === false
  const waitedLong = siteBehind && Date.now() - Date.parse(liveUpdatedAt ?? '') > REBUILD_SLOW_MS
  useEffect(() => {
    const current = runRef.current
    if (!current || currentStep(current)?.key !== 'build' || !liveUpdatedAt || built !== true) return
    // The live copy must be this publish's, not an older one's
    if (Date.parse(liveUpdatedAt) < current.startedAt - 60_000) return
    update(buildDone(current))
  }, [built, liveUpdatedAt, update])

  // A finished run clears itself after a moment; a failed one stays until dismissed
  useEffect(() => {
    if (!run || isActive(run) || hasFailed(run)) return undefined
    const timer = setTimeout(() => runRef.current === run && update(null), LINGER_MS)
    return () => clearTimeout(timer)
  }, [run, update])

  // One action at a time (the ref, so a quick second click can't slip past a
  // stale state); each stage lands as the route reports it, and how it ends
  // is kept for the row under the control
  const start = useCallback(
    async (next: Attempt) => {
      if (isBusy(runRef.current)) return
      // Only roles that may write run it; anyone else is told so, and nothing is sent
      if (!gate.allow(next.restricted)) return
      attempt.current = next
      let current = startRun(next.kind, next.what)
      update(current)
      const step = (change: (run: Run) => Run) => {
        current = change(current)
        update(current)
      }
      try {
        const result = await next.action((phase) => step((run) => advance(run, phase)))
        step((run) => finishRun(run, result))
      } catch (error) {
        if (isPermissionError(error)) {
          update(null)
          gate.deny(next.restricted)
        } else step((run) => failRun(run, failText(error), error instanceof PublishError ? error.phases : []))
      }
    },
    [gate, update],
  )
  const retry = useCallback(() => attempt.current && start(attempt.current), [start])

  // On a static page, both publish actions take the whole static site. They
  // are always available, even with nothing to publish (it runs again); only
  // problems in the open form stop them, with a message saying so.
  const site = isSite ? SITE : undefined
  const blocked = () => {
    if (errors.length === 0) return false
    toast.push({status: 'warning', closable: true, title: 'Fix the problems in the form first', description: `${errors.length} ${errors.length === 1 ? 'field needs' : 'fields need'} attention before publishing.`})
    return true
  }
  const what = isSite ? 'the site' : itemTitle
  const doPublishLive = () =>
    current && !blocked() && start({kind: 'live', what, restricted: 'publish', action: (onPhase) => publishLive(client, {id: documentId, rev: current._rev, site}, onPhase)})
  const doPublishStaging = () =>
    current && !blocked() && start({kind: 'staging', what, restricted: 'publish', action: (onPhase) => publishStaging(client, {id: documentId, rev: current._rev, site}, onPhase)})
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const doUnpublish = () => {
    setConfirmUnpublish(false)
    return start({kind: 'unpublish', what: itemTitle, restricted: 'unpublish', action: (onPhase) => unpublish(client, {id: documentId}, onPhase)})
  }

  // The detail behind the status (dates, the live site's rebuild; for the
  // static site, each page's own status) is in its tooltip
  const details: string[] = []
  if (isSite) {
    details.push('All pages publish together. CMS items are published on their own.')
    for (const page of siteGroup?.pages ?? []) {
      if (page.status) details.push(`${PAGES.find((entry) => entry.type === page.id)?.title ?? page.id}: ${STATUS_LABEL[page.status]}`)
    }
  } else if (published) details.push(`Staging: published ${formatDate(published._updatedAt, true)}`)
  if (live) {
    details.push(`Live: published ${formatDate(live._updatedAt, true)}${buildStamp ? `, site built ${formatDate(buildStamp.builtAt, true)}` : ''}`)
    if (waitedLong) details.push('The live site has not rebuilt: check the Sanity webhook (README).')
  }
  const saving = isSyncing ? 'Saving…' : errors.length > 0 ? `${errors.length} ${errors.length === 1 ? 'problem' : 'problems'} to fix` : null

  // Unpublishing is per CMS item: the static pages only publish, together
  const canUnpublish = !isSite && ready && (!!published || !!live) && !busy
  const route = routeFor(current as {_type?: string; slug?: {current?: string}} | null)
  const versionLine = current ? `the version saved ${formatDate(current._updatedAt, true)}` : ''

  return (
    <Bar data-tomrow-publish>
      <Row align="center" gap={3} wrap="wrap">
        <Flex flex={1} align="center" gap={3} wrap="wrap" style={{minWidth: 160}}>
          {!ready || (isSite && !siteGroup) ? (
            <Chip $tone="muted">Loading…</Chip>
          ) : !status ? (
            <Chip $tone="muted">New: start typing to create it</Chip>
          ) : (
            <StatusChip status={status} title={details.join('\n') || undefined} />
          )}
          {/* The rebuild shows in the progress row while there is one */}
          {status === 'live' && siteBehind && !run && <Chip $tone="muted">{waitedLong ? 'Live site not rebuilt yet' : 'Live site rebuilding…'}</Chip>}
          {saving && (
            <Chip $tone={errors.length > 0 ? 'critical' : 'muted'} title={errors.length > 0 ? 'Publishing waits until the form is valid' : undefined}>
              {saving}
            </Chip>
          )}
        </Flex>
        {ready && current && (
          <Split>
            <Button
              className="tomrow-cta"
              text={isSite ? 'Publish Site' : 'Publish Live'}
              disabled={busy}
              aria-busy={busy || undefined}
              title={busy ? 'Publishing…' : isSite ? 'Publish every page’s latest changes to the live site and staging' : `Publish ${versionLine} to the live site and staging`}
              onClick={doPublishLive}
            />
            <AnimatedMenuButton
              id={`tomrow-publish-${documentId}`}
              button={<Button className="tomrow-cta tomrow-cta--arrow" icon={ChevronDownIcon} aria-label="More publishing options" disabled={busy} aria-busy={busy || undefined} />}
              popover={{portal: true, placement: 'bottom-end'}}
              menu={
                <Menu data-tomrow-publish-menu>
                  <MenuItem text="Publish Live" title={isSite ? 'Every page, to staging and the live site' : 'Staging and the live site'} onClick={doPublishLive} />
                  <MenuItem text="Publish Staging Only" title={isSite ? 'Every page, to staging; the live site is not changed' : 'The live site is not changed'} onClick={doPublishStaging} />
                  {!isSite && (
                    <MenuItem
                      text="Unpublish"
                      title="Off staging and the live site; it stays here to edit"
                      tone="critical"
                      disabled={!canUnpublish}
                      onClick={() => gate.allow('unpublish') && setConfirmUnpublish(true)}
                    />
                  )}
                  {route && (STAGING_ORIGIN || (LIVE_ORIGIN && live)) && <MenuDivider />}
                  {route && LIVE_ORIGIN && live && <MenuItem as="a" href={`${LIVE_ORIGIN}${route}`} target="_blank" rel="noreferrer" icon={LaunchIcon} text="Live site link" />}
                  {route && STAGING_ORIGIN && <MenuItem as="a" href={`${STAGING_ORIGIN}${route}`} target="_blank" rel="noreferrer" icon={LaunchIcon} text="Staging link" />}
                </Menu>
              }
            />
          </Split>
        )}
      </Row>
      {run && <PublishProgress run={run} rebuildSlow={waitedLong} onRetry={retry} onDismiss={() => update(null)} />}

      {gate.dialog}
      {confirmUnpublish && (
        <ConfirmDialog id="tomrow-confirm-unpublish" title="Unpublish" action="Unpublish" tone="critical" onCancel={() => setConfirmUnpublish(false)} onConfirm={doUnpublish}>
          <b>{itemTitle}</b> comes off staging and the live site. It stays here to edit and publish again.
        </ConfirmDialog>
      )}
    </Bar>
  )
}

// As tall as the Content sidebar's header beside it (--tomrow-bar-height,
// studio.css), its row on the 14px inset of the title and rows beneath; the
// progress row, when there is one, under it on the grid
const Bar = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--card-border-color);
  background: var(--card-bg-color);
`

const Row = styled(Flex)`
  box-sizing: border-box;
  min-height: var(--tomrow-bar-height);
  padding: 10px 14px;
`

// One button in two halves: the outer corners the controls' (--tomrow-radius),
// the edge where the halves meet square and marked by a dark hairline
const Split = styled.div`
  display: inline-flex;
  align-items: stretch;

  & > button:first-child {
    border-radius: var(--tomrow-radius) 0 0 var(--tomrow-radius);
  }

  & > *:last-child button,
  & > button:last-child {
    border-radius: 0 var(--tomrow-radius) var(--tomrow-radius) 0;
    box-shadow: inset 1px 0 0 rgb(0 0 0 / 0.25);
  }
`
