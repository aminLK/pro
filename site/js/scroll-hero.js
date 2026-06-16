/* ===================================================================
   ScrollHero (vanilla) — vidéo « scrubbée » au scroll, façon Apple.
   Pilote video.currentTime selon la progression du scroll.
   Markup attendu :
     <section data-scroll-hero style="height:320vh">
       <div class="sh__sticky">
         <video data-sh-video src="assets/hero.mp4" muted playsinline preload="auto"></video>
         <div class="sh__overlay">
           <h2 class="sh__cap" data-sh-at="0,0.4">…</h2> …
         </div>
       </div>
     </section>
   =================================================================== */
(function () {
  "use strict";
  function initScrollHero(section) {
    const video = section.querySelector("[data-sh-video]");
    if (!video) return;
    const caps = [...section.querySelectorAll("[data-sh-at]")];
    const smoothing = parseFloat(section.dataset.smoothing) || 0.2;
    let duration = 0, target = 0, current = 0;

    video.pause();
    const getDuration = () => { duration = (isFinite(video.duration) && video.duration > 0) ? video.duration : 6; };
    if (video.readyState >= 1) getDuration(); else video.addEventListener("loadedmetadata", getDuration);

    const progress = () => {
      const total = section.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-section.getBoundingClientRect().top, 0), total);
      return total > 0 ? scrolled / total : 0;
    };

    const applyCaptions = (p) => {
      caps.forEach((el) => {
        const [a, b] = el.dataset.shAt.split(",").map(Number);
        const inside = p >= a && p <= b;
        const local = inside ? (p - a) / ((b - a) || 1) : 0;
        const k = inside ? Math.sin(Math.PI * local) : 0;
        el.style.opacity = k;
        el.style.transform = "translateY(" + ((1 - k) * 24) + "px)";
      });
    };

    const onScroll = () => { const p = progress(); target = p * duration; applyCaptions(p); };
    const loop = () => {
      current += (target - current) * smoothing;
      if (Math.abs(target - current) < 0.004) current = target;
      if (duration) { try { video.currentTime = current; } catch (e) {} }
      requestAnimationFrame(loop);
    };

    onScroll(); loop();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  window.initScrollHero = initScrollHero;
  document.querySelectorAll("[data-scroll-hero]").forEach(initScrollHero);
})();
