import { useLayoutEffect, useRef, type RefObject } from "react";
import type { Board } from "./engine";
import { fallTweenDuration } from "./vfx";
export type MotionPhase = {
  kind: "spawn" | "swap" | "fall" | "reset";
  depth: number;
  origins?: Map<number, number>;
};

export function useTileMotion(
  grid: RefObject<HTMLDivElement | null>,
  board: Board,
  enabled: boolean,
  phase: RefObject<MotionPhase>,
) {
  const previous = useRef<Board>([]),
    running = useRef(new Set<Animation>());
  useLayoutEffect(() => {
    const root = grid.current;
    for (const a of running.current) a.cancel();
    running.current.clear();
    if (!root || !enabled) {
      previous.current = board;
      for (const a of running.current) a.cancel();
      running.current.clear();
      return;
    }
    const old = new Map(previous.current.map((t, i) => [t.id, i]));
    const tiles = Array.from(root.children) as HTMLElement[];
    const style = getComputedStyle(root),
      gapX = parseFloat(style.columnGap) || 0,
      gapY = parseFloat(style.rowGap) || 0;
    const stepX = (tiles[0]?.offsetWidth || 0) + gapX,
      stepY = (tiles[0]?.offsetHeight || 0) + gapY;
    const entering = new Array(7).fill(0);
    board.forEach((t, i) => {
      if (!old.has(t.id) && !phase.current.origins?.has(t.id))
        entering[i % 7]++;
    });
    for (let i = 0; i < tiles.length; i++) {
      const el = tiles[i],
        before =
          old.get(board[i].id) ?? phase.current.origins?.get(board[i].id);
      const dx = before === undefined ? 0 : ((before % 7) - (i % 7)) * stepX;
      const dy =
        before === undefined
          ? phase.current.kind === "fall"
            ? -entering[i % 7] * stepY
            : -10
          : (Math.floor(before / 7) - Math.floor(i / 7)) * stepY;
      if (before === i) continue;
      const fall = phase.current.kind === "fall",
        fresh = before === undefined;
      const duration = fall
        ? fallTweenDuration(dy, phase.current.depth)
        : fresh
          ? 280
          : 200;
      const frames: Keyframe[] = fall
        ? [
            {
              transform: `translate(${dx}px,${dy}px) scale(.96,1.03)`,
              opacity: fresh ? 0 : 1,
              offset: 0,
              easing: "cubic-bezier(.4,.05,.75,.65)",
            },
            {
              transform: "translate(0,2px) scale(1.055,.94)",
              opacity: 1,
              offset: 0.78,
              easing: "cubic-bezier(.2,.7,.3,1)",
            },
            { transform: "translate(0,0) scale(1,1)", opacity: 1, offset: 1 },
          ]
        : [
            {
              transform: `translate(${dx}px,${dy}px) scale(${fresh ? 0.83 : 1})`,
              opacity: fresh ? 0 : 1,
            },
            { transform: "translate(0,0) scale(1)", opacity: 1 },
          ];
      const animation = el.animate(frames, {
        duration,
        fill: "backwards",
        delay: fall ? (i % 7) * 3 : fresh ? Math.floor(i / 7) * 12 : 0,
        easing: fall ? "linear" : "cubic-bezier(.2,.75,.25,1)",
      });
      running.current.add(animation);
      animation.onfinish = () => running.current.delete(animation);
      animation.oncancel = () => running.current.delete(animation);
    }
    previous.current = board;
  }, [board, enabled, grid, phase]);
  useLayoutEffect(
    () => () => {
      for (const a of running.current) a.cancel();
      running.current.clear();
    },
    [],
  );
  return (
    element: HTMLElement,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ) => {
    if (!enabled) return;
    const a = element.animate(frames, options);
    running.current.add(a);
    a.onfinish = () => running.current.delete(a);
    a.oncancel = () => running.current.delete(a);
  };
}
