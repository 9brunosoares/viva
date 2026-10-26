import { useEffect } from "react";

/** Keep a portrait canvas even where Safari does not implement orientation.lock. */
export function usePortrait() {
  useEffect(() => {
    function resize() {
      const width = window.innerWidth,
        height = window.innerHeight;
      const turned =
        width > height &&
        Math.min(width, height) <= 600 &&
        matchMedia("(any-pointer: coarse)").matches;
      const root = document.documentElement;
      root.classList.toggle("portrait-fallback", turned);
      root.style.setProperty("--vh", `${(turned ? width : height) / 100}px`);
      root.style.setProperty("--vw", `${(turned ? height : width) / 100}px`);
    }
    function lock() {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: string) => Promise<void>;
      };
      void orientation?.lock?.("portrait").catch(() => {});
    }
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("pointerdown", lock, { once: true });
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerdown", lock);
    };
  }, []);
}
