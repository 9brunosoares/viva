import { waitForCache } from "./boardHelper.ts";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  fresh,
  complete,
  finishMilestone,
  acceptMilestoneBook,
} from "../src/progress.ts";
const require = createRequire(import.meta.url),
  { chromium, webkit } = require("playwright");
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" && process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  reducedMotion: "reduce",
});
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
await mkdir("test-results", { recursive: true });
await page.goto(
  process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
);
await waitForCache(page);
let checks = 0;
for (const kind of ["blade", "family"] as const) {
  const stage = kind === "blade" ? 5 : 10;
  let p = fresh(() => 0.4);
  for (let i = 1; i < stage; i++)
    p = finishMilestone(acceptMilestoneBook(complete(p, i)));
  p = acceptMilestoneBook(complete(p, stage));
  await page.evaluate(
    (p) => localStorage.setItem("viva-progress-v1", JSON.stringify(p)),
    p,
  );
  await page.reload();
  await page.locator(`.celebration-${kind}`).waitFor();
  await page
    .locator(".celebration-art img")
    .evaluate((img: HTMLImageElement) => img.decode());
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(size);
    const m = await page.evaluate(() => ({
      h: innerHeight,
      scroll: document.documentElement.scrollHeight,
      rects: Array.from(
        document.querySelectorAll(
          ".celebration h1,.celebration-art img,.celebration .primary,.ceremony-audio",
        ),
      ).map((e) => {
        const r = e.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      }),
    }));
    assert.ok(
      m.scroll <= m.h + 1,
      `${kind} ${size.width} scrolling ${JSON.stringify(m)}`,
    );
    assert.ok(m.rects.every((r) => r.top >= -1 && r.bottom <= m.h + 1));
    checks++;
    await page.screenshot({
      path: `test-results/${engine}-ceremony-${kind}-${size.width}.png`,
    });
  }
  // Explicit listen is a user gesture, including after restoring a pending moment.
  if (await page.getByRole("button", { name: "Ouvir", exact: true }).count())
    await page.getByRole("button", { name: "Ouvir", exact: true }).click();
  await page.locator(".celebration .primary").click();
  await page.locator(".library-room").waitFor();
  if (kind === "family") {
    const positions = await page.evaluate(() => {
      const room = document
          .querySelector(".library-room")!
          .getBoundingClientRect(),
        f = document.querySelector(".family-frame")!.getBoundingClientRect();
      return {
        left: (f.left - room.left) / room.width,
        bottom: (f.bottom - room.top) / room.height,
        width: f.width / room.width,
      };
    });
    assert.ok(
      positions.left < 0.4 && positions.bottom > 0.8 && positions.width > 0.35,
    );
    assert.ok(
      (await page.locator(".family-frame img").getAttribute("src"))!.endsWith(
        "family-object.webp",
      ),
    );
    await page
      .getByRole("button", { name: "Ampliar retrato da família" })
      .click();
    await page.locator(".portrait-modal").waitFor();
    await page.getByRole("button", { name: "Guardar este carinho" }).click();
  }
}
// Old saves keep existing possessions. Preview tools never alter the save.
let legacy: any = fresh(() => 0.3);
legacy.completed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
delete legacy.revealed;
await page.evaluate(
  (p) => localStorage.setItem("viva-progress-v1", JSON.stringify(p)),
  legacy,
);
await page.reload();
assert.equal(await page.locator(".shelf-books button").count(), 10);
assert.equal(await page.locator(".family-frame").count(), 1);
assert.equal(await page.locator(".blade").count(), 1);
const saved = await page.evaluate(() =>
  localStorage.getItem("viva-progress-v1"),
);
await page.locator(".qa-tools summary").click();
await page
  .getByRole("button", { name: "Rever chegada do Blade · QA", exact: true })
  .click();
await page.locator(".celebration-blade").waitFor();
await page.locator(".celebration .primary").click();
assert.equal(
  await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
  saved,
);
await page.locator(".qa-tools summary").click();
await page
  .getByRole("button", { name: "Rever encerramento · QA", exact: true })
  .click();
await page.locator(".celebration-family").waitFor();
await page.locator(".celebration .primary").click();
assert.equal(
  await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
  saved,
);
await page.setViewportSize({ width: 390, height: 844 });
await page
  .locator(".family-frame img")
  .evaluate((img: HTMLImageElement) => img.decode());
await page.screenshot({ path: `test-results/${engine}-table-final.png` });
const skipOffline = engine === "webkit" && process.env.SKIP_OFFLINE === "true";
if (!skipOffline) {
  await context.setOffline(true);
  await page.reload();
  await page
    .locator(".family-frame img")
    .evaluate((img: HTMLImageElement) => img.decode());
}
assert.equal(
  await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
  saved,
);
assert.deepEqual(errors, []);
await writeFile(
  `test-results/${engine}-celebrations-report.json`,
  JSON.stringify(
    {
      engine,
      checks,
      legacyPreserved: true,
      tablePortrait: true,
      previewsNoChanges: true,
      listenButton: true,
      offline: skipOffline ? "not verified" : true,
      offlineNote: skipOffline
        ? "Skipped after two WebKit internal navigation errors; verify on actual Safari."
        : undefined,
      errors,
    },
    null,
    2,
  ),
);
console.log(
  `${engine}: ${checks} ceremony layouts; table frame; audio gesture; old saves; QA replays passed. Offline: ${skipOffline ? "NOT VERIFIED (WebKit internal navigation error)" : "passed"}.`,
);
await browser.close();
