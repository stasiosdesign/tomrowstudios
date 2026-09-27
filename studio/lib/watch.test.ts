import assert from 'node:assert/strict'
import {afterEach, beforeEach, describe, it, mock} from 'node:test'
import {watchReads} from './watch.ts'

/* Keeping documents current (watch.ts): reads after changes, only the latest
   answer lands, failed reads are retried, and stopping ends everything. Run
   with `npm test` in studio/. */

type Observer = {next: () => void; error: (error: Error) => void}

function fakeListener() {
  const observers = new Set<Observer>()
  return {
    subscribe(observer: Observer) {
      observers.add(observer)
      return {unsubscribe: () => observers.delete(observer)}
    },
    emit: () => observers.forEach((observer) => observer.next()),
    fail: (error: Error) => observers.forEach((observer) => observer.error(error)),
    get count() {
      return observers.size
    },
  }
}

// A read whose answer the test gives, when it chooses
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return {promise, resolve, reject}
}

const settle = () => new Promise<void>((resolve) => setImmediate(resolve))

describe('watchReads', () => {
  beforeEach(() => mock.timers.enable({apis: ['setTimeout']}))
  afterEach(() => mock.timers.reset())

  it('reads at once, and again shortly after changes, once for a burst', async () => {
    const listener = fakeListener()
    let reads = 0
    const results: number[] = []
    const stop = watchReads({read: async () => ++reads, listeners: [listener], onRead: (value) => results.push(value)})
    await settle()
    assert.deepEqual(results, [1])

    listener.emit()
    listener.emit()
    listener.emit()
    mock.timers.tick(299)
    assert.equal(reads, 1)
    mock.timers.tick(1)
    await settle()
    assert.equal(reads, 2)
    assert.deepEqual(results, [1, 2])
    stop()
  })

  it('keeps only the latest answer when an older read is slower', async () => {
    const listener = fakeListener()
    const answers = [deferred<string>(), deferred<string>()]
    let call = 0
    const results: string[] = []
    const stop = watchReads({read: () => answers[call++].promise, listeners: [listener], onRead: (value) => results.push(value)})
    listener.emit()
    mock.timers.tick(300)
    answers[1].resolve('new')
    await settle()
    answers[0].resolve('old')
    await settle()
    assert.deepEqual(results, ['new'])
    stop()
  })

  it('reports a failed read and tries again, waiting longer each time', async () => {
    let call = 0
    const errors: string[] = []
    const results: string[] = []
    const stop = watchReads({
      read: async () => {
        call++
        if (call <= 2) throw new Error(`failure ${call}`)
        return 'ok'
      },
      listeners: [],
      onRead: (value) => results.push(value),
      onError: (error) => errors.push(error.message),
    })
    await settle()
    assert.deepEqual(errors, ['failure 1'])
    mock.timers.tick(2_000)
    await settle()
    assert.deepEqual(errors, ['failure 1', 'failure 2'])
    mock.timers.tick(4_999)
    await settle()
    assert.equal(call, 2)
    mock.timers.tick(1)
    await settle()
    assert.deepEqual(results, ['ok'])
    stop()
  })

  it('reports a listener that stops', async () => {
    const listener = fakeListener()
    const errors: string[] = []
    const stop = watchReads({read: async () => 1, listeners: [listener], onRead: () => undefined, onError: (error) => errors.push(error.message)})
    listener.fail(new Error('connection lost'))
    assert.deepEqual(errors, ['connection lost'])
    stop()
  })

  it('stops listening, reading and answering once stopped', async () => {
    const listener = fakeListener()
    const answer = deferred<number>()
    let reads = 0
    const results: number[] = []
    const stop = watchReads({
      read: () => {
        reads++
        return answer.promise
      },
      listeners: [listener],
      onRead: (value) => results.push(value),
    })
    assert.equal(listener.count, 1)
    listener.emit()
    stop()
    assert.equal(listener.count, 0)
    mock.timers.tick(1_000)
    answer.resolve(1)
    await settle()
    assert.equal(reads, 1)
    assert.deepEqual(results, [])
  })
})
