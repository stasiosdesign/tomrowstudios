/* Which copy of the content this deployment shows.

   One dataset holds three states of every document (see the README,
   "Publishing"):
   - the draft (drafts.<id>): what is being edited; staging shows it in
     draft mode only;
   - the published document (<id>): what "Publish to staging" releases;
     staging shows it to everyone;
   - the live copy (live-<id>): what "Publish live" releases, a copy of the
     published document taken at that moment. Production is built from live
     copies only, so nothing reaches the public site until it is put there
     on purpose, and a code release never sweeps staged content along.

   Every query takes $live and picks one side: `(string::startsWith(_id, "live-")) ==
   $live`. Production passes true, staging and development false. */
export const LIVE = __DEPLOYMENT__ === 'production';

/** The parameter every content query takes: `sanity.fetch(QUERY, { ...contentParams, slug })`. */
export const contentParams = { live: LIVE } as const;
