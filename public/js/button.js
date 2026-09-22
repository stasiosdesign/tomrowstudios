// -----------------------------------------
// CTA (three hairlines, a label and an arrow)
// -----------------------------------------
//
// The CTA is complete without this file: its frame is drawn in and out by
// CSS on :hover and :focus-visible, and it links, scrolls or opens whatever
// its markup says. What this adds, on a fine pointer with motion allowed, is
// the arrow stepping forward a few pixels and the label scrambling once and
// settling. A hover that arrives while a scramble is still running joins it
// rather than restarting it, so hovering in and out quickly stays clean.
// Touch devices and reduced motion get the CSS states only.

if (typeof ScrambleTextPlugin !== 'undefined') {
  gsap.registerPlugin(ScrambleTextPlugin);
}

function initCta() {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reducedMotion) return;

  const buttons = document.querySelectorAll('[data-cta]');
  if (buttons.length === 0) return;

  const canScramble = typeof ScrambleTextPlugin !== 'undefined';

  buttons.forEach((button) => {
    // Barba re-runs this on every navigation; never bind the same button twice
    if (button.__cta) return;
    button.__cta = true;

    const label = button.querySelector('[data-cta-label]');
    const icon = button.querySelector('.cta__icon');
    if (!label) return;
    const text = label.textContent.trim();


    const enter = () => {
      if (icon) {
        gsap.to(icon, { x: 3, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      }
      if (canScramble && !gsap.isTweening(label)) {
        gsap.to(label, {
          duration: 0.45,
          ease: 'none',
          overwrite: 'auto',
          scrambleText: { text, chars: 'upperCase', speed: 0.5 },
        });
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
