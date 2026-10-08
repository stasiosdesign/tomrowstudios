/* The Studio's icon: the website's favicon (www.tomrowstudios.com's), served
   from studio/static. Sanity shows it in the project menu (sanity.config.ts,
   icon); studio.css draws the same file at the top left, beside "CMS". */
const SITE_FAVICON = '/static/site-favicon.png'

export function StudioIcon() {
  return <img src={SITE_FAVICON} alt="" style={{display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
}
