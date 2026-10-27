import { tile, type Special } from "../src/engine";

/** Inputs for the real component and the independent pure-engine oracle. */
export function scenario(mode: string) {
  const board = Array.from({ length: 56 }, (_, i) =>
    tile((Math.floor(i / 7) + (i % 7)) % 6),
  );
  if (mode === "dead") return { board, from: 0, to: 1 };
  if (["3", "4", "5", "win", "cascade"].includes(mode)) {
    const length = mode === "4" ? 4 : mode === "5" ? 5 : 3;
    for (let i = 21; i < 21 + length; i++) board[i] = tile(0);
    if (length === 3) board[24] = tile(2);
    board[23] = tile(1);
    board[16] = tile(0);
    return { board, from: 16, to: 23 };
  }
  if (mode === "vertical4") {
    for (const i of [17, 31, 38, 23]) board[i] = tile(0);
    board[24] = tile(1);
    return { board, from: 23, to: 24 };
  }
  if (mode === "intersection") {
    for (const i of [17, 23, 25, 31, 38]) board[i] = tile(0);
    board[24] = tile(1);
    return { board, from: 17, to: 24 };
  }
  const pair = mode.startsWith("pair-")
    ? (mode.split("-").slice(1) as Special[])
    : null;
  board[24] = tile(
    board[24].kind,
    pair?.[0] || ((mode === "combined" ? "row" : mode) as Special),
  );
  if (mode === "combined" || pair)
    board[25] = tile(board[25].kind, pair?.[1] || "column");
  return { board, from: 24, to: 25 };
}
const powers: Special[] = ["row", "column", "area", "color"];
export const powerPairs = powers.flatMap((a, i) =>
  powers.slice(i).map((b) => `pair-${a}-${b}`),
);
