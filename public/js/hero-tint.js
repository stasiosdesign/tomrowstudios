// -----------------------------------------
// THE HOME HERO'S MOSAIC, IN ITS PICTURE'S COLOURS
// -----------------------------------------
//
// The list hero's square grid (home-list.js, "The hero as a list" in
// style.css) is a mosaic in the lit picture's colours. The picture is not
// carried on or copied: it gives the mosaic its palette and its mood, and
// the mosaic lies under it as a field of its own, dispersed over the whole
// screen with no centre and no source, the picture standing in its frame
// on top of it.
//
// The field: each square one tessera of one of the picture's colours (its
// main colours, each held to a tint of itself: its own hue, its
// saturation drawn out, never pale), the colours shared out as the
// picture shares them, laid by a slow noise with a finer one over it so
// that like colours fall in loose drifts, scattered through at the small
// scale, with an ordered dither along their edges so one drift mixes into
// the next tessera by tessera rather than stopping. All of it faint in
// the near-black: most tesserae held back to a trace, the odd one at its
// strength, the strength itself rising and falling slowly over the field,
// so it reads as a dispersed field with a slight variation of density
// rather than as an effect. Within it, a few pockets: small soft-edged
// rectangles on the grid, set by each picture's own seed and kept off the
// pictures' column and the type, where the tesserae gather more orderly
// (few held back, a little stronger) and, every other pocket, where the
// picture has an accent (a badge, an orange shape, a red cover), take
// that colour more often. Quieter behind the hero's type (the fields, the
// pages), so the words stand clear of it.
//
// Changing part, the tesserae turn to the next picture's colours in
// patches, each square in its own time over the field, no wave from
// anywhere. Under a mouse the tesserae near it lift a little towards their
// colours (a loose handful of them, not a disc) and ease back as it goes:
// felt more than seen. Not on touch, nor with reduced motion (which also
// turns parts at once).
//
// The colours come with the page: each part's list item carries its
// picture's palette (data-tint-palette, read from the picture when the
// page was built: src/components/hero-palette.ts), so nothing is fetched
// or analysed here and the field is ready before the first paint.
//
// Drawing. One canvas, a pixel a square, the size of the screen (the
// surface is sticky and shows one screen of the hero), scaled up square
// for square from the grid's own corner, under its lines (style.css);
// drawn only while squares are turning or lifting, and never with a
// filter, a blend mode or a mask on it, so the browser composites one
// plain picture. The screen treatment (the hero carrying is--screen: the
// mosaic as the picture on an old television, soft, lit and bled, behind
// a phosphor raster) is made inside that one picture, square by square:
//   - a backlight in the picture's cast, broad and soft, strongest a
//     little above the middle and to the right;
//   - the tesserae, lifted and saturated a little and softened so each
//     square's colour bleeds into its neighbours', laid over it with
//     screen;
//   - and their light again, bled wide (worked out at a quarter of the
//     squares and smoothed back up) and bright, laid over that with
//     screen, so the lit tesserae and the pockets glow through.
//   The bloom is read a little apart for red and blue, more towards the
//   screen's edges (red outwards, blue inwards), as light through thick
//   curved glass parts at its edges: a soft fringe, never a double image.
//   The raster over it (fine vertical phosphor stripes, red, green and
//   blue a pixel each, fading towards the screen's edges) is a second
//   canvas at the screen's own pixels, drawn once a size, and still. And
//   over the scan grid, a third, the size of the first: the same bloom,
//   faint, as the glass's halation, the light caught in the glass in front
//   of the pixels and spilling over the gaps between them where the field
//   is lit, so the lines read as the gaps of a lit screen rather than as
//   a grid drawn on it (plain alpha, drawn with the first). The strengths
//   are the variables on .home-reel.is--screen (style.css), read here.
// createHeroTint(root) is called by home-list.js, which tells it the lit
// part (show) and when the opening has handed over (reveal).
//
// Arriving at the home page by a page transition, the mosaic is made
// earlier, by prepareHeroTint (transitions.js, beforeEnter): as soon as
// the new page is in the document, before it starts to come in, and
// painted at once in the first part's colours (prime), so the page comes
// in whole. Made any later (home-list.js runs once the transition is
// over), the page would come in over the bare grid and its colours only
// then turn in, seconds after the rest. home-list.js takes over the
// mosaic made here (root.__heroTint) rather than making another.

function createHeroTint(root, options) {
  const reduced = !!(options && options.reduced);
  const screen = root.classList.contains('is--screen');
  const surface = root.querySelector('.home-reel__surface-inner');
  const list = root.querySelector('[data-list]');
  const items = Array.from(root.querySelectorAll('[data-list-item]'));
  const sample = items[0];
  if (!surface || !list || !items.length) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'home-reel__tint';
  surface.prepend(canvas);
  const pen = canvas.getContext('2d');
  if (!pen) return null;
  let raster = null;
  let halo = null;
  let haloPen = null;
  if (screen) {
    raster = document.createElement('canvas');
    raster.className = 'home-reel__raster';
    canvas.after(raster);
    halo = document.createElement('canvas');
    halo.className = 'home-reel__halo';
    raster.after(halo);
    haloPen = halo.getContext('2d');
  }

  // The screen's strengths (style.css, .home-reel.is--screen), read once;
  // each has its own fallback, the value the home page uses
  const styles = getComputedStyle(root);
  const setting = (name, fallback) => {
    const v = parseFloat(styles.getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  const BASE = setting('--screen-base', 14); // the grid's own near-black (#0e0e0e), each channel
  const BODY = setting('--screen-body', 0.1);         // a tessera's strength, at its full...
  const SWELL = 0.4;          // ...rising and sinking by this share over the field...
  const SWELL_SPAN = 24;      // ...over about this many squares
  const KEEP = setting('--screen-keep', 0.22);        // the share of tesserae at their strength, in the open...
  const KEEP_SWELL = setting('--screen-keep-swell', 0.12); // ...more or fewer by this over the field...
  const DENSE_SPAN = 15;      // ...over about this many squares
  const HELD = setting('--screen-held', 0.07);        // a held-back tessera's share of its strength: the barest
                              // trace, so the field reads as clear glass with lit points,
                              // not a speckle between them
  const BLOOM_FLOOR = setting('--screen-bloom-floor', 0.045); // a tessera glows (bleeds wide) only from this
                              // strength: the lit ones, well above the trace the held-back ones keep
  const SOFTEN = setting('--screen-soften', 0.14);    // how much each square's colour bleeds into its neighbours'
  const BLOOM_PASSES = Math.round(setting('--screen-bloom-passes', 2)); // how wide the glow is bled (0: none)
  const DRIFT_SPAN = 14;      // squares a drift of one colour spans, about...
  const GRAIN_SPAN = 3;       // ...and the finer scatter through it...
  const GRAIN = 0.45;         // ...which has this much of the say
  const DITHER = 0.1;         // the ordered dither's spread along the drifts' edges, as a share of the field
  const POCKETS = 4;          // pockets sought in each part's field
  const POCKET_SIZE = [5, 12]; // a pocket's half-size, in squares, least and most
  const POCKET_EDGE = 4;      // squares over which a pocket's edge softens
  const POCKET_LIFT = 0.5;    // how much stronger a pocket's tesserae are, at its heart
  const POCKET_KEEP = 0.7;    // the share at their strength there
  const POCKET_ACCENT = 0.4;  // the share taking the pocket's accent there
  const CLEAR = 3;            // squares a pocket keeps from the pictures' column, the type and the edge
  const ACCENT_GAIN = 1.25;   // an accent tessera a little stronger
  const ACCENT_SPARSE = 0.45; // an accent's share of the open field, against its share of the picture
  const QUIET = 0.5;          // how much fainter the tesserae are behind the hero's type...
  const QUIET_EDGE = 3;       // ...feathered over this many squares
  const TURN = 560;           // ms each square takes to turn
  const SPREAD = 700;         // ms over which the squares' turns are spread, in patches...
  const JITTER = 160;         // ...and each square's own unevenness in it
  const STRIDE = 8;           // a square's values in a field: see fieldOf
  // The lift under the mouse: this far round it, in squares...
  const LIFT_RADIUS = 8;
  const LIFT_SHARE = 0.35;    // ...this share of the tesserae...
  const LIFT_GAIN = 0.2;      // ...by this much at the most, at its middle...
  const LIFT_RISE = 260;      // ...coming up over about this long (ms)...
  const LIFT_FALL = 900;      // ...and easing back over this
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const SCREEN = screen ? {
    backlight: setting('--screen-backlight', 0.2),
    bloom: setting('--screen-bloom', 0.6),
    lift: setting('--screen-lift', 1.35),
    colour: setting('--screen-colour', 1.4),
    bloomLift: 2.6,
    bloomColour: 1.8,
    phosphor: setting('--screen-phosphor', 0.085),
    fringe: setting('--screen-fringe', 1.2),
    halation: setting('--screen-halation', 0.45),
  } : null;
  // The tesserae's light, lifted and saturated (a CSS saturate, as a
  // matrix) for the field and, more, for the bloom: applied once to each
  // colour as a field is laid, never to the pixels
  function saturate(gain, s) {
    return [
      0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
    ].map((v) => v * gain);
  }
  const FIELD_MATRIX = SCREEN ? saturate(SCREEN.lift, SCREEN.colour) : saturate(1, 1);
  const BLOOM_MATRIX = SCREEN ? saturate(SCREEN.bloomLift, SCREEN.bloomColour) : null;
  const FIELD_BASE = SCREEN ? BASE * SCREEN.lift : BASE; // the near-black, through the field's lift
  const apply = (m, r, g, b) => [m[0] * r + m[1] * g + m[2] * b, m[3] * r + m[4] * g + m[5] * b, m[6] * r + m[7] * g + m[8] * b];

  // Hashed noise, the same every time for the same square and seed
  function hash(x, y, s) {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // A slow noise over the squares, 0 to 1: the hashes of a coarse lattice,
  // span squares apart, blended smoothly between
  function noise(x, y, span, s) {
    const u = x / span;
    const v = y / span;
    const x0 = Math.floor(u);
    const y0 = Math.floor(v);
    let fx = u - x0;
    let fy = v - y0;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const top = hash(x0, y0, s) + (hash(x0 + 1, y0, s) - hash(x0, y0, s)) * fx;
    const bottom = hash(x0, y0 + 1, s) + (hash(x0 + 1, y0 + 1, s) - hash(x0, y0 + 1, s)) * fx;
    return top + (bottom - top) * fy;
  }

  // ---- The squares, the window, and what each square keeps whatever
  // the picture: how quiet it is (behind the type), when it turns, and
  // how much of the backlight reaches it
  let cols = 0;
  let rows = 0;
  let pitch = 7;
  let win = { x0: 0, y0: 0, x1: 1, y1: 1 }; // the frame at rest, in squares (x1, y1 past its edge)
  let image = null;
  let haloImage = null; // the halation (screen)
  let quietAt = null;  // a square's share of its strength, behind the type
  let delay = null;
  let light = null;    // the backlight's strength on a square
  let cur = null;      // shown now (see fieldOf), a square
  let from = null;
  let to = null;
  let lift = null;     // each square's lift under the mouse, in strength
  let tintBuf = null;  // the tesserae's light, softened (screen)
  let tintTmp = null;
  let bloomBuf = null; // their light bled wide, at a quarter of the squares (screen)
  let bloomTmp = null;
  let qCols = 0;
  let qRows = 0;
  let keepOut = [];    // where no pocket goes: the pictures' column and the type, in squares

  // An element's box on the screen, in squares (the hero's type and its
  // screen are both held still with the pictures, so their boxes keep
  // their places on it however far the page has gone)
  const boxOf = (el) => {
    const screenBox = surface.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return {
      x0: (b.left - screenBox.left) / pitch,
      y0: (b.top - screenBox.top) / pitch,
      x1: (b.right - screenBox.left) / pitch,
      y1: (b.bottom - screenBox.top) / pitch,
    };
  };

  function measure() {
    pitch = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grid-pitch')) || 7;
    const w = surface.clientWidth;
    const h = surface.clientHeight;
    const nextCols = Math.max(1, Math.ceil(w / pitch));
    const nextRows = Math.max(1, Math.ceil(h / pitch));
    // The lit frame at rest: the list's first picture where the list stands
    // at its first stop (its top at the screen's), in whole squares
    const top = parseFloat(getComputedStyle(list).paddingTop) || 0;
    const left = sample.offsetLeft;
    const nextWin = {
      x0: Math.floor(left / pitch),
      y0: Math.floor(top / pitch),
      x1: Math.ceil((left + sample.offsetWidth) / pitch),
      y1: Math.ceil((top + sample.offsetHeight) / pitch),
    };
    const same = nextCols === cols && nextRows === rows && image
      && nextWin.x0 === win.x0 && nextWin.y0 === win.y0 && nextWin.x1 === win.x1 && nextWin.y1 === win.y1;
    if (same) return false;
    cols = nextCols;
    rows = nextRows;
    win = nextWin;
    canvas.width = cols;
    canvas.height = rows;
    canvas.style.width = `${cols * pitch}px`;
    canvas.style.height = `${rows * pitch}px`;
    image = pen.createImageData(cols, rows);
    if (halo && haloPen) {
      halo.width = cols;
      halo.height = rows;
      halo.style.width = canvas.style.width;
      halo.style.height = canvas.style.height;
      haloImage = haloPen.createImageData(cols, rows);
    }
    const count = cols * rows;
    quietAt = new Float32Array(count);
    delay = new Float32Array(count);
    light = new Float32Array(count);
    cur = new Float32Array(count * STRIDE);
    from = new Float32Array(count * STRIDE);
    to = new Float32Array(count * STRIDE);
    lift = new Float32Array(count);
    if (SCREEN) {
      tintBuf = new Float32Array(count * 3);
      tintTmp = new Float32Array(count * 3);
      qCols = Math.ceil(cols / 4);
      qRows = Math.ceil(rows / 4);
      bloomBuf = new Float32Array(qCols * qRows * 3);
      bloomTmp = new Float32Array(qCols * qRows * 3);
    }
    // The hero's type (its fields, its pages), in squares: the tesserae
    // quieter behind it, so the words read clear of the mosaic; and no
    // pocket under it, nor under the pictures' column, the whole height
    // of the screen (the waiting pictures run down it)
    const quiet = Array.from(root.querySelectorAll('.home-list__field, .hero-nav__links')).map(boxOf);
    keepOut = quiet.concat([{ x0: win.x0, y0: -Infinity, x1: win.x1, y1: Infinity }]);
    // The backlight: an ellipse, strongest a little above the middle and
    // to the right, fading to nothing at four fifths of its reach
    const cx = 0.58 * cols;
    const cy = 0.42 * rows;
    const rx = 0.6 * cols;
    const ry = 0.52 * rows;
    for (let y = 0, i = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++, i++) {
        let q = 1;
        for (const b of quiet) {
          const ox = Math.max(b.x0 - (x + 0.5), x + 0.5 - b.x1, 0);
          const oy = Math.max(b.y0 - (y + 0.5), y + 0.5 - b.y1, 0);
          const t = Math.min(1, Math.hypot(ox, oy) / QUIET_EDGE);
          q *= 1 - QUIET * (1 - t * t * (3 - 2 * t));
        }
        quietAt[i] = q;
        // When it turns: in patches over the field, each square a little
        // off its neighbours
        delay[i] = noise(x, y, 12, 303) * SPREAD + hash(x, y, 304) * JITTER;
        if (SCREEN) {
          const r = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
          light[i] = r <= 0.45 ? 1 - (0.6 * r) / 0.45 : r <= 0.8 ? 0.4 * (1 - (r - 0.45) / 0.35) : 0;
        }
      }
    }
    if (raster) drawRaster(w, h);
    return true;
  }

  // ---- The raster (screen): fine vertical phosphor stripes, red, green
  // and blue a pixel each, two to a cell, faint, strongest towards the
  // middle of the screen and fading to its edges; at the screen's own
  // pixels, drawn once a size and still
  function drawRaster(w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    raster.width = Math.max(1, Math.round(w * dpr));
    raster.height = Math.max(1, Math.round(h * dpr));
    raster.style.width = `${w}px`;
    raster.style.height = `${h}px`;
    const r = raster.getContext('2d');
    if (!r) return;
    r.setTransform(dpr, 0, 0, dpr, 0, 0);
    r.clearRect(0, 0, w, h);
    const p = SCREEN.phosphor;
    const inks = [`rgba(255, 70, 80, ${p})`, `rgba(70, 255, 110, ${0.7 * p})`, `rgba(80, 110, 255, ${p})`];
    for (let x = 0; x < w; x += pitch / 2) {
      for (let s = 0; s < 3; s++) {
        r.fillStyle = inks[s];
        r.fillRect(x + s, 0, 1, h);
      }
    }
    // The fade: the stripes kept in the measure of an ellipse over the
    // screen, whole at its middle, little at its edge
    r.globalCompositeOperation = 'destination-in';
    const rx = 0.7 * w;
    const ry = 0.75 * h;
    r.save();
    r.translate(0.5 * w, 0.45 * h);
    r.scale(rx, ry);
    const fade = r.createRadialGradient(0, 0, 0, 0, 0, 1);
    fade.addColorStop(0, 'rgba(0, 0, 0, 1)');
    fade.addColorStop(0.6, 'rgba(0, 0, 0, 0.55)');
    fade.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    r.fillStyle = fade;
    r.fillRect(-0.5 * w / rx, -0.45 * h / ry, w / rx, h / ry);
    r.restore();
    r.globalCompositeOperation = 'source-over';
  }

  // ---- A part's palette, from its list item
  const palettes = new Map(); // part -> { palette, cast } or null
  function paletteOf(k) {
    if (palettes.has(k)) return palettes.get(k);
    let read = null;
    try {
      const raw = items[k] && items[k].dataset.tintPalette;
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Array.isArray(parsed.palette) && parsed.palette.length) read = parsed;
    } catch (_) {
      read = null;
    }
    palettes.set(k, read);
    return read;
  }

  // ---- A part's pockets: a few soft-edged rectangles on the grid, each
  // tried at a place and size of the part's own seed and kept if it lies
  // clear of the pictures' column, the type, the screen's edge and the
  // other pockets. Every other one takes one of the picture's accents,
  // where it has any; the rest are only denser
  function placePockets(seed, accents) {
    const pockets = [];
    for (let t = 0; t < 80 && pockets.length < POCKETS; t++) {
      const size = POCKET_SIZE[0] + (POCKET_SIZE[1] - POCKET_SIZE[0]) * hash(t, 1, seed);
      const shape = Math.sqrt(0.6 + hash(t, 2, seed));
      const rx = Math.max(POCKET_SIZE[0], Math.round(size * shape));
      const ry = Math.max(POCKET_SIZE[0], Math.round(size / shape));
      const roomX = cols - 2 * (rx + CLEAR);
      const roomY = rows - 2 * (ry + CLEAR);
      if (roomX <= 0 || roomY <= 0) continue;
      const x = Math.floor(rx + CLEAR + roomX * hash(t, 3, seed)) + 0.5;
      const y = Math.floor(ry + CLEAR + roomY * hash(t, 4, seed)) + 0.5;
      let clear = true;
      for (const b of keepOut) {
        if (x + rx + CLEAR > b.x0 && x - rx - CLEAR < b.x1 && y + ry + CLEAR > b.y0 && y - ry - CLEAR < b.y1) { clear = false; break; }
      }
      for (const p of pockets) {
        if (clear && Math.abs(x - p.x) < (rx + p.rx) * 1.5 && Math.abs(y - p.y) < (ry + p.ry) * 1.5) clear = false;
      }
      if (!clear) continue;
      const nth = pockets.length;
      const accent = accents.length && nth % 2 === 0 ? accents[(nth / 2) % accents.length] : -1;
      pockets.push({ x, y, rx, ry, accent });
    }
    return pockets;
  }

  // ---- A part's mosaic: each square's tessera. STRIDE values a square:
  // its colour's light over the near-black, through the field's lift
  // (three), the same for the bloom, brighter and only what is above the
  // near-black (three), and its strength (one, then one spare). The
  // colours are worked once here; a frame only mixes them.
  const fields = new Map();
  function fieldOf(k) {
    if (fields.has(k)) return fields.get(k);
    const read = paletteOf(k);
    if (!read) return null;
    const { palette } = read;
    const seed = 1000 + k * 37;
    const count = cols * rows;
    // The colours' shares of the field, the accents sparser than in the
    // picture, as steps from 0 to 1
    const weights = palette.map((c) => c.share * (c.accent ? ACCENT_SPARSE : 1));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const steps = [];
    let acc = 0;
    for (const weight of weights) { acc += weight / total; steps.push(acc); }
    const accents = [];
    palette.forEach((c, j) => { if (c.accent) accents.push(j); });
    const pockets = placePockets(seed, accents);
    // Each colour's light, as the field and the bloom take it
    const lights = palette.map((c) => {
      const d = [c.rgb[0] - BASE, c.rgb[1] - BASE, c.rgb[2] - BASE];
      const tint = apply(FIELD_MATRIX, d[0], d[1], d[2]);
      const bloom = BLOOM_MATRIX ? apply(BLOOM_MATRIX, Math.max(0, d[0]), Math.max(0, d[1]), Math.max(0, d[2])) : [0, 0, 0];
      return tint.concat(bloom);
    });
    // The drift that lays the colours, then levelled (its values spread
    // evenly from 0 to 1) so each colour takes the share it is given
    const drifts = new Float32Array(count);
    const bins = new Uint32Array(512);
    for (let y = 0, i = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++, i++) {
        const d = (1 - GRAIN) * noise(x, y, DRIFT_SPAN, seed) + GRAIN * noise(x + 53, y + 29, GRAIN_SPAN, seed + 1);
        drifts[i] = d;
        bins[Math.min(511, Math.floor(d * 512))]++;
      }
    }
    const level = new Float32Array(512);
    let run = 0;
    for (let b = 0; b < 512; b++) { level[b] = (run + bins[b] / 2) / count; run += bins[b]; }
    const field = new Float32Array(count * STRIDE);
    for (let y = 0, i = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++, i++) {
        // The pocket the square lies in, if any: its hold on it, 1 at its
        // heart, softening to nothing over its edge
        let hold = 0;
        let accent = -1;
        for (const p of pockets) {
          const ax = Math.abs(x + 0.5 - p.x) / p.rx;
          const ay = Math.abs(y + 0.5 - p.y) / p.ry;
          if (ax >= 1 || ay >= 1) continue;
          const ex = Math.min(1, ((1 - ax) * p.rx) / POCKET_EDGE);
          const ey = Math.min(1, ((1 - ay) * p.ry) / POCKET_EDGE);
          const f = ex * ex * (3 - 2 * ex) * ey * ey * (3 - 2 * ey);
          if (f > hold) { hold = f; accent = p.accent; }
        }
        // Its colour: the drift, dithered, through the shares; in a pocket
        // with an accent, that accent instead, the more often towards its heart
        const n = level[Math.min(511, Math.floor(drifts[i] * 512))] + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * DITHER;
        let j = 0;
        while (j < steps.length - 1 && n > steps[j]) j++;
        if (accent >= 0 && hash(x, y, seed + 5) < hold * POCKET_ACCENT) j = accent;
        // Its strength: the body, swelling and sinking over the field,
        // more in a pocket; held back to a trace or not, fewer at their
        // strength where the field is thin and most in a pocket
        const swell = noise(x, y, SWELL_SPAN, seed + 2) * 2 - 1;
        const dense = noise(x + 17, y + 71, DENSE_SPAN, seed + 3) * 2 - 1;
        let a = BODY * (1 + SWELL * swell) * (1 + POCKET_LIFT * hold);
        const open = KEEP + KEEP_SWELL * dense;
        if (hash(x, y, 404) > open + (POCKET_KEEP - open) * hold) a *= HELD;
        if (palette[j].accent) a *= ACCENT_GAIN;
        a *= quietAt[i] * (0.85 + 0.3 * hash(x, y, 101));
        const l = lights[j];
        const o = i * STRIDE;
        field[o] = l[0]; field[o + 1] = l[1]; field[o + 2] = l[2];
        field[o + 3] = l[3]; field[o + 4] = l[4]; field[o + 5] = l[5];
        field[o + 6] = a;
      }
    }
    fields.set(k, field);
    return field;
  }

  // ---- Drawing: each square its tessera's light, at its strength (and
  // its lift), in the near-black
  let castFrom = [BASE, BASE, BASE]; // the backlight's colour, turning with the part
  let castTo = [BASE, BASE, BASE];
  let castMix = 1;
  function paint() {
    const px = image.data;
    const n = cols * rows;
    if (!SCREEN) {
      for (let i = 0; i < n; i++) {
        const o = i * STRIDE;
        const a = Math.min(0.9, cur[o + 6] + lift[i]);
        px[i * 4] = BASE + cur[o] * a;
        px[i * 4 + 1] = BASE + cur[o + 1] * a;
        px[i * 4 + 2] = BASE + cur[o + 2] * a;
        px[i * 4 + 3] = 255;
      }
      pen.putImageData(image, 0, 0);
      return;
    }
    // The tesserae's light at their strength, and the bloom's gathered at
    // a quarter of the squares: from the lit tesserae alone (those above
    // BLOOM_FLOOR), not the held-back ones, so the glow is a scatter of
    // clear points of light and never a dull cloud summed up out of the
    // trace that fills the field between them
    bloomBuf.fill(0);
    for (let y = 0, i = 0; y < rows; y++) {
      const qy = y >> 2;
      for (let x = 0; x < cols; x++, i++) {
        const o = i * STRIDE;
        const a = Math.min(0.9, cur[o + 6] + lift[i]);
        tintBuf[i * 3] = cur[o] * a;
        tintBuf[i * 3 + 1] = cur[o + 1] * a;
        tintBuf[i * 3 + 2] = cur[o + 2] * a;
        if (a < BLOOM_FLOOR) continue;
        const q = (qy * qCols + (x >> 2)) * 3;
        bloomBuf[q] += cur[o + 3] * a;
        bloomBuf[q + 1] += cur[o + 4] * a;
        bloomBuf[q + 2] += cur[o + 5] * a;
      }
    }
    // The tesserae softened only a little: each square's colour bleeding
    // into its neighbours' at the edge, across then down, so the squares
    // stay crisp behind the glass rather than running together
    if (SOFTEN > 0) blur3(tintBuf, tintTmp, cols, rows, SOFTEN);
    // The bloom bled wide: the quarter squares smoothed twice, each a
    // sixteenth of its squares' light (the sum over a quarter square
    // over 16, the mean), then read back up between them
    for (let q = 0; q < bloomBuf.length; q++) bloomBuf[q] /= 16;
    for (let pass = 0; pass < BLOOM_PASSES; pass++) blur3(bloomBuf, bloomTmp, qCols, qRows, 0.25);
    const cast = [0, 1, 2].map((ch) => castFrom[ch] + (castTo[ch] - castFrom[ch]) * castMix);
    const bloom = SCREEN.bloom;
    const halation = SCREEN.halation;
    const hx = haloImage.data;
    const half = cols / 2;
    const middle = rows / 2;
    const fringe = SCREEN.fringe / half; // squares the red and blue part, per square from the middle
    const caught = [0, 0, 0];
    for (let y = 0, i = 0; y < rows; y++) {
      const dy = (y + 0.5 - middle) * fringe;
      for (let x = 0; x < cols; x++, i++) {
        const dx = (x + 0.5 - half) * fringe;
        const l = light[i] * SCREEN.backlight;
        for (let ch = 0; ch < 3; ch++) {
          // The backlight over the near-black, in the cast
          let out = BASE + (cast[ch] - BASE) * l;
          // The tesserae over it, with screen
          const t = Math.max(0, Math.min(255, FIELD_BASE + tintBuf[i * 3 + ch]));
          out = out + t - (out * t) / 255;
          // Their bloom over that, with screen, at its strength: red read
          // a little outwards, green where it is, blue a little inwards
          const k = 1 - ch;
          const g = bloomAt(x + 0.5 + k * dx, y + 0.5 + k * dy, ch);
          out += bloom * (g - (out * g) / 255);
          px[i * 4 + ch] = out;
          caught[ch] = g * halation;
        }
        px[i * 4 + 3] = 255;
        // The halation: the same light, faint, its colour at full and its
        // strength as the alpha, so laid over the grid it adds about itself
        const most = Math.max(caught[0], caught[1], caught[2]);
        if (most < 0.5) {
          hx[i * 4 + 3] = 0;
        } else {
          const s = 255 / most;
          hx[i * 4] = caught[0] * s;
          hx[i * 4 + 1] = caught[1] * s;
          hx[i * 4 + 2] = caught[2] * s;
          hx[i * 4 + 3] = most;
        }
      }
    }
    pen.putImageData(image, 0, 0);
    haloPen.putImageData(haloImage, 0, 0);
  }
  // The bloom at a point, in squares, read between its quarter squares
  function bloomAt(sx, sy, ch) {
    const u = Math.max(0, Math.min(qCols - 1, sx / 4 - 0.5));
    const v = Math.max(0, Math.min(qRows - 1, sy / 4 - 0.5));
    const x0 = Math.floor(u);
    const y0 = Math.floor(v);
    const x1 = Math.min(qCols - 1, x0 + 1);
    const y1 = Math.min(qRows - 1, y0 + 1);
    const fx = u - x0;
    const fy = v - y0;
    const top = bloomBuf[(y0 * qCols + x0) * 3 + ch] * (1 - fx) + bloomBuf[(y0 * qCols + x1) * 3 + ch] * fx;
    const bottom = bloomBuf[(y1 * qCols + x0) * 3 + ch] * (1 - fx) + bloomBuf[(y1 * qCols + x1) * 3 + ch] * fx;
    return Math.max(0, Math.min(255, top + (bottom - top) * fy));
  }
  // A small blur, in place (tmp its size, for the way): three taps across,
  // then three down, the middle one holding 1 - 2 * side
  function blur3(buf, tmp, w, h, side) {
    const mid = 1 - 2 * side;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const l = (row + Math.max(0, x - 1)) * 3;
        const c = (row + x) * 3;
        const r = (row + Math.min(w - 1, x + 1)) * 3;
        for (let ch = 0; ch < 3; ch++) tmp[c + ch] = buf[l + ch] * side + buf[c + ch] * mid + buf[r + ch] * side;
      }
    }
    for (let y = 0; y < h; y++) {
      const up = Math.max(0, y - 1) * w;
      const row = y * w;
      const down = Math.min(h - 1, y + 1) * w;
      for (let x = 0; x < w; x++) {
        const u = (up + x) * 3;
        const c = (row + x) * 3;
        const d = (down + x) * 3;
        for (let ch = 0; ch < 3; ch++) buf[c + ch] = tmp[u + ch] * side + tmp[c + ch] * mid + tmp[d + ch] * side;
      }
    }
  }

  // ---- Turning and lifting, a frame at a time while either goes on
  let want = -1;
  let shown = -1;
  let revealed = false;
  let frame = 0;
  let turning = false;
  let lifting = false;
  let started = 0;
  let last = 0;
  function wake() {
    if (!frame) frame = requestAnimationFrame(step);
  }
  function turnTo(field, cast) {
    from.set(cur);
    to.set(field);
    castFrom = [0, 1, 2].map((ch) => castFrom[ch] + (castTo[ch] - castFrom[ch]) * castMix);
    castTo = cast;
    if (reduced) {
      cur.set(field);
      castMix = 1;
      paint();
      return;
    }
    castMix = 0;
    started = performance.now();
    turning = true;
    wake();
  }
  function step(now) {
    frame = 0;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    if (turning) {
      const t = now - started;
      let busy = false;
      for (let i = 0, n = cols * rows; i < n; i++) {
        let p = (t - delay[i]) / TURN;
        if (p < 1) busy = true;
        if (p <= 0) continue;
        if (p > 1) p = 1;
        const e = p * p * (3 - 2 * p);
        const o = i * STRIDE;
        for (let ch = 0; ch < 7; ch++) cur[o + ch] = from[o + ch] + (to[o + ch] - from[o + ch]) * e;
      }
      // The backlight's cast, over the whole turn
      const c = Math.min(1, t / (TURN + SPREAD + JITTER));
      castMix = c * c * (3 - 2 * c);
      turning = busy;
    }
    if (pointer || lifting) settleLift(dt);
    paint();
    if (turning || lifting) frame = requestAnimationFrame(step);
    else last = 0;
  }
  function settle() {
    if (!revealed || want < 0 || want === shown) return;
    const field = fieldOf(want);
    if (!field) return;
    shown = want;
    turnTo(field, paletteOf(want).cast);
  }

  // ---- The lift: where the mouse is over the hero, a loose handful of the
  // tesserae round it (the same ones every time, a share of them, each by
  // its own measure) come up a little towards their colours, the nearer
  // the more, and ease back, slower, as it moves on or leaves. Nothing of
  // it depends on how fast the hand moves; it rests where the hand rests
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let pointer = null; // the mouse, in the window, while it is over the hero
  // Only while the hero is on screen
  let onScreen = true;
  const sight = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (!onScreen) onLeave();
  });
  sight.observe(surface);
  function onMove(event) {
    if (reduced || !revealed || !onScreen || event.pointerType === 'touch' || !fine.matches) return;
    pointer = { x: event.clientX, y: event.clientY };
    wake();
  }
  function onLeave() {
    if (!pointer) return;
    pointer = null;
    wake();
  }
  const onOut = (event) => { if (!event.relatedTarget) onLeave(); };
  function settleLift(dt) {
    let px = -1;
    let py = -1;
    if (pointer) {
      const box = surface.getBoundingClientRect();
      if (pointer.x >= box.left && pointer.x < box.right && pointer.y >= box.top && pointer.y < box.bottom) {
        px = (pointer.x - box.left) / pitch;
        py = (pointer.y - box.top) / pitch;
      }
    }
    const up = 1 - Math.exp(-dt / LIFT_RISE);
    const down = 1 - Math.exp(-dt / LIFT_FALL);
    let moving = false;
    for (let y = 0, i = 0; y < rows; y++) {
      const near = py >= 0 && Math.abs(y + 0.5 - py) < LIFT_RADIUS;
      for (let x = 0; x < cols; x++, i++) {
        let target = 0;
        if (near && Math.abs(x + 0.5 - px) < LIFT_RADIUS && hash(x, y, 505) < LIFT_SHARE) {
          const r = Math.hypot(x + 0.5 - px, y + 0.5 - py) / LIFT_RADIUS;
          if (r < 1) target = LIFT_GAIN * (1 - r) * (1 - r) * (0.5 + 0.5 * hash(x, y, 506)) * quietAt[i];
        }
        const v = lift[i];
        if (v === target) continue;
        let next = v + (target - v) * (target > v ? up : down);
        if (Math.abs(next - target) < 0.0015) next = target;
        else moving = true;
        lift[i] = next;
      }
    }
    lifting = moving;
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('mouseout', onOut);
  window.addEventListener('blur', onLeave);

  // A new size: the squares and the window measured again, and the lit
  // part's mosaic there at once, mid-turn or not
  const resize = new ResizeObserver(() => {
    if (!measure()) return;
    cancelAnimationFrame(frame);
    frame = 0;
    turning = false;
    lifting = false;
    fields.clear();
    shown = -1;
    const field = revealed && want >= 0 ? fieldOf(want) : null;
    if (field) {
      cur.set(field);
      from.set(field);
      to.set(field);
      castFrom = castTo = paletteOf(want).cast;
      castMix = 1;
      shown = want;
    }
    paint();
  });
  measure();
  paint();
  resize.observe(surface);
  resize.observe(list);

  return {
    // The lit part (home-list.js, as it lights it)
    show(k) {
      want = k;
      settle();
    },
    // The opening has handed over: the mosaic comes in over the field
    reveal() {
      if (revealed) return;
      revealed = true;
      settle();
    },
    // Arriving by a page transition (prepareHeroTint): part k's mosaic
    // painted at once, revealed, nothing turning in from the dark
    prime(k) {
      if (revealed) return;
      const field = fieldOf(k);
      if (!field) return;
      revealed = true;
      want = shown = k;
      cur.set(field);
      from.set(field);
      to.set(field);
      castFrom = castTo = paletteOf(k).cast;
      castMix = 1;
      paint();
    },
    destroy() {
      resize.disconnect();
      cancelAnimationFrame(frame);
      sight.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onOut);
      window.removeEventListener('blur', onLeave);
    },
  };
}

// The home page arriving by a page transition (transitions.js, beforeEnter):
// its mosaic made now and painted at once in the first part's colours (the
// page arrives at its top), so it comes in with the page rather than after
// it. The opening, on a fresh load, keeps its own hand-over (reveal).
function prepareHeroTint(scope) {
  const root = (scope || document).querySelector('[data-home-reel][data-reel-layout="list"]');
  if (!root || root.__heroTint || document.documentElement.classList.contains('is--intro')) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tint = createHeroTint(root, { reduced });
  if (!tint) return;
  tint.prime(0);
  root.__heroTint = tint;
}
