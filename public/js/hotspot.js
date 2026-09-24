// -----------------------------------------
// Atlas hotspots (Osmo — Product Hotspot Modal)
// -----------------------------------------
//
// Markers on the Influence page's atlas open a drawer of cards, one per
// country, stepped with prev / next and a dot per card. This is Osmo's
// Product Hotspot Modal as supplied: the state lives in `data-hotspot-*`
// attributes and the CSS does the moving. Two small departures, both for
// Barba: the modal and its triggers are marked once they are bound, so a
// navigation back to the page does not bind them twice, and the two
// document-level listeners (close controls, Escape) are attached once and
// look the modals and triggers up live, rather than holding the arrays from
// the first page load.

function initProductHotspotModal() {
  const transitionDuration = 600;
  const transitionOffset = 0;

  const modals = Array.from(document.querySelectorAll('[data-hotspot-modal-init]')).filter((m) => !m.__hotspot);
  const triggers = Array.from(document.querySelectorAll('[data-hotspot-target]')).filter((t) => !t.__hotspot);

  const closeAll = () => {
    document.querySelectorAll('[data-hotspot-modal-init]').forEach((modal) => {
      modal.setAttribute('data-hotspot-modal-status', 'not-active');
      modal.setAttribute('aria-hidden', 'true');
    });

    document.querySelectorAll('[data-hotspot-target]').forEach((trigger) => {
      trigger.setAttribute('data-hotspot-status', 'not-active');
      trigger.setAttribute('aria-expanded', 'false');
    });
  };

  modals.forEach((modal) => {
    modal.__hotspot = true;

    const cards = Array.from(modal.querySelectorAll('[data-hotspot-name]'));
    const dotsParent = modal.querySelector('[data-hotspot-generate-dots]');

    if (!cards.length) return;

    let activeIndex = Math.max(0, cards.findIndex((card) => card.getAttribute('data-hotspot-status') === 'active'));
    let offsetTimeout;
    let transitionTimeout;

    const getName = (index) => cards[index].getAttribute('data-hotspot-name');

    const getDots = () =>
      Array.from(modal.querySelectorAll('[data-hotspot-control]')).filter((control) =>
        /^\d+$/.test(control.getAttribute('data-hotspot-control'))
      );

    function updateControls() {
      const activeName = getName(activeIndex);

      triggers.forEach((trigger) => {
        const isActive = trigger.getAttribute('data-hotspot-target') === activeName;
        trigger.setAttribute('data-hotspot-status', isActive ? 'active' : 'not-active');
        trigger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      });

      getDots().forEach((dot, index) => {
        const isActive = index === activeIndex;
        dot.setAttribute('data-hotspot-control-status', isActive ? 'active' : 'not-active');
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    }

    function showCard(index, direction) {
      if (index === activeIndex) return;

      clearTimeout(offsetTimeout);
      clearTimeout(transitionTimeout);

      const currentCard = cards[activeIndex];
      const nextCard = cards[index];

      currentCard.setAttribute('data-hotspot-status', direction === 'next' ? 'transition-out-left' : 'transition-out-right');
      nextCard.setAttribute('data-hotspot-status', direction === 'next' ? 'transition-in-right' : 'transition-in-left');

      nextCard.offsetHeight;

      activeIndex = index;
      updateControls();

      offsetTimeout = setTimeout(() => {
        nextCard.setAttribute('data-hotspot-status', 'active');
      }, transitionOffset);

      transitionTimeout = setTimeout(() => {
        currentCard.setAttribute('data-hotspot-status', 'not-active');
      }, transitionOffset + transitionDuration);
    }

    function openModal(name) {
      const index = cards.findIndex((card) => card.getAttribute('data-hotspot-name') === name);
      if (index < 0) return;

      closeAll();

      cards.forEach((card, i) => {
        card.setAttribute('data-hotspot-status', i === index ? 'active' : 'not-active');
      });

      activeIndex = index;
      updateControls();

      modal.setAttribute('data-hotspot-modal-status', 'active');
      modal.setAttribute('aria-hidden', 'false');
    }

    if (dotsParent) {
      const template = dotsParent.querySelector('[data-hotspot-control]');

      if (template) {
        dotsParent.innerHTML = '';

        cards.forEach((card, index) => {
          const dot = template.cloneNode(true);
          dot.setAttribute('data-hotspot-control', index + 1);
          dot.setAttribute('data-hotspot-control-status', index === activeIndex ? 'active' : 'not-active');
          dot.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
          dot.setAttribute('aria-label', `Go to country ${index + 1}`);
          dotsParent.appendChild(dot);
        });
      }
    }

    cards.forEach((card, index) => {
      card.setAttribute('data-hotspot-status', index === activeIndex ? 'active' : 'not-active');
    });

    modal.setAttribute('aria-hidden', modal.getAttribute('data-hotspot-modal-status') === 'active' ? 'false' : 'true');

    triggers.forEach((trigger) => {
      trigger.__hotspot = true;
      trigger.setAttribute('aria-expanded', trigger.getAttribute('data-hotspot-status') === 'active' ? 'true' : 'false');

      trigger.addEventListener('click', () => {
        const name = trigger.getAttribute('data-hotspot-target');
        const index = cards.findIndex((card) => card.getAttribute('data-hotspot-name') === name);

        if (index < 0) return;
        if (trigger.getAttribute('data-hotspot-status') === 'active') return closeAll();

        modal.getAttribute('data-hotspot-modal-status') === 'active'
          ? showCard(index, index > activeIndex ? 'next' : 'prev')
          : openModal(name);
      });
    });

    modal.addEventListener('click', (event) => {
      const control = event.target.closest('[data-hotspot-control]');
      if (!control) return;

      const value = control.getAttribute('data-hotspot-control');

      if (value === 'next') return showCard((activeIndex + 1) % cards.length, 'next');
      if (value === 'prev') return showCard((activeIndex - 1 + cards.length) % cards.length, 'prev');

      if (/^\d+$/.test(value)) {
        const index = Number(value) - 1;
        if (index >= 0 && index < cards.length && index !== activeIndex) {
          showCard(index, index > activeIndex ? 'next' : 'prev');
        }
      }
    });
  });

  // Scrolling away closes the drawer. The area the triggers sit in
  // (`[data-hotspot-area]`, the map plate) is watched against a viewport
  // grown by half a screen above and below: while any of the plate is within
  // that band the drawer stays; once the whole plate is further off than
  // that, in either direction, it closes by the same closeAll() as the close
  // controls. A sliver of the map leaving the screen does nothing. One
  // observer per area, bound once, and it only acts while a drawer is open.
  if ('IntersectionObserver' in window) {
    const areas = new Set();
    triggers.forEach((trigger) => {
      const area = trigger.closest('[data-hotspot-area]');
      if (area && !area.__hotspotWatch) areas.add(area);
    });

    areas.forEach((area) => {
      area.__hotspotWatch = true;
      const watcher = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) return;
          const open = document.querySelector('[data-hotspot-modal-init][data-hotspot-modal-status="active"]');
          if (open) closeAll();
        });
      }, { rootMargin: '50% 0px 50% 0px', threshold: 0 });
      watcher.observe(area);
    });
  }

  if (!document.__hotspotBound) {
    document.__hotspotBound = true;

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-hotspot-control="close"]')) closeAll();
    });

    document.addEventListener('keydown', (event) => event.key === 'Escape' && closeAll());
  }
}

// Initialize Product Hotspot Modal
document.addEventListener('DOMContentLoaded', () => {
  initProductHotspotModal();
});
