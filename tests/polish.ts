import { waitForCache } from "./boardHelper.ts";
import { finishMilestone, acceptMilestoneBook } from "../src/progress.ts";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { fresh, complete } from "../src/progress.ts";
import { names } from "../src/config.ts";
import { tile, moves, swap, resolveWave } from "../src/engine.ts";
const require = createRequire(import.meta.url);
const { chromium, webkit } = require("playwright");
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" && process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
const expectQA = process.env.EXPECT_QA === "true";
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "no-preference",
});
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
page.on("response", (r: any) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await mkdir("test-results", { recursive: true });
await page.goto(
  process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
);
await waitForCache(page);
const sizes = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
];
const measurements: any[] = [];
async function fits(label: string, selectors: string[]) {
  const m = await page.evaluate(
    (selectors: string[]) => ({
      viewport: { w: innerWidth, h: innerHeight },
      document: {
        w: document.documentElement.scrollWidth,
        h: document.documentElement.scrollHeight,
      },
      rects: selectors.flatMap((s) =>
        Array.from(document.querySelectorAll(s)).map((el) => {
          const r = el.getBoundingClientRect();
          return { s, x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      ),
    }),
    selectors,
  );
  assert.ok(
    m.document.w <= m.viewport.w + 1 && m.document.h <= m.viewport.h + 1,
    `${label}: scroll ${JSON.stringify(m)}`,
  );
  for (const r of m.rects)
    assert.ok(
      r.y >= -1 &&
        r.y + r.h <= m.viewport.h + 1 &&
        r.x >= -1 &&
        r.x + r.w <= m.viewport.w + 1,
      `${label}: clipped ${JSON.stringify(r)}`,
    );
  measurements.push({ label, ...m });
}
for (const size of sizes) {
  await page.setViewportSize(size);
  await fits("opening-" + size.width, [".home .primary", ".collection-link"]);
  await page.screenshot({
    path: `test-results/polish-opening-${size.width}.png`,
  });
}
for (const n of [0, 2, 5, 10]) {
  let p = fresh(() => 0.37);
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
  await page
    .locator(".room-image")
    .evaluate((img: HTMLImageElement) => img.decode());
  for (const size of sizes) {
    await page.setViewportSize(size);
    await fits(`library-${n}-${size.width}`, [
      ".hub-actions",
      ".library-room",
      ".collection-link",
      ".blade-prompts",
      ".library-caption",
      ".shelf-books button",
      ".family-frame",
    ]);
    await page.screenshot({
      path: `test-results/polish-library-${n}-${size.width}.png`,
    });
  }
  await page.getByRole("button", { name: "Ver fases", exact: true }).click();
  for (const size of sizes) {
    await page.setViewportSize(size);
    await fits(`map-${n}-${size.width}`, [".level-card", ".page-header"]);
  }
  await page
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
  await page.locator(".hub-actions .primary").click();
  assert.equal(
    await page
      .getByRole("button", { name: "Concluir fase · QA", exact: true })
      .count(),
    expectQA ? 1 : 0,
    "QA flag gating",
  );
  for (const size of sizes) {
    await page.setViewportSize(size);
    await fits(`game-${n}-${size.width}`, [
      ".game-header",
      ".objectives",
      ".board-wrap",
      ".game-tools",
    ]);
    await page.screenshot({
      path: `test-results/polish-game-${n}-${size.width}.png`,
    });
  }
  await page.getByRole("button", { name: "Pausar partida" }).click();
  await page
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
}
// Create and activate a genuine power through normal moves (no injected board).
let p = fresh();
for (let i = 1; i <= 3; i++)
  p = finishMilestone(acceptMilestoneBook(complete(p, i)));
p.sound = false;
await page.evaluate(
  (p) => localStorage.setItem("viva-progress-v1", JSON.stringify(p)),
  p,
);
await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.locator(".hub-actions .primary").click();
for (
  let attempt = 0;
  attempt < 45 && !(await page.locator(".tile.special").count());
  attempt++
) {
  const labels = await page
    .locator(".tile")
    .evaluateAll((els: any[]) =>
      els.map((el) => el.getAttribute("aria-label")),
    );
  const b = labels.map((s: string) =>
    tile(names[3].findIndex((n) => s.startsWith(n + ","))),
  );
  const choice = moves(b)
    .map(([a, c]) => ({ a, c, w: resolveWave(swap(b, a, c), c) }))
    .sort(
      (a, b) =>
        b.w.created.length * 100 +
        b.w.clear.length -
        a.w.created.length * 100 -
        a.w.clear.length,
    )[0];
  const before = await page.locator(".moves strong").textContent();
  await page.locator(".tile").nth(choice.a).click();
  await page.locator(".tile").nth(choice.c).click();
  await page.waitForFunction(
    (before: string) =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "false" &&
      document.querySelector(".moves strong")?.textContent !== before,
    before,
  );
  if (await page.getByText("Vamos tentar de novo?", { exact: true }).count())
    await page.getByRole("button", { name: "Recomeçar fase" }).click();
}
assert.ok(await page.locator(".tile.special").count());
await page.screenshot({ path: "test-results/polish-special-idle.png" });
const index = await page
  .locator(".tile")
  .evaluateAll((els: any[]) =>
    els.findIndex((e) => e.classList.contains("special")),
  );
const neighbor = index % 7 < 6 ? index + 1 : index - 1;
await page.locator(".tile").nth(index).click();
await page.locator(".tile").nth(neighbor).click();
await page.locator(".combo-layer").waitFor();
await page.waitForTimeout(90);
assert.ok(await page.locator(".combo-effect").count());
await page.screenshot({ path: "test-results/polish-special-active.png" });
await page.waitForFunction(
  () =>
    !document.querySelector(".board") ||
    document.querySelector(".board")?.getAttribute("aria-busy") === "false",
);
assert.equal(await page.locator(".combo-layer").count(), 0);
assert.deepEqual(errors, []);
await writeFile(
  `test-results/polish-${engine}-${expectQA ? "qa" : "release"}-report.json`,
  JSON.stringify(
    {
      qaVisible: expectQA,
      qaFlagVerified: true,
      engine,
      powerCreated: true,
      powerActivated: true,
      measurements,
      errors,
    },
    null,
    2,
  ),
);
console.log(
  `${engine}: ${measurements.length} viewport checks, QA flag verified (${expectQA}), real power creation/activation, no errors.`,
);
await browser.close();
