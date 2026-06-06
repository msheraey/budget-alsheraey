import { useEffect, useRef } from "react";

/**
 * Interactive aurora background — animated mesh-gradient blobs that
 * subtly follow the cursor. Inspired by the Lovable.dev homepage hero.
 * Fixed behind all content. Respects prefers-reduced-motion.
 */
export function AuroraBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let raf = 0;
    let tx = 0.5, ty = 0.4, cx = 0.5, cy = 0.4;

    function onMove(e: PointerEvent) {
      tx = e.clientX / window.innerWidth;
      ty = e.clientY / window.innerHeight;
    }
    function tick() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      if (el) {
        el.style.setProperty("--mx", `${(cx * 100).toFixed(2)}%`);
        el.style.setProperty("--my", `${(cy * 100).toFixed(2)}%`);
      }
      raf = requestAnimationFrame(tick);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="aurora-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-cursor" />
      <div className="aurora-grain" />
    </div>
  );
}
