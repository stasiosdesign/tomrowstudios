/* Slide-out side panels (case study + contact), animated with GSAP.
   Triggers:  <a data-panel-open="contact">   Closers: [data-panel-close] or Escape

   Lifecycle. The panels are part of each page, so initSidePanels() binds the
   incoming page's on every navigation (transitions.js); triggers are bound
   once each. Nothing is set up front: a panel is display: none until it
   opens, and opening it parks its parts before showing it, so a page with
   many panels costs nothing until one is used. Escape is listened for once,
   for whichever panel is open. A panel's own smooth scrolling (Lenis, which
   runs a frame loop of its own) exists only while the panel is open. Leaving
   the page with a panel open (lifecycle.js) gives the page its scrolling
   back. Timing and easing are GSAP's defaults, set in transitions.js. */

let openPanel = null;

/* Smooth scrolling inside the panel's own scroll area. Lenis measures the
   viewport from the wrapper's client size and the content from its scroll
   size, so the same element can serve as both. */
function createNestedLenis(el) {
  if (!el || typeof window.Lenis === "undefined") return null;
  if (!el.__lenis) {
    el.__lenis = new Lenis({
      wrapper: el,
      content: el,
      lerp: 0.165,
      wheelMultiplier: 1.25,
      autoRaf: true
    });
  }
  return el.__lenis;
}

function destroyNestedLenis(el) {
  if (el && el.__lenis) {
    el.__lenis.destroy();
    el.__lenis = null;
  }
}

/* The page's own Lenis hijacks the wheel for the whole document, so it is
   paused while a panel is open — otherwise the page behind scrolls instead */
function pausePageScroll() {
  if (window.lenis) window.lenis.stop();
  document.body.style.overflow = "hidden";
}
function resumePageScroll() {
  if (window.lenis) window.lenis.start();
  document.body.style.overflow = "";
}

function initSidePanels() {
  const panels = document.querySelectorAll("[data-panel]");
  const hasGsap = !!window.gsap;

  panels.forEach(function (panel) {
    if (panel.__panel) return;
    panel.__panel = true;

    const dialog = panel.querySelector("[data-panel-dialog]");
    const overlay = panel.querySelector("[data-panel-backdrop]");
    const sheets = panel.querySelectorAll("[data-panel-bg]");
    const content = panel.querySelector("[data-panel-inner]");
    const closeBtn = panel.querySelector(".panel-close");
    const reveal = closeBtn ? [content, closeBtn] : [content];
    let tl = null;

    panel.open = function () {
      if (openPanel && openPanel !== panel) openPanel.close();
      openPanel = panel;
      panel.setAttribute("data-panel-state", "open");
      pausePageScroll();

      // Smooth scrolling for the panel's own scroll area
      const panelLenis = createNestedLenis(content);
      if (panelLenis) {
        panelLenis.scrollTo(0, { immediate: true });
        panelLenis.resize();
      } else if (content) {
        content.scrollTop = 0;
      }

      if (!hasGsap) {
        panel.style.display = "block";
        return;
      }

      tl = tl || gsap.timeline();
      tl.clear()
        .set(sheets, { xPercent: 101 })
        .set(reveal, { autoAlpha: 0 }, "<")
        .set(overlay, { autoAlpha: 0 }, "<")
        .set(dialog, { xPercent: 0 }, "<")
        .set(panel, { display: "block" }, "<")
        .to(overlay, { autoAlpha: 1 }, "<")
        .to(sheets, { xPercent: 0, stagger: 0.12, duration: 0.575 }, "<")
        .fromTo(content, { xPercent: 15 }, { xPercent: 0 }, "<+=0.35")
        .to(reveal, { autoAlpha: 1 }, "<");
    };

    panel.close = function () {
      panel.setAttribute("data-panel-state", "closed");
      resumePageScroll();
      destroyNestedLenis(content);
      if (openPanel === panel) openPanel = null;

      if (!hasGsap || !tl) {
        panel.style.display = "none";
        return;
      }

      tl.clear()
        .to(overlay, { autoAlpha: 0 })
        .to(dialog, { xPercent: 120 }, "<")
        .set(panel, { display: "none" })
        .set(reveal, { autoAlpha: 0 })
        .set(sheets, { xPercent: 101 })
        .set(content, { clearProps: "xPercent" });
    };

    panel.querySelectorAll("[data-panel-close]").forEach(function (closer) {
      closer.addEventListener("click", function (e) {
        e.preventDefault();
        panel.close();
      });
    });

    if (typeof onPageLeave === "function") {
      onPageLeave(function () {
        if (tl) tl.kill();
        destroyNestedLenis(content);
        if (openPanel === panel) {
          openPanel = null;
          resumePageScroll();
        }
      });
    }
  });

  // Any link or button that opens a panel by id
  document.querySelectorAll("[data-panel-open]").forEach(function (trigger) {
    if (trigger.__panelTrigger) return;
    trigger.__panelTrigger = true;
    trigger.addEventListener("click", function (e) {
      const target = document.getElementById(trigger.getAttribute("data-panel-open"));
      if (!target || typeof target.open !== "function") return; // fall through to the href
      e.preventDefault();
      target.open();
    });
  });
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && openPanel) openPanel.close();
});

document.addEventListener("DOMContentLoaded", initSidePanels);
