import { useEffect, useRef } from "react";

/**
 * ScrollHero — hero vidéo « scrubbé » au scroll, façon pages produit Apple.
 *
 * La vidéo n'est pas lue : on pilote `video.currentTime` en fonction de la
 * progression du scroll dans la section. Un conteneur `sticky` garde la vidéo
 * plein écran pendant toute la traversée de la section.
 *
 * Usage :
 *   <ScrollHero
 *     src="/assets/hero.mp4"
 *     poster="/assets/hero-poster.jpg"
 *     heightVh={320}
 *     captions={[
 *       { at: [0, 0.4],  text: "0 → 200 km/h" },
 *       { at: [0.4, 0.6], text: "Au cœur de la machine" },
 *       { at: [0.6, 0.8], text: "Le virage" },
 *       { at: [0.8, 1],   text: "L'exception, en mouvement" },
 *     ]}
 *   />
 *
 * Notes :
 * - La vidéo doit être encodée avec beaucoup d'images-clés (ex. ffmpeg `-g 1`)
 *   pour un scrub fluide image par image.
 * - `muted` + `playsInline` sont requis pour iOS.
 */
export default function ScrollHero({
  src,
  poster,
  heightVh = 320,
  smoothing = 0.2,
  captions = [],
  children,
}) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const capRefs = useRef([]);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    let duration = 0;
    let target = 0;
    let current = 0;
    let raf = 0;

    video.pause();

    const getDuration = () => {
      duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 6;
    };
    if (video.readyState >= 1) getDuration();
    else video.addEventListener("loadedmetadata", getDuration);

    const progress = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      return total > 0 ? scrolled / total : 0;
    };

    const applyCaptions = (p) => {
      captions.forEach((c, i) => {
        const el = capRefs.current[i];
        if (!el) return;
        const [a, b] = c.at;
        const inside = p >= a && p <= b;
        const local = inside ? (p - a) / (b - a || 1) : 0;
        const k = inside ? Math.sin(Math.PI * local) : 0; // fondu entrée/sortie
        el.style.opacity = String(k);
        el.style.transform = `translateY(${(1 - k) * 24}px)`;
      });
    };

    const onScroll = () => {
      const p = progress();
      target = p * duration;
      applyCaptions(p);
    };

    const loop = () => {
      current += (target - current) * smoothing;
      if (Math.abs(target - current) < 0.004) current = target;
      if (duration) {
        try { video.currentTime = current; } catch (e) { /* seek en cours */ }
      }
      raf = requestAnimationFrame(loop);
    };

    onScroll();
    loop();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      video.removeEventListener("loadedmetadata", getDuration);
    };
  }, [smoothing, captions]);

  return (
    <section ref={sectionRef} className="scrollhero" style={{ height: `${heightVh}vh`, position: "relative" }}>
      <div className="scrollhero__sticky" style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        <video
          ref={videoRef}
          className="scrollhero__video"
          src={src}
          poster={poster}
          muted
          playsInline
          preload="auto"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <div className="scrollhero__overlay" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
          {captions.map((c, i) => (
            <h2
              key={i}
              ref={(el) => (capRefs.current[i] = el)}
              className="scrollhero__caption"
              style={{ position: "absolute", margin: 0, color: "#fff", textAlign: "center", opacity: 0, willChange: "opacity, transform", textShadow: "0 4px 30px rgba(0,0,0,.6)" }}
            >
              {c.text}
            </h2>
          ))}
          {children}
        </div>
      </div>
    </section>
  );
}
