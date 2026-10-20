gsap.registerPlugin(ScrollTrigger);

/* The reveal parallax, now the home hero's alone. A clipped wrapper holds an
   inner layer that trails the scroll by a quarter of its height and a
   darkening layer over it: as the hero leaves, its inner layer falls behind
   and darkens, so the section after it slides up over it. Anything inside it
   marked `-lead` cancels a share of that lag — the attribute's value, 1 if
   it is empty — so it leaves faster than the hero but, below 1, still
   slower than the page. */
function bindRevealParallax(el, prefix, leaving){
  // Barba re-runs this on every navigation; never bind the same element twice
  if (el.__revealParallax) return;
  el.__revealParallax = true;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: el,
      start: leaving ? 'clamp(bottom bottom)' : 'clamp(top bottom)',
      end: leaving ? 'clamp(bottom top)' : 'clamp(top top)',
      scrub: true,
      invalidateOnRefresh: true
    }
  });

  const inner = el.querySelector(`[${prefix}-inner]`);
  const dark  = el.querySelector(`[${prefix}-dark]`);
  const leads = el.querySelectorAll(`[${prefix}-lead]`);
  const tween = leaving ? 'to' : 'from';

  if (inner) {
    tl[tween](inner, {
      yPercent: leaving ? 25 : -25,
      ease: 'linear'
    });
  }

  if (dark) {
    tl[tween](dark, {
      opacity: 0.5,
      ease: 'linear'
    }, '<');
  }

  if (inner) {
    leads.forEach(lead => {
      const share = parseFloat(lead.getAttribute(`${prefix}-lead`)) || 1;
      tl[tween](lead, {
        y: () => inner.offsetHeight * 0.25 * share * (leaving ? -1 : 1),
        ease: 'linear'
      }, 0);
    });
  }
}

function initRevealParallax(){
  document.querySelectorAll('[data-hero-parallax]').forEach(el =>
    bindRevealParallax(el, 'data-hero-parallax', true));
}

/* The footer reveal. The page ([data-page-surface]) and the footer
   ([data-footer]) are siblings in the Barba container. Over the footer's own
   height — from its top reaching the foot of the screen to its foot reaching
   it — a progress P runs from 0 to 100, straight from the scroll:

     - the page scales down about its bottom centre, to the share of the
       footer's width its content takes (the width less the site's side
       inset, the footer's own padding), so at the end the page's sides stand
       where the footer's content starts. Measured from the footer, which
       every page with this reveal has: the bar at the top, which it used to
       be measured from, is not on the home page;
     - the footer's content settles from a fifth of its height above to its
       place, over its ground, which stays with the footer;
     - past 10% the footer's lines rise through their masks (the stylesheet,
       on `is--visible`), and back under 10% they drop again.

   While P is above 0 the page takes a black ground, its rounded lower
   corners, a shadow and its clip, and the footer's ground shows a screen up
   beside it (`is--footer-scaling`, all set once, so the page is never
   repainted as it shrinks: each frame only moves it); at 0 the page carries
   no transform at all, so nothing inside it — the sticky stage, a fixed
   drawer — is ever measured or placed against a scaled box. */

function initFooterReveal(container){
  const scope = container || document;
  const main = scope.matches && scope.matches('[data-barba="container"]') ? scope : document.querySelector('[data-barba="container"]');
  const footer = scope.querySelector('[data-footer]');
  const inner = footer && footer.querySelector('[data-footer-inner]');
  const page = scope.querySelector('[data-page-surface]');
  // Barba runs this on the first load as well as DOMContentLoaded: once per
  // page
  if (!footer || !inner || !page || !main || footer.__footerReveal) return;
  footer.__footerReveal = true;

  // The lines' order, for their stagger
  const items = Array.from(footer.querySelectorAll('.footer-reveal__item'));
  items.forEach((item, i) => {
    item.style.setProperty('--index', i);
    item.style.setProperty('--length', items.length);
  });

  // The page's end scale, from the footer: its content width over its full
  // width
  let endScaleDelta = 0;
  const measure = () => {
    if (!inner.offsetWidth) return;
    const styles = getComputedStyle(inner);
    const width = inner.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    endScaleDelta = width / inner.offsetWidth - 1;
  };

  let last = null;
  const render = (progress) => {
    if (progress === last) return;
    last = progress;

    const offset = (100 - progress) * 20 / 100;
    const scale = 1 + progress * endScaleDelta / 100;

    if (progress > 10) footer.classList.add('is--visible');
    else if (progress < 10) footer.classList.remove('is--visible');

    const scaling = progress > 0;
    main.classList.toggle('is--footer-scaling', scaling);
    inner.style.transform = `translate3d(0px, -${offset}%, 0px)`;
    page.style.transform = scaling ? `translate3d(0, 0, 0) scale(${scale})` : '';
  };

  // ScrollTrigger measures the page while laying out its triggers: it must
  // see it unscaled, then the reveal picks up where the scroll is
  const unscale = () => {
    last = null;
    page.style.transform = '';
  };
  ScrollTrigger.addEventListener('refreshInit', unscale);

  const trigger = ScrollTrigger.create({
    trigger: footer,
    start: 'top bottom',
    end: 'bottom bottom',
    onUpdate: (self) => render(self.progress * 100),
    onRefresh: (self) => {
      measure();
      render(self.progress * 100);
    },
  });
  // A screen before the footer arrives, the page goes onto a layer of its
  // own (`is--footer-near`), so the first frame of the shrink is not also
  // the frame that has to paint the whole page into one. It holds to the
  // very foot of the page: the trigger ends past the last scroll (the
  // footer's foot at the top of the screen, which the page never reaches),
  // because a trigger counts its own end as left, and with an end exactly
  // at the last scroll the flag (and the page's layer with it) dropped
  // whenever a scroll came to rest on the last pixel.
  const near = ScrollTrigger.create({
    trigger: footer,
    start: 'top bottom+=100%',
    end: 'bottom top',
    toggleClass: { targets: main, className: 'is--footer-near' },
  });

  measure();
  render(trigger.progress * 100);

  onPageLeave(() => {
    trigger.kill();
    near.kill();
    ScrollTrigger.removeEventListener('refreshInit', unscale);
    main.classList.remove('is--footer-scaling', 'is--footer-near');
  });
}

// Bind the home hero reveal and the footer
document.addEventListener('DOMContentLoaded', () => {
  initRevealParallax();
  initFooterReveal(document);
});
