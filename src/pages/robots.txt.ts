/* robots.txt, which differs by deployment (astro.config.mjs).

   Production welcomes crawlers and points them at its sitemap.

   Staging is kept out of search results by the "noindex, nofollow" on every
   response (src/middleware.ts, vercel.ts) and on every page, and it names
   production as each page's canonical address. It deliberately does not
   Disallow crawling: a crawler has to fetch a page to read its noindex, and a
   URL blocked here can still be indexed, without its content, from a link.
   (Vercel Authentication usually keeps crawlers out of staging altogether.) */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const lines =
    __DEPLOYMENT__ === 'production'
      ? ['User-agent: *', 'Allow: /', ...(site ? ['', `Sitemap: ${new URL('/sitemap-index.xml', site)}`] : [])]
      : [
          `# Tomrow Studios: this is not the public site${site ? `, which is ${site.origin}` : ''}.`,
          '# Every page and file here is sent with "X-Robots-Tag: noindex, nofollow".',
          'User-agent: *',
          'Allow: /',
        ];
  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
