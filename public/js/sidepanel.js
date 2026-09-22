/* Slide-out side panels (case study + contact), animated with GSAP.
   Triggers:  <a data-panel-open="contact">   Closers: [data-panel-close] or Escape */

if (window.gsap && window.CustomEase) {
  gsap.registerPlugin(CustomEase);
  CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");
  gsap.defaults({ ease: "main", duration: 0.7 });
}

/* Smooth scrolling inside an element that scrolls on its own (a panel, the
   menu). Lenis measures the viewport from the wrapper's client size and the
   content from its scroll size, so the same element can serve as both. */
function createNestedLenis(el) {
  if (!el || typeof window.Lenis === "undefined") return null;
  if (el.__lenis) return el.__lenis;

  el.__lenis = new Lenis({
    wrapper: el,
    content: el,
    lerp: 0.165,
    wheelMultiplier: 1.25,
    autoRaf: true
  });

  return el.__lenis;
}

function initSidePanels() {
  var panels = document.querySelectorAll("[data-panel]");
  if (!panels.length) return;

  var hasGsap = !!window.gsap;
  var openPanel = null;

  // Lenis hijacks the wheel for the whole document, so pause it while a panel
  // is open — otherwise the page behind scrolls instead of the panel.
  function getLenis() {
    if (window.lenis) return window.lenis;
    try { return lenis; } catch (e) { return null; }
  }
  function pausePageScroll() {
    var l = getLenis();
    if (l && l.stop) l.stop();
    document.body.style.overflow = "hidden";
  }
  function resumePageScroll() {
    var l = getLenis();
    if (l && l.start) l.start();
    document.body.style.overflow = "";
  }

  panels.forEach(function (panel) {
    var dialog = panel.querySelector("[data-panel-dialog]");
    var overlay = panel.querySelector("[data-panel-backdrop]");
    var sheets = panel.querySelectorAll("[data-panel-bg]");
    var content = panel.querySelector("[data-panel-inner]");
    var closeBtn = panel.querySelector(".panel-close");
    var reveal = closeBtn ? [content, closeBtn] : [content];
    var tl = hasGsap ? gsap.timeline() : null;

    // Park everything off-screen / hidden up front so nothing can paint on the
    // frame where the panel becomes visible.
    if (hasGsap) {
      gsap.set(sheets, { xPercent: 101 });
      gsap.set(reveal, { autoAlpha: 0 });
    }

    panel.open = function () {
      if (openPanel && openPanel !== panel) openPanel.close();
      openPanel = panel;
      panel.setAttribute("data-panel-state", "open");
      pausePageScroll();

      // Smooth scrolling for the panel's own scroll area
      var panelLenis = createNestedLenis(content);
      if (panelLenis) {
        panelLenis.scrollTo(0, { immediate: true });
        panelLenis.resize();
        panelLenis.start();
      } else if (content) {
        content.scrollTop = 0;
      }

      if (!hasGsap) {
        panel.style.display = "block";
        return;
      }

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
      if (content && content.__lenis) content.__lenis.stop();
      if (openPanel === panel) openPanel = null;

      if (!hasGsap) {
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
  });

  // Any link or button that opens a panel by id
  document.querySelectorAll("[data-panel-open]").forEach(function (trigger) {
    trigger.addEventListener("click", function (e) {
      var target = document.getElementById(trigger.getAttribute("data-panel-open"));
      if (!target) return; // fall through to the href so the link still works
      e.preventDefault();
      target.open();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openPanel) openPanel.close();
  });
}

document.addEventListener("DOMContentLoaded", initSidePanels);
