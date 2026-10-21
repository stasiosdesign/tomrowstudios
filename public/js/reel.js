// -----------------------------------------
// THE REEL: the Play Reel card and its player
// -----------------------------------------
//
// The card in the floating navigation's menu (FloatingNav.astro) and the
// reel's player (ReelLightbox.astro, Osmo's Custom Bunny HLS Lightbox,
// bunny-lightbox.js), as one thing: pressing the card grows the player out
// of it while the menu closes, and closing the player takes it back.
//
// Any number of cards play the same reel ([data-reel-card], the picture
// that grows being the card's [data-reel-media], else the card itself): the
// Play Reel card in the menu, and the About card at the foot of the pages
// (ServiceCards.astro). The player grows out of whichever was pressed and
// goes back into it: the menu's card by opening the menu round it again,
// a card on the page where it stands (the page holds still meanwhile).
// Cards on a page arriving by a transition are bound then (initReelCards,
// transitions.js).
//
// The card. On a fine pointer, hovering plays the reel's moving preview,
// muted, and fades it in over its still once it is running; leaving fades
// it out, then pauses it and puts it back to its start, so it never runs
// unseen and each hover begins at the beginning (Osmo's media setup, hover
// mode). The preview is one of Bunny's MP4 renditions of the reel (reel.ts),
// the smaller (360p) wherever it still covers the card at the screen's
// density, else 480p; it gets its source on the first hover only, and the
// browser fetches no more of it than plays. On touch the card keeps its
// still. Nothing of the stream is fetched until the card is pressed;
// hls.js itself is fetched when the menu opens, where it is needed, and
// only if the browser has no HLS of its own.
//
// A card on the page previews the same way, with a source of its own on
// its video (data-reel-preview-src: the home hero's film frame, 720p,
// reel.ts, as the frame shows the film's full height).
//
// Opening, one movement:
//   - the player is opened at once, its frame held unseen (is--pending)
//     for the one frame Osmo takes to size it to the screen;
//   - then, in that same frame, the frame is set over the card exactly —
//     a transform from where the player will settle back to the card's
//     own position and size — the card is lifted out from under it, and
//     the menu starts to close;
//   - the frame grows into place on the GPU (a transform, nothing laid
//     out), the page darkening behind it on the same timeline; the
//     player's controls come in with Osmo's own fades as it lands.
// The picture the player starts from is the card's: the still, or the
// preview's frame of the moment if it was showing. Its corners go from the card's own
// radius to the player's as it grows (the frame is scaled, so the radius
// is written against the scale each frame), and back as it shrinks.
// A card on the page that shows a picture of its own (the home hero's
// portrait) grows as that picture: it fills the frame as the frame
// grows, so what was clicked is what grows, and the film takes over from
// it on the way; closing, the picture comes back over the film and lands
// as the card ("The card's picture", below).
//
// The player stands over nearly the whole screen, a small even margin
// round it (style.css), the film covering it. Its controls are Osmo's,
// with keys added while it is open: Space or K plays and pauses, the
// left and right arrows go back and on five seconds (Home and End on the
// timeline to either end), M turns the sound off and on, F goes full
// screen. The timeline is a slider for assistive technology, its value
// kept here.
//
// Closing — the close control, the backdrop, Escape, or the reel ending,
// all of them Osmo's — is the opening run back, into the card's own place:
//   - the menu opens again round the card's empty place (the card held
//     back, is--lifted), the bar narrowing to its close control as it does,
//     so where the player is going is there to see from the first frame;
//   - the player's controls and close control go at once, and the frame
//     shrinks from wherever it is, settled or still growing, to where the
//     card stands in the open menu (measured with the menu's rising offset
//     set aside, so it is where the card will be once the menu is open),
//     landing as the menu settles; the player's dark lifts while the
//     menu's backdrop comes up, so the page stays dimmed throughout;
//   - in the card's place, the card shows again under the frame and the
//     frame goes, over a few frames.
// Focus goes back to the card. Without the navigation to go back to, the
// frame shrinks onto the bar and fades there.
//
// The page holds still while the player is open (is--reel-open; Lenis
// stopped, which clips the page, and the menu's close leaves it stopped;
// the wheel, a finger and the scrolling keys are caught on the player
// too), it keeps its place, and the page and the navigation take no focus
// behind it. Reduced motion: no movement, the player is simply there and
// simply gone.

(function () {
  const navCard = document.querySelector('.fnav-reel[data-reel-card]');
  const box = document.querySelector('[data-reel-lightbox]');
  const any = navCard || document.querySelector('[data-reel-card]');
  if (!any || !box || typeof gsap === 'undefined') return;
  // The card the player is playing from, and the picture of it that grows
  let card = any;
  const mediaOf = (el) => el.querySelector('[data-reel-media]') || el;

  const player = box.querySelector('[data-bunny-lightbox-init]');
  const calc = box.querySelector('[data-bunny-lightbox-calc-height]');
  const dark = box.querySelector('.bunny-lightbox__dark');
  const closeBtn = box.querySelector('.bunny-lightbox__close');
  const placeholder = player.querySelector('[data-bunny-lightbox-placeholder]');
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

  // Every card carries the same reel
  const src = any.dataset.reelSrc || '';
  const still = any.dataset.reelPoster || '';

  if (typeof CustomEase !== 'undefined' && !gsap.parseEase('reel')) {
    // The site's own curve (--cta-ease): off the mark at once, a long settle
    CustomEase.create('reel', '0.32, 0.72, 0, 1');
  }
  const ease = gsap.parseEase('reel') ? 'reel' : 'expo.out';
  const darkLevel = () => parseFloat(getComputedStyle(box).getPropertyValue('--reel-dark')) || 0.92;

  // The frame's move, as one state: a uniform scale (k) and a shift, a
  // clip (inset l t r b, in the frame's own pixels) that shows just the part
  // of it the card showed, and the clip's corner radius as seen (rad). A
  // card of another shape than the player (the home hero's 4:5 picture) is
  // the player cropped, as the card crops the same still (its
  // object-position): the frame is scaled to cover the card and clipped to
  // it, so nothing is stretched, and opening is the crop widening as the
  // frame grows.
  const IDLE = { x: 0, y: 0, k: 1, l: 0, t: 0, r: 0, b: 0 };
  const m = { ...IDLE, rad: 0 };
  let cornerR = 0;
  function readCorners() {
    cornerR = parseFloat(getComputedStyle(player).borderTopLeftRadius) || 0;
  }
  const radiusOf = (el) => Math.max(...[el, card].map((node) => (node ? parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0 : 0)));
  function drawFrame() {
    calc.style.transform = `translate(${m.x}px, ${m.y}px) scale(${m.k})`;
    calc.style.clipPath = `inset(${m.t}px ${m.r}px ${m.b}px ${m.l}px round ${m.rad / m.k}px)`;
    drawPicture();
  }
  // The state that puts the frame (whose resting box is `rest`) over the
  // rectangle `rect`, cropped as `el` (the card's picture) crops. The frame
  // shows the still covering it, centred; the card shows the part of the
  // same still its own cover and object-position leave; so the clip is that
  // part, found in the frame (and kept inside it, where the frame's own
  // crop is the tighter).
  function frameOver(rest, rect, el) {
    let ax = 0.5;
    let ay = 0.5;
    if (el && el.tagName === 'IMG') {
      const pos = getComputedStyle(el).objectPosition.split(' ');
      const part = (v) => (v && v.endsWith('%') ? parseFloat(v) / 100 : 0.5);
      ax = part(pos[0]);
      ay = part(pos[1]);
    }
    // The still in the frame
    const ratio = placeholder.naturalWidth && placeholder.naturalHeight ? placeholder.naturalWidth / placeholder.naturalHeight : 16 / 9;
    let sw = rest.width;
    let sh = rest.width / ratio;
    if (sh < rest.height) {
      sh = rest.height;
      sw = sh * ratio;
    }
    const sx = (rest.width - sw) / 2;
    const sy = (rest.height - sh) / 2;
    // The card's part of it, in the frame's pixels, kept inside the frame
    const shape = rect.width / rect.height;
    const fw0 = shape > ratio ? sw : sh * shape;
    const fh0 = shape > ratio ? sw / shape : sh;
    let fl = sx + (sw - fw0) * ax;
    let ft = sy + (sh - fh0) * ay;
    let fw = fw0;
    let fh = fh0;
    if (fl < 0) { fw += fl; fl = 0; }
    if (ft < 0) { fh += ft; ft = 0; }
    fw = Math.min(fw, rest.width - fl);
    fh = Math.min(fh, rest.height - ft);
    // Covering the card from that part, the card's own shape cut from its middle
    const k = Math.max(rect.width / fw, rect.height / fh);
    const vw = rect.width / k;
    const vh = rect.height / k;
    const l = fl + (fw - vw) / 2;
    const t = ft + (fh - vh) / 2;
    return {
      k,
      l,
      t,
      r: rest.width - vw - l,
      b: rest.height - vh - t,
      x: rect.left - rest.left - l * k,
      y: rect.top - rest.top - t * k,
    };
  }

  // ---- The card's picture
  // A card on the page shows a picture of its own (the home hero's
  // portrait, or its preview's frame of the moment), not the film's still,
  // so the frame grows as that picture: laid over the player, it fills the
  // part of the frame on show (as a cover, at the card's own
  // object-position), so it grows with the frame from exactly where it was
  // on the card (its own box there, taller than the card as it drifts, m.p
  // 0) to the whole frame (m.p 1), the film coming through as it fades on
  // the way. Closing runs it back: the picture comes over the film and
  // lands as the card. Placed by a transform alone, nothing laid out.
  const pic = box.querySelector('[data-reel-picture]');
  const shot = { on: false, el: null, nw: 1, nh: 1, ax: 0.5, ay: 0.5, from: null, w: 0, h: 0 };
  m.p = 1;
  // What the card shows: its preview playing, else its picture; null for
  // the menu's card, which shows the still itself
  function pictureOf(el) {
    if (el === navCard || !pic) return null;
    const video = el.classList.contains('is--previewing') ? previewOf(el) : null;
    const img = mediaOf(el).querySelector('img');
    const shown = video && video.videoWidth ? video : img;
    if (!shown) return null;
    const pos = getComputedStyle(shown).objectPosition.split(' ');
    const part = (v) => (v && v.endsWith('%') ? parseFloat(v) / 100 : 0.5);
    return {
      el: shown,
      src: shown === img ? img.currentSrc || img.src : '',
      nw: shown === img ? img.naturalWidth : video.videoWidth,
      nh: shown === img ? img.naturalHeight : video.videoHeight,
      ax: part(pos[0]),
      ay: part(pos[1]),
    };
  }
  // A box on the screen in the frame's own pixels, the frame in `state`
  // over its resting box `rest`
  const inFrame = (rect, state, rest) => ({
    x: (rect.left - rest.left - state.x) / state.k,
    y: (rect.top - rest.top - state.y) / state.k,
    w: rect.width / state.k,
    h: rect.height / state.k,
  });
  // Starts the picture: `from`, its box on the card in the frame's pixels
  function showPicture(found, src, from, rest) {
    Object.assign(shot, found, { on: true, from, w: rest.width, h: rest.height });
    if (src && pic.getAttribute('src') !== src) pic.setAttribute('src', src);
    pic.style.width = `${shot.nw}px`;
    pic.style.height = `${shot.nh}px`;
    gsap.set(pic, { autoAlpha: 1 });
  }
  function hidePicture() {
    shot.on = false;
    gsap.set(pic, { clearProps: 'transform,opacity,visibility' });
  }
  function drawPicture() {
    if (!shot.on) return;
    const { from, w, h, nw, nh, ax, ay } = shot;
    const p = m.p;
    // The box it covers: from its place on the card to the part on show
    const bx = from.x + (m.l - from.x) * p;
    const by = from.y + (m.t - from.y) * p;
    const bw = from.w + (w - m.l - m.r - from.w) * p;
    const bh = from.h + (h - m.t - m.b - from.h) * p;
    const s = Math.max(bw / nw, bh / nh);
    pic.style.transform = `translate(${bx + (bw - nw * s) * ax}px, ${by + (bh - nh * s) * ay}px) scale(${s})`;
  }

  // ---- Getting ready: the player's own script (bunny-lightbox.js, kept
  // off every page until a card is hovered, focused or pressed), hls.js
  // where the browser has no HLS of its own, and the placeholder, before
  // they are needed
  let ready = null;
  function prepare() {
    if (!ready) {
      if (!placeholder.getAttribute('src')) placeholder.setAttribute('src', still);
      const probe = document.createElement('video');
      const nativeHls = !!probe.canPlayType('application/vnd.apple.mpegurl') && 'ManagedMediaSource' in window;
      const wantsHlsJs = src && !nativeHls && !window.Hls && ('MediaSource' in window || 'ManagedMediaSource' in window);
      const parts = [typeof initBunnyLightboxPlayer === 'function' ? Promise.resolve() : loadScript('/js/bunny-lightbox.js').catch(() => {})];
      if (wantsHlsJs) parts.push(loadScript(VENDOR.hls).catch(() => {}));
      ready = Promise.all(parts);
    }
    return ready;
  }
  const menu = document.querySelector('[data-fnav-menu]');
  if (menu) {
    new MutationObserver(() => { if (menu.classList.contains('is--open')) prepare(); })
      .observe(menu, { attributes: true, attributeFilter: ['class'] });
  }

  // ---- The hover preview, per card
  const previewOf = (el) => el.querySelector('[data-reel-preview-video]');
  function startPreview(el) {
    const video = previewOf(el);
    const own = video ? video.dataset.reelPreviewSrc || '' : '';
    const large = own || el.dataset.reelPreview || '';
    if (!video || !large || !fine.matches || reduced.matches || state !== 'closed') return;
    el.__reelHover = true;
    clearTimeout(el.__reelDrop);
    if (!video.getAttribute('src')) {
      const small = own ? '' : el.dataset.reelPreviewSmall || '';
      // 360p while its 640 pixels still cover the card on this screen
      video.src = small && el.offsetWidth * (window.devicePixelRatio || 1) <= 640 ? small : large;
      video.muted = true;
      video.onplaying = () => {
        if (el.__reelHover && state === 'closed') el.classList.add('is--previewing');
        else video.pause();
      };
    }
    if (!video.paused && video.readyState > 2) el.classList.add('is--previewing');
    video.play().catch(() => {});
  }
  function stopPreview(el) {
    const video = previewOf(el);
    el.__reelHover = false;
    el.classList.remove('is--previewing');
    clearTimeout(el.__reelDrop);
    if (!video) return;
    // Once faded out: paused, and back to its start for the next hover
    el.__reelDrop = setTimeout(() => {
      if (el.__reelHover) return;
      video.pause();
      if (video.readyState) video.currentTime = 0;
    }, 500);
  }
  // The preview's frame of the moment, as a picture for the player to start
  // from (the video is crossorigin, and Bunny allows the read); none if it
  // cannot be had. The frame is drawn now, before the preview stops, and
  // encoded off the main thread (toBlob, a promise), so opening the player
  // never waits on a frame-sized JPEG being written in the open's own
  // frame. One picture at a time: the last is let go as the next is made.
  let frameUrl = '';
  function previewFrame(el) {
    const video = previewOf(el);
    if (!video || video.readyState < 2 || !video.videoWidth) return Promise.resolve('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (frameUrl) URL.revokeObjectURL(frameUrl);
          frameUrl = blob ? URL.createObjectURL(blob) : '';
          resolve(frameUrl);
        }, 'image/jpeg', 0.92);
      });
    } catch (error) {
      return Promise.resolve('');
    }
  }

  // ---- Opening and closing
  let state = 'closed'; // closed | opening | open | closing
  let tl = null;
  let returnFocus = null;
  let focusInside = false;
  // The page and the navigation behind the player, inert while it is open,
  // and each given back the inertness it had. The menu is not among them:
  // it is closing, and makes itself inert
  let held = [];
  function holdBehind() {
    held = [document.querySelector('[data-barba="container"]'), document.querySelector('[data-fnav]')]
      .filter(Boolean)
      .map((el) => [el, el.inert]);
    held.forEach(([el]) => { el.inert = true; });
  }
  function releaseBehind() {
    held.forEach(([el, was]) => { el.inert = was; });
    held = [];
  }

  const rectOf = (el) => {
    const r = el && el.getBoundingClientRect();
    return r && r.width > 1 && r.height > 1 ? r : null;
  };

  async function open(el) {
    if (state !== 'closed') return;
    state = 'opening';
    card = el;
    const from = rectOf(mediaOf(card));
    const found = pictureOf(card);
    const framed = card.classList.contains('is--previewing') ? previewFrame(card) : Promise.resolve('');
    // The card is hidden under the player from the next frame: its preview stops
    stopPreview(card);
    const [frame] = await Promise.all([framed, prepare()]);
    const showing = frame || still;
    // The card's picture ready to draw before the frame moves: the
    // preview's frame if that is what it showed, else its own picture
    const picSrc = found && (found.src || frame);
    if (picSrc) {
      pic.setAttribute('src', picSrc);
      await pic.decode().catch(() => {});
    }
    if (typeof initBunnyLightboxPlayer === 'function') initBunnyLightboxPlayer();

    returnFocus = card;
    root.classList.add('is--reel-open');
    if (window.lenis) window.lenis.stop();
    holdBehind();
    box.setAttribute('aria-hidden', 'false');
    box.classList.toggle('is--no-source', !src);
    box.classList.add('is--pending', 'is--morphing');

    if (src && typeof player._openLightbox === 'function') {
      player._openLightbox(src, showing);
    } else {
      placeholder.setAttribute('src', showing);
    }
    // Open now, whichever way: Osmo opens once its placeholder is in, which
    // can be a frame or two later, and the frame must be sized this frame
    box.setAttribute('data-bunny-lightbox-status', 'active');
    if (typeof player._applyClamp === 'function') player._applyClamp();

    // Osmo sizes the frame on the next frame; this runs straight after it
    requestAnimationFrame(() => grow(from, picSrc ? found : null));
  }

  function grow(from, found) {
    const to = rectOf(calc);
    mediaOf(card).classList.add('is--lifted');
    box.classList.remove('is--pending');
    if (window.floatingNav) window.floatingNav.close();

    if (reduced.matches || !from || !to) return settleOpen();

    gsap.set(calc, { transformOrigin: '0 0', willChange: 'transform' });
    readCorners();
    Object.assign(m, frameOver(to, from, mediaOf(card)), { rad: radiusOf(mediaOf(card)), p: 0 });
    const shownAt = found && rectOf(found.el);
    if (shownAt) showPicture(found, '', inFrame(shownAt, m, to), to);
    drawFrame();
    gsap.set(dark, { opacity: 0 });
    gsap.set(closeBtn, { autoAlpha: 0 });
    tl = gsap.timeline({ onComplete: settleOpen })
      .to(m, { ...IDLE, rad: cornerR, p: 1, duration: 0.95, ease, onUpdate: drawFrame }, 0)
      .to(dark, { opacity: darkLevel(), duration: 0.75, ease: 'power2.out' }, 0)
      .to(closeBtn, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' }, 0.6);
    // The film coming through the picture as it grows, gone by the time
    // the frame is most of the way there
    if (shot.on) tl.to(pic, { autoAlpha: 0, duration: 0.45, ease: 'power1.inOut' }, 0.15);
  }

  function settleOpen() {
    state = 'open';
    tl = null;
    hidePicture();
    Object.assign(m, IDLE, { p: 1 });
    gsap.set(calc, { clearProps: 'transform,transformOrigin,willChange,clipPath' });
    gsap.set([dark, closeBtn], { clearProps: 'opacity,visibility' });
    box.classList.remove('is--morphing');
    // The player itself, not a control: Space then plays and pauses
    box.focus({ preventScroll: true });
  }

  // Osmo marks the player closed (its close control, the backdrop, Escape,
  // the reel ending); the frame then goes back into the card
  new MutationObserver(() => {
    const active = box.getAttribute('data-bunny-lightbox-status') === 'active';
    if (!active && (state === 'open' || state === 'opening')) shrink();
  }).observe(box, { attributes: true, attributeFilter: ['data-bunny-lightbox-status'] });

  // Where the card stands in the open menu: its block's rising offset (the
  // menu's reveal, a transform) set aside for the measure
  function cardHome() {
    const cell = card.closest('[data-fnav-reveal]') || card;
    const was = cell.style.transform;
    cell.style.transform = 'none';
    const rect = rectOf(card);
    cell.style.transform = was;
    return rect;
  }

  function shrink() {
    if (tl) tl.kill();
    // Settled, the frame has the player's corners; still growing, its own
    const settled = state === 'open';
    state = 'closing';
    // Noted now: the player's controls lose focus as they are hidden
    focusInside = box.contains(document.activeElement);
    box.classList.remove('is--pending');
    box.classList.add('is--closing', 'is--morphing');

    // From wherever the frame is now, settled or still growing
    const darkNow = dark.style.opacity !== '' ? parseFloat(dark.style.opacity) : darkLevel();
    gsap.set(calc, { transformOrigin: '0 0', opacity: 1, willChange: 'transform' });
    gsap.set(dark, { opacity: darkNow });
    gsap.set(closeBtn, { autoAlpha: closeBtn.style.opacity !== '' ? parseFloat(closeBtn.style.opacity) : 1 });
    // The frame held by its own state before it is measured: marked closed,
    // the player's stylesheet would otherwise shrink it (Osmo's scale(0.9))
    if (!cornerR) readCorners();
    if (settled) m.rad = cornerR;
    drawFrame();

    const now = rectOf(calc);
    // Back into the card it came from: the menu's, with the menu open again
    // round its place (the card still held back); or one on the page, where
    // it stands
    let home = null;
    if (card === navCard) {
      const nav = window.floatingNav;
      if (nav && !nav.isOpen()) nav.open();
      home = nav && nav.isOpen() ? cardHome() : null;
    } else {
      home = rectOf(mediaOf(card));
    }
    const target = home || rectOf(document.querySelector('[data-fnav]'));
    if (reduced.matches || !now || !target) return settleClose();

    // The frame's resting box, from where it is drawn now (the clip does
    // not change its box)
    const rest = { left: now.left - m.x, top: now.top - m.y, width: now.width / m.k, height: now.height / m.k };
    const landed = frameOver(rest, target, home ? mediaOf(card) : null);
    // Back into a card on the page, as its own picture: it comes over the
    // film on the way, and lands where it stands on the card
    const found = home && pictureOf(card);
    const shownAt = found && rectOf(found.el);
    if (shownAt) {
      const opacity = shot.on ? gsap.getProperty(pic, 'opacity') : 0;
      showPicture(found, found.src, inFrame(shownAt, landed, rest), rest);
      gsap.set(pic, { opacity });
    }
    // Landing as the menu settles round it
    const landing = 0.9;
    tl = gsap.timeline({ onComplete: settleClose })
      .to(m, {
        ...landed,
        rad: home ? radiusOf(mediaOf(card)) : radiusOf(document.querySelector('[data-fnav-bg]')),
        p: 0,
        duration: landing,
        ease: 'power3.inOut',
        onUpdate: drawFrame,
      }, 0)
      .to(dark, { opacity: 0, duration: 0.6, ease: 'power2.inOut' }, 0.05)
      .to(closeBtn, { autoAlpha: 0, duration: 0.2, ease: 'power1.out' }, 0);
    if (shot.on) tl.to(pic, { opacity: 1, duration: 0.45, ease: 'power1.inOut' }, 0.15);
    if (home) {
      // In the card's place: the card under it again, the frame away
      tl.call(() => mediaOf(card).classList.remove('is--lifted'), null, landing)
        .to(calc, { opacity: 0, duration: 0.18, ease: 'power1.out' }, landing);
    } else {
      tl.to(calc, { opacity: 0, duration: 0.3, ease: 'power1.in' }, landing - 0.3);
    }
  }

  function settleClose() {
    state = 'closed';
    tl = null;
    box.classList.remove('is--closing', 'is--morphing', 'is--no-source');
    hidePicture();
    Object.assign(m, IDLE, { p: 1 });
    gsap.set(calc, { clearProps: 'transform,transformOrigin,willChange,opacity,clipPath' });
    gsap.set([dark, closeBtn], { clearProps: 'opacity,visibility' });
    box.setAttribute('aria-hidden', 'true');
    mediaOf(card).classList.remove('is--lifted');
    card.classList.remove('is--previewing');
    releaseBehind();
    root.classList.remove('is--reel-open');
    const menuOpen = window.floatingNav && window.floatingNav.isOpen();
    if (window.lenis && !menuOpen && !document.querySelector('[data-panel-state="open"]')) window.lenis.start();
    if (focusInside && returnFocus) returnFocus.focus({ preventScroll: true });
    focusInside = false;
  }

  // ---- While open: the keys, the timeline's value, the page held ----
  const video = player.querySelector('video');
  const timeline = player.querySelector('[data-player-timeline]');
  const control = (name) => player.querySelector(`button[data-player-control="${name}"]`);
  const clock = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  function seekTo(sec) {
    if (!video.duration || !isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(sec, 0), Math.max(0, video.duration - 0.25));
  }
  function syncSlider() {
    const duration = isFinite(video.duration) ? video.duration : 0;
    timeline.setAttribute('aria-valuemax', String(Math.round(duration)));
    timeline.setAttribute('aria-valuenow', String(Math.round(video.currentTime || 0)));
    timeline.setAttribute('aria-valuetext', `${clock(video.currentTime)} of ${clock(duration)}`);
  }
  ['timeupdate', 'durationchange', 'seeked', 'loadedmetadata'].forEach((type) => video.addEventListener(type, syncSlider));
  // The frame takes the film's own shape once the film gives it
  video.addEventListener('loadedmetadata', () => {
    if (video.videoWidth && video.videoHeight) box.style.setProperty('--film-ratio', (video.videoWidth / video.videoHeight).toFixed(4));
  });

  document.addEventListener('keydown', (event) => {
    if (state !== 'open' || event.metaKey || event.ctrlKey || event.altKey) return;
    const onButton = event.target instanceof Element && event.target.closest('button');
    const onTimeline = event.target === timeline;
    switch (event.key) {
      case ' ':
        // A focused button answers Space itself
        if (onButton) return;
        event.preventDefault();
        control('playpause').click();
        break;
      case 'k':
      case 'K':
        control('playpause').click();
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        event.preventDefault();
        seekTo(video.currentTime + (event.key === 'ArrowLeft' ? -5 : 5));
        break;
      case 'Home':
      case 'End':
        event.preventDefault();
        if (onTimeline) seekTo(event.key === 'Home' ? 0 : video.duration);
        break;
      case 'm':
      case 'M':
        control('mute').click();
        break;
      case 'f':
      case 'F':
        control('fullscreen').click();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'PageUp':
      case 'PageDown':
        event.preventDefault();
        break;
      default:
    }
  });
  // The page under it holds still for the wheel and a finger too, whatever
  // else is listening (the timeline's drag is pointer events, unaffected)
  const hold = (event) => { if (state !== 'closed') event.preventDefault(); };
  box.addEventListener('wheel', hold, { passive: false });
  box.addEventListener('touchmove', hold, { passive: false });

  // ---- The cards: bound once each, these and any a new page brings
  function bindCard(el) {
    if (el.__reelCard) return;
    el.__reelCard = true;
    el.addEventListener('pointerenter', () => { prepare(); startPreview(el); }, { passive: true });
    el.addEventListener('pointerleave', () => stopPreview(el), { passive: true });
    el.addEventListener('focus', prepare);
    el.addEventListener('click', (event) => {
      event.preventDefault();
      open(el);
    });
  }
  window.initReelCards = (scope) => {
    (scope || document).querySelectorAll('[data-reel-card]').forEach(bindCard);
  };
  window.initReelCards(document);
})();
