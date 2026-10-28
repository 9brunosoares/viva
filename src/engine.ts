export const COLS = 7,
  ROWS = 8;
export type Special = "row" | "column" | "area" | "color";
export type Tile = {
  id: number;
  kind: number;
  special?: Special;
  role?: "gift" | "keepsake";
  hp?: 1 | 2;
};
export const isPiece = (t: Tile) => !t.role;
export const gift = (hp: 1 | 2 = 2): Tile => ({
  ...tile(-1),
  role: "gift",
  hp,
});
export const keepsake = (): Tile => ({ ...tile(-1), role: "keepsake" });
export type Board = Tile[];
export type Match = { cells: number[]; axis: "row" | "column" };
export type Rng = () => number;
export type BoardRules = {
  kinds: readonly number[];
  weights?: readonly number[];
  powerTier: 1 | 2 | 3;
};
function drawKind(allowed: readonly number[], rng: Rng, rules?: BoardRules) {
  const weights = allowed.map((k) => rules?.weights?.[k] ?? 1);
  let value = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < allowed.length; i++) {
    value -= weights[i];
    if (value < 0) return allowed[i];
  }
  return allowed[allowed.length - 1];
}
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
        if (
          c < inner &&
          isPiece(b[i]) &&
          (!run.length || b[i].kind === b[run[0]].kind)
        )
          run.push(i);
        else {
          if (run.length >= 3) found.push({ cells: run, axis });
          run = c < inner && isPiece(b[i]) ? [i] : [];
        }
      }
    }
  }
  return found;
}
export function adjacent(a: number, b: number) {
  return (
    Number.isInteger(a) &&
    Number.isInteger(b) &&
    a >= 0 &&
    b >= 0 &&
    a < COLS * ROWS &&
    b < COLS * ROWS &&
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
    b[a].role !== "gift" &&
    b[c].role !== "gift" &&
    ((isPiece(b[a]) && isPiece(b[c]) && (!!b[a].special || !!b[c].special)) ||
      matches(swap(b, a, c)).length > 0)
  );
}
export function moves(b: Board): [number, number][] {
  const r: [number, number][] = [];
  for (let i = 0; i < b.length; i++)
    for (const j of [i + 1, i + COLS])
      if (j < b.length && validSwap(b, i, j)) r.push([i, j]);
  return r;
}
export function createBoard(rng: Rng = Math.random, rules?: BoardRules): Board {
  const b: Board = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const allowed = (rules?.kinds ?? [0, 1, 2, 3, 4, 5]).filter(
      (k) =>
        !(i % COLS >= 2 && b[i - 1].kind === k && b[i - 2].kind === k) &&
        !(
          i >= COLS * 2 &&
          b[i - COLS].kind === k &&
          b[i - 2 * COLS].kind === k
        ),
    );
    b.push(tile(drawKind(allowed, rng, rules)));
  }
  return moves(b).length ? b : createBoard(rng, rules);
}
export type Wave = {
  board: Board;
  clear: number[];
  created: number[];
  collected: number[];
  powers: number;
  effects: { index: number; type: Special }[];
  affected?: number[];
  giftHits?: number[];
  giftsOpened?: number[];
};
export function resolveWave(
  b: Board,
  preferred?: number,
  activated: number[] = [],
  colorKind?: number,
  rules?: BoardRules,
): Wave {
  const groups = matches(b);
  const clear = new Set(groups.flatMap((g) => g.cells));
  const created = new Map<number, Special>();
  const intersections = [...clear].filter(
    (i) => groups.filter((g) => g.cells.includes(i)).length > 1,
  );
  for (const i of intersections)
    created.set(i, (rules?.powerTier ?? 3) >= 2 ? "area" : "row");
  for (const g of groups) {
    if (g.cells.some((i) => intersections.includes(i))) continue;
    if (g.cells.length >= 4) {
      const i =
        preferred !== undefined && g.cells.includes(preferred)
          ? preferred
          : g.cells[Math.floor(g.cells.length / 2)];
      created.set(
        i,
        g.cells.length >= 5 && (rules?.powerTier ?? 3) === 3 ? "color" : g.axis,
      );
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
          (s === "color" &&
            isPiece(b[j]) &&
            b[j].kind ===
              (colorKind !== undefined && colorKind >= 0
                ? colorKind
                : b[i].kind))
        )
          clear.add(j);
      }
    }
  }
  const collected = Array(Math.max(6, ...b.map((t) => t.kind + 1))).fill(0);
  const next = b.slice();
  const affected = [...clear];
  const matched = new Set(groups.flatMap((g) => g.cells));
  const giftHits = b.flatMap((t, i) =>
    t.role === "gift" &&
    (clear.has(i) || [...matched].some((j) => adjacent(i, j)))
      ? [i]
      : [],
  );
  const giftsOpened: number[] = [];
  for (const i of giftHits) {
    if (b[i].hp === 2) next[i] = { ...b[i], hp: 1 };
    else {
      giftsOpened.push(i);
      clear.add(i);
    }
  }
  for (const i of [...clear])
    if (b[i].role) {
      if (!giftsOpened.includes(i)) clear.delete(i);
    }
  for (const i of clear) {
    if (created.has(i) && !fired.has(i) && !activated.includes(i)) {
      next[i] = tile(b[i].kind, created.get(i));
    } else {
      if (isPiece(b[i])) collected[b[i].kind]++;
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
    affected: [...new Set([...affected, ...giftsOpened])],
    giftHits,
    giftsOpened,
  };
}
export function fall(
  b: Board,
  clear: number[],
  rng: Rng = Math.random,
  rules?: BoardRules,
): Board {
  const removed = new Set(clear),
    n = b.slice();
  for (let x = 0; x < COLS; x++) {
    const keep = b.filter((_, i) => i % COLS === x && !removed.has(i));
    for (let y = ROWS - 1; y >= 0; y--)
      n[y * COLS + x] =
        keep.pop() ??
        tile(drawKind(rules?.kinds ?? [0, 1, 2, 3, 4, 5], rng, rules));
  }
  return n;
}
export function ensurePlayable(
  b: Board,
  rng: Rng = Math.random,
  rules?: BoardRules,
) {
  if (moves(b).length) return b;
  return reshuffle(b, rng, rules);
}
/** Preserve ingredients, gift health and their occupied cells during recovery. */
export function reshuffle(
  b: Board,
  rng: Rng = Math.random,
  rules?: BoardRules,
): Board {
  if (b.every(isPiece)) return createBoard(rng, rules);
  const indices = b.flatMap((t, i) => (isPiece(t) ? [i] : []));
  const pieces = indices.map((i) => b[i]);
  for (let attempt = 0; attempt < 500; attempt++) {
    for (let j = pieces.length - 1; j > 0; j--) {
      const k = Math.floor(rng() * (j + 1));
      [pieces[j], pieces[k]] = [pieces[k], pieces[j]];
    }
    const next = b.slice();
    indices.forEach((i, j) => (next[i] = pieces[j]));
    if (!matches(next).length && moves(next).length) return next;
  }
  // Bounded regeneration touches ordinary pieces only, never saved obstacles.
  for (let attempt = 0; attempt < 500; attempt++) {
    const fresh = createBoard(rng, rules),
      next = b.map((t, i) => (isPiece(t) ? fresh[i] : t));
    if (!matches(next).length && moves(next).length) return next;
  }
  throw Error("Unable to recover a playable board while preserving obstacles");
}
