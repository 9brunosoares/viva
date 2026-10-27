import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type MouseEvent,
} from "react";
import { gestureIntent } from "./boardInput";

type Gesture = {
  id: number;
  index: number;
  x: number;
  y: number;
  size: number;
  element: HTMLButtonElement;
  rotated: boolean;
  moved: boolean;
};
export function useBoardInput({
  enabled,
  canInteract,
  onTap,
  onSwap,
  onActivity,
}: {
  enabled: boolean;
  canInteract: () => boolean;
  onTap: (index: number) => void;
  onSwap: (from: number, to: number) => void;
  onActivity: () => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  function release() {
    const g = gesture.current;
    gesture.current = null;
    if (g?.element.hasPointerCapture(g.id))
      g.element.releasePointerCapture(g.id);
    setPressed(null);
  }
  useEffect(() => {
    if (!enabled) release();
  }, [enabled]);
  useEffect(() => {
    const interrupt = () => release();
    window.addEventListener("blur", interrupt);
    window.addEventListener("resize", interrupt);
    document.addEventListener("visibilitychange", interrupt);
    return () => {
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("resize", interrupt);
      document.removeEventListener("visibilitychange", interrupt);
      const g = gesture.current;
      gesture.current = null;
      if (g?.element.hasPointerCapture(g.id))
        g.element.releasePointerCapture(g.id);
    };
  }, []);
  return {
    pressed,
    down(e: PointerEvent<HTMLButtonElement>, index: number) {
      if (gesture.current || !e.isPrimary || e.button !== 0 || !canInteract())
        return;
      const rotated =
        document.documentElement.classList.contains("portrait-fallback");
      gesture.current = {
        id: e.pointerId,
        index,
        x: e.clientX,
        y: e.clientY,
        size: e.currentTarget.offsetWidth,
        element: e.currentTarget,
        rotated,
        moved: false,
      };
      setPressed(index);
      onActivity();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* A cancelled native gesture may already have lost its pointer. */
      }
    },
    move(e: PointerEvent<HTMLButtonElement>) {
      const g = gesture.current;
      if (!g || g.id !== e.pointerId) return;
      if (
        gestureIntent(g.index, e.clientX - g.x, e.clientY - g.y, g.size)
          .kind !== "tap"
      )
        g.moved = true;
    },
    up(e: PointerEvent<HTMLButtonElement>) {
      const g = gesture.current;
      if (!g || g.id !== e.pointerId) return;
      const dx = g.rotated ? e.clientY - g.y : e.clientX - g.x;
      const dy = g.rotated ? -(e.clientX - g.x) : e.clientY - g.y;
      release();
      if (!canInteract()) return;
      const bounds = g.element.closest(".board")?.getBoundingClientRect();
      if (
        !bounds ||
        e.clientX < bounds.left - 4 ||
        e.clientX > bounds.right + 4 ||
        e.clientY < bounds.top - 4 ||
        e.clientY > bounds.bottom + 4
      )
        return;
      const intent = gestureIntent(g.index, dx, dy, g.size);
      if (intent.kind === "tap" && !g.moved) onTap(g.index);
      else if (intent.kind === "swap") onSwap(g.index, intent.target);
    },
    cancel(e: PointerEvent<HTMLButtonElement>) {
      if (gesture.current?.id === e.pointerId) release();
    },
    click(e: MouseEvent<HTMLButtonElement>, index: number) {
      // Pointer gestures finish on pointerup; only keyboard/assistive clicks act here.
      const pointerType = (e.nativeEvent as globalThis.PointerEvent)
        .pointerType;
      if (e.detail === 0 && !pointerType && canInteract()) {
        onActivity();
        onTap(index);
      }
    },
  };
}
