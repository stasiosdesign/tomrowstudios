// -----------------------------------------
// THE HOME HERO AS A LIST: GSP's list view
// -----------------------------------------
//
// index.astro (reelLayout "list"), "The hero as a list" in style.css. The
// pictures stand one under another in the page, the right edge of each on
// the middle of the screen, and the page scrolls through them as it would
// anything. This keeps the rest in step with the scroll:
//   - the lit part: the one whose picture is nearest the middle of the
//     screen. Its values on the right split into place, line by line in
//     their masks, the old part's leaving the other way (SplitText);
//   - the opening's hand-over (loader.js, home:arrive): the values rising
//     in as the squares become pictures;
//   - the clients' band below coming up over the hero, the hero's last
//     picture and its type going up at half the speed under it, shaded;
//   - the grid behind, tinted with the lit picture's colours (hero-tint.js);
//   - a stop: the list always settles with one picture in the middle, its
//     fields beside it. Part way between two, the page goes on to the next
//     one the way it was going (or back, if it barely left: LEAN), steered
//     there from the speed it already has and eased into place, so it reads
//     as one scroll rather than a stop and a click: after the wheel, while
//     the page is still easing on from its last step; otherwise once it has
//     come to rest (then easing in as well as out). Not while a finger is
//     on the screen or a mouse button is down (a drag, the scrollbar's
//     thumb); a finger, the wheel or a key takes over from a glide.
// And it lets the list be moved by hand, the page with it:
//   - a drag up or down on the pictures with a mouse or a pen scrolls the
//     page with the pointer, then carries on with its speed to the picture
//     it reaches (or, past either end of the list, simply on). On a touch
//     screen the page's own scroll already does this, and is left alone.
//     A drag never ends in a press, nor drags a picture out or selects;
//   - a press on a waiting picture (the one showing below or above), or
//     tabbing to it, brings it to the middle rather than opening it; the lit
//     one opens as ever, and a ctrl-, cmd- or shift-press opens any.
// Nothing while something else has the page (the opening, a page change,
// the menu, a panel, the film: Lenis stopped). The scroll is read, nothing
// measured on scroll; the geometry is measured once and again on a resize.
//
// Barba runs this on the first load as well as the page's own startup:
// built once per page, and taken down when the page is left (lifecycle.js).
// Reduced motion: no glides; the scroll still moves the list.

function initHomeList(scope) {
  const root = (scope || document).querySelector('[data-home-reel][data-reel-layout="list"]');
  if (!root || root.__homeList) return;
  root.__homeList = true;

  const list = root.querySelector('[data-list]');
  const items = Array.from(root.querySelectorAll('[data-list-item]'));
  const shots = items.map((item) => item.querySelector('[data-list-shot]'));
  // Each photograph's own layer, which drifts in its frame
  const drifts = items.map((item) => item.querySelector('[data-list-drift]'));
  const n = items.length;
  if (!list || !n) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WHEEL_REST = 90; // ms after the wheel's last step before steering into a stop
  const STILL = 130;     // ms of stillness otherwise (a finger let go, the keys, the scrollbar)
  const LEAN = 0.1;      // past a stop by more than this share of a picture, on to the next…
  const LEAN_MAX = 48;   // …or this many pixels, if fewer (one wheel step always turns one)
  const CARRY = 0.22;    // a flung drag's carry, in seconds of its speed
  // The drift, after Osmo's parallax slider: a picture one away from the
  // middle stands this share of its frame along (its amount, 10), at most
  // DRIFT_MAX, in the direction that has it lag its frame a little
  const DRIFT = 10;
  const DRIFT_MAX = 13;
  // The hand's smoothing, Smooothy's own (its lerp, 0.3): the page closes
  // on where a drag puts it by this share a frame, so it
  // follows the hand softly rather than jumping with it
  const HAND_LERP = 0.3;

  let first = 0;  // the scroll that puts the first picture in the middle
  let pitch = 1;  // from one picture to the next

  function measure() {
    const top = list.getBoundingClientRect().top + window.scrollY;
    first = top;
    pitch = n > 1 ? items[1].getBoundingClientRect().top - items[0].getBoundingClientRect().top : items[0].offsetHeight || 1;
    update();
    if (active >= 0) pointCta(active);
  }

  // ---- In step with the scroll

  // The scroll, in pictures from the first
  const along = () => (window.scrollY - first) / pitch;
  const stopAt = (k) => first + k * pitch;

  let active = -1;
  function light(k) {
    const was = active;
    active = k;
    shots.forEach((shot, i) => shot && shot.classList.toggle('is--active', i === k));
    swapValues(was, k);
    pointCta(k);
    if (tint) tint.show(k);
  }

  let frame = 0;
  function update() {
    frame = 0;
    if (root.closest('[data-page-leaving]')) return;
    const r = along();
    const p = Math.min(Math.max(r, 0), n - 1);
    // Held at the list's ends: past the last stop the page is the clients'
    // band coming up, and the hero goes up whole under it (the cover, below),
    // each photograph still in its frame
    drift(p);
    turnDial(p);
    const k = Math.round(p);
    if (k !== active) light(k);
  }

  // ---- The fields' values, split into lines in their masks (SplitText,
  // as split-hover.js does), the lit one's at rest and the rest waiting
  // below; changing part, the old one's lines leave by the top and the
  // new one's rise in after them, one by one (the other way round going
  // back up the list). Without SplitText, or with reduced motion, the lit
  // value simply shows.
  const meta = root.querySelector('[data-list-meta]');
  const values = Array.from(root.querySelectorAll('.home-list__value'));
  const splits = [];
  let hidden = false; // the values held out of sight, until the opening hands over
  const splitReady = () => meta && meta.classList.contains('is--split');
  const linesOf = (k) => values.filter((v) => Number(v.dataset.listPanel) === k).flatMap((v) => (v.__split ? v.__split.lines : []));
  // Each part's lines' own tween, kept so a change of part stops it
  // outright, whatever it was doing
  const moving = new Map();
  const stop = (i) => {
    if (moving.has(i)) moving.get(i).kill();
    moving.delete(i);
  };
  const yOf = (line) => Number(gsap.getProperty(line, 'yPercent')) || 0;
  const RISE_DELAY = 0.12; // the new part's lines set off this long after the old one's
  // How far (yPercent) a line waits from its place: past its mask's edge
  // and the extra room the mask leaves the glyphs round it (style.css,
  // .home-list__line-mask), so nothing of it shows while it waits
  const AWAY = 135;

  function splitValues() {
    if (!meta || reduced || typeof gsap === 'undefined' || typeof SplitText === 'undefined') return;
    gsap.registerPlugin(SplitText);
    values.forEach((value) => {
      value.__split = SplitText.create(value, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'home-list__line',
        autoSplit: true,
        onSplit(self) {
          const lit = Number(value.dataset.listPanel) === active && !hidden;
          gsap.set(self.lines, { yPercent: lit ? 0 : AWAY });
        },
      });
      splits.push(value.__split);
    });
    meta.classList.add('is--split');
  }
  // Every part but the lit one leaves, not only the one the list has just
  // left: a part passed on the way, or caught on its way in, would
  // otherwise be left standing in view under the next one's. Each line
  // still in view leaves by the edge it is nearer (one at rest, the way
  // the list is going), so none crosses its mask on the way out. Says
  // whether any had to.
  function clearOthers(k, down) {
    let leaving = false;
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      stop(i);
      const lines = linesOf(i).filter((line) => Math.abs(yOf(line)) < AWAY);
      if (!lines.length) continue;
      leaving = true;
      const edges = lines.map((line) => {
        const y = yOf(line);
        return y < 0 || (y === 0 && down) ? -AWAY : AWAY;
      });
      moving.set(i, gsap.to(lines, { yPercent: (j) => edges[j], duration: 0.32, ease: 'power2.in', stagger: 0.03 }));
    }
    return leaving;
  }
  // The lit part's lines come in from the other side, or back from where
  // they are if they were caught leaving; once they are in, anything still
  // in view beside them goes too
  function swapValues(was, k) {
    values.forEach((v) => v.classList.toggle('is--active', Number(v.dataset.listPanel) === k));
    if (!splitReady() || hidden) return;
    const down = was < 0 || k > was;
    const leaving = clearOthers(k, down);
    stop(k);
    const come = linesOf(k);
    come.forEach((line) => {
      if (Math.abs(yOf(line)) >= AWAY) gsap.set(line, { yPercent: down ? AWAY : -AWAY });
    });
    moving.set(k, gsap.to(come, {
      yPercent: 0,
      duration: 0.8,
      ease: 'expo.out',
      stagger: 0.06,
      delay: leaving ? RISE_DELAY : 0,
      onComplete: () => {
        if (active === k) clearOthers(k, down);
      },
    }));
  }

  // ---- Learn more (HomeHero.astro): one link for the lit part, pointed
  // at its page and named for it; About (the film) has none, so there it
  // fades and leaves the keys and screen readers. It stands beside the
  // name's first line, set level with it by eye rather than by box: the
  // top of its capital (the L) on the top of the name's lowercase (its
  // x-height), not on the name's capitals or ascenders, so the small line
  // hangs from the body of the big one. Across, it clears the widest first
  // line of the parts that have it by a little more than the name's size
  // (CTA_GAP), so it holds one place as the parts change and reads as an
  // element of its own, in step with the name (--cta-x, --cta-y, from the
  // fields' top left). The name's box is read, not its lines, which may be
  // on their way in. On a phone it simply follows the overview.
  const CTA_GAP = 1.1; // in the name's size
  const cta = root.querySelector('[data-list-cta]');
  const ctaName = cta && cta.querySelector('[data-list-cta-name]');
  const ctaLabel = cta && cta.querySelector('.home-list__cta-label');
  const titles = values.filter((v) => v.closest('.home-list__field.is--title'));
  const metrics = document.createElement('canvas').getContext('2d');
  // An element's line height, how far down a line box its baseline sits,
  // and how far above the baseline its capitals and its lowercase reach
  function lineOf(el) {
    const cs = getComputedStyle(el);
    metrics.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = metrics.measureText('H');
    const ascent = m.fontBoundingBoxAscent;
    const content = ascent + m.fontBoundingBoxDescent;
    const height = parseFloat(cs.lineHeight) || content;
    const x = metrics.measureText('x').actualBoundingBoxAscent;
    return { height, baseline: (height - content) / 2 + ascent, cap: m.actualBoundingBoxAscent, x };
  }
  // How far a name's first line runs from its left: its split line, or
  // before the split, the words up to the first break (a translate on the
  // lines moves them up and down only, so the width holds)
  function firstLineWidth(title) {
    const range = document.createRange();
    const line = title.querySelector('.home-list__line');
    const br = title.querySelector('br');
    if (line) range.selectNodeContents(line);
    else if (br) { range.setStart(title, 0); range.setEndBefore(br); }
    else range.selectNodeContents(title);
    return range.getBoundingClientRect().right - title.getBoundingClientRect().left;
  }
  const linked = (v) => {
    const shot = shots[Number(v.dataset.listPanel)];
    return shot && !shot.hasAttribute('data-reel-card');
  };
  function pointCta(k) {
    if (!cta || !shots[k]) return;
    const field = cta.parentElement;
    const film = shots[k].hasAttribute('data-reel-card');
    field.classList.toggle('is--off', film);
    field.setAttribute('aria-hidden', String(film));
    cta.tabIndex = film ? -1 : 0;
    if (film) return;
    cta.setAttribute('href', shots[k].getAttribute('href') || '#');
    if (ctaName) ctaName.textContent = `: ${items[k].dataset.listTitle || ''}`;
    const title = titles.find((v) => Number(v.dataset.listPanel) === k);
    if (!title || !meta || getComputedStyle(field).position !== 'absolute') return;
    const box = meta.getBoundingClientRect();
    const size = parseFloat(getComputedStyle(title).fontSize) || 0;
    const widest = Math.max(...titles.filter(linked).map(firstLineWidth));
    const x = Math.min(widest + CTA_GAP * size, box.width - cta.offsetWidth);
    // The top of the name's lowercase on its first line, and the top of
    // the link's capital, from its field's top
    const nameLine = lineOf(title);
    const nameBody = title.getBoundingClientRect().top + nameLine.baseline - nameLine.x;
    const label = ctaLabel || cta;
    const labelLine = lineOf(label);
    const ctaCap = label.offsetTop + labelLine.baseline - labelLine.cap;
    const y = nameBody - box.top - ctaCap;
    meta.style.setProperty('--cta-x', `${Math.round(x)}px`);
    meta.style.setProperty('--cta-y', `${Math.round(y)}px`);
  }
  // The faces change the type's measure once they are in
  if (cta && document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (active >= 0) pointCta(active); });

  // ---- The opening's hand-over (loader.js): while it runs, the values
  // wait; as its squares become the pictures it says so (home:arrive), and
  // the lit values rise into their masks. Arriving any other way (a page
  // change, the opening done or never run), they are simply there.
  const html = document.documentElement;
  let arrived = !html.classList.contains('is--intro');
  function arrive() {
    if (arrived) return;
    arrived = true;
    root.classList.add('is--arrived');
    hidden = false;
    if (tint) tint.reveal();
    if (typeof gsap === 'undefined' || reduced) return;
    const lines = linesOf(active);
    stop(active);
    moving.set(active, gsap.fromTo(lines, { yPercent: AWAY }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, delay: 0.15 }));
  }
  const introWatch = arrived ? null : new MutationObserver(() => {
    if (!html.classList.contains('is--intro')) arrive();
  });
  if (introWatch) introWatch.observe(html, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('home:arrive', arrive);
  if (!arrived) hidden = true;

  // ---- The grid behind, tinted by the lit picture (hero-tint.js): its
  // colours come in with the hero's own type, and turn as the part does.
  // Arriving by a page transition, it was made (and painted) as the page
  // came in (prepareHeroTint): that one is taken over
  const tint = root.__heroTint || (typeof createHeroTint === 'function' ? createHeroTint(root, { reduced }) : null);
  if (tint && arrived) tint.reveal();

  // ---- The clients' band comes up over the hero: as its top rises from the
  // foot of the screen to the head, the hero's last picture and its type go
  // up at half the speed, so the band slides over them, and a shade
  // deepens on the hero as it goes under (.home-reel__cover, style.css: its
  // own element, so each frame changes one layer's opacity and restyles
  // nothing else). The hero's own box never moves, only what is in it, so
  // nothing measured from it (the bar's trigger) shifts.
  let cover = null;
  const band = root.nextElementSibling;
  if (band && !reduced && typeof gsap !== 'undefined' && window.ScrollTrigger) {
    const layers = [root.querySelector('.home-reel__surface'), root.querySelector('.home-reel__chrome'), list].filter(Boolean);
    const shade = root.querySelector('[data-list-cover]');
    cover = gsap.timeline({
      scrollTrigger: { trigger: band, start: 'top bottom', end: 'top top', scrub: true, invalidateOnRefresh: true },
    })
      .fromTo(layers, { y: 0 }, { y: () => window.innerHeight * 0.5, ease: 'none' }, 0);
    if (shade) cover.fromTo(shade, { opacity: 0 }, { opacity: 0.6, ease: 'none' }, 0);
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  // Something else has the page: the opening, a page change, the menu, a
  // panel or the film (each stops Lenis)
  const busy = () => (window.lenis && window.lenis.isStopped)
    || document.documentElement.classList.contains('is--loading')
    || !!root.closest('[data-page-leaving]');

  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
  // The photographs' drift: each by how far its picture is from the middle
  // (r, held within the list), only where that has changed (those well off
  // screen hold at the most)
  const drifted = items.map(() => null);
  function drift(r) {
    drifts.forEach((layer, i) => {
      if (!layer) return;
      const d = i - r;
      const shift = reduced ? 0 : Math.max(-DRIFT_MAX, Math.min(DRIFT_MAX, -d * DRIFT));
      const value = Math.round(shift * 100) / 100;
      if (value === drifted[i]) return;
      drifted[i] = value;
      layer.style.transform = `translate3d(0, ${value}%, 0)`;
    });
  }

  // The wheel of numbers (HomeHero.astro, style.css .home-list__dial),
  // turned by the same reading of the scroll: each number how many parts
  // it is from the middle (--d, the stylesheet turns it that far round the
  // wheel) and how far it has faded (--o: whole in the middle, faint one
  // part away, gone by a part and a half, so no more than the lit number
  // and its neighbours ever show), only where that has changed
  const dialNums = Array.from(root.querySelectorAll('[data-list-dial]'));
  const dialed = dialNums.map(() => null);
  function turnDial(r) {
    dialNums.forEach((num, i) => {
      const d = Math.round((i - r) * 1000) / 1000;
      if (d === dialed[i]) return;
      dialed[i] = d;
      num.style.setProperty('--d', d);
      num.style.setProperty('--o', Math.max(0, 1 - Math.abs(d) * 0.72).toFixed(3));
    });
  }

  // The page, closing softly on where the hand puts it (Smooothy's lerp)
  function followTo(y) {
    const lenis = window.lenis;
    const to = Math.min(Math.max(y, 0), maxScroll());
    if (lenis && !reduced) lenis.scrollTo(to, { lerp: HAND_LERP });
    else jumpTo(to);
  }
  // The page, there at once
  function jumpTo(y) {
    const lenis = window.lenis;
    const to = Math.min(Math.max(y, 0), maxScroll());
    if (lenis) lenis.scrollTo(to, { immediate: true });
    else window.scrollTo(0, to);
  }

  // The page, gliding there, on a curve that starts at the speed the page
  // is already going (v0, pixels a millisecond down the page) and eases
  // into place: a scroll carries straight on into its stop, as if it had
  // simply been scrolled there, rather than stopping and setting off again;
  // from rest it eases in and out. However fast it comes in, it never runs
  // past the stop and back.
  let aimed = null;   // the picture a glide is heading for
  let gliding = false;
  let glideGuard = 0;
  function glide(y, v0, k) {
    const lenis = window.lenis;
    const to = Math.min(Math.max(y, 0), maxScroll());
    const from = lenis && Number.isFinite(lenis.animatedScroll) ? lenis.animatedScroll : window.scrollY;
    const d = to - from;
    aimed = k === undefined ? null : k;
    if (!lenis || reduced || Math.abs(d) < 1) {
      jumpTo(to);
      aimed = null;
      return;
    }
    const T = Math.min(1.25, 0.6 + (0.4 * Math.abs(d)) / pitch);
    // The curve's slope as it sets off, in whole moves per whole time: the
    // page's own speed, so there is no jolt where the glide takes over
    const slope = Math.max(-1, Math.min(2.6, ((v0 || 0) * T * 1000) / d));
    const easing = (s) => slope * (s * s * s - 2 * s * s + s) + s * s * (3 - 2 * s);
    gliding = true;
    clearTimeout(glideGuard);
    glideGuard = setTimeout(() => { gliding = false; }, T * 1000 + 300);
    lenis.scrollTo(to, { duration: T, easing, onComplete: () => { gliding = false; aimed = null; } });
  }
  const glideTo = (k, v0) => glide(stopAt(k), v0 || 0, k);
  // A glide caught (a finger on the screen, a key): it stops where it is
  function catchGlide() {
    aimed = null;
    if (!gliding) return;
    gliding = false;
    const lenis = window.lenis;
    if (lenis && Number.isFinite(lenis.animatedScroll)) lenis.scrollTo(lenis.animatedScroll, { immediate: true });
  }
  // The picture the list is on, or on its way to
  const heading = () => (aimed !== null ? aimed : Math.min(n - 1, Math.max(0, Math.round(along()))));

  // A finger on the screen or a mouse button down: no glide under it
  let touches = 0;
  let mouseDown = false;
  const held = () => touches > 0 || mouseDown;

  // The page's speed now, from its last few positions, pixels a
  // millisecond down the page
  const trail = [];
  function speedNow() {
    const now = performance.now();
    while (trail.length && now - trail[0][0] > 80) trail.shift();
    if (trail.length < 2) return 0;
    const [t0, y0] = trail[0];
    const [t1, y1] = trail[trail.length - 1];
    return t1 > t0 ? (y1 - y0) / (t1 - t0) : 0;
  }

  // Into a stop: part way between two pictures, on to the next the way the
  // page was going (or back, if it barely left), judged from where the
  // scroll is heading — Lenis's goal, while it still eases on after the
  // wheel — and steered there from the speed it has. After the wheel, a
  // moment after its last step, while the page is still moving; otherwise
  // once the page has been still a moment.
  let timer = 0;
  let lastWheel = 0;
  let lastY = window.scrollY;
  let travel = 0;
  function settleIn(ms) {
    clearTimeout(timer);
    if (reduced || !window.lenis) return;
    timer = setTimeout(settle, ms);
  }
  function settle() {
    const lenis = window.lenis;
    if (gliding || busy() || held() || !lenis) return;
    const goal = Number.isFinite(lenis.targetScroll) ? lenis.targetScroll : window.scrollY;
    const r = (goal - first) / pitch;
    if (r <= 0 || r >= n - 1) return;
    const below = Math.floor(r);
    const f = r - below;
    if (f < 0.004 || f > 0.996) return; // already heading for one
    const lean = Math.min(LEAN, LEAN_MAX / pitch);
    let k = Math.round(r);
    if (travel > 0) k = f > lean ? below + 1 : below;
    else if (travel < 0) k = f < 1 - lean ? below : below + 1;
    glideTo(k, speedNow());
  }
  const onScroll = () => {
    const y = window.scrollY;
    if (y !== lastY) travel = Math.sign(y - lastY);
    lastY = y;
    trail.push([performance.now(), y]);
    if (trail.length > 12) trail.shift();
    schedule();
    if (!gliding && performance.now() - lastWheel > 300) settleIn(STILL);
  };
  // The wheel takes over from any glide (Lenis's own easing follows it)
  const onWheel = (event) => {
    lastWheel = performance.now();
    aimed = null;
    gliding = false;
    if (event.deltaY && Math.abs(event.deltaY) >= Math.abs(event.deltaX)) travel = Math.sign(event.deltaY);
    settleIn(WHEEL_REST);
  };

  // ---- By hand

  // A drag on the pictures (a mouse or a pen): once it has gone far enough
  // to say which way, up or down is the page's, moved with the pointer
  let drag = null;
  let quietClick = 0; // until when a click ends a drag rather than presses
  function onDown(event) {
    if (event.pointerType === 'mouse') mouseDown = true;
    if (drag) {
      endDrag(null);
      return;
    }
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0) return;
    if (!(event.target instanceof Element) || !list.contains(event.target) || busy()) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, from: window.scrollY, axis: '', trail: [] };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }
  function onMove(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.axis) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        // Sideways: nothing to move, and no press at its end either
        quietClick = performance.now() + 400;
        endDrag(null);
        return;
      }
      drag.axis = 'y';
      drag.y = event.clientY;
      drag.from = window.scrollY;
      aimed = null;
      gliding = false;
      clearTimeout(timer);
      root.classList.add('is--dragging');
      try { list.setPointerCapture(drag.id); } catch (_) {}
    }
    followTo(drag.from - (event.clientY - drag.y));
    drag.trail.push([event.timeStamp, event.clientY]);
    while (drag.trail.length > 2 && event.timeStamp - drag.trail[0][0] > 100) drag.trail.shift();
  }
  function onUp(event) {
    if (event.pointerType === 'mouse') mouseDown = false;
    if (!drag || event.pointerId !== drag.id) return;
    endDrag(event.type === 'pointerup' ? event : null);
  }
  // Let go: on with the pointer's speed over its last tenth of a second;
  // within the list, to the picture that reaches (a flick turns at least
  // one), past its ends simply on
  function endDrag(event) {
    const d = drag;
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    if (!d || !d.axis) return;
    root.classList.remove('is--dragging');
    try { list.releasePointerCapture(d.id); } catch (_) {}
    quietClick = performance.now() + 400;
    let speed = 0; // pixels a second down the page
    const trail = d.trail;
    if (event && trail.length > 1 && event.timeStamp - trail[trail.length - 1][0] < 80) {
      const [t0, y0] = trail[0];
      const [t1, y1] = trail[trail.length - 1];
      if (t1 > t0) speed = (-(y1 - y0) / (t1 - t0)) * 1000;
    }
    const end = window.scrollY + speed * CARRY;
    const r = (end - first) / pitch;
    if (r < -0.5 || r > n - 0.5) {
      // Past the list: on with the fling, if there is one
      if (Math.abs(speed) > 50) glide(end, speed / 1000);
      else settleIn(STILL);
      return;
    }
    let k = Math.min(n - 1, Math.max(0, Math.round(r)));
    const from = Math.round((d.from - first) / pitch);
    if (k === from && Math.abs(speed) > pitch * 0.8) k = Math.min(n - 1, Math.max(0, from + Math.sign(speed)));
    glideTo(k, speed / 1000);
  }
  const onLost = (event) => {
    if (drag && event.pointerId === drag.id) endDrag(null);
  };

  // A press: after a drag, nothing; on a waiting picture, it comes to the
  // middle; on the lit one (or the one on its way there), its own
  function onClick(event) {
    if (performance.now() < quietClick) {
      event.preventDefault();
      event.stopImmediatePropagation();
      quietClick = 0;
      return;
    }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const shot = event.target instanceof Element ? event.target.closest('[data-list-shot]') : null;
    if (!shot) return;
    const i = shots.indexOf(shot);
    if (i < 0 || i === heading()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!busy()) glideTo(i);
  }
  // Tabbed to: a waiting picture comes to the middle
  function onFocus(event) {
    const shot = event.target instanceof Element ? event.target.closest('[data-list-shot]') : null;
    if (!shot || !shot.matches(':focus-visible') || busy()) return;
    const i = shots.indexOf(shot);
    if (i >= 0 && i !== heading()) glideTo(i);
  }
  const onDragStart = (event) => event.preventDefault();
  // A finger on the screen catches a glide, as it would the page
  const onTouch = (event) => {
    if (event.type === 'touchstart') catchGlide();
    touches = event.touches.length;
    if (!touches) settleIn(STILL);
  };
  // A key takes over from a glide too
  const onKey = () => catchGlide();
  const onPointerUp = (event) => {
    if (event.pointerType !== 'mouse') return;
    mouseDown = false;
    settleIn(STILL);
  };
  const onBlur = () => {
    touches = 0;
    mouseDown = false;
    if (drag) endDrag(null);
  };

  const resize = new ResizeObserver(() => measure());
  resize.observe(list);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('pointerdown', onDown);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('touchstart', onTouch, { passive: true });
  document.addEventListener('touchend', onTouch, { passive: true });
  document.addEventListener('touchcancel', onTouch, { passive: true });
  list.addEventListener('lostpointercapture', onLost);
  list.addEventListener('click', onClick, true);
  list.addEventListener('focusin', onFocus);
  list.addEventListener('dragstart', onDragStart);
  window.addEventListener('blur', onBlur);
  window.addEventListener('wheel', onWheel, { passive: true });
  document.addEventListener('keydown', onKey);
  measure();
  splitValues();

  onPageLeave(() => {
    splits.forEach((split) => split.kill());
    moving.forEach((tween) => tween.kill());
    if (tint) tint.destroy();
    if (cover) {
      if (cover.scrollTrigger) cover.scrollTrigger.kill();
      cover.kill();
    }
    if (introWatch) introWatch.disconnect();
    document.removeEventListener('home:arrive', arrive);
    resize.disconnect();
    if (drag) endDrag(null);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('pointerdown', onDown);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
    document.removeEventListener('touchstart', onTouch);
    document.removeEventListener('touchend', onTouch);
    document.removeEventListener('touchcancel', onTouch);
    list.removeEventListener('lostpointercapture', onLost);
    list.removeEventListener('click', onClick, true);
    list.removeEventListener('focusin', onFocus);
    list.removeEventListener('dragstart', onDragStart);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('wheel', onWheel);
    document.removeEventListener('keydown', onKey);
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    clearTimeout(glideGuard);
  });
}

document.addEventListener('DOMContentLoaded', () => initHomeList());
