import assert from "node:assert/strict";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { chromium } from "playwright";
import {
  fresh,
  complete,
  finishMilestone,
  acceptMilestoneBook,
} from "../src/progress";
import { scenario } from "./vfx-scenarios";
import { BRUNO_SIGNATURE } from "../src/narrative";
const browser = await chromium.launch({ headless: true, channel: "msedge" }),
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    recordVideo: {
      dir: "test-results/premium6/video",
      size: { width: 390, height: 844 },
    },
  });
await context.addInitScript("globalThis.__name=fn=>fn");
await context.addInitScript(() => {
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (frames, options) {
    if (this.classList.contains("reward-flight")) {
      const target = document.querySelector('[data-book-id="2"]')!;
      const from = this.getBoundingClientRect(),
        to = target.getBoundingClientRect();
      const last = (frames as Keyframe[]).at(-1)!;
      const matrix = new DOMMatrix(String(last.transform));
      (window as any).__bookFlight = {
        dx: matrix.m41,
        dy: matrix.m42,
        expectedX: to.x + to.width / 2 - from.x - from.width / 2,
        expectedY: to.y + to.height / 2 - from.y - from.height / 2,
      };
    }
    return animate.call(this, frames, options);
  };
});
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("test-results/premium6", { recursive: true });
let checks = 0;
function progress(count: number, pending = false) {
  let p = fresh();
  for (let id = 1; id <= count; id++) {
    p = complete(p, id);
    if (!pending || id !== count) p = finishMilestone(acceptMilestoneBook(p));
  }
  return p;
}
async function seed(p: ReturnType<typeof fresh>, session: unknown = null) {
  await page.evaluate(
    ({ p, session }) => {
      localStorage.setItem("viva-progress-v1", JSON.stringify(p));
      if (session)
        localStorage.setItem("viva-session-v1", JSON.stringify(session));
      else localStorage.removeItem("viva-session-v1");
    },
    { p, session },
  );
  await page.reload();
}
try {
  await page.goto("http://127.0.0.1:4173/viva-test/");
  await page.locator(".home").waitFor();
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker.ready)?.active,
  );
  const p = progress(4),
    { board } = scenario("win");
  await seed(p, {
    version: 2,
    campaign: p.order.join(","),
    completedCount: 4,
    stage: 5,
    endless: false,
    difficulty: "easy",
    phase: "game",
    snapshot: {
      board,
      remaining: 30,
      counts: Array(6).fill(100),
      powers: 0,
      cascades: 0,
      round: 1,
    },
  });
  await page.locator(".board").waitFor();
  await page.locator(".tile").nth(16).click();
  await page.locator(".tile").nth(23).click();
  await page.locator(".victory-word").waitFor();
  assert.equal(await page.locator(".victory-word").count(), 1);
  assert.equal(await page.locator(".game-tools").isVisible(), false);
  const frozen = await page.evaluate(() =>
    localStorage.getItem("viva-session-v1"),
  );
  await page.waitForTimeout(250);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-session-v1")),
    frozen,
  );
  await page.screenshot({ path: "test-results/premium6/finale-450ms.png" });
  if (await page.locator(".victory-word").count())
    await page.screenshot({ path: "test-results/premium6/finale-950ms.png" });
  checks++;
  if (await page.locator(".board").count())
    await page.locator(".board").click({ position: { x: 15, y: 15 } });
  await page.locator(".reward-book").waitFor();
  await page.screenshot({ path: "test-results/premium6/book-reward.png" });
  await page
    .getByRole("button", { name: "Guardar na biblioteca", exact: true })
    .click();
  await page.locator(".reward-flight").waitFor();
  assert.equal(await page.locator(".reward-flight").count(), 1);
  const trajectory = await page.evaluate(() => (window as any).__bookFlight);
  assert.ok(
    trajectory &&
      Math.abs(trajectory.dx - trajectory.expectedX) < 0.5 &&
      Math.abs(trajectory.dy - trajectory.expectedY) < 0.5,
    JSON.stringify(trajectory),
  );
  await page.reload();
  await page.locator(".celebration-blade").waitFor();
  assert.equal(await page.locator(".shelf-books button").count(), 5);
  await page.locator('.celebration-blade[data-art-ready="true"]').waitFor();
  assert.equal(await page.locator(".celebration-art img").isVisible(), true);
  assert.equal(
    await page.getByRole("button", { name: "Ouvir", exact: true }).count(),
    0,
  );
  checks++;
  await page.waitForTimeout(1300);
  await page.screenshot({ path: "test-results/premium6/blade-arrival.png" });
  await page.locator(".celebration .primary").click();
  await page.locator(".hub-actions").waitFor();
  await page.reload();
  assert.equal(await page.locator(".celebration").count(), 0);
  checks++;
  const final = acceptMilestoneBook(progress(10, true));
  await seed(final);
  await page.locator(".celebration-family").waitFor();
  for (const [delay, label] of [
    [100, "start"],
    [1800, "portrait"],
    [1800, "camera"],
    [2400, "dedication"],
  ] as const) {
    await page.waitForTimeout(delay);
    await page.screenshot({
      path: `test-results/premium6/ending-${label}.png`,
    });
  }
  assert.equal(
    await page.locator(".bruno-signature").textContent(),
    BRUNO_SIGNATURE,
  );
  assert.ok(
    (
      await page
        .locator(".bruno-signature")
        .evaluate((e) => getComputedStyle(e).fontFamily)
    ).includes("Caveat"),
  );
  checks++;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(100);
  assert.equal(
    await page
      .locator(".cinematic-stage .library-room")
      .evaluate((e) => getComputedStyle(e).transform),
    "none",
  );
  checks++;
  for (const ms of [100, 2000, 4300]) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seed(final);
    await page.locator(".celebration-family").waitFor();
    await page.waitForTimeout(ms);
    await page.reload();
    await page.locator(".celebration-family").waitFor();
    assert.equal(await page.locator(".shelf-books button").count(), 10);
    checks++;
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".celebration .primary").click();
  await page.locator(".hub-actions").waitFor();
  await page.reload();
  assert.equal(await page.locator(".celebration").count(), 0);
  // No tail, even after the old idle interval, with full or reduced motion.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const idle = scenario("3").board;
  const pp = progress(4);
  await seed(pp, {
    version: 2,
    campaign: pp.order.join(","),
    completedCount: 4,
    stage: 5,
    endless: false,
    difficulty: "easy",
    phase: "game",
    snapshot: {
      board: idle,
      remaining: 30,
      counts: Array(6).fill(0),
      powers: 0,
      cascades: 0,
      round: 1,
    },
  });
  await page.locator(".board").waitFor();
  await page.clock.install();
  await page.clock.fastForward(25000);
  assert.equal(await page.locator(".tail-peek,.petal-grid").count(), 0);
  await page.screenshot({ path: "test-results/premium6/pet-no-tail.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(100);
  assert.equal(await page.locator(".tail-peek").count(), 0);
  checks++;
  assert.deepEqual(errors, []);
  await writeFile(
    "test-results/premium6/motion-report.json",
    JSON.stringify(
      {
        checks,
        errors,
        visualFinaleDoesNotMutateSave: true,
        reloadsDuringFlightAndEnding: true,
        liveReducedMotion: true,
        physicalDevice: false,
      },
      null,
      2,
    ),
  );
  console.log({ checks, errors });
} catch (e) {
  await page
    .screenshot({ path: "test-results/premium6/motion-failure.png" })
    .catch(() => {});
  throw e;
} finally {
  const video = page.video();
  await context.close();
  if (video)
    await copyFile(
      await video.path(),
      "test-results/premium6/premium6-motion.webm",
    );
  await browser.close();
}
