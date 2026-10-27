import { specialFromLabel } from "./boardHelper.ts";
import { finishMilestone, acceptMilestoneBook } from "../src/progress.ts";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { fresh, complete } from "../src/progress.ts";
import { names } from "../src/config.ts";
import { tile, moves, swap, resolveWave } from "../src/engine.ts";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
await page.goto(
  process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
);
let p = fresh();
for (let i = 1; i <= 3; i++)
  p = finishMilestone(acceptMilestoneBook(complete(p, i)));
p.sound = false;
p.motion = false;
await page.evaluate(
  (p) => localStorage.setItem("viva-progress-v1", JSON.stringify(p)),
  p,
);
await page.reload();
await page.getByRole("button", { name: /^Continuar/ }).click();
await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
let failed = false;
for (let attempt = 0; attempt < 4 && !failed; attempt++) {
  while (await page.locator(".board").count()) {
    if (
      await page.getByText("Vamos tentar de novo?", { exact: true }).count()
    ) {
      failed = true;
      break;
    }
    const labels = await page
      .locator(".tile")
      .evaluateAll((els: any[]) =>
        els.map((e) => e.getAttribute("aria-label")),
      );
    const b = labels.map((s: string) =>
      tile(
        names[3].findIndex((n) => s.startsWith(n + ",")),
        specialFromLabel(s),
      ),
    );
    const option = moves(b)
      .map(([a, c]) => {
        const n = swap(b, a, c),
          w = resolveWave(
            n,
            c,
            [a, c].filter((i) => n[i].special),
          );
        return {
          a,
          c,
          score:
            w.powers * 10000 +
            w.created.length * 100 +
            (w.collected[0] + w.collected[3]) * 10 +
            w.clear.length,
        };
      })
      .sort((a, b) => a.score - b.score)[0];
    const before = await page.locator(".moves strong").textContent();
    await page.locator(".tile").nth(option.a).click();
    await page.locator(".tile").nth(option.c).click();
    await page.waitForFunction(
      (before: string) =>
        !document.querySelector(".board") ||
        (document.querySelector(".board")?.getAttribute("aria-busy") ===
          "false" &&
          document.querySelector(".moves strong")?.textContent !== before),
      before,
    );
  }
  if (!failed) {
    await page.getByRole("button", { name: "Guardar na biblioteca" }).click();
    await page.getByRole("button", { name: "Ver fases" }).click();
    await page.getByRole("button", { name: /4 CONCLUÍDA Kung Fu/ }).click();
  }
}
assert.ok(failed, "A failed attempt must be exercised");
await page.screenshot({
  path: "test-results/failed-attempt.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Recomeçar fase" }).click();
assert.equal(await page.locator(".moves strong").textContent(), "42");
assert.equal(
  await page.getByText("Vamos tentar de novo?", { exact: true }).count(),
  0,
);
console.log("Failed attempt and immediate retry passed.");
await browser.close();
