gsap.registerPlugin(ScrollTrigger);

/* Testimonial switcher — the avatar row along the bottom swaps the quote and
   the backdrop, the way the reference behaves. */
function initTestimonialSwitcher() {
  document.querySelectorAll("[data-testimonial]").forEach((root) => {
    if (root.__testimonial) return;
    root.__testimonial = true;

    const slides = Array.from(root.querySelectorAll("[data-testimonial-slide]"));
    const chips = Array.from(root.querySelectorAll("[data-testimonial-chip]"));
    if (slides.length < 2 || chips.length !== slides.length) return;

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
    }

    chips.forEach((chip, i) => {
      chip.addEventListener("click", () => show(i));
    });

    show(0);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTestimonialSwitcher();
});
