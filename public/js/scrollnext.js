// -----------------------------------------
// SCROLL TO NEXT PAGE
// -----------------------------------------
// Supplied implementation. Two additions for this site: a guard, because
// Barba re-runs page functions on every navigation and a second timeline on
// the same section would fire the link twice, and a check that the link has
// not already been taken — a scrub timeline can land on its end more than
// once while the browser is still leaving the page.

gsap.registerPlugin(ScrollTrigger);

function initScrollToNextPage() {
  const wrap = document.querySelector("[data-scroll-next-wrap]");

  if (!wrap) return;
  if (wrap.__scrollNext) return;
  wrap.__scrollNext = true;

  const link = wrap.querySelector("[data-scroll-next-link]");
  const path = wrap.querySelector("[data-scroll-next-path]");
  const bg = wrap.querySelector("[data-scroll-next-bg]");
  const overlay = wrap.querySelector("[data-scroll-next-overlay]");

  if (!link || !path) return;

  // ScrollTrigger defaults
  const start = wrap.getAttribute("data-scroll-start") || "top top";
  const end = wrap.getAttribute("data-scroll-end") || "bottom bottom";

  // Prep SVG path for line draw animation
  const pathLength = path.getTotalLength();

  gsap.set(path, {
    strokeDasharray: pathLength,
    strokeDashoffset: pathLength,
  });

  let taken = false;

  const tl = gsap.timeline({
    defaults: {
      ease: "none",
    },
    scrollTrigger: {
      trigger: wrap,
      start,
      end,
      scrub: true,
    },
  });

  tl.to(path, {
    strokeDashoffset: 0,
    onComplete: () => {
      if (taken) return;
      taken = true;
      link.click();
    }
  });

  // Optional bg scale
  if (bg) {
    tl.to(bg, { scale: 1.2 }, 0);
  }

  // Optional dark overlay animation
  if (overlay) {
    tl.to(overlay, { opacity: 0.5 }, 0);
  }

}

// Initialize Scroll to Next Page
document.addEventListener("DOMContentLoaded", () => {
  initScrollToNextPage();
});
