import { Level } from "./config";

export const difficulties = [
  { id: "easy", label: "Fácil", description: "Para relaxar" },
  { id: "medium", label: "Médio", description: "Mais um desafio" },
  { id: "hard", label: "Difícil", description: "Para quem gosta de desafio" },
] as const;
export type Difficulty = (typeof difficulties)[number]["id"];
export const DIFFICULTY_KEY = "viva-difficulty-v1";
export function readDifficulty(): Difficulty {
  try {
    const value = localStorage.getItem(DIFFICULTY_KEY);
    return difficulties.some((d) => d.id === value)
      ? (value as Difficulty)
      : "easy";
  } catch {
    return "easy";
  }
}
export function balancedLevel(
  base: Level,
  difficulty: Difficulty,
  endless = false,
): Level {
  const original = endless
    ? {
        ...base,
        moves: 42,
        targets: [
          { kind: 0, amount: 20 },
          { kind: 3, amount: 20 },
        ],
        powers: 0,
        cascades: 0,
      }
    : base;
  if (difficulty === "easy") return original;
  const medium = difficulty === "medium";
  return {
    ...original,
    moves: original.moves + (medium ? 5 : 3),
    targets: original.targets.map((t) => ({
      ...t,
      amount: Math.ceil(t.amount * (medium ? 1.35 : 1.65)),
    })),
    // These two stages teach activation, while stage eight celebrates cascades.
    powers: original.powers ? original.powers + (medium ? 1 : 2) : 0,
    cascades: original.cascades ? original.cascades + (medium ? 1 : 2) : 0,
  };
}
