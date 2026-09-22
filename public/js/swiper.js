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

    // Breakpoints go off the window, not the container, so a slider inside a
    // drawer gets sized for the full page and the cards come out tiny. Let a
    // group ask for its own count instead.
    const perView = parseFloat(swiperGroup.getAttribute("data-swiper-per-view"));
    const wide = perView || 3.5;

    const swiper = new Swiper(swiperSliderWrap, {
      slidesPerView: 1.25,
      speed: 600,
      mousewheel: true,
      grabCursor: true,
      breakpoints: {
        // when window width is >= 480px
        480: {
          slidesPerView: perView ? Math.min(perView, 1.8) : 1.8,
        },
        // when window width is >= 992px
        992: {
          slidesPerView: wide,
        }
      },
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
