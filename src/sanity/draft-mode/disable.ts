/* GET /api/draft-mode/disable: leaves draft mode, back to published content
   on the home page. The "Exit" link on the draft-mode label (BaseLayout.astro)
   points here. Staging and development only. */
import type { APIRoute } from 'astro';
import { DRAFT_MODE_COOKIE, cookieOptions, perspectiveCookieName } from '.';

export const GET: APIRoute = ({ cookies, redirect }) => {
  // Deleting a cookie takes the attributes it was set with (a partitioned one
  // is only removed by a Partitioned deletion)
  const { maxAge: _, ...attributes } = cookieOptions;
  cookies.delete(DRAFT_MODE_COOKIE, attributes);
  cookies.delete(perspectiveCookieName, attributes);
  return redirect('/', 307);
};
