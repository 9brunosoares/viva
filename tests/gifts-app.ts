import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fresh, complete } from "../src/progress";
import { gift, tile } from "../src/engine";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
await context.addInitScript(
  "globalThis.__name=fn=>fn;let seed=1;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}",
);
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
let p = fresh();
for (let i = 1; i < 4; i++) p = complete(p, i);
await mkdir("test-results/premium6", { recursive: true });
const results = [];
try {
  await page.goto("http://127.0.0.1:4173/viva-test/");
  for (const hp of [2, 1] as const) {
    await page.emulateMedia({
      reducedMotion: hp === 1 ? "reduce" : "no-preference",
    });
    const board = Array.from({ length: 56 }, (_, i) =>
      tile((Math.floor(i / 7) + (i % 7)) % 6),
    );
    board[24] = gift(hp);
    board[22] = tile(0, "row");
    const session = {
      version: 2,
      campaign: p.order.join(","),
      completedCount: 3,
      stage: 4,
      endless: false,
      difficulty: "easy",
      phase: "game",
      snapshot: {
        board,
        remaining: 30,
        counts: Array(6).fill(0),
        powers: 0,
        cascades: 0,
        round: 1,
        obstacles: { opened: 0 },
      },
    };
    await page.evaluate(
      ({ p, session }) => {
        localStorage.setItem("viva-progress-v1", JSON.stringify(p));
        localStorage.setItem("viva-session-v1", JSON.stringify(session));
      },
      { p, session },
    );
    await page.reload();
    await page.locator('[data-role="gift"]').waitFor();
    assert.equal(
      await page.locator('[data-role="gift"]').getAttribute("data-hp"),
      String(hp),
    );
    await page
      .locator(".tile img")
      .evaluateAll((images) =>
        Promise.all(images.map((i) => (i as HTMLImageElement).decode())),
      );
    await page.screenshot({ path: `test-results/premium6/gift-hp${hp}.png` });
    await page.evaluate(() => {
      const seen = new Set<string>();
      (window as any).__giftSources = seen;
      const sample = () =>
        document
          .querySelectorAll<HTMLImageElement>('[data-role="gift"] img')
          .forEach((i) => seen.add(i.getAttribute("src")!));
      sample();
      const observer = new MutationObserver(sample);
      observer.observe(document.querySelector(".board")!, {
        subtree: true,
        attributes: true,
        childList: true,
      });
      (window as any).__giftObserver = observer;
    });
    await page.locator(".tile").nth(22).click();
    await page.locator(".tile").nth(23).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".game-screen")?.getAttribute("data-phase") ===
          "idle" &&
        JSON.parse(localStorage.getItem("viva-session-v1")!).snapshot
          .remaining === 29,
    );
    const after = await page.evaluate(() => {
      (window as any).__giftObserver.disconnect();
      return {
        snapshot: JSON.parse(localStorage.getItem("viva-session-v1")!).snapshot,
        sources: [...(window as any).__giftSources] as string[],
      };
    });
    assert.ok(
      after.sources.some((s) =>
        s.endsWith(`gift-${hp === 2 ? "unwrapped" : "open"}.webp`),
      ),
      JSON.stringify(after),
    );
    if (hp === 2)
      assert.equal(
        after.snapshot.board.find((t: any) => t.role === "gift")?.hp,
        1,
      );
    else {
      assert.equal(after.snapshot.obstacles.opened, 1);
      assert.ok(!after.snapshot.board.some((t: any) => t.role));
    }
    await page.reload();
    await page.locator(".board").waitFor();
    const restored = await page.evaluate(
      () => JSON.parse(localStorage.getItem("viva-session-v1")!).snapshot,
    );
    assert.equal(restored.obstacles.opened, after.snapshot.obstacles.opened);
    assert.equal(
      restored.board.filter((t: any) => t.role).length,
      after.snapshot.board.filter((t: any) => t.role).length,
    );
    results.push({
      hp,
      sources: after.sources,
      opened: restored.obstacles.opened,
      remaining: restored.remaining,
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    "test-results/premium6/gifts-report.json",
    JSON.stringify({ results, errors, realIPhone: false }, null, 2),
  );
  console.log({ results, errors });
} finally {
  await browser.close();
}
