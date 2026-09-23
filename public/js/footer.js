gsap.registerPlugin(ScrollTrigger);

/* The reveal parallax. A clipped wrapper holds an inner layer that trails
   the scroll by a quarter of its height and a darkening layer over it.

   The footer is revealed: as it comes up into view, its inner layer settles
   from lagging behind and its dark layer lifts. The home hero is the same
   move run the other way: as it leaves, its inner layer falls behind and
   darkens, so the section after it slides up over it. Anything inside it
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
  document.querySelectorAll('[data-footer-parallax]').forEach(el =>
    bindRevealParallax(el, 'data-footer-parallax', false));
  document.querySelectorAll('[data-hero-parallax]').forEach(el =>
    bindRevealParallax(el, 'data-hero-parallax', true));
}
// Bind the footer and home hero reveals
document.addEventListener('DOMContentLoaded', () => {
  initRevealParallax();
});
