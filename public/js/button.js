// -----------------------------------------
// CTA (three hairlines, a label and an arrow)
// -----------------------------------------
//
// The CTA is complete without this file: its colours change on :hover and
// :focus-visible in CSS, and it links, scrolls or opens whatever its markup
// says. What this adds, on a fine pointer with motion allowed, is the
// geometry — the three lines redraw, the arrow steps forward a few pixels and
// the label scrambles once and settles — one coordinated GSAP timeline per
// button, played on enter and let run out. Touch devices and reduced motion
// get the CSS states only.

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
    const top = button.querySelector('.cta__line.is--top');
    const bottom = button.querySelector('.cta__line.is--bottom');
    const left = button.querySelector('.cta__line.is--left');
    if (!label || !top || !bottom || !left) return;

    const text = label.textContent.trim();

    // The frame redraws: each horizontal line retracts to the right and is
    // drawn back in from the left, the bottom a beat behind the top, while the
    // left line retracts upward and redraws down. It always ends where it
    // started, so leaving mid-way needs nothing undone.
    const redraw = gsap.timeline({ paused: true });
    redraw
      .set([top, bottom], { transformOrigin: 'right center' }, 0)
      .to(top, { scaleX: 0, duration: 0.18, ease: 'power2.in' }, 0)
      .set(top, { transformOrigin: 'left center' }, 0.18)
      .to(top, { scaleX: 1, duration: 0.36, ease: 'power3.out' }, 0.18)
      .to(bottom, { scaleX: 0, duration: 0.18, ease: 'power2.in' }, 0.06)
      .set(bottom, { transformOrigin: 'left center' }, 0.24)
      .to(bottom, { scaleX: 1, duration: 0.36, ease: 'power3.out' }, 0.24)
      .set(left, { transformOrigin: 'top center' }, 0)
      .to(left, { scaleY: 0, duration: 0.15, ease: 'power2.in' }, 0)
      .to(left, { scaleY: 1, duration: 0.3, ease: 'power3.out' }, 0.15);

    const enter = () => {
      redraw.restart();
      if (icon) {
        gsap.to(icon, { x: 3, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      }
      if (canScramble) {
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
