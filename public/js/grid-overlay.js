/* Animated grid overlay (Osmo) — temporary development aid.

   Toggled with Shift + G, or by a click on anything carrying
   [data-animated-grid-toggle]. The open/closed state is kept in localStorage,
   so the overlay stays as you left it across reloads and navigations.

   GSAP is already loaded by every page, before this file, so nothing is added
   for it here.

   The markup sits outside [data-barba="container"], alongside the grain and
   the transition overlay, so a Barba navigation leaves it in place — which is
   why this initialises once on DOMContentLoaded and is not re-run per page.
 */
function initGridOverlay() {
  const grid = document.querySelector("[data-animated-grid]");
  const cols = document.querySelectorAll("[data-animated-grid-col]");
  const toggles = document.querySelectorAll("[data-animated-grid-toggle]");

  if (!grid || !cols.length) return;

  const storageKey = "animatedGridState";
  let isOpen = localStorage.getItem(storageKey) === "open";

  gsap.set(grid, { display: "block" });

  if (isOpen) {
    gsap.set(cols, { yPercent: 0 });
  } else {
    gsap.set(cols, { yPercent: 100 });
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
  initGridOverlay();
});
