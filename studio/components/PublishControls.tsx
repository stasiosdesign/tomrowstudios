import {ArrowLeftIcon} from '@sanity/icons/ArrowLeft'
import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {LaunchIcon} from '@sanity/icons/Launch'
import {Box, Button, Dialog, Flex, Stack, Text} from '@sanity/ui'
import {Menu, MenuButton, MenuDivider, MenuItem} from '@sanity/ui/menu'
import {useToast} from '@sanity/ui/toast'
import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
import {useClient, useEditState, useSchema, useSyncState, useValidationStatus, type SanityDocument} from 'sanity'
import {useRouter} from 'sanity/router'
import {usePaneRouter} from 'sanity/structure'
import {styled} from 'styled-components'
import {
  logId,
  PRODUCTION_DATASET,
  PublishError,
  publishLive,
  publishStaging,
  publishStatus,
  unpublish,
  type PublishLog,
  type UnpublishLog,
} from '../lib/publish'
import {PAGES} from '../schemaTypes/pages'
import {fetchBuildStamp, isPageType, LIVE_ORIGIN, routeFor, STAGING_ORIGIN, type BuildStamp} from '../lib/site'
import {formatDate} from './format'
import {Chip, StatusChip} from './Status'

/* The publishing control at the top right of every document (DocumentLayout),
   in Content, in the page editor and in the Visual editor alike: the
   document's status on the left, and a "Publish Live" split button whose menu
   holds the three actions and the links to both sites.

   The status (lib/publish.ts, publishStatus) says where the version in the
   editor is published: Live, Staging, Changes in draft or Unpublished. It is
   read from what the two datasets hold, kept current as they change.

   Every action goes through the site's server route (lib/publish.ts), which
   checks who is asking: Publish live puts the exact revision in the editor on
   staging and the live site, Publish staging only on staging alone, and
   Unpublish takes it off both (the Studio keeps it as a draft). Both publish
   actions stay available when nothing has changed: publishing again simply
   runs again. Each action runs once at a time; Unpublish asks first.

   The static pages (the page editor's singletons) publish together, the way a
   site builder publishes a site: on any of them, Publish live and Publish
   staging only take every page's latest saved version, not just the open
   one's, and the bar says so, with how many pages have changes. CMS items
   publish one at a time and are never part of it. */

/** The static site: every page's document ID (a singleton's ID is its type) */
const SITE = PAGES.map((page) => page.type)

const API_VERSION = '2025-02-19'

type Busy = 'staging' | 'live' | 'unpublish' | null

export const failText = (error: unknown): string => {
  if (error instanceof PublishError) {
    if (error.details?.missing?.length) return `${error.message} Missing: ${error.details.missing.map((item) => item.title ?? item.id).join(', ')}.`
    if (error.details?.referrers?.length) return `${error.message} Linked from: ${error.details.referrers.map((item) => item.title ?? item._id).join(', ')}.`
    return error.message
  }
  const err = error as {statusCode?: number; message?: string}
  if (err?.statusCode === 403) return 'You don’t have permission for that. Ask an administrator of the Sanity project.'
  return err?.message ?? String(error)
}

type SiteState = {live: SanityDocument | null; liveLog: PublishLog | null; stagingLog: UnpublishLog | null}

// What the sites hold beyond the editor's own documents: the live copy and its
// note from production, and the unpublish note from staging, kept current
function useSiteState(id: string): SiteState {
  const client = useClient({apiVersion: API_VERSION})
  const [state, setState] = useState<SiteState>({live: null, liveLog: null, stagingLog: null})
  useEffect(() => {
    const staging = client.withConfig({perspective: 'raw', useCdn: false})
    const production = staging.withConfig({dataset: PRODUCTION_DATASET})
    let cancelled = false
    const params = {id, logId: logId(id)}
    const load = () =>
      Promise.all([
        production.fetch<{live: SanityDocument | null; log: PublishLog | null}>(`{"live": *[_id == $id][0], "log": *[_id == $logId][0]}`, params),
        staging.fetch<UnpublishLog | null>(`*[_id == $logId][0]`, params),
      ])
        .then(([{live, log}, stagingLog]) => !cancelled && setState({live, liveLog: log, stagingLog}))
        .catch(() => undefined)
    load()
    const options = {visibility: 'query' as const, includeResult: false, events: ['mutation' as const]}
    const subscriptions = [
      production.listen(`*[_id in [$id, $logId]]`, params, options).subscribe({next: load, error: () => undefined}),
      staging.listen(`*[_id == $logId]`, params, options).subscribe({next: load, error: () => undefined}),
    ]
    return () => {
      cancelled = true
      subscriptions.forEach((subscription) => subscription.unsubscribe())
    }
  }, [client, id])
  return state
}

// How many static pages have changes the live site doesn't have, kept current
function useSitePending(enabled: boolean): number | null {
  const client = useClient({apiVersion: API_VERSION})
  const [pending, setPending] = useState<number | null>(null)
  useEffect(() => {
    if (!enabled) return undefined
    const staging = client.withConfig({perspective: 'raw', useCdn: false})
    const production = staging.withConfig({dataset: PRODUCTION_DATASET})
    const params = {ids: SITE, drafts: SITE.map((id) => `drafts.${id}`), logs: SITE.map(logId)}
    const query = `*[_id in $ids || _id in $drafts || _id in $logs]`
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = () =>
      Promise.all([staging.fetch<SanityDocument[]>(query, params), production.fetch<SanityDocument[]>(query, params)])
        .then(([onStaging, onLive]) => {
          if (cancelled) return
          const find = <T,>(docs: SanityDocument[], id: string) => (docs.find((doc) => doc._id === id) ?? null) as T | null
          const count = SITE.filter((id) => {
            const status = publishStatus({
              draft: find<SanityDocument>(onStaging, `drafts.${id}`),
              published: find<SanityDocument>(onStaging, id),
              live: find<SanityDocument>(onLive, id),
              liveLog: find<PublishLog>(onLive, logId(id)),
              stagingLog: find<UnpublishLog>(onStaging, logId(id)),
            })
            return status !== null && status !== 'live'
          }).length
          setPending(count)
        })
        .catch(() => undefined)
    load()
    const onChange = {
      next: () => {
        clearTimeout(timer)
        timer = setTimeout(load, 300)
      },
      error: () => undefined,
    }
    const options = {visibility: 'query' as const, includeResult: false, events: ['mutation' as const]}
    const subscriptions = [staging, production].map((source) => source.listen(query, params, options).subscribe(onChange))
    return () => {
      cancelled = true
      clearTimeout(timer)
      subscriptions.forEach((subscription) => subscription.unsubscribe())
    }
  }, [client, enabled])
  return pending
}

// The live site's build stamp, asked for again every 15 seconds while a rebuild is awaited
function useBuildStamp(waiting: boolean): BuildStamp | null | undefined {
  const [stamp, setStamp] = useState<BuildStamp | null | undefined>(undefined)
  useEffect(() => {
    if (!LIVE_ORIGIN) {
      setStamp(null)
      return undefined
    }
    let cancelled = false
    const load = () => fetchBuildStamp(LIVE_ORIGIN).then((result) => !cancelled && setStamp(result))
    load()
    const timer = waiting ? setInterval(load, 15_000) : undefined
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [waiting])
  return stamp
}

export function PublishControls({documentId, documentType}: {documentId: string; documentType: string}) {
  const schema = useSchema()
  const schemaType = schema.get(documentType)
  const client = useClient({apiVersion: API_VERSION})
  const toast = useToast()
  const collection = useCollectionParent()

  const {draft, published, ready} = useEditState(documentId, documentType)
  const {isSyncing} = useSyncState(documentId, documentType)
  const {validation} = useValidationStatus(documentId, documentType, false)
  const {live, liveLog, stagingLog} = useSiteState(documentId)
  const isSite = isPageType(documentType) && SITE.includes(documentId)
  const sitePending = useSitePending(isSite)

  const current = draft ?? published
  const isPage = isPageType(documentType)
  const typeTitle = schemaType?.title ?? documentType
  const itemTitle = isPage
    ? typeTitle
    : String((current as {title?: unknown})?.title ?? (current as {name?: unknown})?.name ?? '').trim() || `Untitled ${typeTitle.toLowerCase()}`

  const errors = useMemo(() => validation.filter((marker) => marker.level === 'error'), [validation])
  const status = publishStatus({draft, published, live, liveLog, stagingLog})

  const liveUpdatedAt = live?._updatedAt
  const buildStamp = useBuildStamp(!!liveUpdatedAt)
  const siteBehind = !!liveUpdatedAt && !!buildStamp && buildStamp.builtAt < liveUpdatedAt
  const waitedLong = siteBehind && Date.now() - Date.parse(liveUpdatedAt) > 5 * 60_000

  const [busy, setBusy] = useState<Busy>(null)
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const fail = useCallback((title: string, error: unknown) => toast.push({status: 'error', title, description: failText(error), closable: true, duration: 9000}), [toast])

  // One action at a time (a ref, so a quick second click can't slip past a
  // stale state), the result a toast. The buttons never lock: a click while
  // one runs is ignored, and busy is cleared however the action ends.
  const running = useRef(false)
  const run = useCallback(
    async (kind: Exclude<Busy, null>, action: () => Promise<unknown>, success: {title: string; description?: string}, failure: string) => {
      if (running.current) return
      running.current = true
      setBusy(kind)
      try {
        await action()
        toast.push({status: 'success', closable: true, ...success})
      } catch (error) {
        fail(failure, error)
      } finally {
        running.current = false
        if (mounted.current) setBusy(null)
      }
    },
    [toast, fail],
  )

  // On a static page, both publish actions take the whole static site. They
  // are always available, even with nothing to publish (it runs again); only
  // problems in the open form stop them, with a message saying so.
  const site = isSite ? SITE : undefined
  const blocked = () => {
    if (errors.length === 0) return false
    toast.push({status: 'warning', closable: true, title: 'Fix the problems in the form first', description: `${errors.length} ${errors.length === 1 ? 'field needs' : 'fields need'} attention before publishing.`})
    return true
  }
  const doPublishLive = () =>
    current &&
    !blocked() &&
    run(
      'live',
      () => publishLive(client, documentId, current._rev, site),
      isSite
        ? {title: 'Site published live', description: 'Every page’s latest changes are on staging and going live; the live site rebuilds in about a minute.'}
        : {title: `${itemTitle} published live`, description: 'Staging has it now; the live site rebuilds in about a minute.'},
      'Not published live',
    )
  const doPublishStaging = () =>
    current &&
    !blocked() &&
    run(
      'staging',
      () => publishStaging(client, documentId, current._rev, site),
      isSite
        ? {title: 'Site published to staging', description: 'Every page’s latest changes are on staging. The live site is not changed.'}
        : {title: `${itemTitle} published to staging`, description: 'The live site is not changed.'},
      'Not published to staging',
    )
  const doUnpublish = () => {
    setConfirmUnpublish(false)
    return run('unpublish', () => unpublish(client, documentId), {title: `${itemTitle} unpublished`, description: 'It is off staging and the live site, and stays here to edit.'}, 'Not unpublished')
  }

  // The detail behind the status (dates, the live site's rebuild) is in its tooltip
  const details: string[] = []
  if (published) details.push(`Staging: published ${formatDate(published._updatedAt, true)}`)
  if (live) {
    details.push(`Live: published ${formatDate(live._updatedAt, true)}${buildStamp ? `, site built ${formatDate(buildStamp.builtAt, true)}` : ''}`)
    if (waitedLong) details.push('The live site has not rebuilt: check the Sanity webhook (README).')
  }
  const saving = isSyncing ? 'Saving…' : errors.length > 0 ? `${errors.length} ${errors.length === 1 ? 'problem' : 'problems'} to fix` : null

  const canUnpublish = ready && (!!published || !!live) && busy === null
  const route = routeFor(current as {_type?: string; slug?: {current?: string}} | null)
  const versionLine = current ? `the version saved ${formatDate(current._updatedAt, true)}` : ''

  return (
    <Bar data-tomrow-publish>
      <Flex align="center" gap={3} wrap="wrap">
        {collection && <Button icon={ArrowLeftIcon} mode="bleed" fontSize={1} padding={2} text={collection.title} onClick={collection.back} aria-label={`Back to ${collection.title}`} />}
        <Flex flex={1} align="center" gap={3} wrap="wrap" style={{minWidth: 160}}>
          {!ready ? (
            <Chip $tone="muted">Loading…</Chip>
          ) : !status ? (
            <Chip $tone="muted">New: start typing to create it</Chip>
          ) : (
            <StatusChip status={status} title={details.join('\n') || undefined} />
          )}
          {isSite && (
            <Chip $tone="muted" title="Publishing from the page editor publishes every page of the site together. CMS items are published on their own.">
              {sitePending === null ? 'Publishes all pages' : sitePending === 0 ? 'All pages live' : `Publishes all pages · ${sitePending} with changes`}
            </Chip>
          )}
          {status === 'live' && siteBehind && <Chip $tone="muted">{waitedLong ? 'Live site not rebuilt yet' : 'Live site rebuilding…'}</Chip>}
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
              text={busy === 'live' ? 'Publishing…' : busy === 'staging' ? 'Publishing to staging…' : busy === 'unpublish' ? 'Unpublishing…' : isSite ? 'Publish Site' : 'Publish Live'}
              aria-busy={busy !== null}
              title={isSite ? 'Publish every page’s latest changes to the live site and staging' : `Publish ${versionLine} to the live site and staging`}
              onClick={doPublishLive}
            />
            <MenuButton
              id={`tomrow-publish-${documentId}`}
              button={<Button className="tomrow-cta tomrow-cta--arrow" icon={ChevronDownIcon} aria-label="More publishing options" />}
              popover={{portal: true, placement: 'bottom-end'}}
              menu={
                <Menu data-tomrow-publish-menu>
                  <MenuItem text={isSite ? 'Publish live · all pages' : 'Publish live'} title={isSite ? 'Every page, to staging and the live site' : 'Staging and the live site'} onClick={doPublishLive} />
                  <MenuItem text={isSite ? 'Publish staging only · all pages' : 'Publish staging only'} title={isSite ? 'Every page, to staging; the live site is not changed' : 'The live site is not changed'} onClick={doPublishStaging} />
                  <MenuItem text={isSite ? 'Unpublish this page' : 'Unpublish'} title="Off staging and the live site; it stays here to edit" tone="critical" disabled={!canUnpublish} onClick={() => setConfirmUnpublish(true)} />
                  {route && (STAGING_ORIGIN || (LIVE_ORIGIN && live)) && <MenuDivider />}
                  {route && STAGING_ORIGIN && <MenuItem as="a" href={`${STAGING_ORIGIN}${route}`} target="_blank" rel="noreferrer" icon={LaunchIcon} text="Staging link" />}
                  {route && LIVE_ORIGIN && live && <MenuItem as="a" href={`${LIVE_ORIGIN}${route}`} target="_blank" rel="noreferrer" icon={LaunchIcon} text="Live site link" />}
                </Menu>
              }
            />
          </Split>
        )}
      </Flex>

      {confirmUnpublish && (
        <ConfirmDialog id="tomrow-confirm-unpublish" title="Unpublish" action="Unpublish" tone="critical" onCancel={() => setConfirmUnpublish(false)} onConfirm={doUnpublish}>
          <b>{itemTitle}</b> comes off staging and the live site. It stays here to edit and publish again.
        </ConfirmDialog>
      )}
    </Bar>
  )
}

// When the document was opened from a collection, the way back to its list
function useCollectionParent(): {title: string; back: () => void} | null {
  const router = useRouter()
  const {groupIndex, routerPanesState} = usePaneRouter()
  const parent = routerPanesState[groupIndex - 1]?.[0]
  if (!parent || !parent.id.startsWith('collection-')) return null
  const type = parent.id.slice('collection-'.length)
  const title = type === 'shopItem' ? 'Shop' : type === 'partner' ? 'Partners' : type === 'project' ? 'Projects' : 'Back'
  return {title, back: () => router.navigate({panes: routerPanesState.slice(0, groupIndex)})}
}

const Bar = styled.div`
  flex-shrink: 0;
  padding: 10px 16px;
  border-bottom: 1px solid var(--card-border-color);
  background: var(--card-bg-color);
`

const Split = styled.div`
  display: inline-flex;
  align-items: stretch;

  & > button:first-child {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  & > *:last-child button,
  & > button:last-child {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    box-shadow: inset 1px 0 0 rgb(0 0 0 / 0.25);
  }
`

/* One line, two buttons. The action runs once: the buttons lock while it does. */
export function ConfirmDialog({id, title, action, tone, onCancel, onConfirm, children}: {id: string; title: string; action: string; tone?: 'critical'; onCancel: () => void; onConfirm: () => void; children: ReactNode}) {
  const [submitting, setSubmitting] = useState(false)
  const go = () => {
    if (submitting) return
    setSubmitting(true)
    onConfirm()
  }
  return (
    <Dialog
      id={id}
      header={title}
      width={0}
      onClose={onCancel}
      footer={
        <Box padding={3}>
          <Flex gap={2} justify="flex-end">
            <Button text="Cancel" mode="ghost" onClick={onCancel} disabled={submitting} />
            <Button text={action} tone={tone ?? 'default'} className={tone ? undefined : 'tomrow-cta'} onClick={go} disabled={submitting} autoFocus />
          </Flex>
        </Box>
      }
    >
      <Box padding={4}>
        <Stack gap={3}>
          <Text size={1}>{children}</Text>
        </Stack>
      </Box>
    </Dialog>
  )
}
