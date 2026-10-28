import test from "node:test";
import assert from "node:assert/strict";
import { createBoard } from "../src/engine";
import { fresh, complete } from "../src/progress";
import {
  readSession,
  writeSession,
  SESSION_KEY,
  storySeen,
  rememberStory,
  validSnapshot,
} from "../src/session";
import { stories } from "../src/stories";

test("ten narratives follow existing themes and preserve both surprises", () => {
  assert.equal(stories.length, 10);
  assert.match(stories[0], /laboratório/);
  assert.match(stories[4], /companhias/);
  assert.match(stories[9], /compartilhamos/);
  assert.ok(
    stories.every(
      (s) => s.length < 240 && !/Blade|Bruno|porta.retrato/i.test(s),
    ),
  );
});
test("session and story records preserve campaigns, board state and difficulty without touching progress", () => {
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    },
  });
  try {
    const p = fresh(),
      before = JSON.stringify(p);
    const snapshot = {
      board: createBoard(),
      counts: [3, 0, 0, 0, 0, 0],
      powers: 1,
      cascades: 2,
      remaining: 37,
      round: 1,
    };
    assert.ok(validSnapshot(snapshot));
    assert.ok(!validSnapshot({ ...snapshot, board: [] }));
    assert.ok(!validSnapshot({ ...snapshot, counts: [-1, 0, 0, 0, 0, 0] }));
    assert.ok(
      !validSnapshot({
        ...snapshot,
        board: snapshot.board.map((t) => ({ ...t, kind: 8 })),
      }),
    );
    writeSession({
      version: 2,
      campaign: p.order.join(","),
      completedCount: p.completed.length,
      stage: 1,
      endless: false,
      difficulty: "medium",
      phase: "game",
      snapshot,
    });
    assert.deepEqual(
      readSession(p)?.snapshot,
      JSON.parse(JSON.stringify(snapshot)),
    );
    assert.equal(readSession(p)?.difficulty, "medium");
    assert.ok(!storySeen(p, 1));
    rememberStory(p, 1);
    assert.ok(storySeen(p, 1));
    assert.ok(!storySeen(p, 2));
    assert.equal(JSON.stringify(p), before);
    assert.equal(readSession({ ...p, order: [...p.order].reverse() }), null);
    const saved = JSON.parse(values.get(SESSION_KEY)!);
    saved.stage = 10;
    values.set(SESSION_KEY, JSON.stringify(saved));
    assert.equal(readSession(p), null);
    assert.ok(storySeen(complete(p, 1), 1));
    writeSession(null);
    assert.equal(readSession(p), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
