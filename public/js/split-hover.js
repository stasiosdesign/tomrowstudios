// -----------------------------------------
// MASKED LABEL ROLL ON HOVER (shared engine)
// -----------------------------------------
//
// One reusable binder for the hover/focus effect on the CTA, the nav, the
// footer and inline text links: the label is split into lines, each line
// masked, and on hover the whole label rolls as one — it slides up out of
// its mask and rises back in from below, every word together, never letter
// by letter or word by word. Built on the Osmo "Masked Text Reveal" resource
// (GSAP SplitText): `SplitText.create` with `autoSplit` and `mask: 'lines'`,
// the lines moved by yPercent through their masks. Every caller goes through
// `bindSplitHover()`, so there is one implementation on the site.
//
// Markup contract:
//   data-split-hover="link"    — the element that gets the hover/focus
//   data-split-hover="target"  — the descendant whose label rolls (omit it
//                                 when the link has no other children: the
//                                 link then rolls itself)
//
// Design notes:
// - Every entry gets a response, and none jumps. A hover builds the roll
//   from wherever the label is at that moment: at rest, or on its way out,
//   it leaves by the top and comes back in from below; already coming back
//   in, it simply carries on rising. The swap from above the mask to below
//   it happens while the label is hidden. A new hover replaces the old roll
//   outright, so animations never overlap, and every roll ends with the
//   label at rest, so text can never be left hidden. A label that wraps
//   onto two lines moves both lines at once.
// - Entries are found from the pointer's own path, not from mouseenter.
//   The browser fires mouseenter only for what is under the pointer when it
//   samples it, about once a frame, so a quick flick across a column of
//   short links skips the ones it jumped over. Here every raw sample of the
//   movement (getCoalescedEvents) is used and the gaps between samples are
//   walked a few pixels at a time, so a link the pointer crossed is entered
//   even if it was never under it at a sample.
// - A label is split the first time it rolls, not when its page arrives:
//   measuring every label's lines up front was the slowest part of a page
//   change. `autoSplit` then re-splits when its width changes or fonts load,
//   reverting first, so resizing never nests wrappers; `onSplit` drops the
//   roll in flight, and the fresh lines start at rest. The splits are killed
//   when the page is left (lifecycle.js). SplitText's own `aria` handling
//   keeps the label's text readable to screen readers.
// - Text rewritten in place (the Studio's live preview sets a label's text)
//   replaces the split; the next hover notices and splits the new text.
// - Binding is guarded per text element (`__splitHover`), so running
//   `initSplitHover()` again after a Barba navigation never double-binds.
// - Gated on a fine, hovering pointer and no reduced-motion preference —
//   touch devices and reduced motion keep plain text, never split at all.

// The exit moves from its first frame: an ease-in here (it was power2.in)
// barely shifts the label for its first tenth of a second, which reads as
// the hover arriving late. Even speed out, then a long settle in, at about
// the speed the exit left at, so the two read as one movement.
const SPLIT_HOVER = {
  exit: 0.18,            // seconds for a label at rest to leave by the top
  exitEase: 'none',
  enter: 0.6,            // seconds to rise back in from below
  enterEase: 'power3.out',
  step: 6,               // px between points walked along the pointer's path
};

if (typeof gsap !== 'undefined' && typeof SplitText !== 'undefined') {
  gsap.registerPlugin(SplitText);
}

function canSplitHover() {
  if (typeof gsap === 'undefined' || typeof SplitText === 'undefined') return false;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return finePointer && !reducedMotion;
}

// Binds the roll to one text element, played by `trigger` (the text element
// itself, or an ancestor wrapping it plus icons or siblings that must stay
// untouched). Safe to call repeatedly for the same element.
function bindSplitHover(trigger, textEl) {
  if (!trigger || !textEl || textEl.__splitHover) return;
  if (!textEl.textContent.trim()) return; // nothing to roll (an icon-only link)

  const state = { split: null, roll: null };
  textEl.__splitHover = state;

  const create = () => SplitText.create(textEl, {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    linesClass: 'split-line',
    onSplit() {
      if (state.roll) state.roll.kill();
      state.roll = null;
    },
  });

  // Split on first use, not on arrival: measuring every label's lines as a
  // page comes in was the costliest step of a page change. Later, if the
  // live preview has replaced the text, split the new text, keeping it.
  const current = () => {
    if (!state.split) {
      state.split = create();
      return;
    }
    const lines = state.split.lines;
    if (lines.length && textEl.contains(lines[0])) return;
    const text = textEl.textContent;
    state.split.revert();
    textEl.textContent = text;
    state.split = create();
  };

  const roll = () => {
    current();
    const lines = state.split.lines;
    if (!lines.length) return;
    if (state.roll) state.roll.kill();

    // The lines always move together, so one reading stands for all of
    // them: 110 below the mask, 0 at rest, -110 above it
    const y = gsap.getProperty(lines[0], 'yPercent') || 0;
    const tl = gsap.timeline({ onComplete: () => { state.roll = null; } });
    if (y > 0.5) {
      // Still coming in from below (or waiting there): carry on up, at
      // once, over what is left of the way
      tl.to(lines, { yPercent: 0, duration: SPLIT_HOVER.enter * Math.min(1, Math.max(0.3, y / 110)), ease: SPLIT_HOVER.enterEase });
    } else {
      // At rest or on its way out: out of the top, over what is left of the
      // way, then in from below
      const exit = SPLIT_HOVER.exit * Math.max(0.1, (y + 110) / 110);
      tl.to(lines, { yPercent: -110, duration: exit, ease: SPLIT_HOVER.exitEase })
        .set(lines, { yPercent: 110 })
        .to(lines, { yPercent: 0, duration: SPLIT_HOVER.enter, ease: SPLIT_HOVER.enterEase });
    }
    state.roll = tl;
  };

  trigger.__splitHoverRoll = roll;
  // Keyboard users get the same response as the pointer, but only for a
  // focus the browser would ring — not one left behind by a click.
  trigger.addEventListener('focus', () => {
    if (trigger.matches(':focus-visible')) roll();
  });

  // autoSplit keeps watching the label's size; stop it when the page goes
  if (typeof onPageLeave === 'function') {
    onPageLeave(() => {
      if (state.roll) state.roll.kill();
      if (state.split) state.split.kill();
    });
  }
}

// The pointer's path, walked for links it enters (see the design notes)
const splitHoverPointer = { link: null, x: null, y: null };

function splitHoverLinkAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const link = el && el.closest('[data-split-hover="link"]');
  return link && link.__splitHoverRoll ? link : null;
}

function splitHoverVisit(x, y) {
  const link = splitHoverLinkAt(x, y);
  if (link !== splitHoverPointer.link && link) link.__splitHoverRoll();
  splitHoverPointer.link = link;
}

function splitHoverMove(event) {
  if (event.pointerType && event.pointerType !== 'mouse') return;
  const samples = (event.getCoalescedEvents && event.getCoalescedEvents()) || [];
  (samples.length ? samples : [event]).forEach((sample) => {
    const { clientX: x, clientY: y } = sample;
    const { x: px, y: py } = splitHoverPointer;
    if (px !== null) {
      // At most 24 hit tests a sample: a flick across the whole screen is
      // walked every 6px near a link's size anyway, and each test can
      // force a layout
      const steps = Math.min(24, Math.floor(Math.hypot(x - px, y - py) / SPLIT_HOVER.step));
      for (let s = 1; s < steps; s++) {
        splitHoverVisit(px + ((x - px) * s) / steps, py + ((y - py) * s) / steps);
      }
    }
    splitHoverVisit(x, y);
    splitHoverPointer.x = x;
    splitHoverPointer.y = y;
  });
}

function splitHoverOut(event) {
  // Off the page: the next entry starts afresh
  if (!event.relatedTarget) {
    splitHoverPointer.link = null;
    splitHoverPointer.x = splitHoverPointer.y = null;
  }
}

// Binds every `[data-split-hover="link"]` in the document. Re-run after
// every Barba navigation (see transitions.js) so incoming pages get the
// effect; bound nodes are skipped by the guard above. The pointer watcher
// is added once, for the whole document.
function initSplitHover() {
  if (!canSplitHover()) return;
  document.querySelectorAll('[data-split-hover="link"]').forEach((link) => {
    const target = link.querySelector('[data-split-hover="target"]') || link;
    bindSplitHover(link, target);
  });
  if (!splitHoverPointer.watching) {
    splitHoverPointer.watching = true;
    document.addEventListener('pointermove', splitHoverMove, { passive: true });
    document.addEventListener('pointerout', splitHoverOut, { passive: true });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.fonts.ready.then(initSplitHover);
});
