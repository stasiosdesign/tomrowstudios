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
  if (typeof initBasicFormValidation === "function") initBasicFormValidation();
  if (typeof initParallaxImageSlider === "function") initParallaxImageSlider();
  if (typeof initScrollToNextPage === "function") initScrollToNextPage();
  if (typeof initImageReveal === "function") initImageReveal(nextPage);
  if (typeof initTextHighlight === "function") initTextHighlight(nextPage);
  if (typeof initSequence === "function") initSequence(nextPage);
  if (typeof initScrollLists === "function") initScrollLists(nextPage);
  if (typeof initHomeReel === "function") initHomeReel(nextPage);
  if (typeof initHomeList === "function") initHomeList(nextPage);
  // The Influence page's hero collage, and its book band (influence.js)
  if (typeof initInfluenceHero === "function") initInfluenceHero(nextPage);
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
  /* The nav is outside the container and survives the navigation, but the
     trigger tying it to the home hero does not — `afterLeave` kills the
     page's triggers. Rebinding here restores it when we arrive on home, and
     clears the state when we arrive anywhere else. */
  if (typeof initHeroNav === "function") initHeroNav();
  /* The hero's email square, which copies the address: in the container too */
  if (typeof initSocialCopy === "function") initSocialCopy(nextPage);
  /* The floating navigation lives in the layout and is bound once; only its
     ties to the page's hero and footer are rebuilt here, with the rest of
     the page's triggers, and it takes the page's name and section. */
  if (typeof initFloatingNav === "function") initFloatingNav();
  if (typeof initFloatingNavPage === "function") initFloatingNavPage(nextPage);
  /* Same story for the hero runner: its canvas and pointer listeners go with
     the outgoing container, so it is rebuilt when we land on home and torn
     down when we land anywhere else. */
  if (typeof initHeroRunner === "function") initHeroRunner();
  if (typeof initHeroDial === "function") initHeroDial();
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
//     an open menu has closed, its own closing played through, before the
//     pages start to move (the `before` hook, below); the bar takes the new
//     page's name once the page has arrived (initFloatingNavPage);
//   - the outgoing page is held exactly as it was seen (freezeCurrentPage);
//   - the body keeps a full screen's height while it carries the
//     perspective, which makes it the frame the fixed bar is placed in, and
//     the clip and overflow are cleared from the new page with the rest.
const PAGE_DEPTH = "-25vw";
const PAGE_SHIFT = 125;
const PAGE_RADIUS = "0.6rem";

function runPageLeaveAnimation(current, next) {
  const parent = current.parentElement || document.body;

  // An open menu has closed already (the `before` hook); this only makes
  // sure of it
  if (window.floatingNav) window.floatingNav.close({ quick: true });

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

  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");

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
// the moment it is added.
let heldPage = null;
const STICKY = ".seq__stage, .home-reel__surface-inner, .home-reel__frame, .home-reel__chrome-inner, .scroll-list__stick, .scroll-list__aside, .scroll-next__inner, .atlas-modal__top";

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

  // Initial state of the next page
  gsap.set(next, {
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
    z: PAGE_DEPTH,
    autoAlpha: 1,
    clipPath: `rect(0% 100% 100% 0% round ${PAGE_RADIUS})`
  });

  return { wrapper, scrollY };
}


// -----------------------------------------
// THE PROJECTS FOLDER, OPENING INTO ARCHITECTURE
// -----------------------------------------
//
// The home hero's folder (ProjectsFolder.astro) pressed: instead of the
// pages passing each other, the folder itself opens into the Architecture
// page.
//   1. The folder is copied onto layers over both pages, exactly where it
//      stands: its card on one, under the new page, and each of its sheets
//      on another, over it.
//   2. The card grows to fill the screen, turning to the page's black; the
//      home page behind it sinks back a little.
//   3. The sheets fly, one after another, their dimming lifting, to
//      the first cards of the Architecture page — measured on the new page
//      itself, which waits unseen in place — the third on past the
//      right-hand edge with the rest of the run.
//   4. Once those cards' own photographs are in (a second and a half at
//      most), the page fades up over the card, under the sheets, which lie
//      exactly over its cards; then both layers go.
// Only from the folder (the transition's `custom` rule, below): back and
// forward, the menu and every other link keep the pages passing. With
// reduced motion the pages simply change, as everywhere.
// 1. Where everything stands, before anything moves: measured in Barba's
// first hook (`before`, below), as the outgoing page's sticky parts are,
// since the Architecture page stops the whole document scrolling the moment
// it is added and the hero's stage, which holds the folder, comes unstuck.
// The folder may be drawn smaller than its size (a waiting one in the
// reel): each sheet's border and corners are taken at the scale it is
// shown at.
let heldFolder = null;

function measureFolder(trigger) {
  const folder = trigger.querySelector("[data-folder]");
  if (!folder) return null;
  const sheets = Array.from(folder.querySelectorAll("[data-folder-sheet]"))
    .sort((a, b) => Number(a.dataset.folderSheet) - Number(b.dataset.folderSheet));
  return {
    folder,
    box: folder.getBoundingClientRect(),
    strength: parseFloat(getComputedStyle(folder).opacity) || 1,
    from: sheets.map(sheet => {
      const rect = sheet.getBoundingClientRect();
      const styles = getComputedStyle(sheet);
      const k = rect.width / (sheet.offsetWidth || rect.width);
      const img = sheet.querySelector("img");
      return {
        rect,
        padding: parseFloat(styles.paddingTop) * k,
        radius: parseFloat(styles.borderTopLeftRadius) * k,
        shadow: styles.boxShadow,
        dim: parseFloat(sheet.style.getPropertyValue("--dim")) || 0,
        src: img ? img.currentSrc || img.src : "",
      };
    }),
  };
}

function runFolderLeaveAnimation(current, next) {
  const held = heldFolder;
  heldFolder = null;
  const cardsAhead = Array.from(next.querySelectorAll(".parallax-slider__item-inner"));
  if (reducedMotion || !held || !held.from.length || !cardsAhead.length) return runPageLeaveAnimation(current, next);
  const parent = current.parentElement || document.body;
  if (window.floatingNav) window.floatingNav.close({ quick: true });

  const { folder, box, strength } = held;
  const from = held.from.slice(0, cardsAhead.length);

  const { wrapper } = prepareForTransition(parent, current, next);
  // The new page, unseen, where it will stand, over the growing card
  gsap.set(next, { yPercent: 0, z: 0, autoAlpha: 0, clipPath: "none", zIndex: 4 });
  gsap.set(wrapper, { clipPath: "none" });
  const cards = cardsAhead.slice(0, from.length);
  const to = cards.map(card => card.getBoundingClientRect());
  const cardRadius = getComputedStyle(cards[0]).borderTopLeftRadius;

  const layer = (z) => {
    const el = document.createElement("div");
    el.className = "folder-flight";
    el.style.zIndex = z;
    document.body.appendChild(el);
    return el;
  };
  const under = layer(3);
  const over = layer(200);
  folder.style.visibility = "hidden";

  const ground = folder.cloneNode(true);
  ground.querySelector(".folder__stack")?.remove();
  ground.removeAttribute("data-folder");
  ground.classList.remove("home-reel__img");
  ground.classList.add("folder-flight__ground");
  ground.style.cssText = `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;opacity:${strength};visibility:visible`;
  under.appendChild(ground);

  const veils = [];
  const flying = from.map(({ rect, padding, radius, shadow, dim, src }) => {
    const sheet = document.createElement("div");
    sheet.className = "folder-flight__sheet";
    sheet.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;padding:${padding}px;border-radius:${radius}px;box-shadow:${shadow};opacity:${strength}`;
    const img = document.createElement("img");
    img.alt = "";
    img.src = src;
    sheet.appendChild(img);
    // The dimming the sheets behind carry, lifted on the way
    const veil = document.createElement("div");
    veil.className = "folder-flight__veil";
    veil.style.opacity = dim;
    sheet.appendChild(veil);
    veils.push(veil);
    return sheet;
  });
  // The first project in front
  flying.slice().reverse().forEach(sheet => over.appendChild(sheet));

  // The cards' own photographs, before the page is shown over the sheets
  const photos = cards.map(card => card.querySelector("img")).filter(Boolean);
  const landed = Promise.race([
    Promise.all(photos.map(img => (img.complete && img.naturalWidth)
      ? (img.decode ? img.decode().catch(() => {}) : null)
      : new Promise(resolve => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }))),
    new Promise(resolve => setTimeout(resolve, 1500)),
  ]);

  const tl = gsap.timeline({
    onComplete: () => {
      under.remove();
      over.remove();
      wrapper.remove();
      document.documentElement.classList.remove("is--page-transition");
      gsap.set(parent, { clearProps: "perspective,transformStyle,overflow,minHeight" });
      gsap.set(next, { clearProps: "position,inset,width,height,zIndex,transformStyle,willChange,backfaceVisibility,transform,clipPath,overflow,opacity,visibility" });
      resetPage(next);
    },
  });

  // 2
  tl.to(ground, {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    opacity: 1,
    backgroundColor: "#000000",
    duration: 1.05,
    ease: "expo.inOut",
  }, 0);
  tl.to(wrapper, { scale: 0.94, duration: 1.05, ease: "expo.inOut" }, 0);

  // 3
  tl.to(flying, {
    left: i => to[i].left,
    top: i => to[i].top,
    width: i => to[i].width,
    height: i => to[i].height,
    padding: 0,
    borderRadius: cardRadius,
    boxShadow: "0px 0px 0px 0px rgba(0, 0, 0, 0)",
    opacity: 1,
    duration: 1.15,
    ease: "expo.inOut",
    stagger: 0.07,
  }, 0.08);
  tl.to(veils, { opacity: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.07 }, 0.2);

  // 4
  tl.addPause(">", () => landed.then(() => tl.resume()));
  tl.to(next, { autoAlpha: 1, duration: 0.45, ease: "power2.out" });

  return tl;
}


// -----------------------------------------
// BARBA HOOKS + INIT
// -----------------------------------------

// The outgoing page is measured before anything of the incoming one is in
// the document (freezeCurrentPage). Barba runs this hook once the new page
// has been fetched, and waits on it: an open floating menu (or its contact
// form) first finishes closing (floatingNav.closeForPage), since putting the
// new page in holds the main thread long enough for GSAP, without lag
// smoothing (initLenis), to skip a running close to its end. With nothing
// open, nothing waits.
barba.hooks.before(data => {
  const navClosed = window.floatingNav ? window.floatingNav.closeForPage() : Promise.resolve();
  return navClosed.then(() => {
    // The projects folder first, before the freeze changes anything
    heldFolder = data.trigger instanceof Element && data.trigger.hasAttribute("data-folder-link") ? measureFolder(data.trigger) : null;
    heldPage = data.current && data.current.container ? freezeCurrentPage(data.current.container) : null;
  });
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
    // The home hero's projects folder, opening into the Architecture page
    // (runFolderLeaveAnimation): only when the folder itself was pressed
    {
      name: "folder",
      sync: true,
      from: { namespace: ["index"] },
      to: { namespace: ["architecture"] },
      custom: ({ trigger }) => trigger instanceof Element && trigger.hasAttribute("data-folder-link"),
      async leave(data) {
        return runFolderLeaveAnimation(data.current.container, data.next.container);
      },
      async enter() {},
    },
    {
      name: "default",
      sync: true,

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
  // the browser's own, and the page eases after it more slowly
  lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 0.85,
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

function resetPage(container){
  window.scrollTo(0, 0);
  // Its position only: it runs as the page transition starts, while the
  // new page is still being moved, and the transition clears the rest
  // (its transform included) when it ends
  gsap.set(container, { clearProps: "position,top,left,right" });

  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }
}
