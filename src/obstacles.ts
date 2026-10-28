import {
  COLS,
  adjacent,
  gift,
  moves,
  type Board,
  type Rng,
  type Wave,
} from "./engine";
import { themes, type Level } from "./config";
import type { Difficulty } from "./difficulty";

export type ObstacleSpec = { gifts: number };
export type ObstacleState = { opened: number };
export function obstacleSpec(
  level: Level,
  difficulty: Difficulty,
  endless = false,
): ObstacleSpec | undefined {
  if (endless) return;
  const theme = themes[level.id - 1];
  if (
    theme !== "Kung Fu" &&
    theme !== "Roma" &&
    !(theme === "Tatuagens" && difficulty !== "easy")
  )
    return;
  return { gifts: difficulty === "easy" ? 1 : 2 };
}
export function newObstacles(
  board: Board,
  spec?: ObstacleSpec,
  rng: Rng = Math.random,
): { board: Board; state: ObstacleState } {
  const state: ObstacleState = { opened: 0 };
  if (!spec) return { board, state };
  const cells = Array.from(
    { length: 30 },
    (_, i) => (Math.floor(i / 5) + 1) * COLS + 1 + (i % 5),
  );
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  let next = board.slice(),
    placed = 0;
  for (const i of cells) {
    if (placed >= spec.gifts) break;
    const candidate = next.slice();
    candidate[i] = gift();
    if (moves(candidate).length) {
      next = candidate;
      placed++;
    }
  }
  if (placed !== spec.gifts)
    throw Error("Gift placement must preserve legal moves");
  return { board: next, state };
}
export function recordGiftOpenings(
  state: ObstacleState,
  wave: Wave,
): ObstacleState {
  return { opened: state.opened + (wave.giftsOpened?.length ?? 0) };
}
export function obstaclesDone(state: ObstacleState, spec?: ObstacleSpec) {
  return !spec || state.opened >= spec.gifts;
}
export function obstacleMoveScore(
  board: Board,
  cells: Set<number>,
  state?: ObstacleState,
) {
  if (!state) return 0;
  return board.reduce(
    (score, t, i) =>
      score +
      (t.role === "gift" && [...cells].some((j) => j === i || adjacent(i, j))
        ? 12
        : 0),
    0,
  );
}
export function obstacleHint(level: Level) {
  if (level.obstacles && themes[level.id - 1] === "Kung Fu")
    return "Combine ao lado dos presentes para abri-los.";
}
