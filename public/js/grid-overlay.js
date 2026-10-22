/* Design review mode (Shift + G) — temporary development aid. The file
   keeps the name of the grid overlay it grew out of; the grid itself is
   gone.

   Shift + G fades the whole site behind a translucent white and lays the
   design notes over it (src/components/design-notes.ts, in the page as
   JSON, #design-notes-data): cards, each set beside the element it is
   about, in one fixed layer over everything (style.css, "Design notes").
   While they show, a frame loop reads each target's box and moves its card
   there, so the cards keep to their elements through the scroll, the
   pinned and moving sections and a Barba navigation (the page's container
   is checked every frame, and a new one gets its own notes). Pressing it
   again hides it all. The state is kept in localStorage, so the mode stays
   as you left it across reloads. Desktop only (992px and up); hidden,
   nothing runs.

   The markup sits outside [data-barba="container"], so a Barba navigation
   leaves it in place: this initialises once on DOMContentLoaded. Never on
   production (BaseLayout.astro leaves the markup and this file out). */
function initDesignNotes() {
  const layer = document.querySelector("[data-design-notes]");
  const data = document.getElementById("design-notes-data");
  if (!layer || !data) return;
  let notes = [];
  try { notes = JSON.parse(data.textContent || "[]"); } catch (e) { return; }

  const storageKey = "designReviewState";
  const desktop = window.matchMedia("(min-width: 992px)");
  const EDGE = 16; // px kept clear of the screen's sides
  // The mark at the head of every card: an "i" in a ring, on a black square
  const ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="8" r="1.15" fill="currentColor"/></svg>';
  let open = false;
  let frame = 0;
  let container = null;
  let placed = []; // { note, target, card, w, h, x, y }

  function build() {
    container = document.querySelector('[data-barba="container"]:last-of-type') || document.body;
    const page = container.getAttribute("data-barba-namespace") || "";
    layer.replaceChildren();
    placed = [];
    notes.filter((note) => note.page === page || note.page === "*").forEach((note) => {
      const target = container.querySelector(note.target);
      if (!target) return;
      const card = document.createElement("div");
      card.className = "design-note";
      const icon = document.createElement("span");
      icon.className = "design-note__icon";
      icon.innerHTML = ICON;
      const text = document.createElement("p");
      text.className = "design-note__text";
      text.textContent = note.text;
      card.append(icon, text);
      layer.append(card);
      placed.push({ note, target, card, w: 0, h: 0, x: NaN, y: NaN });
    });
    measure();
  }
  // The cards' sizes, read again whenever the window's changes (they are
  // set in rem, which follows the screen's width)
  function measure() {
    placed.forEach((p) => { p.w = p.card.offsetWidth; p.h = p.card.offsetHeight; p.x = NaN; });
  }
  window.addEventListener("resize", () => { if (open) measure(); });

  function place() {
    const current = document.querySelector('[data-barba="container"]:last-of-type');
    if (current && current !== container) build();
    const vw = document.documentElement.clientWidth;
    placed.forEach((p) => {
      // Shown only while its element is: laid out, and not hidden (a caption
      // that is only there while its picture is, say)
      const r = p.target.getBoundingClientRect();
      const visible = r.width > 0 && r.height > 0 && getComputedStyle(p.target).visibility !== "hidden";
      p.card.classList.toggle("is--off", !visible);
      if (!visible) return;
      const [ys, xs] = (p.note.at || "top-right").split("-");
      const [dx, dy] = p.note.offset || [0, 0];
      let x = xs === "left" ? r.left : xs === "right" ? r.right - p.w : xs === "after" ? r.right : r.left - p.w;
      if (xs === "before") x -= 2 * dx; // the nudge away from the target, either side
      let y = ys === "top" ? r.top : ys === "bottom" ? r.bottom - p.h : ys === "below" ? r.bottom : r.top - p.h;
      x = Math.round(Math.max(EDGE, Math.min(vw - p.w - EDGE, x + dx)));
      y = Math.round(y + dy);
      if (x === p.x && y === p.y) return;
      p.x = x;
      p.y = y;
      p.card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
    frame = requestAnimationFrame(place);
  }

  // On, the cards placed before the layer fades in; off, the loop stops
  function show() {
    if (!desktop.matches) return;
    build();
    cancelAnimationFrame(frame);
    place();
    layer.classList.add("is--shown");
  }
  function hide() {
    layer.classList.remove("is--shown");
    cancelAnimationFrame(frame);
  }
  function toggle() {
    open = !open;
    try { localStorage.setItem(storageKey, open ? "open" : "closed"); } catch (e) {}
    if (open) show();
    else hide();
  }

  try { open = localStorage.getItem(storageKey) === "open"; } catch (e) {}
  if (open) show();
  // Across the desktop breakpoint: shown again above it if the mode is on
  desktop.addEventListener("change", () => { if (open && desktop.matches) show(); else hide(); });

  function isTypingContext(e) {
    const el = e.target;
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  }
  window.addEventListener("keydown", (e) => {
    if (isTypingContext(e)) return;
    if (!(e.shiftKey && (e.key || "").toLowerCase() === "g")) return;
    e.preventDefault();
    toggle();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initDesignNotes();
});
