import { useEffect } from "react";

/** Follow the usable viewport, retaining the existing portrait fallback and accessible zoom. */
export function usePortrait() {
  useEffect(() => {
    let frame = 0;
    const viewport = window.visualViewport;
    function resize() {
      frame = 0;
      // Pinch zoom should magnify the composition, never shrink/reflow it under the fingers.
      if (viewport && viewport.scale > 1.01) return;
      const width = Math.round(viewport?.width || window.innerWidth),
        height = Math.round(viewport?.height || window.innerHeight);
      if (!width || !height) return;
      const turned =
        width > height &&
        Math.min(width, height) <= 600 &&
        matchMedia("(any-pointer: coarse)").matches;
      const root = document.documentElement;
      root.classList.toggle("portrait-fallback", turned);
      const vh = `${(turned ? width : height) / 100}px`,
        vw = `${(turned ? height : width) / 100}px`;
      if (root.style.getPropertyValue("--vh") !== vh)
        root.style.setProperty("--vh", vh);
      if (root.style.getPropertyValue("--vw") !== vw)
        root.style.setProperty("--vw", vw);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(resize);
    }
    function lock() {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: string) => Promise<void>;
      };
      void orientation?.lock?.("portrait").catch(() => {});
    }
    resize();
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    viewport?.addEventListener("resize", schedule);
    document.addEventListener("pointerdown", lock, { once: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
      viewport?.removeEventListener("resize", schedule);
      document.removeEventListener("pointerdown", lock);
    };
  }, []);
}
