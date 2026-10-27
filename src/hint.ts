import { matches, moves, swap, type Board } from "./engine";

/** Pure and deterministic: looking for a hint never draws refills or creates tile IDs. */
export function chooseHint(
  board: Board,
  targets: { kind: number; amount: number }[],
  counts: number[],
  needsPowers = false,
): number[] {
  let best: number[] = [],
    bestScore = -Infinity;
  for (const [a, b] of moves(board)) {
    const next = swap(board, a, b),
      groups = matches(next);
    const cells = new Set(groups.flatMap((g) => g.cells));
    const collected = Array(Math.max(6, counts.length)).fill(0);
    for (const i of cells) collected[next[i].kind]++;
    const useful = targets.reduce(
      (sum, t) =>
        sum +
        Math.min(Math.max(0, t.amount - counts[t.kind]), collected[t.kind]),
      0,
    );
    const active = Number(!!next[a].special) + Number(!!next[b].special);
    const score =
      useful * 3 +
      cells.size +
      groups.reduce(
        (sum, g) =>
          sum + (g.cells.length >= 5 ? 28 : g.cells.length === 4 ? 18 : 0),
        0,
      ) +
      active * (needsPowers ? 30 : 10);
    if (score > bestScore) {
      bestScore = score;
      best = [a, b];
    }
  }
  return best;
}
