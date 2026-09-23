// -----------------------------------------
// HOME HERO DIAL
// -----------------------------------------
//
// Runs the hero dial's five states and changes the hero's photographs with
// them. The dial itself stays put, on the fourth of the runner's five strong
// lines (the stylesheet fixes its column); what moves is the content. One
// number does all of it: a progress value in slides, tweened from one whole
// number to the next and rendered every frame into
//   - the hero's photographs, the one nearest the progress at full opacity
//     and its neighbour crossfading in
//   - the strip of photographs in the dial's centre, slid across the round
//     frame by their distance from the progress
// The rendering is the layered image slider's (Osmo Supply): a wrapped
// signed offset per slide, opacity from its distance, x from the offset and
// the frame's width. The states run left to right and round again.
//
// Autoplay as the slider's, with the ring as its bar: one GSAP tween of
// thirteen seconds that lights the ticks in turn, clockwise from the top,
// steps forward on completion and restarts from nothing on every move —
// paused, where it is, while the pointer is over the dial and resumed from
// there when it leaves. A click on any of the five line targets goes
// straight to that state, the short way round, and starts the ring again;
// the target on the dial's own line never takes the pointer, so the dial's
// hover circles keep it, and a click on the dial itself selects that state.
//
// The targets mark the current state with aria-current; the active
// photographs carry [data-active], as the slider's do.
//
// Each state has its own caption under the note's dot. They change the
// moment a move starts, with the photographs, using a masked SplitText
// reveal: the words of the outgoing caption rise out
// through their masks while the incoming caption's rise in from below, a
// word at a time. Each caption is split once, when the dial is built, and
// reverted when it is torn down, so however many moves run, the markup never
// grows and a move made mid-swap simply takes over from where it is.
//
// Lifecycle as the runner's: `initHeroDial()` tears down any instance and
// builds one if the dial is on the page. transitions.js calls it on every
// navigation; DOMContentLoaded covers the first load.

(function () {
  const AUTOPLAY = 13;           // seconds between moves: one turn of the ring
  const TRANSITION_DURATION = 1.1;
  const COLUMNS = 5;
  // The caption swap, short enough that the caption lands inside the
  // photographs' own move rather than after it
  const CAPTION_IN = 0.9;
  const CAPTION_OUT = 0.45;
  const CAPTION_STAGGER = 0.012;
  const CAPTION_EASE_IN = "expo.out";
  const CAPTION_EASE_OUT = "power3.inOut";

  function createHeroDial(dial, targets, face, backgrounds, maskFrame, maskItems, ticks, captions) {
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

    // The captions, split into masked words once. Without SplitText they
    // still swap, just without the rise.
    const captionSplits = captions.map((caption) =>
      typeof SplitText !== "undefined"
        ? new SplitText(caption, { type: "words", mask: "words", wordsClass: "willem__split-word" })
        : null
    );
    const captionWords = (i) => (captionSplits[i] ? captionSplits[i].words : []);
    let captionIndex = -1;

    const showCaption = (index, animate) => {
      if (!captions[index] || index === captionIndex) return;
      const previous = captionIndex;
      captionIndex = index;

      // Whatever was mid-swap stops where it is and is taken over from there
      captions.forEach((caption, i) => {
        gsap.killTweensOf(captionWords(i));
        caption.removeAttribute("data-active");
        caption.removeAttribute("data-leaving");
        caption.setAttribute("aria-hidden", "true");
        if (i !== index && i !== previous) gsap.set(captionWords(i), { yPercent: 110 });
      });
      captions[index].setAttribute("data-active", "");
      captions[index].removeAttribute("aria-hidden");

      if (!animate || reduced) {
        gsap.set(captionWords(index), { yPercent: 0 });
        if (previous >= 0) gsap.set(captionWords(previous), { yPercent: 110 });
        return;
      }

      if (previous >= 0) {
        const leaving = captions[previous];
        leaving.setAttribute("data-leaving", "");
        gsap.to(captionWords(previous), {
          yPercent: -110,
          duration: CAPTION_OUT,
          stagger: CAPTION_STAGGER,
          ease: CAPTION_EASE_OUT,
          onComplete: () => {
            leaving.removeAttribute("data-leaving");
            gsap.set(captionWords(previous), { yPercent: 110 });
          }
        });
      }
      gsap.fromTo(captionWords(index), { yPercent: 110 }, {
        yPercent: 0,
        duration: CAPTION_IN,
        stagger: CAPTION_STAGGER,
        ease: CAPTION_EASE_IN,
        delay: previous >= 0 ? CAPTION_OUT * 0.5 : 0
      });
    };

    // The first state is the dial's own line
    let slideTween = null;
    let current = parseInt(getComputedStyle(dial).getPropertyValue("--dial-column"), 10);
    if (!(current >= 0 && current < count)) current = count - 1;
    const home = current;

    function goTo(delta) {
      current += delta;
      showCaption(((current % count) + count) % count, true);
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
    // The dial stands on its own line's target, so it takes that click
    const onFaceClick = () => goToIndex(home);
    face.addEventListener("click", onFaceClick);

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
    showCaption(current, false);
    startAutoplay();

    function destroy() {
      if (slideTween) slideTween.kill();
      if (autoTween) autoTween.kill();
      window.removeEventListener("resize", onResize);
      targets.forEach((target) => target.removeEventListener("click", onClick));
      face.removeEventListener("click", onFaceClick);
      face.removeEventListener("pointerenter", onEnter);
      face.removeEventListener("pointerleave", onLeave);
      captions.forEach((caption, i) => gsap.killTweensOf(captionWords(i)));
      captionSplits.forEach((split) => split && split.revert());
      captions.forEach((caption) => {
        caption.removeAttribute("data-active");
        caption.removeAttribute("data-leaving");
        caption.removeAttribute("aria-hidden");
      });
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
    const captions = Array.from(dial.querySelectorAll("[data-hero-dial-caption]"));

    window.heroDial = createHeroDial(dial, targets, face, backgrounds, maskFrame, maskItems, ticks, captions);
  }

  window.initHeroDial = initHeroDial;

  document.addEventListener("DOMContentLoaded", initHeroDial);
})();
