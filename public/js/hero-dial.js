// -----------------------------------------
// HOME HERO DIAL
// -----------------------------------------
//
// Walks the hero dial along the runner's four strong column lines, left to
// right. The dial is placed by the stylesheet from one custom property,
// `--dial-column`, and slides between lines on a CSS transition — so all
// this does is set that number: to the next line every eight seconds, or to
// whichever of the four click targets is pressed, after which the clock
// restarts from there.
//
// The walk never turns back. After the fourth line the dial carries on to
// the right, out of the hero (the hero clips its overflow), and comes in
// again from the left to the first line: two legs, a column past the last
// line and a column before the first, with the transition switched off for
// the jump between them. The pointer over the dial holds it where it is; the
// clock restarts when the pointer leaves.
//
// The targets mark the current line with aria-current so the one under the
// dial gives the pointer up to the dial's own hover circles.
//
// Lifecycle as the runner's: `initHeroDial()` tears down any instance and
// builds one if the dial is on the page. transitions.js calls it on every
// navigation; DOMContentLoaded covers the first load.

(function () {
  const INTERVAL = 8000;   // ms between moves
  const COLUMNS = 4;
  // How far past the edge lines the wrap legs go, in columns: enough that
  // the ring and its note are wholly outside the hero before the jump, at
  // any desktop width
  const OVERSHOOT = 0.6;

  function createHeroDial(dial, targets, face) {
    let column = parseInt(getComputedStyle(dial).getPropertyValue("--dial-column"), 10);
    if (!(column >= 0 && column < COLUMNS)) column = COLUMNS - 1;
    let timer = 0;
    let hovered = false;
    let wrapping = false;

    function place(value) {
      dial.style.setProperty("--dial-column", String(value));
    }

    function mark() {
      targets.forEach((target, i) => {
        if (i === column) target.setAttribute("aria-current", "true");
        else target.removeAttribute("aria-current");
      });
    }

    // Straight to a line: one slide, whichever way it lies
    function setColumn(next) {
      wrapping = false;
      column = ((next % COLUMNS) + COLUMNS) % COLUMNS;
      place(column);
      mark();
    }

    // Off the right edge, then in from the left to the first line
    function wrap() {
      wrapping = true;
      column = 0;
      mark();
      place(COLUMNS - 1 + OVERSHOOT);
    }

    function onTransitionEnd(event) {
      if (event.target !== dial || event.propertyName !== "left" || !wrapping) return;
      wrapping = false;
      // The jump: no transition, a column before the first line, then the
      // slide in. The reflow between them commits the jump so the slide
      // starts from there rather than from where the dial was.
      dial.style.transition = "none";
      place(-OVERSHOOT);
      void dial.offsetWidth;
      dial.style.transition = "";
      place(column);
    }

    function step() {
      if (column === COLUMNS - 1) wrap();
      else setColumn(column + 1);
    }

    function schedule() {
      window.clearInterval(timer);
      timer = window.setInterval(step, INTERVAL);
    }

    function hold() {
      window.clearInterval(timer);
      timer = 0;
    }

    function onClick(event) {
      const index = parseInt(event.currentTarget.dataset.heroDialTarget, 10);
      if (index === column && !wrapping) return;
      setColumn(index);
      if (!hovered) schedule(); // the cycle continues from the chosen line
    }

    function onEnter() {
      hovered = true;
      hold();
    }

    function onLeave() {
      hovered = false;
      schedule();
    }

    targets.forEach((target) => target.addEventListener("click", onClick));
    face.addEventListener("pointerenter", onEnter);
    face.addEventListener("pointerleave", onLeave);
    dial.addEventListener("transitionend", onTransitionEnd);

    setColumn(column);
    schedule();

    function destroy() {
      hold();
      targets.forEach((target) => target.removeEventListener("click", onClick));
      face.removeEventListener("pointerenter", onEnter);
      face.removeEventListener("pointerleave", onLeave);
      dial.removeEventListener("transitionend", onTransitionEnd);
      dial.style.transition = "";
    }

    return { dial, targets, setColumn, step, destroy };
  }

  function initHeroDial() {
    if (window.heroDial) {
      window.heroDial.destroy();
      window.heroDial = null;
    }

    const dial = document.querySelector("[data-hero-dial]");
    const face = dial && dial.querySelector(".hero-dial__face");
    if (!dial || !face) return;
    const targets = Array.from(document.querySelectorAll("[data-hero-dial-target]"))
      .sort((a, b) => a.dataset.heroDialTarget - b.dataset.heroDialTarget);
    if (targets.length !== COLUMNS) return;

    window.heroDial = createHeroDial(dial, targets, face);
  }

  window.initHeroDial = initHeroDial;

  document.addEventListener("DOMContentLoaded", initHeroDial);
})();
