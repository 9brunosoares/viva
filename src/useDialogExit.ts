import { useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

export function useDialogExit(onClose: () => void) {
  const root = useRef<HTMLDivElement>(null),
    animation = useRef<Animation | null>(null),
    alive = useRef(true);
  const reduced = useReducedMotion();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      animation.current?.cancel();
    };
  }, []);
  function close() {
    if (animation.current) return;
    if (reduced || !root.current?.animate) {
      onClose();
      return;
    }
    animation.current = root.current.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 130,
      easing: "ease-in",
      fill: "forwards",
    });
    void animation.current.finished
      .then(() => {
        animation.current = null;
        if (alive.current) onClose();
      })
      .catch(() => {
        animation.current = null;
      });
  }
  return { root, close };
}
