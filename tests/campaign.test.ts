import test from "node:test";
import assert from "node:assert/strict";
import { levels, legacyLevels, names, books } from "../src/config";
import {
  createBoard,
  matches,
  moves,
  swap,
  resolveWave,
  fall,
  ensurePlayable,
  tile,
  type Board,
} from "../src/engine";
import { powerHitDelay } from "../src/powerTimeline";
import { balancedLevel } from "../src/difficulty";
import { vfxAtlas } from "../src/vfxAtlas";
import { shelfPositions } from "../src/libraryLayout";
import { spineMetrics } from "../src/spineMetrics";
function random(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
test("campaign profiles generate and refill only their own pieces, always offer a legal move", () => {
  for (const level of levels)
    for (let seed = 1; seed <= 24; seed++) {
      const rng = random(seed + level.id * 321),
        rules = level.rules!;
      let b = createBoard(rng, rules);
      assert.equal(b.length, 56);
      assert.equal(matches(b).length, 0);
      for (let turn = 0; turn < 5; turn++) {
        assert.ok(b.every((t) => rules.kinds.includes(t.kind)));
        const [a, c] = moves(b)[0];
        assert.notEqual(a, undefined);
        b = swap(b, a, c);
        let active = [a, c].filter((i) => b[i].special),
          depth = 0;
        while (matches(b).length || active.length) {
          const wave = resolveWave(b, c, active, undefined, rules);
          active = [];
          assert.ok(
            wave.created.every(
              (i) => rules.powerTier === 3 || wave.board[i].special !== "color",
            ),
          );
          assert.ok(
            wave.created.every(
              (i) => rules.powerTier >= 2 || wave.board[i].special !== "area",
            ),
          );
          b = fall(wave.board, wave.clear, rng, rules);
          if (++depth === 80) {
            b = createBoard(rng, rules);
            break;
          }
        }
        b = ensurePlayable(b, rng, rules);
        assert.ok(moves(b).length);
      }
    }
});
test("seven personal tattoo kinds are supported without changing the old six-kind engine defaults", () => {
  assert.equal(levels[8].name, "Tatuagens");
  assert.equal(names[8].length, 7);
  assert.equal(books.length, 10);
  const board = createBoard(random(142), levels[8].rules);
  assert.ok(board.some((t) => t.kind === 6));
  const legacy = createBoard(random(142));
  assert.ok(legacy.every((t) => t.kind < 6));
  const b = Array.from({ length: 56 }, (_, i) =>
    tile((Math.floor(i / 7) + (i % 7)) % 6),
  );
  b[0] = tile(6);
  b[1] = tile(6);
  b[2] = tile(6);
  const w = resolveWave(b);
  assert.equal(w.collected[6], 3);
  assert.equal(w.collected.length, 7);
  assert.ok(
    levels[8].targets.every((t) => levels[8].rules!.kinds.includes(t.kind)),
  );
});
test("legacy goals stay frozen, new difficulty profiles and infinite keep solvable goals", () => {
  assert.equal(legacyLevels[8].moves, 52);
  assert.equal(legacyLevels[8].rules, undefined);
  for (const level of levels)
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const l = balancedLevel(level, difficulty);
      assert.ok(l.moves > 0);
      assert.ok(
        l.targets.every((t) => l.rules!.kinds.includes(t.kind) && t.amount > 0),
      );
      const inf = balancedLevel(level, difficulty, true);
      assert.equal(inf.rules!.powerTier, 3);
      assert.equal(inf.rules!.kinds.length, level.id === 9 ? 7 : 6);
    }
});
test("power front arrival and disappearance are spatially consistent, including chained intersections", () => {
  assert.equal(powerHitDelay(24, [{ index: 24, type: "row" }]), 70);
  assert.equal(powerHitDelay(27, [{ index: 24, type: "row" }]), 196);
  assert.equal(powerHitDelay(3, [{ index: 24, type: "column" }]), 196);
  assert.equal(powerHitDelay(0, [{ index: 24, type: "row" }]), 0);
  assert.equal(
    powerHitDelay(27, [
      { index: 24, type: "row" },
      { index: 27, type: "column" },
    ]),
    70,
  );
  assert.ok(powerHitDelay(49, [{ index: 0, type: "column" }]) + 360 < 760);
});
test("native frame sequences have varying durations and fixed-square storage without runtime axis stretching", () => {
  for (const seq of Object.values(vfxAtlas.sequences)) {
    assert.equal(seq.frames.length, seq.durations.length);
    assert.ok(seq.frames.length === 1 || seq.frames.length >= 7);
    if (seq.frames.length > 1) assert.ok(new Set(seq.durations).size > 1);
    assert.ok(seq.frames.every((i) => i >= 0 && i < 80));
  }
});
test("each evolution has deterministic shelf support, bounded art and exactly ten collectible destinations", () => {
  for (const [state, count] of [
    [0, 1],
    [1, 4],
    [2, 7],
    [3, 10],
  ]) {
    const p = shelfPositions(state);
    assert.equal(p.length, 10); // Ten reserved destinations in every evolution.
    assert.deepEqual(p, shelfPositions(state));
    for (const slot of p) {
      assert.ok(slot.left > 45 && slot.left < 90);
      assert.ok(slot.height > 0 && slot.height < 9);
      assert.ok(slot.bottom > 50 && slot.bottom < 90);
      assert.ok(slot.surface);
    }
  }
  assert.equal(Object.keys(spineMetrics).length, 10);
  for (const m of Object.values(spineMetrics)) {
    assert.ok(m.artWidth > 0 && m.artHeight > 0);
    assert.ok(m.artWidth <= m.width && m.artHeight <= m.height);
  }
});
