/* The live site as the Studio reads it: its build stamp. The site's
   addresses, its pages and where each document shows on it are the
   project's (cms/config.ts: sites, pages, documentRoute). */

/** The site's build stamp, written by every production build (/build.json) */
export type BuildStamp = {builtAt: string; deployment: string}

export async function fetchBuildStamp(origin: string): Promise<BuildStamp | null> {
  if (!origin) return null
  try {
    const response = await fetch(`${origin}/build.json`, {cache: 'no-store'})
    if (!response.ok) return null
    const stamp = (await response.json()) as Partial<BuildStamp>
    return typeof stamp.builtAt === 'string' ? {builtAt: stamp.builtAt, deployment: stamp.deployment ?? 'production'} : null
  } catch {
    return null
  }
}
