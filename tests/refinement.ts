import { waitForCache } from "./boardHelper.ts";
import { finishMilestone, acceptMilestoneBook } from "../src/progress.ts";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { fresh, complete } from "../src/progress.ts";
import { themes } from "../src/config.ts";
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
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
page.on("response", (r: any) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await mkdir("test-results", { recursive: true });
await page.goto(
  process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
);
await waitForCache(page);
assert.doesNotMatch(
  await page.locator(".home").innerText(),
  /Elis|família|Fase \d/i,
);
await page.screenshot({
  path: "test-results/refined-opening.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Entrar na biblioteca" }).click();
await page.locator(".library-room").waitFor();
assert.equal(await page.locator(".board").count(), 0);
await page.getByRole("button", { name: "Ver fases" }).click();
const locked = page.locator(".level-card:disabled");
assert.equal(await locked.count(), 9);
assert.equal(await locked.locator("img").count(), 0);
const hidden = await locked.allTextContents();
for (const name of themes.slice(1))
  assert.ok(
    hidden.every((s) => !s.includes(name)),
    name,
  );
await page.screenshot({
  path: "test-results/refined-locked-map.png",
  fullPage: true,
});
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
const fixture = fresh();
let p = fixture;
for (let i = 1; i <= 5; i++)
  p = finishMilestone(acceptMilestoneBook(complete(p, i)));
p.sound = false;
p.motion = false;
await page.evaluate(
  (p) => localStorage.setItem("viva-progress-v1", JSON.stringify(p)),
  p,
);
await page.reload();
await page.locator(".library").waitFor();
const saved = await page.evaluate(() =>
  localStorage.getItem("viva-progress-v1"),
);
assert.equal(await page.locator(".shelf-books button").count(), 5);
assert.ok(
  (await page.getByRole("button", { name: /^Continuar/ }).innerText()).includes(
    "Fase 6",
  ),
);
assert.equal(await page.locator(".blade").count(), 1);
assert.ok(
  (await page.locator(".blade img").getAttribute("src"))!.endsWith(
    "blade-5.webp",
  ),
);
await page.screenshot({
  path: "test-results/refined-library-sleep.png",
  fullPage: true,
});
async function visualSize() {
  return page.locator(".blade img").evaluate((img: HTMLImageElement) => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let l = c.width,
      t = c.height,
      r = 0,
      b = 0;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (data[(y * c.width + x) * 4 + 3] > 64) {
          l = Math.min(l, x);
          r = Math.max(r, x);
          t = Math.min(t, y);
          b = Math.max(b, y);
        }
    const box = img.getBoundingClientRect(),
      scale = Math.min(box.width / c.width, box.height / c.height);
    return { w: (r - l) * scale, h: (b - t) * scale };
  });
}
await page
  .locator(".blade img")
  .evaluate((img: HTMLImageElement) => img.decode());
const sleepingSize = await visualSize();
await page
  .getByRole("button", { name: "Blade, vamos passear?", exact: true })
  .click();
await page.getByAltText("Blade acordado, chow chow preto").waitFor();
await page
  .locator(".blade img")
  .evaluate((img: HTMLImageElement) => img.decode());
const awakeSize = await visualSize();
assert.ok(
  awakeSize.w / sleepingSize.w > 0.8 && awakeSize.w / sleepingSize.w < 1.2,
);
assert.ok(
  awakeSize.h / sleepingSize.h > 0.8 && awakeSize.h / sleepingSize.h < 1.2,
);
assert.ok(
  (await page.locator(".blade img").getAttribute("src"))!.endsWith(
    "blade-4.webp",
  ),
);
await page.screenshot({
  path: "test-results/refined-library-awake.png",
  fullPage: true,
});
await page
  .getByRole("button", { name: "Blade, boa noite.", exact: true })
  .click();
assert.ok(
  (await page.locator(".blade img").getAttribute("src"))!.endsWith(
    "blade-5.webp",
  ),
);
await page.getByRole("button", { name: "Quer petisco?", exact: true }).click();
assert.ok(
  (await page.locator(".blade img").getAttribute("src"))!.endsWith(
    "blade-4.webp",
  ),
);
for (let i = 0; i < 4; i++)
  await page.getByRole("button", { name: "Fazer carinho no Blade" }).click();
assert.ok(
  (await page.locator(".blade img").getAttribute("src"))!.endsWith(
    "blade-4.webp",
  ),
);
await page
  .getByRole("button", { name: "Blade, boa noite.", exact: true })
  .click();
assert.equal(
  await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
  saved,
);
await page.getByRole("button", { name: "Ver fases" }).click();
assert.ok(
  (await page.locator(".level-card:not(:disabled)").allTextContents()).some(
    (s) => s.includes("Espiritismo"),
  ),
);
assert.ok(
  !(await page.locator(".level-card:disabled").allTextContents()).some((s) =>
    s.includes("Roma"),
  ),
);
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
for (const size of [
  { width: 320, height: 568 },
  { width: 430, height: 932 },
]) {
  await page.setViewportSize(size);
  await page.evaluate(() => scrollTo(0, 0));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const rect = await page.locator(".hub-actions .primary").boundingBox();
  assert.ok(rect && rect.y + rect.height < size.height);
  await page.screenshot({
    path: `test-results/refined-hub-${size.width}.png`,
    fullPage: true,
  });
}
await page.getByRole("button", { name: /^Continuar/ }).click();
await page.getByRole("button", { name: "Pausar partida" }).click();
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
await page.locator(".library-room").waitFor();
await context.setOffline(true);
await page.reload();
await page.locator(".library-room").waitFor();
assert.equal(
  await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
  saved,
);
await page.getByRole("button", { name: "Quer petisco?", exact: true }).click();
await page
  .locator(".blade img")
  .evaluate((img: HTMLImageElement) => img.decode());
assert.deepEqual(errors, []);
const result = {
  homeWithoutSpoilers: true,
  libraryHub: true,
  lockedThemesHidden: true,
  twoBladePoses: true,
  sleepingSize,
  awakeSize,
  progressUnchanged: true,
  offline: true,
  errors,
};
await writeFile(
  "test-results/refinement-report.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
await browser.close();
