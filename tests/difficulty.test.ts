import test from "node:test";
import assert from "node:assert/strict";
import { levels } from "../src/config";
import { balancedLevel } from "../src/difficulty";

test("easy preserves every existing level and special objective exactly", () => {
  for (const level of levels) {
    assert.equal(balancedLevel(level, "easy"), level);
    assert.equal(level.moves, 36 + (level.id - 1) * 2);
  }
});
test("medium and hard scale goals without mutating the original or removing powers", () => {
  for (const base of levels) {
    const before = JSON.stringify(base);
    const medium = balancedLevel(base, "medium"),
      hard = balancedLevel(base, "hard");
    assert.ok(medium.moves > base.moves && hard.moves < medium.moves);
    base.targets.forEach((t, i) => {
      assert.equal(medium.targets[i].kind, t.kind);
      assert.equal(hard.targets[i].kind, t.kind);
      assert.ok(medium.targets[i].amount > t.amount);
      assert.ok(hard.targets[i].amount > medium.targets[i].amount);
    });
    assert.ok(hard.powers >= medium.powers && medium.powers >= base.powers);
    assert.ok(
      hard.cascades >= medium.cascades && medium.cascades >= base.cascades,
    );
    assert.equal(JSON.stringify(base), before);
  }
});
test("infinite retains its theme and scales recurring goals with no power restrictions", () => {
  for (const d of ["easy", "medium", "hard"] as const) {
    const l = balancedLevel(levels[6], d, true);
    assert.equal(l.id, 7);
    assert.equal(l.powers, 0);
    assert.equal(l.cascades, 0);
    assert.deepEqual(
      l.targets.map((t) => t.kind),
      [0, 3],
    );
    assert.ok(l.targets.every((t) => t.amount >= 20));
  }
});
