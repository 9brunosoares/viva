import type { Board } from "./engine";
import type { Difficulty } from "./difficulty";
import type { Progress } from "./progress";
export type GameSnapshot = {
  board: Board;
  remaining: number;
  counts: number[];
  powers: number;
  cascades: number;
  round: number;
};
export type GameSession = {
  version: 1;
  campaign: string;
  completedCount: number;
  stage: number;
  endless: boolean;
  difficulty: Difficulty;
  phase: "intro" | "game";
  snapshot?: GameSnapshot;
};
export const SESSION_KEY = "viva-session-v1",
  STORIES_KEY = "viva-stories-v1";
const integer = (n: unknown) =>
  Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 100000;
export function validSnapshot(s: unknown): s is GameSnapshot {
  if (!s || typeof s !== "object") return false;
  const v = s as GameSnapshot;
  return (
    Array.isArray(v.board) &&
    v.board.length === 56 &&
    v.board.every(
      (t) =>
        t &&
        integer(t.kind) &&
        t.kind < 6 &&
        (t.special === undefined ||
          ["row", "column", "area", "color"].includes(t.special)),
    ) &&
    Number.isInteger(v.remaining) &&
    Math.abs(v.remaining) <= 100000 &&
    Array.isArray(v.counts) &&
    v.counts.length === 6 &&
    v.counts.every(integer) &&
    integer(v.powers) &&
    integer(v.cascades) &&
    integer(v.round) &&
    v.round > 0
  );
}
export function readSession(p: Progress): GameSession | null {
  try {
    const v = JSON.parse(
      localStorage.getItem(SESSION_KEY) || "null",
    ) as GameSession | null;
    return v &&
      v.version === 1 &&
      !p.pendingCelebration &&
      v.campaign === p.order.join(",") &&
      v.completedCount === p.completed.length &&
      integer(v.stage) &&
      v.stage >= 1 &&
      v.stage <= Math.min(10, p.completed.length + 1) &&
      typeof v.endless === "boolean" &&
      (!v.endless || p.completed.length === 10) &&
      ["easy", "medium", "hard"].includes(v.difficulty) &&
      ["intro", "game"].includes(v.phase) &&
      (v.snapshot === undefined || validSnapshot(v.snapshot))
      ? v
      : null;
  } catch {
    return null;
  }
}
export function writeSession(v: GameSession | null) {
  try {
    if (v) localStorage.setItem(SESSION_KEY, JSON.stringify(v));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}
export function storySeen(p: Progress, id: number) {
  if (p.completed.includes(id)) return true;
  try {
    const v = JSON.parse(localStorage.getItem(STORIES_KEY) || "null");
    return (
      v?.campaign === p.order.join(",") &&
      Array.isArray(v.seen) &&
      v.seen.includes(id)
    );
  } catch {
    return false;
  }
}
export function rememberStory(p: Progress, id: number) {
  try {
    const v = JSON.parse(localStorage.getItem(STORIES_KEY) || "null");
    const seen =
      v?.campaign === p.order.join(",") && Array.isArray(v.seen)
        ? v.seen.filter(
            (n: unknown) => integer(n) && Number(n) >= 1 && Number(n) <= 10,
          )
        : [];
    localStorage.setItem(
      STORIES_KEY,
      JSON.stringify({
        campaign: p.order.join(","),
        seen: [...new Set([...seen, ...p.completed, id])],
      }),
    );
  } catch {}
}
