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
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("test-results/premium6", { recursive: true });
let checks = 0;
function progress(count: number, pending = false) {
  let p = fresh(() => 0.43);
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
    version: 1,
    campaignVersion: 3,
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
      obstacles: {
        petals: Array(56).fill(false),
        swept: 3,
        opened: 0,
        brought: 0,
        spawned: 0,
      },
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
  await page.reload();
  await page.locator(".celebration-blade").waitFor();
  assert.equal(await page.locator(".shelf-books button").count(), 5);
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
  // Only idle Meu Pet has the two silent peeks. The virtual clock avoids waiting a minute.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const idle = scenario("3").board;
  const pp = progress(4);
  await seed(pp, {
    version: 1,
    campaignVersion: 3,
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
      obstacles: {
        petals: Array(56).fill(false),
        swept: 3,
        opened: 0,
        brought: 0,
        spawned: 0,
      },
    },
  });
  await page.locator(".board").waitFor();
  await page.clock.install();
  await page.clock.fastForward(13000);
  await page.locator(".tail-peek").waitFor();
  await page.clock.runFor(400);
  await page.screenshot({ path: "test-results/premium6/tail-peek.png" });
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
