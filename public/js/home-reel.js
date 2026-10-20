// -----------------------------------------
// THE HOME HERO'S REEL: the photographs on the stage
// -----------------------------------------
//
// index.astro, "The home hero: the reel" in style.css. The page scrolls
// through the parts while a stage holds the middle of the screen; this
// places the pictures on it, says which one is lit (is--active on it and on
// its name, data-reel-panel), and where the name stands.
//
// Two layouts, chosen on the hero (data-reel-layout): the column, below,
// and the row ("row", after t11.com): landscape pictures in a line across
// the screen a little above its middle, the lit one centred and large, the
// others a little smaller, faded and softly blurred to its left and right.
// The row loops: past the last comes the first again, so from the start
// the last parts wait on the left as the next ones do on the right. It is
// on the grid as the column is (the lit picture's sides, top and bottom on
// lines, its middle the bar's), its name under it, and a ruler of the
// parts' numbers along the stage's foot sliding (and looping) with the row.
//
// One number says where the reel is, in pictures from the first:
//   - the scroll's share: the scroll through the steps, as pictures, from
//     the first (0) to the last (n − 1), arriving at the last a little
//     before the stage lets go (LAST) so it stands a moment. It follows the
//     scroll straight away, with no dead stretch; when the scroll comes to
//     rest between two stops, the page glides on to the next one in the
//     direction it was going (or back, if it barely left: LEAN), so the
//     reel always settles with one picture lit;
//   - in the row, the hand's share: a drag or a swipe across the stage (the
//     row follows the finger, then carries on with its speed to a whole
//     picture), a sideways trackpad stroke or shift-wheel, the arrow keys
//     while the hero is on screen, a waiting picture pressed or tabbed to
//     (it comes to the middle the nearer way round, rather than opening),
//     or a ruler number pressed. An upward or downward swipe stays the
//     page's own; a press on the lit picture opens it as ever.
// The number shown follows the two a touch behind, eased frame by frame
// (FOLLOW; straight with the hand while it drags). From it, each picture's
// distance d from the middle, in pictures (in the row, the nearer way
// round, so between −n/2 and n/2), gives
//   - its size: full within one step of the middle, falling evenly to the
//     waiting size a step away (and staying there). In the column the
//     waiting size is the floating navigation's bar: a waiting picture is
//     exactly as wide as the bar is drawn (never wider than the lit one);
//   - its strength: full to faded the same way, and its softness: sharp to
//     blurred (the blur as seen, whatever its scale). In the row, the one
//     coming round the back fades out and in at the far ends (half a
//     picture's travel), off screen on all but the widest;
//   - its place: always one gap from its neighbours. The lit one is
//     centred, its neighbours a half of each and a gap away, and the rest
//     stacked small beyond them — measured so that, as two pictures trade
//     sizes, their edges keep exactly the gap between them;
//   - in the column, across: none. Every picture stands on the screen's
//     middle line, as the bar does, so the waiting ones make a column the
//     bar's width running down to the bar itself, and the lit one stands
//     centred. The stage ends a gap above the bar (--reel-clear); the
//     waiting ones below carry on down behind the bar to the foot of the
//     screen;
//   - the texts beside the lit picture: where its edges are, in the frame,
//     and on the screen (--reel-lit-left, --reel-lit-right,
//     --reel-room-left, --reel-room-right on the hero);
// A transform, an opacity and a blur per picture, written once a frame
// and only while something moves; the scroll is read, nothing is measured
// on scroll. The geometry is measured once, and again on a resize.
//
// Not while anything else has the page (the opening, a page change, the
// menu, a panel or the film: Lenis stopped): no drags, keys or strokes
// then. A second finger ends a drag where it is; so does the window losing
// focus. A drag never ends in a press, and never drags the picture or
// selects text. Ctrl- or cmd-pressing a waiting picture opens it as a link
// would. Keys in a field, or with a modifier, are left alone.
//
// Barba runs this on the first load as well as the page's own startup:
// built once per page, and taken down when the page is left (lifecycle.js).
// A page on its way out holds still. Reduced motion: no easing behind the
// scroll or the hand, and no glide to a stop.

function initHomeReel(scope) {
  const root = (scope || document).querySelector('[data-home-reel]');
  // The list is home-list.js's
  if (!root || root.__homeReel || root.dataset.reelLayout === 'list') return;
  root.__homeReel = true;

  const steps = Array.from(root.querySelectorAll('[data-reel-step]'));
  const shots = Array.from(root.querySelectorAll('[data-reel-shot]'));
  // Each one's picture: a photograph, or the projects folder
  const imgs = shots.map((shot) => shot.querySelector('.home-reel__img'));
  const panels = Array.from(root.querySelectorAll('[data-reel-panel]'));
  const rowLayout = root.dataset.reelLayout === 'row';
  const ruler = root.querySelector('[data-reel-ruler]');
  const rulerMarks = ruler ? Array.from(ruler.children) : [];
  const n = shots.length;
  if (!n || steps.length !== n) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FOLLOW = 0.35;  // how far the shown position closes on its goal per frame
  const SNAP = 140;     // ms of stillness before gliding to a stop
  const LEAN = 0.12;    // past a stop by more than this, the glide goes on to the next
  const LAST = 0.2;     // the last picture's stand, in steps, before the stage lets go
  const CARRY = 0.18;   // a flick's carry, in seconds of its speed
  const hasGsap = typeof gsap !== 'undefined';

  let first = 0;  // the first step's middle, from the top of the document
  let step = 1;   // the scroll from one step to the next
  let H = 1;      // the lit picture's height
  let small = 0.28;
  let dim = 0.32;
  let blur = 0;   // a waiting picture's softness, as seen
  let gap = 24;
  let W = 1;      // the lit picture's width
  let base = 0;   // a picture's own left edge, untransformed, on the screen
  let colGap = 24; // the gap kept above the bar
  let snapFar = 0; // the grid's pitch, when the pictures keep to it
  let rulerStep = 0; // the ruler's distance between two parts' numbers
  let slot = 1;   // the lit one's middle to a neighbour's, in pixels: a drag of this turns one picture
  const bar = document.querySelector('[data-fnav]');
  const stageFrame = shots[0].parentElement;

  function measure() {
    const styles = getComputedStyle(root);
    small = parseFloat(styles.getPropertyValue('--reel-small')) || small;
    dim = parseFloat(styles.getPropertyValue('--reel-dim')) || dim;
    blur = parseFloat(styles.getPropertyValue('--reel-blur')) || 0;
    const box = steps[0].getBoundingClientRect();
    step = box.height || step;
    first = box.top + window.scrollY + step / 2;
    H = shots[0].offsetHeight || H;
    W = shots[0].offsetWidth || W;
    // The gaps, in pixels, from the stylesheet's lengths
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;box-sizing:content-box;height:var(--reel-gap);width:var(--reel-nav-gap);padding:var(--reel-lift, 0px) 0 0';
    root.appendChild(probe);
    const lift = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    gap = probe.offsetHeight - lift;
    colGap = probe.offsetWidth;
    probe.remove();
    // The bar, where it is drawn (its rise is a vertical move only, so its
    // width is its resting one); its top, less a gap, from where it rests.
    // Written first: the stage ends there.
    const b = bar && bar.offsetWidth ? bar.getBoundingClientRect() : null;
    const barClear = b ? window.innerHeight - parseFloat(getComputedStyle(bar).bottom) - bar.offsetHeight - colGap : window.innerHeight;
    root.style.setProperty('--reel-clear', `${barClear.toFixed(1)}px`);
    const stage = stageFrame.getBoundingClientRect();
    // On the site's square grid (--grid-pitch; its lines every P pixels from
    // the screen's top left corner, the hero's grid held still with the
    // stage): the lit picture's width and height whole cells less the line,
    // its sides as many whole cells out from the bar's (itself on the grid)
    // as its size allows, so the two share a middle and the waiting column,
    // the bar's width, lies exactly over the bar; its top on a line nearest
    // the stage's middle; the gaps below it whole cells, so each waiting
    // picture's top is on a line too. The stylesheet's size is read afresh
    // each time.
    const P = parseFloat(styles.getPropertyValue('--grid-pitch')) || 0;
    shots.forEach((shot) => Object.assign(shot.style, { width: '', height: '', left: '', top: '', margin: '' }));
    W = shots[0].offsetWidth || W;
    H = shots[0].offsetHeight || H;
    base = stage.left + stageFrame.offsetWidth / 2 - W / 2;
    snapFar = 0;
    let litTop = stageFrame.offsetHeight / 2 - H / 2;
    if (rowLayout) {
      // The row: the lit picture centred across, a little above the middle
      // of the stage (room under it for its name), on the grid
      litTop -= lift;
      let axis = stageFrame.offsetWidth / 2;
      if (P) {
        // An even number of cells across, so its middle is a grid line: the
        // axis, where the ruler's middle stands. Centred on the bar (an even
        // number of cells itself), whole cells out from its sides, so the
        // bar sits under the axis too; without the bar, on the line nearest
        // the middle of the screen (where the bar would be)
        const ratio = H / W;
        let left;
        if (b && b.width) {
          W = b.width + 2 * P * Math.max(0, Math.round((W - b.width) / (2 * P)));
          left = b.left - (W - b.width) / 2 - stage.left;
        } else {
          W = Math.round((W + 1) / (2 * P)) * 2 * P - 1;
          left = Math.round((stageFrame.offsetWidth / 2 - W / 2 - 1) / P) * P + 1;
        }
        H = Math.round((W * ratio + 1) / P) * P - 1;
        axis = left + (W - 1) / 2;
        litTop = Math.round((stageFrame.offsetHeight / 2 - lift - H / 2 - 1) / P) * P + 1;
        shots.forEach((shot) => Object.assign(shot.style, {
          width: `${W}px`,
          height: `${H}px`,
          left: `${left}px`,
          top: `${litTop}px`,
          margin: '0px',
        }));
        base = stage.left + left;
        gap = Math.round(gap / P) * P + 1;
        snapFar = P;
      }
      root.style.setProperty('--reel-axis', `${(stage.left - root.getBoundingClientRect().left + axis).toFixed(1)}px`);
    } else if (P && b && b.width) {
      const bw = b.width;
      W = bw + 2 * P * Math.max(0, Math.round((W - bw) / (2 * P)));
      H = Math.round((W * 1.25 + 1) / P) * P - 1;
      base = b.left - (W - bw) / 2;
      litTop = Math.round((stageFrame.offsetHeight / 2 - H / 2 - 1) / P) * P + 1;
      shots.forEach((shot) => Object.assign(shot.style, {
        width: `${W}px`,
        height: `${H}px`,
        left: `${(base - stage.left).toFixed(2)}px`,
        top: `${litTop}px`,
        margin: '0px',
      }));
      gap = Math.round(gap / P) * P + 1;
      snapFar = P;
    }
    // A waiting picture: the bar's width exactly (in the column)
    if (!rowLayout && b && b.width) small = Math.min(1, b.width / W);
    const span = rowLayout ? W : H;
    slot = span / 2 + gap + (span * small) / 2;
    // Where the lit picture stands in the frame, for the texts under it
    root.style.setProperty('--reel-lit-top', `${litTop.toFixed(1)}px`);
    root.style.setProperty('--reel-lit-h', `${H}px`);
    // The ruler: a part's number every neighbour's distance, the lit one's
    // under the middle of the screen
    if (rulerMarks.length) {
      rulerStep = snapFar ? Math.round(slot / snapFar) * snapFar : slot;
      root.style.setProperty('--ruler-step', `${rulerStep}px`);
    }
    // The texts beside the lit picture, in the frame, and their room
    root.style.setProperty('--reel-lit-left', `${(base - stage.left).toFixed(1)}px`);
    root.style.setProperty('--reel-lit-right', `${(base + W - stage.left).toFixed(1)}px`);
    root.style.setProperty('--reel-room-left', `${base.toFixed(1)}px`);
    root.style.setProperty('--reel-room-right', `${(window.innerWidth - base - W).toFixed(1)}px`);
    // Straight to where it should be, with nothing to catch up
    shown = target();
    draw(shown, true);
  }

  // ---- Where the reel is

  // The scroll, in pictures from the first, unclamped: the last arrives
  // LAST of a step before the last step's middle reaches the screen's
  const perPicture = n > 1 ? (n - 1 - LAST) / (n - 1) : 1;
  const along = () => (window.scrollY + window.innerHeight / 2 - first) / (step * perPicture);
  const scrolled = () => Math.min(Math.max(along(), 0), n - 1);
  // The scroll that puts picture k in the middle
  const stopAt = (k) => first + k * step * perPicture - window.innerHeight / 2;
  // The hand's share (the row only): whole pictures at rest; tweened
  const hand = { offset: 0 };
  let aim = 0; // where the hand's share is heading
  const target = () => scrolled() + (rowLayout ? hand.offset : 0);
  // A picture's distance from the middle: in the row, the nearer way round
  const across = (i, p) => {
    const d = i - p;
    return rowLayout ? d - n * Math.round(d / n) : d;
  };
  // In the row, the one coming round the back fades over the last half
  // picture before the far end
  const edge = (a) => (rowLayout ? Math.min(1, Math.max(0, (n / 2 - a) * 2)) : 1);
  const wrap = (k) => ((k % n) + n) % n;
  // The picture the reel is on, or heading for
  const lit = (p) => (rowLayout ? wrap(Math.round(p)) : Math.min(n - 1, Math.max(0, Math.round(p))));
  const heading = () => lit(scrolled() + aim);

  // ---- Drawing

  let active = -1;
  function light(k) {
    active = k;
    shots.forEach((shot, i) => shot.classList.toggle('is--active', i === k));
    panels.forEach((panel) => panel.classList.toggle('is--active', Number(panel.dataset.reelPanel) === k));
    if (!rowLayout) return;
    // The film's still is its play button only while lit: pressed while
    // waiting, it comes to the middle instead
    shots.forEach((shot, i) => {
      if (!shot.hasAttribute('data-reel-card')) return;
      if (i === k) shot.dataset.cursor = 'play';
      else delete shot.dataset.cursor;
    });
    if (typeof refreshCursor === 'function') refreshCursor();
  }

  let last = null;
  function draw(p, force) {
    if (!force && p === last) return;
    last = p;
    // The row runs across on the pictures' widths, the column down on
    // their heights
    const span = rowLayout ? W : H;
    const hs = span * small;
    const near = span / 2 + gap + hs / 2;  // centre to a neighbour's centre
    // Between two waiting pictures: on the grid, whole cells
    const far = snapFar ? Math.round((hs + gap) / snapFar) * snapFar : hs + gap;
    if (rulerStep) {
      rulerMarks.forEach((mark, i) => {
        const d = across(i, p);
        const a = Math.abs(d);
        mark.style.transform = `translate3d(${(d * rulerStep).toFixed(2)}px, 0, 0)`;
        mark.style.opacity = ((0.35 + 0.65 * Math.max(0, 1 - a)) * edge(a)).toFixed(3);
      });
    }
    for (let i = 0; i < n; i++) {
      const d = across(i, p);
      const a = Math.abs(d);
      const w = Math.max(0, 1 - a);
      const scale = small + (1 - small) * w;
      const x = Math.sign(d) * (a <= 1 ? near * a : near + (a - 1) * far);
      const strength = (dim + (1 - dim) * w).toFixed(3);
      // The blur as seen: drawn before the scale, so divided by it
      const soft = (blur * (1 - w)) / scale;
      shots[i].style.transform = rowLayout
        ? `translate3d(${x.toFixed(2)}px, 0, 0) scale(${scale.toFixed(4)})`
        : `translate3d(0, ${x.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      if (rowLayout) {
        const e = edge(a);
        shots[i].style.opacity = e < 1 ? e.toFixed(3) : '';
        shots[i].style.pointerEvents = e < 0.5 ? 'none' : '';
      }
      imgs[i].style.opacity = strength;
      imgs[i].style.filter = soft > 0.05 ? `blur(${soft.toFixed(2)}px)` : 'none';
    }
    const k = lit(p);
    if (k !== active) light(k);
  }

  // The shown position closes on its goal a share each frame (the same
  // share whatever the frame rate), and stops once it is there; with the
  // hand while it drags
  let shown = 0;
  let frame = 0;
  let then = 0;
  let dragging = false;
  function tick(now) {
    frame = 0;
    if (root.closest('[data-page-leaving]')) return;
    const goal = target();
    const dt = then ? Math.min(64, now - then) : 16.7;
    const k = reduced || dragging ? 1 : 1 - Math.pow(1 - FOLLOW, dt / 16.7);
    shown += (goal - shown) * k;
    if (Math.abs(goal - shown) < 0.0004) shown = goal;
    draw(shown, false);
    if (shown !== goal) {
      then = now;
      frame = requestAnimationFrame(tick);
    } else {
      then = 0;
    }
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };

  // ---- The scroll

  // Something else has the page: the opening, a page change, the menu, a
  // panel or the film (each stops Lenis)
  const busy = () => (window.lenis && window.lenis.isStopped)
    || document.documentElement.classList.contains('is--loading')
    || !!root.closest('[data-page-leaving]');

  // A finger on the screen or a mouse button down (the scrollbar's thumb
  // held, a drag): no glide under it
  let touches = 0;
  let mouseDown = false;
  const held = () => touches > 0 || mouseDown;

  // At rest between two stops, on through the hero: glide to the next one
  // the way the scroll was going, or back if it barely left
  let idle = 0;
  let lastY = window.scrollY;
  let travel = 0;
  function snapLater() {
    clearTimeout(idle);
    const lenis = window.lenis;
    if (reduced || !lenis) return;
    idle = setTimeout(() => {
      if (lenis.isStopped || held() || root.closest('[data-page-leaving]')) return;
      const r = along();
      if (r <= 0 || r >= n - 1) return;
      const below = Math.floor(r);
      const f = r - below;
      if (f < 0.004 || f > 0.996) return;
      let stop = Math.round(r);
      if (travel > 0) stop = f > LEAN ? below + 1 : below;
      else if (travel < 0) stop = f < 1 - LEAN ? below : below + 1;
      lenis.scrollTo(stopAt(stop), {
        duration: 0.6,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    }, SNAP);
  }

  const onScroll = () => {
    const y = window.scrollY;
    if (y !== lastY) travel = Math.sign(y - lastY);
    lastY = y;
    schedule();
    snapLater();
  };

  // ---- The hand (the row only)

  // To a whole picture (or wherever it is sent): from where the row is, on
  // a curve that starts at the hand's speed and settles
  function glide(to) {
    aim = to;
    if (hasGsap) gsap.killTweensOf(hand);
    const dist = Math.abs(to - hand.offset);
    if (reduced || !hasGsap || dist < 0.0005) {
      hand.offset = to;
      settled();
      return;
    }
    gsap.to(hand, {
      offset: to,
      duration: Math.min(0.9, 0.42 + 0.16 * dist),
      ease: 'power3.out',
      onUpdate: schedule,
      onComplete: settled,
    });
  }
  // At rest: the hand's share kept within one turn of the loop (the same
  // place, the numbers small), and the scroll's share to a stop
  function settled() {
    const turns = n * Math.trunc(hand.offset / n);
    if (turns) {
      hand.offset -= turns;
      aim -= turns;
      shown -= turns;
    }
    schedule();
    snapLater();
  }
  // Picture i to the middle, the nearer way round
  function turnTo(i) {
    const d = Math.round(across(i, Math.round(scrolled() + aim)));
    if (d) glide(aim + d);
  }
  // The next or the one before, counted from where the row is heading, so
  // presses in quick succession add up (but a held key runs at most a few
  // ahead)
  function go(by) {
    const to = aim + by;
    if (Math.abs(to - hand.offset) > 3) return;
    glide(to);
  }

  // A drag or a swipe: once it has moved far enough to say which way it
  // goes, across is the row's (the pointer kept, the row following it),
  // up or down the page's
  let drag = null;
  let quietClick = 0; // until when a click ends a drag rather than presses
  function onDown(event) {
    if (event.pointerType === 'mouse') mouseDown = true;
    if (!rowLayout) return;
    if (drag) {
      // A second finger: the drag ends where it is
      endDrag(null);
      return;
    }
    if (!event.isPrimary || event.button !== 0 || !(event.target instanceof Element) || !root.contains(event.target) || busy()) return;
    if (event.target.closest('.home-reel__chrome a, .home-reel__chrome button')) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, from: hand.offset, axis: '', type: event.pointerType, trail: [] };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }
  function onMove(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.axis) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      const slop = drag.type === 'mouse' ? 4 : 9;
      if (Math.abs(dx) < slop && Math.abs(dy) < slop) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        // Up or down: the page's
        endDrag(null);
        return;
      }
      drag.axis = 'x';
      dragging = true;
      if (hasGsap) gsap.killTweensOf(hand);
      // From here, so the row doesn't jump by the slop
      drag.x = event.clientX;
      drag.from = hand.offset;
      clearTimeout(idle);
      root.classList.add('is--dragging');
      try { root.setPointerCapture(drag.id); } catch (_) {}
    }
    hand.offset = drag.from - (event.clientX - drag.x) / slot;
    aim = hand.offset;
    drag.trail.push([event.timeStamp, event.clientX]);
    while (drag.trail.length > 2 && event.timeStamp - drag.trail[0][0] > 100) drag.trail.shift();
    schedule();
  }
  function onUp(event) {
    if (event.pointerType === 'mouse') mouseDown = false;
    if (!drag || event.pointerId !== drag.id) return;
    endDrag(event.type === 'pointerup' ? event : null);
  }
  // Let go: on with the hand's speed over its last tenth of a second (a
  // flick turns at least one picture, however short), to a whole picture;
  // cancelled (the browser took it, a second finger, the window left), to
  // the nearer one
  function endDrag(event) {
    const d = drag;
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    if (!d || !d.axis) return;
    dragging = false;
    root.classList.remove('is--dragging');
    try { root.releasePointerCapture(d.id); } catch (_) {}
    quietClick = performance.now() + 400;
    let speed = 0; // pictures a second, forwards positive
    const trail = d.trail;
    if (event && trail.length > 1 && event.timeStamp - trail[trail.length - 1][0] < 80) {
      const [t0, x0] = trail[0];
      const [t1, x1] = trail[trail.length - 1];
      if (t1 > t0) speed = (-(x1 - x0) / (t1 - t0)) * 1000 / slot;
    }
    let to = Math.round(hand.offset + Math.max(-2, Math.min(2, speed * CARRY)));
    const from = Math.round(d.from);
    if (to === from && Math.abs(speed) > 0.8) to = from + Math.sign(speed);
    glide(to);
  }
  const onLost = (event) => {
    if (drag && event.pointerId === drag.id) endDrag(null);
  };

  // A sideways trackpad stroke, or shift and the wheel: the row follows it,
  // then settles on the next picture the way it went (or back, if it
  // barely moved). Kept from the page, so it neither scrolls nor turns
  // into the browser's back or forward.
  let strokeIdle = 0;
  let strokeWay = 0;
  function onWheel(event) {
    if (!rowLayout || event.ctrlKey || drag) return;
    let dx = event.deltaX;
    let dy = event.deltaY;
    if (event.shiftKey && !dx) {
      dx = dy;
      dy = 0;
    }
    if (!dx || Math.abs(dx) <= Math.abs(dy) || busy()) return;
    event.preventDefault();
    event.stopPropagation();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerWidth : 1;
    if (hasGsap) gsap.killTweensOf(hand);
    hand.offset += (dx * unit) / slot;
    aim = hand.offset;
    strokeWay = Math.sign(dx);
    schedule();
    clearTimeout(strokeIdle);
    strokeIdle = setTimeout(() => {
      const below = Math.floor(hand.offset);
      const f = hand.offset - below;
      glide(strokeWay > 0 ? (f > LEAN ? below + 1 : below) : (f < 1 - LEAN ? below : below + 1));
    }, SNAP);
  }

  // The arrow keys, while the hero holds the screen
  function onKey(event) {
    if (!rowLayout || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const t = event.target;
    if (t instanceof Element && t.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="dialog"], dialog')) return;
    if (busy() || drag) return;
    const box = root.getBoundingClientRect();
    if (box.top > window.innerHeight / 2 || box.bottom < window.innerHeight / 2) return;
    event.preventDefault();
    go(event.key === 'ArrowRight' ? 1 : -1);
  }

  // A press: after a drag, nothing; on a waiting picture or a ruler
  // number, that part to the middle; on the lit one (or the one on its
  // way there), its own
  function onClick(event) {
    if (performance.now() < quietClick) {
      event.preventDefault();
      event.stopImmediatePropagation();
      quietClick = 0;
      return;
    }
    if (!rowLayout || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const mark = event.target.closest('.home-reel__ruler-mark');
    if (mark) {
      turnTo(rulerMarks.indexOf(mark));
      return;
    }
    const shot = event.target.closest('[data-reel-shot]');
    if (!shot) return;
    const i = shots.indexOf(shot);
    if (i === heading()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!busy()) turnTo(i);
  }
  // Tabbed to: a waiting picture comes to the middle
  function onFocus(event) {
    if (!rowLayout) return;
    const shot = event.target instanceof Element ? event.target.closest('[data-reel-shot]') : null;
    if (!shot || !shot.matches(':focus-visible') || busy()) return;
    const i = shots.indexOf(shot);
    if (i !== heading()) turnTo(i);
  }
  // Never the browser's own drag of a picture or a link
  const onDragStart = (event) => {
    if (rowLayout) event.preventDefault();
  };
  const onTouch = (event) => {
    touches = event.touches.length;
    if (!touches) snapLater();
  };
  const onMouseUp = (event) => {
    if (event.pointerType !== 'mouse') return;
    mouseDown = false;
    snapLater();
  };
  const onBlur = () => {
    touches = 0;
    mouseDown = false;
    if (drag) endDrag(null);
  };

  const resize = new ResizeObserver(() => measure());
  resize.observe(root);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('pointerdown', onDown);
  document.addEventListener('pointerup', onMouseUp);
  document.addEventListener('pointercancel', onMouseUp);
  document.addEventListener('touchstart', onTouch, { passive: true });
  document.addEventListener('touchend', onTouch, { passive: true });
  document.addEventListener('touchcancel', onTouch, { passive: true });
  root.addEventListener('lostpointercapture', onLost);
  root.addEventListener('wheel', onWheel, { passive: false });
  root.addEventListener('click', onClick, true);
  root.addEventListener('focusin', onFocus);
  root.addEventListener('dragstart', onDragStart);
  document.addEventListener('keydown', onKey);
  window.addEventListener('blur', onBlur);
  measure();

  onPageLeave(() => {
    resize.disconnect();
    if (drag) endDrag(null);
    if (hasGsap) gsap.killTweensOf(hand);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('pointerdown', onDown);
    document.removeEventListener('pointerup', onMouseUp);
    document.removeEventListener('pointercancel', onMouseUp);
    document.removeEventListener('touchstart', onTouch);
    document.removeEventListener('touchend', onTouch);
    document.removeEventListener('touchcancel', onTouch);
    root.removeEventListener('lostpointercapture', onLost);
    root.removeEventListener('wheel', onWheel);
    root.removeEventListener('click', onClick, true);
    root.removeEventListener('focusin', onFocus);
    root.removeEventListener('dragstart', onDragStart);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('blur', onBlur);
    cancelAnimationFrame(frame);
    clearTimeout(idle);
    clearTimeout(strokeIdle);
  });
}

document.addEventListener('DOMContentLoaded', () => initHomeReel());
