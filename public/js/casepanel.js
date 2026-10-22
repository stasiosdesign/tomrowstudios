// -----------------------------------------
// THE CASE STUDIES
// -----------------------------------------
//
// CaseStudyViewer.astro, CaseStudyPanel.astro, "The case studies, grown
// out of the bar" in style.css. A partner's case study opens from its card
// (the Partners page's stagger, the Partners archive grid:
// [data-case-open="case-<slug>"]) as a panel of the floating navigation's
// (floatingnav.js, openPanel), as the contact form is: the bar lifts into a
// wide panel over it and gathers in to its square under it, the close in
// the square and the steps either side of it. The page holds still, the
// backdrop, Escape and the close take it back into the bar, and focus goes
// back to the card.
//
// The steps (and the arrow keys) go to the case study before or after, in
// the order of the cards, round from the last to the first, in the same
// panel: the words and pictures of the one showing slide off a little the
// way it is left and fade, the next one's slide in from the other side
// after them, each of its columns from the top. The panel itself stays.
// Each column of the one showing scrolls smoothly on its own Lenis, as the
// side panels do, the page's held still under it.
//
// Barba: the viewer is part of the page, so initCasePanels() binds the
// incoming page's on every navigation (transitions.js); a page change
// closes the panel into the bar (floatingnav.js, closeForPage). Reduced
// motion: a step is a straight change.

function initCasePanels(scope) {
  const root = scope || document;
  const viewer = root.querySelector('[data-case-viewer]');
  if (!viewer || viewer.__caseViewer) return;
  viewer.__caseViewer = true;
  const studies = Array.from(viewer.querySelectorAll('[data-case-study]'));
  if (!studies.length) return;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealsOf = (study) => Array.from(study.querySelectorAll('[data-case-reveal]'));
  let index = 0;
  let stepping = null; // the one showing going
  let entering = null; // the next coming in
  const settle = () => {
    if (stepping) stepping.progress(1);
    if (entering) entering.progress(1);
  };

  // Smooth scrolling inside the case study showing, as the side panels
  // have it (createNestedLenis, sidepanel.js): each of its two columns on
  // the desktop grid, the whole study where they stack; only while it
  // shows, so there is never more than the one study's running. The
  // page's own is held while the viewer is open (floatingnav.js).
  const stacked = window.matchMedia('(max-width: 991px)');
  let scrollers = [];
  function scrollOff() {
    if (typeof destroyNestedLenis === 'function') scrollers.forEach((el) => destroyNestedLenis(el));
    scrollers = [];
  }
  function scrollOn(study) {
    scrollOff();
    if (typeof createNestedLenis !== 'function' || reduced()) return;
    scrollers = stacked.matches ? [study] : Array.from(study.children);
    scrollers.forEach((el) => createNestedLenis(el));
  }
  if (typeof onPageLeave === 'function') onPageLeave(scrollOff);

  // The one case study showing, from the top of each of its columns
  function show(i) {
    index = i;
    studies.forEach((study, k) => { study.hidden = k !== i; });
    const study = studies[i];
    viewer.setAttribute('aria-labelledby', study.getAttribute('aria-labelledby'));
    viewer.removeAttribute('aria-label');
    [study, ...study.children].forEach((el) => { el.scrollTop = 0; });
    scrollOn(study);
  }

  function step(by) {
    if (studies.length < 2) return;
    settle();
    const from = studies[index];
    const to = (index + by + studies.length) % studies.length;
    if (typeof gsap === 'undefined' || reduced()) {
      show(to);
      return;
    }
    const out = revealsOf(from);
    stepping = gsap.timeline({ onComplete: () => { stepping = null; } })
      .to(out, { autoAlpha: 0, x: -by * 24, duration: 0.28, ease: 'power2.in', stagger: 0.02 })
      .call(() => {
        gsap.set(out, { autoAlpha: 1, x: 0 });
        show(to);
        entering = gsap.fromTo(revealsOf(studies[to]), { autoAlpha: 0, x: by * 32 }, {
          autoAlpha: 1, x: 0, duration: 0.7, ease: 'expo.out', stagger: 0.05,
          onComplete: () => { entering = null; },
        });
      });
  }

  const parts = {
    el: viewer,
    bg: viewer.querySelector('[data-case-bg]'),
    inner: viewer.querySelector('[data-case-inner]'),
    reveals: () => revealsOf(studies[index]),
    closeLabel: 'Close the case study',
    steps: studies.length > 1 ? { prev: () => step(-1), next: () => step(1) } : null,
    onClosed: () => {
      settle();
      scrollOff();
    },
  };

  root.querySelectorAll('[data-case-open]').forEach((trigger) => {
    if (trigger.__caseTrigger) return;
    trigger.__caseTrigger = true;
    trigger.addEventListener('click', (event) => {
      const i = studies.findIndex((study) => study.id === trigger.getAttribute('data-case-open'));
      if (i < 0 || !window.floatingNav) return; // the link's own anchor
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (window.floatingNav.panelIsOpen()) return;
      show(i);
      window.floatingNav.openPanel(parts, trigger);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => initCasePanels());
