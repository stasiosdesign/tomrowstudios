// -----------------------------------------
// THE INFLUENCE PAGE: the hero's parallax, and the book strip's growing
// into the book band
// -----------------------------------------
//
// influence.astro; "Influence: the hero" and "The book band" in style.css.
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
// moves. Coming back down, the band hands back to the strip at the same
// point, and the strip shrinks back to the bar's width the same way. Once
// the band has gone up off the screen, the strip is back over the bar at
// its own size, rising from behind it as it does when the page opens; and
// with the band coming back down into sight, it goes down behind the bar
// until the band hands back to it. The bar itself is left alone throughout. Measured once and on each refresh
// (a resize), nothing measured on scroll; the strip is put back as it was
// when the page is left.
//
// Barba runs these on the first load and on each arrival (transitions.js);
// the page's triggers go with it when it is left. Reduced motion: the
// collage holds still, and the strip and the band are each simply there.

const INFLUENCE_TRAVEL = 0.1; // of the hero's height scrolled, per unit of speed

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

  // The three stretches of the page: the band still to reach the strip
  // (the strip growing); the band handed over and on screen (docked); the
  // band gone up off the screen (past), where the strip is back as it is
  // everywhere else, having risen from behind the bar. Coming back down
  // into that middle stretch, the strip goes down behind the bar (away)
  // and stays there until the band hands back to it.
  let docked = false;
  let away = false;
  let past = false;
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
    if (!m || past) return;
    if (progress >= 1) {
      dock(true);
      return;
    }
    if (away) {
      away = false;
      instantly(() => strip.classList.remove('is--away'));
    }
    if (progress <= 0) clearSize();
    else setSize(ease(progress));
    dock(false);
  }
  function setPast(on) {
    if (on === past) return;
    past = on;
    if (on) {
      away = false;
      instantly(() => {
        strip.classList.add('is--away');
        strip.classList.remove('is--docked');
        clearSize();
      });
      strip.classList.remove('is--away');
    } else {
      away = true;
      strip.classList.add('is--away');
    }
  }

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
  ScrollTrigger.create({
    trigger: band,
    start: 'bottom top',
    end: 'max',
    onEnter: () => setPast(true),
    onLeaveBack: () => setPast(false),
  });

  if (typeof onPageLeave === 'function') {
    onPageLeave(() => {
      clearSize();
      strip.classList.remove('is--docked', 'is--away');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initInfluenceHero();
  initBookBand();
});
