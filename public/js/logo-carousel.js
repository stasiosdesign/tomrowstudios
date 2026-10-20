// -----------------------------------------
// THE PARTNERS & COLLABS CARD'S LOGOS: Osmo's Orbit Tiles, for logos
// -----------------------------------------
//
// ServiceCards.astro, "Partners & Collabs: the orbit" in style.css. Osmo
// Supply's Orbit Tiles Infinite Loop, its markup and logic kept (the
// data-orbit-tiles-* attributes, the tiles' progress round the ring, the
// staggered step on its own "osmo" curve, depth from the ring's angle, the
// active tile marked), set to the clients' logos:
//   - no turning: Osmo's continuous rotation of the list (and the tiles'
//     counter-rotation) is left out, so the ring keeps one angle and every
//     logo stays upright and readable all the way round;
//   - the ring seen edge on along a diagonal, the Shop & Courses card's fan
//     (its pictures' step, --orbit-step-x/-y, from its middle,
//     --orbit-x/-y, all in fractions of the card): the logos come up from
//     the card's lower middle, stand in the middle, and go on towards its
//     top right corner, upright all the way;
//   - the logo at the front large, sharp and bright; the others smaller,
//     softly blurred (the blur as seen, whatever their scale), darker and
//     fainter, all of it easing with their place on the ring;
//   - the back fades out (opacity from depth), and a logo going round the
//     back, out of sight, takes the next client's logo, so with five places
//     on the ring every client comes round in turn (the card's
//     data-orbit-pool, in the logo wall's order).
// A tile's size and the diagonal are the stylesheet's (--orbit-tile,
// --orbit-x/-y, --orbit-step-x/-y); a resize draws it again.
//
// It runs while the card is on screen (Osmo's trigger) and holds still
// otherwise. Reduced motion: the ring holds still, one logo at the front.
//
// Barba: transitions.js runs it for each page as it arrives (the closing
// cards are on most pages); onPageLeave takes it down, and the page's
// triggers go with the page.

function initOrbitTiles(scope) {
  (scope || document).querySelectorAll("[data-orbit-tiles-init]").forEach((container) => {
    if (container.__orbitTiles || typeof gsap === "undefined") return;
    const list = container.querySelector("[data-orbit-tiles-list]");
    const tiles = container.querySelectorAll("[data-orbit-tiles-item]");
    const tileCount = tiles.length;
    if (!list || tileCount < 2) return;
    container.__orbitTiles = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The diagonal, from the stylesheet, in fractions of the card
    let path = { x: 0.715, y: 0.5, sx: 0.175, sy: -0.295 };
    function readPath() {
      const styles = getComputedStyle(container);
      const num = (name, fallback) => {
        const v = parseFloat(styles.getPropertyValue(name));
        return Number.isFinite(v) ? v : fallback;
      };
      path = { x: num("--orbit-x", path.x), y: num("--orbit-y", path.y), sx: num("--orbit-step-x", path.sx), sy: num("--orbit-step-y", path.sy) };
    }
    readPath();
    const minScale = 0.12;
    const minDarkness = 0.35;
    // The most blur (at the back), as seen, as a share of a logo's width
    const blurMultiplier = 0.04;
    // A place from the front: one of the fan's steps along the diagonal
    const sidePlace = Math.sin((Math.PI * 2) / tileCount);

    const moveDuration = 2.5;
    const pauseDuration = 0;
    const staggerAmount = moveDuration * 0.03;
    const ease = gsap.parseEase("osmo") ? "osmo" : "power3.inOut";

    const tileStates = Array.from(tiles, () => ({ progress: 0 }));

    // The clients' logos, and the next to come round
    let pool = [];
    try { pool = JSON.parse(container.dataset.orbitPool || "[]"); } catch (_) {}
    const images = Array.from(tiles, (tile) => tile.querySelector("img"));
    let nextLogo = pool.length ? tileCount % pool.length : 0;
    const lapOf = (index) => Math.floor((tileStates[index].progress - index) / tileCount + 0.5);
    const laps = Array.from(tiles, (_, index) => lapOf(index));
    let preloaded = false;
    function preload() {
      if (preloaded) return;
      preloaded = true;
      pool.forEach((src) => { const img = new Image(); img.src = src; });
    }

    let isActive = false;
    let stepTimeline;
    let delayedCall;
    let activeTileIndex = -1;

    function getActiveIndex() {
      return tileStates.reduce((closest, state, index) => {
        const current = Math.min(((index - state.progress) % tileCount + tileCount) % tileCount, tileCount - (((index - state.progress) % tileCount + tileCount) % tileCount));
        const previous = Math.min(((closest - tileStates[closest].progress) % tileCount + tileCount) % tileCount, tileCount - (((closest - tileStates[closest].progress) % tileCount + tileCount) % tileCount));
        return current < previous ? index : closest;
      }, 0);
    }

    function updateTileStatus() {
      const currentActiveIndex = getActiveIndex();
      if (currentActiveIndex === activeTileIndex) return;

      activeTileIndex = currentActiveIndex;

      tiles.forEach((tile, index) => {
        tile.setAttribute(
          "data-orbit-tiles-item-status",
          index === activeTileIndex ? "active" : "not-active"
        );
      });
    }

    // The card's size and a tile's, measured on a resize, never while the
    // ring turns: a read straight after the tiles are written would force
    // the browser to recompute the page's styles and layout there and then
    let size = { tile: 0, W: 0, H: 0 };
    function measure() {
      size = { tile: tiles[0].offsetWidth, W: container.offsetWidth, H: container.offsetHeight };
    }
    measure();

    function renderOrbit() {
      const { W, H } = size;
      const maxBlur = size.tile * blurMultiplier;

      updateTileStatus();

      tiles.forEach((tile, index) => {
        // Round the back, unseen: the next client's logo
        const lap = lapOf(index);
        if (lap !== laps[index]) {
          laps[index] = lap;
          if (pool.length > tileCount && images[index]) {
            images[index].src = pool[nextLogo];
            nextLogo = (nextLogo + 1) % pool.length;
          }
        }

        const angle = ((index - tileStates[index].progress) / tileCount) * Math.PI * 2;
        const depth = (Math.cos(angle) + 1) / 2;
        const adjustedDepth = Math.pow(depth, 1.3);

        const scale = gsap.utils.interpolate(minScale, 1, adjustedDepth);
        // Fainter away from the front, gone at the back (where a logo changes)
        const opacity = Math.min(1, Math.pow(adjustedDepth, 1.4));
        const brightness = gsap.utils.interpolate(minDarkness, 1, adjustedDepth);
        // Drawn before the scale, so divided by it to be seen as meant
        const blur = opacity < 0.02 ? 0 : (maxBlur * (1 - adjustedDepth)) / scale;
        // Along the diagonal: coming up from the lower middle, on to the top
        // right, the front in the middle of it
        const along = -Math.sin(angle) / sidePlace;

        gsap.set(tile, {
          x: (path.x - 0.5 + along * path.sx) * W,
          y: (path.y - 0.5 + along * path.sy) * H,
          scale,
          opacity,
          zIndex: Math.round(adjustedDepth * 1000)
        });
        // Written as it is: handed to GSAP, a filter string is parsed from
        // the tile's computed style each time, which forces the page's
        // styles and layout to be recomputed for every tile, every frame
        tile.style.filter = `blur(${blur.toFixed(2)}px) brightness(${brightness.toFixed(3)})`;
      });
    }

    function goToNextTile() {
      if (!isActive) return;
      const activeIndex = getActiveIndex();
      const orderedStates = tileStates.map((state, index) => ({ state, offset: (index - activeIndex + tileCount) % tileCount })).sort((a, b) => a.offset - b.offset);

      // The ring drawn once a frame, after every tile's progress has moved
      // (the timeline's update, not each tile's tween's)
      stepTimeline = gsap.timeline({
        paused: true,
        onUpdate: renderOrbit,
        onComplete: () => {
          if (isActive) delayedCall = gsap.delayedCall(pauseDuration, goToNextTile);
        }
      });

      orderedStates.forEach(({ state }, index) => {
        stepTimeline.to(state, {
          progress: state.progress + 1,
          duration: moveDuration,
          ease
        }, index * staggerAmount);
      });

      stepTimeline.play();
    }

    function pauseOrbit() {
      isActive = false;
      if (stepTimeline) stepTimeline.pause();
      if (delayedCall) delayedCall.pause();
    }

    function playOrbit() {
      if (reduced) return;
      preload();
      isActive = true;

      if (stepTimeline && stepTimeline.progress() < 1) {
        stepTimeline.play();
      } else {
        goToNextTile();
      }
    }

    renderOrbit();

    const resize = new ResizeObserver(() => { readPath(); measure(); renderOrbit(); });
    resize.observe(container);

    let trigger = null;
    let seen = null;
    if (window.ScrollTrigger) {
      trigger = ScrollTrigger.create({
        trigger: container,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => self.isActive ? playOrbit() : pauseOrbit()
      });
    } else {
      seen = new IntersectionObserver((entries) => (entries[entries.length - 1].isIntersecting ? playOrbit() : pauseOrbit()));
      seen.observe(container);
    }

    onPageLeave(() => {
      pauseOrbit();
      if (stepTimeline) stepTimeline.kill();
      if (delayedCall) delayedCall.kill();
      if (trigger) trigger.kill();
      if (seen) seen.disconnect();
      resize.disconnect();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => initOrbitTiles());
