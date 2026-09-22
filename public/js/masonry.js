// -----------------------------------------
// MASONRY GRID
// -----------------------------------------
// Supplied implementation. The one addition is the guard at the top of the
// loop: Barba re-runs page functions on every navigation, and without it a
// container would be laid out twice and pick up a second resize listener.

function initMasonryGrid() {

  document.querySelectorAll('[data-masonry-list]').forEach(container => {

    if (container._masonry) return;

    const shuffle = container.dataset.masonryShuffle !== 'false';

    let cols, gapPx, colHeights;

    const getVars = () => {

      const cs = getComputedStyle(container);

      cols = parseInt(cs.getPropertyValue('--masonry-col'));

      const rawGap = cs.getPropertyValue('--masonry-gap').trim();

      if (rawGap.endsWith('px')) {
        gapPx = parseFloat(rawGap);

      } else if (rawGap.endsWith('em')) {
        gapPx = parseFloat(rawGap) * parseFloat(cs.fontSize);

      } else if (rawGap.endsWith('rem')) {
        gapPx = parseFloat(rawGap) *
          parseFloat(getComputedStyle(document.documentElement).fontSize);

      } else {
        gapPx = parseFloat(rawGap);
      }
    };

    const layout = () => {

      getVars();

      const wCalc =
        `(100% - ${(cols - 1)}*var(--masonry-gap)) / ${cols}`;

      colHeights = Array(cols).fill(0);

      container.style.position = 'relative';

      const items = Array.from(container.children);

      items.forEach(el => {
        el.style.position = 'absolute';
        el.style.width = `calc(${wCalc})`;
      });

      items.forEach((el, i) => {

        const h = el.offsetHeight;

        const idx = shuffle
          ? colHeights.indexOf(Math.min(...colHeights))
          : (i % cols);

        el.style.top = `${colHeights[idx]}px`;

        el.style.left =
          `calc(${wCalc}*${idx} + var(--masonry-gap)*${idx})`;

        colHeights[idx] += h + gapPx;
      });

      container.style.height =
        `${Math.max(...colHeights)}px`;
    };

    const debounce = (fn, delay) => {

      let t;

      return () => {

        clearTimeout(t);

        t = setTimeout(fn, delay);
      };
    };

    const onResize = debounce(layout, 100);

    window.addEventListener('resize', onResize);

    const debouncedLayout = debounce(layout, 50);

    const imgLoad = () => {

      container.querySelectorAll('img').forEach(img => {

        if (!img.complete) {

          img.addEventListener(
            'load',
            debouncedLayout,
            { once: true }
          );

          img.addEventListener(
            'error',
            debouncedLayout,
            { once: true }
          );
        }
      });
    };

    layout();

    imgLoad();

    container._masonry = {

      recalc: () => {
        layout();
        imgLoad();
      },

      destroy: () => {

        window.removeEventListener('resize', onResize);

        const items = Array.from(container.children);

        items.forEach(el => {

          el.style.position =
          el.style.width =
          el.style.top =
          el.style.left = '';
        });

        container.style.position =
        container.style.height = '';
      }
    };
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initMasonryGrid();
});
