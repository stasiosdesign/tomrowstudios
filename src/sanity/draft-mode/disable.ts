/* Leaving the Presentation tool turns draft mode off again. */
import type { APIRoute } from 'astro';
import { DRAFT_MODE_COOKIE, PERSPECTIVE_COOKIE } from '../visual-editing';

export const GET: APIRoute = ({ cookies, redirect }) => {
  for (const name of [DRAFT_MODE_COOKIE, PERSPECTIVE_COOKIE]) {
    cookies.delete(name, { path: '/', secure: true, sameSite: 'none', partitioned: true });
  }
  return redirect('/', 307);
};
