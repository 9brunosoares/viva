import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { tile, moves, matches, validSwap } from "../src/engine";

const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage(),
  errors: string[] = [],
  checks: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript("globalThis.__name = (fn) => fn");
await page.addInitScript(() =>
  document.addEventListener(
    "pointerdown",
    (e) => {
      (window as any).__lastPointer = e.pointerId;
    },
    true,
  ),
);
await page.addInitScript(() => {
  (window as any).__invalidFrames = [];
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (frames, options) {
    if (typeof options === "object" && options?.duration === 330)
      (window as any).__invalidFrames.push({
        frames: (frames as Keyframe[]).map((f) => String(f.transform)),
        width: (this as HTMLElement).offsetWidth,
      });
    return animate.call(this, frames, options);
  };
});
const url = "http://127.0.0.1:4175/tests/vfx-game.html";
const snapshot = () => page.evaluate(() => (window as any).__vfxSnapshot);
const state = () => page.locator(".game-screen").getAttribute("data-phase");
async function load(mode = "3", query = "", reduced = false) {
  await page.emulateMedia({
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  await page.goto(`${url}?type=${mode}&seed=837&sound=1${query}`);
  await page.waitForFunction(
    () =>
      document.querySelector(".game-screen")?.getAttribute("data-phase") ===
        "idle" && !!(window as any).__vfxSnapshot,
  );
  await page.waitForTimeout(reduced ? 30 : 400);
}
async function settled(remaining = 99) {
  await page.waitForFunction(
    (n) =>
      document.querySelector(".game-screen")?.getAttribute("data-phase") ===
        "idle" && (window as any).__vfxSnapshot?.remaining === n,
    remaining,
  );
}
async function center(index: number) {
  const b = (await page.locator(".tile").nth(index).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function synthetic(index: number, type: string, id = 71, primary = true) {
  const point = await center(index);
  await page.evaluate(
    ({ index, type, id, primary, point }) => {
      document
        .querySelectorAll(".tile")
        [
          index
        ].dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id, pointerType: "touch", isPrimary: primary, button: 0, buttons: type === "pointerdown" ? 1 : 0, clientX: point.x, clientY: point.y }));
    },
    { index, type, id, primary, point },
  );
}
try {
  // Native touch: feedback begins before lift, then two taps resolve exactly one move.
  await load();
  const first = await center(16);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  assert.equal(await page.locator(".tile.pressed").count(), 1);
  assert.equal(await page.locator(".tile.selected").count(), 0);
  await page.mouse.up();
  assert.equal(await page.locator(".tile.selected").count(), 1);
  await page.locator(".tile").nth(23).tap();
  await page.evaluate(() => {
    for (let i = 0; i < 30; i++)
      document
        .querySelectorAll(".tile")
        [i].dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await settled();
  const expected = await snapshot();
  assert.equal(
    await page.evaluate(
      () =>
        (window as any).__snapshots.filter((s: any) => s.remaining === 99)
          .length,
    ),
    1,
    "one settled save per turn",
  );
  checks.push(
    "press feedback, native touch, two taps, rapid extra touches and one stable save",
  );

  // A short slide inside the source cell is enough; it must not also become a tap.
  await load();
  const from = await center(16);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + 13, { steps: 3 });
  await page.mouse.up();
  await settled();
  const short = await snapshot();
  assert.deepEqual(
    short.board.map((t: any) => [t.kind, t.special]),
    expected.board.map((t: any) => [t.kind, t.special]),
  );
  assert.deepEqual(short.counts, expected.counts);
  assert.equal(await page.locator(".tile.selected,.tile.pressed").count(), 0);
  checks.push("13px swipe has the same deterministic result as two taps");

  // Diagonal, exiting the board, pointercancel, lost capture and visibility interruption.
  for (const cancel of [
    "diagonal",
    "outside",
    "pointercancel",
    "lostpointercapture",
    "blur",
    "visibility",
  ] as const) {
    await load();
    const before = await snapshot(),
      point = await center(16);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    if (cancel === "diagonal")
      await page.mouse.move(point.x + 24, point.y + 24);
    else if (cancel === "outside") await page.mouse.move(-20, point.y);
    else if (cancel === "blur")
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    else if (cancel === "visibility")
      await page.evaluate(() =>
        document.dispatchEvent(new Event("visibilitychange")),
      );
    else
      await page
        .locator(".tile")
        .nth(16)
        .evaluate((el, type) => {
          const id = (window as any).__lastPointer;
          el.dispatchEvent(
            new PointerEvent(type, { bubbles: true, pointerId: id }),
          );
        }, cancel);
    await page.mouse.up();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".tile.selected,.tile.pressed").length === 0,
    );
    assert.equal(
      await page.locator(".tile.selected,.tile.pressed").count(),
      0,
      cancel,
    );
    assert.deepEqual(await snapshot(), before);
    await page.locator(".tile").nth(16).tap();
    await page.locator(".tile").nth(23).tap();
    await settled();
  }
  checks.push(
    "ambiguous/outside/cancelled/interrupted gestures do nothing and never swallow the next tap",
  );

  await load();
  await synthetic(16, "pointerdown", 71, true);
  await synthetic(20, "pointerdown", 72, false);
  await synthetic(20, "pointercancel", 72, false);
  assert.equal(await page.locator(".tile.pressed").count(), 1);
  await synthetic(16, "pointerup", 71, true);
  assert.equal(await page.locator(".tile.selected").count(), 1);
  await page.locator(".tile").nth(23).tap();
  await settled();
  checks.push("a second pointer cannot replace or cancel the first pointer");

  await load();
  const beforeInvalid = await snapshot();
  await page.locator(".tile").nth(0).tap();
  await page.locator(".tile").nth(1).tap();
  const invalidFrames = await page.evaluate(
    () => (window as any).__invalidFrames,
  );
  assert.equal(invalidFrames.length, 2);
  const exchange = invalidFrames[0] as { frames: string[]; width: number };
  assert.ok(
    exchange.frames.some(
      (f) =>
        Math.abs(Number(/translate\((-?[\d.]+)px/.exec(f)?.[1])) >=
        exchange.width,
    ),
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "false",
  );
  assert.deepEqual(await snapshot(), beforeInvalid);
  await page.screenshot({ path: `test-results/game-feel-${engine}-board.png` });
  checks.push("invalid exchange returns with no moves or objectives consumed");

  await load();
  await page.locator(".tile").nth(16).focus();
  await page.keyboard.press("Enter");
  await page.locator(".tile").nth(23).focus();
  await page.keyboard.press("Space");
  await settled();
  checks.push("keyboard/assistive click path remains functional");

  await page.clock.install();
  await load();
  await page.locator(".tile").nth(0).tap();
  await page.getByRole("button", { name: "Uma dica" }).click();
  assert.equal(
    await page.locator(".tile.selected").count(),
    0,
    "hint clears an unrelated previous selection",
  );
  assert.equal(await page.locator(".tile.hint").count(), 2);
  await synthetic(0, "pointerdown");
  assert.equal(await page.locator(".tile.hint").count(), 0);
  await synthetic(0, "pointercancel");
  await page.clock.fastForward(9100);
  await page.waitForFunction(
    () => document.querySelectorAll(".tile.hint").length === 2,
  );
  assert.equal(await page.locator(".tile.hint").count(), 2);
  const hintIndices = await page
    .locator(".tile")
    .evaluateAll((els) =>
      els.flatMap((e, i) => (e.classList.contains("hint") ? [i] : [])),
    );
  const hinted = (await snapshot()).board.map((t: any) =>
    tile(t.kind, t.special),
  );
  assert.ok(validSwap(hinted, hintIndices[0], hintIndices[1]));
  await page.clock.fastForward(1700);
  await page.waitForFunction(
    () => document.querySelectorAll(".tile.hint").length === 0,
  );
  assert.equal(await page.locator(".tile.hint").count(), 0);
  await page.clock.fastForward(20000);
  assert.equal(await page.locator(".tile.hint").count(), 0);
  await page.clock.resume();
  checks.push(
    "manual and idle hints are valid, temporary, cancelled by touch and never repeat continuously",
  );

  await load("dead", "&remaining=37");
  const recovered = await snapshot(),
    board = recovered.board.map((t: any) => tile(t.kind, t.special));
  assert.ok(moves(board).length);
  assert.equal(matches(board).length, 0);
  assert.equal(recovered.remaining, 37);
  assert.deepEqual(recovered.counts, [2, 1, 0, 0, 0, 0]);
  assert.equal(recovered.powers, 2);
  assert.equal(recovered.cascades, 1);
  checks.push(
    "dead saved board recovers automatically, preserving moves and collected objectives",
  );

  await load("3", "&remaining=1");
  await page.locator(".tile").nth(16).tap();
  await page.locator(".tile").nth(23).tap();
  await page
    .getByRole("heading", { name: "Vamos tentar de novo?", exact: true })
    .waitFor();
  assert.equal((await snapshot()).remaining, 0);
  await page
    .getByRole("button", { name: "Recomeçar fase", exact: true })
    .click();
  await page.waitForFunction(
    () => (window as any).__vfxSnapshot.remaining === 100,
  );
  assert.deepEqual((await snapshot()).counts, [0, 0, 0, 0, 0, 0]);
  checks.push("loss is nonpunitive and restart resets only the current match");

  await load("win", "&endless=1&remaining=1");
  await page.locator(".tile").nth(16).tap();
  await page.locator(".tile").nth(23).tap();
  await page.locator(".victory-shine").waitFor();
  assert.equal(await state(), "completing");
  assert.equal(await page.locator(".board").count(), 1);
  await page.waitForFunction(() => (window as any).__vfxSnapshot.round === 2);
  assert.equal(await page.locator(".moves strong").innerText(), "∞");
  assert.equal(await page.evaluate(() => (window as any).__onWinCalls), 0);
  assert.deepEqual((await snapshot()).counts, [0, 0, 0, 0, 0, 0]);
  checks.push(
    "infinite keeps its board after contemplation and begins the next moment without campaign rewards",
  );

  // Force removal through the test-only parent during every asynchronous phase.
  for (const phase of [
    "swapping",
    "resolving",
    "falling",
    "completing",
  ] as const) {
    await load(phase === "completing" ? "win" : "3");
    await page.evaluate((p) => {
      (window as any).__cancelEvidence = null;
      const observer = new MutationObserver(() => {
        if (
          document.querySelector(".game-screen")?.getAttribute("data-phase") !==
          p
        )
          return;
        (window as any).__cancelEvidence = {
          sound: (window as any).__audioSync?.length ?? 0,
          saves: (window as any).__snapshots.length,
        };
        observer.disconnect();
        (window as any).__unmount();
      });
      observer.observe(document, {
        subtree: true,
        attributes: true,
        attributeFilter: ["data-phase"],
      });
    }, phase);
    await page.locator(".tile").nth(16).tap();
    await page.locator(".tile").nth(23).tap();
    await page.waitForFunction(() => (window as any).__cancelEvidence !== null);
    const before = await page.evaluate(() => (window as any).__cancelEvidence);
    await page.locator(".game-screen").waitFor({ state: "detached" });
    await page.waitForTimeout(phase === "completing" ? 2800 : 700);
    assert.equal(await page.evaluate(() => (window as any).__onWinCalls), 0);
    assert.deepEqual(
      await page.evaluate(() => ({
        sound: (window as any).__audioSync?.length ?? 0,
        saves: (window as any).__snapshots.length,
      })),
      before,
    );
  }
  checks.push(
    "unmount during swap, clear, fall and victory cancels all stale sounds, saves and rewards",
  );
  await load("3", "", true);
  await page.locator(".tile").nth(16).tap();
  await page.locator(".tile").nth(23).tap();
  await settled();
  assert.deepEqual((await snapshot()).counts, expected.counts);
  assert.deepEqual(errors, []);
  const report = {
    engine,
    checks,
    errors,
    environment: "desktop mobile emulation, not a physical iPhone",
  };
  await writeFile(
    `test-results/game-feel-${engine}-report.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
