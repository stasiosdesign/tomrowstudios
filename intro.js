/* Home page intro.

   Runs only on a first load or refresh of the home page: transitions.js calls
   it from Barba's `once` hook, which fires once per full page load and never on
   a Barba navigation. Arriving at the home page from another page therefore
   leaves the section on `is--hidden` (display:none) and plays the usual page
   transition instead. Only index.html carries the markup, so the guard below
   makes this a no-op everywhere else. */

gsap.registerPlugin(SplitText);

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

  const loadingLetter = container.querySelectorAll(".willem__letter");
  const box = container.querySelectorAll(".willem-loader__box");
  const growingImage = container.querySelectorAll(".willem__growing-image");
  const headingStart = container.querySelectorAll(".willem__h1-start");
  const headingEnd = container.querySelectorAll(".willem__h1-end");
  const coverImageExtra = container.querySelectorAll(".willem__cover-image-extra");
  // The hero copy: headline and standfirst rise a word at a time
  const titleWords = split(container.querySelector(".willem-hero__title"), "words");
  const introWords = split(container.querySelector(".willem-hero__intro"), "words");
  // The buttons are not text, so they keep the plain block reveal
  const actions = container.querySelectorAll(".actions.willem__reveal");
  // The nav is now the fixed site bar, outside the hero section
  const navLinks = document.querySelectorAll(".site-nav a");


  /* GSAP Timeline */
  const tl = gsap.timeline({
    defaults: {
      ease: "expo.inOut",
    },
    onStart: () => {
      // Hold the page at the top for the length of the intro
      window.scrollTo(0, 0);
      if (window.lenis && window.lenis.stop) window.lenis.stop();
    },
    onComplete: () => {
      // Release the height lock so the rest of the page can scroll
      container.classList.remove('is--loading');
      container.classList.add('is--settled');
      // Put the split copy back to plain text now that it has landed
      splits.forEach((instance) => instance.revert());
      if (window.lenis) {
        window.lenis.resize();
        if (window.lenis.start) window.lenis.start();
      }
    }
  });

  /* Start of Timeline */
  if (loadingLetter) {
    tl.from(loadingLetter, {
      yPercent: 100,
      stagger: 0.025,
      duration: 1.25
    });
  }

  if (box.length) {
    tl.fromTo(box, {
      width: "0em",
    },{
      width: "1em",
      duration: 1.25
    }, "< 1.25");
  }

  if (box.length) {
    tl.fromTo(growingImage, {
      width: "0%",
    },{
      width: "100%",
      duration: 1.25
    }, "<");
  }

  if (headingStart.length) {
    tl.fromTo(headingStart, {
      x: "0em",
    },{
      x: "-0.05em",
      duration: 1.25
    }, "<");
  }

  if (headingEnd.length) {
    tl.fromTo(headingEnd, {
      x: "0em",
    },{
      x: "0.05em",
      duration: 1.25
    }, "<");
  }

  if (coverImageExtra.length) {
    tl.fromTo(coverImageExtra, {
      opacity: 1,
    },{
      opacity: 0,
      duration: 0.05,
      ease: "none",
      stagger: 0.5
    }, "-=0.05");
  }

  if (growingImage.length) {
    tl.to(growingImage, {
      width: "100vw",
      height: "100dvh",
      /* The image is centred on the box it grows out of, and that box sits
         between two unequal halves of the wordmark, so its centre is a few
         pixels off the viewport's. Left alone it lands with a hairline of the
         loader's pale backdrop showing down one edge. Drifting it back over
         the same two seconds is invisible and makes it land flush. */
      x: () => {
        const el = growingImage[0];
        const box = el.getBoundingClientRect();
        const current = parseFloat(gsap.getProperty(el, "x")) || 0;
        return current + window.innerWidth / 2 - (box.left + box.width / 2);
      },
      duration: 2,
      /* The full-bleed image and the settled background are the same asset, so
         hand over the moment the growth lands. Waiting for the whole timeline
         would leave the loader — and its backdrop — on screen for another
         second while the hero copy reveals. */
      onComplete: () => {
        container.classList.add("is--settled");
      }
    }, "< 1.25");
  }

  if (box.length) {
    tl.to(box, {
      width: "110vw",
      duration: 2
    }, "<");
  }

  /* The reveal. Every piece of copy comes up out of its own mask, a line or a
     character at a time, so the hero reads as one wave rather than three
     blocks appearing at once. The headline leads, the standfirst follows a
     beat behind it, and the buttons and the nav close it off. */
  const REVEAL_START = "< 1.2";

  if (titleWords.length) {
    tl.from(titleWords, {
      yPercent: 110,
      duration: 1.3,
      ease: "expo.out",
      stagger: 0.035
    }, REVEAL_START);
  }

  /* The standfirst is small type and many more words, so it runs finer and
     faster than the headline — the same gesture, not a second headline. */
  if (introWords.length) {
    tl.from(introWords, {
      yPercent: 110,
      duration: 1,
      ease: "expo.out",
      stagger: 0.012
    }, titleWords.length ? "< 0.25" : REVEAL_START);
  }

  if (actions.length) {
    tl.from(actions, {
      yPercent: 100,
      duration: 1.1,
      ease: "expo.out",
      stagger: 0.08
    }, titleWords.length || introWords.length ? "< 0.35" : REVEAL_START);
  }

  /* The nav is one short line per link, so it takes the finer grain: each
     link's characters run in sequence, and the links themselves are offset
     from one another rather than all starting together. */
  if (navLinks.length) {
    navLinks.forEach((link, index) => {
      const chars = split(link, "chars");
      if (!chars.length) return;

      tl.from(chars, {
        yPercent: 100,
        duration: 0.9,
        ease: "expo.out",
        stagger: 0.018
      }, (index === 0 ? REVEAL_START : "< 0.06"));
    });
  }
}
