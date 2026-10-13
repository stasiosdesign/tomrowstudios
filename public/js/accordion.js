// -----------------------------------------
// FAQ ACCORDIONS
// -----------------------------------------
// The questions are native <details>, which open and close in a single
// frame. This animates the height between the two, and fades the answer in
// and out with it. One listener on the document, so a page that arrives
// through Barba and a list the Studio's Visual editor redraws are covered
// without binding anything again. Without the script, or with reduced
// motion asked for, the questions still open, just at once.

function initAccordions() {
  if (document.__accordions) return;
  document.__accordions = true;

  const ease = "cubic-bezier(0.65, 0.05, 0, 1)";
  const duration = 550;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // The height of the question alone: the summary and the borders around it
  const closedHeight = (details, summary) => {
    const style = getComputedStyle(details);
    return summary.getBoundingClientRect().height + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  };

  document.addEventListener("click", (event) => {
    const summary = event.target.closest(".faq summary");
    const details = summary && summary.parentElement;
    if (!details || details.tagName !== "DETAILS" || reducedMotion.matches) return;
    event.preventDefault();

    const closing = details.open && !details.classList.contains("is--closing");
    // Read where it is now, mid-animation included, before letting go of it
    const from = details.getBoundingClientRect().height;
    if (details.__accordion) details.__accordion.cancel();

    let to;
    if (closing) {
      details.classList.add("is--closing");
      to = closedHeight(details, summary);
    } else {
      details.classList.remove("is--closing");
      details.open = true;
      to = details.getBoundingClientRect().height;
    }

    const animation = details.animate({ height: [`${from}px`, `${to}px`] }, { duration, easing: ease });
    details.__accordion = animation;

    const answer = details.querySelector(":scope > :not(summary)");
    if (answer) {
      answer.animate(
        closing
          ? { opacity: [1, 0], transform: ["none", "translateY(-0.4rem)"] }
          : { opacity: [0, 1], transform: ["translateY(0.8rem)", "none"] },
        { duration, easing: ease }
      );
    }

    animation.onfinish = () => {
      details.__accordion = null;
      if (closing) {
        details.open = false;
        details.classList.remove("is--closing");
      }
      // Everything under the list has moved
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
  });
}

initAccordions();
