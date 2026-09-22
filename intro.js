/* Home page intro.

   Runs only on a first load or refresh of the home page: transitions.js calls
   it from Barba's `once` hook, which fires once per full page load and never on
   a Barba navigation. Arriving at the home page from another page therefore
   leaves the section on `is--hidden` (display:none) and plays the usual page
   transition instead. Only index.html carries the markup, so the guard below
   makes this a no-op everywhere else. */

gsap.registerPlugin(SplitText);

/* Two eases carry the whole sequence. Anything that arrives — the wordmark,
   the hero copy, the nav — uses the same one, so every piece of type on screen
   decelerates at the same rate and the reveal reads as one movement. Anything
   that swells — the gap opening, the photograph growing to full bleed — uses
   the other, which eases into and out of the change rather than snapping
   through the middle of it. Mixing more than these two is what makes a
   sequence read as a list of separate steps. */
const WILLEM_EASE_ARRIVE = "expo.out";
const WILLEM_EASE_SWELL = "power3.inOut";

/* How long the moves in each phase run, and when each phase starts, in seconds
   from the top of the intro. Retiming the sequence means editing these two
   maps and nothing else.

   The phases overlap by design — each is under way before the one before it
   has settled, which is what keeps the intro continuous — with one exception.
   The growth is the same two elements the opening was widening, so it takes
   over at the exact moment the opening lets go: any overlap there would leave
   two tweens writing the same width on the same frame. */
const WILLEM_DURATION = {
  wordmark: 1.1,
  open: 1.15,
  crossfade: 0.55,
  grow: 1.8,
  title: 1.2,
  intro: 1,
  actions: 1.1,
  nav: 0.9
};

const WILLEM_PHASE = {
  wordmark: 0,
  open: 0.95
};

WILLEM_PHASE.grow = WILLEM_PHASE.open + WILLEM_DURATION.open;
// The copy starts arriving a second before the photograph lands
WILLEM_PHASE.reveal = WILLEM_PHASE.grow + 1;

/* Show the hero without the loading animation. Used when the home page is
   reached through a Barba navigation: the section is the page's hero either
   way, only the intro is restricted to a first load. `is--settled` puts the
   panel and cover image straight into the state the timeline ends on.

   Only ever called from the transition's `enter`, which runs on navigations
   and never on a first load, so it always acts on a freshly fetched container
   and can never touch a hero whose intro is playing. */
function settleHomeHero(scope) {
  const container = (scope || document).querySelector(".willem-header");
  if (!container) return;

  container.classList.remove("is--hidden", "is--loading");
  container.classList.add("is--settled");
}

/* The intro splits the hero copy and the nav into masked words and characters,
   each of which gets a clipping box sized to the text inside it. Webfonts land
   after the first paint and change those metrics when they do, which leaves
   the masks cut to the fallback face and clipping the real one — so wait for
   them before splitting. The race keeps a font that never resolves from
   holding the page on a blank screen. */
function whenFontsReady() {
  if (!document.fonts || !document.fonts.ready) return Promise.resolve();

  return Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 1500))
  ]);
}

async function initWillemLoadingAnimation() {

  const container = document.querySelector(".willem-header");
  if (!container) return; // not the home page

  await whenFontsReady();

  /* Everything from here down has to stay in one synchronous block. The
     section is `display:none` until `is--hidden` comes off, and SplitText
     cannot measure a hidden element — but the moment it is shown the copy is
     sitting there unanimated. Splitting and setting the start states without
     yielding means the browser never gets a frame in between. */
  container.classList.remove("is--hidden");

  const find = (selector, scope) =>
    gsap.utils.toArray((scope || container).querySelectorAll(selector));

  const splits = [];

  /* Masked pieces: SplitText wraps each word or character in its own clipping
     element, so a rise from below is revealed rather than sliding over the
     line above it.

     Words, not lines. A line split has to measure where the text wraps, and it
     freezes those breaks into the markup — so a hero split while the tab is in
     the background, or before the layout settles, keeps whatever wrap it was
     given, right down to one word per line. Words carry the same staggered
     read and wrap by themselves at any width.

     The splits are thrown away once the intro is over; the extra markup only
     exists for the animation. */
  function split(el, type) {
    if (!el) return [];

    const instance = new SplitText(el, {
      type: type,
      mask: type,
      wordsClass: "willem__split-word",
      charsClass: "willem__split-char"
    });

    splits.push(instance);
    return type === "words" ? instance.words : instance.chars;
  }

  const letters = find(".willem__letter");
  const box = find(".willem-loader__box");
  const image = find(".willem__growing-image");
  const wordmarkStart = find(".willem__h1-start");
  const wordmarkEnd = find(".willem__h1-end");
  const photos = find(".willem__cover-image-extra");
  // The hero copy: headline and standfirst rise a word at a time
  const titleWords = split(container.querySelector(".willem-hero__title"), "words");
  const introWords = split(container.querySelector(".willem-hero__intro"), "words");
  // The buttons are not type, so they rise as one block rather than splitting
  const actions = find(".actions.willem__reveal");
  // The nav is the fixed site bar, which sits outside the hero section
  const navLinks = find(".site-nav a", document);

  const tl = gsap.timeline({
    onStart: () => {
      // Hold the page at the top for the length of the intro
      window.scrollTo(0, 0);
      if (window.lenis && window.lenis.stop) window.lenis.stop();
    },
    onComplete: () => {
      // Release the height lock so the rest of the page can scroll
      container.classList.remove("is--loading");
      container.classList.add("is--settled");
      // Put the split copy back to plain text now that it has landed
      splits.forEach((instance) => instance.revert());
      if (window.lenis) {
        window.lenis.resize();
        if (window.lenis.start) window.lenis.start();
      }
    }
  });

  /* Both helpers skip a step whose target is not on the page, and both take an
     absolute time on the timeline rather than an offset from whatever was
     added last. A block the page happens to be missing therefore leaves the
     rest of the sequence exactly where it was, instead of dragging everything
     after it forward into the gap. */
  const swell = (targets, vars, at) => {
    if (!targets.length) return;
    tl.to(targets, Object.assign({ ease: WILLEM_EASE_SWELL }, vars), at);
  };

  const arrive = (targets, vars, at) => {
    if (!targets.length) return;
    tl.from(targets, Object.assign({ yPercent: 110, ease: WILLEM_EASE_ARRIVE }, vars), at);
  };

  /* 1. The wordmark sets itself, letter by letter. */
  arrive(letters, {
    duration: WILLEM_DURATION.wordmark,
    stagger: 0.03
  }, WILLEM_PHASE.wordmark);

  /* 2. A gap opens in the middle of the word and a photograph fills it. The
     two halves drift apart by the width of the gap as it appears, so the
     wordmark reads as being pushed open rather than cut.

     The CSS parks the box and the image at zero width, so these are plain
     `to`s — the start of the move lives in the stylesheet, in one place,
     rather than being restated here and drifting out of step with it. */
  swell(box, {
    width: "1em",
    duration: WILLEM_DURATION.open
  }, WILLEM_PHASE.open);

  swell(image, {
    width: "100%",
    duration: WILLEM_DURATION.open
  }, WILLEM_PHASE.open);

  swell(wordmarkStart, {
    x: "-0.05em",
    duration: WILLEM_DURATION.open
  }, WILLEM_PHASE.open);

  swell(wordmarkEnd, {
    x: "0.05em",
    duration: WILLEM_DURATION.open
  }, WILLEM_PHASE.open);

  /* 3. The photograph in the gap changes while the gap is still opening. The
     three extras are stacked over the image the hero settles on, so fading
     them out in turn runs down through the pile to it. Linear, and each fade
     as long as the gap between them: anything quicker is a cut, and a cut in
     the middle of a move that is easing is the one thing the eye catches. */
  swell(photos, {
    opacity: 0,
    duration: WILLEM_DURATION.crossfade,
    stagger: WILLEM_DURATION.crossfade,
    ease: "none"
  }, WILLEM_PHASE.open + 0.25);

  /* 4. The gap becomes the page: the photograph grows out of the wordmark to
     full bleed, and the box carrying it widens past the edge of the screen so
     nothing of the loader is left showing behind it. */
  swell(image, {
    width: "100vw",
    height: "100dvh",
    /* The image is centred on the box it grows out of, and that box sits
       between two unequal halves of the wordmark, so its centre is a few
       pixels off the viewport's. Left alone it lands with a hairline of the
       loader's pale backdrop showing down one edge. Drifting it back over the
       length of the growth is invisible and makes it land flush. */
    x: () => {
      const el = image[0];
      const rect = el.getBoundingClientRect();
      const current = parseFloat(gsap.getProperty(el, "x")) || 0;
      return current + window.innerWidth / 2 - (rect.left + rect.width / 2);
    },
    duration: WILLEM_DURATION.grow,
    /* The full-bleed image and the settled background are the same asset, so
       hand over the moment the growth lands. Waiting for the whole timeline
       would leave the loader — and its pale backdrop — on screen for another
       second while the hero copy is still revealing. */
    onComplete: () => container.classList.add("is--settled")
  }, WILLEM_PHASE.grow);

  swell(box, {
    width: "110vw",
    duration: WILLEM_DURATION.grow
  }, WILLEM_PHASE.grow);

  /* 5. The hero reveals over the last second of the growth, so the copy is
     already arriving as the photograph lands rather than waiting for it. The
     headline leads; everything after it starts a beat later and runs at a
     finer grain, which keeps one wave moving across the screen instead of
     three blocks turning up in order. */
  arrive(titleWords, {
    duration: WILLEM_DURATION.title,
    stagger: 0.035
  }, WILLEM_PHASE.reveal);

  // Small type and many more words, so it runs finer: the same gesture as the
  // headline, not a second headline
  arrive(introWords, {
    duration: WILLEM_DURATION.intro,
    stagger: 0.012
  }, WILLEM_PHASE.reveal + 0.2);

  arrive(actions, {
    duration: WILLEM_DURATION.actions,
    stagger: 0.08
  }, WILLEM_PHASE.reveal + 0.35);

  /* The nav is a few short words rather than a paragraph, so it takes the
     finest grain of all: each link's characters run in sequence, and the links
     are offset from one another so the bar fills across. */
  navLinks.forEach((link, index) => {
    arrive(split(link, "chars"), {
      duration: WILLEM_DURATION.nav,
      stagger: 0.018
    }, WILLEM_PHASE.reveal + 0.35 + index * 0.06);
  });
}
