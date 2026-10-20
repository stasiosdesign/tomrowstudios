// -----------------------------------------
// THE HERO'S EMAIL SQUARE: THE ADDRESS COPIED
// -----------------------------------------
//
// The email square among the hero's social squares (HeroNav.astro,
// data-copy-email) copies the address to the clipboard when pressed
// (a click, a tap, Enter or Space). Copied, the square is held open with
// its words changed to say so and its envelope opened (is--copied,
// style.css), for a moment, then let go: it closes with the pointer gone
// and its envelope shuts. The copy is only called done once the clipboard
// has taken the address: through the clipboard API where the page may use
// it, else through a selection of the address in a field kept off screen;
// if neither works, the square says so instead, the same way, and the
// address is left in the status line for screen readers to read.
//
// Bound by transitions.js on each page, since the squares live in the
// page's own container; a square already bound is left alone.

function initSocialCopy(scope) {
  const root = scope && scope.querySelectorAll ? scope : document;
  root.querySelectorAll('[data-copy-email]').forEach((button) => {
    if (button.__copyBound) return;
    button.__copyBound = true;
    const label = button.querySelector('[data-copy-label]');
    const status = button.querySelector('[data-copy-status]');
    const email = button.dataset.copyEmail || '';
    const HOLD = 1800; // ms the square shows its answer
    let timer = 0;

    function say(text, state) {
      if (label) label.textContent = text;
      button.classList.toggle('is--copied', state === 'done');
      button.classList.toggle('is--failed', state === 'fail');
      button.classList.toggle('is--open', state !== 'rest');
    }
    function rest() {
      timer = 0;
      say(button.dataset.copyRest || '', 'rest');
    }
    function answer(ok) {
      say(ok ? button.dataset.copyDone : button.dataset.copyFail, ok ? 'done' : 'fail');
      if (status) status.textContent = ok ? `Email address copied: ${email}` : `The address could not be copied. It is ${email}`;
      clearTimeout(timer);
      timer = setTimeout(rest, HOLD);
    }

    // The clipboard: the API where the page may use it; else a selection
    // of the address, copied the old way
    async function copy(text) {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          return;
        } catch (_) {
          // refused (the page not focused, or no leave for it): the old way below
        }
      }
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(field);
      field.select();
      let done = false;
      try { done = document.execCommand('copy'); } catch (_) { done = false; }
      field.remove();
      if (!done) throw new Error('copy refused');
    }

    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (!email) return;
      copy(email).then(() => answer(true), () => answer(false));
    });
  });
}
