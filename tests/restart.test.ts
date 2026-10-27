import test from "node:test";
import assert from "node:assert/strict";
import { restartJourney } from "../src/restart";
import { KEY, validate } from "../src/progress";
import { SESSION_KEY, STORIES_KEY } from "../src/session";
import { DIFFICULTY_KEY } from "../src/difficulty";
function storage() {
  const data = new Map<string, string>([
    [KEY, "old progress"],
    [SESSION_KEY, "old session"],
    [STORIES_KEY, "old stories"],
    [DIFFICULTY_KEY, "hard"],
    ["viva-audio-v3", "muted"],
    ["unrelated", "keep"],
  ]);
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
}
test("confirmed restart creates a valid fresh shuffled campaign and removes only journey data", () => {
  const s = storage(),
    p = restartJourney(s, () => 0.3)!;
  assert.ok(validate(p));
  assert.deepEqual(p.completed, []);
  assert.deepEqual(p.revealed, []);
  assert.equal(p.pendingCelebration, undefined);
  assert.equal(new Set(p.order).size, 10);
  assert.deepEqual(JSON.parse(s.getItem(KEY)!), p);
  for (const k of [SESSION_KEY, STORIES_KEY, DIFFICULTY_KEY])
    assert.equal(s.getItem(k), null);
  assert.equal(s.getItem("viva-audio-v3"), "muted");
  assert.equal(s.getItem("unrelated"), "keep");
});
test("a write failure leaves the previous progress untouched", () => {
  const s = storage();
  assert.equal(
    restartJourney({
      ...s,
      setItem: () => {
        throw Error("blocked");
      },
    }),
    null,
  );
  assert.equal(s.getItem(KEY), "old progress");
  assert.equal(s.getItem(SESSION_KEY), "old session");
});
test("a failed removal rolls the journey records back instead of claiming success", () => {
  const s = storage(),
    before = [...s.data];
  let failed = false;
  assert.equal(
    restartJourney({
      ...s,
      removeItem: (k) => {
        if (k === STORIES_KEY && !failed) {
          failed = true;
          throw Error("blocked");
        }
        s.removeItem(k);
      },
    }),
    null,
  );
  assert.deepEqual([...s.data].sort(), before.sort());
});
