// -----------------------------------------
// HOME HERO RUNNER
// -----------------------------------------
//
// A horizontal runner through the middle of the home hero, built from a dense
// row of very short vertical strokes rather than one drawn line. From a
// distance it reads as a fine rule; up close the individual strokes show.
//
// The pointer bends it. Every stroke sits at a fixed x; the only thing that
// ever changes is its height, and every height is a sample of one invisible
// bell-shaped field centred on the pointer — a raised cosine that is tallest
// at the centre and reaches the resting height again a fixed radius out. The
// strokes grow both ways from the runner's centre axis, so the fan is
// symmetrical above and below as well as left and right. Moving the pointer
// moves the centre of the field; the strokes stay where they are, and the
// "wave" following the cursor is nothing more than their heights being
// recalculated from the new centre every frame.
//
// Two layers of easing keep it fluid rather than mechanical:
//   - the field's centre glides toward the pointer, so a fast sweep drags a
//     coherent shape across the runner instead of jumping between frames
//   - each stroke's height glides toward its own sample, so a stroke leaving
//     the field settles back to rest over a few frames instead of snapping
// Both are frame-rate independent (exponential decay against real time), and
// nothing here is per-stroke state beyond a number: the whole thing is two
// Float32Arrays and one draw call per stroke on a transparent canvas.
//
// Infrastructure:
//   - one `pointermove` / `pointerleave` pair on the hero, not one per stroke
//   - drawn from the site's shared frame clock (`gsap.ticker`), which is the
//     same tick Lenis and every GSAP tween already run on, and only while
//     something is actually moving — a settled runner costs nothing per frame
//   - a ResizeObserver keeps the stroke count, spacing and backing-store size
//     tied to the runner's real width, so no width leaves a gap at either edge
//   - colours and geometry are read from CSS custom properties on the runner,
//     so the treatment is tuned in the stylesheet with everything else
//
// Lifecycle: `initHeroRunner()` is safe to call on any page and as often as
// the router likes. It tears down whatever instance exists, then builds one if
// the hero is present. transitions.js calls it on every navigation; the
// DOMContentLoaded listener at the bottom covers the first load.
//
// This iteration is the visual construction and the pointer-driven fan only.
// The instance returned by `createHeroRunner` is kept on `window.heroRunner`
// and exposes `strokes` (positions, current and target heights) and
// `pointer`, so a later iteration can layer more onto the same field —
// markers, labels, a click target — without rebuilding the renderer.

(function () {
  // Geometry defaults, in CSS pixels. Any of these can be overridden from the
  // stylesheet through the matching custom property on the runner element.
  const DEFAULTS = {
    spacing: 6,        // distance between stroke centres
    strokeWidth: 1,    // one hairline, like the grid
    restHeight: 9,     // total height of a stroke at rest
    maxHeight: 72,     // total height of the stroke under the pointer
    radius: 90,        // horizontal reach of the field, centre to edge
    reachAbove: 200,   // how far above / below the axis the pointer still counts
    reachFade: 120     // width of the band over which that influence fades out
  };

  // Easing rates, per second. Higher is snappier. Expressed as rates rather
  // than per-frame factors so 60Hz and 120Hz screens feel the same.
  //
  // Tuned for a little inertia: the field's centre trails the pointer by a
  // beat, so a sweep drags the fan rather than teleporting it, and a stroke
  // grows into its sample faster than it settles back out of it — the
  // growth reads as a response, the settling as the runner coming to rest.
  // Both are still well inside a quarter of a second, so it tracks the
  // pointer rather than floating after it.
  const CENTRE_RATE = 11;   // the field's centre chasing the pointer
  const GROW_RATE = 12;     // a stroke rising toward a taller sample
  const SETTLE_RATE = 7;    // a stroke falling back toward a shorter one
  const SETTLE_EPSILON = 0.05; // px — below this the runner counts as still

  // The profile's shape. A steepening power on the raised cosine, and the
  // number of height levels it is quantised into. With a 90px radius and
  // 6px pitch there are fifteen strokes a side, so seven levels puts a step
  // roughly every other stroke — a clearly terraced spike, still symmetrical.
  const PROFILE_POWER = 1.6;
  const PROFILE_STEPS = 7;

  function readNumber(styles, name, fallback) {
    const value = parseFloat(styles.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function createHeroRunner(hero, root) {
    const canvas = document.createElement("canvas");
    canvas.className = "hero-runner__canvas";
    canvas.setAttribute("aria-hidden", "true");
    root.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canHover = window.matchMedia("(hover: hover)");

    // Geometry and colour, from the stylesheet
    const config = Object.assign({}, DEFAULTS);
    let colour = "rgba(244, 244, 244, 0.6)";

    function readStyles() {
      const styles = getComputedStyle(root);
      config.spacing = Math.max(2, readNumber(styles, "--runner-spacing", DEFAULTS.spacing));
      config.strokeWidth = readNumber(styles, "--runner-stroke", DEFAULTS.strokeWidth);
      config.restHeight = readNumber(styles, "--runner-rest", DEFAULTS.restHeight);
      config.maxHeight = readNumber(styles, "--runner-max", DEFAULTS.maxHeight);
      config.radius = readNumber(styles, "--runner-radius", DEFAULTS.radius);
      config.reachAbove = readNumber(styles, "--runner-reach", DEFAULTS.reachAbove);
      config.reachFade = readNumber(styles, "--runner-reach-fade", DEFAULTS.reachFade);
      colour = styles.getPropertyValue("--runner-color").trim() || colour;
    }

    // The hero's column grid, as painted. The lines come from the repeating
    // background on the hero content (the runner's own containing block, so
    // its left edge is the canvas's left edge): a 1px line at the
    // background's x-position — the site gutter — repeated every
    // `--grid-column`, which the stylesheet defines as the span inside the
    // two gutters divided by `--grid-columns`. Computed style resolves the
    // gutter to pixels for the current width; the column is rebuilt from
    // that gutter, the element's width and the column count, the same three
    // terms the stylesheet builds it from. (Its background-size cannot be
    // read back resolved: a percentage-based size stays a percentage in
    // computed style.)
    //
    // Falls back to the authored stroke pitch from the left edge if the
    // background is ever not there to read — the runner still draws, just
    // not tied to a grid that is not being painted.
    const gridSource = root.closest(".willem-header__content") || root.parentElement;

    function readGrid(width) {
      const fallback = { origin: 0, column: config.spacing };
      if (!gridSource) return fallback;

      const styles = getComputedStyle(gridSource);
      const origin = parseFloat(styles.backgroundPositionX);
      const columns = parseInt(styles.getPropertyValue("--grid-columns"), 10);
      if (!Number.isFinite(origin) || !(columns > 0)) return fallback;

      const column = (width - origin * 2) / columns;
      if (!(column > 0)) return fallback;

      return { origin, column };
    }

    // Layout state
    let width = 0;
    let height = 0;
    let dpr = 1;
    let axisY = 0;

    // The strokes. `x` is fixed per layout; `current` and `target` are total
    // heights (the stroke is drawn half above and half below the axis).
    const strokes = {
      count: 0,
      x: new Float32Array(0),
      current: new Float32Array(0),
      target: new Float32Array(0)
    };

    // The interaction. `x`/`y` are the pointer relative to the canvas; `centre`
    // is the eased field centre the renderer actually uses; `strength` is how
    // much of the field applies, from the pointer's vertical distance.
    const pointer = {
      active: false,
      x: 0,
      y: 0,
      centre: 0,
      strength: 0
    };

    let ticking = false;
    let lastTime = 0;
    let destroyed = false;

    function layout() {
      const rect = root.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;

      readStyles();

      dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      axisY = height / 2;

      // Distribute the strokes on the hero's own column grid. The grid lines
      // are painted by the hero content's repeating background: one line at
      // its background-position, then one every background-size. Reading
      // those resolved values gives the exact origin and pitch of the lines
      // at this width — the same geometry the lines are drawn from, so the
      // two systems cannot drift. The authored spacing is then rounded to
      // the nearest whole division of a column, and the strokes are laid
      // out from the origin in both directions until the canvas is full.
      // One stroke therefore lands on every grid line, and the pitch is
      // still as close to the authored 6px as the column allows.
      const grid = readGrid(width);
      const step = grid.column / Math.max(1, Math.round(grid.column / config.spacing));
      // Half a stroke in from each edge, so the outermost hairlines are not
      // clipped by the canvas bounds
      const inset = config.strokeWidth / 2;
      const first = Math.ceil((inset - grid.origin) / step);
      const last = Math.floor((width - inset - grid.origin) / step);
      const count = Math.max(2, last - first + 1);

      if (count !== strokes.count) {
        const current = new Float32Array(count);
        // Carry over what was there, so a resize mid-hover does not blink
        const carry = Math.min(count, strokes.count);
        for (let i = 0; i < carry; i++) current[i] = strokes.current[i];
        for (let i = carry; i < count; i++) current[i] = config.restHeight;

        strokes.count = count;
        strokes.x = new Float32Array(count);
        strokes.current = current;
        strokes.target = new Float32Array(count);
      }

      for (let i = 0; i < count; i++) {
        // Snapped to the device grid for a crisp 1px line — the same way
        // the browser snaps the 1px grid line, so the two coincide
        const x = grid.origin + (first + i) * step;
        strokes.x[i] = Math.floor(x * dpr) / dpr;
      }

      computeTargets();
      draw();
    }

    // The field: every stroke's target height from the current centre
    function computeTargets() {
      const { count, x, target } = strokes;
      const rest = config.restHeight;
      const lift = (config.maxHeight - rest) * pointer.strength;
      const radius = config.radius;
      const centre = pointer.centre;

      if (!pointer.active || lift <= 0) {
        target.fill(rest);
        return;
      }

      for (let i = 0; i < count; i++) {
        const d = Math.abs(x[i] - centre);
        if (d >= radius) {
          target[i] = rest;
        } else {
          // Raised cosine, steepened, then quantised into a fixed number of
          // levels. The cosine keeps the profile symmetrical and rest at the
          // edge; the power pulls the shoulders in so the centre stands
          // clear of its neighbours; the quantising turns the curve into
          // terraces, so adjacent strokes step rather than blend. All of it
          // is a function of distance alone — nothing random, nothing that
          // moves while the pointer is still.
          const smooth = 0.5 * (1 + Math.cos(Math.PI * d / radius));
          const steep = Math.pow(smooth, PROFILE_POWER);
          const envelope = Math.round(steep * PROFILE_STEPS) / PROFILE_STEPS;
          target[i] = rest + lift * envelope;
        }
      }
    }

    // How much the field applies, from how far the pointer is from the axis:
    // full within `reachAbove`, fading smoothly to nothing over `reachFade`.
    function verticalStrength(y) {
      const d = Math.abs(y - axisY);
      if (d <= config.reachAbove) return 1;
      const t = (d - config.reachAbove) / config.reachFade;
      if (t >= 1) return 0;
      // smoothstep
      return 1 - t * t * (3 - 2 * t);
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = config.strokeWidth;
      ctx.strokeStyle = colour;
      ctx.beginPath();

      const { count, x, current } = strokes;
      // A hairline on the device grid: offset by half a device pixel so a
      // 1px stroke fills exactly one column rather than two half-alpha ones
      const snap = 0.5 / dpr;

      for (let i = 0; i < count; i++) {
        const half = current[i] / 2;
        const px = x[i] + snap;
        ctx.moveTo(px, axisY - half);
        ctx.lineTo(px, axisY + half);
      }

      ctx.stroke();
    }

    // One frame: ease the centre and every height toward their targets, draw,
    // and drop off the ticker once nothing is moving.
    function tick(time) {
      if (destroyed) return;

      const now = time * 1000;
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 1 / 60;
      lastTime = now;

      const centreEase = 1 - Math.exp(-CENTRE_RATE * dt);
      const growEase = 1 - Math.exp(-GROW_RATE * dt);
      const settleEase = 1 - Math.exp(-SETTLE_RATE * dt);

      let moving = false;

      if (pointer.active) {
        pointer.centre += (pointer.x - pointer.centre) * centreEase;
        const strength = verticalStrength(pointer.y);
        pointer.strength += (strength - pointer.strength) * centreEase;
        if (Math.abs(pointer.x - pointer.centre) > SETTLE_EPSILON) moving = true;
        if (Math.abs(strength - pointer.strength) > 0.001) moving = true;
      }

      computeTargets();

      const { count, current, target } = strokes;
      for (let i = 0; i < count; i++) {
        const diff = target[i] - current[i];
        if (Math.abs(diff) > SETTLE_EPSILON) {
          current[i] += diff * (diff > 0 ? growEase : settleEase);
          moving = true;
        } else {
          current[i] = target[i];
        }
      }

      draw();

      if (!moving) stopTicking();
    }

    function startTicking() {
      if (ticking || destroyed) return;
      ticking = true;
      lastTime = 0;
      gsap.ticker.add(tick);
    }

    function stopTicking() {
      if (!ticking) return;
      ticking = false;
      gsap.ticker.remove(tick);
    }

    // Pointer: the hero is the listening surface, so the runner starts to
    // respond as the pointer approaches, not only once it is over the strokes
    function onPointerMove(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;

      if (!pointer.active) {
        // Arriving: the field appears where the pointer is, not sliding in
        // from wherever it was last left
        pointer.active = true;
        pointer.centre = pointer.x;
        pointer.strength = 0;
      }

      startTicking();
    }

    function onPointerLeave() {
      pointer.active = false;
      pointer.strength = 0;
      startTicking(); // to ease every stroke back to rest
    }

    const interactive = () => canHover.matches && !reducedMotion.matches;

    let listening = false;

    function bindPointer() {
      if (listening || !interactive()) return;
      listening = true;
      hero.addEventListener("pointermove", onPointerMove, { passive: true });
      hero.addEventListener("pointerleave", onPointerLeave, { passive: true });
      hero.addEventListener("pointercancel", onPointerLeave, { passive: true });
    }

    function unbindPointer() {
      if (!listening) return;
      listening = false;
      hero.removeEventListener("pointermove", onPointerMove);
      hero.removeEventListener("pointerleave", onPointerLeave);
      hero.removeEventListener("pointercancel", onPointerLeave);
      onPointerLeave();
    }

    // Reduced motion, or a preference change mid-session: the runner stays as
    // the resting rule — the same construction, just never bent
    function onPreferenceChange() {
      if (interactive()) bindPointer(); else unbindPointer();
    }

    reducedMotion.addEventListener?.("change", onPreferenceChange);
    canHover.addEventListener?.("change", onPreferenceChange);

    // Sizing: follows the runner element itself, which follows the hero. The
    // hero is display:none until the intro shows it, so the first real layout
    // arrives through the observer rather than at construction.
    const observer = new ResizeObserver(() => layout());
    observer.observe(root);
    // A zoom change alters devicePixelRatio without resizing the element
    window.addEventListener("resize", layout);

    layout();
    bindPointer();
    hero.classList.add("runner-active");

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      stopTicking();
      unbindPointer();
      observer.disconnect();
      window.removeEventListener("resize", layout);
      reducedMotion.removeEventListener?.("change", onPreferenceChange);
      canHover.removeEventListener?.("change", onPreferenceChange);
      hero.classList.remove("runner-active");
      canvas.remove();
    }

    return { hero, root, canvas, strokes, pointer, config, layout, destroy };
  }

  function initHeroRunner() {
    if (window.heroRunner) {
      window.heroRunner.destroy();
      window.heroRunner = null;
    }

    if (typeof gsap === "undefined") return;

    const hero = document.querySelector(".willem-header");
    const root = hero && hero.querySelector("[data-hero-runner]");
    if (!hero || !root) return;

    window.heroRunner = createHeroRunner(hero, root);
  }

  window.initHeroRunner = initHeroRunner;

  document.addEventListener("DOMContentLoaded", initHeroRunner);
})();
