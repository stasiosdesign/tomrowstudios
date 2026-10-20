// -----------------------------------------
// SCROLL LIST: the name on the middle line
// -----------------------------------------
//
// The home page's hero and clients, and the Partner page's services
// ("Scroll list" in style.css). Markup: data-scroll-list on the list's
// root, data-scroll-list-item on each entry (a name, a photograph),
// data-scroll-list-panel="<index>" on each of an entry's panels (a logo, a
// line of description, a name; as many as the design wants). As the page
// scrolls, the entry crossing the middle of the screen is lit (is--active)
// and its panels come up; the panels before it are marked is--above, so
// each can come in from the side the list is heading. The lit index is
// also on the root, as --scroll-list-active, for anything placed by it.
//
// The middle line is watched, not measured: IntersectionObservers report an
// entry coming onto the screen's centre line, and the line leaving the list
// at either end (then the first entry is lit, above the list, or the last,
// below it). The entries must touch, with no gap between them. No scroll listener, no layout read per frame; the browser
// checks once a frame on its own.
//
// On a fine pointer, the entry under the pointer is lit while it is there,
// and leaving it hands the light back to the scroll — unless the root says
// data-scroll-list-hover="off" (the hero's photographs).
//
// Barba runs this on the first load as well as the page's own startup:
// built once per list, and taken down when the page is left (lifecycle.js).

function initScrollLists(scope) {
  (scope || document).querySelectorAll('[data-scroll-list]').forEach(initScrollList);
}

function initScrollList(root) {
  if (root.__scrollList) return;
  root.__scrollList = true;

  const items = Array.from(root.querySelectorAll('[data-scroll-list-item]'));
  if (!items.length) return;
  const panels = items.map((_, i) => Array.from(root.querySelectorAll(`[data-scroll-list-panel="${i}"]`)));

  let scrolled = 0;
  let hovered = -1;
  let shown = -1;

  function show(index) {
    // A page on its way out holds still: the transition lifts it out of the
    // scroll, which the observers would read as a scroll to its end
    if (index === shown || root.closest('[data-page-leaving]')) return;
    shown = index;
    items.forEach((item, i) => item.classList.toggle('is--active', i === index));
    panels.forEach((group, i) => group.forEach((panel) => {
      panel.classList.toggle('is--active', i === index);
      panel.classList.toggle('is--above', i < index);
    }));
    root.style.setProperty('--scroll-list-active', index);
  }
  const update = () => show(hovered >= 0 ? hovered : scrolled);

  // The name on the line: the root shrunk to the screen's centre line
  // reports a name as it comes onto the line, whether the scroll was steady
  // or a jump (a reload part way down, a link, a fast fling).
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) scrolled = items.indexOf(entry.target);
    });
    update();
  }, { rootMargin: '-50% 0px -50% 0px' });
  items.forEach((item) => observer.observe(item));

  // Off the list at either end. The names are stacked with no gap, so when
  // no name is on the line, the line is above the first or below the last.
  // Two more observers say which, exactly and after any jump: one asks
  // whether the first name's top is above the line (a root from far above
  // the screen down to its middle), the other whether the last name's
  // bottom is below it (from the middle to far below). Each changes state
  // only as the line leaves the list at its end, and lights that end's name.
  const end = (target, rootMargin, index) => {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) return;
      scrolled = index;
      update();
    }, { rootMargin });
    io.observe(target);
    return io;
  };
  const first = end(items[0], '100000px 0px -50% 0px', 0);
  const last = end(items[items.length - 1], '-50% 0px 100000px 0px', items.length - 1);

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches && root.dataset.scrollListHover !== 'off';
  const onEnter = (event) => {
    hovered = items.indexOf(event.currentTarget);
    update();
  };
  const onLeave = () => {
    hovered = -1;
    update();
  };
  if (finePointer) {
    items.forEach((item) => {
      item.addEventListener('pointerenter', onEnter);
      item.addEventListener('pointerleave', onLeave);
    });
  }

  update();

  onPageLeave(() => {
    observer.disconnect();
    first.disconnect();
    last.disconnect();
    items.forEach((item) => {
      item.removeEventListener('pointerenter', onEnter);
      item.removeEventListener('pointerleave', onLeave);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => initScrollLists());
