// -----------------------------------------
// THE ARCHITECTURE ROW (Smooothy) + ITS PROGRESS LINE
// -----------------------------------------
// The Architecture index does not scroll down — it is one screen that moves
// sideways (architecture.astro; "Parallax slider" in style.css). The row
// loops both ways: past the last project the first comes round again.
//
// Smooothy lays the cards out, loops them round, drifts each picture in its
// frame and reads the drag; where the row is and how it moves is this
// file's own (below, "The row's motion"). The card nearest the middle of
// the screen is marked is--active and shown in colour; the progress line
// over the floating bar fills once per cycle.
//
// Smooothy is loaded with the first row (lifecycle.js) rather than on every
// page; if it cannot be had, a plain scrolling track stands in. Everything
// set up here is taken down when the page is left.

function initParallaxImageSlider() {
  const all = Array.from(document.querySelectorAll("[data-parallax-init]"));
  // A row already built (before its page came in, transitions.js) is
  // measured again now the page has landed
  all.forEach((root) => { if (root.__parallaxSlider && root.__parallaxSlider.remeasure) root.__parallaxSlider.remeasure(); });
  const roots = all.filter((root) => !root.__parallaxSlider);
  if (!roots.length) return;
  // The row is held unseen until the slider has measured itself and set
  // each picture's drift: before that the cards sat at a wrong width and
  // the pictures unshifted, then jumped into place
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

// ---- The row's motion: how it feels ----
// A mouse wheel's notches count a fraction of a card each, and the row
// glides straight to the card they come to; a trackpad moves the row pixel
// for pixel, the row easing after it, and gliding into place once it
// stops; a drag holds it exactly under the hand, and on letting go it
// glides on with the flick. The card it comes to rest on is the one
// nearest where the input was taking it, or, if the input went at least
// ROW_INTENT of a card from where it started, at least the next card that
// way, so one notch or a short swipe moves on a project rather than
// springing back. Every glide is a critically damped spring started at the
// row's own speed, so it carries the movement on rather than jerking it.
// It always comes to rest with a card exactly centred.
const ROW_NOTCH = 0.24;      // cards counted for a wheel's notch
const ROW_FOLLOW = 14;       // how closely the row eases after a trackpad (per second)
const ROW_IDLE = 140;        // ms without trackpad input before it glides into place
const ROW_INTENT = 0.12;     // cards: past this from the start, it moves on a card
const ROW_MOMENTUM = 0.3;    // s: how far a released drag carries, at its speed
const ROW_GLIDE = 8;         // the glide's spring rate (per second), from a stop
const ROW_GLIDE_MIN = 6;     // bounds on the rate when it carries a movement on
const ROW_GLIDE_MAX = 14;

function buildParallaxSlider(root) {
  const wrapper = root.querySelector("[data-parallax-slider]");
  if (!wrapper) return;

  // How far each picture drifts in its frame, per card from the start
  const amount = parseFloat(wrapper.getAttribute("data-parallax-amount")) || 10;
  const maxDrift = 25;

  const prevButton = root.querySelector("[data-parallax-prev]");
  const nextButton = root.querySelector("[data-parallax-next]");
  const progressBar = root.querySelector("[data-parallax-progress]");
  const progressWrap = root.querySelector("[data-parallax-progress-wrap]");
  // The projects (the row may hold copies of them, below)
  const count = wrapper.children.length;

  // Opening a project should still be a click, not the tail of a drag
  guardSlideClicks(wrapper);
  // The track is moved by transforms alone: a card brought into view by
  // focus would otherwise scroll the clipped track itself and shift the
  // whole row off the slider's reckoning
  wrapper.addEventListener("scroll", () => {
    if (!wrapper.classList.contains("is--fallback") && wrapper.scrollLeft) wrapper.scrollLeft = 0;
  }, { passive: true });

  if (typeof window.Smooothy !== "function") {
    root.__parallaxSlider = initFallbackTrack(wrapper, { prevButton, nextButton, progressBar });
    return;
  }

  // Smooothy keeps half the row's cards either side of the current one, so
  // the row has to run past both edges of the screen with a card to spare:
  // the projects are repeated until it does. The copies are for the eye
  // alone (hidden from screen readers, out of the tab order).
  const originals = [...wrapper.children];
  const card = originals[0] ? originals[0].offsetWidth : 0;
  const needed = 2 * (wrapper.clientWidth + card);
  while (card && wrapper.children.length * card < needed && wrapper.children.length < originals.length * 5) {
    originals.forEach((slide) => {
      const copy = slide.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      copy.querySelectorAll("a, button").forEach((el) => { el.tabIndex = -1; });
      wrapper.appendChild(copy);
    });
  }
  const slides = [...wrapper.children];
  const drifts = slides.map((slide) => slide.querySelector("[data-parallax-inner]"));
  let activeSlide = null;
  // The track's left padding, where the first slide starts (remeasure)
  let inset = 0;

  // A second line over the progress line, unseen, that holds the line as
  // it was for a moment as the loop comes round
  let lastProgress = 0;
  let progressGhost = null;
  if (progressBar) {
    progressGhost = progressBar.cloneNode(false);
    progressGhost.removeAttribute("data-parallax-progress");
    progressGhost.classList.add("is--ghost");
    progressGhost.style.opacity = "0";
    progressBar.after(progressGhost);
    onPageLeave(() => progressGhost.remove());
  }

  const slider = new Smooothy(wrapper, {
    infinite: true,
    snap: false,
    // The wheel is read below, not by Smooothy
    scrollInput: false,
    onUpdate: (core) => {
      // Smooothy hands back each slide's place in cards from the track's
      // start: its middle on the screen, its picture's drift, and the slide
      // nearest the middle of the screen (in colour)
      const width = core.viewport.itemWidth || 0;
      const half = (core.viewport.wrapperWidth || 0) / 2;
      let nearest = null;
      let nearestDistance = Infinity;
      drifts.forEach((drift, i) => {
        const place = core.parallaxValues[i] || 0;
        const distance = Math.abs(inset + (place + 0.5) * width - half);
        if (distance < nearestDistance) { nearestDistance = distance; nearest = slides[i]; }
        if (drift) drift.style.transform = `translateX(${gsap.utils.clamp(-maxDrift, maxDrift, place * amount)}%)`;
      });
      if (nearest !== activeSlide) {
        if (activeSlide) activeSlide.classList.remove("is--active");
        if (nearest) nearest.classList.add("is--active");
        activeSlide = nearest;
      }

      // How far through the cycle the row is (where it is, not where it is
      // going, so the line moves with the cards); round the loop's end, the
      // line it was fades off over the one it now is
      if (!progressBar) return;
      const progress = (((-core.current % count) + count) % count) / count;
      if (progressGhost && Math.abs(progress - lastProgress) > 0.5) {
        gsap.fromTo(progressGhost, { opacity: 1, scaleX: lastProgress }, { opacity: 0, duration: 0.5, ease: "power2.out", overwrite: true });
        gsap.fromTo(progressBar, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out", overwrite: true });
      }
      lastProgress = progress;
      progressBar.style.transform = `scale3d(${progress}, 1, 1)`;
    },
  });

  // ---- The row's motion ----
  // x: where the row is, in cards (Smooothy's `current`, falling as the row
  // goes forward); v: how fast, in cards a second. Smooothy is told where
  // the row is every frame (its own easing has nothing to do). Slide i
  // stands x + i cards from the track's start, so the places that centre a
  // card are one fixed offset from the whole numbers.
  const centreOffset = () => ((slider.viewport.wrapperWidth || 0) / 2 - inset) / (slider.viewport.itemWidth || 1) - 0.5;
  const nearestCentred = (p) => {
    const offset = centreOffset();
    return offset + Math.round(p - offset);
  };
  const same = (a, b) => Math.abs(a - b) < 0.01;

  let x = 0;
  let v = 0;
  let mode = "rest"; // rest | wheel | drag | glide
  let aim = 0;       // where the wheel has sent the row
  let glide = null;  // the spring: { to, a, b, rate, t0 }
  let from = null;   // the centred card the present gesture started from
  let gesture = null; // notch | wheel | drag, while one is under way
  let lastWheel = 0;
  let lastTick = 0;
  const trail = [];  // where the row has been over the last moments

  // The card a gesture comes to rest on: the centred one nearest where the
  // input was taking the row; or, should that be the card it started from
  // though the input went on past ROW_INTENT, the next card that way
  const restingCard = (start, to) => {
    const nearest = nearestCentred(to);
    if (same(nearest, start) && Math.abs(to - start) > ROW_INTENT) return start + Math.sign(to - start);
    return nearest;
  };
  // The card the row is on now, or heading for
  const currentCard = () => (mode === "glide" ? glide.to : nearestCentred(x));

  // A glide from where the row is, at its speed, to `to`, from time t0:
  //   x(t) = to + (a + b t) e^(-rate t), a = x0 - to, b = v0 + rate a
  // Already moving that way, the rate is the one at which its own speed
  // carries it exactly there (rate = v / distance, so b = 0): a plain
  // slowing down, within bounds; from a stop, the gentle ROW_GLIDE
  const glideTo = (to, t0 = performance.now()) => {
    const a = x - to;
    const rate = Math.abs(v) > 0.2 && -a * v > 0 ? gsap.utils.clamp(ROW_GLIDE_MIN, ROW_GLIDE_MAX, v / -a) : ROW_GLIDE;
    glide = { to, a, b: v + rate * a, rate, t0 };
    mode = "glide";
  };

  // The arrows and keys: a card on from the one the row is on or heading for
  const stepBy = (direction) => {
    gesture = null;
    glideTo(currentCard() - direction);
  };
  if (prevButton) prevButton.addEventListener("click", () => stepBy(-1));
  if (nextButton) nextButton.addEventListener("click", () => stepBy(1));

  // The progress line doubles as a scrubber: pressed, the row glides to
  // that project in the cycle it is in now
  if (progressWrap) {
    progressWrap.addEventListener("click", (event) => {
      const rect = progressWrap.getBoundingClientRect();
      const ratio = gsap.utils.clamp(0, 1, (event.clientX - rect.left) / rect.width);
      const lap = Math.floor(-x / count) * count;
      gesture = null;
      glideTo(nearestCentred(-(lap + Math.min(count - 1, Math.round(ratio * count)))));
    });
  }

  // The wheel, anywhere on the page, vertical read as sideways.
  //   - A mouse wheel's notch (a whole number of the browser's 120, or a
  //     line or page step) counts ROW_NOTCH of a card, and the row glides
  //     straight to the card the run of notches so far comes to: one
  //     movement, never an ease towards the notch and then a second one
  //     into place. The first notch moves on a card; after it, about every
  //     fourth. A notch the other way starts the count again from the card
  //     the row is on or heading for.
  //   - A trackpad's flow moves the row pixel for pixel, the row easing
  //     after it; once it stops, the row glides into place. Turning back
  //     drops what the row still had to travel the old way.
  const isNotch = (event) => {
    if (event.deltaMode !== 0) return true;
    const notch = event.wheelDeltaY || event.wheelDeltaX || 0;
    return Math.abs(notch) >= 120 && notch % 120 === 0;
  };
  const onWheel = (event) => {
    event.preventDefault();
    if (slider.isDragging) return;
    const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (!delta) return;
    unpoint();
    if (isNotch(event)) {
      const move = -Math.sign(delta) * ROW_NOTCH;
      if (gesture !== "notch" || move * (aim - from) < 0) {
        from = currentCard();
        aim = from;
        gesture = "notch";
      }
      aim += move;
      const to = restingCard(from, aim);
      if (mode !== "glide" || !same(to, glide.to)) glideTo(to);
      return;
    }
    const move = -delta / (slider.viewport.itemWidth || 1);
    if (mode !== "wheel") {
      from = currentCard();
      aim = mode === "glide" && move * (glide.to - x) > 0 ? glide.to : x;
    }
    if (move * (aim - x) < 0) aim = x;
    aim += move;
    mode = "wheel";
    gesture = "wheel";
    lastWheel = performance.now();
  };
  window.addEventListener("wheel", onWheel, { passive: false });
  onPageLeave(() => window.removeEventListener("wheel", onWheel));

  // The arrow keys step a card either way (not while typing, or with the
  // menu or the contact form open)
  const onKey = (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (event.target.closest && event.target.closest("input, textarea, select, [contenteditable]")) return;
    const html = document.documentElement.classList;
    if (html.contains("is--fnav-open") || html.contains("is--fnav-contact")) return;
    event.preventDefault();
    unpoint();
    stepBy(event.key === "ArrowRight" ? 1 : -1);
  };
  document.addEventListener("keydown", onKey);
  onPageLeave(() => document.removeEventListener("keydown", onKey));

  // The pointer's own colour (style.css, is--pointing): a card takes the
  // colour from the middle one only once the mouse is actually moved over
  // it, not because the row has carried it under a resting pointer; any
  // other way of moving the row hands the colour back to the middle card
  const point = (event) => {
    if (event.pointerType === "mouse" && (event.movementX || event.movementY)) wrapper.classList.add("is--pointing");
  };
  const unpoint = () => wrapper.classList.remove("is--pointing");
  wrapper.addEventListener("pointermove", point, { passive: true });
  wrapper.addEventListener("pointerleave", unpoint);
  wrapper.addEventListener("pointerdown", unpoint);

  // Smooothy measures the track the moment it is built, which on this page
  // is before the fluid rem scale and the page transition have settled.
  // Re-measure once the layout is real, whenever the window changes, and
  // once the page has landed (initParallaxImageSlider, run again then). A
  // drag moves the row exactly as far as the hand (Smooothy counts it in
  // cards per pixel). At rest the row is put straight on its centred card
  // for the new measure; gliding, it is sent there.
  //
  // Smooothy reads a card's width off the screen (getBoundingClientRect)
  // but the track's off the layout (clientWidth). Arriving by a page
  // transition, the page is built while it is still carried in at a
  // smaller size (transitions.js, pushed back in depth), so the cards came
  // out a fifth too narrow against the track: the row stood off centre,
  // and stayed so. The card's width is put back to its layout size by the
  // page's present scale.
  const remeasure = () => {
    slider.resize();
    const scale = wrapper.getBoundingClientRect().width / (wrapper.offsetWidth || 1);
    if (scale > 0 && Math.abs(scale - 1) > 0.001) slider.viewport.itemWidth /= scale;
    inset = parseFloat(getComputedStyle(wrapper).paddingLeft) || 0;
    slider.config.dragSensitivity = 1 / (slider.viewport.itemWidth || 1);
    if (mode === "rest") x = nearestCentred(x);
    else if (mode === "glide") glideTo(nearestCentred(glide.to));
    slider.current = slider.target = x;
    slider.update();
  };
  requestAnimationFrame(() => requestAnimationFrame(remeasure));
  window.addEventListener("load", remeasure);
  window.addEventListener("resize", remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  // Barba hands the container over while it is still positioned for the
  // transition, so take one more reading after it has landed
  setTimeout(remeasure, 400);

  // One frame. Held, the row is where the hand has put it (Smooothy reads
  // the drag into its target); let go, it glides on from its speed. After
  // the wheel, it eases towards where the wheel has sent it, and glides
  // into place once the wheel has stopped. Gliding, it is where the spring
  // has it. Then Smooothy draws it, and its speed is read from its last
  // few moments.
  const tick = () => {
    const now = performance.now();
    const previous = lastTick || now;
    const dt = Math.min(0.05, (now - previous) / 1000);
    lastTick = now;

    if (slider.isDragging) {
      if (mode !== "drag") from = currentCard();
      mode = "drag";
      gesture = "drag";
      glide = null;
      x = slider.target;
    } else if (mode === "drag") {
      glideTo(restingCard(from, x + v * ROW_MOMENTUM), previous);
    }

    if (mode === "wheel") {
      x += (aim - x) * (1 - Math.exp(-ROW_FOLLOW * dt));
      if (now - lastWheel > ROW_IDLE) glideTo(restingCard(from, aim), now);
    }

    if (mode === "glide") {
      const t = Math.max(0, (now - glide.t0) / 1000);
      const { to, a, b, rate } = glide;
      const decay = Math.exp(-rate * t);
      x = to + (a + b * t) * decay;
      v = (b - rate * (a + b * t)) * decay;
      // Within a fraction of a pixel and all but still: there
      if (Math.abs(x - to) < 0.0015 && Math.abs(v) < 0.02) {
        x = to;
        v = 0;
        glide = null;
        from = null;
        gesture = null;
        mode = "rest";
      }
    }

    slider.current = slider.target = x;
    slider.update();

    trail.push([now, x]);
    while (trail.length > 2 && now - trail[0][0] > 60) trail.shift();
    if (mode === "drag" || mode === "wheel") {
      const [then, was] = trail[0];
      v = now > then ? (x - was) / ((now - then) / 1000) : 0;
    } else if (mode === "rest") v = 0;
  };
  gsap.ticker.add(tick);

  root.__parallaxSlider = { slider, remeasure };
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

// Smooothy unavailable: native horizontal scrolling, the same controls
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

document.addEventListener("DOMContentLoaded", () => {
  initParallaxImageSlider();
});
