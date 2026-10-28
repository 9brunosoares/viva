import test from "node:test";
import assert from "node:assert/strict";
import {
  tile,
  gift,
  keepsake,
  matches,
  validSwap,
  moves,
  resolveWave,
  fall,
  reshuffle,
  createBoard,
  COLS,
} from "../src/engine";
import {
  newObstacles,
  sweepObstacles,
  bottomKeepsakes,
  spawnKeepsake,
  obstaclesDone,
  obstacleSpec,
} from "../src/obstacles";
import { levels } from "../src/config";
import { balancedLevel } from "../src/difficulty";
import { validSnapshot } from "../src/session";
import { chooseHint } from "../src/hint";
const rng =
  (seed = 42) =>
  () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
const plain = () =>
  Array.from({ length: 56 }, (_, i) => tile((Math.floor(i / 7) + (i % 7)) % 6));
test("roles never match; gifts never swap, ingredients require a genuine match even beside a power", () => {
  const b = plain();
  b[0] = gift();
  b[1] = gift();
  b[2] = gift();
  assert.equal(matches(b).length, 0);
  assert.equal(validSwap(b, 0, 7), false);
  b[0] = keepsake();
  b[1] = keepsake();
  b[2] = keepsake();
  assert.equal(matches(b).length, 0);
  b[7] = tile(5, "row");
  assert.equal(validSwap(b, 0, 7), false);
  b[0] = tile(1);
  b[1] = keepsake();
  b[2] = tile(1);
  b[3] = tile(1);
  assert.equal(validSwap(b, 0, 1), true);
});
test("gift takes one hit per wave from orthogonal matches and powers, survives the first", () => {
  const b = plain();
  b[0] = tile(5, "row");
  b[1] = tile(5);
  b[2] = tile(5);
  b[8] = gift();
  let w = resolveWave(b, 0, [0]);
  assert.deepEqual(w.giftHits, [8]);
  assert.equal(w.board[8].hp, 1);
  assert.ok(!w.clear.includes(8));
  w = resolveWave(w.board, 0, [0]);
  assert.deepEqual(w.giftsOpened, [8]);
  assert.ok(w.clear.includes(8));
  assert.equal(
    w.collected.reduce((a, b) => a + b, 0),
    7,
  );
});
test("powers sweep petals even over a surviving ingredient, never destroy that ingredient", () => {
  const b = plain();
  b[1] = keepsake();
  b[0] = tile(0, "row");
  const spec = { petals: 1, gifts: 0, keepsakes: 0 };
  const { state } = newObstacles(b);
  state.petals[1] = true;
  const w = resolveWave(b, 0, [0]);
  assert.ok(!w.clear.includes(1));
  const s = sweepObstacles(state, w);
  assert.equal(s.swept, 1);
  assert.ok(obstaclesDone(s, spec));
  assert.equal(w.board[1].role, "keepsake");
});
test("opening a gift by adjacency also sweeps its cell, color never treats obstacle sentinels as a color", () => {
  const b = plain();
  b[0] = tile(5);
  b[1] = tile(5);
  b[2] = tile(5);
  b[8] = gift(1);
  const state = newObstacles(b).state;
  state.petals[8] = true;
  const wave = resolveWave(b);
  assert.ok(wave.clear.includes(8));
  assert.equal(sweepObstacles(state, wave).swept, 1);
  const colored = plain();
  colored[0] = tile(0, "color");
  colored[1] = keepsake();
  colored[20] = gift();
  const colorWave = resolveWave(colored, 0, [0], -1);
  assert.equal(colorWave.giftHits?.length, 0);
  assert.ok(!colorWave.clear.includes(1));
  assert.ok(colorWave.collected[0] > 0);
});
test("gravity preserves role and health; collection only at stable bottom, spawn stays at top", () => {
  const b = plain();
  b[0] = gift(1);
  b[1] = keepsake();
  let n = fall(b, [7, 8, 14, 15], rng());
  assert.equal(n[14].hp, 1);
  assert.equal(n[15].role, "keepsake");
  assert.deepEqual(bottomKeepsakes(n), []);
  n[50] = keepsake();
  assert.deepEqual(bottomKeepsakes(n), [50]);
  const initial = newObstacles(plain());
  const spawned = spawnKeepsake(
    initial.board,
    initial.state,
    { petals: 0, gifts: 0, keepsakes: 1 },
    rng(),
  );
  assert.equal(spawned.state.spawned, 1);
  assert.ok(spawned.board.slice(0, COLS).some((t) => t.role === "keepsake"));
  assert.equal(
    spawnKeepsake(spawned.board, spawned.state, {
      petals: 0,
      gifts: 0,
      keepsakes: 1,
    }).board,
    spawned.board,
  );
});
test("generation and recovery preserve roles and petals, produce no matches and legal hints", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const r = rng(seed);
    const setup = newObstacles(
      createBoard(r),
      { petals: 6, gifts: 3, keepsakes: 1 },
      r,
    );
    setup.board[0] = keepsake();
    const roles = setup.board.flatMap((t, i) => (t.role ? [{ i, t }] : []));
    const b = reshuffle(setup.board, r);
    assert.equal(matches(b).length, 0);
    assert.ok(moves(b).length);
    roles.forEach(({ i, t }) => assert.deepEqual(b[i], t));
    assert.equal(setup.state.petals.filter(Boolean).length, 6);
    const hint = chooseHint(b, [], Array(6).fill(0), false, setup.state);
    assert.ok(validSwap(b, hint[0], hint[1]));
    assert.ok(hint.every((i) => b[i].role !== "gift"));
  }
});
test("legacy snapshots remain valid, new roles require valid obstacle state; goals and moves are frozen", () => {
  const base = {
    board: plain(),
    remaining: 20,
    counts: Array(6).fill(0),
    powers: 0,
    cascades: 0,
    round: 1,
  };
  assert.ok(validSnapshot(base));
  const next = newObstacles(
    createBoard(rng()),
    { petals: 1, gifts: 1, keepsakes: 1 },
    rng(),
  );
  assert.ok(
    validSnapshot({
      ...base,
      board: next.board,
      obstacles: next.state,
      won: true,
    }),
  );
  assert.ok(!validSnapshot({ ...base, board: next.board }));
  assert.ok(
    !validSnapshot({
      ...base,
      board: next.board,
      obstacles: { ...next.state, petals: [false] },
    }),
  );
  for (const l of levels)
    for (const d of ["easy", "medium", "hard"] as const) {
      const original = balancedLevel(l, d),
        spec = obstacleSpec(original, d);
      assert.equal(original.moves, balancedLevel(l, d).moves);
      assert.deepEqual(original.targets, balancedLevel(l, d).targets);
      if (spec) assert.ok(spec.petals + spec.gifts + spec.keepsakes > 0);
      assert.equal(obstacleSpec(original, d, true), undefined);
    }
});
