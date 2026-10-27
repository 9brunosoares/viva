import { adjacent, COLS, ROWS } from "./engine";

export type GestureIntent =
  | { kind: "tap" }
  | { kind: "cancel" }
  | { kind: "swap"; target: number };
export function gestureIntent(
  index: number,
  dx: number,
  dy: number,
  cellSize: number,
): GestureIntent {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= COLS * ROWS ||
    !Number.isFinite(dx + dy)
  )
    return { kind: "cancel" };
  const x = Math.abs(dx),
    y = Math.abs(dy),
    threshold = Math.min(18, Math.max(10, cellSize * 0.25));
  if (Math.max(x, y) < threshold) return { kind: "tap" };
  // A diagonal never chooses an arbitrary neighbor. Lift and try again.
  if (Math.max(x, y) < Math.min(x, y) * 1.35) return { kind: "cancel" };
  const target = index + (x > y ? Math.sign(dx) : Math.sign(dy) * COLS);
  return adjacent(index, target)
    ? { kind: "swap", target }
    : { kind: "cancel" };
}
