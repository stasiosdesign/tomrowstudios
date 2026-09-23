// -----------------------------------------
// HOME HERO DIAL
// -----------------------------------------
//
// Walks the hero dial along the runner's four strong column lines. The dial
// is placed by the stylesheet from one custom property, `--dial-column`
// (0 to 3), and slides between lines on a CSS transition — so all this does
// is set that number: to the next line every three seconds, or to whichever
// of the four click targets is pressed, after which the clock restarts from
// there. The targets mark the current line with aria-current so the one
// under the dial gives the pointer up to the dial's own hover circle.
//
// Lifecycle as the runner's: `initHeroDial()` tears down any instance and
// builds one if the dial is on the page. transitions.js calls it on every
// navigation; DOMContentLoaded covers the first load.

(function () {
  const INTERVAL = 3000; // ms between moves
  const COLUMNS = 4;

  function createHeroDial(dial, targets) {
    let column = parseInt(getComputedStyle(dial).getPropertyValue("--dial-column"), 10);
    if (!(column >= 0 && column < COLUMNS)) column = COLUMNS - 1;
    let timer = 0;

    function setColumn(next) {
      column = ((next % COLUMNS) + COLUMNS) % COLUMNS;
      dial.style.setProperty("--dial-column", String(column));
      targets.forEach((target, i) => {
        if (i === column) target.setAttribute("aria-current", "true");
        else target.removeAttribute("aria-current");
      });
    }

    function schedule() {
      window.clearInterval(timer);
      timer = window.setInterval(() => setColumn(column + 1), INTERVAL);
    }

    function onClick(event) {
      const index = parseInt(event.currentTarget.dataset.heroDialTarget, 10);
      if (index === column) return;
      setColumn(index);
      schedule(); // the cycle continues from the chosen line
    }

    targets.forEach((target) => target.addEventListener("click", onClick));

    setColumn(column);
    schedule();

    function destroy() {
      window.clearInterval(timer);
      targets.forEach((target) => target.removeEventListener("click", onClick));
    }

    return { dial, targets, setColumn, destroy };
  }

  function initHeroDial() {
    if (window.heroDial) {
      window.heroDial.destroy();
      window.heroDial = null;
    }

    const dial = document.querySelector("[data-hero-dial]");
    if (!dial) return;
    const targets = Array.from(document.querySelectorAll("[data-hero-dial-target]"))
      .sort((a, b) => a.dataset.heroDialTarget - b.dataset.heroDialTarget);
    if (targets.length !== COLUMNS) return;

    window.heroDial = createHeroDial(dial, targets);
  }

  window.initHeroDial = initHeroDial;

  document.addEventListener("DOMContentLoaded", initHeroDial);
})();
