// -----------------------------------------
// STEPPED MENU (scrolled-state navigation)
// -----------------------------------------
//
// Two states on every page. Over the hero, the exposed bar (SiteNav) is the
// navigation and this file does nothing visible. Once the hero's bottom edge
// has passed the top of the screen, a Menu control appears at the top right;
// it opens four panels — one link each — built at their final, stepped sizes
// and revealed top-down by a clip-path in an overlapping stagger. Closing
// reverses the same timeline, so the right-most panel goes first.
//
// Two layers, kept apart on purpose:
//   - geometry: the panels' clip-path, on one GSAP timeline;
//   - type: every label is two copies in a clipped line, split into
//     characters with SplitText where it is available. On open the first
//     copy rolls up into place; on hover the second rolls up over it. The
//     Menu / Close control is the same roll without the split.
//
// The page under the menu does not scroll while the menu is anywhere but
// closed. A panel's link is carried by the panels themselves: transitions.js
// resolves it to its own transition, which calls cover() and uncover() here —
// the panels grow down over the page from the one clicked, the page is
// swapped under them, and they retract, always the same way, to show the new
// one. The numbers and labels hold still throughout.
//
// Barba: the markup lives in the layout and survives a navigation, so
// initStepNav() binds it once. The tie to the hero is a ScrollTrigger, and
// afterLeave kills the page's triggers, so initStepNavHero() is called again
// on every arrival to find the incoming page's hero and start from the right
// state. Arriving anywhere closes the menu at once, and clears whatever the
// transition left on it.

function initStepNav() {
  const root = document.querySelector('[data-step-nav]');
  if (!root || root.__stepNav || typeof gsap === 'undefined') return;
  root.__stepNav = true;

  const toggle = root.querySelector('[data-step-nav-toggle]');
  const menu = root.querySelector('[data-step-nav-menu]');
  const backdrop = root.querySelector('[data-step-nav-backdrop]');
  const panels = Array.from(menu.querySelectorAll('[data-step-nav-link]'));
  if (!toggle || !panels.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasSplit = typeof SplitText !== 'undefined';
  if (hasSplit) gsap.registerPlugin(SplitText);
  // The site's curve, from transitions.js; a plain fallback if this file
  // somehow runs first.
  const ease = gsap.parseEase('osmo') ? 'osmo' : 'power3.inOut';

  // ---- The type: two copies per label, split into characters ----
  const rolls = panels.map((panel) => {
    const main = panel.querySelector('[data-step-nav-text]');
    const shadow = panel.querySelector('[data-step-nav-text-shadow]');
    const split = (el) => (hasSplit ? new SplitText(el, { type: 'chars', charsClass: 'step-nav__char' }).chars : [el]);
    return {
      main: split(main),
      shadow: split(shadow),
      index: panel.querySelector('[data-step-nav-index]'),
      label: panel.querySelector('[data-step-nav-label]'),
    };
  });
  const toggleMain = toggle.querySelector('[data-step-nav-toggle-label="menu"]');
  const toggleShadow = toggle.querySelector('[data-step-nav-toggle-label="close"]');

  // Hover rolls are tracked per label and stopped by reference. Killing them
  // by target (gsap.killTweensOf) would also strip the labels' reveal out of
  // the open timeline below, and the labels would stop rolling in.
  const stopHover = (r) => {
    r.hover.forEach((t) => t.kill());
    r.hover = [];
  };
  rolls.forEach((r) => { r.hover = []; });

  // Rest positions: the first copy in the line, the second a line below it,
  // where the roll's overflow hides it. `withMain` false leaves the first
  // copy where the timeline last put it — below the line, ready to roll in.
  const restRolls = (withMain) => {
    rolls.forEach((r) => {
      stopHover(r);
      if (withMain) gsap.set(r.main, { yPercent: 0 });
      gsap.set(r.shadow, { yPercent: 100 });
    });
  };
  restRolls(true);
  gsap.set(toggleShadow, { yPercent: 100 });

  // The page holds still from the first frame of the open to the last of the
  // close. Lenis stops — its stylesheet clips the root's overflow while it is
  // stopped — and starts again once the menu is closed. Both calls are safe
  // to repeat, so the hold follows the menu's state rather than counting.
  const holdPageScroll = (hold) => {
    const lenis = window.lenis;
    if (!lenis) return;
    if (hold) lenis.stop();
    else lenis.start();
  };

  // Set while the panels are carrying a page transition: the menu's own
  // controls (open, close, the hover rolls) stand down until it lands.
  let navigating = false;

  // ---- The geometry: one timeline, played to open and reversed to close ----
  const setClosed = () => {
    holdPageScroll(false);
    root.setAttribute('data-step-nav-open', 'false');
    menu.setAttribute('aria-hidden', 'true');
    menu.inert = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  };

  // Open, the panels carry no clip at all: a clip-path left on them at rest
  // can leave the labels unpainted until something (a hover) repaints them.
  // Reversing re-renders the clip from the timeline, so the close is intact.
  const tl = gsap.timeline({
    paused: true,
    defaults: { ease },
    onComplete: () => {
      gsap.set(panels, { clipPath: 'none' });
      rolls.forEach((r) => gsap.set(r.main, { yPercent: 0 }));
    },
    onReverseComplete: setClosed,
  });

  gsap.set(panels, { clipPath: 'inset(0 0 100% 0)' });
  gsap.set(rolls.map((r) => r.index), { autoAlpha: 0 });

  // The page behind: dimmed and blurred as the panels come down
  tl.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 0);

  panels.forEach((panel, i) => {
    // Each panel starts a beat after the one before it, well inside the
    // previous reveal, so the four read as one cascade.
    const at = i * 0.06;
    tl.fromTo(panel, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55 }, at);
    // force3D off: no compositor layer per character under the moving clip
    tl.fromTo(rolls[i].main, { yPercent: 100 }, { yPercent: 0, duration: 0.45, stagger: 0.015, force3D: false }, at + 0.15);
    tl.fromTo(rolls[i].index, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, at + 0.12);
  });
  // Menu rolls up, Close rolls into its place, as the first panel opens
  tl.to(toggleMain, { yPercent: -100, duration: 0.35 }, 0);
  tl.to(toggleShadow, { yPercent: 0, duration: 0.35 }, 0);

  const isOpen = () => root.getAttribute('data-step-nav-open') === 'true';

  function open() {
    if (navigating || isOpen() || tl.isActive()) return;
    holdPageScroll(true);
    root.setAttribute('data-step-nav-open', 'true');
    menu.setAttribute('aria-hidden', 'false');
    menu.inert = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    restRolls(false);
    if (reducedMotion) tl.progress(1);
    else tl.timeScale(1).play();
    panels[0].focus({ preventScroll: true });
  }

  function close(opts) {
    const instant = !!(opts && opts.instant);
    if (!isOpen() && !tl.isActive()) return;
    if ((navigating || tl.isActive()) && !instant) return;
    const focusWasInside = menu.contains(document.activeElement);
    restRolls(true);
    if (instant || reducedMotion) {
      tl.pause(0);
      if (navigating) clearCover();
      setClosed();
    } else {
      // The close runs a touch quicker than the open
      tl.timeScale(1.3).reverse();
    }
    if (focusWasInside) toggle.focus({ preventScroll: true });
  }

  // ---- The page transition (called from transitions.js) ----
  // cover(): from the clicked panel outwards, the panels grow down to the
  // foot of the screen while the other labels and the control go and the
  // backdrop turns solid, so nothing of the page is left in view. Clicked
  // mid-open or mid-close, the menu first finishes opening, quickly.
  // uncover(): with the new page in place, the panels retract — the same
  // way whichever was clicked — and the backdrop lifts off the page.
  // The clicked number and label never move: they are lifted out of their
  // panel's flow where they stand, so the growth runs under them, and the
  // retreat is a clip rather than a move, so the panel's edge wipes them
  // away in place.
  function cover(link) {
    navigating = true;
    const origin = Math.max(0, panels.indexOf(link));
    tl.pause();

    // Measured together, then set together: one layout read for them all
    const spots = rolls.flatMap((r, i) => {
      const panel = panels[i].getBoundingClientRect();
      return [r.index, r.label].map((el) => {
        const box = el.getBoundingClientRect();
        return [el, { position: 'absolute', top: box.top - panel.top, left: box.left - panel.left, width: box.width }];
      });
    });
    spots.forEach(([el, spot]) => gsap.set(el, spot));

    const covering = gsap.timeline({ defaults: { ease } });
    if (tl.progress() < 1) covering.add(tl.tweenTo(tl.duration(), { duration: 0.2, ease: 'none' }));
    covering.addLabel('cover');
    covering.to(toggle, { autoAlpha: 0, duration: 0.25 }, 'cover');
    covering.to(rolls.filter((r, i) => i !== origin).flatMap((r) => [r.index, r.label]), { autoAlpha: 0, duration: 0.25 }, 'cover');
    covering.to(backdrop, { backgroundColor: '#000', duration: 0.5 }, 'cover');
    covering.to(panels, { height: root.clientHeight - menu.offsetTop, duration: 0.5, stagger: { each: 0.05, from: origin } }, 'cover');
    return covering;
  }

  function uncover() {
    return gsap.timeline({ defaults: { ease } })
      // Left to right, each panel's top edge running down to its foot
      .fromTo(panels, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(100% 0% 0% 0%)', duration: 0.65, stagger: 0.05 }, 0)
      .to(backdrop, { autoAlpha: 0, duration: 0.5 }, 0.1);
  }

  // After a transition: what it left inline goes, back to the stylesheet
  // and the open timeline's start
  function clearCover() {
    navigating = false;
    gsap.set(panels, { clearProps: 'height' });
    gsap.set(rolls.flatMap((r) => [r.index, r.label]), { clearProps: 'position,top,left,width' });
    // The numbers' fade is the open timeline's, already back at its start
    gsap.set([toggle, ...rolls.map((r) => r.label)], { clearProps: 'opacity,visibility' });
    gsap.set(backdrop, { clearProps: 'backgroundColor' });
  }

  root.__stepNavApi = { open, close, isOpen, cover, uncover };

  // ---- Interaction ----
  toggle.addEventListener('click', () => (isOpen() ? close() : open()));
  backdrop.addEventListener('click', () => close());

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) close();
  });

  panels.forEach((panel, i) => {
    // Another page's panel is Barba's to take, and it hands it to the panels'
    // own transition. The page we are on has nowhere to go, so its panel
    // only closes the menu — kept from Barba, which would reload the page.
    panel.addEventListener('click', (event) => {
      if (!panel.hasAttribute('aria-current')) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    });

    if (!finePointer || reducedMotion) return;
    const r = rolls[i];
    const roll = (up) => {
      if (navigating || tl.isActive() || !isOpen()) return;
      // The new roll replaces the last one outright, so an in and an out
      // never fight over the same characters
      stopHover(r);
      r.hover = [
        gsap.to(r.main, { yPercent: up ? -100 : 0, duration: 0.5, ease, stagger: 0.02 }),
        gsap.to(r.shadow, { yPercent: up ? 0 : 100, duration: 0.5, ease, stagger: 0.02 }),
      ];
    };
    panel.addEventListener('mouseenter', () => roll(true));
    panel.addEventListener('mouseleave', () => roll(false));
    panel.addEventListener('focus', () => roll(true));
    panel.addEventListener('blur', () => roll(false));
  });
}

// Per page: which state we are in, and the trigger that flips it. The hero
// is the home hero where there is one, otherwise whatever block follows the
// bar — the first band of an inner page — and failing that the bar itself,
// so the control appears once the bar has scrolled out of reach.
function initStepNavHero(container) {
  const root = document.querySelector('[data-step-nav]');
  if (!root || !root.__stepNavApi) return;
  const api = root.__stepNavApi;
  const toggle = root.querySelector('[data-step-nav-toggle]');
  const panels = Array.from(root.querySelectorAll('[data-step-nav-link]'));

  // A new page: whatever was open is closed, no animation
  api.close({ instant: true });

  // The current page's panel
  const here = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
  panels.forEach((panel) => {
    const target = (panel.getAttribute('href') || '').replace(/\.html$/, '').replace(/#.*$/, '');
    if (target && target === here) panel.setAttribute('aria-current', 'page');
    else panel.removeAttribute('aria-current');
  });

  const scope = container || document;
  const nav = scope.querySelector('.site-nav');
  const hero = scope.querySelector('.home-hero') || (nav && nav.nextElementSibling) || nav;

  const setState = (state) => {
    root.setAttribute('data-step-nav-state', state);
    if (state === 'hero') {
      api.close();
      toggle.inert = true;
    } else {
      toggle.inert = false;
    }
  };

  if (!hero || !window.ScrollTrigger) {
    setState('scrolled');
    return;
  }

  // From where the page actually is — a reload partway down starts right
  setState(hero.getBoundingClientRect().bottom > 0 ? 'hero' : 'scrolled');

  ScrollTrigger.create({
    trigger: hero,
    start: 'bottom top',
    onEnter: () => setState('scrolled'),
    onLeaveBack: () => setState('hero'),
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initStepNav();
});
