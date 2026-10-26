import { test } from "node:test";
import assert from "node:assert/strict";
import { sound, soundNotes, unlockAudio, ceremonyMusic } from "../src/audio.ts";
import { hapticPower } from "../src/haptics.ts";
import { BRUNO_SIGNATURE } from "../src/narrative.ts";
test("audio is gated by interaction and has distinct, bounded identities", async () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  let created = 0,
    starts = 0,
    stops = 0;
  const peaks: number[] = [];
  class FakeAudio {
    state = "running";
    currentTime = 0;
    destination = {};
    constructor() {
      created++;
    }
    resume() {
      return Promise.resolve();
    }
    createOscillator() {
      return {
        type: "sine",
        frequency: { value: 0 },
        connect() {},
        disconnect() {},
        start() {
          starts++;
        },
        stop() {
          stops++;
        },
        onended: null,
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime(v: number) {
            peaks.push(v);
          },
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
  }
  Object.defineProperty(globalThis, "AudioContext", {
    value: FakeAudio,
    configurable: true,
  });
  try {
    sound(true, "match");
    ceremonyMusic(true, "family")();
    assert.equal(created, 0);
    unlockAudio();
    assert.equal(created, 1);
    for (const kind of Object.keys(soundNotes) as (keyof typeof soundNotes)[])
      sound(true, kind);
    assert.ok(starts > 20);
    assert.equal(
      new Set(Object.values(soundNotes).map((n) => n.join(","))).size,
      8,
    );
    assert.ok(peaks.every((v) => v <= 0.035));
    const stop = ceremonyMusic(true, "family");
    await Promise.resolve();
    const before = stops;
    stop();
    assert.ok(stops > before);
  } finally {
    if (old) Object.defineProperty(globalThis, "AudioContext", old);
    else Reflect.deleteProperty(globalThis, "AudioContext");
  }
});
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
