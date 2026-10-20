// -----------------------------------------
// SWIPER SLIDERS ([data-swiper-group])
// -----------------------------------------
//
// Swiper is loaded only on a page that has a slider (lifecycle.js), with its
// stylesheet. Each slider is built when it first comes near the screen —
// one in a closed drawer when the drawer opens — rather than all of them on
// arrival, and every one is destroyed when the page is left: a Swiper keeps
// listeners on the window and the document (keyboard included) that would
// otherwise outlive it.

function buildSwiper(swiperGroup) {
  const swiperSliderWrap = swiperGroup.querySelector("[data-swiper-wrap]");
  if (!swiperSliderWrap || swiperGroup.__swiper) return;

  const prevButton = swiperGroup.querySelector("[data-swiper-prev]");
  const nextButton = swiperGroup.querySelector("[data-swiper-next]");
  const pagination = swiperGroup.querySelector(".swiper-pagination");

  // On a page the slides are sized in CSS, one column of the page grid each,
  // so they land on its columns; Swiper takes their widths as they are.
  // Breakpoints go off the window, not the container, so a slider inside a
  // drawer would get sized for the full page and the cards come out tiny:
  // a group there asks for its own count instead.
  const perView = parseFloat(swiperGroup.getAttribute("data-swiper-per-view"));
  const sizing = perView
    ? {
        slidesPerView: 1.25,
        breakpoints: {
          480: { slidesPerView: Math.min(perView, 1.8) },
          992: { slidesPerView: perView },
        },
      }
    : { slidesPerView: "auto" };

  swiperGroup.__swiper = new Swiper(swiperSliderWrap, {
    ...sizing,
    speed: 600,
    mousewheel: { forceToAxis: true },
    grabCursor: true,
    navigation: {
      nextEl: nextButton,
      prevEl: prevButton,
    },
    pagination: {
      el: pagination,
      type: 'bullets',
      clickable: true
    },
    keyboard: {
      enabled: true,
      onlyInViewport: false,
    },
  });
}

function initSwiperSlider() {
  const groups = Array.from(document.querySelectorAll("[data-swiper-group]")).filter((group) => !group.__swiperWatched);
  if (!groups.length) return;
  groups.forEach((group) => { group.__swiperWatched = true; });

  const ready = Promise.all([loadScript(VENDOR.swiperJs), loadStyle(VENDOR.swiperCss)]);
  let observer = null;
  let left = false;

  ready.then(() => {
    if (left || typeof Swiper === "undefined") return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        buildSwiper(entry.target);
      });
    }, { rootMargin: "50% 0px" });
    groups.forEach((group) => observer.observe(group));
  }).catch((error) => console.error(error));

  onPageLeave(() => {
    left = true;
    if (observer) observer.disconnect();
    groups.forEach((group) => {
      if (group.__swiper) group.__swiper.destroy(true, true);
      group.__swiper = null;
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSwiperSlider();
});
