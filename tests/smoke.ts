import { finishMilestone, acceptMilestoneBook } from "../src/progress.ts";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { fresh, complete } from "../src/progress.ts";
import { names } from "../src/config.ts";
import { tile, moves, validSwap } from "../src/engine.ts";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
const url = process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/";
await page.goto(url);
for (const n of [0, 2, 5, 10]) {
  let p = fresh();
  for (let i = 1; i <= n; i++)
    p = finishMilestone(acceptMilestoneBook(complete(p, i)));
  p.sound = false;
  await page.evaluate(
    (p) => localStorage.setItem("viva-progress-v1", JSON.stringify(p)),
    p,
  );
  await page.reload();
  if (n === 0)
    await page.getByRole("button", { name: "Entrar na biblioteca" }).click();
  assert.equal(await page.locator(".shelf-books button").count(), n);
  assert.equal(await page.locator(".blade").count(), n >= 5 ? 1 : 0);
  assert.equal(await page.locator(".family-frame").count(), n === 10 ? 1 : 0);
  await page.screenshot({
    path: `test-results/library-${n}-final.png`,
    fullPage: true,
  });
}
await page.getByRole("button", { name: "Ver fases" }).click();
await page.getByRole("button", { name: /1 CONCLUÍDA Química/ }).click();
const labels = await page
  .locator(".tile")
  .evaluateAll((els: any[]) => els.map((e) => e.getAttribute("aria-label")));
const b = labels.map((s: string) =>
  tile(names[0].findIndex((n) => s.startsWith(n + ","))),
);
const invalid = b
  .flatMap((_, i) => (i % 7 < 6 ? [[i, i + 1]] : []))
  .find(([a, c]) => !validSwap(b, a, c))!;
await page.locator(".tile").nth(invalid[0]).click();
await page.locator(".tile").nth(invalid[1]).click();
await page.waitForFunction(
  () => document.querySelector(".board")?.getAttribute("aria-busy") === "false",
);
assert.equal(await page.locator(".moves strong").textContent(), "36");
const [a, c] = moves(b)[0];
const ar = await page.locator(".tile").nth(a).boundingBox(),
  cr = await page.locator(".tile").nth(c).boundingBox();
assert.ok(ar && cr);
await page.mouse.move(ar.x + ar.width / 2, ar.y + ar.height / 2);
await page.mouse.down();
await page.mouse.move(cr.x + cr.width / 2, cr.y + cr.height / 2, { steps: 5 });
await page.mouse.up();
await page.waitForFunction(
  () =>
    document.querySelector(".board")?.getAttribute("aria-busy") === "false" &&
    document.querySelector(".moves strong")?.textContent === "35",
);
await page.getByRole("button", { name: "Pausar partida" }).click();
assert.equal(await page.locator('[role="dialog"]').count(), 1);
await page.getByRole("button", { name: "Recomeçar fase" }).click();
assert.equal(await page.locator(".moves strong").textContent(), "36");
await page.getByRole("button", { name: "Pausar partida" }).click();
await page.getByRole("button", { name: "Voltar à biblioteca" }).click();
assert.equal(
  (
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("viva-progress-v1")!),
    )
  ).completed.length,
  10,
);
await page.setViewportSize({ width: 320, height: 568 });
await page.getByRole("button", { name: /^Jogar novamente/ }).click();
await page.screenshot({
  path: "test-results/game-small-final.png",
  fullPage: true,
});
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.waitForFunction(() => !!navigator.serviceWorker.controller);
await context.setOffline(true);
await page.reload();
await page.getByRole("button", { name: /^Jogar novamente/ }).click();
await page.locator(".tile").first().waitFor();
assert.deepEqual(errors, []);
console.log(
  "Final smoke passed: four library states; unlocks; replay; invalid swap; pointer drag; restart; dialog focus; small screen.",
);
await browser.close();
