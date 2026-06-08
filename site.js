/* Samuel Falade — shared site behavior: nav shrink, scroll reveal, stat count-up */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* glass nav: shrink on scroll */
  var nav = document.querySelector("nav.site");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* scroll reveal with staggering, respecting reduced motion */
  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sibs = el.parentNode
          ? Array.prototype.slice.call(el.parentNode.children).filter(function (c) { return c.classList && c.classList.contains("reveal"); })
          : [el];
        var idx = sibs.indexOf(el);
        el.style.transitionDelay = (idx > 0 ? idx * 80 : 0) + "ms";
        el.classList.add("in");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* stat count-up */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-target")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = target.toLocaleString() + suffix; return; }
    var dur = 1500, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var stats = Array.prototype.slice.call(document.querySelectorAll(".stat-num"));
  if (stats.length) {
    if (reduce || !("IntersectionObserver" in window)) {
      stats.forEach(countUp);
    } else {
      var so = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); so.unobserve(e.target); } });
      }, { threshold: 0.5 });
      stats.forEach(function (s) { so.observe(s); });
    }
  }
})();
