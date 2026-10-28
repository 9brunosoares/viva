import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import {
  tile,
  gift,
  matches,
  validSwap,
  moves,
  resolveWave,
  fall,
  reshuffle,
  createBoard,
} from "../src/engine";
import {
  newObstacles,
  recordGiftOpenings,
  obstaclesDone,
  obstacleSpec,
} from "../src/obstacles";
import { levels } from "../src/config";
import { balancedLevel } from "../src/difficulty";
import { validSnapshot, readSession, SESSION_KEY } from "../src/session";
import { fresh } from "../src/progress";
import { chooseHint } from "../src/hint";
const rng =
  (seed = 42) =>
  () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
const plain = () =>
  Array.from({ length: 56 }, (_, i) => tile((Math.floor(i / 7) + (i % 7)) % 6));
test("gifts never match or swap, even beside a power", () => {
  const b = plain();
  b[0] = gift();
  b[1] = gift();
  b[2] = gift();
  b[7] = tile(0, "row");
  assert.equal(matches(b).length, 0);
  assert.equal(validSwap(b, 0, 7), false);
});
test("orthogonal matches and overlapping powers deal at most one gift damage per wave", () => {
  const b = plain();
  b[0] = tile(5, "row");
  b[1] = tile(5);
  b[2] = tile(5);
  b[8] = gift();
  let w = resolveWave(b, 0, [0]);
  assert.deepEqual(w.giftHits, [8]);
  assert.equal(w.board[8].hp, 1);
  assert.ok(!w.clear.includes(8));
  assert.deepEqual(recordGiftOpenings({ opened: 0 }, w), { opened: 0 });
  w = resolveWave(w.board, 0, [0]);
  assert.deepEqual(w.giftsOpened, [8]);
  assert.ok(w.clear.includes(8));
  assert.equal(
    w.collected.reduce((a, b) => a + b, 0),
    7,
  );
  assert.ok(obstaclesDone(recordGiftOpenings({ opened: 0 }, w), { gifts: 1 }));
  const overlap = plain();
  overlap[0] = tile(0, "row");
  overlap[2] = tile(1, "column");
  overlap[1] = gift();
  const power = resolveWave(overlap, 0, [0, 2]);
  assert.equal(power.board[1].hp, 1);
  assert.deepEqual(power.giftHits, [1]);
});
test("diagonal matches do not damage gifts; color sentinel is never treated as a color", () => {
  const b = plain();
  b[0] = tile(5);
  b[1] = tile(5);
  b[2] = tile(5);
  b[10] = gift();
  assert.deepEqual(resolveWave(b).giftHits, []);
  b[0] = tile(0, "color");
  b[20] = gift();
  const wave = resolveWave(b, 0, [0], -1);
  assert.ok(!wave.clear.includes(20));
  assert.ok(wave.collected[0] > 0);
});
test("gravity preserves gift identity and health; recovery preserves gifts and yields playable hints", () => {
  const b = plain();
  b[0] = gift(1);
  const id = b[0].id;
  const n = fall(b, [7, 14], rng());
  assert.equal(n[14].hp, 1);
  assert.equal(n[14].id, id);
  for (let seed = 1; seed <= 100; seed++) {
    const r = rng(seed),
      setup = newObstacles(createBoard(r), { gifts: 2 }, r);
    const gifts = setup.board.flatMap((t, i) => (t.role ? [{ i, t }] : []));
    const shuffled = reshuffle(setup.board, r);
    assert.equal(matches(shuffled).length, 0);
    assert.ok(moves(shuffled).length);
    gifts.forEach(({ i, t }) => assert.deepEqual(shuffled[i], t));
    const hint = chooseHint(shuffled, [], Array(6).fill(0), false, setup.state);
    assert.ok(validSwap(shuffled, hint[0], hint[1]));
    assert.ok(hint.every((i) => !shuffled[i].role));
  }
});
test("all 30 campaign configurations contain only approved gifts, without changing base moves/targets", () => {
  const frozenMoves = [28, 34, 38, 44, 40, 48, 48, 44, 58, 50];
  for (const [i, l] of levels.entries()) {
    assert.equal(l.moves, frozenMoves[i]);
    for (const d of ["easy", "medium", "hard"] as const) {
      const level = balancedLevel(l, d),
        before = JSON.stringify(level),
        spec = obstacleSpec(level, d);
      const count = [4, 7].includes(l.id)
        ? d === "easy"
          ? 1
          : 2
        : l.id === 9 && d !== "easy"
          ? 2
          : 0;
      assert.deepEqual(spec, count ? { gifts: count } : undefined);
      assert.equal(JSON.stringify(level), before);
      assert.equal(obstacleSpec(level, d, true), undefined);
      const setup = newObstacles(
        createBoard(rng(i + 1), level.rules),
        spec,
        rng(),
      );
      assert.deepEqual(Object.keys(setup.state), ["opened"]);
      assert.equal(setup.board.filter((t) => t.role).length, count);
    }
  }
});
test("clean snapshots preserve gifts, victory and counters; discarded states and sessions are rejected", () => {
  const setup = newObstacles(createBoard(rng()), { gifts: 1 }, rng());
  const snapshot = {
    board: setup.board,
    remaining: 20,
    counts: Array(6).fill(0),
    powers: 0,
    cascades: 0,
    round: 1,
    obstacles: setup.state,
    won: true,
  };
  assert.ok(validSnapshot(snapshot));
  assert.ok(!validSnapshot({ ...snapshot, obstacles: undefined }));
  assert.ok(
    !validSnapshot({
      ...snapshot,
      obstacles: { opened: 0, petals: Array(56).fill(false) },
    }),
  );
  assert.ok(
    !validSnapshot({
      ...snapshot,
      board: setup.board.map((t) =>
        t.role ? { ...t, role: "keepsake", hp: undefined } : t,
      ),
    }),
  );
  const values = new Map<string, string>(),
    previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (k: string) => values.get(k) ?? null },
  });
  try {
    const p = fresh(),
      session = {
        version: 2,
        campaign: p.order.join(","),
        completedCount: 0,
        stage: 1,
        endless: false,
        difficulty: "easy",
        phase: "game",
        snapshot,
      };
    values.set(SESSION_KEY, JSON.stringify(session));
    assert.deepEqual(readSession(p), JSON.parse(JSON.stringify(session)));
    values.set(
      SESSION_KEY,
      JSON.stringify({ ...session, version: 1, campaignVersion: 3 }),
    );
    assert.equal(readSession(p), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
test("discarded UI, timers and public assets are absent, while book flight and gifts remain", () => {
  assert.ok(!existsSync("src/TailPeek.tsx"));
  for (const p of [
    "src/Game.tsx",
    "src/LibraryScene.tsx",
    "src/RewardFlight.tsx",
    "src/libraryLayout.ts",
    "src/premium6.css",
  ]) {
    assert.doesNotMatch(
      readFileSync(p, "utf8"),
      /TailPeek|tail-peek|petal-grid|petals-swept|room-keepsakes|keepsakePlaces|hiddenKeepsake|spawnKeepsake|bottomKeepsakes|data-brought/,
    );
  }
  assert.deepEqual(
    readdirSync("public/assets/premium6")
      .filter((f) => f.endsWith(".webp"))
      .sort(),
    ["gift-open.webp", "gift-unwrapped.webp", "gift-wrapped.webp"],
  );
  const flight = readFileSync("src/RewardFlight.tsx", "utf8");
  assert.match(flight, /book-\$\{flight.book\}-cover/);
  assert.doesNotMatch(flight, /keepsake|setTimeout|setInterval/);
  assert.ok(existsSync("source-assets/premium6/keepsakes.jpg"));
  assert.ok(existsSync("source-assets/premium6/tail.jpg"));
});
