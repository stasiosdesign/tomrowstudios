// -----------------------------------------
// IMAGE REVEAL
// -----------------------------------------
// Photographs and plates that load as the page scrolls fade in once they
// have arrived, rather than painting in strips over an empty frame. Only a
// picture still loading is hidden, so one already in the cache shows at
// once, and without the script nothing is ever hidden.

const REVEAL_IMAGES = [
  ".parallax-slider__item-img",
  ".project-bleed img",
  ".project-grid img",
  ".card-img",
  ".product-card__media img",
  ".archive-card img",
  ".slide-card img",
  ".panel-wide-img",
].join(", ");

function initImageReveal(root) {
  (root || document).querySelectorAll(REVEAL_IMAGES).forEach((img) => {
    if (img.__reveal || img.complete) return;
    img.__reveal = true;
    img.classList.add("is--loading");
    const done = () => {
      img.classList.remove("is--loading");
      img.classList.add("is--loaded");
    };
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initImageReveal(document);
});
