// -----------------------------------------
// PARALLAX IMAGE SLIDER (Smooothy) + HORIZONTAL SCROLL PROGRESS
// -----------------------------------------
// The Architecture index does not scroll down — it is one screen that moves
// sideways. Smooothy carries the drag, the inertia and the wheel input — with
// `scrollInput` on it reads a vertical wheel as sideways movement, which is
// the whole point of the page. `infinite` is off, so the run stops at the
// first and last project instead of wrapping, and the parallax is worked out
// here rather than taken from Smooothy (see below).

function initParallaxImageSlider() {
  document.querySelectorAll("[data-parallax-init]").forEach((root) => {
    // Barba re-runs this on every navigation; never bind the same slider twice
    if (root.__parallaxSlider) return;

    const wrapper = root.querySelector("[data-parallax-slider]");
    if (!wrapper) return;

    // One parallax layer per slide
    const parallaxItems = [...wrapper.children].map((slide) => slide.querySelector("[data-parallax-inner]"));

    const amountAttr = wrapper.getAttribute("data-parallax-amount");
    const amount = amountAttr !== null ? parseFloat(amountAttr) : 12;

    const snap = wrapper.getAttribute("data-parallax-snap") !== "false";
    const infinite = wrapper.getAttribute("data-parallax-infinite") === "true";

    const lerpAttr = wrapper.getAttribute("data-parallax-lerp");
    const lerp = lerpAttr !== null ? parseFloat(lerpAttr) : 0.3;

    const maxOffset = 25;
    const count = wrapper.children.length;

    const prevButton = root.querySelector("[data-parallax-prev]");
    const nextButton = root.querySelector("[data-parallax-next]");
    const progressBar = root.querySelector("[data-parallax-progress]");
    const progressWrap = root.querySelector("[data-parallax-progress-wrap]");
    const counter = root.querySelector("[data-parallax-counter]");

    // Opening a project should still be a click, not the tail of a drag
    guardSlideClicks(wrapper);

    if (typeof window.Smooothy !== "function") {
      // The CDN did not answer. Fall back to a plain scroll-snap track so the
      // projects are still reachable rather than stranded off screen.
      root.__parallaxSlider = initFallbackTrack(wrapper, { prevButton, nextButton, progressBar, progressWrap, counter, count });
      return;
    }

    const slider = new Smooothy(wrapper, {
      infinite,
      snap,
      lerpFactor: lerp,
      // Read wheel and trackpad input, and treat a vertical gesture as a
      // sideways one — scrolling down walks forward through the projects
      scrollInput: true,
      // At the default sensitivity a wheel notch moved about a seventh of a
      // card, so crossing five projects took forty notches. This puts a notch
      // at roughly a third of a card, and the lower lerp lets the track catch
      // up to the input instead of drifting after it.
      scrollSensitivity: 2.5,
      // Stop with the last card flush against the right edge. Smooothy's
      // default stops one card-width from the end of the track, which on a
      // run this short leaves half a screen of black after the last project.
      // wrapperWidth is clientWidth, so it counts the track's left inset —
      // taking it off twice leaves the run inset by the same amount at both
      // ends, which is what puts the first card on the page's own grid line.
      setOffset: (viewport) => {
        const inset = parseFloat(getComputedStyle(wrapper).paddingLeft) || 0;
        return (viewport.wrapperWidth - inset * 2) || viewport.itemWidth;
      },
      onUpdate: (core) => {
        // Smooothy only hands back per-slide parallax values when it is
        // looping; on a bounded run every slide gets the same number, which
        // would shove every image the same way. Work the offset out from
        // where each card actually sits instead.
        const track = core.current * (core.viewport.itemWidth || 0);
        const half = (core.viewport.wrapperWidth || 1) / 2;
        parallaxItems.forEach((item, i) => {
          if (!item) return;
          const centre = (core.itemOffsets[i] || 0) + track + (core.itemWidths[i] || 0) / 2;
          const fromMiddle = (centre - half) / (half * 2);
          const offset = gsap.utils.clamp(-maxOffset, maxOffset, -fromMiddle * amount);
          item.style.transform = `translateX(${offset}%)`;
        });

        const progress = core.progress;
        if (progressBar) progressBar.style.transform = `scale3d(${progress}, 1, 1)`;

        // Position is read off the progress, not off the slide index: the run
        // stops with the last card against the right edge rather than centred,
        // so the index alone never reaches the final slide.
        if (counter) {
          const at = Math.round(progress * (count - 1)) + 1;
          const label = String(at).padStart(2, "0");
          if (counter.textContent !== label) counter.textContent = label;
        }

        // The run has ends, so say so rather than letting a dead arrow sit lit
        if (!infinite) {
          if (prevButton) prevButton.classList.toggle("is--disabled", progress <= 0.001);
          if (nextButton) nextButton.classList.toggle("is--disabled", progress >= 0.999);
        }
      }
    });

    // Free scrolling can leave the track between two cards, so an arrow steps
    // from the nearest whole card rather than from wherever it came to rest
    const stepBy = (direction) => {
      const from = Math.round(-slider.current);
      slider.goToIndex(gsap.utils.clamp(0, count - 1, from + direction));
    };

    if (prevButton) {
      prevButton.classList.toggle("is--disabled", !infinite);
      prevButton.addEventListener("click", () => stepBy(-1));
    }
    if (nextButton) nextButton.addEventListener("click", () => stepBy(1));

    // The bar doubles as a scrubber: click along it to jump to that project
    if (progressWrap) {
      progressWrap.addEventListener("click", (event) => {
        const rect = progressWrap.getBoundingClientRect();
        const ratio = gsap.utils.clamp(0, 1, (event.clientX - rect.left) / rect.width);
        slider.goToIndex(Math.round(ratio * (count - 1)));
      });
    }

    // Smooothy measures the track the moment it is built, which on this page
    // is before the fluid rem scale and the page transition have settled — it
    // came out with a 17px wrapper and cards a third of their real width, so
    // one arrow press moved a third of a card. Re-measure once the layout is
    // real, and again whenever the window changes, which Smooothy never
    // watches on its own.
    const remeasure = () => slider.resize();
    requestAnimationFrame(() => requestAnimationFrame(remeasure));
    window.addEventListener("load", remeasure);
    window.addEventListener("resize", remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    // Barba hands the container over while it is still positioned for the
    // transition, so take one more reading after it has landed
    setTimeout(remeasure, 400);

    const tick = () => {
      if (!wrapper.isConnected) {
        gsap.ticker.remove(tick);
        window.removeEventListener("resize", remeasure);
        window.removeEventListener("load", remeasure);
        slider.destroy();
        return;
      }
      slider.update();
    };
    gsap.ticker.add(tick);

    root.__parallaxSlider = { slider, tick, remeasure };
  });
}

// A pointer that travelled more than a few pixels was a drag, and a drag that
// happens to finish over a card must not open it
function guardSlideClicks(wrapper) {
  let start = null;

  wrapper.addEventListener("pointerdown", (event) => {
    start = { x: event.clientX, y: event.clientY };
  });

  wrapper.addEventListener("click", (event) => {
    // A keyboard activation never sets a start point, and must open the link
    if (!start) return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    start = null;
    if (moved > 8) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  wrapper.addEventListener("dragstart", (event) => event.preventDefault());
}

// Smooothy unavailable: native horizontal scrolling, same controls
function initFallbackTrack(wrapper, ui) {
  wrapper.classList.add("is--fallback");

  const step = () => {
    const first = wrapper.children[0];
    return first ? first.getBoundingClientRect().width : wrapper.clientWidth * 0.5;
  };

  const sync = () => {
    const max = wrapper.scrollWidth - wrapper.clientWidth;
    const ratio = max > 0 ? wrapper.scrollLeft / max : 0;
    if (ui.progressBar) ui.progressBar.style.transform = `scale3d(${ratio}, 1, 1)`;
    const index = Math.round(ratio * (ui.count - 1));
    if (ui.counter) ui.counter.textContent = String(index + 1).padStart(2, "0");
    if (ui.prevButton) ui.prevButton.classList.toggle("is--disabled", wrapper.scrollLeft <= 1);
    if (ui.nextButton) ui.nextButton.classList.toggle("is--disabled", wrapper.scrollLeft >= max - 1);
  };

  wrapper.addEventListener("scroll", sync, { passive: true });
  if (ui.prevButton) ui.prevButton.addEventListener("click", () => wrapper.scrollBy({ left: -step(), behavior: "smooth" }));
  if (ui.nextButton) ui.nextButton.addEventListener("click", () => wrapper.scrollBy({ left: step(), behavior: "smooth" }));

  // A vertical wheel still has to read as sideways movement
  wrapper.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    wrapper.scrollLeft += event.deltaY;
  }, { passive: false });

  sync();
  return { fallback: true };
}

// Initialize Parallax Image Slider (Smooothy)
document.addEventListener("DOMContentLoaded", () => {
  initParallaxImageSlider();
});
