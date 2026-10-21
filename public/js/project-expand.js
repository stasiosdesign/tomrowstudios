// -----------------------------------------
// PROJECT EXPANSION (Architecture row → project page)
// -----------------------------------------
// Opening a project from the Architecture row, the card's picture grows out
// of its frame to fill the screen, darkening as it goes, and becomes the
// project page's own background (.project-hero__bg), the page's words
// coming up over it. It starts the moment the card is pressed, while the
// page is still being fetched: a copy of the picture is laid over the card,
// exactly where the card shows it (its frame, its drift and its zoom), and
// grows to the box the project page's background fills, the shade over it
// coming in on the way. The page transition for these links
// (transitions.js, "project-expand") waits for it, puts the new page in
// underneath (the same file, already in the cache, the same crop and shade,
// so nothing changes under the eye), takes the copy away and brings the
// words in. Any other way to a project (the browser's back and forward, a
// link elsewhere) keeps the usual transition.

const EXPAND_DURATION = 1.05;
// The words over the picture, as the page arrives
const EXPAND_REVEAL = ".shop-hero__copy, .project-hero__meta";

// The expansion under way, for the page transition to pick up
let projectExpand = null;

// The box the project page's background fills: the screen's width, and
// 100vh as the page's CSS reads it (taller than the window on a phone
// whose toolbars hide)
function expandTargetBox() {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:100vh;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const height = probe.offsetHeight || window.innerHeight;
  probe.remove();
  return { left: 0, top: 0, width: document.documentElement.clientWidth, height };
}

function startProjectExpand(link) {
  const frame = link.querySelector(".parallax-slider__item-inner");
  const img = frame && frame.querySelector("img");
  if (!img || !img.complete || !img.naturalWidth) return null;

  const from = frame.getBoundingClientRect();
  const picture = img.getBoundingClientRect();
  const to = expandTargetBox();

  // The copy: a frame where the card's is, clipping a picture where the
  // card's picture stands (wider than its frame, drifted), cut the same way
  const overlay = document.createElement("div");
  overlay.className = "project-expand";
  overlay.setAttribute("aria-hidden", "true");
  const copy = document.createElement("img");
  copy.className = "project-expand__img";
  copy.alt = "";
  copy.src = img.currentSrc || img.src;
  const shade = document.createElement("span");
  shade.className = "project-hero__shade project-expand__shade";
  overlay.append(copy, shade);
  document.body.appendChild(overlay);

  gsap.set(overlay, { left: from.left, top: from.top, width: from.width, height: from.height });
  gsap.set(copy, {
    left: picture.left - from.left,
    top: picture.top - from.top,
    width: picture.width,
    height: picture.height,
    // In black and white if the card was (not the one in colour)
    filter: getComputedStyle(img).filter === "none" ? "grayscale(0) brightness(1)" : "grayscale(1) brightness(0.62)",
  });
  gsap.set(shade, { opacity: 0 });
  // The card under the copy is left empty, so the picture has plainly
  // lifted out of it; its name goes with it
  frame.style.visibility = "hidden";
  const label = link.querySelector(".parallax-slider__item-label");
  if (label) gsap.to(label, { autoAlpha: 0, duration: 0.25, ease: "power2.out" });

  let resolveDone;
  const done = new Promise((resolve) => { resolveDone = resolve; });
  const tl = gsap.timeline({ onComplete: () => resolveDone() });
  tl.to(overlay, { left: to.left, top: to.top, width: to.width, height: to.height, duration: EXPAND_DURATION, ease: "osmo" }, 0)
    .to(copy, { left: 0, top: 0, width: to.width, height: to.height, duration: EXPAND_DURATION, ease: "osmo" }, 0)
    .to(copy, { filter: "grayscale(0) brightness(1)", duration: 0.45, ease: "power2.out" }, 0)
    .to(shade, { opacity: 1, duration: EXPAND_DURATION * 0.8, ease: "power1.inOut" }, EXPAND_DURATION * 0.2);

  projectExpand = { link, overlay, tl, done };
  return projectExpand;
}

// The card pressed in the Architecture row, as Barba would take the click:
// the main button, no key held (those open a new tab), to a project. Bound
// as this file loads, before transitions.js starts Barba, so it hears the
// click before Barba does (and a drag that ends on a card never reaches
// it: archslider.js stops that click at the row)
function bindProjectExpand() {
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest && event.target.closest(".parallax-slider__item-link");
    if (!link || !link.href || link.target === "_blank" || link.href === location.href) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || projectExpand) return;
    if (typeof barba !== "undefined" && barba.transitions && barba.transitions.isRunning) return;
    startProjectExpand(link);
  });
}

// An expansion no transition took up (another one picked the page): its
// copy goes, rather than staying over the screen
function dropProjectExpand() {
  if (!projectExpand) return;
  projectExpand.tl.kill();
  projectExpand.overlay.remove();
  projectExpand = null;
}

// The page transition's side (transitions.js). The new page is in the
// document by now, unseen (hideForProjectExpand), the row's page still
// over it: wait for the picture to fill the screen and for the new page's
// own copy of it to be ready to paint, swap the pages under the copy, take
// the copy away, bring the words in
function hideForProjectExpand(next) {
  gsap.set(next, { autoAlpha: 0 });
  gsap.set(next.querySelectorAll(EXPAND_REVEAL), { autoAlpha: 0, y: 24 });
}

async function finishProjectExpand(current, next) {
  const expand = projectExpand;
  projectExpand = null;
  const words = next.querySelectorAll(EXPAND_REVEAL);

  const bg = next.querySelector("[data-project-bg] img");
  const ready = bg && bg.decode ? Promise.race([bg.decode().catch(() => {}), new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
  await Promise.all([expand.done, ready]);

  gsap.set(current, { autoAlpha: 0 });
  gsap.set(next, { clearProps: "opacity,visibility" });
  // A frame for the page to be painted under the copy before the copy goes
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  expand.overlay.remove();
  gsap.to(words, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: "osmo", clearProps: "transform,opacity,visibility" });
}

bindProjectExpand();
