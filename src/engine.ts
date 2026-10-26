export const COLS = 7,
  ROWS = 8;
export type Special = "row" | "column" | "area" | "color";
export type Tile = { id: number; kind: number; special?: Special };
export type Board = Tile[];
export type Match = { cells: number[]; axis: "row" | "column" };
export type Rng = () => number;
let serial = 0;
export const tile = (kind: number, special?: Special): Tile => ({
  id: ++serial,
  kind,
  special,
});
export function matches(b: Board): Match[] {
  const found: Match[] = [];
  for (const axis of ["row", "column"] as const) {
    const outer = axis === "row" ? ROWS : COLS,
      inner = axis === "row" ? COLS : ROWS;
    for (let a = 0; a < outer; a++) {
      let run: number[] = [];
      for (let c = 0; c <= inner; c++) {
        const i = axis === "row" ? a * COLS + c : c * COLS + a;
        if (c < inner && (!run.length || b[i].kind === b[run[0]].kind))
          run.push(i);
        else {
          if (run.length >= 3) found.push({ cells: run, axis });
          run = c < inner ? [i] : [];
        }
      }
    }
  }
  return found;
}
export function adjacent(a: number, b: number) {
  return (
    a !== b &&
    ((Math.floor(a / COLS) === Math.floor(b / COLS) && Math.abs(a - b) === 1) ||
      Math.abs(a - b) === COLS)
  );
}
export function swap(b: Board, a: number, c: number) {
  const n = b.slice();
  [n[a], n[c]] = [n[c], n[a]];
  return n;
}
export function validSwap(b: Board, a: number, c: number) {
  return (
    adjacent(a, c) &&
    (!!b[a].special || !!b[c].special || matches(swap(b, a, c)).length > 0)
  );
}
export function moves(b: Board): [number, number][] {
  const r: [number, number][] = [];
  for (let i = 0; i < b.length; i++)
    for (const j of [i + 1, i + COLS])
      if (j < b.length && validSwap(b, i, j)) r.push([i, j]);
  return r;
}
export function createBoard(rng: Rng = Math.random): Board {
  const b: Board = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const allowed = [0, 1, 2, 3, 4, 5].filter(
      (k) =>
        !(i % COLS >= 2 && b[i - 1].kind === k && b[i - 2].kind === k) &&
        !(
          i >= COLS * 2 &&
          b[i - COLS].kind === k &&
          b[i - 2 * COLS].kind === k
        ),
    );
    b.push(
      tile(
        allowed[
          Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))
        ],
      ),
    );
  }
  return moves(b).length ? b : createBoard(rng);
}
export type Wave = {
  board: Board;
  clear: number[];
  created: number[];
  collected: number[];
  powers: number;
  effects: { index: number; type: Special }[];
};
export function resolveWave(
  b: Board,
  preferred?: number,
  activated: number[] = [],
  colorKind?: number,
): Wave {
  const groups = matches(b);
  const clear = new Set(groups.flatMap((g) => g.cells));
  const created = new Map<number, Special>();
  const intersections = [...clear].filter(
    (i) => groups.filter((g) => g.cells.includes(i)).length > 1,
  );
  for (const i of intersections) created.set(i, "area");
  for (const g of groups) {
    if (g.cells.some((i) => intersections.includes(i))) continue;
    if (g.cells.length >= 4) {
      const i =
        preferred !== undefined && g.cells.includes(preferred)
          ? preferred
          : g.cells[Math.floor(g.cells.length / 2)];
      created.set(i, g.cells.length >= 5 ? "color" : g.axis);
    }
  }
  activated.forEach((i) => clear.add(i));
  let powers = 0;
  const fired = new Set<number>();
  for (;;) {
    const pending = [...clear].filter((i) => b[i].special && !fired.has(i));
    if (!pending.length) break;
    for (const i of pending) {
      fired.add(i);
      powers++;
      const s = b[i].special;
      for (let j = 0; j < b.length; j++) {
        if (
          (s === "row" && Math.floor(j / COLS) === Math.floor(i / COLS)) ||
          (s === "column" && j % COLS === i % COLS) ||
          (s === "area" &&
            Math.abs((j % COLS) - (i % COLS)) <= 1 &&
            Math.abs(Math.floor(j / COLS) - Math.floor(i / COLS)) <= 1) ||
          (s === "color" && b[j].kind === (colorKind ?? b[i].kind))
        )
          clear.add(j);
      }
    }
  }
  const collected = [0, 0, 0, 0, 0, 0];
  const next = b.slice();
  for (const i of clear) {
    if (created.has(i) && !fired.has(i) && !activated.includes(i)) {
      next[i] = tile(b[i].kind, created.get(i));
    } else {
      collected[b[i].kind]++;
      created.delete(i);
    }
  }
  return {
    board: next,
    clear: [...clear].filter((i) => !created.has(i)),
    created: [...created.keys()],
    collected,
    powers,
    effects: [...fired].map((index) => ({ index, type: b[index].special! })),
  };
}
export function fall(b: Board, clear: number[], rng: Rng = Math.random): Board {
  const removed = new Set(clear),
    n = b.slice();
  for (let x = 0; x < COLS; x++) {
    const keep = b.filter((_, i) => i % COLS === x && !removed.has(i));
    for (let y = ROWS - 1; y >= 0; y--)
      n[y * COLS + x] = keep.pop() ?? tile(Math.floor(rng() * 6));
  }
  return n;
}
export function ensurePlayable(b: Board, rng: Rng = Math.random) {
  return moves(b).length ? b : createBoard(rng);
}
