/* ===================================================================
   Velorah Charts — moteur de graphiques canvas, sans dépendance.
   Haute résolution (devicePixelRatio), animations, responsive.
   =================================================================== */
(function () {
  "use strict";

  const COLORS = {
    gold: "#c8a45c",
    gold2: "#e2c585",
    grid: "rgba(255,255,255,.06)",
    axis: "rgba(255,255,255,.32)",
    text: "#9aa3b2",
    green: "#5ec27a",
    red: "#ef6f6f",
    blue: "#6aa6ff",
    violet: "#a98bff",
  };

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* Prépare un canvas haute résolution et renvoie {ctx,w,h} */
  function setup(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.clientWidth || 320;
    const h = rect.height || canvas.clientHeight || 180;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function animate(duration, draw) {
    const start = performance.now();
    function frame(now) {
      const p = Math.min((now - start) / duration, 1);
      draw(easeOut(p));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function niceMax(v) {
    if (v <= 0) return 10;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * mag;
  }

  /* ---------------------------------------------- Line / area chart */
  function line(canvas, opts) {
    const { values, labels = [], suffix = "", area = true, color = COLORS.gold } = opts;
    const padL = 44, padR = 12, padT = 14, padB = 26;
    const max = niceMax(Math.max(...values, 1));

    function render(t) {
      const { ctx, w, h } = setup(canvas);
      const plotW = w - padL - padR, plotH = h - padT - padB;
      const x = (i) => padL + (plotW * i) / (values.length - 1 || 1);
      const y = (v) => padT + plotH - (plotH * v) / max;

      // grille + labels Y
      ctx.font = "11px Inter, sans-serif";
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const steps = 4;
      for (let i = 0; i <= steps; i++) {
        const val = (max / steps) * i;
        const yy = y(val);
        ctx.strokeStyle = COLORS.grid;
        ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
        ctx.fillText(formatShort(val) + suffix, padL - 8, yy);
      }
      // labels X
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      labels.forEach((lab, i) => {
        if (labels.length > 8 && i % 2) return;
        ctx.fillText(lab, x(i), h - padB + 8);
      });

      const n = Math.max(1, Math.floor((values.length - 1) * t) + 1);
      const pts = values.slice(0, n).map((v, i) => [x(i), y(v * t + (1 - t) * 0)]);

      // aire
      if (area) {
        const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
        grad.addColorStop(0, "rgba(200,164,92,.32)");
        grad.addColorStop(1, "rgba(200,164,92,0)");
        ctx.beginPath();
        ctx.moveTo(pts[0][0], padT + plotH);
        pts.forEach((p) => ctx.lineTo(p[0], p[1]));
        ctx.lineTo(pts[pts.length - 1][0], padT + plotH);
        ctx.closePath();
        ctx.fillStyle = grad; ctx.fill();
      }
      // ligne
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.stroke();
      // dernier point
      const last = pts[pts.length - 1];
      ctx.beginPath(); ctx.arc(last[0], last[1], 4, 0, 7); ctx.fillStyle = color; ctx.fill();
      ctx.beginPath(); ctx.arc(last[0], last[1], 7, 0, 7); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.globalAlpha = .4; ctx.stroke(); ctx.globalAlpha = 1;
    }
    animate(900, render);
    bindResize(canvas, () => render(1));
  }

  /* ---------------------------------------------- Bar chart */
  function bar(canvas, opts) {
    const { values, labels = [], suffix = "", colorFor } = opts;
    const padL = 40, padR = 10, padT = 12, padB = 26;
    const max = niceMax(Math.max(...values, 1));

    function render(t) {
      const { ctx, w, h } = setup(canvas);
      const plotW = w - padL - padR, plotH = h - padT - padB;
      const y = (v) => padT + plotH - (plotH * v) / max;
      const bw = (plotW / values.length) * 0.55;

      ctx.font = "11px Inter, sans-serif"; ctx.fillStyle = COLORS.text;
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let i = 0; i <= 4; i++) {
        const val = (max / 4) * i, yy = y(val);
        ctx.strokeStyle = COLORS.grid; ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
        ctx.fillText(formatShort(val) + suffix, padL - 8, yy);
      }
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      values.forEach((v, i) => {
        const cx = padL + (plotW * (i + 0.5)) / values.length;
        const bh = ((plotH * v) / max) * t;
        const col = colorFor ? colorFor(i, v) : COLORS.gold;
        const grad = ctx.createLinearGradient(0, padT + plotH - bh, 0, padT + plotH);
        grad.addColorStop(0, col); grad.addColorStop(1, hexA(col, .35));
        roundRect(ctx, cx - bw / 2, padT + plotH - bh, bw, bh, 6); ctx.fillStyle = grad; ctx.fill();
        ctx.fillStyle = COLORS.text;
        if (labels[i]) ctx.fillText(labels[i], cx, h - padB + 8);
      });
    }
    animate(900, render);
    bindResize(canvas, () => render(1));
  }

  /* ---------------------------------------------- Donut chart */
  function donut(canvas, opts) {
    const { segments, centerLabel = "", centerSub = "" } = opts; // [{value,color,label}]
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;

    function render(t) {
      const { ctx, w, h } = setup(canvas);
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8, thick = r * 0.32;
      let a0 = -Math.PI / 2;
      segments.forEach((s) => {
        const a1 = a0 + (s.value / total) * Math.PI * 2 * t;
        ctx.beginPath(); ctx.arc(cx, cy, r - thick / 2, a0, a1); ctx.strokeStyle = s.color;
        ctx.lineWidth = thick; ctx.lineCap = "round"; ctx.stroke();
        a0 = a1;
      });
      ctx.fillStyle = "#eef1f6"; ctx.textAlign = "center";
      ctx.font = "700 26px Sora, sans-serif"; ctx.textBaseline = "alphabetic";
      ctx.fillText(centerLabel, cx, cy + 4);
      ctx.fillStyle = COLORS.text; ctx.font = "11px Inter, sans-serif";
      ctx.fillText(centerSub, cx, cy + 22);
    }
    animate(900, render);
    bindResize(canvas, () => render(1));
  }

  /* ---------------------------------------------- Gauge (demi-cercle) */
  function gauge(canvas, opts) {
    const { value, max = 100, color = COLORS.gold, label = "" } = opts;
    function render(t) {
      const { ctx, w, h } = setup(canvas);
      const cx = w / 2, cy = h - 14, r = Math.min(w / 2, h) - 14, thick = 14;
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.strokeStyle = "rgba(255,255,255,.08)";
      ctx.lineWidth = thick; ctx.lineCap = "round"; ctx.stroke();
      const frac = Math.min(value / max, 1) * t;
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * frac);
      ctx.strokeStyle = color; ctx.lineWidth = thick; ctx.lineCap = "round"; ctx.stroke();
      ctx.fillStyle = "#eef1f6"; ctx.textAlign = "center"; ctx.font = "700 30px Sora, sans-serif";
      ctx.fillText(Math.round(value * t), cx, cy - 6);
      ctx.fillStyle = COLORS.text; ctx.font = "11px Inter, sans-serif";
      ctx.fillText(label, cx, cy + 10);
    }
    animate(1000, render);
    bindResize(canvas, () => render(1));
  }

  /* ---------------------------------------------- Sparkline */
  function sparkline(canvas, values, color = COLORS.gold) {
    const { ctx, w, h } = setup(canvas);
    const max = Math.max(...values), min = Math.min(...values);
    const x = (i) => (w * i) / (values.length - 1 || 1);
    const y = (v) => h - 4 - ((h - 8) * (v - min)) / (max - min || 1);
    ctx.beginPath();
    values.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
  }

  /* ---------------------------------------------- helpers */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, Math.abs(h) / 2 || r);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function formatShort(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 ? 1 : 0) + "M";
    if (v >= 1000) return (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k";
    return String(Math.round(v));
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function bindResize(canvas, redraw) {
    if (canvas.__velRz) window.removeEventListener("resize", canvas.__velRz);
    let to;
    canvas.__velRz = () => { clearTimeout(to); to = setTimeout(redraw, 150); };
    window.addEventListener("resize", canvas.__velRz);
  }

  window.Charts = { line, bar, donut, gauge, sparkline, COLORS };
})();
