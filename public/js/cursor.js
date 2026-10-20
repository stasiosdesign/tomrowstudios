// -----------------------------------------
// CURSOR: the arrow leans with the mouse's speed
// -----------------------------------------
//
// The site's pointer is the system's own cursor with our white arrow in it
// ("Cursor" in style.css), so it moves exactly as the default one does.
// This adds a lean: moving sideways, the arrow tilts with the movement,
// more the faster it goes (after Osmo's velocity-based cursor), and
// settles back upright as the mouse slows or stops.
//
// The cursor's position stays the system's; only its picture changes. The
// picture for each angle (every STEP degrees, up to MAX either way) is
// drawn once, on first use, on a canvas at 1x and 2x, the arrow turned
// about its tip, which stays the hotspot, so a click lands where the tip
// points at any angle. Each picture is just big enough for the turned
// arrow and its shadow (well under 32px, the most a browser shows
// everywhere, near its own toolbar included). A turned arrow is set
// inline on the element under the pointer only, the one whose cursor the
// browser shows, and taken off again as the pointer leaves it or the
// arrow comes upright, so a change restyles one element rather than the
// page; upright is style.css's own arrow. Text fields keep the text
// cursor.
//
// The lean runs on requestAnimationFrame only while the arrow is off
// upright, and writes the cursor only when the angle reaches a new step.
// Only on a fine pointer that can hover, and not with reduced motion:
// there the plain arrow from style.css stays.

(function () {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || still.matches) return;

  // The arrow, as public/assets/icons/cursor-arrow.svg draws it: the tip
  // at 0 0, the head's right point, the notch, the tail
  const ARROW = new Path2D('M0 1.1Q0 0 0.84 0.71L13.82 11.64Q15.2 12.8 13.4 12.8L7.1 12.8Q5.9 12.8 5.14 13.73L1.14 18.61Q0 20 0 18.2Z');
  const CORNERS = [[0, 0], [15.2, 12.8], [5.9, 12.8], [0, 20]];
  // Room round the arrow for its shadow
  const PAD = 3;
  // Degrees per picture, and the furthest lean either way
  const STEP = 2;
  const MAX = 44;
  // Degrees of lean per pixel-per-millisecond of sideways speed
  const GAIN = 100;

  const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="range"]), textarea, [contenteditable=""], [contenteditable="true"]';
  const frames = new Map();

  // The cursor's value for an angle: the turned arrow at 1x and 2x, the
  // hotspot on its tip; white, or on a light page (tone "dark", from
  // --cursor-tone in style.css) black with a fine light edge, as
  // public/assets/icons/cursor-arrow-dark.svg draws it
  function frame(angle) {
    const key = `${tone}:${angle}`;
    if (frames.has(key)) return frames.get(key);
    const dark = tone === 'dark';
    const a = (angle * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const xs = CORNERS.map(([x, y]) => x * c - y * s);
    const ys = CORNERS.map(([x, y]) => x * s + y * c);
    const ox = Math.ceil(PAD - Math.min(...xs));
    const oy = Math.ceil(PAD - Math.min(...ys));
    const w = Math.ceil(ox + Math.max(...xs) + PAD);
    const h = Math.ceil(oy + Math.max(...ys) + PAD + 1);
    const urls = [1, 2].map((r) => {
      const canvas = document.createElement('canvas');
      canvas.width = w * r;
      canvas.height = h * r;
      const ctx = canvas.getContext('2d');
      ctx.scale(r, r);
      ctx.translate(ox, oy);
      ctx.rotate(a);
      // A soft shadow a pixel down (canvas shadows are in device pixels,
      // hence r), then the edge, then the arrow itself
      ctx.fillStyle = dark ? '#0a0a0a' : '#ffffff';
      ctx.shadowColor = dark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2 * r;
      ctx.shadowOffsetY = 1 * r;
      ctx.fill(ARROW);
      ctx.shadowColor = 'transparent';
      if (dark) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.lineJoin = 'round';
        ctx.stroke(ARROW);
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 0.5 * r;
        ctx.shadowOffsetY = 0;
      }
      ctx.fill(ARROW);
      return canvas.toDataURL('image/png');
    });
    const value = `image-set(url("${urls[0]}") 1x, url("${urls[1]}") 2x) ${ox} ${oy}, auto`;
    frames.set(key, value);
    return value;
  }

  let tone = 'light';

  let target = 0;
  let current = 0;
  let lastX = 0;
  let lastMove = 0;
  let lastFrame = 0;
  let running = false;
  // The element under the pointer, and the one carrying the turned arrow
  // and its angle
  let under = null;
  let holder = null;
  let shown = 0;

  function release() {
    if (holder) holder.style.removeProperty('cursor');
    holder = null;
    shown = 0;
  }

  // Upright is style.css's own arrow, so nothing is set; turned, the arrow
  // is set on the element under the pointer alone (the browser shows that
  // element's cursor), so a change restyles one element, not the page
  function show(angle) {
    if (!angle || !under) return release();
    if (holder === under && shown === angle) return;
    if (holder !== under) release();
    holder = under;
    shown = angle;
    holder.style.setProperty('cursor', frame(angle), 'important');
  }

  // The lean follows the target, and the target dies away, both eased
  // by the time since the last frame so any refresh rate feels the same
  function tick(now) {
    const dt = Math.min(64, now - lastFrame) / (1000 / 60);
    lastFrame = now;
    current += (target - current) * (1 - Math.pow(0.9, dt));
    target *= Math.pow(0.95, dt);
    const settled = Math.abs(current) < STEP / 2 && Math.abs(target) < STEP / 2;
    if (settled) {
      current = 0;
      target = 0;
    }
    show(Math.round(current / STEP) * STEP);
    running = !settled;
    if (running) requestAnimationFrame(tick);
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    // A text field keeps the browser's text cursor
    const node = event.target instanceof Element ? event.target : null;
    under = node && !node.closest(TEXT) ? node : null;
    const now = performance.now();
    const dt = now - lastMove;
    // A move after a pause starts afresh rather than reading the whole
    // jump since the last one as speed
    if (dt > 0 && dt < 100) {
      const speed = (event.clientX - lastX) / dt;
      target = Math.max(-MAX, Math.min(MAX, speed * GAIN));
    }
    lastX = event.clientX;
    lastMove = now;
    if (!running && target !== 0) {
      running = true;
      // The page's tone, read as each lean begins (it changes with the page)
      tone = getComputedStyle(document.documentElement).getPropertyValue('--cursor-tone').trim() === 'dark' ? 'dark' : 'light';
      lastFrame = now;
      requestAnimationFrame(tick);
    }
    // Moving on to another element mid-lean: the arrow goes with it at once
    else if (running && holder !== under) show(shown);
  }, { passive: true });
})();

// -----------------------------------------
// CURSOR LABEL: what a click will do, beside the arrow
// -----------------------------------------
//
// Over an element marked data-cursor-label="…" (the hero's pictures, the
// partners' cards, a picture that zooms open: where a picture alone does
// not say what a click does), a small white label stands to the arrow's
// right with those words, running past slowly as a marquee (after
// Osmo's cursor marquee and dynamic text cursor). Plain links and buttons
// whose own words say it get none. Any element takes one by its
// attribute alone; the label, its movement and its marquee are this one.
//
// The label (data-cursor-label-el, BaseLayout.astro; "Cursor label" in
// style.css) is moved straight to every pointer position, a transform
// written once per pointer event with no easing, so it keeps to the
// arrow. Near the screen's right or bottom edge it goes to the arrow's
// other side. Its box is exactly one copy of its words wide, and the
// words, set twice in a row, slide left by one copy and begin again, so
// the loop never shows a seam; the speed is the same for every label.
// From one labelled element to another the words fade over and the box
// eases to its new width. What is under the pointer is read on each move,
// on scroll (the page moves under a still pointer) and after a page change
// (refreshCursor, transitions.js), and again just after a click, which
// may open something over it (the film's player, a zoomed picture).
// Only on a fine pointer that can hover; with reduced motion the words
// stand still and the label comes and goes without movement. It never
// takes a click (pointer-events: none).

(function () {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const el = document.querySelector('[data-cursor-label-el]');
  if (!el || !fine.matches) return;
  const box = el.querySelector('.cursor-label__box');
  const track = el.querySelector('.cursor-label__track');
  const copies = Array.from(el.querySelectorAll('.cursor-label__text'));

  // The marquee's speed, in pixels a second
  const SPEED = 24;
  // The room the label keeps from the screen's edge before going to the
  // arrow's other side
  const EDGE = 8;
  // Where the label stands off the pointer (as style.css sets it)
  const SIDE = 20;
  const DROP = 13;
  // How long the old words take to fade before the new ones come in
  const SWAP = 140;

  let x = 0;
  let y = 0;
  let text = '';
  let width = 0;
  let height = 0;
  let shown = false;
  let swap = 0;
  let pending = 0;

  document.documentElement.classList.add('has-cursor-label');

  // Which side of the arrow the label stands, from its size, read only when
  // its words change
  function place() {
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.classList.toggle('is--left', x + SIDE + width + EDGE > window.innerWidth);
    el.classList.toggle('is--above', y + DROP + height + EDGE > window.innerHeight);
  }

  // The words in, and the box and the marquee fitted to them
  function write(words) {
    text = words;
    copies.forEach((copy) => { copy.textContent = words; });
    width = copies[0].offsetWidth;
    height = copies[0].offsetHeight;
    box.style.width = `${width}px`;
    track.style.animationDuration = `${width / SPEED}s`;
    place();
  }

  function set(words) {
    if (words === (pending ? pending : text) && (shown || !words)) return;
    clearTimeout(swap);
    pending = 0;
    if (!words) {
      shown = false;
      el.classList.remove('is--shown');
      return;
    }
    if (!shown) {
      // Arriving: the words in place before the label shows
      write(words);
      track.style.animationName = 'none';
      void track.offsetWidth;
      track.style.animationName = '';
      shown = true;
      el.classList.remove('is--swap');
      el.classList.add('is--shown');
      return;
    }
    // From one label to the next: the old words fade, then the new ones
    pending = words;
    el.classList.add('is--swap');
    swap = setTimeout(() => {
      pending = 0;
      write(words);
      el.classList.remove('is--swap');
    }, still.matches ? 0 : SWAP);
  }

  function read(node) {
    const target = node instanceof Element ? node.closest('[data-cursor-label]') : null;
    set(target ? target.getAttribute('data-cursor-label') : '');
  }

  function check() {
    if (x || y) read(document.elementFromPoint(x, y));
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return set('');
    x = event.clientX;
    y = event.clientY;
    place();
    read(event.target);
  }, { passive: true });

  // The page scrolling under a still pointer: read once a frame
  let scrollFrame = 0;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      check();
    });
  }, { passive: true, capture: true });

  // A click may open something over the pointer (the film's player, a
  // zoomed picture): read again once it has
  document.addEventListener('click', () => {
    setTimeout(check, 60);
    setTimeout(check, 450);
  }, true);

  // Out of the window, or the window out of focus
  document.addEventListener('mouseout', (event) => { if (!event.relatedTarget) set(''); });
  window.addEventListener('blur', () => set(''));

  // After a page change, what is under a still pointer has changed
  window.refreshCursor = check;
})();
