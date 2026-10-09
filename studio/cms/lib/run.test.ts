import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {advance, buildDone, failRun, finishRun, hasFailed, isActive, isBusy, runMessage, startRun} from './run.ts'

/* A publishing action's stages (run.ts): what the progress shows at each
   point. Run with `npm test` in studio/. */

const states = (run: ReturnType<typeof startRun>) => run.steps.map((step) => `${step.key}:${step.state}`)

describe('a live publish', () => {
  it('starts at its check, with every other stage ahead', () => {
    const run = startRun('live', 'the site', 1000)
    assert.deepEqual(states(run), ['check:running', 'staging:pending', 'live:pending', 'build:pending'])
    assert.equal(isBusy(run), true)
    assert.equal(runMessage(run), 'Checking links and the saved version…')
  })

  it('moves on as the route reports each stage', () => {
    let run = advance(startRun('live', 'the site'), 'staging')
    assert.deepEqual(states(run), ['check:done', 'staging:done', 'live:running', 'build:pending'])
    assert.equal(runMessage(run), 'Copying to the live site…')
    run = advance(run, 'live')
    assert.deepEqual(states(run), ['check:done', 'staging:done', 'live:done', 'build:running'])
  })

  it('waits for the rebuild once the route has answered, then is done', () => {
    let run = finishRun(advance(advance(startRun('live', 'the site'), 'staging'), 'live'), {published: ['homePage'], failed: []}, 5000)
    assert.equal(run.finishedAt, 5000)
    assert.equal(isBusy(run), false)
    assert.equal(isActive(run), true)
    assert.match(runMessage(run), /rebuilding/)
    assert.match(runMessage(run, {rebuildSlow: true}), /not rebuilt yet/)
    run = buildDone(run)
    assert.equal(isActive(run), false)
    assert.equal(runMessage(run), 'The site published live: the live site shows it now.')
  })

  it('keeps the stages that completed when it fails part-way', () => {
    const run = failRun(advance(startRun('live', 'Villa'), 'staging'), 'An image could not be read.', ['staging'])
    assert.deepEqual(states(run), ['check:done', 'staging:done', 'live:failed', 'build:pending'])
    assert.equal(hasFailed(run), true)
    assert.equal(isActive(run), false)
    assert.equal(runMessage(run), 'An image could not be read.')
  })

  it('fails at its check when the route refuses it outright', () => {
    const run = failRun(startRun('live', 'Villa'), 'This links to content that is not on the live site yet.', [])
    assert.deepEqual(states(run), ['check:failed', 'staging:pending', 'live:pending', 'build:pending'])
  })
})

describe('a staging-only publish', () => {
  it('has no live stage and is done when the route answers', () => {
    const run = finishRun(advance(startRun('staging', 'the site'), 'staging'), {published: ['homePage'], failed: []})
    assert.deepEqual(states(run), ['check:done', 'staging:done'])
    assert.equal(isActive(run), false)
    assert.equal(runMessage(run), 'The site published to staging. The live site is not changed.')
  })
})

describe('several documents at once', () => {
  it('goes through with the ones that passed, naming the rest', () => {
    const run = finishRun(advance(advance(startRun('live', '3 projects'), 'staging'), 'live'), {published: ['a', 'b'], failed: [{id: 'c', error: 'Not on staging yet.'}]})
    assert.equal(run.failed?.length, 1)
    assert.equal(hasFailed(run), false)
    assert.match(runMessage(buildDone(run)), /1 not: see below/)
  })

  it('fails at its check when every one was refused', () => {
    const run = finishRun(startRun('staging', '2 projects'), {published: [], failed: [{id: 'a', error: 'No.'}, {id: 'b', error: 'Nor this.'}]})
    assert.deepEqual(states(run), ['check:failed', 'staging:pending'])
    assert.equal(run.error, 'a: No.\nb: Nor this.')
  })
})

describe('an unpublish', () => {
  it('takes the live site first, then staging', () => {
    let run = startRun('unpublish', 'Villa')
    assert.equal(runMessage(run), 'Checking that nothing links to it…')
    run = advance(run, 'live')
    assert.deepEqual(states(run), ['check:done', 'live:done', 'staging:running'])
    run = finishRun(advance(run, 'staging'), {published: ['villa'], failed: []})
    assert.equal(isActive(run), false)
    assert.match(runMessage(run), /^Villa unpublished/)
  })
})
