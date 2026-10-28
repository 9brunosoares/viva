import test from "node:test";
import assert from "node:assert/strict";
import { consumeUpdateReturn } from "../src/usePwaUpdates";
import { writeSession, SESSION_KEY } from "../src/session";

test("update return is consumed once, accepts only quiet screens and leaves progress alone", () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map<string, string>([["unrelated", "keep"]]),
    reads: string[] = [];
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => {
        reads.push(key);
        return values.get(key) ?? null;
      },
      removeItem: (key: string) => values.delete(key),
    },
  });
  try {
    for (const route of [
      "home",
      "library",
      "levels",
      "game",
      "celebration",
      "invalid",
    ]) {
      values.set("viva-update-return", route);
      assert.equal(
        consumeUpdateReturn(),
        ["home", "library", "levels"].includes(route) ? route : null,
      );
      assert.equal(consumeUpdateReturn(), null);
    }
    assert.equal(values.get("unrelated"), "keep");
    assert.ok(reads.every((k) => k === "viva-update-return"));
  } finally {
    if (old) Object.defineProperty(globalThis, "sessionStorage", old);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
test("session persistence reports success/failure so an update can defer without deleting progress", () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "localStorage"),
    calls: string[] = [];
  const session = {
    version: 2,
    campaign: "1,2,3,4,5,6,7,8,9,10",
    completedCount: 0,
    stage: 1,
    endless: false,
    difficulty: "easy",
    phase: "intro",
  } as const;
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        setItem: (key: string) => calls.push(key),
        removeItem: (key: string) => calls.push(key),
      },
    });
    assert.equal(writeSession(session), true);
    assert.equal(writeSession(null), true);
    assert.deepEqual(calls, [SESSION_KEY, SESSION_KEY]);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        setItem: () => {
          throw Error("quota");
        },
        removeItem: () => {
          throw Error("blocked");
        },
      },
    });
    assert.equal(writeSession(session), false);
    assert.equal(writeSession(null), false);
  } finally {
    if (old) Object.defineProperty(globalThis, "localStorage", old);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
