// -----------------------------------------
// HOME HERO DIAL
// -----------------------------------------
//
// Walks the hero dial along the runner's five strong lines — the four
// column starts and the far gutter — left to
// right, and changes the hero's photographs with it. One number does all of
// it: a progress value in slides, tweened from one whole number to the next
// and rendered every frame into
//   - the dial's column, through the `--dial-column` custom property the
//     stylesheet places it by
//   - the hero's photographs, the one nearest the progress at full opacity
//     and its neighbour crossfading in
//   - the strip of photographs in the dial's centre, slid across the round
//     frame by their distance from the progress
// The rendering is the layered image slider's (Osmo Supply): a wrapped
// signed offset per slide, opacity from its distance, x from the offset and
// the frame's width. The dial's column comes from the same offset. Past the
// last line it carries on to the right, out of the hero, and comes in
// again from the left to the first: the column goes a fraction past 4 for
// the first half of that step and a fraction below 0 for the second, with
// the dial wholly outside the hero at the switch.
//
// Autoplay as the slider's, with the ring as its bar: one GSAP tween of
// thirteen seconds that lights the ticks in turn, clockwise from the top,
// steps forward on completion and restarts from nothing on every move —
// paused, where it is, while the pointer is over the dial and resumed from
// there when it leaves. A click on any of the five targets goes straight to
// that line, the short way round, and starts the ring again.
//
// The targets mark the current line with aria-current so the one under the
// dial gives the pointer up to the dial's own hover circles; the active
// photographs carry [data-active], as the slider's do.
//
// Lifecycle as the runner's: `initHeroDial()` tears down any instance and
// builds one if the dial is on the page. transitions.js calls it on every
// navigation; DOMContentLoaded covers the first load.

(function () {
  const AUTOPLAY = 13;           // seconds between moves: one turn of the ring
  const TRANSITION_DURATION = 1.1;
  const COLUMNS = 5;
  // How far past the edge lines the wrap legs go, in columns: enough that
  // the ring and its note are wholly outside the hero before the switch, at
  // any desktop width — the last line is the far gutter, so the ring has to
  // travel most of its own radius before it is clear
  const OVERSHOOT = 0.8;

  function createHeroDial(dial, targets, face, backgrounds, maskFrame, maskItems, ticks) {
    const count = COLUMNS;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = gsap.utils.clamp;
    const wrap = (distance) => distance - count * Math.round(distance / count);

    let maskStep = 0;
    const measure = () => {
      maskStep = maskFrame ? maskFrame.clientWidth : 0;
    };
    measure();

    const state = { progress: 0 };
    let activeIndex = -1;

    // The active slide has [data-active] on its background and mask item,
    // and aria-current on its target
    const setActive = (previousIndex, index) => {
      [backgrounds, maskItems].forEach((list) => {
        if (previousIndex >= 0 && list[previousIndex]) list[previousIndex].removeAttribute("data-active");
        if (list[index]) list[index].setAttribute("data-active", "");
      });
      targets.forEach((target, i) => {
        if (i === index) target.setAttribute("aria-current", "true");
        else target.removeAttribute("aria-current");
      });
    };

    // The dial's column for a progress: the line it is nearest plus the
    // signed fraction to the next, except across the seam between the last
    // line and the first, where it leaves to the right and returns from the
    // left instead of crossing the hero
    const columnFor = (progress) => {
      const base = Math.floor(progress);
      const fraction = progress - base;
      const line = ((base % count) + count) % count;
      if (line !== count - 1) return line + fraction;
      return fraction < 0.5
        ? line + fraction * 2 * OVERSHOOT
        : -OVERSHOOT + (fraction - 0.5) * 2 * OVERSHOOT;
    };

    const render = (progress) => {
      const centeredIndex = ((Math.round(progress) % count) + count) % count;

      for (let i = 0; i < count; i++) {
        // How far this slide sits from the centre: signed (left / right) and absolute.
        const offset = wrap(i - progress);
        const distance = Math.abs(offset);

        const background = backgrounds[i];
        if (background) {
          const backgroundOpacity = clamp(0, 1, 1 - distance);
          gsap.set(background, {
            opacity: backgroundOpacity,
            zIndex: Math.round(backgroundOpacity * 100)
          });
        }

        const maskItem = maskItems[i];
        if (maskItem) {
          gsap.set(maskItem, { x: offset * maskStep });
        }
      }

      dial.style.setProperty("--dial-column", columnFor(progress).toFixed(4));

      if (centeredIndex !== activeIndex) {
        const previousIndex = activeIndex;
        activeIndex = centeredIndex;
        setActive(previousIndex, centeredIndex);
      }
    };

    // The ring: the ticks lit up to the clock's progress, clockwise from the
    // top (the order they are drawn in). Each tick is either lit or at rest
    // — nothing between — so the clock steps, one tick at a time, like a
    // mechanical dial rather than a fade travelling round
    const ring = { progress: 0 };
    const tickStyles = getComputedStyle(ticks);
    const tickRest = parseFloat(tickStyles.getPropertyValue("--tick-opacity-rest")) || 0.3;
    const tickLit = parseFloat(tickStyles.getPropertyValue("--tick-opacity-lit")) || 1;
    const tickLines = Array.from(ticks.children);
    const renderRing = (progress) => {
      const lit = Math.floor(progress * tickLines.length);
      for (let i = 0; i < tickLines.length; i++) {
        tickLines[i].style.opacity = i < lit ? tickLit : tickRest;
      }
    };

    let hovering = 0;
    let autoTween = null;
    const startAutoplay = () => {
      if (!autoTween) return;
      autoTween.restart(true);
      if (hovering > 0) autoTween.pause();
    };

    let slideTween = null;
    let current = parseInt(getComputedStyle(dial).getPropertyValue("--dial-column"), 10);
    if (!(current >= 0 && current < count)) current = count - 1;

    function goTo(delta) {
      current += delta;
      if (slideTween) slideTween.kill();
      slideTween = gsap.to(state, {
        progress: current,
        duration: reduced ? 0 : TRANSITION_DURATION,
        ease: "osmo",
        onUpdate: () => render(state.progress)
      });
      startAutoplay();
    }

    // Step to a specific slide by index, the short way round
    function goToIndex(i) {
      const delta = wrap(i - current);
      if (delta !== 0) goTo(delta);
    }

    // Autoplay fills the ring
    if (AUTOPLAY > 0 && !reduced) {
      autoTween = gsap.to(ring, {
        progress: 1,
        duration: AUTOPLAY,
        ease: "none",
        paused: true,
        onUpdate: () => renderRing(ring.progress),
        onComplete: () => goTo(1)
      });
    }
    renderRing(reduced ? 1 : 0);

    const onClick = (event) => {
      goToIndex(parseInt(event.currentTarget.dataset.heroDialTarget, 10));
    };
    targets.forEach((target) => target.addEventListener("click", onClick));

    // Autoplay pauses only while the dial is hovered
    const onEnter = () => {
      hovering++;
      if (autoTween) autoTween.pause();
    };
    const onLeave = () => {
      hovering = Math.max(0, hovering - 1);
      if (autoTween && hovering === 0) autoTween.resume();
    };
    face.addEventListener("pointerenter", onEnter);
    face.addEventListener("pointerleave", onLeave);

    const onResize = () => {
      measure();
      render(state.progress);
    };
    window.addEventListener("resize", onResize);

    state.progress = current;
    render(current);
    startAutoplay();

    function destroy() {
      if (slideTween) slideTween.kill();
      if (autoTween) autoTween.kill();
      window.removeEventListener("resize", onResize);
      targets.forEach((target) => target.removeEventListener("click", onClick));
      face.removeEventListener("pointerenter", onEnter);
      face.removeEventListener("pointerleave", onLeave);
    }

    return { dial, targets, state, ring, goTo, goToIndex, destroy };
  }

  function initHeroDial() {
    if (window.heroDial) {
      window.heroDial.destroy();
      window.heroDial = null;
    }

    if (typeof gsap === "undefined") return;

    const dial = document.querySelector("[data-hero-dial]");
    const face = dial && dial.querySelector(".hero-dial__face");
    if (!dial || !face) return;
    const targets = Array.from(document.querySelectorAll("[data-hero-dial-target]"))
      .sort((a, b) => a.dataset.heroDialTarget - b.dataset.heroDialTarget);
    if (targets.length !== COLUMNS) return;

    const backgrounds = Array.from(document.querySelectorAll("[data-hero-slide-bg]"));
    const maskFrame = dial.querySelector("[data-hero-dial-mask]");
    const maskItems = Array.from(dial.querySelectorAll("[data-hero-dial-mask-item]"));
    const ticks = dial.querySelector(".hero-dial__ticks");
    if (!ticks) return;

    window.heroDial = createHeroDial(dial, targets, face, backgrounds, maskFrame, maskItems, ticks);
  }

  window.initHeroDial = initHeroDial;

  document.addEventListener("DOMContentLoaded", initHeroDial);
})();
