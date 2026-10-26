import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fresh,
  complete,
  isRevealed,
  acceptMilestoneBook,
  finishMilestone,
  validate,
  load,
  save,
  Progress,
} from "../src/progress.ts";
function advance(n: number) {
  let p = fresh(() => 0.33);
  for (let i = 1; i <= n; i++)
    p = finishMilestone(acceptMilestoneBook(complete(p, i)));
  return p;
}
test("book, reveal and acknowledgment gate each milestone without duplicate rewards", () => {
  for (const [n, kind] of [
    [5, "blade"],
    [10, "family"],
  ] as const) {
    let p = complete(advance(n - 1), n);
    const order = p.order.slice();
    assert.equal(p.pendingCelebration?.step, "book");
    assert.equal(isRevealed(p, kind), false);
    assert.ok(validate(p));
    assert.deepEqual(complete(p, n + 1), p);
    assert.deepEqual(complete(p, n), p);
    p = acceptMilestoneBook(p);
    assert.equal(p.pendingCelebration?.step, "reveal");
    assert.equal(isRevealed(p, kind), false);
    assert.ok(validate(p));
    p = finishMilestone(p);
    assert.equal(isRevealed(p, kind), true);
    assert.equal(p.pendingCelebration, undefined);
    assert.ok(validate(p));
    assert.deepEqual(p.order, order);
    assert.deepEqual(finishMilestone(p), p);
  }
});
test("both interruption points restore the exact saved book and moment", () => {
  let p = complete(advance(9), 10);
  for (let i = 0; i < 2; i++) {
    let raw = "";
    const storage = {
      setItem: (_: string, v: string) => {
        raw = v;
      },
      getItem: () => raw,
    };
    assert.ok(save(p, storage));
    const restored = load(storage);
    assert.deepEqual(restored.progress, p);
    assert.equal(restored.warning, "");
    p = acceptMilestoneBook(p);
  }
});
test("legacy campaign preserves all existing achievements and randomized order", () => {
  for (const n of [0, 4, 5, 6, 9, 10]) {
    const p = advance(n);
    const { revealed, pendingCelebration, ...legacy } = p;
    assert.ok(validate(legacy));
    assert.equal(isRevealed(legacy, "blade"), n >= 5);
    assert.equal(isRevealed(legacy, "family"), n >= 10);
    const restored = load({ getItem: () => JSON.stringify(legacy) });
    assert.deepEqual(restored.progress, legacy);
  }
  const p = advance(4);
  const { revealed, ...legacy } = p;
  const won = complete(legacy, 5);
  assert.equal(isRevealed(won, "blade"), false);
  assert.equal(won.pendingCelebration?.kind, "blade");
});
test("reject forged, prematurely acknowledged or mismatched pending milestones", () => {
  const p = complete(advance(4), 5);
  assert.equal(
    validate({
      ...p,
      pendingCelebration: { ...p.pendingCelebration, bookId: 0 },
    }),
    false,
  );
  assert.equal(validate({ ...p, revealed: ["blade"] }), false);
  assert.equal(
    validate({
      ...p,
      pendingCelebration: { ...p.pendingCelebration, step: "other" },
    }),
    false,
  );
  assert.equal(validate({ ...fresh(), revealed: ["family"] }), false);
});
