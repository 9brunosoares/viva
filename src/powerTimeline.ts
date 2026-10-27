import { COLS, type Wave } from "./engine";
/** Same arrival clock for the sweep, cell disappearance and fragment burst. */
export function powerHitDelay(index: number, effects: Wave["effects"]) {
  const times = effects.flatMap((e) => {
    const dx = Math.abs((index % COLS) - (e.index % COLS)),
      dy = Math.abs(Math.floor(index / COLS) - Math.floor(e.index / COLS));
    if (e.type === "row" && dy === 0) return [70 + dx * 42];
    if (e.type === "column" && dx === 0) return [70 + dy * 42];
    if (e.type === "area" && dx <= 1 && dy <= 1)
      return [60 + Math.hypot(dx, dy) * 35];
    if (e.type === "color") return [100 + Math.hypot(dx, dy) * 10];
    return [];
  });
  return times.length ? Math.round(Math.min(...times)) : 0;
}
