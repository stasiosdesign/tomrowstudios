// -----------------------------------------
// SCRAMBLE HOVER (shared engine)
// -----------------------------------------
//
// One reusable binder for the "text decodes into itself" hover/focus effect
// used across the CTA, the nav, the footer and inline text links — based on
// the supplied Osmo "Text Scramble" resource's hover technique (a GSAP
// ScrambleTextPlugin tween landing back on the element's own text). Every
// caller goes through `bindScrambleHover()` below so there is exactly one
// scramble implementation on the site, not one per component.
//
// Markup contract (same attribute names as the Osmo resource):
//   data-scramble-hover="link"   — the element that gets the hover/focus
//   data-scramble-hover="target" — the descendant whose text is scrambled
//                                   (omit it when the link has no other
//                                   children — the link then scrambles
//                                   itself)
//   data-scramble-text="..."     — optional replacement text, otherwise the
//                                   element's own text is used. Read again on
//                                   every hover, so text rewritten in place
//                                   (the Studio's live preview does, with
//                                   this attribute) lands on the new words
//
// Design notes:
// - The tween always ends on the element's own source text — scrambleText's
//   `text` option *is* that text, so however a hover is interrupted, sped
//   up or repeated, the only text the element can ever settle on is the
//   right one. There is deliberately no separate "un-scramble on leave"
//   tween (unlike the resource's demo): button.js already shipped a hover
//   that scrambles in and stays revealed, and every other link here follows
//   that same one-shot shape for a consistent, simpler-to-reason-about
//   result — nothing to get stuck half-reverted if the pointer leaves mid-run.
// - A tween in flight is left alone rather than restarted (`gsap.isTweening`
//   guard) so hovering in and out rapidly can't stack overlapping timelines;
//   `overwrite: 'auto'` is still there as a backstop.
// - Binding is guarded per text element (`__scrambleHover`), so calling
//   `initScrambleHover()` again after a Barba navigation never double-binds
//   a node that (unusually) survived the swap.
// - Gated on a fine, hovering pointer and no reduced-motion preference —
//   touch devices and reduced-motion get plain, fully functional links with
//   no listeners attached at all.

if (typeof gsap !== 'undefined' && typeof ScrambleTextPlugin !== 'undefined') {
  gsap.registerPlugin(ScrambleTextPlugin);
}

const SCRAMBLE_HOVER_CHARS = 'upperCase';

function canScrambleHover() {
  if (typeof gsap === 'undefined' || typeof ScrambleTextPlugin === 'undefined') return false;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return finePointer && !reducedMotion;
}

// Binds the hover-scramble to one text element, triggered by `trigger`
// (which may be the text element itself, or an ancestor wrapping it plus
// icons/siblings that must stay untouched). Safe to call repeatedly for the
// same element — every binding after the first is a no-op.
function bindScrambleHover(trigger, textEl, opts = {}) {
  if (!trigger || !textEl) return;
  if (textEl.__scrambleHover) return;
  textEl.__scrambleHover = true;

  const originalText = textEl.getAttribute('data-scramble-text') || textEl.textContent.trim();
  if (!originalText) return; // nothing to scramble (e.g. an icon-only link)

  const duration = opts.duration ?? 0.45;
  const speed = opts.speed ?? 0.5;
  const chars = opts.chars || SCRAMBLE_HOVER_CHARS;

  const enter = () => {
    if (gsap.isTweening(textEl)) return; // already mid-run — let it finish
    const text = textEl.getAttribute('data-scramble-text') || originalText;
    gsap.to(textEl, {
      duration,
      ease: 'none',
      overwrite: 'auto',
      scrambleText: { text, chars, speed },
      // Belt-and-braces: guarantee the exact source text once the tween
      // settles, regardless of anything the plugin's own reveal left behind.
      onComplete: () => { textEl.textContent = text; },
    });
  };

  trigger.addEventListener('mouseenter', enter);
  // Keyboard users get the same response as the pointer, but only for a
  // focus the browser would ring — not one left behind by a click.
  trigger.addEventListener('focus', () => {
    if (trigger.matches(':focus-visible')) enter();
  });
}

// Auto-binds every `[data-scramble-hover="link"]` found in the document.
// Re-run after every Barba navigation (see transitions.js) so incoming
// pages get the effect; already-bound nodes are skipped via the per-element
// guard above, and Barba replaces this markup wholesale on navigation
// anyway, so there is nothing to unbind.
function initScrambleHover() {
  if (!canScrambleHover()) return;

  const links = document.querySelectorAll('[data-scramble-hover="link"]');

  links.forEach((link) => {
    const target = link.querySelector('[data-scramble-hover="target"]') || link;
    bindScrambleHover(link, target);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.fonts.ready.then(function () {
    initScrambleHover();
  });
});
