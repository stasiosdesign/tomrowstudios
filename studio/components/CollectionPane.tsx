import {AddIcon} from '@sanity/icons/Add'
import {ArrowLeftIcon} from '@sanity/icons/ArrowLeft'
import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {ChevronUpIcon} from '@sanity/icons/ChevronUp'
import {ControlsIcon} from '@sanity/icons/Controls'
import {SearchIcon} from '@sanity/icons/Search'
import {TrashIcon} from '@sanity/icons/Trash'
import {Box, Button, Card, Checkbox, Flex, Stack, Text, TextInput, useClickOutsideEvent} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {Popover} from '@sanity/ui/popover'
import {useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent} from 'react'
import {useClient, useSchema, type SanityDocument} from 'sanity'
import {useRouter} from 'sanity/router'
import {usePaneRouter} from 'sanity/structure'
import {styled} from 'styled-components'
import {
  deleteDocument,
  PRODUCTION_DATASET,
  publishLive,
  publishStaging,
  publishStatus,
  STATUS_LABEL,
  unpublish,
  type PublishLog,
  type PublishStatus,
  type UnpublishLog,
} from '../lib/publish'
import {columnsFor, renderValue, textOf, type Column} from './format'
import {isPermissionError, usePermissionGate, type RestrictedAction} from './PermissionDialog'
import {useAnimatedOpen} from './AnimatedMenuButton'
import {ConfirmDialog, failText} from './PublishControls'
import {PANE_HEADING_PADDING_Y, PaneHeading} from './PaneHeading'
import {StatusChip} from './Status'

/* A collection: every document of one type as a table, one row per item,
   with its status (always shown) and the columns the editor chooses (none at
   first; the choice is kept per collection in this browser), a search box and
   a New button. Select mode ticks several items for one action on them all:
   Publish live, Publish staging only, Unpublish or Delete, each item through
   the same route as the publishing control, failures reported by name. Clicking a row opens the item in the pane
   to the right; the table then folds into a compact list of the items, so the
   editor switches between them without going back. "All <items>" (or closing
   the item) brings the full table back, with its columns and search kept.

   The pane is a structure component pane (structure.ts) and takes its
   options from there. Rows come straight from the dataset: drafts,
   published documents, live copies and the publishing notes, joined by ID,
   so each row can say where the item stands (lib/publish.ts, publishStatus). */

export type CollectionOptions = {
  /** The document type */
  type: string
  /** The collection's name, e.g. "Projects" */
  title: string
  /** One item, e.g. "project" */
  singular: string
  /** The field that names an item: title or name */
  nameField: string
  /** The field the collection is ordered by, if it has one */
  orderField?: string
}

type Row = {
  id: string
  /** The latest content: the draft if there is one, else the published document */
  doc: SanityDocument
  title: string
  status: PublishStatus
}

const API_VERSION = '2025-02-19'

const columnsKey = (type: string) => `tomrow.columns.${type}`
const searchKey = (type: string) => `tomrow.search.${type}`

function readStored<T>(storage: Storage | undefined, key: string, fallback: T): T {
  try {
    const raw = storage?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStored(storage: Storage | undefined, key: string, value: unknown) {
  try {
    storage?.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable (private windows): the preference just isn't kept
  }
}

const local = () => (typeof window === 'undefined' ? undefined : window.localStorage)
const session = () => (typeof window === 'undefined' ? undefined : window.sessionStorage)

const publishedId = (id: string) => (id.startsWith('drafts.') ? id.slice(7) : id)

// Every document of the type: drafts and published documents from staging,
// the live site's documents from production, and each site's publishing
// notes, joined by ID
type Documents = {staging: SanityDocument[]; production: SanityDocument[]; logs: PublishLog[]; stagingLogs: UnpublishLog[]}

function toRows({staging, production, logs, stagingLogs}: Documents, nameField: string): Row[] {
  const groups = new Map<string, {draft?: SanityDocument; published?: SanityDocument; live?: SanityDocument; liveLog?: PublishLog; stagingLog?: UnpublishLog}>()
  for (const doc of staging) {
    const id = publishedId(doc._id)
    const group = groups.get(id) ?? {}
    if (doc._id.startsWith('drafts.')) group.draft = doc
    else group.published = doc
    groups.set(id, group)
  }
  for (const doc of production) {
    const group = groups.get(doc._id) ?? {}
    group.live = doc
    groups.set(doc._id, group)
  }
  for (const log of logs) {
    const group = groups.get(log.document)
    if (group) group.liveLog = log
  }
  for (const log of stagingLogs) {
    const group = groups.get(log.document)
    if (group) group.stagingLog = log
  }
  const rows: Row[] = []
  for (const [id, group] of groups) {
    const doc = group.draft ?? group.published
    const status = publishStatus(group)
    if (!doc || !status) continue // live only: nothing here to edit
    const name = (doc as Record<string, unknown>)[nameField]
    rows.push({id, doc, title: typeof name === 'string' && name.trim() ? name : 'Untitled', status})
  }
  return rows
}

export function CollectionPane(props: {options?: Record<string, unknown>; childItemId?: string; paneKey: string}) {
  const options = props.options as CollectionOptions
  const {type, title, singular, nameField, orderField} = options
  const schema = useSchema()
  const schemaType = schema.get(type)
  const client = useClient({apiVersion: API_VERSION})
  const {projectId, dataset} = client.config() as {projectId: string; dataset: string}
  const router = useRouter()
  const {ChildLink, groupIndex, routerPanesState} = usePaneRouter()
  const selectedId = props.childItemId

  // The rows, kept current: both datasets are read again after each change to the type
  const [documents, setDocuments] = useState<Documents | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const staging = client.withConfig({perspective: 'raw', useCdn: false})
    const production = staging.withConfig({dataset: PRODUCTION_DATASET})
    // Drafts and published documents; never a dotted ID, which Sanity keeps private
    const query = `*[_type == $type && (count(string::split(_id, ".")) == 1 || _id in path("drafts.**"))]`
    const load = () =>
      Promise.all([
        staging.fetch<SanityDocument[]>(query, {type}),
        production.fetch<SanityDocument[]>(query, {type}),
        production.fetch<PublishLog[]>(`*[_type == "publishLog" && document in *[_type == $type]._id]`, {type}),
        staging.fetch<UnpublishLog[]>(`*[_type == "publishLog" && state == "unpublished"]`),
      ])
        .then(([stagingDocs, productionDocs, logs, stagingLogs]) => {
          if (!cancelled) setDocuments({staging: stagingDocs, production: productionDocs, logs, stagingLogs})
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message)
        })
    load()
    const onChange = {
      next: () => {
        clearTimeout(timer)
        timer = setTimeout(load, 300)
      },
      error: (err: Error) => setError(err.message),
    }
    const options = {visibility: 'query' as const, includeResult: false, events: ['mutation' as const]}
    const subscriptions = [staging, production].map((source) => source.listen(`*[_type == $type || _type == "publishLog"]`, {type}, options).subscribe(onChange))
    return () => {
      cancelled = true
      clearTimeout(timer)
      subscriptions.forEach((subscription) => subscription.unsubscribe())
    }
  }, [client, type])

  const rows = useMemo(() => (documents ? toRows(documents, nameField) : []), [documents, nameField])

  // The columns: every field of the type, with the chosen ones shown (none
  // until the editor picks some; the name and the status are always there)
  const allColumns = useMemo(() => columnsFor(schemaType).filter((column) => column.name !== nameField), [schemaType, nameField])
  const [visible, setVisible] = useState<string[]>(() => readStored<string[]>(local(), columnsKey(type), []))
  const toggleColumn = useCallback(
    (name: string) => {
      setVisible((current) => {
        const next = current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
        writeStored(local(), columnsKey(type), next)
        return next
      })
    },
    [type],
  )
  const columns = useMemo(
    () => allColumns.filter((column) => visible.includes(column.name)),
    [allColumns, visible],
  )

  // Search and sort, kept for the session so coming back finds the table as it was
  const [search, setSearchState] = useState<string>(() => readStored(session(), searchKey(type), ''))
  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value)
      writeStored(session(), searchKey(type), value)
    },
    [type],
  )
  const [sort, setSort] = useState<{name: string; direction: 'asc' | 'desc'} | null>(null)

  const shown = useMemo(() => {
    // The compact list has no search box: it always lists every item
    const needle = selectedId ? '' : search.trim().toLowerCase()
    const matching = needle
      ? rows.filter((row) =>
          [row.title, STATUS_LABEL[row.status], ...columns.map((column) => textOf(row.doc[column.name], column))]
            .join(' ')
            .toLowerCase()
            .includes(needle),
        )
      : rows
    const compare = (a: Row, b: Row): number => {
      if (sort) {
        const column = allColumns.find((item) => item.name === sort.name)
        const av = a.doc[sort.name]
        const bv = b.doc[sort.name]
        const result =
          column?.numeric || typeof av === 'number'
            ? (av == null ? Infinity : Number(column?.name.startsWith('_') ? Date.parse(String(av)) : av)) -
              (bv == null ? Infinity : Number(column?.name.startsWith('_') ? Date.parse(String(bv)) : bv))
            : textOf(av, column ?? {name: sort.name, title: sort.name}).localeCompare(textOf(bv, column ?? {name: sort.name, title: sort.name}))
        return sort.direction === 'asc' ? result : -result
      }
      if (orderField) {
        const ao = (a.doc[orderField] as number | undefined) ?? Infinity
        const bo = (b.doc[orderField] as number | undefined) ?? Infinity
        if (ao !== bo) return ao - bo
      }
      return a.title.localeCompare(b.title)
    }
    return [...matching].sort(compare)
  }, [rows, search, selectedId, columns, allColumns, sort, orderField])

  // Opening an item: its ID as this pane's child, so the item opens beside the list
  const open = useCallback(
    (id: string) => {
      router.navigate({panes: [...routerPanesState.slice(0, groupIndex + 1), [{id, params: {type}}]]})
    },
    [router, routerPanesState, groupIndex, type],
  )
  const createNew = useCallback(() => open(crypto.randomUUID()), [open])
  const showAll = useCallback(() => {
    router.navigate({panes: routerPanesState.slice(0, groupIndex + 1)})
  }, [router, routerPanesState, groupIndex])

  const compact = Boolean(selectedId)
  const lowerTitle = title.toLowerCase()

  // Select mode: tick items, then one action for them all
  const toast = useToast()
  const gate = usePermissionGate()
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirm, setConfirm] = useState<{action: 'unpublish' | 'delete'; ids: string[]} | null>(null)
  const togglePick = useCallback((id: string) => {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const stopSelecting = useCallback(() => {
    setSelecting(false)
    setPicked(new Set())
  }, [])
  // Items that no longer exist drop out of the selection
  const pickedIds = useMemo(() => shown.filter((row) => picked.has(row.id)).map((row) => row.id), [shown, picked])
  const allPicked = shown.length > 0 && pickedIds.length === shown.length

  // One action over several items, one at a time through the same route as
  // the publishing control; the items that fail stay selected and are named
  const runBulk = useCallback(
    async (action: BulkAction, ids: string[]) => {
      if (bulkBusy || ids.length === 0) return
      setConfirm(null)
      // Only roles that may write run it; anyone else is told so, and nothing is sent
      if (!gate.allow(RESTRICTED[action])) return
      setBulkBusy(true)
      const run = {live: publishLive, staging: publishStaging, unpublish, delete: deleteDocument}[action]
      const failed: {id: string; title: string; reason: string; denied: boolean}[] = []
      for (const id of ids) {
        try {
          await run(client, id)
        } catch (err) {
          failed.push({id, title: rows.find((row) => row.id === id)?.title ?? id, reason: failText(err), denied: isPermissionError(err)})
        }
      }
      setBulkBusy(false)
      setPicked(new Set(failed.map((item) => item.id)))
      if (action === 'delete' && selectedId && ids.includes(selectedId) && !failed.some((item) => item.id === selectedId)) showAll()
      const done = ids.length - failed.length
      const what = (count: number) => (count === 1 ? singular : lowerTitle)
      // A refusal because of the user's role is the dialog, not a technical list
      if (failed.some((item) => item.denied)) gate.deny(RESTRICTED[action])
      if (failed.length > 0 && failed.every((item) => item.denied)) return
      if (failed.length === 0) {
        toast.push({status: 'success', closable: true, title: `${ids.length} ${what(ids.length)} ${BULK_DONE[action]}`})
      } else {
        toast.push({
          status: done > 0 ? 'warning' : 'error',
          closable: true,
          duration: 15000,
          title: `${done} of ${ids.length} ${what(ids.length)} ${BULK_DONE[action]}`,
          description: failed.map((item) => `${item.title}: ${item.denied ? 'not permitted for your role' : item.reason}`).join('\n'),
        })
      }
    },
    [bulkBusy, client, rows, selectedId, showAll, singular, lowerTitle, toast, gate],
  )

  return (
    <Flex direction="column" height="fill" data-tomrow-collection={compact ? 'compact' : 'table'}>
      <Card borderBottom style={{flexShrink: 0, padding: compact ? '12px 8px 12px 6px' : `${PANE_HEADING_PADDING_Y}px 14px`}}>
        <Flex align="center" gap={2} wrap="wrap">
          {compact ? (
            <Button icon={ArrowLeftIcon} mode="bleed" text={title} onClick={showAll} aria-label={`Back to all ${lowerTitle}`} />
          ) : (
            <Box flex={1} style={{minWidth: 120}}>
              <PaneHeading>
                {title}
                {documents && <span className="pane-heading__count"> ({rows.length})</span>}
              </PaneHeading>
            </Box>
          )}
          {compact && <Box flex={1} />}
          {!compact && (
            <Box style={{width: 220, maxWidth: '100%'}}>
              <TextInput
                icon={SearchIcon}
                fontSize={1}
                padding={2}
                placeholder={`Search ${lowerTitle}…`}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                clearButton={search.length > 0}
                onClear={() => setSearch('')}
                aria-label={`Search ${lowerTitle}`}
              />
            </Box>
          )}
          {!compact && (
            <Button
              text={selecting ? 'Done' : 'Select'}
              mode="ghost"
              fontSize={1}
              padding={2}
              selected={selecting}
              disabled={bulkBusy}
              onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
            />
          )}
          {!compact && <ColumnChooser columns={allColumns} visible={visible} onToggle={toggleColumn} />}
          <Button
            icon={AddIcon}
            text={compact ? undefined : `New ${singular}`}
            aria-label={`New ${singular}`}
            className="tomrow-white"
            fontSize={1}
            padding={2}
            onClick={createNew}
          />
        </Flex>
      </Card>

      {!compact && selecting && (
        <Card borderBottom paddingX={4} paddingY={2} style={{flexShrink: 0}}>
          <Flex align="center" gap={2} wrap="wrap">
            <Box flex={1} paddingX={2}>
              <Text size={1} muted={pickedIds.length === 0}>
                {bulkBusy ? 'Working…' : pickedIds.length === 0 ? `Tick the ${lowerTitle} to act on` : `${pickedIds.length} selected`}
              </Text>
            </Box>
            <Button text="Publish live" className="tomrow-cta" fontSize={1} padding={2} disabled={bulkBusy || pickedIds.length === 0} onClick={() => runBulk('live', pickedIds)} />
            <Button text="Publish staging only" mode="ghost" fontSize={1} padding={2} disabled={bulkBusy || pickedIds.length === 0} onClick={() => runBulk('staging', pickedIds)} />
            <Button text="Unpublish" mode="ghost" tone="critical" fontSize={1} padding={2} disabled={bulkBusy || pickedIds.length === 0} onClick={() => gate.allow('unpublish') && setConfirm({action: 'unpublish', ids: pickedIds})} />
            <Button text="Delete" mode="ghost" tone="critical" icon={TrashIcon} fontSize={1} padding={2} disabled={bulkBusy || pickedIds.length === 0} onClick={() => gate.allow('delete') && setConfirm({action: 'delete', ids: pickedIds})} />
          </Flex>
        </Card>
      )}

      <Box flex={1} overflow="auto">
        {error && (
          <Card padding={4} tone="critical">
            <Text size={1}>Couldn’t load the {lowerTitle}: {error}</Text>
          </Card>
        )}
        {!error && documents === null && (
          <Box padding={4}>
            <Text size={1} muted>
              Loading…
            </Text>
          </Box>
        )}
        {documents !== null && shown.length === 0 && (
          <Box padding={4}>
            <Text size={1} muted>
              {rows.length === 0 ? `No ${lowerTitle} yet.` : `Nothing matches “${search}”.`}
            </Text>
          </Box>
        )}
        {documents !== null && shown.length > 0 && !compact && (
          <Table>
            <thead>
              <tr>
                {selecting && (
                  <th scope="col" className="pick">
                    <Checkbox
                      checked={allPicked}
                      indeterminate={pickedIds.length > 0 && !allPicked}
                      disabled={bulkBusy}
                      onChange={() => setPicked(allPicked ? new Set() : new Set(shown.map((row) => row.id)))}
                      aria-label={`Select all ${lowerTitle}`}
                    />
                  </th>
                )}
                <SortableHeader column={{name: nameField, title: 'Name'}} sort={sort} onSort={setSort} />
                <th scope="col">Status</th>
                {columns.map((column) => (
                  <SortableHeader key={column.name} column={column} sort={sort} onSort={setSort} />
                ))}
                <th scope="col" className="actions">
                  <span hidden>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <ItemRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  projectId={projectId}
                  dataset={dataset}
                  ChildLink={ChildLink}
                  onOpen={open}
                  picking={selecting}
                  picked={picked.has(row.id)}
                  onPick={bulkBusy ? undefined : togglePick}
                  onDelete={bulkBusy ? undefined : (id) => gate.allow('delete') && setConfirm({action: 'delete', ids: [id]})}
                />
              ))}
            </tbody>
          </Table>
        )}
        {documents !== null && shown.length > 0 && compact && (
          <Stack as="ul" role="list" style={{listStyle: 'none', margin: 0, padding: 0}}>
            {shown.map((row) => (
              <li key={row.id}>
                <CompactItem row={row} selected={row.id === selectedId} ChildLink={ChildLink} />
              </li>
            ))}
          </Stack>
        )}
      </Box>

      {!compact && documents !== null && rows.length > 0 && (
        <Card borderTop paddingX={4} paddingY={3} style={{flexShrink: 0}}>
          <Text size={0} muted>
            Showing {shown.length} of {rows.length}
          </Text>
        </Card>
      )}

      {gate.dialog}
      {confirm && (
        <ConfirmDialog
          id="tomrow-confirm-bulk"
          title={confirm.action === 'delete' ? 'Delete' : 'Unpublish'}
          action={confirm.action === 'delete' ? 'Delete' : 'Unpublish'}
          tone="critical"
          onCancel={() => setConfirm(null)}
          onConfirm={() => runBulk(confirm.action, confirm.ids)}
        >
          {confirmText(confirm, rows, singular, lowerTitle)}
        </ConfirmDialog>
      )}
    </Flex>
  )
}

type BulkAction = 'live' | 'staging' | 'unpublish' | 'delete'

const RESTRICTED: Record<BulkAction, RestrictedAction> = {live: 'publish', staging: 'publish', unpublish: 'unpublish', delete: 'delete'}

const BULK_DONE: Record<BulkAction, string> = {
  live: 'published live',
  staging: 'published to staging',
  unpublish: 'unpublished',
  delete: 'deleted',
}

function confirmText(confirm: {action: 'unpublish' | 'delete'; ids: string[]}, rows: Row[], singular: string, plural: string) {
  const names = confirm.ids.map((id) => rows.find((row) => row.id === id)?.title ?? id)
  const which = names.length === 1 ? <b>{names[0]}</b> : <b>{`${names.length} ${plural}`}</b>
  return confirm.action === 'delete' ? (
    <>
      {which} will be deleted from the Studio, staging and the live site. This cannot be undone.
    </>
  ) : (
    <>
      {which} will come off staging and the live site, and {names.length === 1 ? `the ${singular} stays` : 'they stay'} here to edit and publish again.
    </>
  )
}

/* The table itself. Hairline separators, the row under the pointer picked out
   by tone; the name is the link, and the whole row takes the click for it (in
   Select mode, the click ticks it). The last cell holds the row's Delete,
   shown on hover. */
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  line-height: 1.3;

  th,
  td {
    text-align: left;
    padding: 12px 14px;
    border-bottom: 1px solid var(--card-border-color);
    white-space: nowrap;
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: middle;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--card-bg-color);
    color: var(--card-muted-fg-color);
    font-weight: 500;
    font-size: 12px;
  }

  thead th button {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: inherit;
  }

  thead th button:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: 2px;
    border-radius: 2px;
  }

  tbody tr {
    cursor: pointer;
  }

  tbody tr:hover td,
  tbody tr:focus-within td {
    background: var(--tomrow-hover);
  }

  td a {
    color: inherit;
    text-decoration: none;
    font-weight: 500;
  }

  td a:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: 2px;
    border-radius: 2px;
  }

  th.pick,
  td.pick {
    width: 1px;
    padding-right: 0;
  }

  th.actions,
  td.actions {
    width: 1px;
    padding-top: 0;
    padding-bottom: 0;
    text-align: right;
  }

  td.actions button {
    opacity: 0;
  }

  tbody tr:hover td.actions button,
  td.actions button:focus-visible {
    opacity: 1;
  }
`

function SortableHeader({
  column,
  sort,
  onSort,
}: {
  column: Column
  sort: {name: string; direction: 'asc' | 'desc'} | null
  onSort: (sort: {name: string; direction: 'asc' | 'desc'} | null) => void
}) {
  const active = sort?.name === column.name
  const next = () => onSort(!active ? {name: column.name, direction: 'asc'} : sort?.direction === 'asc' ? {name: column.name, direction: 'desc'} : null)
  return (
    <th scope="col" aria-sort={active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={next} title={`Sort by ${column.title}`}>
        {column.title}
        {active && (sort?.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />)}
      </button>
    </th>
  )
}

type ChildLinkComponent = ReturnType<typeof usePaneRouter>['ChildLink']

function ItemRow({
  row,
  columns,
  projectId,
  dataset,
  ChildLink,
  onOpen,
  picking,
  picked,
  onPick,
  onDelete,
}: {
  row: Row
  columns: Column[]
  projectId: string
  dataset: string
  ChildLink: ChildLinkComponent
  onOpen: (id: string) => void
  picking: boolean
  picked: boolean
  onPick?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  // The name is a real link (keyboard, middle-click); a click elsewhere on the
  // row follows it, or in Select mode ticks the row
  const onRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest('a, button, input, label')) return
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return
    if (picking) onPick?.(row.id)
    else onOpen(row.id)
  }
  return (
    <tr onClick={onRowClick} aria-selected={picking ? picked : undefined}>
      {picking && (
        <td className="pick">
          <Checkbox checked={picked} disabled={!onPick} onChange={() => onPick?.(row.id)} aria-label={`Select ${row.title}`} />
        </td>
      )}
      <td>
        <ChildLink childId={row.id} childParameters={{type: row.doc._type}}>
          {row.title}
        </ChildLink>
      </td>
      <td>
        <StatusChip status={row.status} />
      </td>
      {columns.map((column) => (
        <td key={column.name} title={textOf(row.doc[column.name], column) || undefined}>
          {renderValue(row.doc[column.name], column, projectId, dataset)}
        </td>
      ))}
      <td className="actions">
        <Button icon={TrashIcon} mode="bleed" tone="critical" fontSize={1} padding={2} disabled={!onDelete} onClick={() => onDelete?.(row.id)} aria-label={`Delete ${row.title}`} title="Delete" />
      </td>
    </tr>
  )
}

const CompactLink = styled.a<{$selected: boolean}>`
  display: block;
  padding: 12px 14px;
  border-bottom: 1px solid var(--card-border-color);
  color: inherit;
  text-decoration: none;
  background: ${({$selected}) => ($selected ? 'var(--tomrow-selected)' : 'transparent')};

  &:hover {
    background: ${({$selected}) => ($selected ? 'var(--tomrow-selected)' : 'var(--tomrow-hover)')};
  }

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: -2px;
  }
`

function CompactItem({row, selected, ChildLink}: {row: Row; selected: boolean; ChildLink: ChildLinkComponent}) {
  return (
    <CompactLink as={ChildLink} childId={row.id} childParameters={{type: row.doc._type}} $selected={selected} aria-current={selected ? 'page' : undefined}>
      <Text size={1} weight={selected ? 'medium' : 'regular'} textOverflow="ellipsis">
        {row.title}
      </Text>
    </CompactLink>
  )
}

/* The column chooser: a checklist of the type's fields that stays open while
   several are ticked. Escape or a click outside closes it. */
function ColumnChooser({columns, visible, onToggle}: {columns: Column[]; visible: string[]; onToggle: (name: string) => void}) {
  // Opens and closes smoothly (AnimatedMenuButton.tsx, useAnimatedOpen)
  const {mounted, isOpen, closing, show, hide} = useAnimatedOpen()
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [popoverEl, setPopoverEl] = useState<HTMLDivElement | null>(null)
  useClickOutsideEvent(hide, () => [buttonRef.current, popoverEl])
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      hide()
      buttonRef.current?.focus()
    }
  }
  return (
    <Popover
      open={mounted}
      portal
      placement="bottom-end"
      ref={setPopoverEl}
      content={
        <Card data-tomrow-pop data-tomrow-pop-closing={closing ? '' : undefined} padding={2} onKeyDown={onKeyDown} style={{maxHeight: '60vh', overflow: 'auto', minWidth: 200}}>
          <Stack gap={1}>
            {columns.map((column) => (
              <Flex key={column.name} as="label" align="center" gap={3} padding={2} style={{cursor: 'pointer', borderRadius: 3}}>
                <Checkbox checked={visible.includes(column.name)} onChange={() => onToggle(column.name)} />
                <Text size={1}>{column.title}</Text>
              </Flex>
            ))}
          </Stack>
        </Card>
      }
    >
      <Button
        ref={buttonRef}
        icon={ControlsIcon}
        aria-label="Columns"
        title="Choose the columns"
        mode="ghost"
        fontSize={1}
        padding={2}
        selected={isOpen}
        onClick={() => (isOpen ? hide() : show())}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      />
    </Popover>
  )
}
