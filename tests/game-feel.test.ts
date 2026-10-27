import test from "node:test";
import assert from "node:assert/strict";
import { gestureIntent } from "../src/boardInput";
import { TurnSequence } from "../src/TurnSequence";
import { chooseHint } from "../src/hint";
import {
  adjacent,
  createBoard,
  moves,
  tile,
  validSwap,
  fall,
} from "../src/engine";
import { fallWait, fallTweenDuration, fallDuration } from "../src/vfx";

test("short swipes, jitter, diagonals and all board edges have unambiguous intents", () => {
  assert.deepEqual(gestureIntent(24, 11, 1, 40), { kind: "swap", target: 25 });
  assert.deepEqual(gestureIntent(24, -11, 0, 40), { kind: "swap", target: 23 });
  assert.deepEqual(gestureIntent(24, 0, -11, 40), { kind: "swap", target: 17 });
  assert.deepEqual(gestureIntent(24, 0, 11, 40), { kind: "swap", target: 31 });
  assert.deepEqual(gestureIntent(24, 4, 6, 40), { kind: "tap" });
  for (const [x, y] of [
    [30, 30],
    [-30, 30],
    [30, -30],
    [-30, -30],
    [40, 35],
  ])
    assert.equal(gestureIntent(24, x, y, 40).kind, "cancel");
  for (const [i, x, y] of [
    [0, -20, 0],
    [6, 20, 0],
    [0, 0, -20],
    [55, 0, 20],
  ])
    assert.equal(gestureIntent(i, x, y, 40).kind, "cancel");
  for (const i of [-1, 56, 1.5, NaN])
    assert.equal(gestureIntent(i, 20, 0, 40).kind, "cancel");
});
test("out-of-range and noninteger adjacency is safely rejected even next to a special", () => {
  const b = createBoard(() => 0.4);
  b[0] = tile(0, "row");
  for (const [a, c] of [
    [-1, 0],
    [49, 56],
    [0, -7],
    [1.5, 2.5],
    [NaN, 0],
    [6, 7],
  ]) {
    assert.equal(adjacent(a, c), false);
    assert.equal(validSwap(b, a, c), false);
  }
});
test("cancelled turns resolve waits and never execute stale work after restart/unmount", async () => {
  const s = new TurnSequence(),
    a = s.begin();
  const waiting = s.wait(10000, a);
  s.cancel();
  assert.equal(await waiting, false);
  assert.equal(await s.wait(1, a), false);
  const b = s.begin(),
    next = s.wait(10000, b),
    c = s.begin();
  assert.equal(await next, false);
  assert.equal(s.current(b), false);
  assert.equal(await s.wait(1, c), true);
  s.cancel();
});
test("hint favors useful combinations without changing tiles, random draws or IDs", () => {
  let seed = 935;
  const rng = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const oldRandom = Math.random;
  for (let n = 0; n < 80; n++) {
    const b = createBoard(rng),
      before = JSON.stringify(b),
      serial = tile(0).id;
    Math.random = () => {
      throw Error("hint must not consume gameplay RNG");
    };
    try {
      const hint = chooseHint(b, [{ kind: 0, amount: 20 }], [0, 0, 0, 0, 0, 0]);
      assert.equal(hint.length, 2);
      assert.ok(validSwap(b, hint[0], hint[1]));
      assert.equal(JSON.stringify(b), before);
      assert.equal(tile(0).id, serial + 1);
      assert.deepEqual(
        hint,
        chooseHint(b, [{ kind: 0, amount: 20 }], [0, 0, 0, 0, 0, 0]),
      );
    } finally {
      Math.random = oldRandom;
    }
  }
  const b = Array.from({ length: 56 }, (_, i) =>
    tile((Math.floor(i / 7) + (i % 7)) % 6),
  );
  assert.equal(moves(b).length, 0);
  assert.deepEqual(chooseHint(b, [], []), []);
});
test("fall wait includes every actual tween/stagger but removes dead time in shallow falls", () => {
  const b = Array.from({ length: 56 }, (_, i) => tile(i % 6));
  for (const depth of [0, 1, 4, 12]) {
    for (const cells of [
      [49, 50, 51],
      [0, 7, 14, 21, 28, 35, 42, 49],
    ]) {
      const after = fall(b, cells, () => 0.3),
        origins = new Map<number, number>();
      const wait = fallWait(b, after, origins, depth, 44);
      assert.ok(wait <= fallDuration(depth));
      const old = new Map(b.map((t, i) => [t.id, i]));
      const incoming = Array.from(
        { length: 7 },
        (_, x) => after.filter((t, i) => i % 7 === x && !old.has(t.id)).length,
      );
      after.forEach((t, i) => {
        const from = old.get(t.id);
        if (from === i) return;
        const dy =
          from === undefined
            ? -incoming[i % 7] * 44
            : (Math.floor(from / 7) - Math.floor(i / 7)) * 44;
        assert.ok(wait >= fallTweenDuration(dy, depth) + (i % 7) * 3);
      });
    }
  }
  const after = fall(b, [49, 50, 51], () => 0.3);
  assert.ok(fallWait(b, after, new Map(), 0, 44) < 300);
  assert.ok(
    fallWait(b, b, new Map([[b[24].id, 24]]), 10, 44) >= 320,
    "power creation must finish even in a shallow fall",
  );
});
