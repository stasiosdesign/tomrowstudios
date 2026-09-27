import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import type {SanityDocument} from 'sanity'
import {contentKey, groupById, groupStatus, logId, publishStatus, type PublishLog, type UnpublishLog} from './status.ts'

/* The publishing status rules (status.ts): what every status chip in the
   Studio says. Run with `npm test` in studio/. */

const doc = (id: string, content: Record<string, unknown>, system: Partial<SanityDocument> = {}): SanityDocument => ({
  _id: id,
  _type: 'project',
  _rev: `rev-${id}`,
  _createdAt: '2026-09-01T00:00:00Z',
  _updatedAt: '2026-09-01T00:00:00Z',
  ...content,
  ...system,
})

const liveLog = (id: string, of: SanityDocument): PublishLog => ({
  _id: logId(id),
  document: id,
  sourceId: of._id,
  sourceRev: of._rev,
  contentKey: contentKey(of) ?? '',
  publishedAt: '2026-09-02T00:00:00Z',
})

const unpublishLog = (id: string, of: SanityDocument): UnpublishLog => ({
  _id: logId(id),
  document: id,
  state: 'unpublished',
  contentKey: contentKey(of) ?? '',
  unpublishedAt: '2026-09-03T00:00:00Z',
})

describe('contentKey', () => {
  it('ignores system fields and key order', () => {
    const a = doc('a', {title: 'Villa', meta: {x: 1, y: 2}})
    const b = doc('drafts.a', {meta: {y: 2, x: 1}, title: 'Villa'}, {_rev: 'other', _updatedAt: '2026-09-05T00:00:00Z'})
    assert.equal(contentKey(a), contentKey(b))
  })

  it('tells different content apart', () => {
    assert.notEqual(contentKey(doc('a', {title: 'Villa'})), contentKey(doc('a', {title: 'House'})))
  })

  it('keeps array order', () => {
    assert.notEqual(contentKey(doc('a', {tags: ['x', 'y']})), contentKey(doc('a', {tags: ['y', 'x']})))
  })

  it('is null without a document', () => {
    assert.equal(contentKey(null), null)
  })
})

describe('publishStatus', () => {
  const v1 = doc('a', {title: 'Villa'})
  const v2Draft = doc('drafts.a', {title: 'Villa, extended'})

  it('is null with nothing saved', () => {
    assert.equal(publishStatus({}), null)
  })

  it('is draft for a new document never published', () => {
    assert.equal(publishStatus({draft: doc('drafts.a', {title: 'New'})}), 'draft')
  })

  it('is staging when only staging has the latest version', () => {
    assert.equal(publishStatus({published: v1}), 'staging')
  })

  it('is live when both sites have it', () => {
    assert.equal(publishStatus({published: v1, live: v1}), 'live')
  })

  it('counts a draft identical to the published version as published', () => {
    assert.equal(publishStatus({draft: doc('drafts.a', {title: 'Villa'}), published: v1, live: v1}), 'live')
  })

  it('is draft when newer edits are on neither site', () => {
    assert.equal(publishStatus({draft: v2Draft, published: v1, live: v1}), 'draft')
  })

  it('is staging when staging has a newer version than the live site', () => {
    const v2 = doc('a', {title: 'Villa, extended'})
    assert.equal(publishStatus({published: v2, live: v1, liveLog: liveLog('a', v1)}), 'staging')
  })

  it('trusts the publish note when the live copy differs (re-pointed assets)', () => {
    const live = doc('a', {title: 'Villa', photo: {asset: {_ref: 'image-other-10x10-jpg'}}})
    const published = doc('a', {title: 'Villa', photo: {asset: {_ref: 'image-orig-10x10-jpg'}}})
    assert.equal(publishStatus({published, live, liveLog: liveLog('a', published)}), 'live')
    assert.equal(publishStatus({published, live}), 'staging')
  })

  it('is unpublished while the draft still holds what was taken off', () => {
    const kept = doc('drafts.a', {title: 'Villa'})
    assert.equal(publishStatus({draft: kept, stagingLog: unpublishLog('a', v1)}), 'unpublished')
  })

  it('is draft once an unpublished item is edited', () => {
    assert.equal(publishStatus({draft: v2Draft, stagingLog: unpublishLog('a', v1)}), 'draft')
  })

  it('ignores an unpublish note while a site still has the item', () => {
    const kept = doc('drafts.a', {title: 'Villa'})
    assert.equal(publishStatus({draft: kept, live: v1, stagingLog: unpublishLog('a', v1)}), 'draft')
  })
})

describe('groupStatus', () => {
  it('is null when no page has anything saved', () => {
    assert.equal(groupStatus([null, null]), null)
  })

  it('is draft while any page has unpublished edits', () => {
    assert.equal(groupStatus(['live', 'staging', 'draft', null]), 'draft')
  })

  it('is staging while any page is ahead of the live site', () => {
    assert.equal(groupStatus(['live', 'staging', 'unpublished']), 'staging')
  })

  it('is unpublished only when every page is', () => {
    assert.equal(groupStatus(['unpublished', null, 'unpublished']), 'unpublished')
    assert.equal(groupStatus(['unpublished', 'live']), 'live')
  })

  it('is live when every page is live', () => {
    assert.equal(groupStatus(['live', 'live', null]), 'live')
  })
})

describe('groupById', () => {
  const published = doc('a', {title: 'Villa'})
  const draft = doc('drafts.a', {title: 'Villa, extended'})
  const live = doc('a', {title: 'Villa'})
  const note = (id: string, fields: Record<string, unknown>) => doc(logId(id), {document: id, ...fields}, {_type: 'publishLog'})

  it('joins each side of a document under its published ID', () => {
    const stagingNote = note('a', {state: 'unpublished', contentKey: 'k'})
    const liveNote = note('a', {contentKey: 'k'})
    const groups = groupById([published, draft, stagingNote], [live, liveNote])
    assert.deepEqual([...groups.keys()], ['a'])
    const group = groups.get('a')
    assert.equal(group?.published, published)
    assert.equal(group?.draft, draft)
    assert.equal(group?.live, live)
    assert.equal(group?.stagingLog, stagingNote)
    assert.equal(group?.liveLog, liveNote)
  })

  it('keeps a document that is only live, for the caller to skip', () => {
    const groups = groupById([], [doc('b', {title: 'Gone from staging'})])
    assert.equal(publishStatus(groups.get('b') ?? {}), null)
  })

  it('drops notes for documents that are not there', () => {
    const groups = groupById([note('x', {state: 'unpublished'})], [note('y', {})])
    assert.equal(groups.size, 0)
  })

  it('never takes a draft from production as the live copy', () => {
    const groups = groupById([published], [doc('drafts.a', {title: 'Stray'})])
    assert.equal(groups.get('a')?.live, undefined)
  })

  it('gives the same status as the documents passed one by one', () => {
    const groups = groupById([published, draft], [live, note('a', {contentKey: contentKey(published)})])
    assert.equal(publishStatus(groups.get('a') ?? {}), 'draft')
    assert.equal(publishStatus(groupById([published], [live]).get('a') ?? {}), 'live')
  })
})
