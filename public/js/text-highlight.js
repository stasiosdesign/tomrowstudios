// -----------------------------------------
// TEXT HIGHLIGHT
// -----------------------------------------
// A statement marked [data-highlight-text] is split into words that start
// dim (.highlight-word in the stylesheet) and light up one after another as
// it is scrolled through, scrubbed to the scroll so reading back up dims
// them again. Without SplitText or ScrollTrigger, or with reduced motion,
// nothing is split and the text stays fully lit.
//
// transitions.js calls initTextHighlight on every navigation; the incoming
// container is new markup, and the outgoing page's triggers have already
// been killed. DOMContentLoaded covers the first load.

function initTextHighlight(root) {
  if (typeof SplitText === "undefined" || !window.ScrollTrigger) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.registerPlugin(SplitText, ScrollTrigger);

  (root || document).querySelectorAll("[data-highlight-text]").forEach((el) => {
    if (el.__highlight) return;
    el.__highlight = true;

    const split = new SplitText(el, { type: "words", wordsClass: "highlight-word" });
    gsap.fromTo(split.words, { opacity: 0.2 }, {
      opacity: 1,
      ease: "none",
      stagger: 0.1,
      scrollTrigger: {
        trigger: el,
        // From the statement's top entering the lower part of the screen to
        // its foot passing just above the middle: lit through while it is
        // in comfortable reading position
        start: "top 80%",
        end: "bottom 45%",
        scrub: true,
      },
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTextHighlight(document);
});
