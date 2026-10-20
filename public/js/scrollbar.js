// -----------------------------------------
// THE PAGE'S SCROLLBAR
// -----------------------------------------
//
// ScrollBar.astro, "Scrollbar" in style.css; after pensatori-irrazionali.com's.
// The thumb runs down the track with the page's progress, from Lenis's
// own scroll event (the site's one scroll pipeline, transitions.js), as a
// transform; the track's length is read on resize, never on the scroll.
// It shows once someone scrolls, and goes a moment after they stop; and
// while it is hovered or dragged. A page can ask for it to stay
// (data-scrollbar-pinned on its container: the home page): there it is
// shown from the start and never goes (is--pinned), and leaving that page
// for another gives the other its own coming and going again.
//
// Dragged, the thumb takes the page with it, a thumb's travel for the
// page's whole length; a press on the track sends the page to that
// point, smoothly. Both go through Lenis, so they stop when it is
// stopped (a page change, the open menu, a side panel, the reel).
//
// Barba: the markup is in the layout and survives a navigation, so it is
// bound once, by transitions.js once Lenis exists (initOnceFunctions); on
// each new page transitions.js calls refreshScrollbar(container) to place
// the thumb for that page's length and pin it or not for that page. A page that grows or shrinks in place is caught
// by a watch on the body's size.

function initScrollbar() {
  const bar = document.querySelector('[data-scrollbar]');
  const thumb = bar && bar.querySelector('[data-scrollbar-thumb]');
  const lenis = window.lenis;
  if (!bar || !thumb || !lenis || bar.__scrollbar) return;
  bar.__scrollbar = true;

  // how long it stays after the page has stopped (ms)
  const LINGER = 1200;

  let travel = 0;
  let thumbH = 0;
  let idle = 0;
  let hovered = false;
  let drag = null;

  const measure = () => {
    thumbH = thumb.offsetHeight;
    travel = bar.offsetHeight - thumbH;
    place();
  };
  function place() {
    const progress = lenis.limit > 0 ? gsap.utils.clamp(0, 1, lenis.scroll / lenis.limit) : 0;
    thumb.style.transform = `translate3d(0, ${(progress * travel).toFixed(2)}px, 0)`;
  }
  const show = () => {
    bar.classList.add('is--shown');
    clearTimeout(idle);
    idle = setTimeout(() => {
      if (!hovered && !drag) bar.classList.remove('is--shown');
    }, LINGER);
  };

  // shown only when someone scrolls (Lenis moving the page, smoothly or by
  // the browser's own scroll), not when the page is set in place without
  // moving (a page arriving, a reload going back to where it was)
  lenis.on('scroll', () => {
    place();
    if (lenis.isScrolling && !lenis.isStopped) show();
  });
  window.addEventListener('resize', measure);

  // The page's length changing in place (a photograph arriving, a section
  // opening): placed again once Lenis has measured it too (it waits a
  // quarter of a second after a change)
  let settle = 0;
  new ResizeObserver(() => {
    clearTimeout(settle);
    settle = setTimeout(place, 300);
  }).observe(document.body);

  bar.addEventListener('pointerenter', () => {
    hovered = true;
    bar.classList.add('is--shown');
  });
  bar.addEventListener('pointerleave', () => {
    hovered = false;
    show();
  });

  // the thumb dragged: the page follows it, straight away
  thumb.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    thumb.setPointerCapture(event.pointerId);
    drag = { y: event.clientY, scroll: lenis.scroll };
    bar.classList.add('is--dragging', 'is--shown');
  });
  thumb.addEventListener('pointermove', (event) => {
    if (!drag || !travel) return;
    const to = drag.scroll + ((event.clientY - drag.y) / travel) * lenis.limit;
    lenis.scrollTo(gsap.utils.clamp(0, lenis.limit, to), { immediate: true });
  });
  const release = (event) => {
    if (!drag) return;
    drag = null;
    if (thumb.hasPointerCapture(event.pointerId)) thumb.releasePointerCapture(event.pointerId);
    bar.classList.remove('is--dragging');
    show();
  };
  thumb.addEventListener('pointerup', release);
  thumb.addEventListener('pointercancel', release);

  // a press on the track: the page there, the thumb's middle under the
  // pointer
  bar.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !travel) return;
    const box = bar.getBoundingClientRect();
    const at = gsap.utils.clamp(0, 1, (event.clientY - box.top - thumbH / 2) / travel);
    lenis.scrollTo(at * lenis.limit);
  });

  // Pinned, or not, for the page that is showing (the newest container
  // while a transition still holds the old one)
  function pin(page) {
    const pages = document.querySelectorAll('[data-barba="container"]');
    const container = page && page.matches && page.matches('[data-barba="container"]') ? page : pages[pages.length - 1];
    bar.classList.toggle('is--pinned', !!container && container.hasAttribute('data-scrollbar-pinned'));
  }

  pin();
  measure();
  window.refreshScrollbar = (page) => {
    pin(page);
    measure();
  };
}
