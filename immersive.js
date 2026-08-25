/* Samuel Falade — immersive layer: hero constellation, pointer parallax,
   card tilt + spotlight, magnetic CTAs. All effects respect reduced motion
   and are skipped on touch-only devices where they'd fight scrolling. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  if (reduce) return;

  /* ---------- hero constellation (index only) ---------- */
  var hero = document.querySelector(".hero-cine");
  if (hero) {
    var cv = document.createElement("canvas");
    cv.className = "constellation";
    cv.setAttribute("aria-hidden", "true");
    hero.appendChild(cv);
    var ctx = cv.getContext("2d");
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, pts = [];
    var mx = -9999, my = -9999;
    var running = true, visible = true;

    function size() {
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var n = Math.min(120, Math.round((W * H) / 16000));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.26, vy: (Math.random() - 0.5) * 0.26,
          r: 1 + Math.random() * 1.4
        });
      }
    }

    function frame() {
      if (!running || !visible) return;
      ctx.clearRect(0, 0, W, H);
      var i, j, p, q, dx, dy, d;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        /* gentle cursor repulsion */
        dx = p.x - mx; dy = p.y - my; d = dx * dx + dy * dy;
        if (d < 22500 && d > 1) {
          d = Math.sqrt(d);
          p.x += (dx / d) * 0.6 * (1 - d / 150);
          p.y += (dy / d) * 0.6 * (1 - d / 150);
        }
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = "rgba(255,255,255,.38)";
        ctx.fill();
      }
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        for (j = i + 1; j < pts.length; j++) {
          q = pts[j];
          dx = p.x - q.x; dy = p.y - q.y; d = dx * dx + dy * dy;
          if (d < 12100) {
            d = Math.sqrt(d);
            /* links warm up near the cursor */
            var cx = (p.x + q.x) / 2 - mx, cy2 = (p.y + q.y) / 2 - my;
            var near = cx * cx + cy2 * cy2 < 36100;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = near
              ? "rgba(255,105,74," + (0.34 * (1 - d / 110)).toFixed(3) + ")"
              : "rgba(255,255,255," + (0.10 * (1 - d / 110)).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    }

    size();
    var lastW = window.innerWidth;
    window.addEventListener("resize", function () {
      /* mobile browsers fire height-only resizes as the address bar hides;
         re-seeding the field mid-scroll would make the stars jump */
      if (window.innerWidth !== lastW) { lastW = window.innerWidth; size(); }
    });
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    });
    hero.addEventListener("pointerleave", function () { mx = -9999; my = -9999; });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var was = visible; visible = e.isIntersecting;
          if (visible && !was) requestAnimationFrame(frame);
        });
      }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () {
      var was = running; running = !document.hidden;
      if (running && !was) requestAnimationFrame(frame);
    });
    requestAnimationFrame(frame);

    /* pointer parallax on the hero glows + headline depth */
    if (fine) {
      var glow = hero.querySelector(".glow");
      var wrap = hero.querySelector(".wrap");
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5;
        var ny = (e.clientY - r.top) / r.height - 0.5;
        if (glow) glow.style.transform = "translate(" + nx * 34 + "px," + ny * 26 + "px)";
        if (wrap) wrap.style.transform = "translate(" + nx * -8 + "px," + ny * -6 + "px)";
      });
      hero.addEventListener("pointerleave", function () {
        if (glow) glow.style.transform = "";
        if (wrap) wrap.style.transform = "";
      });
    }
  }

  /* ---------- touch devices: gyroscope parallax (hero) ---------- */
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  if (hero && coarse && window.DeviceOrientationEvent) {
    var gGlow = hero.querySelector(".glow");
    var gWrap = hero.querySelector(".wrap");
    var startGyro = function () {
      var raf2 = null;
      window.addEventListener("deviceorientation", function (e) {
        /* gamma: left/right tilt, beta: front/back; 40° ≈ natural holding angle */
        var nx = Math.max(-1, Math.min(1, (e.gamma || 0) / 25));
        var ny = Math.max(-1, Math.min(1, ((e.beta == null ? 40 : e.beta) - 40) / 25));
        /* tilt steers the constellation's repulsion point */
        mx = W * (0.5 + nx * 0.5);
        my = H * (0.5 + ny * 0.5);
        if (raf2) return;
        raf2 = requestAnimationFrame(function () {
          raf2 = null;
          if (gGlow) gGlow.style.transform = "translate(" + (nx * 30).toFixed(1) + "px," + (ny * 24).toFixed(1) + "px)";
          if (gWrap) gWrap.style.transform = "translate(" + (nx * -7).toFixed(1) + "px," + (ny * -5).toFixed(1) + "px)";
        });
      });
    };
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "motion-chip";
      chip.textContent = "✦ Enable motion";
      document.body.appendChild(chip);
      chip.addEventListener("click", function () {
        chip.remove();
        DeviceOrientationEvent.requestPermission().then(function (state) {
          if (state === "granted") startGyro();
        }).catch(function () {});
      });
    } else {
      startGyro();
    }
  }

  if (!fine) return; /* tilt, spotlight, magnetic: desktop pointers only */

  /* ---------- 3D tilt + spotlight on cards ---------- */
  var cards = Array.prototype.slice.call(document.querySelectorAll(".proj-card, .pillar"));
  cards.forEach(function (card) {
    card.classList.add("tiltable");
    var raf = null;
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var rx = (0.5 - py) * 7, ry = (px - 0.5) * 7;
        card.style.transform =
          "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-6px)";
      });
    });
    card.addEventListener("pointerleave", function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      card.style.transform = "";
    });
  });

  /* ---------- magnetic hero CTAs ---------- */
  var mags = Array.prototype.slice.call(document.querySelectorAll(".hero-cine .btn-lg, .band .links a"));
  mags.forEach(function (btn) {
    btn.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      btn.style.transform = "translate(" + dx * 0.18 + "px," + dy * 0.28 + "px)";
    });
    btn.addEventListener("pointerleave", function () { btn.style.transform = ""; });
  });
})();
