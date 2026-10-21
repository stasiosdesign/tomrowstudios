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
// At the foot of the page the menu opens of itself, in a second form, the
// footer's own (setFootMode, from initFloatingNavPage's trigger on the
// footer: on once the page is within a fifth of a screen of its end, off
// again as it goes back up). The same modules move the same way, but only
// the four parts of the practice rise, with no backdrop over the page and
// the page still free to scroll, and the studio's mark comes up into the
// bar's square in the close control's place, as the home link. Nothing on
// the bar answers to the pointer then (the mark apart): the menu is the
// footer's navigation until the page leaves the foot, when it drops back
// into the bar as the menu does. Opening the contact form from the footer
// while it is up takes the tiles away and grows the form out of the square,
// and closing the form brings them back.
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
  const barBg = bar.querySelector('[data-fnav-bg]');
  const mark = bar.querySelector('[data-fnav-home]');
  const reveals = Array.from(menu.querySelectorAll('[data-fnav-reveal]'));
  // The footer's form of the menu: the four parts of the practice alone
  const footReveals = reveals.filter((el) => el.hasAttribute('data-fnav-foot'));
  const firstLink = menu.querySelector('a');
  const items = Array.from(menu.querySelectorAll('[data-fnav-item]'));
  const contactPanel = document.querySelector('[data-fnav-contact]');
  const contactBg = contactPanel && contactPanel.querySelector('[data-fnav-contact-bg]');
  const contactInner = contactPanel && contactPanel.querySelector('[data-fnav-contact-inner]');
  const contactReveals = contactPanel ? Array.from(contactPanel.querySelectorAll('[data-fnav-contact-reveal]')) : [];
  const barParts = [logo, title, burger];
  const root = document.documentElement;
  const promos = Array.from(document.querySelectorAll('[data-fnav-promo]'));
  let promoKey = '';    // the message the page asks for where it is: '' for none
  let promoMarks = [];  // the page's marked elements, outermost first

  // ---- The modules, row by row ----
  // A module's delay from its row: the bottom row first when opening (the
  // one nearest the bar), the top row first when closing; the modules of a
  // row together, so the menu moves as one piece; `list`, the modules
  // moving (the menu's, or the footer's form's)
  const contactModule = menu.querySelector('.fnav-menu__contact');
  function rowDelay(spread, fromBottom, list = reveals) {
    const tops = list.map((el) => el.offsetTop);
    const lo = Math.min(...tops);
    const hi = Math.max(...tops);
    return (i) => {
      const at = hi > lo ? (tops[i] - lo) / (hi - lo) : 0;
      return (fromBottom ? 1 - at : at) * spread;
    };
  }
  // The footer's form's ripple: the rows as above, and within a row each
  // tile a beat after the one to its left, so the four lift off one by one
  // like cards picked up rather than as one sheet
  function rippleDelay(spread, beat, fromBottom, list) {
    const row = rowDelay(spread, fromBottom, list);
    const lefts = list.map((el) => el.offsetLeft);
    const lo = Math.min(...lefts);
    const hi = Math.max(...lefts);
    return (i) => row(i) + (hi > lo ? (lefts[i] - lo) / (hi - lo) : 0) * beat;
  }

  // ---- The bar's ground, drawn in to its square and out again ----
  // Moved by its scale, on the compositor, never its width (a layout and a
  // repaint of its glass every frame). Each move starts from what is seen
  // (the ground at its full width, scaled to where it stands), and a ground
  // drawn in becomes a true square at the end, its width the bar's height
  // and its scale 1, so its corners are round again at rest and every
  // later measure (barSquare, the contact form) reads the square. The
  // scale is written to its transform here, not through GSAP's transforms,
  // which would take over the bar's own opening-out (its CSS scale,
  // style.css); the two multiply, each its own
  const ground = { s: 1 };
  const drawGround = () => { barBg.style.transform = ground.s === 1 ? '' : `scaleX(${ground.s})`; };
  function resetGround() {
    barBg.style.width = '';
    ground.s = 1;
    drawGround();
  }
  function fullBar() {
    const seen = barBg.offsetWidth * ground.s;
    barBg.style.width = '';
    ground.s = seen / barBg.offsetWidth;
    drawGround();
  }
  function narrowBar(tl, at, vars) {
    tl.call(fullBar, null, at)
      .to(ground, { s: () => bar.offsetHeight / bar.offsetWidth, ...vars, onUpdate: drawGround }, at)
      .call(() => {
        barBg.style.width = `${bar.offsetHeight}px`;
        ground.s = 1;
        drawGround();
      }, null, at + vars.duration);
  }
  function widenBar(tl, at, vars) {
    tl.call(fullBar, null, at)
      .to(ground, { s: 1, ...vars, onUpdate: drawGround }, at);
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
  // The footer's form comes of itself, as the page settles on its foot, so
  // it is softer than a menu asked for: each tile lifts from just below,
  // a touch small, and settles with the faintest give, as a card set down
  // on a table does; it is seen almost at once, so the motion carries it,
  // not a fade
  const FOOT_HIDDEN = { autoAlpha: 0, y: '1.8rem', scale: 0.94 };
  const FOOT_RISE = { y: 0, scale: 1, duration: 0.85, ease: 'back.out(1.1)' };
  const FOOT_SHOW = { autoAlpha: 1, duration: 0.3, ease: 'power1.out' };

  // ---- Rest ----
  // The close control and the mark wait one bar's height down, clipped;
  // the menu's blocks wait a little low and unseen; the panel is closed
  // onto its bottom edge.
  gsap.set(closer, { yPercent: 100, autoAlpha: 0 });
  gsap.set(mark, { yPercent: 100, autoAlpha: 0 });
  gsap.set(reveals, { ...HIDDEN, transformOrigin: '50% 100%' });
  gsap.set(backdrop, { autoAlpha: 0 });
  if (contactPanel) gsap.set(contactReveals, { autoAlpha: 0, y: '1.2rem' });

  let state = 'closed'; // closed | opening | open | closing
  let foot = false;     // the menu that is open (or on its way) is the footer's form
  let footMode = false; // the page asks for the footer's form (its trigger)
  let switching = false; // one form closing at once for the other to open
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
    // The menu control's own state: the footer's form is not its doing
    burger.setAttribute('aria-expanded', String(open && !foot));
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    menu.classList.toggle('is--open', open);
    document.documentElement.classList.toggle('is--fnav-open', open);
  };
  // The footer's form: the menu shows its four tiles alone, and the bar
  // gives way to the mark in its square (style.css, "The footer's form")
  const setFootForm = (on) => {
    foot = on;
    menu.classList.toggle('is--foot', on);
    document.documentElement.classList.toggle('is--fnav-foot', on);
  };

  // `hover`: opened by the pointer coming onto the menu control (below),
  // which leaves focus where it is. `foot`: the footer's form (above),
  // opened by the page reaching its foot: the four tiles alone, no
  // backdrop, the page free to scroll, focus left where it is
  function open(opts) {
    const toFoot = !!(opts && opts.foot);
    if (isOpen()) {
      if (foot === toFoot) return;
      // The other form is up: down at once (its close's own follow-up held
      // off), and the asked-for one from the bar
      switching = true;
      close({ instant: true });
      switching = false;
    }
    const byHover = !!(opts && opts.hover);
    // From rest, or turning round a close still running (then every tween
    // goes on from where its target is)
    const fromRest = state === 'closed';
    if (timeline) timeline.kill();
    state = 'opening';
    setFootForm(toFoot);
    setOpenAttributes(true);
    if (!toFoot) holdPageScroll(true);
    const list = toFoot ? footReveals : reveals;
    const middle = toFoot ? mark : closer;
    // Visible now, not on the timeline's first frame, so focus can land in
    // it: the panel, and its blocks (still transparent, about to fade in)
    gsap.set(menu, { autoAlpha: 1 });
    gsap.set(list, { visibility: 'visible' });

    // Quick: the modules off the mark at once, row by row up from the bar,
    // the whole in place in about half a second
    timeline = gsap.timeline({
      defaults: { ease: 'power3.out', overwrite: 'auto' },
      onComplete: () => { state = 'open'; },
    });
    if (toFoot) {
      // The footer's form, in one gesture: the bar's parts go first, its
      // ground gathers in to the square, the mark rises into it as it
      // closes, and as the square lands the tiles lift off it one by one,
      // the lower row first, left to right
      if (fromRest) gsap.set(list, { y: FOOT_HIDDEN.y, scale: FOOT_HIDDEN.scale });
      const stagger = rippleDelay(0.12, 0.05, true, list);
      timeline.to(barParts, { autoAlpha: 0, duration: 0.2, ease: 'power2.in' }, 0);
      narrowBar(timeline, 0.05, { duration: 0.6, ease: 'power3.inOut' });
      timeline
        .to(middle, { yPercent: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out' }, 0.35)
        .to(list, { ...FOOT_RISE, stagger }, 0.4)
        .to(list, { ...FOOT_SHOW, stagger }, 0.4);
    } else {
      narrowBar(timeline, 0, { duration: 0.45, ease: 'power3.inOut' });
      timeline
        .to(backdrop, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 0)
        .to(barParts, { autoAlpha: 0, duration: 0.18, ease: 'power2.inOut' }, 0)
        .to(middle, { yPercent: 0, autoAlpha: 1, duration: 0.4 }, 0.12)
        .to(list, { ...RISE, stagger: rowDelay(0.14, true, list) }, 0.02)
        .to(list, { ...SHOW, stagger: rowDelay(0.14, true, list) }, 0.02);
    }

    if (reducedMotion) timeline.progress(1);
    if (!byHover && !toFoot) firstLink.focus({ preventScroll: true });
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
    // Quick (a navigation): the menu at one and a half times its pace, the
    // footer's unhurried form at twice, so the pages are not kept waiting
    const pace = foot ? 2 : 1.5;
    if (state === 'closing' && !instant) {
      if (quick && !reducedMotion) timeline.timeScale(pace);
      return timeline;
    }
    if (timeline) timeline.kill();
    const focusWasInside = menu.contains(document.activeElement);
    const wasFoot = foot;
    const list = wasFoot ? footReveals : reveals;
    const middle = wasFoot ? mark : closer;
    state = 'closing';
    setOpenAttributes(false);

    const done = () => {
      state = 'closed';
      gsap.set(menu, { autoAlpha: 0 });
      resetGround();
      // The footer's form kept its shape through the close; gone now, and
      // the page's scroll was never held for it
      if (wasFoot) setFootForm(false);
      else holdPageScroll(false);
      // The footer's form, if the page asks for it meanwhile
      if (!switching) syncFoot();
    };

    timeline = gsap.timeline({ defaults: { ease: 'power3.in', overwrite: 'auto' }, onComplete: done });
    if (wasFoot) {
      // The footer's form, the opening's gesture reversed: the tiles are
      // set back down into the square, the upper row first, and once they
      // are in, the mark sinks and the square opens out into the bar, its
      // parts coming back as it reaches its width
      timeline
        .to(list, { autoAlpha: 0, y: '1.2rem', scale: 0.96, duration: 0.4, stagger: rippleDelay(0.08, 0.03, false, list), ease: 'power2.in' }, 0)
        .to(middle, { yPercent: 100, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, 0.25);
      widenBar(timeline, 0.35, { duration: 0.6, ease: 'power3.inOut' });
      timeline.to(barParts, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 0.7);
    } else {
      widenBar(timeline, 0.08, { duration: 0.55, ease: 'power3.inOut' });
      timeline
        .to(list, { autoAlpha: 0, y: '0.6rem', scale: 0.94, duration: 0.22, stagger: rowDelay(0.07, false, list), ease: 'power2.in' }, 0)
        .to(backdrop, { autoAlpha: 0, duration: 0.45, ease: 'power2.inOut' }, 0.08)
        .to(middle, { yPercent: 100, autoAlpha: 0, duration: 0.3 }, 0.08)
        // The bar's parts back
        .to(barParts, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 0.3);
    }

    if (instant || reducedMotion) timeline.progress(1);
    else if (quick) timeline.timeScale(pace);
    if (focusWasInside && !wasFoot) burger.focus({ preventScroll: true });
    return timeline;
  }

  // For a page change: the menu (or the contact form) closes, quick, and
  // the page transition runs alongside it, not after it. It no longer has
  // to wait: during a transition GSAP smooths over the stall of putting the
  // new page in (transitions.js), so neither the close nor the pages jump.
  // Usually the close has begun already, as the link was pressed (the menu's
  // click, below); this only makes sure. The promise settles at once.
  // The page is on its way out, so it no longer asks for the footer's
  // form: footMode is dropped first. Left on, the close's own follow-up
  // (syncFoot, in `done`) would open the footer's form again the moment
  // it had closed — the page is still at its foot — only for the new page
  // to take it down instantly on arrival: the tiles flickering back over
  // the pages as they move. The new page sets footMode again for itself
  // (initFloatingNavPage).
  function closeForPage() {
    footMode = false;
    close({ quick: true });
    return Promise.resolve();
  }

  // ---- The contact form: the navigation grown into a panel ----
  const morph = { p: 0 };
  let morphBox = null;
  let contactState = 'closed'; // closed | opening | open | closing
  let contactTimeline = null;
  let contactSource = 'bar';   // menu | foot | bar: where it grew from, and goes back to
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
  // The bar's square (its background narrowed round the middle slot, as it
  // is with the menu open), on the same line
  function barSquare() {
    const rest = barRest();
    const width = barBg.getBoundingClientRect().width;
    return new DOMRect(rest.left + (rest.width - width) / 2, rest.top, width, rest.height);
  }
  function measureMorph(from) {
    const panel = contactPanel.getBoundingClientRect();
    morphBox = { w: panel.width, h: panel.height, x: from.left - panel.left, y: from.top - panel.top, fw: from.width, fh: from.height };
  }
  // The panel's own ground is white and the bar's dark: as the panel grows
  // out of the bar (or its square) the white comes up over the dark in the
  // first part of the growth, the bar's ground going under it; shrinking
  // back, the reverse in the last part. `at` is where on the timeline.
  function groundIn(tl, at) {
    tl.fromTo(contactBg, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' }, at)
      .to(barBg, { autoAlpha: 0, duration: 0.2, ease: 'power1.out' }, at + 0.15);
  }
  function groundOut(tl, at) {
    tl.to(barBg, { autoAlpha: 1, duration: 0.2, ease: 'power1.in' }, at)
      .to(contactBg, { opacity: 0, duration: 0.3, ease: 'power1.in' }, at + 0.05);
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
    const fromFoot = isOpen() && foot;
    const fromMenu = isOpen() && !foot;
    contactSource = fromMenu ? 'menu' : fromFoot ? 'foot' : 'bar';
    contactReturn = trigger instanceof HTMLElement ? trigger : null;
    if (contactTimeline) contactTimeline.kill();
    contactState = 'opening';
    holdPageScroll(true);
    gsap.set(contactReveals, { autoAlpha: 0, y: '1.2rem' });
    gsap.set(contactReveals, { visibility: 'visible' });
    // Out of the bar at the foot of the screen: its square, with the menu
    // or the footer's form open, else the bar itself
    measureMorph(fromMenu || fromFoot ? barSquare() : barRest());
    // Held down (the home hero): up behind the form while it is open
    apply();
    morph.p = 0;
    drawContact();

    const tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => { contactState = 'open'; },
    });
    if (fromFoot) {
      // From the footer's form: the tiles drop away and the form grows out
      // of the bar's square, the mark going with them; the page holds
      // still from here, as it does under the form
      if (timeline) timeline.kill();
      timeline = null;
      state = 'closed';
      setOpenAttributes(false);
      holdPageScroll(true);
      gsap.set(contactPanel, { autoAlpha: 1 });
      tl.to([...footReveals].reverse(), { autoAlpha: 0, y: '0.8rem', duration: 0.22, stagger: 0.012, ease: 'power2.in' }, 0)
        .to(mark, { autoAlpha: 0, duration: 0.22, ease: 'power2.out' }, 0)
        .to(backdrop, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0)
        .set(menu, { autoAlpha: 0 }, 0.2)
        .call(() => { gsap.set(footReveals, HIDDEN); setFootForm(false); }, null, 0.2)
        .to(morph, { p: 1, duration: 0.9, ease: 'expo.inOut', onUpdate: drawContact }, 0);
      groundIn(tl, 0);
      tl.to(contactReveals, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.045, ease: 'expo.out' }, 0.42);
    } else if (fromMenu) {
      // One movement: the menu's modules sink back towards the bar, the top
      // row first, and at the same moment the form grows up out of the
      // bar's square, under the modules as they go; the backdrop stays
      if (timeline) timeline.kill();
      timeline = null;
      state = 'closed';
      setOpenAttributes(false);
      gsap.set(contactPanel, { autoAlpha: 1 });
      tl.to(reveals, { autoAlpha: 0, y: '0.8rem', scale: 0.96, duration: 0.3, stagger: rowDelay(0.08, false), ease: 'power2.in' }, 0)
        .to(closer, { autoAlpha: 0, duration: 0.15, ease: 'power2.out' }, 0)
        .call(() => { gsap.set(menu, { autoAlpha: 0 }); gsap.set(reveals, HIDDEN); }, null, 0.4)
        .to(morph, { p: 1, duration: 0.9, ease: 'expo.inOut', onUpdate: drawContact }, 0);
      groundIn(tl, 0);
      tl.to(contactReveals, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.045, ease: 'expo.out' }, 0.42);
    } else {
      // The bar opens upward into it: the panel's ground takes over from the
      // bar's, on the same rectangle
      gsap.set(contactPanel, { autoAlpha: 1 });
      tl.to(barParts, { autoAlpha: 0, duration: 0.2, ease: 'power2.out' }, 0)
        .to(backdrop, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0)
        .to(morph, { p: 1, duration: 0.9, ease: 'expo.inOut', onUpdate: drawContact }, 0);
      groundIn(tl, 0);
      tl.to(contactReveals, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.045, ease: 'expo.out' }, 0.42);
    }
    setContactAttributes(true);
    contactTimeline = tl;

    if (reducedMotion) {
      tl.progress(1);
      focusContact();
    } else {
      tl.call(focusContact, null, 0.55);
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
    // Back where it came from; a page change or a reset takes it to the bar,
    // as does the page having left its foot in the meantime
    const toMenu = contactSource === 'menu' && !quick && !instant;
    const toFoot = contactSource === 'foot' && footMode && !quick && !instant;
    contactState = 'closing';
    setContactAttributes(false);
    // The bar's square is still there under the form (its ground faded, its
    // width kept). Back into the menu or the footer's form it is that
    // square again, so it keeps the width; back into the bar, the width goes
    // first. (Clearing it on the way back into the menu too was what left
    // the menu's close control stretched to the bar's full width: the menu
    // was reopened round a square that was no longer one.)
    if (!toFoot && !toMenu) resetGround();
    measureMorph(toMenu || toFoot ? barSquare() : barRest());
    drawContact();

    const finish = () => {
      contactState = 'closed';
      gsap.set(contactPanel, { autoAlpha: 0 });
      gsap.set(contactBg, { clearProps: 'opacity' });
      // Held down (the home hero): down again, now the form is back in it
      apply();
      document.dispatchEvent(new CustomEvent('fnav:contactclosed'));
    };

    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } })
      .to([...contactReveals].reverse(), { autoAlpha: 0, y: '0.8rem', duration: 0.22, stagger: 0.015, ease: 'power2.in' }, 0)
      .to(morph, { p: 0, duration: 0.75, ease: 'expo.inOut', onUpdate: drawContact }, 0.12);
    groundOut(tl, 0.55);

    if (toMenu) {
      // The opening run back, as one movement: the form sinks back into the
      // bar's square while the menu's modules rise again round it, from the
      // moment the form has begun to shrink (they are under it, so they show
      // as it clears them)
      tl.call(() => {
        gsap.set(menu, { autoAlpha: 1 });
        gsap.set(reveals, { visibility: 'visible' });
        state = 'opening';
        setOpenAttributes(true);
      }, null, 0.3)
        .to(reveals, { ...RISE, stagger: rowDelay(0.14, true) }, 0.3)
        .to(reveals, { ...SHOW, stagger: rowDelay(0.14, true) }, 0.3)
        .to(closer, { yPercent: 0, autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, 0.65)
        .call(finish, null, 0.87)
        .call(() => {
          state = 'open';
          const back = contactReturn && menu.contains(contactReturn) ? contactReturn : firstLink;
          if (focusWasInside) back.focus({ preventScroll: true });
        }, null, '>');
    } else if (toFoot) {
      // Into the bar's square: the footer's form takes over, the mark and
      // the square back as the panel arrives and the tiles rising again
      // over them; the page free to scroll once more
      tl.to(backdrop, { autoAlpha: 0, duration: 0.5, ease: 'power2.inOut' }, 0.2)
        .call(() => {
          gsap.set(menu, { autoAlpha: 1 });
          gsap.set(footReveals, { visibility: 'visible' });
          state = 'opening';
          setFootForm(true);
          setOpenAttributes(true);
          finish();
          holdPageScroll(false);
        }, null, 0.87)
        .to(mark, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, 0.7)
        .set(footReveals, { y: FOOT_HIDDEN.y, scale: FOOT_HIDDEN.scale }, 0.87)
        .to(footReveals, { ...FOOT_RISE, stagger: rowDelay(0.18, true, footReveals) }, 0.87)
        .to(footReveals, { ...FOOT_SHOW, stagger: rowDelay(0.18, true, footReveals) }, 0.87)
        .call(() => {
          state = 'open';
          if (focusWasInside) (contactReturn && document.contains(contactReturn) ? contactReturn : mark).focus({ preventScroll: true });
        }, null, '>');
    } else {
      // Into the bar: its background and parts back as the panel arrives
      tl.set([closer, mark], { yPercent: 100, autoAlpha: 0 }, 0)
        .to(backdrop, { autoAlpha: 0, duration: 0.5, ease: 'power2.inOut' }, 0.2)
        .to(barParts, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 0.62)
        .call(() => {
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

  // ---- The route: the bar's name and the menu's current page ----
  const pathName = (path) => path.replace(/[#?].*$/, '').replace(/\.html$/, '').replace(/\/index$/, '') || '/';

  // The name written into its window: as it is, centred, when it fits;
  // wider than the window (a project's full title), running round as a
  // marquee, two copies end to end moved by one copy's width on a loop, at
  // an even reading pace, faded out at both edges (style.css). Measured
  // again when the window or the fonts change.
  const TITLE_PACE = 32; // pixels a second
  let titleText = titleInner.textContent;
  function writeTitle(text) {
    titleText = text;
    titleInner.classList.remove('is--running');
    titleInner.textContent = text;
    if (!text || reducedMotion) return;
    const style = getComputedStyle(titleInner);
    const room = titleInner.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const word = document.createElement('span');
    word.className = 'fnav__title-word';
    word.textContent = text;
    titleInner.replaceChildren(word);
    if (word.offsetWidth <= room + 0.5) {
      titleInner.textContent = text;
      return;
    }
    titleInner.classList.add('is--running');
    const track = document.createElement('span');
    track.className = 'fnav__title-track';
    const twin = word.cloneNode(true);
    track.append(word, twin);
    titleInner.replaceChildren(track);
    track.style.setProperty('--fnav-title-run', `${(word.offsetWidth / TITLE_PACE).toFixed(2)}s`);
  }
  let titleFrame = 0;
  const refitTitle = () => {
    cancelAnimationFrame(titleFrame);
    titleFrame = requestAnimationFrame(() => writeTitle(titleText));
  };
  window.addEventListener('resize', refitTitle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refitTitle);

  function setTitle(text) {
    if (titleText === text) return;
    // Out of sight: the name is simply set
    if (reducedMotion || !bar.classList.contains('is--shown')) {
      writeTitle(text);
      return;
    }
    gsap.timeline({ defaults: { overwrite: 'auto' } })
      .to(titleInner, { yPercent: -100, duration: 0.3, ease: 'power3.in' })
      .call(() => writeTitle(text))
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
  // Measured as the page will stand at rest, while it is still coming in
  // (promoPage, set by setRoute's `moving`)
  let promoPage = null;
  function readPromo() {
    const line = window.innerHeight / 2;
    let key = '';
    promoMarks.forEach((el, i) => {
      if (i > 0) {
        const r = fnavRestBox(el, promoPage);
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
    if (root.classList.contains('is--page-transition')) return;
    promoPage = null;
    readPromo();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // `moving`: the page is still coming in (arriveFloatingNavPage), so what
  // is under the middle of the screen is read as it will be at rest
  function setRoute(container, moving) {
    const page = container || document.querySelector('[data-barba="container"]');
    if (!page) return;
    setTitle(page.dataset.navTitle || page.dataset.pageName || '');
    promoMarks = [page, ...page.querySelectorAll('[data-nav-promo]')].filter((el) => el.hasAttribute('data-nav-promo'));
    if (!promoMarks.length || promoMarks[0] !== page) promoMarks.unshift(page);
    promoPage = moving || null;
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
    const was = bar.classList.contains('is--shown');
    if (!shown) close();
    bar.classList.toggle('is--shown', shown);
    bar.inert = !shown;
    syncPromo();
    // The footer's form, if the page asks for it: once the bar has risen
    // onto the page, when it is only now coming up (a reload at the foot)
    if (shown && !was) setTimeout(syncFoot, reducedMotion ? 0 : 700);
    else syncFoot();
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

  // ---- The footer's form, as the page asks ----
  // Up while the page asks for it and the bar is up, unless the contact
  // form is open (it takes the form down itself, and its close brings it
  // back) or the menu proper is (its close does the same); down as soon
  // as the page no longer asks
  function syncFoot() {
    const want = footMode && bar.classList.contains('is--shown');
    if (want && !isOpen() && contactState === 'closed') open({ foot: true });
    else if (!want && isOpen() && foot) close();
  }
  function setFootMode(on) {
    if (footMode === on) return;
    footMode = on;
    syncFoot();
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

  // ---- Controls ----
  // The whole bar opens the menu, save its home links
  bar.addEventListener('click', (event) => {
    if (event.target.closest('.fnav__logo, [data-fnav-home]')) return;
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
    // The footer's form is the page's, not something to dismiss
    if (event.key === 'Escape' && ((isOpen() && !foot) || contactOpen())) close();
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
  // Another page: the menu (either form) starts closing the moment the
  // link is pressed, quick, alongside the page transition rather than
  // before it (closeForPage). A press that opens a new tab or window
  // (a modifier, another button) leaves the menu as it is.
  menu.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const samePage = href.startsWith('/') && pathName(href) === pathName(location.pathname);
    if (samePage) {
      event.preventDefault();
      event.stopPropagation();
      // The footer's form is the page's own navigation: it stays
      if (!foot) close();
      return;
    }
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    closeForPage();
  });

  setRoute();
  window.floatingNav = { open, close, closeForPage, isOpen, setRoute, setShown, holdDown, setFootMode, openContact, closeContact };
}

// Per page: the page's name and section, the trigger that opens the
// menu in the footer's form at the foot of the page, and on the home page
// what keeps the bar down over the hero. The hero as a list (home-list.js) has
// the screen to itself until the clients' band below it is half way up
// the screen: the bar (and Contact Tom's strip with it) comes up as the
// band's top passes just above the middle of the screen going down, and goes down
// again, earlier on the way back, as the band's top passes BAND_LEAVE
// going up, with the band still on screen; so it never shows over the
// hero and never lingers once the page is heading back into it. Any other
// hero: a trigger until the hero's foot has come up past the foot of the
// screen (its last picture in, and a little more), down again once the
// page goes back up into it. A page without the hero lets it up.
const FNAV_BAND_ENTER = 0.45; // the band's top this far down the screen: the bar comes up…
const FNAV_BAND_LEAVE = 0.78; // …and, going back up, this far: it goes down

// Where an element's box will stand on the screen once its page is at
// rest: the page may still be on its way in, moved and drawn back in depth
// by the transition (transitions.js), so the box is read against the
// page's own, at the page's own size
function fnavRestBox(el, page) {
  const r = el.getBoundingClientRect();
  if (!page) return { top: r.top, bottom: r.bottom };
  const p = page.getBoundingClientRect();
  const k = page.offsetHeight / (p.height || 1);
  return { top: (r.top - p.top) * k, bottom: (r.bottom - p.top) * k };
}

// Whether the page's hero keeps the bar down where the page opens
function fnavHeroHolds(scope, page) {
  const hero = scope.querySelector('[data-home-reel]');
  const band = hero && hero.dataset.reelLayout === 'list' ? hero.nextElementSibling : null;
  if (band) return fnavRestBox(band, page).top > window.innerHeight * FNAV_BAND_ENTER;
  return !!hero && fnavRestBox(hero, page).bottom > window.innerHeight * 0.97;
}

// The new page as it comes in (transitions.js, as the pages start to
// pass): the bar goes down for it, comes up for it or takes its name now,
// each by its own animation, so all of it has settled by the time the page
// has landed. Nothing here outlives the old page's triggers; the page's
// own set-up (below) runs once it has landed, and finds the bar already
// as it should be.
function arriveFloatingNavPage(container) {
  const nav = window.floatingNav;
  if (!nav || !container) return;
  // The name is simply set while the bar is down: so going down, down
  // first; coming up, the name first, so it rises with the new one
  const hold = fnavHeroHolds(container, container);
  if (hold) nav.holdDown(true);
  nav.setRoute(container, container);
  if (!hold) nav.holdDown(false);
}

function initFloatingNavPage(container) {
  const nav = window.floatingNav;
  if (!nav) return;
  const scope = container || document;
  nav.setFootMode(false);
  nav.close({ instant: true });
  nav.setRoute(scope.matches && scope.matches('[data-barba="container"]') ? scope : null);

  const hero = scope.querySelector('[data-home-reel]');
  const HERO_END = 'bottom 97%';
  const band = hero && hero.dataset.reelLayout === 'list' ? hero.nextElementSibling : null;
  nav.holdDown(fnavHeroHolds(scope, null));
  if (band && window.ScrollTrigger && !band.__fnavHold) {
    band.__fnavHold = true;
    ScrollTrigger.create({ trigger: band, start: `top ${FNAV_BAND_ENTER * 100}%`, onEnter: () => nav.holdDown(false) });
    ScrollTrigger.create({ trigger: band, start: `top ${FNAV_BAND_LEAVE * 100}%`, onLeaveBack: () => nav.holdDown(true) });
  }
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
  // The footer's form of the menu: from the page being within a fifth of a
  // screen of its end (the footer's foot that far below the screen's), so
  // the tiles are up by the time the page has settled on its last pixel,
  // over the room the footer keeps for them (style.css, .site-footer)
  const FOOT_FORM = 0.2;
  // From where the page actually is — a reload part way down starts right
  nav.setFootMode(!!footer && footer.getBoundingClientRect().bottom <= window.innerHeight * (1 + FOOT_FORM));

  // Barba runs this on the first load as well as the page's own startup:
  // one trigger per footer
  if (footer && window.ScrollTrigger && !footer.__fnavFoot) {
    footer.__fnavFoot = true;
    ScrollTrigger.create({
      trigger: footer,
      start: `bottom bottom+=${FOOT_FORM * 100}%`,
      onEnter: () => nav.setFootMode(true),
      onLeaveBack: () => nav.setFootMode(false),
    });
  }
}

// transitions.js binds it on the first load (its afterEnter runs then too),
// before tying it to the page; this covers a page without Barba
document.addEventListener('DOMContentLoaded', () => {
  initFloatingNav();
  initFloatingNavPage();
});
