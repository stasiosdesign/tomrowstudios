// -----------------------------------------
// THE INFLUENCE PAGE: its stepped hero; and from its former layout, the
// collage in parallax, the column of panels (now the Partners page's
// outcomes) and the book strip growing into the book band
// -----------------------------------------
//
// influence.astro and partner.astro; "Influence: the stepped hero",
// "Influence: the hero" and "The book band" in style.css.
//
// The stepped hero (initInfluenceStage): nothing holds the page. The stage
// is a screen tall and its sequence's scroll more (--stage-open,
// --stage-run, style.css) and scrolls as any section does; its screen is
// held to the screen by the browser itself (sticky) while that scrolls by,
// and over exactly that distance the left photograph takes over the
// screen, pushing the other three aside, and the four run by as a gallery,
// a screen each, every box only showing more or less of a picture that
// holds still; the moment the fourth is full-screen, the stage goes on up
// with the page. All of it is drawn by the stylesheet from two numbers,
// --u and --h, which are all the script writes: from the scroll position,
// every frame the page moves, along fixed curves of the scroll (no timing
// or smoothing of its own), so the stage is where the scroll puts it,
// either way and at any speed, the site's smooth scrolling (Lenis) as on
// every page. The name is part of the page and scrolls away with it.
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

  // The numbers the stylesheet draws the stage from, each written only
  // when it changes: --v, the four growing up to the screen's full height
  // together; --u, the widening, the left picture taking over the screen
  // and pushing the others aside, which sets off with the growth but
  // barely, and gathers pace as the growth comes to rest (widen); --d, the
  // pictures dimming, from none to their full-screen depth over the whole
  // opening, so slowly it is hardly seen (settle); --h, the run across the
  // four, a screen a picture. Each follows the scroll directly, along a
  // curve that starts and ends at rest (the growth and the run running at
  // one even speed between, glide):
  // the opening sets off from the page's stop and comes to rest full-screen,
  // so the strip turns from being pushed right to running left with no
  // jolt; the run sets off from there, crosses the pictures at one speed,
  // held at none, and comes to rest on the fourth as the page goes on. The
  // same scroll gives the same frame either way, nothing timed, nothing
  // snapped
  const screen = stage.querySelector('[data-stage-screen]');
  if (!screen) return;
  const PICTURES = screen.querySelectorAll('.influence-stage__panel').length || 4;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  // Even speed between a start and an end each eased over `a` of the way
  // (the speed rising and falling in straight lines, so it never jumps)
  const glide = (t, a) => {
    t = clamp(t);
    const top = 1 / (1 - a);
    if (t < a) return (0.5 * top * t * t) / a;
    if (t > 1 - a) return 1 - (0.5 * top * (1 - t) * (1 - t)) / a;
    return top * (t - a / 2);
  };
  // The growth up over the opening's first GROW_TO
  const GROW_TO = 0.55;
  // The widening over the whole opening: a half cosine over t to the
  // WIDEN_CURVE, so it sets off at rest and slowly (a little while the
  // four are growing up, as much as keeps the right one still in view
  // when they reach the screen's full height), gathers pace in an ever
  // steeper rise, and eases to rest full-screen
  const WIDEN_CURVE = 2.2;
  const widen = (t) => (1 - Math.cos(Math.PI * Math.pow(clamp(t), WIDEN_CURVE))) / 2;
  // An even half cosine: at rest at both ends, never quick
  const settle = (t) => (1 - Math.cos(Math.PI * clamp(t))) / 2;
  const RUN_EASE = 0.18;
  // The stretches' shares of the held scroll, from the stylesheet's own
  // lengths (--stage-open, --stage-run, in svh), read on each refresh
  let parts = { open: 1, run: 0 };
  const readParts = () => {
    const style = getComputedStyle(stage);
    const length = (name) => Math.max(0, parseFloat(style.getPropertyValue(name)) || 0);
    const open = length('--stage-open') || 1;
    const run = length('--stage-run');
    parts = { open: open / (open + run), run: run / (open + run) };
  };
  // ---- The gallery's words (influence.astro, .influence-stage__caption):
  // the set over the picture nearest the screen's middle, once the first
  // picture is well on its way to full-screen (CAPTION_FROM of the
  // opening) and while the nearest is within CAPTION_SPAN of a screen of
  // its place, so the words come as their picture comes on rather than
  // once it has settled; between two, none. The name fades in and out
  // whole; the line is split into lines, in masks, which rise into them
  // one after another, quickly, and rise out of them going, so passing
  // from one picture to the next the old words leave before the new come.
  // Played when the scroll crosses those points, either way, never held
  // or eased towards
  const CAPTION_FROM = 0.6;
  const CAPTION_SPAN = 0.4;
  const captions = Array.from(screen.querySelectorAll('[data-stage-caption]'));
  const split = typeof SplitText !== 'undefined';
  if (split) gsap.registerPlugin(SplitText);
  // Split again when the type's measure changes (autoSplit), each line
  // put where its set stands (in place if lit, waiting below if not)
  let lit = -1;
  let sets = [];
  sets = captions.map((el) => {
    // The name with its link fades as one
    const title = el.querySelector('.influence-stage__caption-head');
    const text = el.querySelector('.influence-stage__caption-text');
    const set = { el, title, lines: [] };
    if (title) gsap.set(title, { autoAlpha: 0 });
    if (split && text) {
      SplitText.create(text, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'influence-stage__line',
        autoSplit: true,
        onSplit(self) {
          set.lines = self.lines;
          gsap.set(self.lines, { yPercent: sets[lit] === set ? 0 : 110 });
        },
      });
    }
    return set;
  });
  function caption(k, between) {
    const next = between ? -1 : k;
    if (next === lit) return;
    const was = sets[lit];
    lit = next;
    if (was) {
      const gone = () => { if (sets[lit] !== was) was.el.classList.remove('is--shown'); };
      if (was.title) gsap.to(was.title, { autoAlpha: 0, duration: 0.3, ease: 'power1.in', overwrite: true });
      if (was.lines.length) gsap.to(was.lines, { yPercent: -110, duration: 0.28, ease: 'power2.in', stagger: 0.015, overwrite: true, onComplete: gone });
      else gsap.delayedCall(0.3, gone);
    }
    const now = sets[next];
    if (!now) return;
    now.el.classList.add('is--shown');
    const delay = was ? 0.12 : 0;
    if (now.title) gsap.to(now.title, { autoAlpha: 1, duration: 0.6, ease: 'power1.out', delay, overwrite: true });
    if (now.lines.length) {
      gsap.fromTo(now.lines, { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: 'expo.out', stagger: 0.035, delay, overwrite: true });
    }
  }

  const shown = { v: -1, u: -1, d: -1, h: -1 };
  const write = (name, value) => {
    const v = Math.round(value * 10000) / 10000;
    if (v === shown[name]) return;
    shown[name] = v;
    screen.style.setProperty(`--${name}`, v);
  };
  const progressLine = stage.querySelector('[data-stage-progress]');
  let shownRun = -1;
  const draw = (progress) => {
    const { open, run } = parts;
    const t = progress / open;
    const v = glide(t / GROW_TO, 0.4);
    const u = widen(t);
    const h = run ? glide((progress - open) / run, RUN_EASE) * (PICTURES - 1) : 0;
    write('v', v);
    write('u', u);
    write('d', settle(t));
    write('h', h);
    // The line over the bar: the run so far, and there only while the
    // run is (from the first picture full-screen to the stage letting the
    // page go on), so it is gone before the book's strip comes up, which
    // waits for the stage to leave the middle of the screen (data-nav-promo
    // empty on the stage, floatingnav.js)
    if (progressLine) {
      const run = h / (PICTURES - 1);
      const r = Math.round(run * 10000) / 10000;
      if (r !== shownRun) {
        shownRun = r;
        stage.style.setProperty('--run', r);
      }
      progressLine.classList.toggle('is--shown', u >= 0.995 && progress < 0.999);
    }
    caption(u < CAPTION_FROM ? -1 : Math.round(h), u < CAPTION_FROM || Math.abs(h - Math.round(h)) > CAPTION_SPAN);
  };

  // From the stage's top at the screen's top to the moment its screen stops
  // being held (the stage's height less the screen's: --stage-open and
  // --stage-run in style.css, measured on each refresh):
  // the fourth picture is full-screen just as the screen goes on up with
  // the page, so there is no stretch of scrolling where nothing moves. A
  // reading of the scroll, nothing more
  readParts();
  ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: () => `+=${Math.max(1, stage.offsetHeight - screen.offsetHeight)}`,
    invalidateOnRefresh: true,
    onUpdate: (self) => draw(self.progress),
    onRefresh: (self) => { readParts(); draw(self.progress); },
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

// The column of panels (initInfluenceStrip): the panel whose place is on
// the focus line, the screen's middle, is the large one. Each panel's
// middle is measured once with all of them
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
// A panel whose figure counts (data-odometer-manual, odometer.js) counts
// up as it becomes the large one: once its size passes COUNT_ON on its way
// up. It is set back to its start once it has shrunk to COUNT_OFF, well
// away again, ready to count the next time; between the two it is left as
// it is, so a large panel never restarts with the scroll, and one at the
// edge does not flicker. Either way down the page, and as often as it
// comes round. Read from the sizes the column draws already, nothing more.
//
// `arriving`: the page is still coming in (transitions.js, beforeEnter), so
// the panels are measured against the page's own box, as they will stand
// once it has landed at its top, and sized now, while it is unseen; once
// it has landed (the call without it) they are measured again where they
// are, which changes nothing, and from then on follow the scroll.
//
// Every such column on the page (data-influence-strip): the Partners
// page's outcomes (partner.astro).
const COUNT_ON = 0.6;
const COUNT_OFF = 0.25;
function initInfluenceStrip(scope, options) {
  (scope || document).querySelectorAll('[data-influence-strip]').forEach((strip) => initStripColumn(strip, options));
}
function initStripColumn(strip, { arriving = false } = {}) {
  if (strip.__strip) {
    if (!arriving) strip.__strip();
    return;
  }
  const items = Array.from(strip.querySelectorAll('[data-strip-item]'));
  if (!items.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE_RATE = 7; // the share of the way left closed each second, as a rate (about 0.11 a frame at 60fps)
  const page = strip.closest('[data-barba="container"]') || document.body;
  // The panels that count, and whether each is counting
  const counters = items.map((item) => (item.hasAttribute('data-odometer-manual') ? item : null));
  const counting = items.map(() => false);
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
    focus = window.innerHeight / 2;
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
    count();
  }
  // A counting panel's figure: up as the panel becomes the large one, back
  // to its start once it is well away again (COUNT_ON, COUNT_OFF). The
  // panel carries is--counting meanwhile, so a figure built after the panel
  // came up still counts (odometer.js)
  function count() {
    counters.forEach((item, i) => {
      if (!item) return;
      const odometer = item.__odometer;
      if (!counting[i] && shown[i] >= COUNT_ON) {
        counting[i] = true;
        item.classList.add('is--counting');
        if (odometer && odometer.play) odometer.play();
      } else if (counting[i] && shown[i] <= COUNT_OFF) {
        counting[i] = false;
        item.classList.remove('is--counting');
        if (odometer && odometer.reset) odometer.reset();
      }
    });
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
