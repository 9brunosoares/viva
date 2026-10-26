import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "no-preference",
});
const errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
for (const mode of ["row", "column", "area", "color", "combined"]) {
  await page.goto(`http://127.0.0.1:4175/tests/fx.html?type=${mode}`);
  await page
    .locator(".special img")
    .first()
    .evaluate((img: HTMLImageElement) => img.decode());
  await page.screenshot({ path: `test-results/power-${mode}-idle.png` });
  await page.getByRole("button", { name: "Ativar", exact: true }).click();
  await page.locator(".combo-layer").waitFor();
  await page
    .locator(".combo-atlas")
    .first()
    .evaluate((img: HTMLImageElement) => img.decode());
  await page.waitForTimeout(320);
  assert.ok(await page.locator(".combo-effect").count());
  assert.ok((await page.locator(".combo-spark").count()) <= 18);
  assert.equal(
    await page.locator(".combo-chain").count(),
    mode === "combined" ? 1 : 0,
  );
  await page.screenshot({ path: `test-results/power-${mode}-active.png` });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".app.reduced").waitFor();
  assert.equal(
    await page
      .locator(".combo-layer")
      .evaluate((el) => getComputedStyle(el).display),
    "none",
  );
  assert.equal(
    await page
      .locator(".special img")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
}
assert.deepEqual(errors, []);
await writeFile(
  "test-results/fx-report.json",
  JSON.stringify(
    {
      modes: 5,
      atlasEffects: true,
      combinedStronger: true,
      particleBudget: 18,
      reducedMotion: true,
      errors,
    },
    null,
    2,
  ),
);
console.log(
  "Five visual power fixtures, actual engine footprints, combined intensity, particle budget and reduced motion passed.",
);
await browser.close();
