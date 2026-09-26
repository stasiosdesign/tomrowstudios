import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {LaunchIcon} from '@sanity/icons/Launch'
import {Box, Button, Dialog, Flex, Stack, Text} from '@sanity/ui'
import {Menu, MenuButton, MenuDivider, MenuItem} from '@sanity/ui/menu'
import {useToast} from '@sanity/ui/toast'
import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
import {
  useClient,
  useDocumentOperation,
  useDocumentPairPermissions,
  useDocumentStore,
  useEditState,
  useSchema,
  useSyncState,
  useValidationStatus,
  type SanityDocument,
} from 'sanity'
import {styled} from 'styled-components'
import {liveHas, logId, PRODUCTION_DATASET, PublishError, publishLive, sameContent, unpublishLive, type PublishLog} from '../lib/publish'
import {fetchBuildStamp, isPageType, LIVE_ORIGIN, routeFor, STAGING_ORIGIN, type BuildStamp} from '../lib/site'
import {formatDate} from './format'

/* The publishing control at the top right of every document (DocumentLayout),
   in Content and in the Visual editor alike: a compact status on the left,
   and a "Publish Live" split button whose menu holds the four actions.

   Status is derived from what the two datasets actually hold, compared with
   the version in the editor (the draft, or else the published document):

     New            nothing saved yet
     Unpublished    saved, on neither site
     Staging        the staging site has this version   (older: an older one)
     Live           the live site has this version      (older: an older one)
     Draft changes  edits since either site last got a version

   Publish to Staging is Sanity's publish in the staging dataset. Publish
   Live sends the exact revision in the editor to the site's server route
   (lib/publish.ts), which checks who is asking and writes to the production
   dataset. Unpublish takes the document off one site and keeps it here. Each
   action runs once at a time, and Live ones ask first, in one line. */

const API_VERSION = '2025-02-19'

type Busy = 'staging' | 'live' | 'unpublish-staging' | 'unpublish-live' | null
type Confirm = 'live' | 'unpublish-live' | 'unpublish-staging' | null
type Tone = 'default' | 'muted' | 'positive' | 'caution' | 'critical'

const failText = (error: unknown): string => {
  if (error instanceof PublishError) {
    if (error.details?.missing?.length) return `${error.message} Missing: ${error.details.missing.map((item) => item.title ?? item.id).join(', ')}.`
    if (error.details?.referrers?.length) return `${error.message} Linked from: ${error.details.referrers.map((item) => item.title ?? item._id).join(', ')}.`
    return error.message
  }
  const err = error as {statusCode?: number; message?: string}
  if (err?.statusCode === 403) return 'You don’t have permission for that. Ask an administrator of the Sanity project.'
  return err?.message ?? String(error)
}

// The document as the live site has it, and the note saying what went live, kept current
function useLiveDocument(id: string): {loading: boolean; live: SanityDocument | null; log: PublishLog | null} {
  const client = useClient({apiVersion: API_VERSION})
  const [state, setState] = useState<{loading: boolean; live: SanityDocument | null; log: PublishLog | null}>({loading: true, live: null, log: null})
  useEffect(() => {
    const production = client.withConfig({dataset: PRODUCTION_DATASET, perspective: 'raw', useCdn: false})
    let cancelled = false
    setState({loading: true, live: null, log: null})
    const load = () =>
      production
        .fetch<{live: SanityDocument | null; log: PublishLog | null}>(`{"live": *[_id == $id][0], "log": *[_id == $logId][0]}`, {id, logId: logId(id)})
        .then(({live, log}) => !cancelled && setState({loading: false, live, log}))
        .catch(() => !cancelled && setState({loading: false, live: null, log: null}))
    load()
    const subscription = production.listen(`*[_id in [$id, $logId]]`, {id, logId: logId(id)}, {visibility: 'query', includeResult: false, events: ['mutation']}).subscribe({
      next: load,
      error: () => undefined,
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
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

// Waits for Sanity's publish to settle: no draft, a newer published document
function waitForPublish(documentStore: ReturnType<typeof useDocumentStore>, id: string, type: string, previousRev: string | undefined): Promise<SanityDocument> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      subscription.unsubscribe()
      reject(new Error('Publishing to staging is taking longer than expected. Try again in a moment.'))
    }, 20_000)
    const subscription = documentStore.pair.editState(id, type).subscribe({
      next: (state) => {
        if (state.ready && !state.draft && state.published && state.published._rev !== previousRev) {
          clearTimeout(timer)
          subscription.unsubscribe()
          resolve(state.published)
        }
      },
      error: (error) => {
        clearTimeout(timer)
        reject(error)
      },
    })
  })
}

export function PublishControls({documentId, documentType}: {documentId: string; documentType: string}) {
  const schema = useSchema()
  const schemaType = schema.get(documentType)
  const client = useClient({apiVersion: API_VERSION})
  const documentStore = useDocumentStore()
  const toast = useToast()

  const {draft, published, ready} = useEditState(documentId, documentType)
  const {isSyncing} = useSyncState(documentId, documentType)
  const {validation, isValidating} = useValidationStatus(documentId, documentType, false)
  const operations = useDocumentOperation(documentId, documentType)
  const [publishPermission] = useDocumentPairPermissions({id: documentId, type: documentType, permission: 'publish'})
  const [unpublishPermission] = useDocumentPairPermissions({id: documentId, type: documentType, permission: 'unpublish'})
  const {loading: liveLoading, live, log} = useLiveDocument(documentId)

  const current = draft ?? published
  const isPage = isPageType(documentType)
  const typeTitle = schemaType?.title ?? documentType
  const itemTitle = isPage
    ? typeTitle
    : String((current as {title?: unknown})?.title ?? (current as {name?: unknown})?.name ?? '').trim() || `Untitled ${typeTitle.toLowerCase()}`

  const errors = useMemo(() => validation.filter((marker) => marker.level === 'error'), [validation])
  const stagingCurrent = !!published && !!current && sameContent(published, current)
  const liveCurrent = !!live && !!current && (liveHas(log, current) || sameContent(live, current))
  const draftChanges = !!draft && !stagingCurrent && !liveCurrent

  const liveUpdatedAt = live?._updatedAt
  const buildStamp = useBuildStamp(!!liveUpdatedAt)
  const siteBehind = !!liveUpdatedAt && !!buildStamp && buildStamp.builtAt < liveUpdatedAt
  const waitedLong = siteBehind && Date.now() - Date.parse(liveUpdatedAt) > 5 * 60_000

  const [busy, setBusy] = useState<Busy>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const fail = useCallback((title: string, error: unknown) => toast.push({status: 'error', title, description: failText(error), closable: true, duration: 9000}), [toast])

  const publishToStaging = useCallback(async () => {
    if (busy) return
    setBusy('staging')
    try {
      const previousRev = published?._rev
      operations.publish.execute()
      await waitForPublish(documentStore, documentId, documentType, previousRev)
      toast.push({status: 'success', title: `${itemTitle} published to staging`, closable: true})
    } catch (error) {
      fail('Not published to staging', error)
    } finally {
      if (mounted.current) setBusy(null)
    }
  }, [busy, published, operations.publish, documentStore, documentId, documentType, toast, itemTitle, fail])

  const doPublishLive = useCallback(async () => {
    if (busy || !current) return
    setBusy('live')
    setConfirm(null)
    try {
      await publishLive(client, documentId, current._rev)
      toast.push({status: 'success', title: `${itemTitle} published live`, description: 'The live site rebuilds now; the status says when it is there.', closable: true})
    } catch (error) {
      fail('Not published live', error)
    } finally {
      if (mounted.current) setBusy(null)
    }
  }, [busy, current, client, documentId, toast, itemTitle, fail])

  const doUnpublishLive = useCallback(async () => {
    if (busy) return
    setBusy('unpublish-live')
    setConfirm(null)
    try {
      await unpublishLive(client, documentId)
      toast.push({status: 'success', title: `${itemTitle} taken off the live site`, description: 'It stays here to edit and publish again.', closable: true})
    } catch (error) {
      fail('Not unpublished from the live site', error)
    } finally {
      if (mounted.current) setBusy(null)
    }
  }, [busy, client, documentId, toast, itemTitle, fail])

  const doUnpublishStaging = useCallback(() => {
    if (busy) return
    setBusy('unpublish-staging')
    setConfirm(null)
    try {
      operations.unpublish.execute()
      toast.push({status: 'success', title: `${itemTitle} taken off staging`, description: 'It stays here as a draft.', closable: true})
    } catch (error) {
      fail('Not unpublished from staging', error)
    } finally {
      if (mounted.current) setBusy(null)
    }
  }, [busy, operations.unpublish, toast, itemTitle, fail])

  // Status, in as few words as it can be said accurately
  const chips: {text: string; tone: Tone; detail?: string}[] = []
  if (!ready) chips.push({text: 'Loading…', tone: 'muted'})
  else if (!current) chips.push({text: 'New', tone: 'muted', detail: 'Nothing saved yet: start typing to create it.'})
  else {
    if (published) chips.push(stagingCurrent ? {text: 'Staging', tone: 'positive', detail: 'The staging site has this version.'} : {text: 'Staging · older', tone: 'caution', detail: `Staging has an older version (${formatDate(published._updatedAt, true)}).`})
    if (live) {
      chips.push(
        !liveCurrent
          ? {text: 'Live · older', tone: 'caution', detail: `The live site has an older version (${formatDate(live._updatedAt, true)}).`}
          : waitedLong
            ? {text: 'Live · site not rebuilt', tone: 'caution', detail: 'The live site has not rebuilt yet: check the Sanity webhook (README).'}
            : siteBehind
              ? {text: 'Live · rebuilding', tone: 'caution', detail: 'The live site is rebuilding with this version.'}
              : {text: 'Live', tone: 'positive', detail: buildStamp ? `The live site has this version (built ${formatDate(buildStamp.builtAt, true)}).` : 'The live site has this version.'},
      )
    } else if (liveLoading) chips.push({text: 'Live · checking', tone: 'muted'})
    if (!published && !live) chips.push({text: 'Unpublished', tone: 'muted', detail: 'Saved here, on neither site.'})
    if (draftChanges) chips.push({text: 'Draft changes', tone: 'default', detail: 'Edits since a site last got a version.'})
  }
  const saving = isSyncing ? 'Saving…' : errors.length > 0 ? `${errors.length} ${errors.length === 1 ? 'problem' : 'problems'}` : null

  const canPublish = ready && !!current && errors.length === 0 && !isValidating && busy === null
  const canLive = canPublish && !liveCurrent
  const canStaging = canPublish && !!draft && publishPermission?.granted !== false
  const canUnpublishLive = ready && !!live && busy === null
  const canUnpublishStaging = ready && !!published && busy === null && unpublishPermission?.granted !== false
  const anything = canLive || canStaging || canUnpublishLive || canUnpublishStaging
  const primary: 'live' | 'staging' = canLive || !canStaging ? 'live' : 'staging'
  const blockedReason = errors.length > 0 ? 'Fix the problems in the form first' : !current ? 'Nothing saved yet' : undefined
  const route = routeFor(current as {_type?: string; slug?: {current?: string}} | null)
  const versionLine = current ? `the version saved ${formatDate(current._updatedAt, true)}` : ''

  return (
    <Bar data-tomrow-publish>
      <Flex align="center" gap={3} wrap="wrap">
        <Flex flex={1} align="center" gap={3} wrap="wrap" style={{minWidth: 160}}>
          {chips.map((chip) => (
            <Chip key={chip.text} $tone={chip.tone} title={chip.detail}>
              {chip.text}
            </Chip>
          ))}
          {saving && (
            <Chip $tone={errors.length > 0 ? 'critical' : 'muted'} title={errors.length > 0 ? 'Publishing waits until the form is valid' : undefined}>
              {saving}
            </Chip>
          )}
        </Flex>
        {ready && current && anything && (
          <Split>
            {primary === 'live' ? (
              <Button className="tomrow-cta" text={busy === 'live' ? 'Publishing…' : 'Publish Live'} disabled={!canLive} title={canLive ? `Publish ${versionLine} to the live site` : blockedReason ?? 'The live site has this version'} onClick={() => setConfirm('live')} />
            ) : (
              <Button className="tomrow-cta" text={busy === 'staging' ? 'Publishing…' : 'Publish to Staging'} disabled={!canStaging} title={canStaging ? `Publish ${versionLine} to staging` : blockedReason} onClick={publishToStaging} />
            )}
            <MenuButton
              id={`tomrow-publish-${documentId}`}
              button={<Button className="tomrow-cta tomrow-cta--arrow" icon={ChevronDownIcon} aria-label="More publishing options" disabled={busy !== null} />}
              popover={{portal: true, placement: 'bottom-end'}}
              menu={
                <Menu>
                  <MenuItem text="Publish Live" disabled={!canLive} onClick={() => setConfirm('live')} />
                  <MenuItem text="Publish to Staging" disabled={!canStaging} onClick={publishToStaging} />
                  <MenuDivider />
                  <MenuItem text="Unpublish from Live" tone="critical" disabled={!canUnpublishLive} onClick={() => setConfirm('unpublish-live')} />
                  <MenuItem text="Unpublish from Staging" tone="critical" disabled={!canUnpublishStaging} onClick={() => setConfirm('unpublish-staging')} />
                  {route && (STAGING_ORIGIN || (LIVE_ORIGIN && live)) && <MenuDivider />}
                  {route && STAGING_ORIGIN && <MenuItem as="a" href={`${STAGING_ORIGIN}${route}`} target="_blank" rel="noreferrer" icon={LaunchIcon} text="Open on staging" />}
                  {route && LIVE_ORIGIN && live && <MenuItem as="a" href={`${LIVE_ORIGIN}${route}`} target="_blank" rel="noreferrer" icon={LaunchIcon} text="Open on the live site" />}
                </Menu>
              }
            />
          </Split>
        )}
      </Flex>

      {confirm === 'live' && (
        <ConfirmDialog id="tomrow-confirm-live" title="Publish Live" action="Publish Live" onCancel={() => setConfirm(null)} onConfirm={doPublishLive}>
          <b>{itemTitle}</b>, {versionLine}, goes to the live site{LIVE_ORIGIN ? ` (${LIVE_ORIGIN.replace(/^https?:\/\//, '')})` : ''}. Staging is not changed.
        </ConfirmDialog>
      )}
      {confirm === 'unpublish-live' && (
        <ConfirmDialog id="tomrow-confirm-unpublish-live" title="Unpublish from Live" action="Unpublish from Live" tone="critical" onCancel={() => setConfirm(null)} onConfirm={doUnpublishLive}>
          <b>{itemTitle}</b> comes off the live site. Staging is not changed, and it stays here to edit.
        </ConfirmDialog>
      )}
      {confirm === 'unpublish-staging' && (
        <ConfirmDialog id="tomrow-confirm-unpublish-staging" title="Unpublish from Staging" action="Unpublish from Staging" tone="critical" onCancel={() => setConfirm(null)} onConfirm={doUnpublishStaging}>
          <b>{itemTitle}</b> comes off the staging site and becomes a draft here. The live site is not changed.
        </ConfirmDialog>
      )}
    </Bar>
  )
}

const Bar = styled.div`
  flex-shrink: 0;
  padding: 8px 12px;
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

const Chip = styled.span<{$tone: Tone}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 16px;
  cursor: default;
  color: ${({$tone}) =>
    $tone === 'positive'
      ? 'var(--card-badge-positive-fg-color)'
      : $tone === 'caution'
        ? 'var(--card-badge-caution-fg-color)'
        : $tone === 'critical'
          ? 'var(--card-badge-critical-fg-color)'
          : $tone === 'muted'
            ? 'var(--card-muted-fg-color)'
            : 'var(--card-fg-color)'};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    opacity: ${({$tone}) => ($tone === 'muted' ? 0.4 : 1)};
  }
`

/* One line, two buttons. The action runs once: the buttons lock while it does. */
function ConfirmDialog({id, title, action, tone, onCancel, onConfirm, children}: {id: string; title: string; action: string; tone?: 'critical'; onCancel: () => void; onConfirm: () => void; children: ReactNode}) {
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
