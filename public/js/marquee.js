// Osmo Supply's Marquee with Scroll Direction, as supplied, with four
// additions for this site, each marked [Tomrow integration]:
//   1. bound once per element, however often Barba runs it;
//   2. the loop runs only while the strip is on screen, and is stopped
//      when its page is left (lifecycle.js) rather than left looping;
//   3. the cloned collections are hidden from screen readers (the first
//      one reads the names out);
//   4. [data-marquee-pause-hover] holds the strip still under a pointer
//      that can hover; and with reduced motion nothing moves at all (the
//      stylesheet lets the strip be scrolled sideways instead).
function initMarqueeScrollDirection() {
  // [Tomrow integration] 4: reduced motion, no marquee
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('[data-marquee-scroll-direction-target]').forEach((marquee) => {
    // [Tomrow integration] 1: Barba re-runs this on every navigation; the
    // content must only be duplicated once, or each visit would clone the
    // row again
    if (marquee.__marquee) return;
    marquee.__marquee = true;

    // Query marquee elements
    const marqueeContent = marquee.querySelector('[data-marquee-collection-target]');
    const marqueeScroll = marquee.querySelector('[data-marquee-scroll-target]');
    if (!marqueeContent || !marqueeScroll) return;

    // Get data attributes
    const { marqueeSpeed: speed, marqueeDirection: direction, marqueeDuplicate: duplicate, marqueeScrollSpeed: scrollSpeed } = marquee.dataset;

    // Convert data attributes to usable types
    const marqueeSpeedAttr = parseFloat(speed);
    const marqueeDirectionAttr = direction === 'right' ? 1 : -1; // 1 for right, -1 for left
    const duplicateAmount = parseInt(duplicate || 0);
    const scrollSpeedAttr = parseFloat(scrollSpeed);
    const speedMultiplier = window.innerWidth < 479 ? 0.25 : window.innerWidth < 991 ? 0.5 : 1;

    let marqueeSpeed = marqueeSpeedAttr * (marqueeContent.offsetWidth / window.innerWidth) * speedMultiplier;

    // Precompute styles for the scroll container
    marqueeScroll.style.marginLeft = `${scrollSpeedAttr * -1}%`;
    marqueeScroll.style.width = `${(scrollSpeedAttr * 2) + 100}%`;

    // Duplicate marquee content
    if (duplicateAmount > 0) {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < duplicateAmount; i++) {
        const clone = marqueeContent.cloneNode(true);
        // [Tomrow integration] 3: the repeats are not read out
        clone.setAttribute('aria-hidden', 'true');
        fragment.appendChild(clone);
      }
      marqueeScroll.appendChild(fragment);
    }

    // GSAP animation for marquee content
    const marqueeItems = marquee.querySelectorAll('[data-marquee-collection-target]');
    const animation = gsap.to(marqueeItems, {
      xPercent: -100, // Move completely out of view
      repeat: -1,
      duration: marqueeSpeed,
      ease: 'linear'
    }).totalProgress(0.5);

    // Initialize marquee in the correct direction
    gsap.set(marqueeItems, { xPercent: marqueeDirectionAttr === 1 ? 100 : -100 });
    animation.timeScale(marqueeDirectionAttr); // Set correct direction
    animation.play(); // Start animation immediately

    // Set initial marquee status
    marquee.setAttribute('data-marquee-status', 'normal');

    // [Tomrow integration] 2 and 4: the loop runs only while the strip is
    // on screen, and not under a hovering pointer where the strip asks
    let onScreen = false;
    let hovered = false;
    const sync = () => (onScreen && !hovered ? animation.play() : animation.pause());

    // ScrollTrigger logic for direction inversion
    const inView = ScrollTrigger.create({
      trigger: marquee,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        onScreen = self.isActive;
        sync();
      },
      onUpdate: (self) => {
        const isInverted = self.direction === 1; // Scrolling down
        const currentDirection = isInverted ? -marqueeDirectionAttr : marqueeDirectionAttr;

        // Update animation direction and marquee status
        animation.timeScale(currentDirection);
        marquee.setAttribute('data-marquee-status', isInverted ? 'normal' : 'inverted');
      }
    });
    onScreen = inView.isActive;
    sync();
    if (marquee.hasAttribute('data-marquee-pause-hover') && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      marquee.addEventListener('pointerenter', () => { hovered = true; sync(); });
      marquee.addEventListener('pointerleave', () => { hovered = false; sync(); });
    }

    // Extra speed effect on scroll
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: marquee,
        start: '0% 100%',
        end: '100% 0%',
        scrub: 0
      }
    });

    const scrollStart = marqueeDirectionAttr === -1 ? scrollSpeedAttr : -scrollSpeedAttr;
    const scrollEnd = -scrollStart;

    tl.fromTo(marqueeScroll, { x: `${scrollStart}vw` }, { x: `${scrollEnd}vw`, ease: 'none' });

    onPageLeave(() => {
      animation.kill();
      tl.kill();
    });
  });
}

// Initialize Marquee with Scroll Direction
document.addEventListener('DOMContentLoaded', () => {
  initMarqueeScrollDirection();
});
