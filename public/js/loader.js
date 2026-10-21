// -----------------------------------------
// THE HOME PAGE'S OPENING
// -----------------------------------------
//
// index.astro, "The home page's opening" in style.css. On a fresh load of
// the home page, from the first paint:
//   1. on the dark grid, a row of small squares, all dim (laid out on the
//      grid by the inline script in index.astro);
//   2. the squares light from the middle outwards, both ways at once, each
//      simply on (no fade), as
//      the page loads, and the share loaded counts up beside them. The
//      share is real: the fonts, the page's scripts and each of the hero's
//      photographs, counted as they arrive. What is shown follows it at a
//      steady pace (never ahead of it, never faster than a full sweep in
//      SWEEP), so the lighting keeps an even rhythm; a slow photograph is
//      not waited for beyond MAX_WAIT;
//   3. all lit, the row turns into a column round its middle square —
//      the left half rising, the right half falling — every square on the
//      grid's cells as it goes;
//   4. the five squares carrying the hero's pictures (the middle one and
//      the four below it; for the list, the column's right edges on the
//      middle of the screen, where the pictures' stand, each growing out of
//      its own edge in turn, the hero's type coming in as they
//      finish) grow into those pictures: each to the very place,
//      size, strength and softness of its counterpart in the hero, its
//      photograph coming up inside it, while the dark gives way to the
//      hero's light grid behind, the same grid, and the other squares sink
//      back into it, each down to a single cell and gone;
//   5. the opening takes itself away, the hero's own pictures showing
//      exactly where the squares stopped, and the page scrolls again.
// Squares move by their position and size — thirteen elements at most,
// only during the opening; the grid itself is a background and never moves.
// A visit after the first in the same session sweeps faster.
//
// Only while the root is is--intro, which the page sets itself on a fresh
// load (not with reduced motion). Arriving by a page transition, the
// markup comes in inert and is removed here (initAfterEnterFunctions).
// Whatever happens, the page is shown within STUCK of the start.

const LOADER_SWEEP = 2;        // s, the quickest full sweep of the lights
const LOADER_SWEEP_SEEN = 1;   // s, the same on a later visit this session
const LOADER_MAX_WAIT = 5000;  // ms, the most the lights wait for the page
const LOADER_STUCK = 12000;    // ms, the page shown regardless

function initHomeLoader(scope) {
  const loader = (scope || document).querySelector('[data-loader]');
  if (!loader) return;
  const root = document.documentElement;
  if (!root.classList.contains('is--intro') || typeof gsap === 'undefined') {
    root.classList.remove('is--intro');
    loader.remove();
    return;
  }
  // Barba runs this on the first load as well as the page's own startup
  if (loader.__started) return;
  loader.__started = true;
  runHomeLoader(loader);
}

function runHomeLoader(loader) {
  const root = document.documentElement;
  root.dataset.introStarted = '';
  window.scrollTo(0, 0);
  if (window.lenis) window.lenis.stop();

  const layout = () => (typeof window.__layoutHomeLoader === 'function' ? window.__layoutHomeLoader() : null);
  const bg = loader.querySelector('[data-loader-bg]');
  const layer = loader.querySelector('[data-loader-layer]');
  const count = loader.querySelector('[data-loader-count]');
  const label = loader.querySelector('[data-loader-label]');
  let grid = layout();

  let finished = false;
  let cap = 0;
  let stuck = 0;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(cap);
    clearTimeout(stuck);
    window.removeEventListener('resize', relayout);
    root.classList.remove('is--intro', 'is--loading');
    loader.remove();
    if (window.lenis) window.lenis.start();
    // The hero now under a pointer that may not have moved (cursor.js)
    if (typeof refreshCursor === 'function') refreshCursor();
  }
  stuck = setTimeout(finish, LOADER_STUCK);
  if (!grid) return finish();

  // A resize while the lights run lays the row out again
  let morphing = false;
  function relayout() {
    if (morphing) return;
    grid = layout() || grid;
    paint(shown);
  }
  window.addEventListener('resize', relayout);

  // ---- The share loaded: real, counted as each part arrives
  const pictures = Array.from(loader.querySelectorAll('[data-loader-card] img'));
  const parts = [
    document.fonts ? document.fonts.ready : Promise.resolve(),
    ...pictures.map((img) => (img.complete ? Promise.resolve() : new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    }))),
  ];
  // The page's scripts are in, being run: one part already
  const total = parts.length + 1;
  let arrived = 1;
  let real = arrived / total;
  parts.forEach((part) => part.then(() => {
    arrived += 1;
    real = Math.max(real, arrived / total);
  }));
  cap = setTimeout(() => { real = 1; }, LOADER_MAX_WAIT);

  // ---- The lights, from the middle outwards, following the share
  let seen = false;
  try { seen = sessionStorage.getItem('tomrow:opening') === '1'; } catch (_) {}
  const sweep = seen ? LOADER_SWEEP_SEEN : LOADER_SWEEP;
  let shown = 0;
  function paint(value) {
    count.textContent = `${Math.round(value * 100)}%`;
    if (!grid) return;
    // How far out from the middle the light has come, in squares
    const reach = value * (grid.c + 1);
    grid.order.forEach((el, i) => el.classList.toggle('is--lit', value > 0 && Math.abs(i - grid.c) < reach));
  }
  paint(0);
  let then = 0;
  function frame(now) {
    if (finished) return;
    const dt = then ? Math.min(0.1, (now - then) / 1000) : 0;
    then = now;
    shown = Math.min(real, shown + dt / sweep);
    paint(shown);
    if (shown >= 1) {
      setTimeout(morph, 220);
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- Into the hero
  function morph() {
    if (finished) return;
    morphing = true;
    clearTimeout(cap);
    try { sessionStorage.setItem('tomrow:opening', '1'); } catch (_) {}
    grid = layout() || grid;
    const { P, sq, c, rowTop, order, cards } = grid;
    const targets = Array.from(document.querySelectorAll('.home-reel__img'));
    if (!targets.length) return finish();
    const target = (k) => targets[Math.min(k, targets.length - 1)].getBoundingClientRect();
    const reel = document.querySelector('[data-home-reel]');
    // The hero's waiting pictures: their strength and their softness, as seen
    const resting = targets[1] ? parseFloat(targets[1].style.opacity || getComputedStyle(targets[1]).opacity) || 0.6 : 0.6;
    const soft = reel ? parseFloat(getComputedStyle(reel).getPropertyValue('--reel-blur')) || 0 : 0;
    // The column: centred on the middle square, a gap of three cells
    // between squares, still on the grid
    const pitch = sq + 1 + 3 * P;
    const columnTop = (i) => rowTop + (i - c) * pitch;
    const isCard = (el) => el.hasAttribute('data-loader-card');

    // The hero's list is met by a column whose right edges stand on the
    // middle of the screen, where the pictures' do: each square grows out
    // of its own edge into its picture, one after another down the column,
    // and as they finish the hero's own type comes in with them
    // (home:arrive, home-list.js)
    const columnLeft = Math.floor(window.innerWidth / 2) - sq;
    const tl = gsap.timeline({ onComplete: finish });
    tl.to([count, label], { autoAlpha: 0, duration: 0.35, ease: 'power2.out' }, 0);
    // 3. The row turns into a column round its middle square
    order.forEach((el, i) => {
      tl.to(el, { left: columnLeft, top: columnTop(i), duration: 1, ease: 'power3.inOut' }, 0.05 + Math.abs(i - c) * 0.022);
    });
    // Once every square has arrived in the column
    tl.addLabel('grow', 0.05 + (c + 1) * 0.022 + 1);
    // 4. The picture squares grow into the hero's pictures, their
    // photographs coming up in them
    cards.forEach((el, k) => {
      const at = k * 0.07;
      tl.to(el, {
        left: () => target(k).left,
        top: () => target(k).top,
        width: () => target(k).width,
        height: () => target(k).height,
        duration: 1.55,
        ease: 'expo.inOut',
      }, `grow+=${at}`);
      if (el.firstElementChild) tl.to(el.firstElementChild, { opacity: 1, duration: 0.8, ease: 'power2.out' }, `grow+=${at + 0.45}`);
    });
    tl.call(() => document.dispatchEvent(new CustomEvent('home:arrive')), null, 'grow+=1.05');
    tl.to(cards.slice(1), { opacity: resting, duration: 0.9, ease: 'power2.inOut' }, 'grow+=0.65');
    if (soft) tl.fromTo(cards.slice(1), { filter: 'blur(0px)' }, { filter: `blur(${soft}px)`, duration: 0.9, ease: 'power2.inOut' }, 'grow+=0.65');
    // The others sink back into the grid: each down to one cell, at its
    // own middle, and gone
    const shrink = Math.floor((sq + 1) / P / 2) * P;
    order.forEach((el, i) => {
      if (isCard(el)) return;
      tl.to(el, {
        left: columnLeft + shrink,
        top: columnTop(i) + shrink,
        width: P - 1,
        height: P - 1,
        opacity: 0,
        duration: 0.75,
        ease: 'power2.inOut',
      }, 'grow');
    });
    // 5. The dark gives way to the light grid behind, as the squares grow
    tl.to(bg, { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, 'grow+=0.25');
  }
}

document.addEventListener('DOMContentLoaded', () => initHomeLoader());
