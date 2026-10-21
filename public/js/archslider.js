// -----------------------------------------
// PARALLAX IMAGE SLIDER (Smooothy) + HORIZONTAL SCROLL PROGRESS
// -----------------------------------------
// The Architecture index does not scroll down — it is one screen that moves
// sideways. Smooothy carries the drag, the inertia and the wheel input — with
// `scrollInput` on it reads a vertical wheel as sideways movement, which is
// the whole point of the page. With `infinite` on (the Architecture page)
// the row loops both ways: past the last project the first comes round
// again, and the progress line fills over one whole cycle and starts again.
// A bounded run (infinite off) stops at its ends, and its parallax is worked
// out here rather than taken from Smooothy (see below).

// Smooothy is used only here, so it is loaded with the first slider
// (lifecycle.js) rather than on every page; if it cannot be had, the plain
// scroll-snap track below stands in. The slider's frame loop and listeners
// are taken down when the page is left.
function initParallaxImageSlider() {
  const roots = Array.from(document.querySelectorAll("[data-parallax-init]")).filter((root) => !root.__parallaxSlider);
  if (!roots.length) return;
  // The row is held unseen until the slider has measured itself and set
  // each picture's drift: before that the cards sat at a wrong width and the
  // pictures unshifted, then jumped into place (the clip on arrival)
  roots.forEach((root) => { root.__parallaxSlider = true; root.classList.add("is--pending"); });
  const show = () => roots.forEach((root) => root.classList.remove("is--pending"));
  setTimeout(show, 2500);

  let left = false;
  onPageLeave(() => { left = true; });
  loadScript(VENDOR.smooothy)
    .catch(() => {})
    .then(() => {
      if (!left) roots.forEach(buildParallaxSlider);
      const reveal = () => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(show)));
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(reveal);
    });
}

function buildParallaxSlider(root) {
  const wrapper = root.querySelector("[data-parallax-slider]");
  if (!wrapper) return;

  const amountAttr = wrapper.getAttribute("data-parallax-amount");
  const amount = amountAttr !== null ? parseFloat(amountAttr) : 12;

  const snap = wrapper.getAttribute("data-parallax-snap") !== "false";
  const infinite = wrapper.getAttribute("data-parallax-infinite") === "true";

  const lerpAttr = wrapper.getAttribute("data-parallax-lerp");
  const lerp = lerpAttr !== null ? parseFloat(lerpAttr) : 0.3;

  const maxOffset = 25;
  // The projects (the row may hold copies of them, below)
  const count = wrapper.children.length;
  // Where a looping row stands in its cycle, 0 to 1, from its position in
  // cards (negative as it moves forward)
  const cycleAt = (position) => (((-position % count) + count) % count) / count;

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

  // Looping, Smooothy keeps half the row's cards on either side of the
  // current one, so the row has to be long enough to run past both edges
  // of the screen with a card to spare: the projects are repeated until it
  // is. The copies are for the eye alone (hidden from screen readers, out
  // of the tab order); a cycle is still the projects once round.
  if (infinite) {
    const originals = [...wrapper.children];
    const card = originals[0] ? originals[0].offsetWidth : 0;
    const needed = 2 * (wrapper.clientWidth + card);
    // At most four rounds of copies, should the cards measure small early
    while (card && wrapper.children.length * card < needed && wrapper.children.length < originals.length * 5) {
      originals.forEach((slide) => {
        const copy = slide.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        copy.querySelectorAll("a, button").forEach((el) => { el.tabIndex = -1; });
        wrapper.appendChild(copy);
      });
    }
  }
  // One parallax layer per slide
  const parallaxItems = [...wrapper.children].map((slide) => slide.querySelector("[data-parallax-inner]"));

  // Looping, a second line over the progress line, unseen, that holds the
  // line as it was for a moment as the loop comes round (onUpdate)
  let lastProgress = 0;
  let progressGhost = null;
  if (infinite && progressBar) {
    progressGhost = progressBar.cloneNode(false);
    progressGhost.removeAttribute("data-parallax-progress");
    progressGhost.classList.add("is--ghost");
    progressGhost.style.opacity = "0";
    progressBar.after(progressGhost);
    onPageLeave(() => progressGhost.remove());
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
    // (Looping, Smooothy places the cards round the current one itself.)
    ...(infinite ? {} : {
      setOffset: (viewport) => {
        const inset = parseFloat(getComputedStyle(wrapper).paddingLeft) || 0;
        return (viewport.wrapperWidth - inset * 2) || viewport.itemWidth;
      },
    }),
    onUpdate: (core) => {
      // Looping, Smooothy hands back each slide's own parallax value (it
      // moves the slides round itself, so only it knows where each one
      // stands). On a bounded run every slide gets the same number, which
      // would shove every image the same way: there the offset is worked
      // out from where each card actually sits.
      const track = core.current * (core.viewport.itemWidth || 0);
      const half = (core.viewport.wrapperWidth || 1) / 2;
      parallaxItems.forEach((item, i) => {
        if (!item) return;
        let shift;
        if (infinite) shift = (core.parallaxValues[i] || 0) * amount;
        else {
          const centre = (core.itemOffsets[i] || 0) + track + (core.itemWidths[i] || 0) / 2;
          shift = -((centre - half) / (half * 2)) * amount;
        }
        const offset = gsap.utils.clamp(-maxOffset, maxOffset, shift);
        item.style.transform = `translateX(${offset}%)`;
      });

      // Looping, how far through the current cycle (from where the row is,
      // not where it is going, so the line moves with the cards), back to
      // nothing as the first project comes round again
      const progress = infinite ? cycleAt(core.current) : core.progress;
      if (progressBar) {
        // Round the loop's end the line starts again; rather than snap from
        // full to nothing (or back), the line it was fades off over the one
        // it now is, which comes in under it
        if (infinite && progressGhost && Math.abs(progress - lastProgress) > 0.5) {
          gsap.fromTo(progressGhost, { opacity: 1, scaleX: lastProgress }, { opacity: 0, duration: 0.5, ease: "power2.out", overwrite: true });
          gsap.fromTo(progressBar, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out", overwrite: true });
        }
        lastProgress = progress;
        progressBar.style.transform = `scale3d(${progress}, 1, 1)`;
      }

      // Position is read off the progress, not off the slide index: the run
      // stops with the last card against the right edge rather than centred,
      // so the index alone never reaches the final slide.
      if (counter) {
        const at = infinite ? Math.round(progress * count) % count + 1 : Math.round(progress * (count - 1)) + 1;
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
  // from the nearest whole card rather than from wherever it came to rest;
  // looping, on round past either end
  const stepBy = (direction) => {
    const from = Math.round(-slider.current);
    if (infinite) slider.target = -(from + direction);
    else slider.goToIndex(gsap.utils.clamp(0, count - 1, from + direction));
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
      if (!infinite) return slider.goToIndex(Math.round(ratio * (count - 1)));
      // Looping: that project in the cycle the row is in now, so it goes
      // there directly rather than running back through every lap
      const lap = Math.floor(-slider.current / count) * count;
      slider.target = -(lap + Math.min(count - 1, Math.round(ratio * count)));
    });
  }

  // Smooothy measures the track the moment it is built, which on this page
  // is before the fluid rem scale and the page transition have settled — it
  // came out with a 17px wrapper and cards a third of their real width, so
  // one arrow press moved a third of a card. Re-measure once the layout is
  // real, and again whenever the window changes, which Smooothy never
  // watches on its own.
  const remeasure = () => { slider.resize(); slider.update(); };
  requestAnimationFrame(() => requestAnimationFrame(remeasure));
  window.addEventListener("load", remeasure);
  window.addEventListener("resize", remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  // Barba hands the container over while it is still positioned for the
  // transition, so take one more reading after it has landed
  setTimeout(remeasure, 400);

  // A wheel anywhere on the page walks the row, not only over the cards:
  // outside the cards the gesture moves the track's target itself (Smooothy
  // reads wheels over the track alone, and ignores relayed ones)
  const forwardWheel = (event) => {
    if (wrapper.contains(event.target)) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? window.innerHeight : 1;
    const delta = (Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * unit;
    const width = slider.viewport.itemWidth || 1;
    const target = slider.target - (delta * 1.3) / width;
    slider.target = infinite ? target : gsap.utils.clamp(slider.maxScroll, 0, target);
  };
  window.addEventListener('wheel', forwardWheel, { passive: false });
  onPageLeave(() => window.removeEventListener('wheel', forwardWheel));

  const tick = () => slider.update();
  gsap.ticker.add(tick);

  root.__parallaxSlider = { slider, tick, remeasure };
  onPageLeave(() => {
    gsap.ticker.remove(tick);
    window.removeEventListener("resize", remeasure);
    window.removeEventListener("load", remeasure);
    slider.destroy();
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
