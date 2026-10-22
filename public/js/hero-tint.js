// -----------------------------------------
// THE HOME HERO'S LIGHT, IN ITS PICTURE'S COLOURS
// -----------------------------------------
//
// Behind the list hero (home-list.js, "The hero as a list" in style.css)
// the screen is light, as if shining through frosted glass from behind:
// soft, continuous and grained, in the lit picture's colours. The picture
// is not carried on or copied: it gives the light its palette and its cast,
// and the light lies under it as a field of its own, the picture standing in
// its frame on top of it.
//
// The light (after the references: a soft, grained light falling in, and a
// backlit pane with its seams):
//   - a broad light falling in from the upper right, soft-edged, in the
//     picture's cast;
//   - the picture's colours dispersed through it in loose, soft, flowing
//     drifts, no centre and no source, each colour gathering about as much
//     as its share of the picture, the field thicker and thinner in slow
//     swells, with some fuller pockets of colour and quieter ground between;
//   - the pane's seams: very soft darker bands down the page's column lines
//     and one across, so the light reads as coming through glass;
//   - and grain, fine, in the light itself, stronger where it is brighter.
// None of it is laid on a grid or a lattice: every pixel is worked out on
// its own from smooth, curving noise, so the light has no squares in it at
// any scale, sharp or blurred.
//
// Changing part, the colours turn to the next picture's in patches over the
// field, no wave from anywhere (at once with reduced motion). The light does
// not answer the mouse: the user had the lift under it taken out.
//
// The colours come with the page: each part's list item carries its
// picture's palette (data-tint-palette, read from the picture when the page
// was built: src/components/hero-palette.ts), so nothing is fetched or
// analysed here and the light is ready before the first paint.
//
// Drawing: WebGL, into one canvas the size of the screen (the surface is
// sticky and shows one screen of the hero), in two passes so it stays light
// on the machine: the light itself, which changes only over hundreds of
// pixels, worked out at every eighth pixel each way, then read smoothly at
// every pixel with the grain from a still tile of noise. No darker boxes
// behind the type or round the screen's edges (the user's call). Drawn only
// while the colours turn; never with a filter, a blend mode or a mask on it, so the browser
// composites one plain picture. Without WebGL the canvas holds only the
// light falling in, in the cast. The strengths are the variables on
// .home-reel.is--screen (style.css), read here. createHeroTint(root) is
// called by home-list.js, which tells it the lit part (show) and when the
// opening has handed over (reveal).
//
// Arriving at the home page by a page transition, the light is made
// earlier, by prepareHeroTint (transitions.js, beforeEnter): as soon as the
// new page is in the document, before it starts to come in, and painted at
// once in the first part's colours (prime), so the page comes in whole.
// home-list.js takes over the light made here (root.__heroTint) rather than
// making another.

function createHeroTint(root, options) {
  const reduced = !!(options && options.reduced);
  const surface = root.querySelector('.home-reel__surface-inner');
  const list = root.querySelector('[data-list]');
  const items = Array.from(root.querySelectorAll('[data-list-item]'));
  if (!surface || !list || !items.length) return null;

  let canvas = document.createElement('canvas');
  canvas.className = 'home-reel__tint';
  surface.prepend(canvas);

  // The strengths (style.css, .home-reel.is--screen), read once; each has
  // its own fallback, the value the home page uses
  const styles = getComputedStyle(root);
  const setting = (name, fallback) => {
    const v = parseFloat(styles.getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  const SET = {
    base: 14,                                     // the near-black (#0e0e0e), each channel
    glow: setting('--light-glow', 0.2),           // the light falling in, at its brightest, in the cast
    colour: setting('--light-colour', 0.3),       // the picture's colours dispersed through it
    floor: 0.35,                                  // how much of the colour shows where no light falls
    seams: setting('--light-seams', 0.24),        // how much light the pane's seams hold back
    grain: setting('--light-grain', 0.12),        // the grain, at its strongest (of the full range)
    span: setting('--light-span', 480),           // px a drift of one colour spans, about: broad pools, not veins
  };
  const SATURATE = setting('--light-saturate', 1.15); // the colours drawn out a little
  const TURN = 1400;          // ms a turn takes, from its first patch to its last
  const MAX = 8;              // colours a palette may bring

  let gpu = startGL(canvas, MAX);
  let pen = null;
  if (!gpu) {
    // No WebGL, or its shader would not build: a fresh canvas for the plain
    // drawing (a canvas that has been asked for WebGL cannot draw in 2D)
    const plain = document.createElement('canvas');
    plain.className = canvas.className;
    canvas.replaceWith(plain);
    canvas = plain;
    pen = canvas.getContext('2d');
    if (!pen) {
      canvas.remove();
      return null;
    }
  }

  // The colours drawn out a little (a CSS saturate, as a matrix), applied
  // once to each colour as a palette is read, never to the pixels
  const s = SATURATE;
  const M = [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ];
  const lightOf = (rgb) => {
    const d = [rgb[0] - SET.base, rgb[1] - SET.base, rgb[2] - SET.base];
    return [0, 1, 2].map((r) => Math.max(0, M[r * 3] * d[0] + M[r * 3 + 1] * d[1] + M[r * 3 + 2] * d[2]) / 255);
  };

  // ---- A part's palette, from its list item: its colours' light (over
  // the near-black, drawn out), their weights (accents a little sparser),
  // its cast, and a seed of its own so each part's drifts lie differently
  const NONE = { colours: [], weights: [], cast: [0, 0, 0], seed: 0 };
  const palettes = new Map();
  function paletteOf(k) {
    if (palettes.has(k)) return palettes.get(k);
    let read = null;
    try {
      const raw = items[k] && items[k].dataset.tintPalette;
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Array.isArray(parsed.palette) && parsed.palette.length) {
        const palette = parsed.palette.slice(0, MAX);
        read = {
          colours: palette.map((c) => lightOf(c.rgb)),
          weights: palette.map((c) => c.share * (c.accent ? 0.55 : 1)),
          cast: lightOf(parsed.cast || [SET.base, SET.base, SET.base]),
          seed: 11.3 * (k + 1),
        };
      }
    } catch (_) {
      read = null;
    }
    palettes.set(k, read);
    return read;
  }

  // ---- The screen's measure: its size and the pane's seams, thin darker
  // lines down and once across. They cross at the top left corner of the
  // part's name, just clear of it: the line down runs just left of the
  // hero's three blocks of type (the bar's pages, the name, the words under
  // it, all on one left edge), the line across just above the name. The
  // other lines down keep a column's step from it, and one more stands on
  // the left inset. None runs along the pictures' edges (it read as a
  // shadow cast by each picture): a line near the pictures' column, or
  // behind it, is left out
  let width = 0;
  let height = 0;
  let layout = null;
  function measure(force) {
    const w = surface.clientWidth;
    const h = surface.clientHeight;
    if (!force && w === width && h === height && layout) return false;
    width = w;
    height = h;
    const inset = 0.045 * w;
    const step = (w - 2 * inset) / 4;
    const seamWidth = Math.max(5, 0.0055 * w);
    // (measured in the screen's own pixels, even while a page transition
    // has the page scaled)
    const screenBox = surface.getBoundingClientRect();
    const scale = screenBox.width / w || 1;
    const boxOf = (selector) => {
      const el = root.querySelector(selector);
      const b = el && el.getBoundingClientRect();
      return b && b.width ? { left: (b.left - screenBox.left) / scale, top: (b.top - screenBox.top) / scale, right: (b.right - screenBox.left) / scale } : null;
    };
    const name = boxOf('.home-list__field.is--title');
    const shot = boxOf('.home-list__shot');
    const crossX = name ? name.left - 1.6 * seamWidth : inset + 2.5 * step;
    const crossY = name ? name.top - 1.2 * seamWidth : 0.42 * h;
    const clear = 4 * seamWidth;
    const away = (x) => !shot || x < shot.left - clear || x > shot.right + clear;
    const seamsX = [];
    for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
      const x = crossX + k * step;
      if (x > 0 && x < w && away(x)) seamsX.push(x);
    }
    if (away(inset) && seamsX.every((x) => Math.abs(x - inset) > step / 2)) seamsX.push(inset);
    while (seamsX.length < 5) seamsX.push(-1e4);
    layout = { seamsX: seamsX.slice(0, 5), seamY: crossY, seamWidth };
    if (gpu) gpu.resize(w, h, layout, SET);
    else {
      canvas.width = Math.max(1, Math.round(w / 8));
      canvas.height = Math.max(1, Math.round(h / 8));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    return true;
  }

  // ---- Drawing: the two palettes (from, to) and how far the turn between
  // them has gone
  let fromPal = NONE;
  let toPal = NONE;
  let progress = 1;
  function paint() {
    if (gpu) {
      gpu.draw({ from: fromPal, to: toPal, progress });
      return;
    }
    // Without WebGL: the light falling in, in the cast, and nothing more
    const cast = [0, 1, 2].map((ch) => fromPal.cast[ch] + (toPal.cast[ch] - fromPal.cast[ch]) * progress);
    const c = (k) => Math.round(SET.base + 255 * SET.glow * cast[k]);
    const g = pen.createRadialGradient(0.82 * canvas.width, 0.12 * canvas.height, 0, 0.82 * canvas.width, 0.12 * canvas.height, 0.9 * canvas.width);
    g.addColorStop(0, `rgb(${c(0)}, ${c(1)}, ${c(2)})`);
    g.addColorStop(1, `rgb(${SET.base}, ${SET.base}, ${SET.base})`);
    pen.fillStyle = g;
    pen.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ---- Turning, a frame at a time while it goes on
  let want = -1;
  let shown = -1;
  let revealed = false;
  let frame = 0;
  let turning = false;
  let started = 0;
  function wake() {
    if (!frame) frame = requestAnimationFrame(step);
  }
  function turnTo(next) {
    // A turn still going: it goes on from whichever side it was nearer
    fromPal = progress < 0.5 ? fromPal : toPal;
    toPal = next;
    if (reduced) {
      fromPal = next;
      progress = 1;
      paint();
      return;
    }
    progress = 0;
    started = performance.now();
    turning = true;
    wake();
  }
  function step(now) {
    frame = 0;
    progress = Math.min(1, (now - started) / TURN);
    if (progress >= 1) {
      fromPal = toPal;
      turning = false;
    }
    paint();
    if (turning) frame = requestAnimationFrame(step);
  }
  function settle() {
    if (!revealed || want < 0 || want === shown) return;
    const next = paletteOf(want);
    if (!next) return;
    shown = want;
    turnTo(next);
  }

  // A new size: measured again, and drawn at once
  const resize = new ResizeObserver(() => {
    if (measure()) paint();
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
    // The opening has handed over: the light comes in over the dark
    reveal() {
      if (revealed) return;
      revealed = true;
      // The type in its place now the opening has gone: the seams measured
      // from it again
      measure(true);
      paint();
      settle();
    },
    // Arriving by a page transition (prepareHeroTint): part k's light
    // painted at once, revealed, nothing turning in from the dark
    prime(k) {
      if (revealed) return;
      const pal = paletteOf(k);
      if (!pal) return;
      revealed = true;
      want = shown = k;
      fromPal = toPal = pal;
      progress = 1;
      paint();
    },
    destroy() {
      resize.disconnect();
      cancelAnimationFrame(frame);
      if (gpu) gpu.release();
    },
  };
}

// The light, drawn in two passes. The field (the light falling in, the
// pane's seams, the two palettes' colours in their drifts, the turn between
// them in patches) changes only over hundreds of
// pixels, so it is worked out once every STEP pixels each way, into a small
// texture: about a sixty-fourth of the work. The drifts are smooth simplex
// noise at a broad scale, unwarped (the user found warped drifts read as
// marble). The screen pass then reads that texture smoothly at every pixel
// and adds the grain from a still tile of noise, stronger where the light is
// brighter: two reads a pixel. Returns null where WebGL is not to be had.
function startGL(canvas, max) {
  const STEP = 8;
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const vertex = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';
  const fieldSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define MAX ${max}
uniform vec2 size, res;
uniform float base, glow, colourGain, floorShare, span;
uniform vec3 fromColours[MAX], toColours[MAX];
uniform float fromWeights[MAX], toWeights[MAX];
uniform vec3 fromCast, toCast;
uniform float fromSeed, toSeed, progress;

// Simplex noise, 2D (Ashima Arts / Stefan Gustavson, MIT)
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float n01(vec2 v) { return 0.5 + 0.5 * snoise(v); }

// A palette's colour at a point, and the field's strength there: each
// colour leaning in where its own broad, unwarped noise is high, in
// proportion to its share, always blended with the rest (no edges, no veins),
// a little more gathered where it is high than spread (the n^3.5); the
// strength swelling a little more between fuller pockets and quieter ground
// (0.66 to 1.34 of the colour, about the same on average), so the field is
// not even all over
vec4 palette(vec2 q, float seed, vec3 colours[MAX], float weights[MAX]) {
  vec3 sum = vec3(0.0);
  float total = 0.000001;
  for (int j = 0; j < MAX; j++) {
    if (weights[j] <= 0.0) continue;
    float n = n01(q + vec2(3.7 * float(j), 1.9 * float(j)) + seed);
    float w = weights[j] * (0.1 + 2.2 * n * n * n * sqrt(n));
    sum += colours[j] * w;
    total += w;
  }
  return vec4(sum / total, 0.66 + 0.68 * smoothstep(0.12, 0.9, n01(q * 0.68 + seed + 41.0)));
}

void main() {
  // This sample's place on the screen, in CSS px from the top left
  vec2 fc = gl_FragCoord.xy / res * size;
  vec2 px = vec2(fc.x, size.y - fc.y);
  vec2 uv = px / size;
  // The light falling in, from the upper right, never quite dark
  float r = length((uv - vec2(0.82, 0.12)) / vec2(0.78, 1.05));
  float light = 0.12 + 0.88 * (1.0 - smoothstep(0.08, 1.0, r));
  // The colours: the two palettes, turned from one to the other in patches
  // (at rest, only the one)
  vec2 at = px / span;
  vec4 c;
  if (progress >= 1.0) {
    c = palette(at, toSeed, toColours, toWeights);
  } else {
    float turned = smoothstep(0.0, 1.0, progress * 1.6 - 0.6 * n01(px / 260.0 + 91.0));
    vec4 a = palette(at, fromSeed, fromColours, fromWeights);
    vec4 b = palette(at, toSeed, toColours, toWeights);
    c = mix(a, b, turned);
  }
  vec3 tint = mix(fromCast, toCast, smoothstep(0.0, 1.0, progress));
  float strength = colourGain * c.a * (floorShare + (1.0 - floorShare) * light);
  vec3 col = glow * light * tint + strength * c.rgb + base / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;
  // The screen pass: the field read smoothly, the pane's seams, and the
  // grain. The seams are drawn here, at every pixel, for their fine
  // profile: as a frame seen through the frosted glass, each a narrow dark
  // core, a soft shade falling away from the light (it comes from the upper
  // right, so to the left of a line down and under the line across), a
  // faint hairline catching the light on the other side, and round each a
  // wide soft spill of light escaping from behind (more where they cross);
  // a little uneven along its length. They hold back or let out the light,
  // never the near-black under it
  const screenSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D field, grain;
uniform vec2 size;
uniform float grainAmount, base, seams, seamWidth, seamY;
uniform float seamX[5];
// A seam's profile across it: d from its middle, toward the light; how
// much it darkens (x), how much its lit edge brightens (y), and the light
// escaping round it from behind (z): a wide, soft spill on both sides,
// more on the light's side
vec3 profile(float d, float w) {
  float a = d / (0.55 * w);
  float b = (d + 1.3 * w) / (1.7 * w);
  float c = (d - 1.05 * w) / (0.32 * w);
  float e = (d - 2.2 * w) / (4.2 * w);
  float f = (d + 2.0 * w) / (3.2 * w);
  return vec3(max(exp(-a * a), 0.3 * exp(-b * b)), exp(-c * c), max(exp(-e * e), 0.55 * exp(-f * f)));
}
float uneven(float t, float k) {
  return 0.82 + 0.18 * sin(t * 0.0061 + k * 2.3) * sin(t * 0.0143 + k);
}
void main() {
  vec3 col = texture2D(field, gl_FragCoord.xy / size).rgb;
  vec2 px = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y);
  vec3 down = vec3(0.0);
  for (int k = 0; k < 5; k++) {
    down = max(down, profile(px.x - seamX[k], seamWidth) * uneven(px.y, float(k)));
  }
  vec3 across = 0.8 * profile(seamY - px.y, 1.15 * seamWidth) * uneven(px.x, 7.0);
  vec3 seam = max(down, across);
  // Where a line down meets the line across, a little more light gets out
  float spill = seam.z + 0.6 * down.z * across.z;
  vec3 floor3 = vec3(base / 255.0);
  col = floor3 + (col - floor3) * (1.0 - seams * seam.x + 0.45 * seams * seam.y + 0.28 * spill);
  float n = texture2D(grain, px / 256.0).r - 0.5;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col += n * grainAmount * (0.35 + 0.65 * sqrt(lum));
  gl_FragColor = vec4(col, 1.0);
}`;
  const compile = (type, source) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const build = (source) => {
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, source);
    if (!vs || !fs) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'p');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    const found = {};
    return { program, u: (name) => (name in found ? found[name] : (found[name] = gl.getUniformLocation(program, name))) };
  };
  const field = build(fieldSource);
  const screen = build(screenSource);
  if (!field || !screen) return null;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const texture = (unit, filter, wrap) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  };
  // The grain (unit 1): a still tile of noise, repeated over the screen
  texture(1, gl.NEAREST, gl.REPEAT);
  const tile = new Uint8Array(256 * 256);
  for (let i = 0; i < tile.length; i++) tile[i] = Math.random() * 256;
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 256, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, tile);
  // The field (unit 0), drawn into through a framebuffer, read smoothly
  const fieldTexture = texture(0, gl.LINEAR, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const target = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, target);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTexture, 0);
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!complete) return null;

  gl.useProgram(screen.program);
  gl.uniform1i(screen.u('field'), 0);
  gl.uniform1i(screen.u('grain'), 1);
  const u = field.u;
  let fieldW = 1;
  let fieldH = 1;
  const flat = (list, count, fill) => {
    const out = new Float32Array(count * fill.length);
    for (let i = 0; i < count; i++) for (let k = 0; k < fill.length; k++) out[i * fill.length + k] = list[i] ? (Array.isArray(list[i]) ? list[i][k] : list[i]) : fill[k];
    return out;
  };
  const sendPalette = (side, pal) => {
    gl.uniform3fv(u(`${side}Colours`), flat(pal.colours, max, [0, 0, 0]));
    gl.uniform1fv(u(`${side}Weights`), flat(pal.weights, max, [0]));
    gl.uniform3fv(u(`${side}Cast`), pal.cast);
    gl.uniform1f(u(`${side}Seed`), pal.seed);
  };
  let sentFrom = null;
  let sentTo = null;

  return {
    // The canvas at the screen's CSS pixels (the grain a pixel a grain),
    // the field a sample every STEP of them, and what stays put while the
    // size does
    resize(w, h, layout, set) {
      canvas.width = Math.max(1, Math.round(w));
      canvas.height = Math.max(1, Math.round(h));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      fieldW = Math.max(1, Math.ceil(canvas.width / STEP));
      fieldH = Math.max(1, Math.ceil(canvas.height / STEP));
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fieldW, fieldH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.useProgram(field.program);
      gl.uniform2f(u('size'), canvas.width, canvas.height);
      gl.uniform2f(u('res'), fieldW, fieldH);
      gl.uniform1f(u('base'), set.base);
      gl.uniform1f(u('glow'), set.glow);
      gl.uniform1f(u('colourGain'), set.colour);
      gl.uniform1f(u('floorShare'), set.floor);
      gl.uniform1f(u('span'), set.span);
      gl.useProgram(screen.program);
      gl.uniform2f(screen.u('size'), canvas.width, canvas.height);
      gl.uniform1f(screen.u('grainAmount'), set.grain);
      gl.uniform1f(screen.u('base'), set.base);
      gl.uniform1f(screen.u('seams'), set.seams);
      gl.uniform1fv(screen.u('seamX'), new Float32Array(layout.seamsX));
      gl.uniform1f(screen.u('seamY'), layout.seamY);
      gl.uniform1f(screen.u('seamWidth'), layout.seamWidth);
    },
    draw(state) {
      gl.useProgram(field.program);
      if (state.from !== sentFrom) { sendPalette('from', state.from); sentFrom = state.from; }
      if (state.to !== sentTo) { sendPalette('to', state.to); sentTo = state.to; }
      gl.uniform1f(u('progress'), state.progress);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.viewport(0, 0, fieldW, fieldH);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(screen.program);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    release() {
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    },
  };
}

// The home page arriving by a page transition (transitions.js, beforeEnter):
// its light made now and painted at once in the first part's colours (the
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
