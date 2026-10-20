// -----------------------------------------
// FULL-BLEED SEQUENCE (home): the scroll panels
// -----------------------------------------
//
// The section [data-seq] is tall and its stage is sticky; this file turns
// the scroll through it into two things:
//
//   - a progress P, in percent, over the section's scrollable length (its
//     height less the stage's), clamped to -30..130; each panel's share of
//     it, local = (P - i * interval) / interval, fills that panel's bar
//     straight from the scroll (by scale, so the page is never laid out
//     again);
//   - which panel is up: the last whose share has started (strictly above 0).
//     Changing it swaps classes only and the stylesheet runs the transition.
//     Its neighbours are marked is--prev and is--next; the two panels in a
//     transition are on layers of their own (is--moving) while it runs.
//
// And it runs the titles. Each title row is carried left — only ever left,
// whichever way the page is scrolled — at a slow walk, TICKER_SPEED. The
// scroll's own speed, up or down alike, is added on top (SCROLL_SENSITIVITY
// of it, to at most TICKER_BOOST_MAX) and eased in and back out again
// (TICKER_EASE), so a quick scroll sends the titles racing and they settle
// to the walk once the page comes to rest. The row is three copies of the
// title, each wide enough to fill the screen; the carry wraps a copy at a
// time. Only the panel that is up and the one it came in over move, and
// only while the section is in view.
//
// transitions.js calls initSequence on every navigation; DOMContentLoaded
// covers the first load. Everything is taken down when the page is left
// (lifecycle.js).

const TICKER_SPEED = 35;          // px a second, at rest
const SCROLL_SENSITIVITY = 0.6;   // of the scroll's px a second
const TICKER_BOOST_MAX = 1600;    // px a second on top of the walk
const TICKER_EASE = 4;            // how fast the speed follows the scroll (per second)

function initSequence(root) {
  const section = (root || document).querySelector("[data-seq]");
  // Barba runs this on the first load as well as DOMContentLoaded: once per
  // page
  if (!section || !window.ScrollTrigger || section.__sequence) return;
  section.__sequence = true;

  const stage = section.querySelector(".seq__stage");
  const panels = Array.from(section.querySelectorAll("[data-seq-panel]"));
  const bars = Array.from(section.querySelectorAll("[data-seq-progress] .seq__bar"));
  const rows = panels.map((panel) => panel.querySelector("[data-seq-scrollmove]"));
  const tickers = panels.map((panel) => panel.querySelector("[data-seq-ticker]"));
  if (!stage || !panels.length) return;

  const count = panels.length;
  const interval = 100 / count;
  const clamp = gsap.utils.clamp;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Geometry, measured on refresh rather than every frame ----
  let top = 0;
  let range = 1;
  const measure = () => {
    top = section.getBoundingClientRect().top + window.scrollY;
    range = Math.max(1, section.offsetHeight - stage.offsetHeight);
  };

  // ---- The title rows: enough title to fill the screen, a copy's width ----
  const copyWidths = panels.map(() => 1);
  const fillTickers = () => {
    panels.forEach((panel, i) => {
      const copies = Array.from(tickers[i].children);
      const first = copies[0];
      const unit = first && first.firstElementChild;
      if (!unit) return;
      // Back to one title per copy, measured, then repeated until a copy is
      // wider than the screen, so the row never shows its end as it wraps
      copies.forEach((copy) => {
        while (copy.children.length > 1) copy.lastElementChild.remove();
      });
      const unitWidth = unit.getBoundingClientRect().width || 1;
      const repeats = Math.max(1, Math.ceil((window.innerWidth * 1.1) / unitWidth));
      copies.forEach((copy) => {
        for (let r = 1; r < repeats; r++) copy.appendChild(unit.cloneNode(true));
      });
      copyWidths[i] = first.getBoundingClientRect().width || 1;
    });
  };

  // ---- The carry: always left, faster while the page is scrolling ----
  const offsets = panels.map(() => 0);
  let inView = false;
  let speed = TICKER_SPEED;
  let lastScroll = window.scrollY;
  const carry = (time, deltaMs) => {
    const dt = Math.min(deltaMs, 100) / 1000;
    if (!dt) return;
    const scrollSpeed = Math.abs(window.scrollY - lastScroll) / dt;
    lastScroll = window.scrollY;
    if (!inView || reduced) return;

    const target = TICKER_SPEED + Math.min(scrollSpeed * SCROLL_SENSITIVITY, TICKER_BOOST_MAX);
    speed += (target - speed) * (1 - Math.exp(-TICKER_EASE * dt));

    panels.forEach((panel, i) => {
      if (!rows[i] || !(panel.classList.contains("is--active") || panel.classList.contains("is--prev"))) return;
      offsets[i] -= speed * dt;
      if (offsets[i] <= -copyWidths[i]) offsets[i] %= copyWidths[i];
      rows[i].style.transform = `translate3d(${offsets[i].toFixed(2)}px, 0, 0)`;
    });
  };
  // The carry runs only while the section is in view (the tracker below)
  let carrying = false;
  const setCarrying = (on) => {
    if (on === carrying) return;
    carrying = on;
    lastScroll = window.scrollY;
    if (on) gsap.ticker.add(carry);
    else gsap.ticker.remove(carry);
  };

  // ---- The scroll ----
  let previous = null;
  let active = -1;

  // The panels whose transition is running are on layers of their own
  // (is--moving) until it ends — the longest, the photograph's settle, is
  // 1.8s — and off them again at rest
  const moving = new Map();
  const markMoving = (panel) => {
    if (!panel) return;
    clearTimeout(moving.get(panel));
    panel.classList.add("is--moving");
    moving.set(panel, setTimeout(() => {
      panel.classList.remove("is--moving");
      moving.delete(panel);
    }, 1900));
  };

  const setActive = (index) => {
    if (index === active) return;
    const leaving = panels[active];
    active = index;
    panels.forEach((panel, i) => {
      panel.classList.toggle("is--active", i === index);
      panel.classList.toggle("is--past", i < index);
      panel.classList.toggle("is--prev", i === index - 1);
      panel.classList.toggle("is--next", i === index + 1);
    });
    markMoving(leaving);
    markMoving(panels[index]);
  };

  const update = () => {
    const progress = clamp(-30, 130, ((window.scrollY - top) * 100) / range);
    if (progress === previous) return;
    previous = progress;

    let index = 0;
    for (let i = 0; i < count; i++) {
      const local = ((progress - i * interval) * 100) / interval;
      if (local > 0) index = i;
      if (bars[i]) bars[i].style.transform = `scaleX(${clamp(0, 100, local) / 100})`;
    }

    section.classList.toggle("is--past", progress > 100);
    setActive(index);
  };

  // The rows ease in once, as the section first comes within a screen
  const startTickers = () => {
    tickers.forEach((ticker) => ticker && ticker.classList.add("is--running"));
    // The panels further on are clipped out of view, where a lazy image
    // would never be asked for: fetch them all now, ahead of their turn, and
    // decode each as it arrives, so no panel stalls its entrance on it
    section.querySelectorAll(".seq__img").forEach((img) => {
      img.loading = "eager";
      if (img.decode) img.decode().catch(() => {});
    });
  };

  const near = ScrollTrigger.create({
    trigger: section,
    start: "top bottom+=100%",
    once: true,
    onEnter: startTickers,
  });
  const tracker = ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      inView = self.isActive;
      setCarrying(inView);
    },
    onUpdate: update,
    onRefresh: (self) => {
      inView = self.isActive;
      setCarrying(inView);
      measure();
      previous = null;
      update();
    },
  });

  let resizeFrame = 0;
  const onResize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(fillTickers);
  };
  window.addEventListener("resize", onResize);

  fillTickers();
  measure();
  update();
  inView = tracker.isActive;
  setCarrying(inView);
  // Fonts change the titles' widths: measure again once they are in
  if (document.fonts) document.fonts.ready.then(fillTickers);

  onPageLeave(() => {
    setCarrying(false);
    moving.forEach((timer) => clearTimeout(timer));
    near.kill();
    tracker.kill();
    cancelAnimationFrame(resizeFrame);
    window.removeEventListener("resize", onResize);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSequence(document);
});
