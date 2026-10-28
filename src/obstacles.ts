import {
  COLS,
  ROWS,
  adjacent,
  gift,
  keepsake,
  moves,
  type Board,
  type Rng,
  type Wave,
} from "./engine";
import { themes, type Level } from "./config";
import type { Difficulty } from "./difficulty";

export type Keepsake =
  | "diploma"
  | "drawing"
  | "caipirinha"
  | "belt"
  | "candle"
  | "album"
  | "speaker"
  | "tattoo-frame";
export const keepsakeByTheme: Readonly<Record<string, Keepsake>> = {
  Química: "diploma",
  "Ensino Infantil": "drawing",
  Praia: "caipirinha",
  "Kung Fu": "belt",
  Espiritismo: "candle",
  Roma: "album",
  Pagode: "speaker",
  Tatuagens: "tattoo-frame",
};
export type ObstacleSpec = {
  petals: number;
  gifts: number;
  keepsakes: number;
  keepsake?: Keepsake;
};
export type ObstacleState = {
  petals: boolean[];
  swept: number;
  opened: number;
  brought: number;
  spawned: number;
};
export function obstacleSpec(
  level: Level,
  difficulty: Difficulty,
  endless = false,
): ObstacleSpec | undefined {
  if (endless) return;
  const theme = themes[level.id - 1];
  // The 100-seed gate failed even with a single petal here. Preserve effortless Easy.
  if (difficulty === "easy" && theme === "Tatuagens") return;
  const settings: Record<string, [number, number, number]> = {
    Praia: [4, 0, 0],
    "Kung Fu": [0, 1, 0],
    "Meu Pet": [3, 0, 0],
    Roma: [0, 1, 0],
    Pagode: [4, 0, 0],
    Tatuagens: [3, 1, 0],
    Família: [1, 0, 0],
  };
  const values = settings[theme];
  if (!values) return;
  const factor =
    difficulty === "easy" ? 1 : difficulty === "medium" ? 1.35 : 1.65;
  const safe = values;
  return {
    petals: Math.ceil(safe[0] * factor),
    gifts: Math.ceil(safe[1] * factor),
    keepsakes: Math.ceil(safe[2] * factor),
    keepsake: keepsakeByTheme[theme],
  };
}
export function newObstacles(
  board: Board,
  spec?: ObstacleSpec,
  rng: Rng = Math.random,
): { board: Board; state: ObstacleState } {
  const state: ObstacleState = {
    petals: Array(COLS * ROWS).fill(false),
    swept: 0,
    opened: 0,
    brought: 0,
    spawned: 0,
  };
  if (!spec) return { board, state };
  const cells = Array.from(
    { length: 30 },
    (_, i) => (Math.floor(i / 5) + 1) * COLS + 1 + (i % 5),
  );
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  cells.slice(0, spec.petals).forEach((i) => (state.petals[i] = true));
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
export function sweepObstacles(
  state: ObstacleState,
  wave: Wave,
): ObstacleState {
  const petals = state.petals.slice();
  let swept = state.swept;
  for (const i of wave.affected ?? wave.clear)
    if (petals[i]) {
      petals[i] = false;
      swept++;
    }
  return {
    ...state,
    petals,
    swept,
    opened: state.opened + (wave.giftsOpened?.length ?? 0),
  };
}
/** At most one new ingredient per valid move. Never replace a power or another obstacle. */
export function spawnKeepsake(
  board: Board,
  state: ObstacleState,
  spec?: ObstacleSpec,
  rng: Rng = Math.random,
) {
  if (!spec || state.spawned >= spec.keepsakes) return { board, state };
  const columns = board
    .slice(0, COLS)
    .flatMap((t, i) => (!t.role && !t.special ? [i] : []));
  if (!columns.length) return { board, state };
  const next = board.slice();
  next[columns[Math.floor(rng() * columns.length)]] = keepsake();
  return { board: next, state: { ...state, spawned: state.spawned + 1 } };
}
export function bottomKeepsakes(board: Board) {
  return board.flatMap((t, i) =>
    t.role === "keepsake" && i >= COLS * (ROWS - 1) ? [i] : [],
  );
}
export function obstaclesDone(state: ObstacleState, spec?: ObstacleSpec) {
  return (
    !spec ||
    (state.swept >= spec.petals &&
      state.opened >= spec.gifts &&
      state.brought >= spec.keepsakes)
  );
}
export function obstacleMoveScore(
  board: Board,
  cells: Set<number>,
  state?: ObstacleState,
) {
  if (!state) return 0;
  let score = 0;
  for (const i of cells) if (state.petals[i]) score += 12;
  board.forEach((t, i) => {
    if (t.role === "gift" && [...cells].some((j) => j === i || adjacent(i, j)))
      score += 12;
    if (t.role === "keepsake")
      for (const j of cells) if (j % COLS === i % COLS && j > i) score += 18;
  });
  return score;
}
export function obstacleHint(level: Level) {
  if (!level.obstacles) return;
  return (
    {
      Praia: "Varra as pétalas combinando peças em cima delas.",
      "Kung Fu": "Combine ao lado dos presentes para abri-los.",
      Espiritismo: "Leve a lembrança até o fundo do tabuleiro.",
    } as Record<string, string>
  )[themes[level.id - 1]];
}
