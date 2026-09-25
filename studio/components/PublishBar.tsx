import {EllipsisHorizontalIcon} from '@sanity/icons/EllipsisHorizontal'
import {LaunchIcon} from '@sanity/icons/Launch'
import {Box, Button, Dialog, Flex, Radio, Stack, Text} from '@sanity/ui'
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
import {usePaneRouter} from 'sanity/structure'
import {styled} from 'styled-components'
import {liveId, missingLiveReferences, publishLive, sameContent, unpublishLive, type MissingReference} from '../lib/live'
import {ENVIRONMENT_LABEL, fetchBuildStamp, isPageType, LIVE_ORIGIN, routeFor, STAGING_ORIGIN, type BuildStamp, type Environment} from '../lib/site'
import {formatDate} from './format'

/* The publishing bar, along the bottom of every document (DocumentLayout).
   It says where the item stands on the left, and on the right holds the
   three things that can be done with it:

   - Publish to staging   Sanity's publish: the draft becomes the published
                          document. Staging renders it on the next request.
   - Publish live         copies the published document to its live copy
                          (lib/live.ts). Production rebuilds from live copies
                          (the Sanity webhook), so the change shows on the
                          live site about a minute later; the bar watches the
                          site's build stamp and says when it has.
   - the ⋯ menu           unpublish (from staging, the live site or both),
                          discard the draft, delete, and links to the item on
                          each site.

   Every step is guarded: validation errors block both publishes, a
   reference to something not yet live blocks Publish live, and each action
   runs once at a time and asks first, naming the item and where it goes. */

const API_VERSION = '2025-02-19'

type Busy = 'staging' | 'live' | 'unpublish' | 'discard' | 'delete' | null

type Dialogs =
  | {kind: 'publish-live'}
  | {kind: 'references'; missing: MissingReference[]}
  | {kind: 'unpublish'}
  | {kind: 'delete'}
  | {kind: 'discard'}
  | null

const errorText = (error: unknown): string => {
  const err = error as {statusCode?: number; message?: string}
  if (err?.statusCode === 403) return 'You don’t have permission for that. Ask an administrator of the Sanity project.'
  return err?.message ?? String(error)
}

// The live copy, kept current
function useLiveCopy(id: string): {loading: boolean; live: SanityDocument | null} {
  const documentStore = useDocumentStore()
  const [state, setState] = useState<{loading: boolean; live: SanityDocument | null}>({loading: true, live: null})
  useEffect(() => {
    setState({loading: true, live: null})
    const subscription = documentStore
      .listenQuery(`*[_id == $id][0]`, {id: liveId(id)}, {tag: 'tomrow.live-copy'})
      .subscribe({
        next: (live: SanityDocument | null) => setState({loading: false, live}),
        error: () => setState({loading: false, live: null}),
      })
    return () => subscription.unsubscribe()
  }, [documentStore, id])
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

// Waits for the pair to settle after a publish: no draft, a published document newer than before
function waitForPublish(
  documentStore: ReturnType<typeof useDocumentStore>,
  id: string,
  type: string,
  previousRev: string | undefined,
): Promise<SanityDocument> {
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

export function PublishBar({documentId, documentType}: {documentId: string; documentType: string}) {
  const schema = useSchema()
  const schemaType = schema.get(documentType)
  const client = useClient({apiVersion: API_VERSION})
  const documentStore = useDocumentStore()
  const toast = useToast()
  const {closeCurrent} = usePaneRouter()

  const editState = useEditState(documentId, documentType)
  const {isSyncing} = useSyncState(documentId, documentType)
  const {validation, isValidating} = useValidationStatus(documentId, documentType, false)
  const operations = useDocumentOperation(documentId, documentType)
  const [publishPermission] = useDocumentPairPermissions({id: documentId, type: documentType, permission: 'publish'})
  const [unpublishPermission] = useDocumentPairPermissions({id: documentId, type: documentType, permission: 'unpublish'})
  const [deletePermission] = useDocumentPairPermissions({id: documentId, type: documentType, permission: 'delete'})
  const {loading: liveLoading, live} = useLiveCopy(documentId)

  const {draft, published, ready} = editState
  const current = draft ?? published
  const isPage = isPageType(documentType)
  const typeTitle = schemaType?.title ?? documentType
  const itemTitle = isPage
    ? typeTitle
    : String((current as {title?: unknown})?.title ?? (current as {name?: unknown})?.name ?? '').trim() || `Untitled ${typeTitle.toLowerCase()}`

  const errors = useMemo(() => validation.filter((marker) => marker.level === 'error'), [validation])
  const liveCurrent = !!live && !!published && sameContent(published, live)
  const liveBehind = !!live && !liveCurrent

  // The live site rebuilds after every change to a live copy; until its build
  // stamp is newer than the copy, the change is on its way
  const liveUpdatedAt = live?._updatedAt
  const buildStamp = useBuildStamp(!!liveUpdatedAt)
  const siteBehind = !!liveUpdatedAt && !!buildStamp && buildStamp.builtAt < liveUpdatedAt
  const waitedLong = siteBehind && Date.now() - Date.parse(liveUpdatedAt) > 5 * 60_000

  const [busy, setBusy] = useState<Busy>(null)
  const [dialog, setDialog] = useState<Dialogs>(null)
  const [environment, setEnvironment] = useState<Environment | 'both'>('staging')
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const fail = useCallback(
    (title: string, error: unknown) => {
      toast.push({status: 'error', title, description: errorText(error), closable: true, duration: 8000})
    },
    [toast],
  )

  const publishToStaging = useCallback(async () => {
    if (busy) return
    setBusy('staging')
    try {
      const previousRev = published?._rev
      operations.publish.execute()
      await waitForPublish(documentStore, documentId, documentType, previousRev)
      toast.push({status: 'success', title: `${itemTitle} is on staging`, closable: true})
    } catch (error) {
      fail('Couldn’t publish to staging', error)
    } finally {
      if (mounted.current) setBusy(null)
    }
  }, [busy, published, operations.publish, documentStore, documentId, documentType, toast, itemTitle, fail])

  const doPublishLive = useCallback(async () => {
    if (busy) return
    setBusy('live')
    setDialog(null)
    try {
      let release = published
      if (draft) {
        const previousRev = published?._rev
        operations.publish.execute()
        release = await waitForPublish(documentStore, documentId, documentType, previousRev)
      }
      if (!release) throw new Error('There is nothing to publish yet.')
      const missing = await missingLiveReferences(client, release)
      if (missing.length > 0) {
        setDialog({kind: 'references', missing})
        return
      }
      await publishLive(client, release)
      toast.push({
        status: 'success',
        title: `${itemTitle} is going live`,
        description: 'The live site rebuilds now; the bar will say when it is there.',
        closable: true,
      })
    } catch (error) {
      fail('Couldn’t publish live', error)
    } finally {
      if (mounted.current) setBusy(null)
    }
  }, [busy, published, draft, operations.publish, documentStore, documentId, documentType, client, toast, itemTitle, fail])

  const doUnpublish = useCallback(async () => {
    if (busy) return
    setBusy('unpublish')
    setDialog(null)
    const where = environment
    try {
      if ((where === 'live' || where === 'both') && live) await unpublishLive(client, documentId)
      if ((where === 'staging' || where === 'both') && published) {
        operations.unpublish.execute()
      }
      const label = where === 'both' ? 'staging and the live site' : ENVIRONMENT_LABEL[where]
      toast.push({status: 'success', title: `${itemTitle} is off ${label}`, description: 'It stays here to edit and publish again.', closable: true})
    } catch (error) {
      fail('Couldn’t unpublish', error)
    } finally {
      if (mounted.current) setBusy(null)
    }
  }, [busy, environment, live, client, documentId, published, operations.unpublish, toast, itemTitle, fail])

  const doDiscard = useCallback(() => {
    setDialog(null)
    operations.discardChanges.execute()
    toast.push({status: 'info', title: 'Draft changes discarded', description: 'Back to what is on staging.', closable: true})
  }, [operations.discardChanges, toast])

  const doDelete = useCallback(async () => {
    if (busy) return
    setBusy('delete')
    setDialog(null)
    try {
      if (live) await unpublishLive(client, documentId)
      operations.delete.execute()
      toast.push({status: 'success', title: `${itemTitle} deleted`, closable: true})
      closeCurrent()
    } catch (error) {
      fail('Couldn’t delete', error)
    } finally {
      if (mounted.current) setBusy(null)
    }
  }, [busy, live, client, documentId, operations.delete, toast, itemTitle, closeCurrent, fail])

  // Where the item stands, in words
  const saved: {text: string; tone: Tone} = !ready
    ? {text: 'Loading…', tone: 'muted'}
    : isSyncing
      ? {text: 'Saving…', tone: 'muted'}
      : !current
        ? {text: 'Not saved yet: start typing to create it', tone: 'muted'}
        : errors.length > 0
          ? {text: `${errors.length} ${errors.length === 1 ? 'problem' : 'problems'} to fix before publishing`, tone: 'critical'}
          : draft
            ? {text: 'Draft saved', tone: 'default'}
            : {text: 'Saved', tone: 'default'}

  const staging: {text: string; tone: Tone} = !published
    ? {text: 'Not on staging', tone: 'muted'}
    : draft
      ? {text: 'Staging is behind your draft', tone: 'caution'}
      : {text: 'On staging', tone: 'positive'}

  const liveState: {text: string; tone: Tone} = liveLoading
    ? {text: 'Live: checking…', tone: 'muted'}
    : !live
      ? {text: 'Not live', tone: 'muted'}
      : liveBehind
        ? {text: 'Live site is behind staging', tone: 'caution'}
        : waitedLong
          ? {text: 'Live copy saved, but the live site has not rebuilt yet', tone: 'caution'}
          : siteBehind
            ? {text: 'Live: rebuilding the site…', tone: 'caution'}
            : buildStamp
              ? {text: `Live · site built ${formatDate(buildStamp.builtAt, true)}`, tone: 'positive'}
              : {text: 'Live', tone: 'positive'}

  const canPublishStaging = ready && !!draft && errors.length === 0 && !isValidating && publishPermission?.granted !== false && busy === null
  const canPublishLive =
    ready && !!current && (!!draft || (!!published && !liveCurrent)) && errors.length === 0 && !isValidating && publishPermission?.granted !== false && busy === null
  const stagingReason = !draft
    ? published
      ? 'Staging already has this version'
      : 'Nothing to publish yet'
    : errors.length > 0
      ? 'Fix the problems in the form first'
      : publishPermission?.granted === false
        ? 'You don’t have permission to publish'
        : undefined
  const liveReason =
    !draft && published && liveCurrent
      ? 'The live site already has this version'
      : !current
        ? 'Nothing to publish yet'
        : errors.length > 0
          ? 'Fix the problems in the form first'
          : undefined

  const route = routeFor(current as {_type?: string; slug?: {current?: string}} | null)

  return (
    <Bar data-tomrow-publish-bar>
      <Flex align="center" gap={3} wrap="wrap">
        <Stack flex={1} gap={2} style={{minWidth: 200}}>
          <Flex align="center" gap={2} wrap="wrap">
            <Text size={1} weight="medium" textOverflow="ellipsis">
              {itemTitle}
            </Text>
            <Dot tone={saved.tone}>{saved.text}</Dot>
          </Flex>
          <Flex align="center" gap={3} wrap="wrap">
            <Dot tone={staging.tone}>{staging.text}</Dot>
            <Dot tone={liveState.tone}>{liveState.text}</Dot>
          </Flex>
        </Stack>

        <Flex align="center" gap={2}>
          <MenuButton
            id={`tomrow-more-${documentId}`}
            button={<Button icon={EllipsisHorizontalIcon} mode="bleed" aria-label="More actions" disabled={busy !== null} />}
            popover={{portal: true, placement: 'top-end'}}
            menu={
              <Menu>
                {route && STAGING_ORIGIN && (
                  <MenuItem as="a" href={`${STAGING_ORIGIN}${route}`} target="_blank" rel="noreferrer" icon={LaunchIcon} text="Open on staging" />
                )}
                {route && LIVE_ORIGIN && live && (
                  <MenuItem as="a" href={`${LIVE_ORIGIN}${route}`} target="_blank" rel="noreferrer" icon={LaunchIcon} text="Open on the live site" />
                )}
                {route && (STAGING_ORIGIN || (LIVE_ORIGIN && live)) && <MenuDivider />}
                <MenuItem
                  text="Unpublish…"
                  disabled={(!published && !live) || unpublishPermission?.granted === false}
                  onClick={() => {
                    setEnvironment(live && !published ? 'live' : 'staging')
                    setDialog({kind: 'unpublish'})
                  }}
                />
                <MenuItem text="Discard draft changes…" disabled={!draft || !published} onClick={() => setDialog({kind: 'discard'})} />
                {!isPage && (
                  <>
                    <MenuDivider />
                    <MenuItem text={`Delete ${typeTitle.toLowerCase()}…`} tone="critical" disabled={!current || deletePermission?.granted === false} onClick={() => setDialog({kind: 'delete'})} />
                  </>
                )}
              </Menu>
            }
          />
          <Button
            text={busy === 'staging' ? 'Publishing…' : 'Publish to staging'}
            mode={draft ? 'default' : 'ghost'}
            tone="default"
            disabled={!canPublishStaging}
            title={stagingReason}
            onClick={publishToStaging}
          />
          <Button
            className="tomrow-cta"
            text={busy === 'live' ? 'Publishing…' : 'Publish live'}
            disabled={!canPublishLive}
            title={liveReason}
            onClick={() => setDialog({kind: 'publish-live'})}
          />
        </Flex>
      </Flex>

      {dialog?.kind === 'publish-live' && (
        <Confirm
          id="tomrow-publish-live"
          title={`Publish ${itemTitle} live?`}
          confirmText="Publish live"
          onCancel={() => setDialog(null)}
          onConfirm={doPublishLive}
        >
          <Stack gap={3}>
            <Text size={1}>
              {draft
                ? `Your draft changes go to staging and to the live site, ${LIVE_ORIGIN || 'production'}.`
                : `The version on staging goes to the live site, ${LIVE_ORIGIN || 'production'}.`}
            </Text>
            <Text size={1} muted>
              Only this {isPage ? 'page' : typeTitle.toLowerCase()} changes. The live site rebuilds in about a minute.
            </Text>
          </Stack>
        </Confirm>
      )}

      {dialog?.kind === 'references' && (
        <Confirm id="tomrow-references" title="Not published live" confirmText="OK" onCancel={() => setDialog(null)} onConfirm={() => setDialog(null)}>
          <Stack gap={3}>
            <Text size={1}>
              {itemTitle} links to {dialog.missing.length === 1 ? 'something that is' : 'things that are'} not on the live site yet, so its page would break there. Publish{' '}
              {dialog.missing.length === 1 ? 'it' : 'them'} live first:
            </Text>
            <Stack as="ul" gap={2} style={{paddingLeft: 20}}>
              {dialog.missing.map((item) => (
                <Text key={item.id} as="li" size={1}>
                  {item.title}
                  {item.type && <span style={{color: 'var(--card-muted-fg-color)'}}> · {schema.get(item.type)?.title ?? item.type}</span>}
                </Text>
              ))}
            </Stack>
          </Stack>
        </Confirm>
      )}

      {dialog?.kind === 'unpublish' && (
        <Confirm
          id="tomrow-unpublish"
          title={`Unpublish ${itemTitle}`}
          confirmText={`Unpublish from ${environment === 'both' ? 'both' : ENVIRONMENT_LABEL[environment]}`}
          tone="critical"
          onCancel={() => setDialog(null)}
          onConfirm={doUnpublish}
        >
          <Stack gap={4}>
            <Text size={1}>Take {itemTitle} off which site? It stays here to edit and publish again.</Text>
            <Stack gap={3} role="radiogroup" aria-label="Unpublish from">
              <Choice name="env" value="staging" checked={environment === 'staging'} disabled={!published} onChange={() => setEnvironment('staging')}>
                Staging only {published ? '' : '(not on staging)'}
              </Choice>
              <Choice name="env" value="live" checked={environment === 'live'} disabled={!live} onChange={() => setEnvironment('live')}>
                The live site only {live ? '' : '(not live)'}
              </Choice>
              <Choice name="env" value="both" checked={environment === 'both'} disabled={!published || !live} onChange={() => setEnvironment('both')}>
                Both
              </Choice>
            </Stack>
            {(environment === 'live' || environment === 'both') && (
              <Text size={1} muted>
                The live site rebuilds without it in about a minute.
              </Text>
            )}
          </Stack>
        </Confirm>
      )}

      {dialog?.kind === 'discard' && (
        <Confirm id="tomrow-discard" title="Discard draft changes?" confirmText="Discard" tone="critical" onCancel={() => setDialog(null)} onConfirm={doDiscard}>
          <Text size={1}>{itemTitle} goes back to the version on staging. The live site is not affected.</Text>
        </Confirm>
      )}

      {dialog?.kind === 'delete' && (
        <Confirm id="tomrow-delete" title={`Delete ${itemTitle}?`} confirmText="Delete" tone="critical" onCancel={() => setDialog(null)} onConfirm={doDelete}>
          <Stack gap={3}>
            <Text size={1}>
              This removes {itemTitle} from the Studio
              {published && live ? ', from staging and from the live site' : published ? ' and from staging' : live ? ' and from the live site' : ''}. It cannot be undone.
            </Text>
          </Stack>
        </Confirm>
      )}
    </Bar>
  )
}

type Tone = 'default' | 'muted' | 'positive' | 'caution' | 'critical'

const Bar = styled.div`
  flex-shrink: 0;
  padding: 10px 12px;
  border-top: 1px solid var(--card-border-color);
  background: var(--card-bg-color);
`

const DotText = styled.span<{$tone: Tone}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 16px;
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

function Dot({tone, children}: {tone: Tone; children: ReactNode}) {
  return <DotText $tone={tone}>{children}</DotText>
}

function Choice({name, value, checked, disabled, onChange, children}: {name: string; value: string; checked: boolean; disabled?: boolean; onChange: () => void; children: ReactNode}) {
  return (
    <Flex as="label" align="center" gap={3} style={{cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1}}>
      <Radio name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} />
      <Text size={1}>{children}</Text>
    </Flex>
  )
}

/* A small confirming dialog: what is about to happen, Cancel and one
   action, which runs once (the buttons lock while it does). */
function Confirm({
  id,
  title,
  confirmText,
  tone,
  onCancel,
  onConfirm,
  children,
}: {
  id: string
  title: string
  confirmText: string
  tone?: 'critical'
  onCancel: () => void
  onConfirm: () => void
  children: ReactNode
}) {
  const [submitting, setSubmitting] = useState(false)
  const confirm = () => {
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
            <Button text={confirmText} tone={tone ?? 'default'} className={tone ? undefined : 'tomrow-cta'} onClick={confirm} disabled={submitting} autoFocus />
          </Flex>
        </Box>
      }
    >
      <Box padding={4}>{children}</Box>
    </Dialog>
  )
}

