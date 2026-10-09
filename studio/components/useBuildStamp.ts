import {useEffect, useState} from 'react'
import {fetchBuildStamp, LIVE_ORIGIN, type BuildStamp} from '../lib/site'

/* The live site's build stamp (/build.json, written by every production
   build): read when the live copy changes, then again every so often while
   the site is older than it (a rebuild is awaited) or the stamp couldn't be
   read; not at all for a document that isn't live. Soon after a live
   publish (`eager`) it is read more often, so the publishing progress says
   the site is rebuilt within seconds of it being so. */
const POLL_MS = 15_000
const EAGER_POLL_MS = 6_000

export function useBuildStamp(liveUpdatedAt: string | undefined, eager = false): BuildStamp | null | undefined {
  const [stamp, setStamp] = useState<BuildStamp | null | undefined>(undefined)
  const again = !!liveUpdatedAt && (stamp === null || (!!stamp && stamp.builtAt < liveUpdatedAt))
  useEffect(() => {
    if (!liveUpdatedAt || !LIVE_ORIGIN) return undefined
    let cancelled = false
    const load = () => fetchBuildStamp(LIVE_ORIGIN).then((result) => !cancelled && setStamp(result))
    load()
    const timer = again ? setInterval(load, eager ? EAGER_POLL_MS : POLL_MS) : undefined
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [liveUpdatedAt, again, eager])
  return stamp
}

/** Whether the live site has been built since the live copy changed (unknown while the stamp is unread) */
export const builtSince = (stamp: BuildStamp | null | undefined, liveUpdatedAt: string | undefined): boolean | undefined =>
  !liveUpdatedAt || !stamp ? undefined : stamp.builtAt >= liveUpdatedAt
