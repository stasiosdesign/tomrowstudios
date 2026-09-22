gsap.registerPlugin(ScrollTrigger);

function initStepByStepTimeline() {
  // Barba swaps the container, so pick up every timeline on the incoming page
  document.querySelectorAll("[data-step-timeline-init]").forEach(setupStepTimeline);
}

function setupStepTimeline(root) {
  const line = root.querySelector("[data-step-timeline-line]");
  const fill = root.querySelector("[data-step-timeline-fill]");
  const items = Array.from(root.querySelectorAll("[data-step-timeline-item]"));
  if (!line || !fill || !items.length) return;

  const anchors = items.map(
    (item) => item.querySelector("[data-step-timeline-marker]") || item
  );

  const activationInput = parseFloat(root.dataset.stepTimelineActivation);
  const activation = Number.isNaN(activationInput)
    ? 0.5
    : Math.min(Math.max(activationInput, 0), 1);
  const activationPercent = activation * 100;
  const lastIndex = items.length - 1;

  let anchorFractions = [0];

  function measureLine() {
    if (items.length < 2) {
      line.style.height = "0px";
      anchorFractions = [0];
      return;
    }
    const base = line.parentElement.getBoundingClientRect().top;
    const centers = anchors.map((anchor) => {
      const box = anchor.getBoundingClientRect();
      return box.top + box.height / 2 - base;
    });
    const firstCenter = centers[0];
    const span = centers[lastIndex] - firstCenter;
    line.style.top = firstCenter + "px";
    line.style.height = span + "px";
    anchorFractions = centers.map((center) =>
      span > 0 ? (center - firstCenter) / span : 0
    );
  }

  let currentIndex = -2;

  function setCurrentIndex(index) {
    if (index === currentIndex) return;
    currentIndex = index;
    items.forEach((item, i) => {
      const status = index >= 0 && i <= index ? "active" : "inactive";
      if (item.getAttribute("data-status") !== status) {
        item.setAttribute("data-status", status);
      }
      item.toggleAttribute("data-current", i === index);
      item.toggleAttribute("data-previous", i === index - 1);
      item.toggleAttribute("data-next", i === index + 1);
    });
  }

  function indexForProgress(reached, progress) {
    if (!reached) return -1;
    let index = 0;
    for (let i = 0; i < anchorFractions.length; i++) {
      if (progress + 0.0001 >= anchorFractions[i]) index = i;
    }
    return index;
  }

  function updateFromScroll(self) {
    const reached = self.isActive || self.progress >= 1;
    setCurrentIndex(indexForProgress(reached, self.progress));
  }

  setCurrentIndex(-1);
  gsap.set(fill, { transformOrigin: "top", scaleY: 0 });

  if (root._stepTimelineMedia) root._stepTimelineMedia.revert();
  const mediaQueries = gsap.matchMedia();
  root._stepTimelineMedia = mediaQueries;

  mediaQueries.add("(prefers-reduced-motion: no-preference)", () => {
    measureLine();
    ScrollTrigger.addEventListener("refreshInit", measureLine);

    if (items.length > 1) {
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: line,
            start: "top " + activationPercent + "%",
            end: "bottom " + activationPercent + "%",
            scrub: true,
            onUpdate: updateFromScroll,
            onToggle: updateFromScroll,
            onRefresh: updateFromScroll,
          },
        }
      );
    } else {
      setCurrentIndex(0);
    }

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

    // The steps are measured the moment they are set up, which on a cold load
    // is before the webfont has swapped in and the column has settled at its
    // real width — so re-measure whenever the block actually changes size.
    // The line is absolutely positioned, so writing to it cannot loop back in.
    let remeasure = null;
    if (typeof ResizeObserver !== "undefined") {
      remeasure = new ResizeObserver(() => {
        measureLine();
        ScrollTrigger.refresh();
      });
      remeasure.observe(root);
    }

    ScrollTrigger.refresh();

    return () => {
      if (remeasure) remeasure.disconnect();
      window.removeEventListener("load", refresh);
      ScrollTrigger.removeEventListener("refreshInit", measureLine);
    };
  });

  mediaQueries.add("(prefers-reduced-motion: reduce)", () => {
    measureLine();
    gsap.set(fill, { scaleY: 1 });
    setCurrentIndex(lastIndex);
  });
}

// Initialize Step-by-step Timeline
document.addEventListener("DOMContentLoaded", () => {
  initStepByStepTimeline();
});
