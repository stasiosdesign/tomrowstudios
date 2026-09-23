gsap.registerPlugin(ScrollTrigger);

/* The reveal parallax. A clipped wrapper holds an inner layer that trails
   the scroll by a quarter of its height and a darkening layer over it.

   The footer is revealed: as it comes up into view, its inner layer settles
   from lagging behind and its dark layer lifts. The home hero is the same
   move run the other way: as it leaves, its inner layer falls behind and
   darkens, so the section after it slides up over it. Anything inside it
   marked `-lead` cancels that lag and leaves at the page's own speed. */
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

  if (inner && leads.length) {
    tl[tween](leads, {
      y: () => inner.offsetHeight * (leaving ? -0.25 : 0.25),
      ease: 'linear'
    }, '<');
  }
}

function initFooterParallax(){
  document.querySelectorAll('[data-footer-parallax]').forEach(el =>
    bindRevealParallax(el, 'data-footer-parallax', false));
  document.querySelectorAll('[data-hero-parallax]').forEach(el =>
    bindRevealParallax(el, 'data-hero-parallax', true));
}
// Initialize Footer with Parallax Effect
document.addEventListener('DOMContentLoaded', () => {
  initFooterParallax();
});
