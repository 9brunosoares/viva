import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
  serviceWorkers: "block",
});
const page = await context.newPage();
try {
  await page.route("**/assets/index-*.js", (route) => route.abort());
  await page.goto("http://127.0.0.1:4173/viva-test/");
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .waitFor({ state: "visible" });
  assert.equal(
    await page.locator("#boot-status").innerText(),
    "Vamos tentar de novo?",
  );
  assert.equal(
    await page
      .locator("body")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
    "rgb(16, 46, 37)",
  );
  await page.evaluate(() =>
    localStorage.setItem(
      "viva-progress-v1",
      JSON.stringify({
        version: 1,
        order: [7, 2, 9, 1, 8, 4, 10, 3, 6, 5],
        completed: [1, 2, 3, 4],
        sound: false,
        motion: true,
      }),
    ),
  );
  const before = await page.evaluate(() =>
    localStorage.getItem("viva-progress-v1"),
  );
  await page.screenshot({ path: "test-results/launch-recovery.png" });
  await page.unroute("**/assets/index-*.js");
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await page.locator(".library-room").waitFor();
  assert.equal(await page.locator(".shelf-books button").count(), 4);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
    before,
  );
  await writeFile(
    "test-results/launch-recovery-report.json",
    JSON.stringify(
      {
        failedModuleHandled: true,
        noBlankScreen: true,
        retryWorks: true,
        progressPreserved: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "Launch failure keeps a branded surface; retry opens the saved library without clearing data.",
  );
} finally {
  await browser.close();
}
