import test from "node:test";
import assert from "node:assert/strict";
import { readTestMode, saveTestMode, TEST_MODE_KEY } from "../src/testMode";
import { restartJourney } from "../src/restart";
import { fresh, KEY } from "../src/progress";
import { tileArt } from "../src/tileArt";
test("test mode defaults off for absent, malformed and unavailable preferences", () => {
  for (const value of [null, "false", "1", "TRUE", "{}", "null", '"true"'])
    assert.equal(readTestMode({ getItem: () => value }), false);
  assert.equal(readTestMode({ getItem: () => "true" }), true);
  assert.equal(
    readTestMode({
      getItem: () => {
        throw Error("blocked");
      },
    }),
    false,
  );
  assert.equal(
    saveTestMode(true, {
      setItem: () => {
        throw Error("quota");
      },
    }),
    false,
  );
});
test("local mode persists independently and survives a confirmed new journey", () => {
  const data = new Map<string, string>([
    [KEY, JSON.stringify(fresh())],
  ]);
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  assert.equal(saveTestMode(true, storage), true);
  assert.equal(data.get(TEST_MODE_KEY), "true");
  assert.equal(readTestMode(storage), true);
  assert.ok(restartJourney(storage));
  assert.equal(readTestMode(storage), true);
  assert.equal(saveTestMode(false, storage), true);
  assert.equal(readTestMode(storage), false);
});
test("all 61 approved normal sprites have finite, bounded optical fits including seven tattoo drawings", () => {
  assert.equal(Object.keys(tileArt).length, 61);
  for (const [key, [scale, x, y]] of Object.entries(tileArt)) {
    assert.ok(scale > 0.8 && scale < 1.2, key);
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
    assert.ok(Math.abs(x) < 5 && Math.abs(y) < 5, key);
  }
  for (let k = 0; k < 7; k++) assert.ok(tileArt[`9-${k}`]);
});
