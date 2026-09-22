gsap.registerPlugin(ScrollTrigger);

/* Sticky service list — the item nearest the activation line lights up as you
   scroll the column past it, the rest sit back. */
function initServiceList() {
  document.querySelectorAll("[data-service-list]").forEach((root) => {
    // Barba re-runs this on every navigation; never bind the same list twice
    if (root.__serviceList) return;
    root.__serviceList = true;

    const items = Array.from(root.querySelectorAll("[data-service-item]"));
    if (!items.length) return;

    // The third column, if the section has one — it carries the line that
    // explains whichever deliverable is currently lit
    const detail = root.querySelector("[data-service-detail]");

    let current = -1;

    function setCurrent(index) {
      if (index === current) return;
      current = index;
      items.forEach((el, i) => el.classList.toggle("is--active", i === index));

      const copy = items[index] && items[index].getAttribute("data-service-desc");
      if (!detail || !copy || detail.textContent === copy) return;

      // Fade out, swap, fade back — a hard cut mid-scroll reads as a glitch
      detail.classList.add("is--swapping");
      clearTimeout(detail.__swap);
      detail.__swap = setTimeout(() => {
        detail.textContent = copy;
        detail.classList.remove("is--swapping");
      }, 180);
    }

    function pick() {
      const line = window.innerHeight * 0.5;
      let best = 0;
      let bestDistance = Infinity;
      items.forEach((el, i) => {
        const box = el.getBoundingClientRect();
        const distance = Math.abs(box.top + box.height / 2 - line);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      setCurrent(best);
    }

    ScrollTrigger.create({
      trigger: root,
      start: "top bottom",
      end: "bottom top",
      onUpdate: pick,
      onRefresh: pick,
    });

    pick();
  });
}

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
  initServiceList();
  initTestimonialSwitcher();
});
