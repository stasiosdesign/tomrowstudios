// -----------------------------------------
// PAGE LIFECYCLE + ON-DEMAND SCRIPTS (shared)
// -----------------------------------------
//
// Two small utilities every page script can lean on. Loaded before them.
//
// onPageLeave(fn) — Barba swaps pages without reloading, so whatever a page
// sets up outside its own markup (a frame loop, a library instance holding
// window or document listeners, a timer, an observer) outlives the page
// unless it is taken down. A page script that starts something like that
// registers how to stop it here, as it starts it; transitions.js runs the
// list in its afterLeave hook, once the old page has gone and before the
// new one's scripts run. Listeners on the page's own elements need no
// entry: they go with the elements.
//
// loadScript(src) / loadStyle(href) — a library only one page uses is
// fetched the first time that page needs it, not on every page. Each
// returns a promise, cached per URL, so asking twice loads once.

const pageCleanups = [];

function onPageLeave(fn) {
  if (typeof fn === "function") pageCleanups.push(fn);
}

function runPageCleanups() {
  while (pageCleanups.length) {
    const fn = pageCleanups.pop();
    try {
      fn();
    } catch (error) {
      console.error(error);
    }
  }
}

const loadedAssets = new Map();

function loadScript(src) {
  if (!loadedAssets.has(src)) {
    loadedAssets.set(src, new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loadedAssets.delete(src);
        reject(new Error(`Could not load ${src}`));
      };
      document.head.appendChild(script);
    }));
  }
  return loadedAssets.get(src);
}

function loadStyle(href) {
  if (!loadedAssets.has(href)) {
    loadedAssets.set(href, new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => {
        loadedAssets.delete(href);
        reject(new Error(`Could not load ${href}`));
      };
      document.head.appendChild(link);
    }));
  }
  return loadedAssets.get(href);
}

// The libraries only one page or one feature uses, by name, for the scripts
// that need them
const VENDOR = {
  // HLS streaming for the reel's player (reel.js), the version Osmo's
  // player was built with
  hls: "https://cdn.jsdelivr.net/npm/hls.js@1.6.11/dist/hls.min.js",
  swiperJs: "https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js",
  swiperCss: "https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.css",
  draggable: "https://cdn.jsdelivr.net/npm/gsap@3.15/dist/Draggable.min.js",
  inertia: "https://cdn.jsdelivr.net/npm/gsap@3.15/dist/InertiaPlugin.min.js",
  smooothy: "https://unpkg.com/smooothy@0.0.35",
};
