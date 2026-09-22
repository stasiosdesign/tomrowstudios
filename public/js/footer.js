gsap.registerPlugin(ScrollTrigger);

/* The fixed nav swipes up out of the way as the footer comes into view, and
   drops back when you scroll away from it. */
function initNavHideAtFooter(footer){
  const nav = document.querySelector('.site-nav');
  if (!nav || !footer) return;

  gsap.set(nav, { yPercent: 0 });

  ScrollTrigger.create({
    trigger: footer,
    start: 'top 75%',
    onEnter: () => gsap.to(nav, {
      yPercent: -100,
      duration: 0.5,
      ease: 'power2.inOut',
      overwrite: true
    }),
    onLeaveBack: () => gsap.to(nav, {
      yPercent: 0,
      duration: 0.5,
      ease: 'power2.inOut',
      overwrite: true
    })
  });
}

function initFooterParallax(){
  document.querySelectorAll('[data-footer-parallax]').forEach(el => {
    // Barba re-runs this on every navigation; never bind the same footer twice
    if (el.__footerParallax) return;
    el.__footerParallax = true;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'clamp(top bottom)',
        end: 'clamp(top top)',
        scrub: true
      }
    });

    const inner = el.querySelector('[data-footer-parallax-inner]');
    const dark  = el.querySelector('[data-footer-parallax-dark]');

    if (inner) {
      tl.from(inner, {
        yPercent: -25,
        ease: 'linear'
      });
    }

    if (dark) {
      tl.from(dark, {
        opacity: 0.5,
        ease: 'linear'
      }, '<');
    }

    initNavHideAtFooter(el);
  });
}
// Initialize Footer with Parallax Effect
document.addEventListener('DOMContentLoaded', () => {
  initFooterParallax();
});
