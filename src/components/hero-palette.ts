/* The home hero's mosaic colours, read from its pictures here on the server.

   The mosaic behind the hero's list (public/js/hero-tint.js) is laid in the
   lit picture's colours: its main colours, found by k-means over a small
   copy of the part of the picture the frame shows, each with its share of
   the picture and whether it is an accent (strongly coloured, and rare).
   They used to be read in the browser, which fetched each picture again
   with CORS and read its pixels from a canvas. That cost a round trip per
   part before the mosaic could colour, and it worked only where Sanity's
   image CDN allows the page's origin to read pixels (the project's CORS
   list), which the production domain is not on. So the reading is done
   here instead, when the page is built (production) or rendered (staging,
   memoised for the life of the function), and each part's palette travels
   in the page (data-tint-palette on its list item), ready before the first
   paint. Astro's own image library, sharp, decodes the picture.

   Any failure (the picture unreachable, sharp unavailable) gives null: the
   page is unaffected and that part's field stays the plain near-black. */

export interface HeroColour {
  /** The colour as the tesserae take it (toned), 0 to 255 */
  rgb: [number, number, number];
  /** Its share of the picture, 0 to 1 */
  share: number;
  /** Strongly coloured and rare in the picture: laid sparser, a little stronger, and gathered in pockets */
  accent: boolean;
}

export interface HeroPalette {
  /** The picture's colours, dark to light */
  palette: HeroColour[];
  /** The picture's overall cast (toned), for the screen's backlight */
  cast: [number, number, number];
}

const FRAME_SHAPE = 4 / 3;       // the frame, height to width (3:4)
const IMAGE_SHAPE = (4 / 3) * 1.3; // the picture in it, 130% of the frame's height (the drift)
const SAMPLE_W = 48;             // the copy read, in pixels across
const SAMPLE_H = Math.round(SAMPLE_W * FRAME_SHAPE);
const COLOURS = 7;               // the colours sought in each picture
const LIGHT_MAX = 0.47;          // a colour's lightness held to this, so a pale one tints rather than greys...
const LIGHT_LIFT = 0.8;          // ...a dark one lifted towards this in the measure it is coloured...
const VIVID = 1.3;               // ...and its saturation drawn out this far (an accent's further)
const TIMEOUT = 8000;            // ms, the most a picture is waited for

const cache = new Map<string, Promise<HeroPalette | null>>();

/** The palette of the picture at `src` as the hero's frame shows it
    (object-fit: cover at `position`, the frame's middle). `src` is an
    address, or a path in the site's library (/assets/…, read from
    public/). `referer` is the
    page's own address: Bunny's CDN, which serves the film's still, refuses
    a request that names no page. */
export function heroPalette(src: string, position = '50% 50%', referer?: string): Promise<HeroPalette | null> {
  const key = `${src}|${position}`;
  let job = cache.get(key);
  if (!job) {
    job = readPalette(src, position, referer).catch((error) => {
      console.warn(`The hero's mosaic has no colours for ${src}: ${error instanceof Error ? error.message : error}`);
      return null;
    });
    // A failure is not kept: the next render tries again
    job.then((palette) => { if (!palette) cache.delete(key); });
    cache.set(key, job);
  }
  return job;
}

async function readPalette(src: string, position: string, referer?: string): Promise<HeroPalette | null> {
  const { default: sharp } = await import('sharp');
  let file: Buffer;
  if (src.startsWith('/')) {
    // A picture in the site's own library (public/, served at /assets/…):
    // read from the disk, so a build never waits on the site it is building
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    file = await readFile(join(process.cwd(), 'public', src));
  } else {
    const response = await fetch(src, { signal: AbortSignal.timeout(TIMEOUT), headers: referer ? { Referer: referer } : {} });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    file = Buffer.from(await response.arrayBuffer());
  }
  const picture = sharp(file);
  const { width: nw, height: nh } = await picture.metadata();
  if (!nw || !nh) throw new Error('no size');
  // The picture covering its box (object-fit: cover, at its position), then
  // the middle of that the frame shows
  const [px, py] = position.split(' ').map((v) => (parseFloat(v) || 50) / 100);
  let sw = nw;
  let sh = nh;
  if (nw / nh > 1 / IMAGE_SHAPE) sw = nh / IMAGE_SHAPE;
  else sh = nw * IMAGE_SHAPE;
  const sx = (nw - sw) * px;
  let sy = (nh - sh) * py;
  sy += (sh * 0.15) / 1.3;
  sh /= 1.3;
  const region = {
    left: Math.max(0, Math.min(nw - 1, Math.round(sx))),
    top: Math.max(0, Math.min(nh - 1, Math.round(sy))),
    width: Math.max(1, Math.min(nw, Math.round(sw))),
    height: Math.max(1, Math.min(nh, Math.round(sh))),
  };
  region.width = Math.min(region.width, nw - region.left);
  region.height = Math.min(region.height, nh - region.top);
  const data = await picture
    .extract(region)
    .resize(SAMPLE_W, SAMPLE_H, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();
  const n = SAMPLE_W * SAMPLE_H;
  const px3 = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) px3[i] = data[i];
  return paletteOf(px3, n);
}

// The picture's colours: k-means from well-spread seeds, near twins merged,
// each marked an accent if it is strongly coloured and holds only a small
// share of the picture; dark to light, so a drift runs from one shade into
// the next
function paletteOf(px3: Float32Array, n: number): HeroPalette {
  const centres: number[][] = [];
  const mean = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let ch = 0; ch < 3; ch++) mean[ch] += px3[i * 3 + ch] / n;
  centres.push(mean);
  const near = new Float32Array(n).fill(Infinity);
  while (centres.length < COLOURS) {
    const last = centres[centres.length - 1];
    let far = 0;
    let at = 0;
    for (let i = 0; i < n; i++) {
      const d = (px3[i * 3] - last[0]) ** 2 + (px3[i * 3 + 1] - last[1]) ** 2 + (px3[i * 3 + 2] - last[2]) ** 2;
      if (d < near[i]) near[i] = d;
      if (near[i] > far) { far = near[i]; at = i; }
    }
    centres.push([px3[at * 3], px3[at * 3 + 1], px3[at * 3 + 2]]);
  }
  const owner = new Uint8Array(n);
  const nearest = (r: number, g: number, b: number) => {
    let best = 0;
    let bestD = Infinity;
    for (let j = 0; j < centres.length; j++) {
      const cj = centres[j];
      const d = (r - cj[0]) ** 2 + (g - cj[1]) ** 2 + (b - cj[2]) ** 2;
      if (d < bestD) { bestD = d; best = j; }
    }
    return best;
  };
  for (let round = 0; round < 12; round++) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const j = nearest(px3[i * 3], px3[i * 3 + 1], px3[i * 3 + 2]);
      owner[i] = j;
      const s = sums[j];
      s[0] += px3[i * 3]; s[1] += px3[i * 3 + 1]; s[2] += px3[i * 3 + 2]; s[3]++;
    }
    sums.forEach((s, j) => { if (s[3]) centres[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  // Near twins merged (their pixels to the larger), the empty dropped
  const counts = centres.map(() => 0);
  for (let i = 0; i < n; i++) counts[owner[i]]++;
  const alive = centres.map((_, j) => counts[j] > 0);
  for (let a = 0; a < centres.length; a++) {
    for (let b = a + 1; b < centres.length; b++) {
      if (!alive[a] || !alive[b]) continue;
      const d = Math.hypot(centres[a][0] - centres[b][0], centres[a][1] - centres[b][1], centres[a][2] - centres[b][2]);
      if (d > 22) continue;
      const [keep, lose] = counts[a] >= counts[b] ? [a, b] : [b, a];
      counts[keep] += counts[lose];
      counts[lose] = 0;
      alive[lose] = false;
    }
  }
  const palette: (HeroColour & { raw: number[] })[] = [];
  centres.forEach((rgb, j) => {
    if (!alive[j]) return;
    const share = counts[j] / n;
    const chroma = Math.max(...rgb) - Math.min(...rgb);
    const accent = chroma > 60 && share < 0.15;
    palette.push({ raw: rgb, rgb: tone(rgb, accent), share, accent });
  });
  // The picture's cast: its mean, toned. A colour with little colour of its
  // own (a grey, the light of a window) takes up to half of it, so the greys
  // are warm or cool as the picture is and the field holds together
  const cast = tone(mean, false);
  const CAST_UNDER = 40;
  palette.forEach((c) => {
    const chroma = Math.max(...c.raw) - Math.min(...c.raw);
    if (chroma >= CAST_UNDER) return;
    const k = 0.5 * (1 - chroma / CAST_UNDER);
    c.rgb = c.rgb.map((v, ch) => v + (cast[ch] - v) * k) as [number, number, number];
  });
  const light = (c: number[]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  palette.sort((a, b) => light(a.raw) - light(b.raw));
  // Rounded, to travel in the page
  const whole = (c: number[]) => c.map(Math.round) as [number, number, number];
  return {
    palette: palette.map(({ rgb, share, accent }) => ({ rgb: whole(rgb), share: Math.round(share * 1000) / 1000, accent })),
    cast: whole(cast),
  };
}

/** The site's signal red (#f20607), the one red the home hero's red tone
    is made from */
const SIGNAL_RED = [242, 6, 7];
/** How far the red is laid over each grey: from the darkest to the
    lightest, the accent's strength and share, and the cast's */
const RED_OVER = { dark: 0.18, light: 0.34, accent: 0.5, accentShare: 0.03, cast: 0.22 };

/** A palette in the signal red, for a black and white picture (the About
    part's, home-hero.ts), which would otherwise give the mosaic greys
    alone. Each grey takes the red itself, dimmed to the grey's own depth
    (so its green and blue stay level and it reads as red, not as the rose
    a red greyed to the same lightness would), and is laid lightly over
    the grey (RED_OVER): a touch in the dark ones, a little more in the
    lighter, so the red is an air in the field rather than its colour. One
    rarer accent, the red itself dimmed, joins them in its place by
    lightness, and the cast takes a hint of the red as well. Still dark,
    still the picture's own values, its shares as they were. */
export function redTone(palette: HeroPalette | null): HeroPalette | null {
  if (!palette) return palette;
  const n = palette.palette.length;
  const value = ([r, g, b]: number[]) => (r + g + b) / 3;
  const whole = (c: number[]) => c.map(Math.round) as [number, number, number];
  // The red at a grey's depth, laid over the grey by `k`
  const redden = (rgb: number[], k: number) => {
    const v = value(rgb);
    const red = SIGNAL_RED.map((c) => Math.min(255, c * (v / 128)));
    return whole(rgb.map((c, ch) => c + (red[ch] - c) * k));
  };
  const colours: HeroColour[] = palette.palette.map(({ rgb, share, accent }, i) => ({
    rgb: redden(rgb, RED_OVER.dark + (n > 1 ? i / (n - 1) : 0) * (RED_OVER.light - RED_OVER.dark)),
    share,
    accent,
  }));
  const red: HeroColour = { rgb: whole(SIGNAL_RED.map((c) => c * RED_OVER.accent)), share: RED_OVER.accentShare, accent: true };
  const at = colours.findIndex((c) => value(c.rgb) > value(red.rgb));
  colours.splice(at < 0 ? colours.length : at, 0, red);
  return { palette: colours, cast: redden(palette.cast, RED_OVER.cast) };
}

// A colour as the tesserae take it: its own hue, its saturation drawn out,
// its lightness held below the pale and, if it is coloured, lifted out of
// the dark (a neutral black stays black, a deep navy becomes a navy that
// shows)
function tone([r, g, b]: number[], accent: boolean): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  let l = (hi + lo) / 2;
  const c = hi - lo;
  let s = c === 0 ? 0 : c / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (c) {
    if (hi === r) h = ((g - b) / c + 6) % 6;
    else if (hi === g) h = (b - r) / c + 2;
    else h = (r - g) / c + 4;
  }
  s = Math.min(1, s * (accent ? VIVID * 1.2 : VIVID));
  l = Math.min(LIGHT_MAX, Math.max(l, LIGHT_LIFT * s));
  const k = (1 - Math.abs(2 * l - 1)) * s;
  const x = k * (1 - Math.abs((h % 2) - 1));
  const m = l - k / 2;
  const [r1, g1, b1] = h < 1 ? [k, x, 0] : h < 2 ? [x, k, 0] : h < 3 ? [0, k, x] : h < 4 ? [0, x, k] : h < 5 ? [x, 0, k] : [k, 0, x];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}
