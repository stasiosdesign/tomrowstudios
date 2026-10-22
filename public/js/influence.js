// -----------------------------------------
// THE INFLUENCE PAGE: its stepped hero; and its former layout's collage
// in parallax, column of panels and book strip growing into the book band
// (InfluenceStory.astro, now on the Shop page)
// -----------------------------------------
//
// influence.astro and InfluenceStory.astro; "Influence: the stepped hero",
// "Influence: the hero" and "The book band" in style.css.
//
// The stepped hero (initInfluenceStage): nothing holds the page. The stage
// is a screen tall and a spread more (--stage-spread, style.css) and
// scrolls as any section does; its screen is held to the screen by the
// browser itself (sticky) while that spread scrolls by, and over exactly
// that distance the four photographs spread from the stepped composition
// into four even columns of the screen's full height, all together, each
// box growing to show more of its picture, which keeps its size; the moment
// they are spread, the stage goes on up with the page (no held stretch with
// nothing moving, which read as a pause). All of it is drawn by the stylesheet from one number, --p (0 to 1),
// which is all the script writes: straight from the scroll position, every
// frame the page moves, with no easing or smoothing of its own, so the
// stage is where the scroll puts it, either way and at any speed, the
// site's smooth scrolling (Lenis) as on every page. The name is part of
// the page and scrolls away with it.
//
// The hero (initInfluenceHero): each photograph's frame stays where it is
// placed; the picture in it is moved up by its frame's speed (data-speed)
// times a tenth of the distance the page has scrolled through the hero, so
// a speed of 4 goes up past one of 1, and a negative one drifts down
// against the page (after ESE's "Discover our history", whose frames carry
// the same speeds). One timeline scrubbed by the scroll, a transform each,
// from the hero's top at the screen's top to its foot there.
//
// The book band (initBookBand): the book's strip over the floating bar
// (FloatingNav.astro) grows into the band at the head of the book section
// as the band comes up the screen. Over the last stretch before the band's
// foot reaches the strip's foot (nearly half a screen), the strip widens
// from the bar's width to the page's, grows from its own height to the
// band's and its words to the band's size (--promo-w, --promo-h,
// --promo-scale; --promo-k, how far it has gone, for its corners and its
// nudge onto the grid), eased in and out, its foot where it always is.
// Then the two are one, the same size in the same place, and the strip
// hands over to the band (is--docked on both), which goes on up with the
// page; its words are set to where the strip's had got to, so nothing
// moves. From there on down the page the book is the band's: the strip
// stays handed over, never coming back over the bar, however far the page
// goes (the bar's other strips, Contact Tom's, are their own and answer to
// the page as ever). Only going back up past the point where they became
// one does the band hand back to the strip, which shrinks back to the
// bar's width the same way. The bar itself is left alone throughout.
// Measured once and on each refresh (a resize), nothing measured on
// scroll; the strip is put back as it was when the page is left.
//
// Barba runs these on the first load and on each arrival (transitions.js);
// the column of panels is sized before then, while the page is still
// coming in, so it arrives as it will stay. The page's triggers go with
// it when it is left. Reduced motion: the collage holds still, and the
// strip and the band are each simply there.

const INFLUENCE_TRAVEL = 0.1; // of the hero's height scrolled, per unit of speed

function initInfluenceStage(scope) {
  const stage = (scope || document).querySelector('[data-influence-stage]');
  if (!stage || stage.__stage || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  stage.__stage = true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  // The one number the stylesheet draws the stage from (--p), written only
  // when it changes
  const screen = stage.querySelector('[data-stage-screen]');
  if (!screen) return;
  let shown = -1;
  const draw = (progress) => {
    const p = Math.round(progress * 10000) / 10000;
    if (p === shown) return;
    shown = p;
    screen.style.setProperty('--p', p);
  };

  // From the stage's top at the screen's top to the moment its screen stops
  // being held (the stage's height less the screen's, --stage-spread in
  // style.css, measured on each refresh): the four are spread just as the
  // screen goes on up with the page, so there is no stretch of scrolling
  // where nothing moves. A reading of the scroll, nothing more
  ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: () => `+=${Math.max(1, stage.offsetHeight - screen.offsetHeight)}`,
    invalidateOnRefresh: true,
    onUpdate: (self) => draw(self.progress),
    onRefresh: (self) => draw(self.progress),
  });
}

function initInfluenceHero(scope) {
  const hero = (scope || document).querySelector('[data-influence-hero]');
  if (!hero || hero.__parallax || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  hero.__parallax = true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  const tl = gsap.timeline({
    // From the collage's top coming in at the foot of the screen (it is
    // the section under the page's hero) to its foot leaving at the top
    scrollTrigger: { trigger: hero, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
  hero.querySelectorAll('[data-speed]').forEach((shot) => {
    const img = shot.querySelector('img');
    const speed = Number(shot.dataset.speed) || 0;
    if (!img || !speed) return;
    tl.fromTo(img, { y: 0 }, { y: () => -speed * INFLUENCE_TRAVEL * hero.offsetHeight, ease: 'none', force3D: true }, 0);
  });
}

function initBookBand(scope) {
  const band = (scope || document).querySelector('[data-book-band]');
  const strip = document.querySelector('[data-fnav-promo="book"]');
  if (!band || !strip || band.__bookBand || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  band.__bookBand = true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  band.classList.add('is--morph');
  const stripTrack = strip.querySelector('.fnav-promo__track');
  const bandTrack = band.querySelector('.fnav-promo__track');
  const ease = gsap.parseEase('power2.inOut');
  const lerp = (a, b, t) => a + (b - a) * t;
  const PROPS = ['--promo-w', '--promo-h', '--promo-scale', '--promo-k'];

  // The strip at rest and the band, measured with the strip put back to rest
  let m = null;
  function measure() {
    PROPS.forEach((prop) => strip.style.removeProperty(prop));
    const style = getComputedStyle(strip);
    m = {
      w0: parseFloat(style.width),
      h0: parseFloat(style.height),
      w1: document.documentElement.clientWidth,
      h1: band.offsetHeight,
      s1: parseFloat(getComputedStyle(band).getPropertyValue('--promo-scale')) || 1,
      // The strip's foot, from the screen's top: where the band hands over
      line: window.innerHeight - parseFloat(style.bottom),
    };
  }

  const clearSize = () => PROPS.forEach((prop) => strip.style.removeProperty(prop));
  function setSize(k) {
    strip.style.setProperty('--promo-k', k.toFixed(4));
    strip.style.setProperty('--promo-w', `${lerp(m.w0, m.w1, k).toFixed(2)}px`);
    strip.style.setProperty('--promo-h', `${lerp(m.h0, m.h1, k).toFixed(2)}px`);
    strip.style.setProperty('--promo-scale', lerp(1, m.s1, k).toFixed(4));
  }
  // A change to the strip's state made at once, without its coming and
  // going (the bar's, style.css), which would hold it unseen a moment
  function instantly(change) {
    strip.style.transition = 'none';
    change();
    void strip.offsetWidth;
    strip.style.transition = '';
  }
  // The marquee taken up where the other one is
  function syncTrack(from, to) {
    const a = from && from.getAnimations()[0];
    const b = to && to.getAnimations()[0];
    if (a && b && a.currentTime !== null) b.currentTime = a.currentTime;
  }

  // The two stretches of the page: above the point where the band reaches
  // the strip (the strip growing, or at rest over the bar), and from that
  // point on down (docked: the band has the book, the strip stays gone)
  let docked = false;
  function dock(on) {
    if (on === docked) return;
    docked = on;
    if (on) {
      setSize(1);
      syncTrack(stripTrack, bandTrack);
      strip.classList.add('is--docked');
    } else {
      syncTrack(bandTrack, stripTrack);
      instantly(() => strip.classList.remove('is--docked'));
    }
    band.classList.toggle('is--docked', on);
  }
  function apply(progress) {
    if (!m) return;
    if (progress >= 1) {
      dock(true);
      return;
    }
    if (progress <= 0) clearSize();
    else setSize(ease(progress));
    dock(false);
  }

  // Past its end (the band on up the page and off it) the trigger holds at
  // 1, so the strip stays docked
  ScrollTrigger.create({
    trigger: band,
    // The band's foot nearly half a screen below the strip's, to on it
    start: () => {
      measure();
      return `bottom ${m.line + window.innerHeight * 0.45}px`;
    },
    end: () => `bottom ${m.line}px`,
    onUpdate: (self) => apply(self.progress),
    onRefresh: (self) => apply(self.progress),
  });

  if (typeof onPageLeave === 'function') {
    onPageLeave(() => {
      clearSize();
      strip.classList.remove('is--docked');
    });
  }
}

// The hero's column of panels (initInfluenceStrip): the panel whose
// place is on the focus line is the large one. The line is where the
// second panel's middle stands on arrival (style.css sets the column's top
// for that, a little under the screen's middle), so that one is the large
// one at first; on a phone, where the column follows the words, the
// screen's middle. Each panel's middle is measured once with all of them
// small (and again on a resize); on scroll, each takes its share of the
// large size by how near that middle is to the line, falling to nothing a
// panel's pitch away, so the one coming in grows as the one going out
// shrinks and the two always share one panel's growth: the column keeps
// its length, and nothing is measured while it scrolls. Each panel's size
// (--t) then glides to that share rather than jumping with the scroll,
// closing a set part of the way each moment (EASE_RATE), so a quick
// scroll or a wheel's step still reads as one soft hand-over; the panels
// all glide at the same rate, so their shares still add up to one panel's
// growth as they go. Placed at once on arrival and on a resize; with
// reduced motion, no glide.
//
// `arriving`: the page is still coming in (transitions.js, beforeEnter), so
// the panels are measured against the page's own box, as they will stand
// once it has landed at its top, and sized now, while it is unseen; once
// it has landed (the call without it) they are measured again where they
// are, which changes nothing, and from then on follow the scroll.
function initInfluenceStrip(scope, { arriving = false } = {}) {
  const strip = (scope || document).querySelector('[data-influence-strip]');
  if (!strip) return;
  if (strip.__strip) {
    if (!arriving) strip.__strip();
    return;
  }
  const items = Array.from(strip.querySelectorAll('[data-strip-item]'));
  if (!items.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE_RATE = 7; // the share of the way left closed each second, as a rate (about 0.11 a frame at 60fps)
  const page = strip.closest('[data-barba="container"]') || document.body;
  const hero = strip.offsetParent || page;
  let landed = !arriving;
  let middles = [];
  let pitch = 1;
  let focus = 0; // the focus line, from the screen's top
  let pageTop = 0; // the page's top, down the document
  let targets = items.map(() => 0);
  let shown = items.map(() => 0);
  let frame = 0;
  let last = 0;

  // Each panel's middle, down the page, with all of them small. Read
  // against the page's box at the page's own size: while it is coming in,
  // the transition moves it and draws it back in depth.
  function measure() {
    items.forEach((item) => item.style.setProperty('--t', '0'));
    const box = page.getBoundingClientRect();
    const k = page.offsetHeight / (box.height || 1);
    const down = (r) => (r.top - box.top) * k;
    pageTop = landed ? box.top + window.scrollY : 0;
    middles = items.map((item) => {
      const r = item.getBoundingClientRect();
      return down(r) + (r.height * k) / 2;
    });
    pitch = middles.length > 1 ? middles[1] - middles[0] : items[0].offsetHeight || 1;
    const placed = getComputedStyle(strip).position === 'absolute' && middles.length > 1;
    focus = placed ? middles[1] - down(hero.getBoundingClientRect()) : window.innerHeight / 2;
    aim();
    shown = targets.slice();
    draw();
  }
  // Where each panel is going: its share of the growth at this scroll (the
  // page at its top while it is still coming in). The last one, once
  // reached, stays large however far on the page goes.
  function aim() {
    const middle = (landed ? window.scrollY - pageTop : 0) + focus;
    const end = middles.length - 1;
    targets = middles.map((m, i) => {
      if (i === end && middle >= m) return 1;
      const near = Math.max(0, 1 - Math.abs(m - middle) / pitch);
      // Eased in and out; the two sharing the growth still add up to one
      return near * near * (3 - 2 * near);
    });
  }
  function draw() {
    items.forEach((item, i) => item.style.setProperty('--t', shown[i].toFixed(4)));
  }
  // One moment of the glide; on until every panel has arrived
  function step(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    last = now;
    const k = 1 - Math.exp(-EASE_RATE * dt);
    let moving = false;
    shown = shown.map((s, i) => {
      const gap = targets[i] - s;
      if (Math.abs(gap) < 0.0005) return targets[i];
      moving = true;
      return s + gap * k;
    });
    draw();
    frame = moving ? requestAnimationFrame(step) : 0;
    if (!moving) last = 0;
  }
  const onScroll = () => {
    aim();
    if (reduced) {
      shown = targets.slice();
      draw();
      return;
    }
    if (!frame) frame = requestAnimationFrame(step);
  };

  // Following the scroll from the moment the page has landed
  let bound = false;
  function land() {
    landed = true;
    measure();
    if (bound) return;
    bound = true;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    // The fonts can move the hero, so once more when they are ready
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    if (typeof onPageLeave === 'function') {
      onPageLeave(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', measure);
        if (frame) cancelAnimationFrame(frame);
      });
    }
  }
  strip.__strip = land;
  if (landed) land();
  else measure();
}

// The approach (StatementBlock.astro, `centred`): its block centred in its
// section, the text in it still set from the left. A wrapped block runs the
// full width whatever its lines do, so its ragged right left it sitting to
// the left; here its lines are measured (their left and right ends, the
// indent included) and the block moved over by the difference between
// their middle and the section's (--statement-shift, style.css), its width,
// indent and line breaks untouched. Measured now, once the fonts are in and
// whenever the block changes size.
function initStatementCentre(scope) {
  (scope || document).querySelectorAll('.statement-block.is--centred').forEach((block) => {
    const text = block.querySelector('.statement-block__text');
    if (!text || text.__centred) return;
    text.__centred = true;
    const measure = () => {
      const range = document.createRange();
      range.selectNodeContents(text);
      const lines = Array.from(range.getClientRects()).filter((r) => r.width > 0);
      if (!lines.length) return;
      // On the screen, where the page may be drawn smaller (arriving, or
      // shrinking into the footer): measured there, given in its own px
      const box = block.getBoundingClientRect();
      if (!box.width) return;
      const k = block.offsetWidth / box.width;
      const shift = (parseFloat(getComputedStyle(text).getPropertyValue('--statement-shift')) || 0) / k;
      const left = Math.min(...lines.map((r) => r.left)) - shift;
      const right = Math.max(...lines.map((r) => r.right)) - shift;
      const styles = getComputedStyle(block);
      const middle = box.left + (parseFloat(styles.paddingLeft) + (block.offsetWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight)) / 2) / k;
      text.style.setProperty('--statement-shift', `${Math.round((middle - (left + right) / 2) * k)}px`);
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(block);
      if (typeof onPageLeave === 'function') onPageLeave(() => observer.disconnect());
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initStatementCentre();
  initInfluenceStage();
  initInfluenceHero();
  initInfluenceStrip();
  initBookBand();
});
