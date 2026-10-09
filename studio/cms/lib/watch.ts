/* Reading documents and keeping them current, for the publishing control and
   the collection tables: `read` runs now, and again a moment after each
   change a listener reports, so the documents a transaction touches are read
   once. It reads again whenever a listener (re)connects too, which covers
   changes made before it was listening or while it was cut off.

   Only the latest read lands, so a slow answer can't overwrite a newer one; a
   read that fails is tried again, waiting a little longer each time. Returns
   the function that stops it all (for a useEffect's cleanup). */

/** What a listener is asked for: only that something changed, never the documents */
export const LISTEN_OPTIONS = {
  visibility: 'query' as const,
  includeResult: false,
  includeMutations: false,
  events: ['welcome' as const, 'mutation' as const],
}

type Listener = {subscribe(observer: {next: () => void; error: (error: Error) => void}): {unsubscribe(): void}}

/** How long to wait after a change before reading, so a burst of changes is read once */
const SETTLE_MS = 300

/** How long to wait before trying a failed read again, growing with each failure */
const RETRY_MS = [2_000, 5_000, 15_000, 30_000]

export function watchReads<T>({
  read,
  listeners,
  onRead,
  onError,
}: {
  read: () => Promise<T>
  listeners: Listener[]
  onRead: (result: T) => void
  /** A read failed (it is tried again) or a listener stopped */
  onError?: (error: Error) => void
}): () => void {
  let stopped = false
  let latest = 0
  let failures = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  function readSoon(delay: number) {
    clearTimeout(timer)
    timer = setTimeout(readNow, delay)
  }

  function readNow() {
    const attempt = ++latest
    read().then(
      (result) => {
        if (stopped || attempt !== latest) return
        failures = 0
        onRead(result)
      },
      (error: Error) => {
        if (stopped || attempt !== latest) return
        onError?.(error)
        readSoon(RETRY_MS[Math.min(failures++, RETRY_MS.length - 1)])
      },
    )
  }

  readNow()
  const subscriptions = listeners.map((listener) =>
    listener.subscribe({
      next: () => readSoon(SETTLE_MS),
      error: (error) => {
        if (!stopped) onError?.(error)
      },
    }),
  )
  return () => {
    stopped = true
    clearTimeout(timer)
    subscriptions.forEach((subscription) => subscription.unsubscribe())
  }
}
