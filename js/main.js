/* ==========================================================================
   Wedding Invitation — interactive behaviours
   Animation approach borrows from Remotion: map a driver value (scroll,
   time) through an interpolate() into transforms, and ease with springs.
   ========================================================================== */
(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----- tiny helpers (Remotion-style interpolate + clamp) --------------- */
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  function interpolate(input, inRange, outRange) {
    const [inMin, inMax] = inRange;
    const [outMin, outMax] = outRange;
    if (inMax === inMin) return outMin;
    const p = clamp((input - inMin) / (inMax - inMin), 0, 1);
    return outMin + (outMax - outMin) * p;
  }

  // Ease-out cubic — the "settle" feel of a spring without overshoot.
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ======================================================================
     1. CURTAIN REVEAL — driven by scroll position within the stage.
     ====================================================================== */
  const stage = document.getElementById("stage");
  const curtainL = document.querySelector(".curtain--left");
  const curtainR = document.querySelector(".curtain--right");

  function updateCurtains() {
    if (!stage || !curtainL || !curtainR) return;
    const vh = window.innerHeight;
    // Open the curtains over the first ~70% of a viewport of scrolling.
    // The hero text is pinned (CSS sticky) until ~80svh, so the curtains
    // always finish opening before the first layer of text scrolls away.
    const scrolled = clamp(window.scrollY / (vh * 0.7), 0, 1);
    const eased = easeOut(scrolled);

    // Slide each curtain fully off its own side (110% covers the gold trim).
    const offset = interpolate(eased, [0, 1], [0, 110]);
    curtainL.style.transform = `translateX(${-offset}%)`;
    curtainR.style.transform = `translateX(${offset}%)`;

    // Once fully open, stop intercepting the layout.
    const done = scrolled >= 0.999;
    curtainL.style.visibility = done ? "hidden" : "visible";
    curtainR.style.visibility = done ? "hidden" : "visible";
  }

  /* ======================================================================
     2. SCROLL PROGRESS BAR
     ====================================================================== */
  const progressFill = document.querySelector(".progress__fill");
  function updateProgress() {
    if (!progressFill) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressFill.style.width = pct.toFixed(2) + "%";
  }

  /* rAF-throttled scroll loop so multiple effects share one repaint. */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateCurtains();
      updateProgress();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { updateCurtains(); updateProgress(); });
  updateCurtains();
  updateProgress();

  /* ======================================================================
     3. SECTION REVEALS — IntersectionObserver adds .is-visible.
     ====================================================================== */
  const reveals = document.querySelectorAll("[data-reveal]");
  if (prefersReduced) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ======================================================================
     4. COUNTDOWN
     ====================================================================== */
  const countdownEl = document.getElementById("countdown");
  const dateIso = document.body.dataset.dateIso;
  if (countdownEl && dateIso) {
    const target = new Date(dateIso).getTime();
    const units = {
      days: countdownEl.querySelector('[data-unit="days"]'),
      hours: countdownEl.querySelector('[data-unit="hours"]'),
      minutes: countdownEl.querySelector('[data-unit="minutes"]'),
      seconds: countdownEl.querySelector('[data-unit="seconds"]'),
    };
    const pad = (n) => String(n).padStart(2, "0");

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        Object.values(units).forEach((u) => u && (u.textContent = "00"));
        if (units.days) units.days.textContent = "0";
        return;
      }
      const s = Math.floor(diff / 1000);
      units.days && (units.days.textContent = String(Math.floor(s / 86400)));
      units.hours && (units.hours.textContent = pad(Math.floor((s % 86400) / 3600)));
      units.minutes && (units.minutes.textContent = pad(Math.floor((s % 3600) / 60)));
      units.seconds && (units.seconds.textContent = pad(s % 60));
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ======================================================================
     5. SCRATCH-TO-REVEAL
     ====================================================================== */
  const scratchCanvas = document.getElementById("scratchCanvas");
  if (scratchCanvas) {
    const wrap = scratchCanvas.closest(".scratch");
    const ctx = scratchCanvas.getContext("2d");
    let painting = false;
    let revealed = false;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function paintCover() {
      const rect = scratchCanvas.getBoundingClientRect();
      scratchCanvas.width = Math.round(rect.width * dpr);
      scratchCanvas.height = Math.round(rect.height * dpr);
      ctx.scale(dpr, dpr);

      // Foil gradient cover.
      const g = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      g.addColorStop(0, "#9c1b30");
      g.addColorStop(0.5, "#e7c9a0");
      g.addColorStop(1, "#6d1421");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Subtle sparkle dots for a foil texture.
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Heart motif hint in the centre.
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `600 ${rect.width * 0.09}px "Cormorant Garamond", serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♥  scratch here  ♥", rect.width / 2, rect.height / 2);

      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = Math.max(rect.width, rect.height) * 0.09;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    function pos(e) {
      const rect = scratchCanvas.getBoundingClientRect();
      const point = e.touches ? e.touches[0] : e;
      return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    }

    let last = null;
    function scratch(e) {
      if (!painting) return;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo((last || p).x, (last || p).y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      // Round dab so single taps also clear area.
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      last = p;
    }

    function checkCleared() {
      if (revealed) return;
      const w = scratchCanvas.width;
      const h = scratchCanvas.height;
      const img = ctx.getImageData(0, 0, w, h).data;
      let clear = 0;
      // Sample every 40th pixel's alpha for speed.
      for (let i = 3; i < img.length; i += 160) {
        if (img[i] === 0) clear++;
      }
      const ratio = clear / (img.length / 160);
      if (ratio > 0.55) {
        revealed = true;
        wrap && wrap.classList.add("is-revealed");
        // Fade away the remaining foil.
        scratchCanvas.style.transition = "opacity 0.6s ease";
        scratchCanvas.style.opacity = "0";
        setTimeout(() => (scratchCanvas.style.pointerEvents = "none"), 600);
      }
    }

    const start = (e) => { painting = true; last = pos(e); scratch(e); };
    const move = (e) => { if (painting) { e.preventDefault(); scratch(e); } };
    const end = () => { if (painting) { painting = false; last = null; checkCleared(); } };

    scratchCanvas.addEventListener("mousedown", start);
    scratchCanvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    scratchCanvas.addEventListener("touchstart", start, { passive: true });
    scratchCanvas.addEventListener("touchmove", move, { passive: false });
    scratchCanvas.addEventListener("touchend", end);

    // Recompute when the card is first laid out / on resize.
    const resizePaint = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); paintCover(); revealed = false; scratchCanvas.style.opacity = "1"; scratchCanvas.style.pointerEvents = "auto"; wrap && wrap.classList.remove("is-revealed"); };
    // Wait a frame so getBoundingClientRect has real dimensions.
    requestAnimationFrame(paintCover);
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resizePaint, 200); });
  }

  /* ======================================================================
     6. PETALS — ambient falling petals on a full-page canvas.
     ====================================================================== */
  const petalCanvas = document.getElementById("petals");
  if (petalCanvas && !prefersReduced) {
    const pctx = petalCanvas.getContext("2d");
    let W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const COUNT = window.innerWidth < 600 ? 14 : 26;
    const petals = [];
    const COLORS = ["#f3e5d2", "#e7c9a0", "#d59aa0", "#dcc3a6"];

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      petalCanvas.width = W * dpr;
      petalCanvas.height = H * dpr;
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function make(y) {
      return {
        x: Math.random() * W,
        y: y ?? Math.random() * -H,
        r: 4 + Math.random() * 6,
        speed: 0.4 + Math.random() * 0.9,
        sway: 0.5 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        alpha: 0.4 + Math.random() * 0.5,
      };
    }
    for (let i = 0; i < COUNT; i++) petals.push(make());

    function drawPetal(p) {
      pctx.save();
      pctx.translate(p.x, p.y);
      pctx.rotate(p.rot);
      pctx.globalAlpha = p.alpha;
      pctx.fillStyle = p.color;
      // Simple petal: two arcs forming a leaf/teardrop.
      pctx.beginPath();
      pctx.moveTo(0, 0);
      pctx.quadraticCurveTo(p.r, -p.r, 0, -p.r * 2);
      pctx.quadraticCurveTo(-p.r, -p.r, 0, 0);
      pctx.fill();
      pctx.restore();
    }

    let raf;
    function loop() {
      pctx.clearRect(0, 0, W, H);
      for (const p of petals) {
        p.phase += 0.02;
        p.x += Math.sin(p.phase) * p.sway;
        p.y += p.speed;
        p.rot += p.rotSpeed;
        if (p.y - p.r * 2 > H) Object.assign(p, make(-10));
        drawPetal(p);
      }
      raf = requestAnimationFrame(loop);
    }
    loop();

    // Pause when tab hidden to save battery.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else loop();
    });
  }

})();
