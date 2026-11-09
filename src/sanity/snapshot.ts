/* A review round's content: the staging dataset as it was when the round
   was cut (review/snapshot.json, written by scripts/review-round.mjs and
   committed on the round's branch), answered with Sanity's own GROQ engine
   (groq-js), so every query the pages run reads exactly what it read then.

   Server only, and only in a review build (astro.config.mjs, "review"):
   content-client.ts picks it. Pictures stay on Sanity's image CDN, where an
   asset stays after it is replaced in the Studio (only deleting it from the
   media library would take it away). */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { SanityClient } from '@sanity/client';
import { evaluate, parse } from 'groq-js';

/** Where a round keeps its snapshot, from the repository's root */
export const SNAPSHOT_FILE = path.join('review', 'snapshot.json');

let documents: unknown[] | null = null;
function dataset(): unknown[] {
  if (documents) return documents;
  const file = path.join(process.cwd(), SNAPSHOT_FILE);
  let parsed: { documents?: unknown[] };
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`A review build reads its content from ${SNAPSHOT_FILE}, which is missing or unreadable (${(error as Error).message}). Cut the round with scripts/review-round.mjs.`);
  }
  if (!Array.isArray(parsed.documents)) throw new Error(`${SNAPSHOT_FILE} has no "documents" list.`);
  documents = parsed.documents;
  return documents;
}

/** The pages' client in a review build: `fetch` only, which is all they use */
export const snapshotClient = {
  async fetch<T = unknown>(query: string, params: Record<string, unknown> = {}): Promise<T> {
    const tree = parse(query, { params });
    const result = await evaluate(tree, { dataset: dataset(), params });
    return (await result.get()) as T;
  },
} as unknown as SanityClient;
