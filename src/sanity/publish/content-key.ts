/* The publish notes' shared vocabulary, with no imports, so the Studio's tests
   can check it against the CMS package (studio/test/protocol.test.ts).

   What the two sides are compared on: the content, without the system fields
   that differ by nature, keys sorted. It must be the CMS package's
   contentKey (@stasiosdesign/sanity-cms/protocol), which the Studio uses to
   say whether the live site has the version in the editor. */

type Doc = { _id?: string; _rev?: string; _updatedAt?: string; _createdAt?: string; _system?: unknown; [key: string]: unknown };

export function contentKey(doc: Doc): string {
  const { _id: _i, _rev: _r, _updatedAt: _u, _createdAt: _c, _system: _s, ...content } = doc;
  return JSON.stringify(content, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : value,
  );
}

/** The note kept beside each live document; a dotted ID, so it is private to the Studio */
export const logId = (id: string) => `publish-log.${id}`;
