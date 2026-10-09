/* The Studio's icon: the website's favicon (www.tomrowstudios.com's), served
   from studio/static. The top bar shows it beside "CMS" and in the project
   menu (StudioNavbar); Sanity, wherever it shows the Studio's icon
   (sanity.config.ts, icon). */
const SITE_FAVICON = '/static/site-favicon.png'

export function StudioIcon() {
  return <img src={SITE_FAVICON} alt="" style={{display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
}
