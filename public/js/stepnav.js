// -----------------------------------------
// STEPPED MENU (scrolled-state navigation)
// -----------------------------------------
//
// Two states on every page. Over the hero, the exposed bar (SiteNav) is the
// navigation and this file does nothing visible. Once the hero's bottom edge
// has passed the top of the screen, a Menu control appears at the top right;
// it opens five panels — one link each — built at their final, stepped sizes
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
// Barba: the markup lives in the layout and survives a navigation, so
// initStepNav() binds it once. The tie to the hero is a ScrollTrigger, and
// afterLeave kills the page's triggers, so initStepNavHero() is called again
// on every arrival to find the incoming page's hero and start from the right
// state. Arriving anywhere closes the menu at once.

function initStepNav() {
  const root = document.querySelector('[data-step-nav]');
  if (!root || root.__stepNav || typeof gsap === 'undefined') return;
  root.__stepNav = true;

  const toggle = root.querySelector('[data-step-nav-toggle]');
  const menu = root.querySelector('[data-step-nav-menu]');
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
    };
  });
  const toggleMain = toggle.querySelector('[data-step-nav-toggle-label="menu"]');
  const toggleShadow = toggle.querySelector('[data-step-nav-toggle-label="close"]');

  // Rest positions: the first copy in the line, the second a line below it,
  // where the roll's overflow hides it.
  const restRolls = () => {
    rolls.forEach((r) => {
      gsap.killTweensOf([r.main, r.shadow]);
      gsap.set(r.main, { yPercent: 0 });
      gsap.set(r.shadow, { yPercent: 100 });
    });
  };
  restRolls();
  gsap.set(toggleShadow, { yPercent: 100 });

  // ---- The geometry: one timeline, played to open and reversed to close ----
  const setClosed = () => {
    root.setAttribute('data-step-nav-open', 'false');
    menu.setAttribute('aria-hidden', 'true');
    menu.inert = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  };

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease },
    onReverseComplete: setClosed,
  });

  gsap.set(panels, { clipPath: 'inset(0 0 100% 0)' });
  gsap.set(rolls.map((r) => r.index), { autoAlpha: 0 });

  panels.forEach((panel, i) => {
    // Each panel starts a beat after the one before it, well inside the
    // previous reveal, so the five read as one cascade.
    const at = i * 0.09;
    tl.fromTo(panel, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9 }, at);
    tl.fromTo(rolls[i].main, { yPercent: 100 }, { yPercent: 0, duration: 0.7, stagger: 0.025 }, at + 0.25);
    tl.fromTo(rolls[i].index, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, at + 0.2);
  });
  // Menu rolls up, Close rolls into its place, as the first panel opens
  tl.to(toggleMain, { yPercent: -100, duration: 0.5 }, 0);
  tl.to(toggleShadow, { yPercent: 0, duration: 0.5 }, 0);

  const isOpen = () => root.getAttribute('data-step-nav-open') === 'true';

  function open() {
    if (isOpen() || tl.isActive()) return;
    root.setAttribute('data-step-nav-open', 'true');
    menu.setAttribute('aria-hidden', 'false');
    menu.inert = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    restRolls();
    if (reducedMotion) tl.progress(1);
    else tl.play();
    panels[0].focus({ preventScroll: true });
  }

  function close(opts) {
    const instant = !!(opts && opts.instant);
    if (!isOpen() && !tl.isActive()) return;
    if (tl.isActive() && !instant) return;
    const focusWasInside = menu.contains(document.activeElement);
    restRolls();
    if (instant || reducedMotion) {
      tl.pause(0);
      setClosed();
    } else {
      tl.reverse();
    }
    if (focusWasInside) toggle.focus({ preventScroll: true });
  }

  root.__stepNavApi = { open, close, isOpen };

  // ---- Interaction ----
  toggle.addEventListener('click', () => (isOpen() ? close() : open()));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) close();
  });

  panels.forEach((panel, i) => {
    panel.addEventListener('click', (event) => {
      if (panel.hasAttribute('data-step-nav-contact')) {
        // The drawer of the page we are on; the href is the fallback
        const drawer = document.getElementById('contact');
        if (drawer && typeof drawer.open === 'function') {
          event.preventDefault();
          close();
          drawer.open();
          return;
        }
      }
      // A page link: Barba takes the navigation; the menu closes under the
      // page transition and initStepNavHero() finishes the job on arrival.
      close();
    });

    if (!finePointer || reducedMotion) return;
    const r = rolls[i];
    const roll = (up) => {
      if (tl.isActive() || !isOpen()) return;
      gsap.to(r.main, { yPercent: up ? -100 : 0, duration: 0.5, ease, stagger: 0.02 });
      gsap.to(r.shadow, { yPercent: up ? 0 : 100, duration: 0.5, ease, stagger: 0.02 });
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
