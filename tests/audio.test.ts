import test from "node:test";
import assert from "node:assert/strict";
import {
  AudioDirector,
  soundNotes,
  readAudioPreferences,
  AUDIO_KEY,
} from "../src/audio";
class Param {
  value = 1;
  events: [string, number, number][] = [];
  setValueAtTime(v: number, t: number) {
    this.value = v;
    this.events.push(["set", v, t]);
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.events.push(["ramp", v, t]);
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.events.push(["exp", v, t]);
  }
  cancelScheduledValues() {}
  setTargetAtTime(v: number) {
    this.value = v;
  }
}
class Node {
  gain = new Param();
  frequency = new Param();
  type = "";
  ended = false;
  onended?: () => void;
  disconnected = false;
  startAt = 0;
  stopAt = Infinity;
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
  start(at: number) {
    this.startAt = at;
  }
  stop(at = 0) {
    this.stopAt = at;
  }
}
class Context {
  currentTime = 0;
  state = "suspended";
  destination = {};
  oscillators: Node[] = [];
  gains: Node[] = [];
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
  createGain() {
    const n = new Node();
    this.gains.push(n);
    return n;
  }
  createOscillator() {
    const n = new Node();
    this.oscillators.push(n);
    return n;
  }
  advance(seconds: number) {
    this.currentTime += seconds;
    for (const n of this.oscillators)
      if (!n.ended && n.stopAt <= this.currentTime) {
        n.ended = true;
        n.onended?.();
      }
  }
}
function fixture() {
  const c = new Context();
  let created = 0;
  const d = new AudioDirector({
    create: () => {
      created++;
      return c as unknown as AudioContext;
    },
  });
  return { c, d, created: () => created };
}
test("approved pre-upgrade note sequences, envelopes, harmonic weights and timing are preserved", async () => {
  const { c, d, created } = fixture();
  await d.unlock({ isTrusted: false });
  assert.equal(created(), 0);
  await d.unlock({ isTrusted: true });
  await d.unlock({ isTrusted: true });
  assert.equal(created(), 1);
  const expected = {
    select: [392],
    match: [523, 659],
    create: [659, 880, 1318],
    power: [392, 784, 1175, 1568],
    duo: [330, 494, 784, 988, 1480],
    cascade: [587, 784, 988, 1175],
    win: [523, 659, 784, 1046, 1318],
    book: [659, 784],
  };
  assert.deepEqual(soundNotes, expected);
  for (const [name, notes] of Object.entries(expected)) {
    const start = c.oscillators.length,
      gains = c.gains.length,
      time = c.currentTime;
    assert.equal(d.effect(name as keyof typeof expected), true);
    const oscs = c.oscillators.slice(start);
    assert.deepEqual(
      oscs.map((n) => n.frequency.value),
      notes.flatMap((f) => [f, f * 2]),
    );
    const volume = name === "select" ? 0.018 : name === "duo" ? 0.024 : 0.03;
    const duration = ["power", "duo"].includes(name)
      ? 0.52
      : name === "create"
        ? 0.36
        : 0.25;
    notes.forEach((_, i) => {
      const at = time + i * (name === "duo" ? 0.055 : 0.075);
      assert.equal(oscs[i * 2].startAt, at);
      assert.equal(oscs[i * 2].stopAt, at + duration + 0.02);
      assert.deepEqual(c.gains[gains + i * 2].gain.events, [
        ["set", 0, at],
        ["ramp", volume, at + 0.018],
        ["exp", 0.0001, at + duration],
      ]);
      assert.equal(c.gains[gains + i * 2 + 1].gain.events[1][1], volume * 0.15);
    });
    c.advance(2);
    assert.equal(d.inspect().voices, 0);
  }
  d.dispose();
});
test("original finite Blade/family themes stop on scene exit and cancellation prevents late starts", async () => {
  const { c, d } = fixture();
  await d.unlock({ isTrusted: true });
  for (const kind of ["blade", "family"] as const) {
    const start = c.oscillators.length,
      t = c.currentTime;
    const stop = d.ceremony(true, kind);
    await Promise.resolve();
    const oscs = c.oscillators.slice(start),
      notes =
        kind === "blade"
          ? [392, 494, 587, 659, 587, 494, 440, 392]
          : [262, 330, 392, 494, 440, 392, 330, 294, 262, 330, 392, 523];
    const step = kind === "blade" ? 0.48 : 0.65;
    assert.deepEqual(
      oscs.map((n) => n.frequency.value),
      notes.flatMap((f) => [f, f * 2]),
    );
    assert.equal(oscs.at(-1)!.startAt, t + 0.05 + (notes.length - 1) * step);
    stop();
    assert.equal(d.inspect().voices, 0);
    assert.ok(oscs.every((n) => n.disconnected));
  }
  const before = c.oscillators.length;
  const stop = d.ceremony(true, "family");
  stop();
  await Promise.resolve();
  assert.equal(c.oscillators.length, before);
  d.dispose();
});
test("mute, saved volume and absent APIs leave gameplay usable, without music loops or random draws", async () => {
  const { c, d } = fixture();
  const oldRandom = Math.random;
  Math.random = () => {
    throw Error("gameplay random consumed");
  };
  try {
    await d.unlock({ isTrusted: true });
    assert.equal(d.effect("match"), true);
    d.configure({ muted: false, music: 1, effects: 0.3 });
    assert.equal(c.gains[0].gain.value, 0.5);
    d.configure({ muted: true, music: 1, effects: 0.6 });
    assert.equal(d.effect("match"), false);
    d.ceremony(true, "family");
    await Promise.resolve();
    assert.equal(d.inspect().voices, 0);
    d.configure({ muted: false, music: 1, effects: 0 });
    assert.equal(d.effect("match"), false);
    assert.equal(d.inspect().levels.music, 0);
    assert.equal(d.inspect().musicNodes, 0);
    assert.deepEqual(d.inspect().tracks, []);
  } finally {
    Math.random = oldRandom;
    d.dispose();
  }
  const none = new AudioDirector({ create: () => undefined });
  await none.unlock({ isTrusted: true });
  assert.equal(none.effect("match"), false);
  none.dispose();
});
test("voice budget, ended-node cleanup and background suspension are bounded", async () => {
  const { c, d } = fixture();
  await d.unlock({ isTrusted: true });
  for (let i = 0; i < 2000; i++) d.effect("duo");
  assert.ok(d.inspect().voices <= 96);
  assert.ok(c.oscillators.length <= 96);
  c.advance(2);
  assert.equal(d.inspect().voices, 0);
  d.effect("match");
  d.visibility(true);
  assert.equal(d.inspect().voices, 0);
  assert.equal(c.state, "suspended");
  d.visibility(false);
  assert.equal(d.effect("match"), false);
  await d.unlock({ isTrusted: false });
  assert.equal(c.state, "suspended");
  await d.unlock({ isTrusted: true });
  assert.equal(d.effect("match"), true);
  d.dispose();
  assert.equal(c.state, "closed");
  assert.ok(c.oscillators.every((n) => n.disconnected));
});
test("legacy audio migration preserves mute/volume without reading or rewriting progress", () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "localStorage"),
    reads: string[] = [];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => {
        reads.push(key);
        return key === "viva-audio-v2"
          ? JSON.stringify({ muted: false, music: 1, effects: 0.75 })
          : null;
      },
    },
  });
  try {
    assert.deepEqual(readAudioPreferences(), {
      muted: false,
      music: 0,
      effects: 0.75,
    });
    assert.deepEqual(reads, [AUDIO_KEY, "viva-audio-v2"]);
  } finally {
    if (old) Object.defineProperty(globalThis, "localStorage", old);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
