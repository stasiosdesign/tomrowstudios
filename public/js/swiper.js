function initSwiperSlider() {
  const swiperSliderGroups = document.querySelectorAll("[data-swiper-group]");

  swiperSliderGroups.forEach((swiperGroup) => {
    // Barba re-runs this on every navigation; never init the same group twice
    if (swiperGroup.__swiper) return;

    const swiperSliderWrap = swiperGroup.querySelector("[data-swiper-wrap]");
    if(!swiperSliderWrap) return;

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

    const swiper = new Swiper(swiperSliderWrap, {
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

    swiperGroup.__swiper = swiper;
  });
}

// Initialize Swiper Slider Setup
document.addEventListener('DOMContentLoaded', () => {
  initSwiperSlider();
});
