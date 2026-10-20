// -----------------------------------------
// FLOATING NAVIGATION
// -----------------------------------------
//
// The bar and the menu at the foot of the screen (FloatingNav.astro,
// "Floating navigation" in style.css), after fluid.glass. On every page:
// the bar rises from below the screen once the first page has been
// revealed, and stays through every navigation — except over the home
// page's hero, which has the screen to itself: there the bar stays down
// (holdDown, from initFloatingNavPage) until the hero has been scrolled
// through (the list hero: until its last part, coming up with that part's
// words), and goes down again if the page goes back up into it. The
// contact form, which grows out of the bar, still opens from the hero (its
// Book a call button): the bar comes up behind it while it is open, from
// where it rests, and goes down again once it has closed back into it.
//
// The bar's states are its own parts moved, never rebuilt:
//   - at rest: the home link, the page's name, the menu control;
//   - at the foot of the page (the footer coming into view): the name rolls
//     up out of its window and the back-to-top arrow rolls up into it;
//   - with the menu open: those parts fade, the bar's background narrows to
//     a square, and the close control rolls up into the middle of it.
// The menu is a set of separate modules — the four parts of the practice,
// Home, the reel, Contact Tom — with no panel round them. Opening, they
// rise from the bar into place, row by row from the bottom (a row's modules
// together), each coming up and to full size as it goes, the whole open in
// about half a second; closing, they drop back towards the bar, top row
// first, quicker. Every tween goes from wherever its target is, so a close
// in the middle of an open (or the reverse) turns round smoothly instead
// of jumping.
//
// The page under the menu holds still while it is open (Lenis stops), a
// click on the page or Escape closes it, focus goes to the first block on
// open and back to the menu control on close. On a mouse, the pointer
// resting on the menu control opens it too (focus left where it is), and a
// menu opened so closes once the pointer has left it, unless it was pressed. A tile's name rolls on hover
// with the site's own label roll (split-hover.js).
//
// Route-aware from the page itself: the name the bar shows and the page the
// menu marks are read from the Barba container (data-nav-title, else
// data-page-name; data-nav-section, else the address), so they can never
// disagree with the page. On a navigation, transitions.js closes the menu,
// waiting for its close to play through before the new page goes in
// (closeForPage), and hands over the incoming container (setRoute), and
// initFloatingNavPage() re-ties the bar to the new page's footer (afterLeave
// kills the old page's triggers).
//
// The contact form (data-fnav-contact) is the navigation grown into a
// panel, never a drawer of its own. Its background starts as exactly the
// rectangle it grows from and opens to the panel's (one number, morph.p,
// drives it: the background moved and scaled, the contents clipped to it):
//   - from Contact Tom in the open menu: the other modules drop away and
//     Contact Tom's own module grows into the form, the bar's close square
//     going with the modules; closing runs it back into that module, and
//     the others rise again round it;
//   - from anywhere else (every [data-panel-open="contact"] on the page,
//     which no longer opens a side panel): the bar opens upward into it,
//     its parts fading as it goes; closing runs it back into the bar.
// A page change (quick) or a reset (instant) always closes it to the bar.
// The page holds still while it is open; Escape, the backdrop and the close
// control close it, focus stays inside it and goes back to what opened it.
// The form itself is enquiry.js's.
//
// The marquees over the bar (data-fnav-promo="book", "contact": one strip
// per message) answer to the page, and to the part of it on screen: the
// innermost element marked data-nav-promo (the container, or a section in
// it) that the middle of the screen is in names the one that is up, an
// empty mark none. So the Influence page has the book's throughout, and
// the home page none over its hero, then Contact Tom's below it. Read from
// the scroll, a frame at a time, and on each new page; only while the bar
// is up (is--shown here). A change of message is one strip going back
// behind the bar as the other comes up, each still running. They go back
// while the menu is open or a page transition runs (is--fnav-open,
// is--page-transition on the root; style.css).
//
// Barba: the markup is in the layout and survives a navigation, so
// initFloatingNav() binds it once. Reduced motion: every change is instant.

function initFloatingNav() {
  const bar = document.querySelector('[data-fnav]');
  const menu = document.querySelector('[data-fnav-menu]');
  if (!bar || !menu || bar.__fnav || typeof gsap === 'undefined') return;
  bar.__fnav = true;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const backdrop = document.querySelector('[data-fnav-backdrop]');
  const logo = bar.querySelector('.fnav__logo');
  const title = bar.querySelector('.fnav__title');
  const titleInner = bar.querySelector('[data-fnav-title]');
  const burger = bar.querySelector('[data-fnav-open]');
  const closer = bar.querySelector('[data-fnav-close]');
  const arrow = bar.querySelector('[data-fnav-top]');
  const barBg = bar.querySelector('[data-fnav-bg]');
  const reveals = Array.from(menu.querySelectorAll('[data-fnav-reveal]'));
  const firstLink = menu.querySelector('a');
  const items = Array.from(menu.querySelectorAll('[data-fnav-item]'));
  const contactPanel = document.querySelector('[data-fnav-contact]');
  const contactBg = contactPanel && contactPanel.querySelector('[data-fnav-contact-bg]');
  const contactInner = contactPanel && contactPanel.querySelector('[data-fnav-contact-inner]');
  const contactReveals = contactPanel ? Array.from(contactPanel.querySelectorAll('[data-fnav-contact-reveal]')) : [];
  const barParts = [logo, title, burger, arrow];
  const root = document.documentElement;
  const promos = Array.from(document.querySelectorAll('[data-fnav-promo]'));
  let promoKey = '';    // the message the page asks for where it is: '' for none
  let promoMarks = [];  // the page's marked elements, outermost first

  // ---- The modules, row by row ----
  // A module's delay from its row: the bottom row first when opening (the
  // one nearest the bar), the top row first when closing; the modules of a
  // row together, so the menu moves as one piece
  const contactModule = menu.querySelector('.fnav-menu__contact');
  function rowDelay(spread, fromBottom) {
    const tops = reveals.map((el) => el.offsetTop);
    const lo = Math.min(...tops);
    const hi = Math.max(...tops);
    return (i) => {
      const at = hi > lo ? (tops[i] - lo) / (hi - lo) : 0;
      return (fromBottom ? 1 - at : at) * spread;
    };
  }
  // Where a module stands at rest, its rise set aside for the measure
  function restRect(el) {
    const cell = el.closest('[data-fnav-reveal]') || el;
    const was = cell.style.transform;
    cell.style.transform = 'none';
    const rect = el.getBoundingClientRect();
    cell.style.transform = was;
    return rect;
  }
  // Hidden: a little low and a little small, as if pressed into the bar;
  // shown, each springs up to size with the slightest overshoot, its
  // opacity in at once rather than over the whole rise
  const HIDDEN = { autoAlpha: 0, y: '1rem', scale: 0.92 };
  const RISE = { y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.4)' };
  const SHOW = { autoAlpha: 1, duration: 0.18, ease: 'power1.out' };

  // ---- Rest ----
  // The close control and the arrow wait one bar's height down, clipped;
  // the menu's blocks wait a little low and unseen; the panel is closed
  // onto its bottom edge.
  gsap.set(closer, { yPercent: 100, autoAlpha: 0 });
  gsap.set(arrow, { yPercent: 100, autoAlpha: 1 });
  gsap.set(reveals, { ...HIDDEN, transformOrigin: '50% 100%' });
  gsap.set(backdrop, { autoAlpha: 0 });
  if (contactPanel) gsap.set(contactReveals, { autoAlpha: 0, y: '1.2rem' });

  let state = 'closed'; // closed | opening | open | closing
  let atFoot = false;
  let timeline = null;
  // The menu opened by the pointer coming onto its control ("Controls")
  let hoverOpened = false;
  let openTimer = 0;
  let closeTimer = 0;
  const isOpen = () => state === 'opening' || state === 'open';

  // Released only if nothing else has taken the hold over in the meantime:
  // a side panel, the reel's player (reel.js, which closes the menu as it opens),
  // or a page transition (the menu collapses while the pages move, and the
  // transition starts the scroll again once the new page has arrived)
  const holdPageScroll = (hold) => {
    const lenis = window.lenis;
    if (!lenis) return;
    const root = document.documentElement;
    if (hold) lenis.stop();
    else if (!document.querySelector('[data-panel-state="open"]') && !root.classList.contains('is--reel-open') && !root.classList.contains('is--page-transition')) lenis.start();
  };

  const setOpenAttributes = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    menu.classList.toggle('is--open', open);
    document.documentElement.classList.toggle('is--fnav-open', open);
  };

  // `hover`: opened by the pointer coming onto the menu control (below),
  // which leaves focus where it is
  function open(opts) {
    if (isOpen()) return;
    const byHover = !!(opts && opts.hover);
    if (timeline) timeline.kill();
    state = 'opening';
    setOpenAttributes(true);
    holdPageScroll(true);
    // Visible now, not on the timeline's first frame, so focus can land in
    // it: the panel, and its blocks (still transparent, about to fade in)
    gsap.set(menu, { autoAlpha: 1 });
    gsap.set(reveals, { visibility: 'visible' });

    // Quick: the modules off the mark at once, row by row up from the bar,
    // the whole in place in about half a second
    timeline = gsap.timeline({
      defaults: { ease: 'power3.out', overwrite: 'auto' },
      onComplete: () => { state = 'open'; },
    })
      .to(backdrop, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 0)
      .to(barBg, { width: bar.offsetHeight, duration: 0.45, ease: 'power3.inOut' }, 0)
      .to([logo, title, burger, arrow], { autoAlpha: 0, duration: 0.18, ease: 'power2.inOut' }, 0)
      .to(closer, { yPercent: 0, autoAlpha: 1, duration: 0.4 }, 0.12)
      .to(reveals, { ...RISE, stagger: rowDelay(0.14, true) }, 0.02)
      .to(reveals, { ...SHOW, stagger: rowDelay(0.14, true) }, 0.02);

    if (reducedMotion) timeline.progress(1);
    if (!byHover) firstLink.focus({ preventScroll: true });
  }

  // Returns the closing timeline (null if the menu was already closed), so
  // a page transition can wait for it; `quick` runs it a little faster, as
  // a navigation does
  function close(opts) {
    endHover();
    // The contact form, if that is what is open
    if (contactState !== 'closed') return closeContact(opts);
    const instant = !!(opts && opts.instant);
    const quick = !!(opts && opts.quick);
    if (state === 'closed') return null;
    if (state === 'closing' && !instant) {
      if (quick && !reducedMotion) timeline.timeScale(1.5);
      return timeline;
    }
    if (timeline) timeline.kill();
    const focusWasInside = menu.contains(document.activeElement);
    state = 'closing';
    setOpenAttributes(false);

    const done = () => {
      state = 'closed';
      gsap.set(menu, { autoAlpha: 0 });
      gsap.set(barBg, { clearProps: 'width' });
      holdPageScroll(false);
    };

    timeline = gsap.timeline({ defaults: { ease: 'power3.in', overwrite: 'auto' }, onComplete: done })
      .to(reveals, { autoAlpha: 0, y: '0.6rem', scale: 0.94, duration: 0.22, stagger: rowDelay(0.07, false), ease: 'power2.in' }, 0)
      .to(backdrop, { autoAlpha: 0, duration: 0.45, ease: 'power2.inOut' }, 0.08)
      .to(barBg, { width: bar.offsetWidth, duration: 0.55, ease: 'power3.inOut' }, 0.08)
      .to(closer, { yPercent: 100, autoAlpha: 0, duration: 0.3 }, 0.08)
      // All four back: of the name and the arrow, whichever is out of its
      // window stays clipped out of sight
      .to([logo, title, burger, arrow], { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 0.3);

    if (instant || reducedMotion) timeline.progress(1);
    else if (quick) timeline.timeScale(1.5);
    if (focusWasInside) burger.focus({ preventScroll: true });
    return timeline;
  }

  // For a page transition: the menu (or the contact form) closes, quick,
  // and the promise settles once it has, so the new page goes in only
  // after it. It has to wait: putting the new page in holds the main thread
  // for a moment, and GSAP, which runs without lag smoothing (transitions.js),
  // would then jump every running tween over that moment, the closing
  // menu's included, straight to its end. Settles at once when nothing is
  // open; never later than the close should take, should the close be cut
  // short by another.
  function closeForPage() {
    const tl = close({ quick: true });
    if (!tl || !tl.isActive()) return Promise.resolve();
    const left = (tl.duration() - tl.time()) / tl.timeScale();
    return new Promise((resolve) => {
      tl.then(() => resolve());
      setTimeout(resolve, left * 1000 + 100);
    });
  }

  // ---- The contact form: the navigation grown into a panel ----
  const morph = { p: 0 };
  let morphBox = null;
  let contactState = 'closed'; // closed | opening | open | closing
  let contactTimeline = null;
  let contactSource = 'bar';   // menu | bar: where it grew from, and goes back to
  let contactReturn = null;
  const contactOpen = () => contactState === 'opening' || contactState === 'open';

  // From a rectangle (p 0) to the panel's (p 1): the background moved and
  // scaled from the panel's top left corner, the contents clipped to exactly
  // the same rectangle. Measured once per open or close.
  // The bar's rectangle where it rests, whether it is up, down or on its
  // way: its box less whatever its rise has it moved by
  function barRest() {
    const rect = bar.getBoundingClientRect();
    const moved = new DOMMatrixReadOnly(getComputedStyle(bar).transform).m42;
    return new DOMRect(rect.left, rect.top - moved, rect.width, rect.height);
  }
  function measureMorph(from) {
    const panel = contactPanel.getBoundingClientRect();
    morphBox = { w: panel.width, h: panel.height, x: from.left - panel.left, y: from.top - panel.top, fw: from.width, fh: from.height };
  }
  function drawContact() {
    if (!morphBox) return;
    const { w, h, x, y, fw, fh } = morphBox;
    const p = morph.p;
    if (p >= 1) {
      contactBg.style.transform = '';
      contactInner.style.clipPath = '';
      return;
    }
    const left = x * (1 - p);
    const top = y * (1 - p);
    const width = fw + (w - fw) * p;
    const height = fh + (h - fh) * p;
    contactBg.style.transform = `translate(${left}px, ${top}px) scale(${width / w}, ${height / h})`;
    contactInner.style.clipPath = `inset(${top}px ${w - left - width}px ${h - top - height}px ${left}px)`;
  }

  const setContactAttributes = (open) => {
    contactPanel.setAttribute('aria-hidden', String(!open));
    contactPanel.inert = !open;
    contactPanel.classList.toggle('is--open', open);
    document.documentElement.classList.toggle('is--fnav-contact', open);
    bar.inert = open || !bar.classList.contains('is--shown');
  };

  // Where focus lands: the first field with a pointer and keys; on a touch
  // screen the panel itself, so the keyboard does not cover it at once
  const focusContact = () => {
    const first = contactPanel.querySelector('input, textarea');
    if (first && window.matchMedia('(pointer: fine)').matches) first.focus({ preventScroll: true });
    else contactInner.focus({ preventScroll: true });
  };

  function openContact(trigger) {
    if (!contactPanel || contactOpen()) return;
    const fromMenu = isOpen();
    contactSource = fromMenu ? 'menu' : 'bar';
    contactReturn = trigger instanceof HTMLElement ? trigger : null;
    if (contactTimeline) contactTimeline.kill();
    contactState = 'opening';
    holdPageScroll(true);
    gsap.set(contactReveals, { autoAlpha: 0, y: '1.2rem' });
    gsap.set(contactReveals, { visibility: 'visible' });
    measureMorph(fromMenu && contactModule ? restRect(contactModule) : barRest());
    // Held down (the home hero): up behind the form while it is open
    apply();
    morph.p = 0;
    drawContact();

    const tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => { contactState = 'open'; },
    });
    if (fromMenu) {
      // The other modules drop away, and Contact Tom's grows into the form
      if (timeline) timeline.kill();
      timeline = null;
      state = 'closed';
      setOpenAttributes(false);
      gsap.set(contactPanel, { autoAlpha: 0 });
      tl.to([...reveals].reverse(), { autoAlpha: 0, y: '0.8rem', duration: 0.22, stagger: 0.012, ease: 'power2.in' }, 0)
        .to([closer, barBg], { autoAlpha: 0, duration: 0.22, ease: 'power2.out' }, 0)
        .set(contactPanel, { autoAlpha: 1 }, 0.2)
        .set(menu, { autoAlpha: 0 }, 0.2)
        .call(() => { gsap.set(reveals, HIDDEN); }, null, 0.2)
        .to(morph, { p: 1, duration: 0.85, ease: 'expo.inOut', onUpdate: drawContact }, 0.2)
        .to(contactReveals, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.045, ease: 'expo.out' }, 0.62);
    } else {
      // The bar opens upward into it: the panel's background takes over from
      // the bar's, the same surface on the same rectangle
      gsap.set(contactPanel, { autoAlpha: 1 });
      tl.set(barBg, { autoAlpha: 0 }, 0)
        .to(barParts, { autoAlpha: 0, duration: 0.2, ease: 'power2.out' }, 0)
        .to(backdrop, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0)
        .to(morph, { p: 1, duration: 0.9, ease: 'expo.inOut', onUpdate: drawContact }, 0)
        .to(contactReveals, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.045, ease: 'expo.out' }, 0.42);
    }
    setContactAttributes(true);
    contactTimeline = tl;

    if (reducedMotion) {
      tl.progress(1);
      focusContact();
    } else {
      tl.call(focusContact, null, fromMenu ? 0.75 : 0.55);
    }
  }

  function closeContact(opts) {
    const instant = !!(opts && opts.instant);
    const quick = !!(opts && opts.quick);
    if (contactState === 'closed') return null;
    if (contactState === 'closing' && !instant) {
      if (quick && !reducedMotion) contactTimeline.timeScale(1.5);
      return contactTimeline;
    }
    if (contactTimeline) contactTimeline.kill();
    const focusWasInside = contactPanel.contains(document.activeElement);
    // Back where it came from; a page change or a reset takes it to the bar
    const toMenu = contactSource === 'menu' && !quick && !instant;
    contactState = 'closing';
    setContactAttributes(false);
    measureMorph(toMenu && contactModule ? restRect(contactModule) : barRest());
    drawContact();

    const finish = () => {
      contactState = 'closed';
      gsap.set(contactPanel, { autoAlpha: 0 });
      // Held down (the home hero): down again, now the form is back in it
      apply();
      document.dispatchEvent(new CustomEvent('fnav:contactclosed'));
    };

    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } })
      .to([...contactReveals].reverse(), { autoAlpha: 0, y: '0.8rem', duration: 0.22, stagger: 0.015, ease: 'power2.in' }, 0)
      .to(morph, { p: 0, duration: 0.75, ease: 'expo.inOut', onUpdate: drawContact }, 0.12);

    if (toMenu) {
      // In Contact Tom's place: the menu takes over, and its modules rise
      // again round the bar's close square
      tl.call(() => {
        gsap.set(menu, { autoAlpha: 1 });
        gsap.set(reveals, { visibility: 'visible' });
        state = 'opening';
        setOpenAttributes(true);
        finish();
      }, null, 0.87)
        .to([barBg, closer], { autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, 0.7)
        .to(reveals, { ...RISE, stagger: rowDelay(0.14, true) }, 0.87)
        .to(reveals, { ...SHOW, stagger: rowDelay(0.14, true) }, 0.87)
        .call(() => {
          state = 'open';
          const back = contactReturn && menu.contains(contactReturn) ? contactReturn : firstLink;
          if (focusWasInside) back.focus({ preventScroll: true });
        }, null, '>');
    } else {
      // Into the bar: its background and parts back as the panel arrives
      tl.set(closer, { yPercent: 100, autoAlpha: 0 }, 0)
        .set(barBg, { clearProps: 'width' }, 0)
        .to(backdrop, { autoAlpha: 0, duration: 0.5, ease: 'power2.inOut' }, 0.2)
        .to(barParts, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 0.62)
        .call(() => {
          gsap.set(barBg, { autoAlpha: 1 });
          finish();
          holdPageScroll(false);
          if (focusWasInside) (contactReturn && document.contains(contactReturn) ? contactReturn : burger).focus({ preventScroll: true });
        }, null, 0.87);
    }
    contactTimeline = tl;

    if (instant || reducedMotion) tl.progress(1);
    else if (quick) tl.timeScale(1.5);
    return tl;
  }

  // Tab and Shift + Tab go round the form while it is open
  function holdFocus(event) {
    const focusable = Array.from(contactPanel.querySelectorAll('button, input, textarea, a[href]'))
      .filter((el) => !el.disabled && el.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const at = document.activeElement;
    if (event.shiftKey && (at === first || !contactPanel.contains(at))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (at === last || !contactPanel.contains(at))) {
      event.preventDefault();
      first.focus();
    }
  }

  // ---- The foot of the page: the name gives way to the arrow ----
  function setFoot(foot) {
    if (foot === atFoot) return;
    atFoot = foot;
    const duration = reducedMotion ? 0 : 0.5;
    gsap.to(titleInner, { yPercent: foot ? -100 : 0, duration, ease: 'power3.inOut', overwrite: 'auto' });
    gsap.to(arrow, { yPercent: foot ? 0 : 100, duration, ease: 'power3.inOut', delay: foot && !reducedMotion ? 0.08 : 0, overwrite: 'auto' });
  }

  // ---- The route: the bar's name and the menu's current page ----
  const pathName = (path) => path.replace(/[#?].*$/, '').replace(/\.html$/, '').replace(/\/index$/, '') || '/';

  function setTitle(text) {
    if (titleInner.textContent === text) return;
    // Out of sight, or in the arrow's place: the name is simply set
    if (reducedMotion || atFoot || !bar.classList.contains('is--shown')) {
      titleInner.textContent = text;
      return;
    }
    gsap.timeline({ defaults: { overwrite: 'auto' } })
      .to(titleInner, { yPercent: -100, duration: 0.3, ease: 'power3.in' })
      .call(() => { titleInner.textContent = text; })
      .set(titleInner, { yPercent: 100 })
      .to(titleInner, { yPercent: 0, duration: 0.45, ease: 'power3.out' });
  }

  // ---- The marquees: with the bar, as the page asks ----
  function syncPromo() {
    const up = bar.classList.contains('is--shown');
    promos.forEach((strip) => strip.classList.toggle('is--shown', up && strip.dataset.fnavPromo === promoKey));
  }
  // The innermost marked element under the middle of the screen; the page's
  // own mark holds wherever none of its parts is
  function readPromo() {
    const line = window.innerHeight / 2;
    let key = '';
    promoMarks.forEach((el, i) => {
      if (i > 0) {
        const r = el.getBoundingClientRect();
        if (r.top > line || r.bottom <= line) return;
      }
      key = el.getAttribute('data-nav-promo') || '';
    });
    if (key === promoKey) return;
    promoKey = key;
    syncPromo();
  }
  let promoFrame = 0;
  window.addEventListener('scroll', () => {
    if (promoFrame || promoMarks.length < 2) return;
    promoFrame = requestAnimationFrame(() => {
      promoFrame = 0;
      readPromo();
    });
  }, { passive: true });
  // Read again once a page transition has settled the new page in place
  new MutationObserver(() => {
    if (!root.classList.contains('is--page-transition')) readPromo();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  function setRoute(container) {
    const page = container || document.querySelector('[data-barba="container"]');
    if (!page) return;
    setTitle(page.dataset.navTitle || page.dataset.pageName || '');
    promoMarks = [page, ...page.querySelectorAll('[data-nav-promo]')].filter((el) => el.hasAttribute('data-nav-promo'));
    if (!promoMarks.length || promoMarks[0] !== page) promoMarks.unshift(page);
    promoKey = null;
    readPromo();
    const section = pathName(page.dataset.navSection || location.pathname);
    items.forEach((item) => {
      const current = pathName(item.dataset.fnavItem) === section;
      item.classList.toggle('is--current', current);
      const link = item.querySelector('a');
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  // Up once the page is (wanted), unless the page holds it down — save
  // while the contact form, grown out of it, is open
  let wanted = false;
  let heldDown = false;
  function apply() {
    const shown = wanted && (!heldDown || contactState !== 'closed');
    if (!shown) close();
    bar.classList.toggle('is--shown', shown);
    bar.inert = !shown;
    syncPromo();
  }
  function setShown(shown) {
    wanted = shown;
    apply();
  }
  function holdDown(down) {
    if (heldDown === down) return;
    heldDown = down;
    apply();
  }

  // Up once the first page has been revealed (revealPage, transitions.js,
  // lifts is--loading off the root as the page fades in) and the home
  // page's opening, if it runs, is over (loader.js, is--intro), a beat
  // after, so it rises onto a page that is already there
  const waiting = () => root.classList.contains('is--loading') || root.classList.contains('is--intro');
  const rise = () => setTimeout(() => setShown(true), 250);
  if (!waiting()) rise();
  else {
    const watch = new MutationObserver(() => {
      if (waiting()) return;
      watch.disconnect();
      rise();
    });
    watch.observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  function scrollToTop() {
    const lenis = window.lenis;
    if (lenis && typeof lenis.scrollTo === 'function') lenis.scrollTo(0, { duration: reducedMotion ? 0 : 1.6 });
    else window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  // ---- Controls ----
  // The whole bar opens the menu, save its home link and the arrow
  bar.addEventListener('click', (event) => {
    if (event.target.closest('.fnav__logo')) return;
    if (event.target.closest('[data-fnav-top]')) return scrollToTop();
    if (event.target.closest('[data-fnav-close]')) return close();
    if (!isOpen()) open();
  });
  backdrop.addEventListener('click', () => close());

  // On a mouse, the menu control opens the menu as the pointer comes onto
  // it, after the briefest pause, so passing over it does nothing. A menu
  // opened so goes again once the pointer has been off the bar and the
  // menu (its modules and the gaps between them, which count as inside)
  // for a moment, measured from the pointer's crossing out rather than
  // from its next move; coming back in before then keeps it, and coming
  // back onto the control while it is going reopens it. A press anywhere
  // in it keeps it, as a menu opened by a press is kept.
  const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)');
  const HOVER_OPEN = 80;   // ms on the control before the menu opens
  const HOVER_CLOSE = 160; // ms off the bar and the menu before it goes
  const HOVER_ZONE = '[data-fnav], [data-fnav-menu]';
  function endHover() {
    hoverOpened = false;
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    openTimer = closeTimer = 0;
  }
  function leaveSoon() {
    if (closeTimer) return;
    closeTimer = setTimeout(() => {
      closeTimer = 0;
      if (hoverOpened && isOpen()) close();
    }, HOVER_CLOSE);
  }
  burger.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' || !hoverable.matches || isOpen() || contactOpen()) return;
    clearTimeout(openTimer);
    openTimer = setTimeout(() => {
      openTimer = 0;
      if (isOpen() || contactOpen() || bar.inert) return;
      open({ hover: true });
      hoverOpened = true;
    }, HOVER_OPEN);
  });
  burger.addEventListener('pointerleave', () => { clearTimeout(openTimer); openTimer = 0; });
  // Fires once per element the pointer crosses onto, not on every move
  document.addEventListener('pointerover', (event) => {
    if (!hoverOpened || event.pointerType !== 'mouse') return;
    if (event.target instanceof Element && event.target.closest(HOVER_ZONE)) {
      clearTimeout(closeTimer);
      closeTimer = 0;
    } else leaveSoon();
  }, { passive: true });
  // Out of the window altogether
  document.addEventListener('pointerout', (event) => {
    if (hoverOpened && !event.relatedTarget) leaveSoon();
  });
  // A press in the bar or the menu: kept open from now on
  document.addEventListener('pointerdown', (event) => {
    if (hoverOpened && event.target instanceof Element && event.target.closest('[data-fnav], [data-fnav-menu]')) endHover();
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && (isOpen() || contactOpen())) close();
    if (event.key === 'Tab' && contactOpen()) holdFocus(event);
  });
  // Contact Tom, and every other way to contact Tom on the site: the form,
  // in the navigation. Caught before anything else hears the click, so the
  // side panel those links used to open (sidepanel.js) never does.
  if (contactPanel) {
    document.addEventListener('click', (event) => {
      const trigger = event.target instanceof Element && event.target.closest('[data-fnav-contact-open], [data-panel-open="contact"]');
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      openContact(trigger);
    }, true);
    contactPanel.querySelector('[data-fnav-contact-close]').addEventListener('click', () => closeContact());
  }
  // A page in the menu: the menu goes as the page transition starts. The
  // page already showing has nowhere to go, so its link only closes the
  // menu, kept from Barba, which would reload it.
  menu.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (href.startsWith('/') && pathName(href) === pathName(location.pathname)) {
      event.preventDefault();
      event.stopPropagation();
    }
    close();
  });

  setRoute();
  window.floatingNav = { open, close, closeForPage, isOpen, setRoute, setShown, holdDown, setFoot, openContact, closeContact };
}

// Per page: the page's name and section, the trigger that turns the bar's
// name into the back-to-top arrow at the footer, and on the home page what
// keeps the bar down over the hero. The hero as a list (home-list.js) has
// the screen to itself until the clients' band below it is half way up
// the screen: the bar (and Contact Tom's strip with it) comes up as the
// band's top passes just above the middle of the screen going down, and goes down
// again, earlier on the way back, as the band's top passes BAND_LEAVE
// going up, with the band still on screen; so it never shows over the
// hero and never lingers once the page is heading back into it. Any other
// hero: a trigger until the hero's foot has come up past the foot of the
// screen (its last picture in, and a little more), down again once the
// page goes back up into it. A page without the hero lets it up.
function initFloatingNavPage(container) {
  const nav = window.floatingNav;
  if (!nav) return;
  const scope = container || document;
  nav.close({ instant: true });
  nav.setRoute(scope.matches && scope.matches('[data-barba="container"]') ? scope : null);

  const hero = scope.querySelector('[data-home-reel]');
  const HERO_END = 'bottom 97%';
  const BAND_ENTER = 0.45; // the band's top this far down the screen: the bar comes up…
  const BAND_LEAVE = 0.78; // …and, going back up, this far: it goes down
  const band = hero && hero.dataset.reelLayout === 'list' ? hero.nextElementSibling : null;
  if (band) {
    nav.holdDown(band.getBoundingClientRect().top > window.innerHeight * BAND_ENTER);
    if (window.ScrollTrigger && !band.__fnavHold) {
      band.__fnavHold = true;
      ScrollTrigger.create({ trigger: band, start: `top ${BAND_ENTER * 100}%`, onEnter: () => nav.holdDown(false) });
      ScrollTrigger.create({ trigger: band, start: `top ${BAND_LEAVE * 100}%`, onLeaveBack: () => nav.holdDown(true) });
    }
  } else nav.holdDown(!!hero && hero.getBoundingClientRect().bottom > window.innerHeight * 0.97);
  if (hero && !band && window.ScrollTrigger && !hero.__fnavHold) {
    hero.__fnavHold = true;
    ScrollTrigger.create({
      trigger: hero,
      start: HERO_END,
      onEnter: () => nav.holdDown(false),
      onLeaveBack: () => nav.holdDown(true),
    });
  }

  const footer = scope.querySelector('[data-footer]');
  // From where the page actually is — a reload part way down starts right
  nav.setFoot(!!footer && footer.getBoundingClientRect().top < window.innerHeight * 0.75);

  // Barba runs this on the first load as well as the page's own startup:
  // one trigger per footer
  if (footer && window.ScrollTrigger && !footer.__fnavFoot) {
    footer.__fnavFoot = true;
    ScrollTrigger.create({
      trigger: footer,
      start: 'top 75%',
      onEnter: () => nav.setFoot(true),
      onLeaveBack: () => nav.setFoot(false),
    });
  }
}

// transitions.js binds it on the first load (its afterEnter runs then too),
// before tying it to the page; this covers a page without Barba
document.addEventListener('DOMContentLoaded', () => {
  initFloatingNav();
  initFloatingNavPage();
});
