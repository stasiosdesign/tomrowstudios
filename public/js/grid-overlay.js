/* Animated grid overlay (Osmo) — temporary development aid.

   Toggled with Shift + G, or by a click on anything carrying
   [data-animated-grid-toggle]. The open/closed state is kept in localStorage,
   so the overlay stays as you left it across reloads and navigations.

   GSAP is already loaded by every page, before this file, so nothing is added
   for it here.

   The markup sits outside [data-barba="container"], alongside the grain and
   the transition overlay, so a Barba navigation leaves it in place — which is
   why this initialises once on DOMContentLoaded and is not re-run per page.

   The home page's opening animation is the one thing the overlay waits for.
   It is a development aid laid over the finished page, and the intro is not
   the finished page — so while the intro is running the columns stay parked
   off-screen and the toggle is inert, and if the overlay was left open it
   runs its own opening the moment the intro lets go. Nothing new is animated
   to do that; it is the component's own `openGrid`, called later. */
function initAnimatedGrid() {
  const grid = document.querySelector("[data-animated-grid]");
  const cols = document.querySelectorAll("[data-animated-grid-col]");
  const toggles = document.querySelectorAll("[data-animated-grid-toggle]");

  if (!grid || !cols.length) return;

  const storageKey = "animatedGridState";
  let isOpen = localStorage.getItem(storageKey) === "open";

  /* `is--loading` is on the hero in the markup, so this is true from the first
     paint, before the intro's own script has run — the overlay can never be
     caught on screen for the frame in between. intro.js drops the class from
     one place, with a watchdog behind it, when the timeline is fully done. */
  const intro = document.querySelector(".willem-header.is--loading");
  let introRunning = !!intro;

  gsap.set(grid, { display: "block" });

  if (isOpen && !introRunning) {
    gsap.set(cols, { yPercent: 0 });
  } else {
    gsap.set(cols, { yPercent: 100 });
  }

  if (introRunning) {
    const watch = new MutationObserver(() => {
      if (intro.classList.contains("is--loading")) return;
      watch.disconnect();
      introRunning = false;
      // Left open before the reload: bring it in now, the component's own way
      if (isOpen) openGrid();
    });

    watch.observe(intro, { attributes: true, attributeFilter: ["class"] });
  }

  function openGrid() {
    isOpen = true;
    localStorage.setItem(storageKey, "open");

    gsap.fromTo(cols, {
      yPercent: 100,
    }, {
      yPercent: 0,
      duration: 1,
      ease: "expo.inOut",
      stagger: { each: 0.03, from: "start" },
      overwrite: true
    });
  }

  function closeGrid() {
    isOpen = false;
    localStorage.setItem(storageKey, "closed");

    gsap.fromTo(cols, {
      yPercent: 0,
    }, {
      yPercent: -100,
      duration: 1,
      ease: "expo.inOut",
      stagger: { each: 0.03, from: "start" },
      overwrite: true
    });
  }

  function toggleGrid() {
    // Inert until the home intro has finished; see the note at the top
    if (introRunning) return;
    if (isOpen) closeGrid();
    else openGrid();
  }

  function isTypingContext(e) {
    const el = e.target;
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  }

  toggles.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleGrid();
    });
  });

  window.addEventListener("keydown", (e) => {
    if (isTypingContext(e)) return;
    if (!(e.shiftKey && (e.key || "").toLowerCase() === "g")) return;
    e.preventDefault();
    toggleGrid();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAnimatedGrid();
});
