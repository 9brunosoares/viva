import test from "node:test";
import assert from "node:assert/strict";
import { tile, resolveWave } from "../src/engine";
import { feedbackProfile, fallDuration, ParticlePool } from "../src/vfx";

test("presentation profiles distinguish 3/4/5 and combined powers without altering engine output", () => {
  for (const length of [3, 4, 5]) {
    const b = Array.from({ length: 56 }, (_, i) =>
      tile((Math.floor(i / 7) + (i % 7)) % 6),
    );
    for (let i = 21; i < 21 + length; i++) b[i] = tile(0);
    if (length === 3) b[24] = tile(2);
    const w = resolveWave(b, 23),
      before = JSON.stringify(w);
    const p = feedbackProfile(w.board, w, 0);
    assert.equal(p.tier, length);
    assert.equal(JSON.stringify(w), before);
    assert.ok(p.clearMs <= 450 && p.fallMs >= 235);
  }
  const b = Array.from({ length: 56 }, (_, i) =>
    tile((Math.floor(i / 7) + (i % 7)) % 6),
  );
  b[24] = tile(0, "row");
  b[25] = tile(1, "column");
  const w = resolveWave(b, undefined, [24, 25]);
  assert.ok(w.powers >= 2);
  assert.equal(feedbackProfile(w.board, w, 9).intensity, 3);
  assert.ok(
    feedbackProfile(w.board, w, 9).burstLimit >
      feedbackProfile(b, { ...w, powers: 0, effects: [] }, 0).burstLimit,
  );
  assert.equal(fallDuration(99), 235);
});
test("particle objects are reused under stress and arrivals fire once after their delay", () => {
  const pool = new ParticlePool(180),
    refs = pool.particles.slice();
  for (let n = 0; n < 2000; n++) pool.emit({ life: 0.3, age: -0.1 });
  assert.equal(pool.particles.length, 180);
  assert.equal(pool.count(), 180);
  assert.ok(pool.dropped > 0);
  assert.ok(pool.particles.every((p, i) => p === refs[i]));
  pool.clear();
  let arrivals = 0;
  pool.emit({ type: "flight", age: -0.1, life: 0.3, target: 2 });
  pool.step(0.2, () => arrivals++);
  assert.equal(arrivals, 0);
  pool.step(0.21, (kind) => {
    assert.equal(kind, 2);
    arrivals++;
  });
  pool.step(2, () => arrivals++);
  assert.equal(arrivals, 1);
  assert.equal(pool.count(), 0);
  const random = Math.random;
  Math.random = () => {
    throw Error("visual feedback must not consume gameplay randomness");
  };
  try {
    pool.emit({});
    pool.step(0.1);
    pool.clear();
  } finally {
    Math.random = random;
  }
});
