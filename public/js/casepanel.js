// -----------------------------------------
// THE CASE STUDY PANEL
// -----------------------------------------
//
// CaseStudyPanel.astro, "Case study panel" in style.css. A partner's case
// study opens from its card (the Partners page's slider, the Partners
// archive grid: [data-case-open="case-<slug>"]) as a large sheet over the
// darkened page, after Jesper Landberg's project panels:
//   - opening, the sheet grows out of the very card that was pressed: its
//     clip opens from the card's rectangle to the whole sheet, carrying the
//     card's own picture with it, which gives way to the sheet as it grows;
//     the page darkens behind; then the title, the standfirst, the tags and
//     the first pictures rise into place one after another, and the close
//     button comes up;
//   - open, the left of the sheet stands still and its right scrolls on its
//     own, smoothly (a Lenis of its own, as the side panels have); on a
//     phone, where the two stack, the whole sheet scrolls;
//   - closing (the close button, the darkened page, Escape), the text and
//     pictures go, and the sheet closes back into its card — wherever the
//     card is now, or to the middle of the screen if it is out of sight.
// The page holds still while it is open (Lenis stopped), focus goes to the
// close button and stays inside the sheet, and goes back to the card after.
//
// Barba: the panels are part of the page, so initCasePanels() binds the
// incoming page's on every navigation (transitions.js); leaving the page
// with one open gives the page its scrolling back. Reduced motion: the sheet
// fades in and out, nothing grows.

const casePanel = { open: null, trigger: null, tl: null, lenis: null };

function initCasePanels(scope) {
  (scope || document).querySelectorAll('[data-case-open]').forEach((trigger) => {
    if (trigger.__caseTrigger) return;
    trigger.__caseTrigger = true;
    trigger.addEventListener('click', (event) => {
      const panel = document.getElementById(trigger.getAttribute('data-case-open'));
      if (!panel || !panel.hasAttribute('data-case-panel')) return; // the link's own anchor
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      // Pressed from the keyboard (no pointer: detail 0), focus shows its ring
      openCasePanel(panel, trigger, event.detail === 0);
    });
  });
  (scope || document).querySelectorAll('[data-case-panel]').forEach((panel) => {
    if (panel.__casePanel) return;
    panel.__casePanel = true;
    panel.querySelectorAll('[data-case-close]').forEach((closer) => {
      closer.addEventListener('click', (event) => {
        event.preventDefault();
        closeCasePanel();
      });
    });
  });
  if (typeof onPageLeave === 'function') {
    onPageLeave(() => {
      if (casePanel.open) closeCasePanel({ instant: true });
    });
  }
}

const caseReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const caseStacked = () => window.matchMedia('(max-width: 991px)').matches;

// The card's rectangle as an inset of the sheet's, for its clip; a card out
// of sight (or gone) closes to a small square in the middle of the sheet
function caseInsetFrom(sheet, trigger) {
  const s = sheet.getBoundingClientRect();
  let r = trigger && trigger.isConnected ? trigger.getBoundingClientRect() : null;
  const seen = r && r.width && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  if (!seen) {
    const side = Math.min(s.width, s.height) * 0.2;
    r = { left: s.left + (s.width - side) / 2, top: s.top + (s.height - side) / 2, right: s.left + (s.width + side) / 2, bottom: s.top + (s.height + side) / 2 };
  }
  const t = Math.max(0, r.top - s.top);
  const rt = Math.max(0, s.right - r.right);
  const b = Math.max(0, s.bottom - r.bottom);
  const l = Math.max(0, r.left - s.left);
  return `inset(${t}px ${rt}px ${b}px ${l}px round 2px)`;
}

// The card's picture, laid over the sheet while it grows, so the card
// itself seems to open out into it
function caseGhost(sheet, trigger) {
  const img = trigger && trigger.querySelector('img');
  const src = img && (img.currentSrc || img.src);
  if (!src) return null;
  const ghost = document.createElement('img');
  ghost.className = 'case-panel__ghost';
  ghost.alt = '';
  ghost.src = src;
  sheet.appendChild(ghost);
  return ghost;
}

function caseScroller(panel) {
  return caseStacked() ? panel.querySelector('[data-case-sheet]') : panel.querySelector('[data-case-scroll]');
}

function openCasePanel(panel, trigger, byKeyboard) {
  if (casePanel.open === panel) return;
  if (casePanel.open) closeCasePanel({ instant: true });
  const sheet = panel.querySelector('[data-case-sheet]');
  const backdrop = panel.querySelector('[data-case-backdrop]');
  const close = panel.querySelector('.case-panel__close');
  const reveals = Array.from(panel.querySelectorAll('[data-case-reveal]'));
  casePanel.open = panel;
  casePanel.trigger = trigger;

  if (window.lenis) window.lenis.stop();
  document.documentElement.classList.add('is--case-open');
  panel.classList.add('is--open');
  panel.removeAttribute('inert');
  panel.setAttribute('aria-hidden', 'false');

  // From the top, its own smooth scroll
  [sheet, panel.querySelector('[data-case-scroll]')].forEach((el) => { if (el) el.scrollTop = 0; });
  const scroller = caseScroller(panel);
  if (scroller && typeof createNestedLenis === 'function' && !caseReduced()) {
    casePanel.lenis = createNestedLenis(scroller);
    if (casePanel.lenis) {
      casePanel.lenis.scrollTo(0, { immediate: true });
      casePanel.lenis.resize();
    }
  }

  const focusIn = () => close && close.focus({ preventScroll: true, focusVisible: !!byKeyboard });
  if (typeof gsap === 'undefined' || caseReduced()) {
    if (typeof gsap !== 'undefined') {
      gsap.set([sheet, backdrop, ...reveals, close], { clearProps: 'all' });
      gsap.fromTo([backdrop, sheet], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
    }
    focusIn();
    return;
  }

  if (casePanel.tl) casePanel.tl.kill();
  const ghost = caseGhost(sheet, trigger);
  const from = caseInsetFrom(sheet, trigger);
  const grow = 'expo.inOut';
  const tl = gsap.timeline({
    onComplete: () => {
      if (ghost) ghost.remove();
      gsap.set(sheet, { clearProps: 'clipPath' });
    },
  });
  tl.set(sheet, { clipPath: from, autoAlpha: 1 })
    .set(reveals, { autoAlpha: 0, y: 36 })
    .set(close, { autoAlpha: 0, scale: 0.6 })
    .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, 0)
    .to(sheet, { clipPath: 'inset(0px 0px 0px 0px round 2px)', duration: 1.05, ease: grow }, 0);
  if (ghost) tl.fromTo(ghost, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.55, ease: 'power2.inOut' }, 0.35);
  tl.to(reveals, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 }, 0.62)
    .to(close, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 0.75)
    .call(focusIn, null, 0.75);
  casePanel.tl = tl;
}

function closeCasePanel(opts) {
  const panel = casePanel.open;
  if (!panel) return;
  const instant = !!(opts && opts.instant);
  const sheet = panel.querySelector('[data-case-sheet]');
  const backdrop = panel.querySelector('[data-case-backdrop]');
  const close = panel.querySelector('.case-panel__close');
  const reveals = Array.from(panel.querySelectorAll('[data-case-reveal]'));
  const trigger = casePanel.trigger;
  casePanel.open = null;
  casePanel.trigger = null;

  const done = () => {
    panel.classList.remove('is--open');
    panel.setAttribute('inert', '');
    panel.setAttribute('aria-hidden', 'true');
    if (typeof gsap !== 'undefined') gsap.set([sheet, backdrop, ...reveals, close], { clearProps: 'all' });
    sheet.querySelectorAll('.case-panel__ghost').forEach((g) => g.remove());
    if (casePanel.lenis && typeof destroyNestedLenis === 'function') destroyNestedLenis(caseScroller(panel));
    casePanel.lenis = null;
    document.documentElement.classList.remove('is--case-open');
    if (window.lenis) window.lenis.start();
  };

  if (casePanel.tl) casePanel.tl.kill();
  if (instant || typeof gsap === 'undefined') {
    done();
    return;
  }
  if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
  if (caseReduced()) {
    casePanel.tl = gsap.to([backdrop, sheet], { autoAlpha: 0, duration: 0.25, onComplete: done });
    return;
  }
  const to = caseInsetFrom(sheet, trigger);
  const ghost = caseGhost(sheet, trigger);
  const tl = gsap.timeline({ onComplete: done });
  tl.to([...reveals].reverse(), { autoAlpha: 0, y: -18, duration: 0.25, ease: 'power2.in', stagger: 0.02 }, 0)
    .to(close, { autoAlpha: 0, scale: 0.7, duration: 0.2, ease: 'power2.in' }, 0);
  if (ghost) tl.fromTo(ghost, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power2.inOut' }, 0.2);
  tl.fromTo(sheet, { clipPath: 'inset(0px 0px 0px 0px round 2px)' }, { clipPath: to, duration: 0.85, ease: 'expo.inOut' }, 0.12)
    .to(backdrop, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, 0.35);
  casePanel.tl = tl;
}

// Escape closes; Tab goes round the sheet while it is open
document.addEventListener('keydown', (event) => {
  const panel = casePanel.open;
  if (!panel) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeCasePanel();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = Array.from(panel.querySelectorAll('a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])')).filter((el) => el.getClientRects().length);
  if (!focusable.length) return;
  const firstEl = focusable[0];
  const lastEl = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === firstEl) {
    event.preventDefault();
    lastEl.focus();
  } else if (!event.shiftKey && document.activeElement === lastEl) {
    event.preventDefault();
    firstEl.focus();
  } else if (!panel.contains(document.activeElement)) {
    event.preventDefault();
    firstEl.focus();
  }
});

document.addEventListener('DOMContentLoaded', () => initCasePanels());
