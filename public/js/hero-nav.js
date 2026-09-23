/* The nav over the home hero: links on the photograph, no band behind them,
   until the hero has been scrolled past — then the black bar comes in under
   them and stays for the rest of the page.

   It is the same bar throughout, in the same place, carrying the same links;
   only its background and rule change, and the stylesheet already transitions
   both. The state is a class rather than a second nav.

   Safe to call on any page and as often as the router likes: with no hero it
   clears the state and leaves the bar solid, which is what every other page
   wants, and Barba kills the page's triggers on the way out so the one made
   here goes with them. */
function initHeroNav() {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const hero = document.querySelector(".willem-header");
  if (!hero || !window.ScrollTrigger) {
    nav.classList.remove("is--over-hero");
    return;
  }

  /* Set from where the page actually is before the trigger takes over, so a
     reload partway down the page, or a hero that is already behind us, starts
     in the right state rather than flashing through the wrong one. */
  nav.classList.toggle("is--over-hero", hero.getBoundingClientRect().bottom > 0);

  ScrollTrigger.create({
    trigger: hero,
    /* The bottom edge of the hero reaching the top of the screen: the first
       moment the bar is over something other than the hero. */
    start: "bottom top",
    onEnter: () => nav.classList.remove("is--over-hero"),
    onLeaveBack: () => nav.classList.add("is--over-hero")
  });
}
