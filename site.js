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

  /* scroll-triggered timelapse video: auto-play (muted) when in view, with a sound toggle */
  var scrollVids = Array.prototype.slice.call(document.querySelectorAll("[data-autoplay-scroll]"));
  scrollVids.forEach(function (v) {
    var btn = v.parentNode.querySelector(".tl-sound");
    if (reduce || !("IntersectionObserver" in window)) {
      v.setAttribute("controls", "");
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            var p = v.play(); if (p && p.catch) p.catch(function () {});
          } else { v.pause(); }
        });
      }, { threshold: [0, 0.5, 0.9] });
      io.observe(v);
    }
    if (btn) {
      btn.addEventListener("click", function () {
        v.muted = !v.muted;
        btn.textContent = v.muted ? "🔇" : "🔊";
        btn.setAttribute("aria-label", v.muted ? "Unmute" : "Mute");
        if (!v.muted) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      });
    }
  });

  /* in-page media overlay (keeps visitors on-site): iframes, video, and image galleries */
  var triggers = Array.prototype.slice.call(document.querySelectorAll("[data-embed],[data-video],[data-img]"));
  if (triggers.length) {
    var modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML =
      '<div class="modal-backdrop" data-close></div>' +
      '<div class="modal-panel" role="dialog" aria-modal="true" aria-label="Media viewer">' +
        '<div class="modal-head"><span class="mt"></span><div class="actions">' +
          '<a class="newtab" target="_blank" rel="noopener">Open in new tab ↗</a>' +
          '<button class="modal-close" type="button" aria-label="Close" data-close>×</button>' +
        '</div></div>' +
        '<button class="modal-arrow prev" type="button" data-nav="-1" aria-label="Previous">‹</button>' +
        '<button class="modal-arrow next" type="button" data-nav="1" aria-label="Next">›</button>' +
        '<div class="modal-body"></div>' +
      '</div>';
    document.body.appendChild(modal);
    var mBody = modal.querySelector(".modal-body");
    var mTitle = modal.querySelector(".mt");
    var mNewtab = modal.querySelector(".newtab");
    var lastFocus = null, gallery = [], gIndex = 0;

    function renderImage(t) {
      mBody.innerHTML = "";
      var im = document.createElement("img");
      im.src = t.getAttribute("data-img");
      im.alt = t.getAttribute("data-title") || "";
      mBody.appendChild(im);
      mTitle.textContent = t.getAttribute("data-title") || "";
    }
    function openModal(t) {
      lastFocus = document.activeElement;
      var imgSrc = t.getAttribute("data-img");
      var videoSrc = t.getAttribute("data-video");
      var link = t.getAttribute("data-link");
      mBody.innerHTML = "";
      modal.classList.remove("video", "vportrait", "image", "gallery");
      mNewtab.style.display = "none";
      if (imgSrc) {
        modal.classList.add("image");
        var gname = t.getAttribute("data-gallery");
        if (gname) {
          gallery = triggers.filter(function (x) { return x.getAttribute("data-gallery") === gname; });
          gIndex = gallery.indexOf(t);
          if (gallery.length > 1) modal.classList.add("gallery");
        } else { gallery = [t]; gIndex = 0; }
        renderImage(t);
      } else if (videoSrc) {
        modal.classList.add("video");
        if (t.getAttribute("data-orient") === "portrait") modal.classList.add("vportrait");
        var v = document.createElement("video");
        v.src = videoSrc; v.controls = true; v.autoplay = true; v.setAttribute("playsinline", "");
        mBody.appendChild(v);
        mTitle.textContent = t.getAttribute("data-title") || "";
        if (link) { mNewtab.href = link; mNewtab.style.display = ""; }
      } else {
        var f = document.createElement("iframe");
        f.setAttribute("allow", "autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture");
        f.setAttribute("allowfullscreen", "");
        f.src = t.getAttribute("data-embed");
        mBody.appendChild(f);
        mTitle.textContent = t.getAttribute("data-title") || "";
        if (link) { mNewtab.href = link; mNewtab.style.display = ""; }
      }
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
      modal.querySelector(".modal-close").focus();
    }
    function navGallery(dir) {
      if (!modal.classList.contains("gallery") || gallery.length < 2) return;
      gIndex = (gIndex + dir + gallery.length) % gallery.length;
      renderImage(gallery[gIndex]);
    }
    function closeModal() {
      modal.classList.remove("open");
      mBody.innerHTML = "";
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    triggers.forEach(function (t) {
      t.addEventListener("click", function (e) { e.preventDefault(); openModal(t); });
    });
    modal.addEventListener("click", function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute("data-close")) closeModal();
      else if (e.target.hasAttribute && e.target.hasAttribute("data-nav")) navGallery(parseInt(e.target.getAttribute("data-nav"), 10));
    });
    document.addEventListener("keydown", function (e) {
      if (!modal.classList.contains("open")) return;
      if (e.key === "Escape") closeModal();
      else if (e.key === "ArrowLeft") navGallery(-1);
      else if (e.key === "ArrowRight") navGallery(1);
    });
  }
})();
