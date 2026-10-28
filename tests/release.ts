import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { waitForCache } from "./boardHelper.ts";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
await page.goto("http://127.0.0.1:4173/viva-test/");
await waitForCache(page);
const manifest = await page.evaluate(async () =>
  fetch("./manifest.webmanifest").then((r) => r.json()),
);
assert.equal(manifest.display, "standalone");
assert.equal(manifest.orientation, "portrait");
for (const icon of manifest.icons) {
  const response = await page.request.get(
    "http://127.0.0.1:4173/viva-test/" + icon.src,
  );
  assert.equal(response.status(), 200);
}
assert.equal(await page.locator(".qa-tools,.qa-button").count(), 0);
assert.equal(
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .count(),
  1,
);
assert.ok(
  !/offline|Safari|PWA|armazenamento|navegador/i.test(
    await page.locator(".app").innerText(),
  ),
);
await page
  .getByRole("button", { name: "Entrar na biblioteca", exact: true })
  .click();
await page.locator(".hub-actions .primary").click();
await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
assert.equal(
  await page
    .getByRole("button", { name: "Concluir fase", exact: true })
    .count(),
  0,
);
await page.getByRole("button", { name: "Pausar partida" }).click();
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
await page.evaluate(() =>
  localStorage.setItem(
    "viva-progress-v1",
    JSON.stringify({
      version: 1,
      order: [7, 2, 9, 1, 8, 4, 10, 3, 6, 5],
      completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      sound: false,
      motion: false,
    }),
  ),
);
await page.reload();
await page
  .locator(".family-frame img")
  .evaluate((img: HTMLImageElement) => img.decode());
assert.equal(await page.locator(".shelf-books button").count(), 10);
assert.equal(await page.locator(".qa-tools,.qa-button").count(), 0);
await page.screenshot({ path: "test-results/release-library.png" });
const saved = await page.evaluate(() =>
  localStorage.getItem("viva-progress-v1"),
);
await context.setOffline(true);
await page.reload();
await page
  .locator(".family-frame img")
  .evaluate((img: HTMLImageElement) => img.decode());
await page
  .getByRole("button", { name: "Ampliar retrato da família", exact: true })
  .click();
await page
  .locator(".portrait-modal img")
  .evaluate((img: HTMLImageElement) => img.decode());
assert.equal(
  await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
  saved,
);
assert.deepEqual(errors, []);
await writeFile(
  "test-results/release-report.json",
  JSON.stringify(
    {
      qaAbsent: true,
      settingsAvailable: true,
      testModeOffByDefault: true,
      manifestValid: true,
      iconsAccessible: true,
      legacyProgressPreserved: true,
      officialPortraitOffline: true,
      errors,
    },
    null,
    2,
  ),
);
console.log(
  "Release: no internal QA, test mode off, settings available, standalone manifest/icons, progress and official portrait offline passed.",
);
await browser.close();
