import {AddIcon} from '@sanity/icons/Add'
import {ArrowLeftIcon} from '@sanity/icons/ArrowLeft'
import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {ChevronUpIcon} from '@sanity/icons/ChevronUp'
import {ControlsIcon} from '@sanity/icons/Controls'
import {SearchIcon} from '@sanity/icons/Search'
import {Box, Button, Card, Checkbox, Flex, Stack, Text, TextInput, useClickOutsideEvent} from '@sanity/ui'
import {Popover} from '@sanity/ui/popover'
import {useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent} from 'react'
import {useClient, useSchema, type SanityDocument} from 'sanity'
import {useRouter} from 'sanity/router'
import {usePaneRouter} from 'sanity/structure'
import {styled} from 'styled-components'
import {liveHas, PRODUCTION_DATASET, sameContent, type PublishLog} from '../lib/publish'
import {columnsFor, renderValue, textOf, type Column} from './format'

/* A collection: every document of one type as a table, one row per item,
   with the columns the editor chooses (kept per collection in this browser),
   a search box and a New button. Clicking a row opens the item in the pane
   to the right; the table then folds into a compact list of the items, so the
   editor switches between them without going back. "All <items>" (or closing
   the item) brings the full table back, with its columns and search kept.

   The pane is a structure component pane (structure.ts) and takes its
   options from there. Rows come straight from the dataset: drafts,
   published documents and live copies, joined by ID, so each row can say
   where the item stands (see lib/live.ts). */

export type CollectionOptions = {
  /** The document type */
  type: string
  /** The collection's name, e.g. "Projects" */
  title: string
  /** One item, e.g. "project" */
  singular: string
  /** The field that names an item: title or name */
  nameField: string
  /** The columns shown until the editor picks their own */
  defaultColumns: string[]
  /** The field the collection is ordered by, if it has one */
  orderField?: string
}

type StagingState = 'draft' | 'staged' | 'changed'
type LiveState = 'none' | 'live' | 'behind'

type Row = {
  id: string
  /** The latest content: the draft if there is one, else the published document */
  doc: SanityDocument
  title: string
  staging: StagingState
  live: LiveState
}

const API_VERSION = '2025-02-19'

const STAGING_LABEL: Record<StagingState, string> = {draft: 'Unpublished', staged: 'Staging', changed: 'Staging · older'}
const LIVE_LABEL: Record<LiveState, string> = {none: 'Not live', live: 'Live', behind: 'Live · older'}

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
// the live site's documents from production, joined by ID
function toRows(staging: SanityDocument[], production: SanityDocument[], logs: PublishLog[], nameField: string): Row[] {
  const groups = new Map<string, {draft?: SanityDocument; published?: SanityDocument; live?: SanityDocument; log?: PublishLog}>()
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
    if (group) group.log = log
  }
  const rows: Row[] = []
  for (const [id, {draft, published, live, log}] of groups) {
    const doc = draft ?? published
    if (!doc) continue // live only: nothing here to edit
    const name = (doc as Record<string, unknown>)[nameField]
    rows.push({
      id,
      doc,
      title: typeof name === 'string' && name.trim() ? name : 'Untitled',
      staging: !published ? 'draft' : sameContent(published, doc) ? 'staged' : 'changed',
      live: !live ? 'none' : liveHas(log, doc) || sameContent(live, doc) ? 'live' : 'behind',
    })
  }
  return rows
}

export function CollectionPane(props: {options?: Record<string, unknown>; childItemId?: string; paneKey: string}) {
  const options = props.options as CollectionOptions
  const {type, title, singular, nameField, defaultColumns, orderField} = options
  const schema = useSchema()
  const schemaType = schema.get(type)
  const client = useClient({apiVersion: API_VERSION})
  const {projectId, dataset} = client.config() as {projectId: string; dataset: string}
  const router = useRouter()
  const {ChildLink, groupIndex, routerPanesState} = usePaneRouter()
  const selectedId = props.childItemId

  // The rows, kept current: both datasets are read again after each change to the type
  const [documents, setDocuments] = useState<{staging: SanityDocument[]; production: SanityDocument[]; logs: PublishLog[]} | null>(null)
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
      ])
        .then(([stagingDocs, productionDocs, logs]) => {
          if (!cancelled) setDocuments({staging: stagingDocs, production: productionDocs, logs})
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

  const rows = useMemo(() => (documents ? toRows(documents.staging, documents.production, documents.logs, nameField) : []), [documents, nameField])

  // The columns: every field of the type, with the chosen ones shown
  const allColumns = useMemo(() => columnsFor(schemaType).filter((column) => column.name !== nameField), [schemaType, nameField])
  const [visible, setVisible] = useState<string[]>(() => readStored(local(), columnsKey(type), defaultColumns))
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
    const needle = search.trim().toLowerCase()
    const matching = needle
      ? rows.filter((row) =>
          [row.title, STAGING_LABEL[row.staging], LIVE_LABEL[row.live], ...columns.map((column) => textOf(row.doc[column.name], column))]
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
  }, [rows, search, columns, allColumns, sort, orderField])

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

  return (
    <Flex direction="column" height="fill" data-tomrow-collection={compact ? 'compact' : 'table'}>
      <Card borderBottom padding={3} style={{flexShrink: 0}}>
        <Flex align="center" gap={2} wrap="wrap">
          {compact ? (
            <Button
              icon={ArrowLeftIcon}
              mode="bleed"
              text={`All ${lowerTitle}`}
              onClick={showAll}
              aria-label={`Back to all ${lowerTitle}`}
            />
          ) : (
            <Box paddingX={2} paddingY={1}>
              <Text size={1} weight="medium">
                {title}
                {documents && (
                  <span style={{color: 'var(--card-muted-fg-color)'}}> · {rows.length}</span>
                )}
              </Text>
            </Box>
          )}
          <Box flex={1} style={{minWidth: compact ? 120 : 200}}>
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
          {!compact && <ColumnChooser columns={allColumns} visible={visible} onToggle={toggleColumn} />}
          <Button
            icon={AddIcon}
            text={compact ? undefined : `New ${singular}`}
            aria-label={`New ${singular}`}
            tone="primary"
            fontSize={1}
            padding={2}
            onClick={createNew}
          />
        </Flex>
      </Card>

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
                <SortableHeader column={{name: nameField, title: 'Name'}} sort={sort} onSort={setSort} />
                <th scope="col">Status</th>
                {columns.map((column) => (
                  <SortableHeader key={column.name} column={column} sort={sort} onSort={setSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <ItemRow key={row.id} row={row} columns={columns} projectId={projectId} dataset={dataset} ChildLink={ChildLink} onOpen={open} />
              ))}
            </tbody>
          </Table>
        )}
        {documents !== null && shown.length > 0 && compact && (
          <Stack as="ul" role="list" padding={2} gap={1} style={{listStyle: 'none', margin: 0}}>
            {shown.map((row) => (
              <li key={row.id}>
                <CompactItem row={row} selected={row.id === selectedId} ChildLink={ChildLink} />
              </li>
            ))}
          </Stack>
        )}
      </Box>

      {!compact && documents !== null && rows.length > 0 && (
        <Card borderTop padding={3} style={{flexShrink: 0}}>
          <Text size={0} muted>
            Showing {shown.length} of {rows.length}
          </Text>
        </Card>
      )}
    </Flex>
  )
}

/* The table itself. Compact rows, hairline separators, the row under the
   pointer and the selected row picked out by tone; the name is the link, and
   the whole row takes the click for it. */
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  line-height: 1.3;

  th,
  td {
    text-align: left;
    padding: 9px 12px;
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

  tbody tr:hover td {
    background: var(--card-code-bg-color);
  }

  tbody tr:focus-within td {
    background: var(--card-code-bg-color);
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
`

const Status = styled.span<{$tone: 'positive' | 'caution' | 'muted'}>`
  color: ${({$tone}) =>
    $tone === 'positive' ? 'var(--card-badge-positive-fg-color)' : $tone === 'caution' ? 'var(--card-badge-caution-fg-color)' : 'var(--card-muted-fg-color)'};
`

function StatusCell({row}: {row: Row}) {
  return (
    <Flex gap={3}>
      <Status $tone={row.staging === 'staged' ? 'positive' : row.staging === 'changed' ? 'caution' : 'muted'}>
        {STAGING_LABEL[row.staging]}
      </Status>
      <Status $tone={row.live === 'live' ? 'positive' : row.live === 'behind' ? 'caution' : 'muted'}>{LIVE_LABEL[row.live]}</Status>
    </Flex>
  )
}

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
}: {
  row: Row
  columns: Column[]
  projectId: string
  dataset: string
  ChildLink: ChildLinkComponent
  onOpen: (id: string) => void
}) {
  // The name is a real link (keyboard, middle-click); a click elsewhere on the row follows it
  const onRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest('a')) return
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return
    onOpen(row.id)
  }
  return (
    <tr onClick={onRowClick}>
      <td>
        <ChildLink childId={row.id} childParameters={{type: row.doc._type}}>
          {row.title}
        </ChildLink>
      </td>
      <td>
        <StatusCell row={row} />
      </td>
      {columns.map((column) => (
        <td key={column.name} title={textOf(row.doc[column.name], column) || undefined}>
          {renderValue(row.doc[column.name], column, projectId, dataset)}
        </td>
      ))}
    </tr>
  )
}

const CompactLink = styled.a<{$selected: boolean}>`
  display: block;
  padding: 8px 10px;
  border-radius: 3px;
  color: inherit;
  text-decoration: none;
  background: ${({$selected}) => ($selected ? 'var(--card-code-bg-color)' : 'transparent')};
  box-shadow: ${({$selected}) => ($selected ? 'inset 3px 0 0 #dd341d' : 'none')};

  &:hover {
    background: var(--card-code-bg-color);
  }

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: -2px;
  }
`

function CompactItem({row, selected, ChildLink}: {row: Row; selected: boolean; ChildLink: ChildLinkComponent}) {
  return (
    <CompactLink as={ChildLink} childId={row.id} childParameters={{type: row.doc._type}} $selected={selected} aria-current={selected ? 'page' : undefined}>
      <Stack gap={2}>
        <Text size={1} weight={selected ? 'medium' : 'regular'} textOverflow="ellipsis">
          {row.title}
        </Text>
        <Text size={0}>
          <StatusCell row={row} />
        </Text>
      </Stack>
    </CompactLink>
  )
}

/* The column chooser: a checklist of the type's fields that stays open while
   several are ticked. Escape or a click outside closes it. */
function ColumnChooser({columns, visible, onToggle}: {columns: Column[]; visible: string[]; onToggle: (name: string) => void}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [popoverEl, setPopoverEl] = useState<HTMLDivElement | null>(null)
  useClickOutsideEvent(
    () => setOpen(false),
    () => [buttonRef.current, popoverEl],
  )
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false)
      buttonRef.current?.focus()
    }
  }
  return (
    <Popover
      open={open}
      portal
      placement="bottom-end"
      ref={setPopoverEl}
      content={
        <Card padding={2} onKeyDown={onKeyDown} style={{maxHeight: '60vh', overflow: 'auto', minWidth: 200}}>
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
        text="Columns"
        mode="ghost"
        fontSize={1}
        padding={2}
        selected={open}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
      />
    </Popover>
  )
}
