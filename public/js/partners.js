gsap.registerPlugin(ScrollTrigger);

/* The testimonial stage (TestimonialStage.astro): the row of people along
   the foot swaps the quote and the backdrop, and the stage moves on by
   itself. The active person's line (data-testimonial-bar) fills over the
   interval as a CSS animation, and its end shows the next, so the line and
   the change can never drift apart; pressing someone starts their line
   from the beginning. The line is held (is--paused) while the stage is
   mostly off the screen, while the row is pointed at or has the focus, and
   while the tab is hidden, so nothing moves on unseen or while someone is
   choosing. */
function initTestimonialSwitcher() {
  document.querySelectorAll("[data-testimonial]").forEach((root) => {
    if (root.__testimonial) return;
    root.__testimonial = true;

    const slides = Array.from(root.querySelectorAll("[data-testimonial-slide]"));
    const chips = Array.from(root.querySelectorAll("[data-testimonial-chip]"));
    const row = root.querySelector(".testimonial-chips");
    if (slides.length < 2 || chips.length !== slides.length) return;

    let offscreen = true;
    let pointed = false;
    let focused = false;
    const syncPaused = () => root.classList.toggle("is--paused", offscreen || pointed || focused || document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      offscreen = !entry.isIntersecting;
      syncPaused();
    }, { threshold: 0.4 });
    observer.observe(root);
    if (row) {
      row.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") { pointed = true; syncPaused(); } });
      row.addEventListener("pointerleave", () => { pointed = false; syncPaused(); });
      row.addEventListener("focusin", () => { focused = row.matches(":has(:focus-visible)"); syncPaused(); });
      row.addEventListener("focusout", () => { focused = false; syncPaused(); });
    }
    document.addEventListener("visibilitychange", syncPaused);
    if (typeof onPageLeave === "function") onPageLeave(() => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPaused);
    });
    syncPaused();

    function show(index) {
      slides.forEach((s, i) => {
        const on = i === index;
        s.classList.toggle("is--active", on);
        s.setAttribute("aria-hidden", on ? "false" : "true");
      });
      chips.forEach((c, i) => {
        const on = i === index;
        c.classList.toggle("is--active", on);
        c.setAttribute("aria-selected", on ? "true" : "false");
      });
      // Where the row is wider than the screen (a phone), the active
      // person slid into its view, the row alone scrolling, not the page
      if (row && row.scrollWidth > row.clientWidth) {
        row.scrollTo({ left: chips[index].offsetLeft - chips[0].offsetLeft, behavior: "smooth" });
      }
    }

    chips.forEach((chip, i) => {
      chip.addEventListener("click", () => show(i));
      const bar = chip.querySelector("[data-testimonial-bar]");
      if (bar) bar.addEventListener("animationend", () => show((i + 1) % slides.length));
    });

    show(0);
  });
}

/* The partners' stagger (partner.astro): on the desktop grid, each column
   rises past the page by its own share (data-speed) of the distance the
   page has scrolled, from the page's top to the stagger's foot leaving the
   screen, so the columns slide a little against one another and the
   stagger has depth. One timeline scrubbed by the scroll, a transform each,
   nothing measured on scroll, so it is the same either way and at any
   speed (the site's smooth scrolling as everywhere); at the page's top every
   column is where the layout puts it. Not on a smaller screen, where the
   columns stack in pairs, nor with reduced motion. */
function initPartnerStagger(scope) {
  const stagger = (scope || document).querySelector("[data-partner-stagger]");
  if (!stagger || stagger.__parallax || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  stagger.__parallax = true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const mm = gsap.matchMedia();
  mm.add("(min-width: 992px)", () => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: stagger, start: 0, end: "bottom top", scrub: true, invalidateOnRefresh: true },
    });
    // The run: from the page's top to the stagger's foot at the screen's top
    const distance = () => stagger.getBoundingClientRect().bottom + window.scrollY;
    stagger.querySelectorAll("[data-speed]").forEach((col) => {
      const speed = Number(col.dataset.speed) || 0;
      if (!speed) return;
      tl.fromTo(col, { y: 0 }, { y: () => -speed * distance(), ease: "none", force3D: true }, 0);
    });
  });
  if (typeof onPageLeave === "function") onPageLeave(() => mm.revert());
}

document.addEventListener("DOMContentLoaded", () => {
  initTestimonialSwitcher();
  initPartnerStagger();
});
