import { specialFromLabel } from "./boardHelper.ts";
import { waitForCache } from "./boardHelper.ts";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { tile, moves, swap, matches, resolveWave } from "../src/engine.ts";
import { names } from "../src/config.ts";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
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
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
page.on("response", (r: any) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await mkdir("test-results", { recursive: true });
const url = process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/";
await page.goto(url);
await waitForCache(page);
await page.screenshot({ path: "test-results/home.png", fullPage: true });
await page.getByRole("button", { name: "Entrar na biblioteca" }).click();
await page.getByRole("button", { name: /^Jogar/ }).click();
await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
await page.locator(".tile").first().waitFor();
await page.screenshot({ path: "test-results/game.png", fullPage: true });
await page.getByRole("button", { name: "Pausar partida" }).click();
await page.getByRole("button", { name: "Retomar", exact: true }).click();
let totalMoves = 0,
  retries = 0;
for (let stage = 1; stage <= 10; stage++) {
  let attempts = 0;
  while (await page.locator(".board").count()) {
    if (
      await page.getByText("Vamos tentar de novo?", { exact: true }).count()
    ) {
      retries++;
      attempts++;
      assert.ok(attempts < 10, `stage ${stage} repeated failure`);
      await page.getByRole("button", { name: "Recomeçar fase" }).click();
    }
    const labels = await page
      .locator(".tile")
      .evaluateAll((els: any[]) =>
        els.map((e) => e.getAttribute("aria-label")),
      );
    const b = labels.map((label: string) =>
      tile(
        names[stage - 1].findIndex((n) => label.startsWith(n + ",")),
        specialFromLabel(label),
      ),
    );
    const options = moves(b);
    assert.ok(options.length);
    const choice = options
      .map(([a, c]) => {
        const n = swap(b, a, c),
          m = matches(n),
          wave = resolveWave(
            n,
            c,
            [a, c].filter((i) => n[i].special),
          );
        return {
          a,
          c,
          score:
            wave.clear.length +
            wave.created.length * 18 +
            wave.powers * 8 +
            m.length,
        };
      })
      .sort((a, c) => c.score - a.score)[0];
    const remaining = await page.locator(".moves strong").textContent();
    await page.locator(".tile").nth(choice.a).click();
    await page.locator(".tile").nth(choice.c).click();
    // Rapid touches during resolution must not consume an extra move.
    await page.evaluate(() => {
      const board = document.querySelector(".board");
      if (board?.getAttribute("aria-busy") === "true")
        board
          .querySelector("button")
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForFunction(
      (previous: string) =>
        !document.querySelector(".board") ||
        (document.querySelector(".board")?.getAttribute("aria-busy") ===
          "false" &&
          document.querySelector(".moves strong")?.textContent !== previous),
      remaining,
      { timeout: 12000 },
    );
    totalMoves++;
    assert.ok(totalMoves < 1800);
  }
  await page.locator(".reward").waitFor();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("viva-progress-v1")!),
  );
  assert.equal(saved.completed.length, stage);
  assert.equal(new Set(saved.order.slice(0, stage)).size, stage);
  console.log(
    `Stage ${stage} completed, ${totalMoves} moves, ${retries} retries`,
  );
  if (stage === 1) {
    await page.screenshot({ path: "test-results/reward.png", fullPage: true });
    const order = saved.order.join();
    await page.reload();
    const restored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("viva-progress-v1")!),
    );
    assert.equal(restored.order.join(), order);
    await page.getByRole("button", { name: /^Continuar/ }).click();
    await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  } else if (stage < 10) {
    await page
      .getByRole("button", { name: "Guardar na biblioteca", exact: true })
      .click();
    if (stage === 5) await page.locator(".celebration .primary").click();
    await page.getByRole("button", { name: /^Continuar/ }).click();
    await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  }
}
await page.screenshot({ path: "test-results/finale.png", fullPage: true });
await page.getByRole("button", { name: "Guardar na biblioteca" }).click();
await page.locator(".celebration .primary").click();
await page.screenshot({ path: "test-results/library.png", fullPage: true });
assert.equal(await page.locator(".shelf-books button").count(), 10);
await page.getByRole("button", { name: "Blade", exact: true }).click();
await page
  .getByRole("menuitem", { name: "Quer petisco?", exact: true })
  .click();
await page.getByRole("button", { name: /Meus livros/ }).click();
await page.locator(".book-modal").waitFor();
await page.getByRole("button", { name: "Voltar à biblioteca" }).click();
await page.getByRole("button", { name: "Ampliar retrato da família" }).click();
await page.locator(".portrait-modal").waitFor();
await page.getByRole("button", { name: "Guardar este carinho" }).click();
await page.getByRole("button", { name: "Modo infinito", exact: true }).click();
await page.locator(".board").waitFor();
await page.getByRole("button", { name: "Pausar partida" }).click();
await page.getByRole("button", { name: "Voltar à biblioteca" }).click();
for (const size of [
  { width: 320, height: 568 },
  { width: 430, height: 932 },
]) {
  await page.setViewportSize(size);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: `test-results/home-${size.width}.png`,
    fullPage: true,
  });
}
await context.setOffline(true);
await page.reload();
// The saved infinite board now resumes directly after reopening offline.
await page.locator(".tile").first().waitFor();
await page.screenshot({ path: "test-results/offline.png", fullPage: true });
assert.equal(errors.length, 0, errors.join("\n"));
console.log(
  JSON.stringify({ totalMoves, retries, errors, offline: true, completed: 10 }),
);
await writeFile(
  "test-results/browser-report.json",
  JSON.stringify(
    { totalMoves, retries, errors, offline: true, completed: 10 },
    null,
    2,
  ),
);
await browser.close();
