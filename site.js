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

  /* in-page embed overlay (keeps visitors on-site) */
  var triggers = Array.prototype.slice.call(document.querySelectorAll("[data-embed]"));
  if (triggers.length) {
    var modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML =
      '<div class="modal-backdrop" data-close></div>' +
      '<div class="modal-panel" role="dialog" aria-modal="true" aria-label="Interactive prototype">' +
        '<div class="modal-head"><span class="mt"></span><div class="actions">' +
          '<a class="newtab" target="_blank" rel="noopener">Open in new tab ↗</a>' +
          '<button class="modal-close" type="button" aria-label="Close" data-close>×</button>' +
        '</div></div>' +
        '<div class="modal-body"></div>' +
      '</div>';
    document.body.appendChild(modal);
    var mBody = modal.querySelector(".modal-body");
    var mTitle = modal.querySelector(".mt");
    var mNewtab = modal.querySelector(".newtab");
    var lastFocus = null;

    function openModal(src, title, link) {
      lastFocus = document.activeElement;
      mTitle.textContent = title || "";
      mNewtab.href = link || src;
      var f = document.createElement("iframe");
      f.setAttribute("allow", "autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture");
      f.setAttribute("allowfullscreen", "");
      f.setAttribute("loading", "lazy");
      f.src = src;
      mBody.appendChild(f);
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
      modal.querySelector(".modal-close").focus();
    }
    function closeModal() {
      modal.classList.remove("open");
      mBody.innerHTML = "";
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    triggers.forEach(function (t) {
      t.addEventListener("click", function (e) {
        e.preventDefault();
        openModal(t.getAttribute("data-embed"), t.getAttribute("data-title"), t.getAttribute("data-link"));
      });
    });
    modal.addEventListener("click", function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute("data-close")) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });
  }
})();
