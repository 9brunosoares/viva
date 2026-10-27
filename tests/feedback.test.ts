import { test } from "node:test";
import assert from "node:assert/strict";
import { hapticPower } from "../src/haptics.ts";
import { BRUNO_SIGNATURE } from "../src/narrative.ts";
test("unsupported, reduced-motion or failing vibration degrades silently", () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  try {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });
    assert.equal(hapticPower(), false);
    const patterns: unknown[] = [];
    Object.defineProperty(globalThis, "navigator", {
      value: {
        vibrate: (p: unknown) => {
          patterns.push(p);
          return true;
        },
      },
      configurable: true,
    });
    assert.equal(hapticPower(false, true), false);
    assert.equal(hapticPower(true), true);
    assert.deepEqual(patterns, [[12, 24, 16]]);
    Object.defineProperty(globalThis, "navigator", {
      value: {
        vibrate: () => {
          throw Error();
        },
      },
      configurable: true,
    });
    assert.equal(hapticPower(), false);
  } finally {
    if (old) Object.defineProperty(globalThis, "navigator", old);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});
test("Bruno signature is exact", () =>
  assert.equal(
    BRUNO_SIGNATURE,
    "Jogo criado por Bruno, um filho que te ama pra sempre e te admira pela eternidade.",
  ));
