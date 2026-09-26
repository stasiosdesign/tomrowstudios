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
   runs again. Each action runs once at a time; Unpublish asks first. */

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
  const {validation, isValidating} = useValidationStatus(documentId, documentType, false)
  const {live, liveLog, stagingLog} = useSiteState(documentId)

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

  // One action at a time: the buttons lock while it runs, and the result is a toast
  const run = useCallback(
    async (kind: Exclude<Busy, null>, action: () => Promise<unknown>, success: {title: string; description?: string}, failure: string) => {
      if (busy) return
      setBusy(kind)
      try {
        await action()
        toast.push({status: 'success', closable: true, ...success})
      } catch (error) {
        fail(failure, error)
      } finally {
        if (mounted.current) setBusy(null)
      }
    },
    [busy, toast, fail],
  )

  const doPublishLive = () =>
    current &&
    run('live', () => publishLive(client, documentId, current._rev), {title: `${itemTitle} published live`, description: 'Staging has it now; the live site rebuilds in about a minute.'}, 'Not published live')
  const doPublishStaging = () =>
    current && run('staging', () => publishStaging(client, documentId, current._rev), {title: `${itemTitle} published to staging`, description: 'The live site is not changed.'}, 'Not published to staging')
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

  const canPublish = ready && !!current && errors.length === 0 && !isValidating && busy === null
  const canUnpublish = ready && (!!published || !!live) && busy === null
  const blockedReason = errors.length > 0 ? 'Fix the problems in the form first' : !current ? 'Nothing saved yet' : undefined
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
              text={busy === 'live' ? 'Publishing…' : busy === 'staging' ? 'Publishing to staging…' : busy === 'unpublish' ? 'Unpublishing…' : 'Publish Live'}
              disabled={!canPublish}
              title={canPublish ? `Publish ${versionLine} to the live site and staging` : blockedReason}
              onClick={doPublishLive}
            />
            <MenuButton
              id={`tomrow-publish-${documentId}`}
              button={<Button className="tomrow-cta tomrow-cta--arrow" icon={ChevronDownIcon} aria-label="More publishing options" disabled={busy !== null} />}
              popover={{portal: true, placement: 'bottom-end'}}
              menu={
                <Menu>
                  <MenuItem text="Publish live" title="Staging and the live site" disabled={!canPublish} onClick={doPublishLive} />
                  <MenuItem text="Publish staging only" title="The live site is not changed" disabled={!canPublish} onClick={doPublishStaging} />
                  <MenuItem text="Unpublish" title="Off staging and the live site; it stays here to edit" tone="critical" disabled={!canUnpublish} onClick={() => setConfirmUnpublish(true)} />
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
