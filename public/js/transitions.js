// -----------------------------------------
// PAGE TRANSITIONS (Barba + GSAP)
// -----------------------------------------

gsap.registerPlugin(CustomEase);

// The browser's own scroll restoration is off, set in the head
// (BaseLayout.astro) so a reload never restores before this file runs:
// every page opens at its top (resetPage)

let lenis = null;
let nextPage = document;
let onceFunctionsInitialized = false;

const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", e => (reducedMotion = e.matches));

const has = (s) => !!nextPage.querySelector(s);

let durationDefault = 0.6;

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });


// -----------------------------------------
// FUNCTION REGISTRY
// -----------------------------------------

function initOnceFunctions() {
  initLenis();
  // The page's scrollbar lives in the layout and reads Lenis: bound once,
  // as soon as Lenis is there (scrollbar.js)
  if (typeof initScrollbar === "function") initScrollbar();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;

  // Side panels bind themselves on DOMContentLoaded for the first page.
}

function initBeforeEnterFunctions(next) {
  nextPage = next || document;
  // The home hero's coloured mosaic, made and painted now, before the page
  // comes in, so it arrives with the page rather than seconds after it
  if (typeof prepareHeroTint === "function") prepareHeroTint(nextPage);
  // The Architecture row, built and measured now, so it comes in already
  // as it will stay (its pictures drifted, its loop round, the row never
  // hidden and shown again under the eye); what it sets up is taken down
  // when that page goes, not with the page going now (pageStartsArriving,
  // the beforeEnter hook)
  if (typeof initParallaxImageSlider === "function") initParallaxImageSlider();
  // The Influence hero's column of panels, sized as it will stand at the
  // page's top (influence.js), and the page's figures at the start of
  // their count (odometer.js): set now, so the page comes in as it will be
  // once it has landed rather than changing then; each follows the scroll
  // from the page's arrival (initAfterEnterFunctions)
  if (typeof initInfluenceStrip === "function") initInfluenceStrip(nextPage, { arriving: true });
  if (typeof initNumberOdometer === "function") initNumberOdometer(nextPage, { prepare: true });
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;

  // The incoming container carries its own panels and triggers, so rebind them
  if (typeof initSidePanels === "function") initSidePanels();
  if (typeof initCasePanels === "function") initCasePanels(nextPage);
  if (typeof initSwiperSlider === "function") initSwiperSlider();
  if (typeof initRevealParallax === "function") initRevealParallax();
  if (typeof initFooterReveal === "function") initFooterReveal(nextPage);
  if (typeof initCta === "function") initCta();
  if (typeof initSplitHover === "function") initSplitHover();
  if (typeof initMarqueeScrollDirection === "function") initMarqueeScrollDirection();
  if (typeof initNumberOdometer === "function") initNumberOdometer();
  if (typeof initStepByStepTimeline === "function") initStepByStepTimeline();
  if (typeof initProductHotspotModal === "function") initProductHotspotModal();
  if (typeof initCenteredSliders === "function") initCenteredSliders();
  if (typeof initTestimonialSwitcher === "function") initTestimonialSwitcher();
  // The Partners page's stagger, each column drifting at its own pace (partners.js)
  if (typeof initPartnerStagger === "function") initPartnerStagger(nextPage);
  if (typeof initBasicFormValidation === "function") initBasicFormValidation();
  if (typeof initParallaxImageSlider === "function") initParallaxImageSlider();
  if (typeof initScrollToNextPage === "function") initScrollToNextPage();
  if (typeof initImageReveal === "function") initImageReveal(nextPage);
  if (typeof initTextHighlight === "function") initTextHighlight(nextPage);
  // The parked home page's scroll panels (/parked, which loads sequence.js itself)
  if (typeof initSequence === "function") initSequence(nextPage);
  if (typeof initScrollLists === "function") initScrollLists(nextPage);
  if (typeof initHomeList === "function") initHomeList(nextPage);
  // The Influence page's stepped hero; and its former layout's collage,
  // column of panels (sized already, initBeforeEnterFunctions) and book
  // band, now on the Shop page (influence.js)
  if (typeof initInfluenceStage === "function") initInfluenceStage(nextPage);
  if (typeof initStatementCentre === "function") initStatementCentre(nextPage);
  if (typeof initInfluenceHero === "function") initInfluenceHero(nextPage);
  if (typeof initInfluenceStrip === "function") initInfluenceStrip(nextPage);
  if (typeof initBookBand === "function") initBookBand(nextPage);
  // The closing cards' Partners & Collabs logos, going round their ring
  if (typeof initOrbitTiles === "function") initOrbitTiles(nextPage);
  // The page's own reel cards (the About card), which open the reel's player
  if (typeof initReelCards === "function") initReelCards(nextPage);
  // The home page's opening runs on a fresh load only; arriving here by a
  // transition, its markup is taken away
  if (typeof initHomeLoader === "function") initHomeLoader(nextPage);
  /* The pointer has not moved, but what is under it has: the cursor takes
     its state from the new page */
  if (typeof refreshCursor === "function") refreshCursor();
  /* The parked home hero's bar, runner and dial (/parked, which loads
     their scripts itself: hero-nav.js, hero-runner.js, hero-dial.js). On
     every other page these are not defined. */
  if (typeof initHeroNav === "function") initHeroNav();
  if (typeof initHeroRunner === "function") initHeroRunner();
  if (typeof initHeroDial === "function") initHeroDial();
  /* The hero's email square, which copies the address: in the container too */
  if (typeof initSocialCopy === "function") initSocialCopy(nextPage);
  /* The floating navigation lives in the layout and is bound once; only its
     ties to the page's hero and footer are rebuilt here, with the rest of
     the page's triggers, and it takes the page's name and section. */
  if (typeof initFloatingNav === "function") initFloatingNav();
  if (typeof initFloatingNavPage === "function") initFloatingNavPage(nextPage);
  // Click-to-zoom binds one delegated listener on the document, so images
  // arriving with a new container are already covered — nothing to rebind.

  if (hasLenis) {
    lenis.resize();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }

  // The scrollbar's thumb, for the new page's length
  if (typeof refreshScrollbar === "function") refreshScrollbar(nextPage);
}


// -----------------------------------------
// PAGE TRANSITIONS
// -----------------------------------------

function runPageOnceAnimation(next) {
  const tl = gsap.timeline();

  tl.call(() => {
    resetPage(next);
  }, null, 0);

  revealPage(next);

  return tl;
}

// The first load is held unseen (`is--loading`, set in BaseLayout.astro)
// until the page looks as it will: every script's DOMContentLoaded set-up
// run, the fonts in, and the photographs marked data-reveal-wait loaded —
// the ones the first screen opens on. Then it fades up. Never longer than
// REVEAL_MAX_WAIT: a slow photograph can finish arriving in view.
const REVEAL_MAX_WAIT = 2500;

function revealPage(container) {
  const root = document.documentElement;
  if (!root.classList.contains("is--loading")) return;

  const domReady = document.readyState === "loading"
    ? new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }))
    : Promise.resolve();
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const imagesReady = Promise.all(
    // Only those actually shown: a photograph in a hidden part of the page (the
    // hero dial, below 992px) is never fetched, and must not hold the page
    Array.from(container.querySelectorAll("img[data-reveal-wait]")).filter(img => img.getClientRects().length).map(img =>
      img.complete ? Promise.resolve() : new Promise(resolve => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      })
    )
  );
  const timeout = new Promise(resolve => setTimeout(resolve, REVEAL_MAX_WAIT));

  Promise.race([Promise.all([domReady, fontsReady, imagesReady]), timeout]).then(() => {
    // One frame for the set-up's styles to land before the fade starts, or
    // a moment where frames are paused (a frame drawn out of sight)
    const show = () => root.classList.remove("is--loading");
    requestAnimationFrame(() => requestAnimationFrame(show));
    setTimeout(show, 100);
  });
}

// The page transition: Osmo's "Side by Side", turned on end. Both pages are
// seen at once, moving in depth: the current page is pushed back and slides
// up off the screen while the new one rises from below and comes forward,
// both rounding their corners while they move, on the off-white. Set to
// this site from Osmo's resource:
//   - vertical rather than sideways: the same movement, timing and depth,
//     the pages passing one above the other (yPercent for xPercent);
//   - the pages go back only a quarter of the perspective (PAGE_DEPTH), so
//     they shrink to about four fifths rather than to half, and travel
//     a little less far (PAGE_SHIFT, of a page's height) to suit;
//   - the off-white round the pages is the body's while it runs
//     (is--page-transition, style.css);
//   - the pages' corners round only a little as they move (PAGE_RADIUS),
//     the same on both, and square again at rest;
//   - the floating navigation is outside the container and stays as it is:
//     an open menu closes as the pages start to move, the two together
//     (the `before` hook, below); the bar goes down, comes up or takes the
//     new page's name as the pages start to pass (NAV_ARRIVES,
//     arriveFloatingNavPage), so it has settled by the time the page has;
//     the page's own ties to it are made once it has arrived
//     (initFloatingNavPage);
//   - the outgoing page is held exactly as it was seen (freezeCurrentPage);
//   - the body keeps a full screen's height while it carries the
//     perspective, which makes it the frame the fixed bar is placed in, and
//     the clip and overflow are cleared from the new page with the rest.
const PAGE_DEPTH = "-25vw";
const PAGE_SHIFT = 125;
const PAGE_RADIUS = "0.6rem";
// When the floating bar takes the new page, into the transition (seconds)
const NAV_ARRIVES = 0.35;

async function runPageLeaveAnimation(current, next) {
  const parent = current.parentElement || document.body;

  // An open menu is closing already (the `before` hook); this only makes
  // sure of it
  if (window.floatingNav) window.floatingNav.close({ quick: true });
  // The incoming page painted at its own size first (stageArrivingPage)
  if (!reducedMotion) await afterFrames(STAGE_FRAMES);

  // Helper function to prepare transition structure
  const { wrapper } = prepareForTransition(parent, current, next);

  const tl = gsap.timeline({
    onComplete: () => {
      wrapper.remove();
      document.documentElement.classList.remove("is--page-transition");
      gsap.set(parent, { clearProps: "perspective,transformStyle,overflow,minHeight" });
      gsap.set(next, { clearProps: "position,inset,width,height,zIndex,transformStyle,willChange,backfaceVisibility,transform,clipPath,overflow" });
    },
  });

  if (reducedMotion) {
    // Immediate swap behavior if user prefers reduced motion
    return tl.set(current, { autoAlpha: 0 });
  }

  tl.addLabel("start", 0);

  tl.to(wrapper, {
    z: PAGE_DEPTH,
    duration: 0.9,
    clipPath: `rect(0% 100% 100% 0% round ${PAGE_RADIUS})`
  }, "start");

  tl.to(wrapper, {
    yPercent: -PAGE_SHIFT,
    duration: 1,
    overwrite: "auto"
  }, "start+=0.25");

  tl.to(next, {
    yPercent: 0,
    duration: 1,
    overwrite: "auto"
  }, "<");

  tl.to(next, {
    z: 0,
    duration: 0.9,
    overwrite: "auto",
    clipPath: "rect(0% 100% 100% 0% round 0rem)"
  }, ">-=0.4");

  // The floating bar takes the new page as the pages start to pass, not
  // once it has landed: going down for the home hero, coming up off it, or
  // changing its name, each by its own animation, and each settled before
  // the page is (the bar's rise, the longest, with its parts in about 1.3
  // seconds, of the transition's 1.75)
  tl.call(() => {
    if (typeof arriveFloatingNavPage === "function") arriveFloatingNavPage(next);
  }, null, "start+=" + NAV_ARRIVES);

  return tl;
}

function runPageEnterAnimation(next){
  const tl = gsap.timeline();

  if (reducedMotion) {
    // Immediate swap behavior if user prefers reduced motion
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady")
    tl.call(resetPage, [next], "pageReady");
    return new Promise(resolve => tl.call(resolve, null, "pageReady"));
  }

  // Not the window's scroll here: this runs alongside the leave, which
  // holds the outgoing page where it was seen and only then takes the
  // window to the top (prepareForTransition), a couple of frames on.
  // Taken to the top now, the outgoing page would show from its top for
  // those frames, a jump the further down it was left (the footer's).
  tl.add("pageReady");
  tl.call(resetPage, [next, { keepScroll: true }], "pageReady");

  return new Promise(resolve => {
    tl.call(resolve, null, "pageReady");
  });
}

// The outgoing page, held as it was seen. Its scroll-driven effects stop
// where they are, so taking the window back to the top does not replay them;
// and anything sticky is pinned where it stands, since a page lifted out of
// the scrolling document no longer sticks. Returns the pinning, to apply
// once the page has been moved.
//
// Measured in Barba's first hook (`before`, below), before the incoming
// container is added: a page arriving can change the document under the
// one leaving — the architecture index stops the whole document scrolling
// (`html:has(.arch-page)`), which unsticks everything on the outgoing page
// the moment it is added. (.seq__stage is the parked home page's, /parked.)
let heldPage = null;
const STICKY = ".seq__stage, .influence-stage__screen, .home-reel__surface-inner, .home-reel__chrome-inner, .scroll-list__stick, .scroll-list__aside, .scroll-next__inner, .atlas-modal__top";

function freezeCurrentPage(current) {
  // Marked as leaving, for whatever watches the scroll in its own way (the
  // scroll lists' observers, scroll-list.js) to hold still too
  current.setAttribute("data-page-leaving", "");
  if (hasScrollTrigger) ScrollTrigger.getAll().forEach(trigger => trigger.disable(false));
  // The parts that stick (style.css: every `position: sticky` is on one of
  // these), checked rather than every element on the page asked
  const stuck = Array.from(current.querySelectorAll(STICKY))
    .filter(el => getComputedStyle(el).position === "sticky")
    .map(el => [el, el.getBoundingClientRect().top]);
  return () => stuck.forEach(([el, top]) => {
    el.style.position = "relative";
    el.style.top = "0px";
    el.style.top = `${top - el.getBoundingClientRect().top}px`;
  });
}

function prepareForTransition(parent, current, next){
  const pin = heldPage || freezeCurrentPage(current);
  heldPage = null;

  // Wrap current so we can move it without breaking layout/styles
  const wrapper = document.createElement("div");
  wrapper.className = "page-transition__wrapper";

  // Insert wrapper where current was, then move current into it
  parent.insertBefore(wrapper, current);
  wrapper.appendChild(current);

  // Store scroll to visually "freeze" current in-place
  const scrollY = window.scrollY || 0;
  window.scrollTo(0, 0);

  // The off-white behind the pages
  document.documentElement.classList.add("is--page-transition");

  // Base 3D setup
  gsap.set(parent, {
    perspective: "100vw",
    transformStyle: "preserve-3d",
    overflow: "clip",
    minHeight: "100vh",
  });

  gsap.set(wrapper, {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "100vh",
    overflow: "clip",
    zIndex: 2,
    transformStyle: "preserve-3d",
    willChange: "transform",
    clipPath: "rect(0% 100% 100% 0% round 0rem)"
  });

  // Keep the current page visually aligned with where it was scrolled
  gsap.set(current, {
    position: "absolute",
    top: -scrollY,
    left: 0,
    width: "100%",
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
  });
  pin();

  // Initial state of the next page: staged already (stageArrivingPage), now
  // drawn back in depth
  gsap.set(next, { ...ARRIVING_PAGE, z: PAGE_DEPTH });

  return { wrapper, scrollY };
}

// The incoming page, below the screen, on its own layer at its full size
// for a moment before it is drawn back in depth (the `beforeEnter` of the
// default transition, then the leave waits out STAGE_FRAMES). The browser
// rasterises a layer marked will-change at the scale it first has and keeps
// that while it moves: first seen drawn back, at four fifths, the page
// would be painted at that size and enlarged as it came forward, its
// hairlines (the Influence map's) and its type softer and dimmer all the
// way in, and sharp again only once the transition had cleared it. Painted
// at its own size and then reduced, it comes in looking as it will at rest.
const ARRIVING_PAGE = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  width: "100%",
  height: "100vh",
  overflow: "clip",
  zIndex: 1,
  transformStyle: "preserve-3d",
  willChange: "transform, opacity",
  backfaceVisibility: "hidden",
  yPercent: PAGE_SHIFT,
  autoAlpha: 1,
  clipPath: `rect(0% 100% 100% 0% round ${PAGE_RADIUS})`
};
const STAGE_FRAMES = 2;

function stageArrivingPage(next) {
  if (reducedMotion) return;
  gsap.set(next, { ...ARRIVING_PAGE, z: 0 });
}

// A few frames drawn, or a moment if frames are paused (a page out of sight)
function afterFrames(count) {
  return new Promise(resolve => {
    const tick = () => (--count <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
    setTimeout(resolve, 100);
  });
}


// -----------------------------------------
// BARBA HOOKS + INIT
// -----------------------------------------

// The outgoing page is measured before anything of the incoming one is in
// the document (freezeCurrentPage). Barba runs this hook once the new page
// has been fetched. An open floating menu (or its contact form) closes
// alongside the transition, not before it (floatingNav.closeForPage; it
// usually began as the link was pressed). Putting the new page in holds the
// main thread for a moment, and GSAP runs without lag smoothing (initLenis,
// for Lenis and ScrollTrigger's sake), so it would jump every running tween
// over that moment, the closing menu's and the pages' own included. So for
// the length of a transition the stall is smoothed instead (a frame longer
// than TRANSITION_LAG counts as one ordinary frame), and once the new page
// has settled (the `after` hook) lag smoothing is off again.
const TRANSITION_LAG = 120;
barba.hooks.before(data => {
  gsap.ticker.lagSmoothing(TRANSITION_LAG, 16);
  if (window.floatingNav) window.floatingNav.closeForPage();
  heldPage = data.current && data.current.container ? freezeCurrentPage(data.current.container) : null;
});
barba.hooks.after(() => {
  gsap.ticker.lagSmoothing(0);
});

barba.hooks.beforeEnter(data => {
  // Position new container on top
  gsap.set(data.next.container, {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
  });

  if (lenis && typeof lenis.stop === "function") {
    lenis.stop();
  }

  // A page going as this one comes: what this one sets up from here is
  // kept apart from its cleanups (lifecycle.js)
  if (data.current && data.current.container && typeof pageStartsArriving === "function") pageStartsArriving();
  initBeforeEnterFunctions(data.next.container);
});

barba.hooks.afterLeave(() => {
  // Whatever the outgoing page set up beyond its own markup (lifecycle.js)
  if (typeof runPageCleanups === "function") runPageCleanups();
  // The outgoing container took its triggers with it
  if (hasScrollTrigger) {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }
});

barba.hooks.afterEnter(data => {
  // Run page functions
  initAfterEnterFunctions(data.next.container);

  // Settle
  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }
});

// Barba fetches the next page over HTTP, which the file:// protocol blocks.
// Opening a page straight from disk falls back to normal navigation.
if (location.protocol === "file:") {
  initOnceFunctions();
  revealPage(document);
} else {
barba.init({
  debug: false,
  timeout: 7000,
  preventRunning: true,
  transitions: [
    {
      name: "default",
      sync: true,

      beforeEnter(data) {
        stageArrivingPage(data.next.container);
      },

      // First load
      async once(data) {
        initOnceFunctions();

        return runPageOnceAnimation(data.next.container);
      },

      // Current page leaves
      async leave(data) {
        return runPageLeaveAnimation(data.current.container, data.next.container);
      },

      // New page enters
      async enter(data) {
        return runPageEnterAnimation(data.next.container);
      }
    }
  ],
});
}


// -----------------------------------------
// GENERIC + HELPERS
// -----------------------------------------

function initLenis() {
  if (lenis) return; // already created
  if (!hasLenis) return;

  // A deliberate pace: each wheel step carries the page a little less than
  // the browser's own, and the page eases after it more slowly, with a
  // little weight (a lower lerp: it glides a touch longer, still answering
  // the hand at once)
  lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.8,
  });

  // The side panels need to pause page scrolling while they are open
  window.lenis = lenis;

  if (hasScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
  }

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

// `keepScroll`: the transition takes the window to the top itself, once the
// outgoing page is held (prepareForTransition)
function resetPage(container, { keepScroll = false } = {}){
  if (!keepScroll) window.scrollTo(0, 0);
  // Its position only: it runs as the page transition starts, while the
  // new page is still being moved, and the transition clears the rest
  // (its transform included) when it ends
  gsap.set(container, { clearProps: "position,top,left,right" });

  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }
}
