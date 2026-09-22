gsap.registerPlugin(SplitText);

function initButton011() {
  const buttons = document.querySelectorAll('[data-button-011]');
  if (buttons.length === 0) return;

  buttons.forEach((element) => {
    // Barba re-runs this on every navigation; never split the same label twice
    if (element.__button011) return;
    element.__button011 = true;

    const text = element.querySelector('[data-button-011-text]');
    if (!text) return;

    const splitText = new SplitText(text, {
      type: 'chars',
      tag: 'span',
      charsClass: 'button-011__split-char',
      propIndex: true,
    });

    gsap.set(splitText.chars, { display: 'inline-block' });
  });
}

// Initalize Button 011
document.addEventListener('DOMContentLoaded', () => {
  document.fonts.ready.then(function () {
    initButton011();
  });
});
