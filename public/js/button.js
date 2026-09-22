// -----------------------------------------
// CTA (three hairlines, a label and an arrow)
// -----------------------------------------
//
// The CTA is complete without this file: its frame is drawn in and out by
// CSS on :hover and :focus-visible, and it links, scrolls or opens whatever
// its markup says. What this adds, on a fine pointer with motion allowed, is
// the arrow stepping forward a few pixels. The label's scramble is not
// implemented here — it is bound to the same `data-scramble-hover` markup
// and the same shared engine (scramble.js) as every other link on the site,
// so there is one scramble implementation, not one per component. Touch
// devices and reduced motion get the CSS states only.

function initCta() {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reducedMotion) return;

  const buttons = document.querySelectorAll('[data-cta]');
  if (buttons.length === 0) return;

  buttons.forEach((button) => {
    // Barba re-runs this on every navigation; never bind the same button twice
    if (button.__cta) return;
    button.__cta = true;

    const label = button.querySelector('[data-cta-label]');
    const icon = button.querySelector('.cta__icon');
    if (!label) return;

    if (typeof bindScrambleHover === 'function') {
      bindScrambleHover(button, label);
    }

    const enter = () => {
      if (icon) {
        gsap.to(icon, { x: 3, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      }
    };

    const leave = () => {
      if (icon) {
        gsap.to(icon, { x: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      }
    };

    button.addEventListener('mouseenter', enter);
    button.addEventListener('mouseleave', leave);
    // Keyboard users get the same response as the pointer, but only for a
    // focus the browser would ring — not one left behind by a click.
    button.addEventListener('focus', () => {
      if (button.matches(':focus-visible')) enter();
    });
    button.addEventListener('blur', leave);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.fonts.ready.then(function () {
    initCta();
  });
});
