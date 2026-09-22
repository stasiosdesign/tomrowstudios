gsap.registerPlugin(Observer,CustomEase)
CustomEase.create("slideshow-wipe", "0.6, 0.08, 0.02, 0.99");

function initSlideShow(el) {

  // Save all elements in an object for easy reference
  const ui = {
    el,
    slides: Array.from(el.querySelectorAll('[data-slideshow="slide"]')),
    inner: Array.from(el.querySelectorAll('[data-slideshow="parallax"]')),
    thumbs: Array.from(el.querySelectorAll('[data-slideshow="thumb"]'))
  };

  let current = 0;
  const length = ui.slides.length;
  let animating = false;
  let observer;
  let animationDuration = 0.9 // Define the duration of your 'slide' here

  ui.slides.forEach((slide, index) => {
    slide.setAttribute('data-index', index);
  });
  ui.thumbs.forEach((thumb, index) => {
    thumb.setAttribute('data-index', index);
  });

  ui.slides[current].classList.add('is--current');
  ui.thumbs[current].classList.add('is--current');

  function navigate(direction, targetIndex = null) {
    if (animating) return;
    animating = true;
    observer.disable();

    const previous = current;
    current =
      targetIndex !== null && targetIndex !== undefined
        ? targetIndex
        : direction === 1
          ? current < length - 1
            ? current + 1
            : 0
          : current > 0
            ? current - 1
            : length - 1;

    const currentSlide = ui.slides[previous];
    const currentInner = ui.inner[previous];
    const upcomingSlide = ui.slides[current];
    const upcomingInner = ui.inner[current];

    gsap.timeline({
      defaults: {
        duration: animationDuration,
        ease: 'slideshow-wipe'
      },
      onStart: function() {
        upcomingSlide.classList.add('is--current');
        ui.thumbs[previous].classList.remove('is--current');
        ui.thumbs[current].classList.add('is--current');
      },
      onComplete: function() {
        currentSlide.classList.remove('is--current');
        animating = false;
        // Re-enable observer after a short delay
        setTimeout(() => observer.enable(), animationDuration);
      }
    })
      .to(currentSlide, { xPercent: -direction * 100 },0)
      .to(currentInner, { xPercent: direction * 50 }, 0)
      .fromTo(upcomingSlide, { xPercent: direction * 100 }, { xPercent: 0 }, 0)
      .fromTo(upcomingInner, { xPercent: -direction * 50 }, { xPercent: 0 }, 0);
  }

  function onClick(event) {
    const targetIndex = parseInt(event.currentTarget.getAttribute('data-index'), 10);
    if (targetIndex === current || animating) return;
    const direction = targetIndex > current ? 1 : -1;
    navigate(direction, targetIndex);
  }

  ui.thumbs.forEach(thumb => {
    thumb.addEventListener('click', onClick);
  });

  observer = Observer.create({
    target: el,
    type: 'wheel,touch,pointer',
    // Drag events to go left/right
    onLeft: () => { if (!animating) navigate(1); },
    onRight: () => {if (!animating) navigate(-1); },
    // For wheel events, check horizontal movement
    onWheel: (event) => {
      if (animating) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        if (event.deltaX > 50) {
          navigate(1);
        } else if (event.deltaX < -50) {
          navigate(-1);
        }
      }
    },
    wheelSpeed: -1,
    tolerance: 10
  });

  // Cleanup function if you need it
  return {
    destroy: function() {
      if (observer) observer.kill();
      ui.thumbs.forEach(thumb => {
        thumb.removeEventListener('click', onClick);
      });
    }
  };
}

function initParallaxImageGalleryThumbnails() {
  let wrappers = document.querySelectorAll('[data-slideshow="wrap"]');
  wrappers.forEach(wrap => {
    // Barba re-runs this on every navigation; never bind the same gallery twice
    if (wrap.__slideshow) return;
    wrap.__slideshow = initSlideShow(wrap);
  });
}

// Initialize Parallax Image Gallery with Thumbnails
document.addEventListener('DOMContentLoaded', () => {
  initParallaxImageGalleryThumbnails();
});
