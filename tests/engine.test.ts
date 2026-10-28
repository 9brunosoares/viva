import { finishMilestone, acceptMilestoneBook } from "../src/progress.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBoard,
  matches,
  moves,
  swap,
  validSwap,
  tile,
  resolveWave,
  fall,
  ensurePlayable,
  Board,
} from "../src/engine.ts";
import {
  fresh,
  complete,
  validate,
  load,
  save,
  libraryState,
  KEY,
} from "../src/progress.ts";
function seeded(seed = 934) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function plain(): Board {
  return Array.from({ length: 56 }, (_, i) =>
    tile((Math.floor(i / 7) + (i % 7)) % 6),
  );
}
test("100 initial boards: no matches, always playable", () => {
  const r = seeded();
  for (let i = 0; i < 100; i++) {
    const b = createBoard(r);
    assert.equal(matches(b).length, 0);
    assert.ok(moves(b).length);
  }
});
test("valid and invalid swaps, including row boundary", () => {
  const b = createBoard(seeded());
  const [a, c] = moves(b)[0];
  assert.ok(validSwap(b, a, c));
  assert.ok(matches(swap(b, a, c)).length);
  assert.equal(validSwap(b, 6, 7), false);
  assert.equal(validSwap(b, 0, 55), false);
  const invalid = b
    .flatMap((_, i) => (i % 7 < 6 ? [[i, i + 1]] : []))
    .find(([a, c]) => !validSwap(b, a, c))!;
  assert.equal(validSwap(b, ...(invalid as [number, number])), false);
});
test("horizontal and vertical simultaneous matches", () => {
  const b = plain();
  [0, 1, 2, 14, 21, 28].forEach((i) => (b[i] = tile(5)));
  const m = matches(b);
  assert.ok(m.some((m) => m.axis === "row"));
  assert.ok(m.some((m) => m.axis === "column"));
});
test("four, five and intersections create actual powers", () => {
  for (const [length, power] of [
    [4, "row"],
    [5, "color"],
  ] as const) {
    const b = plain();
    for (let i = 0; i < length; i++) b[i] = tile(5);
    const w = resolveWave(b, 1);
    assert.equal(w.board[1].special, power);
    assert.equal(w.clear.includes(1), false);
  }
  const b = plain();
  [2, 8, 9, 10, 16].forEach((i) => (b[i] = tile(5)));
  assert.equal(resolveWave(b).board[9].special, "area");
});
test("activation clears line and triggers chained specials", () => {
  const b = plain();
  b[0] = tile(0, "row");
  b[3] = tile(3, "column");
  const w = resolveWave(b, undefined, [0]);
  assert.equal(w.powers, 2);
  assert.ok(
    [0, 1, 2, 3, 4, 5, 6, 10, 17, 24, 31, 38, 45, 52].every((i) =>
      w.clear.includes(i),
    ),
  );
});
test("color activation targets matching kinds", () => {
  const b = plain();
  b[0] = tile(0, "color");
  const w = resolveWave(b, undefined, [0], 2);
  assert.ok(b.every((t, i) => t.kind !== 2 || w.clear.includes(i)));
});
test("gravity keeps survivor order and refills; cascades resolve", () => {
  const b = plain();
  [0, 1, 2].forEach((i) => (b[i] = tile(5)));
  const w = resolveWave(b);
  const n = fall(w.board, w.clear, seeded());
  assert.equal(n.length, 56);
  assert.equal(n[49].id, b[49].id);
  assert.ok(n.every((t) => t.kind >= 0 && t.kind < 6));
});
test("no moves detected and reshuffled to playable board", () => {
  const b = plain();
  assert.equal(moves(b).length, 0);
  const n = ensurePlayable(b, seeded());
  assert.ok(moves(n).length);
  assert.equal(matches(n).length, 0);
});
test("campaign grants exactly ten unique books, replay is idempotent", () => {
  let p = fresh();
  const order = p.order.slice();
  for (let i = 1; i <= 10; i++) {
    p = finishMilestone(acceptMilestoneBook(complete(p, i)));
    assert.equal(p.completed.length, i);
    assert.deepEqual(complete(p, i), p);
  }
  assert.equal(new Set(p.order.slice(0, p.completed.length)).size, 10);
  assert.deepEqual(order, p.order);
  assert.equal(libraryState(0), 0);
  assert.equal(libraryState(2), 1);
  assert.equal(libraryState(5), 2);
  assert.equal(libraryState(8), 3);
});
test("persistence restores order, preferences and milestones", () => {
  let p = fresh();
  for (let i = 1; i <= 6; i++)
    p = finishMilestone(acceptMilestoneBook(complete(p, i)));
  p.sound = false;
  const store = new Map<string, string>();
  const storage = {
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    getItem: (k: string) => store.get(k) ?? null,
  };
  assert.ok(save(p, storage));
  assert.deepEqual(load(storage).progress, p);
  assert.equal(load(storage).progress.completed.length + 1, 7);
  store.set(KEY, "{bad");
  assert.ok(load(storage).warning);
  assert.ok(validate(load(storage).progress));
  assert.equal(
    save(p, {
      setItem: () => {
        throw Error();
      },
    }),
    false,
  );
  assert.ok(
    load({
      getItem: () => {
        throw Error();
      },
    }).warning,
  );
});
test("malformed progress and out-of-order completion rejected", () => {
  const p = fresh();
  assert.deepEqual(complete(p, 2), p);
  assert.equal(validate({ ...p, order: Array(10).fill(1) }), false);
  assert.equal(validate({ ...p, completed: [1, 3] }), false);
});
