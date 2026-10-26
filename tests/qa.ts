import { waitForCache } from "./boardHelper.ts";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { books } from "../src/config.ts";
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
  }),
  page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
await mkdir("test-results", { recursive: true });
await page.goto(
  process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
);
await waitForCache(page);
await page.getByRole("button", { name: "Entrar na biblioteca" }).click();
const read = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("viva-progress-v1")!));
const initial = await read(),
  order = initial.order;
for (let stage = 1; stage <= 10; stage++) {
  await page.locator(".hub-actions .primary").click();
  await page
    .getByRole("button", { name: "Concluir fase · QA", exact: true })
    .waitFor();
  if (stage === 5) {
    assert.equal(
      await page.locator(".game-header h1").textContent(),
      "Meu Pet",
    );
    assert.ok(
      !(await page.locator(".game-screen").innerText()).includes("Blade"),
    );
  }
  await page.screenshot({ path: `test-results/qa-stage-${stage}.png` });
  // Repeated clicks on the same button must not double-grant a book.
  await page
    .getByRole("button", { name: "Concluir fase · QA", exact: true })
    .evaluate((b: HTMLButtonElement) => {
      b.click();
      b.click();
    });
  await page.getByText("Fase concluída!", { exact: true }).waitFor();
  const saved = await read();
  assert.equal(saved.completed.length, stage);
  assert.deepEqual(saved.order, order);
  assert.equal(
    await page.locator(".reward h2").first().textContent(),
    books[order[stage - 1] - 1].title,
  );
  assert.equal(new Set(saved.order.slice(0, stage)).size, stage);
  await page.setViewportSize({ width: 320, height: 568 });
  const rewardFits = await page.evaluate(() => {
    const b = document
      .querySelector(".reward .primary")!
      .getBoundingClientRect();
    return {
      height: document.documentElement.scrollHeight,
      viewport: innerHeight,
      bottom: b.bottom,
    };
  });
  assert.ok(
    rewardFits.height <= rewardFits.viewport + 1 &&
      rewardFits.bottom <= rewardFits.viewport + 1,
    JSON.stringify(rewardFits),
  );
  await page.screenshot({ path: `test-results/final-reward-${stage}-320.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  if (stage === 5 || stage === 10) {
    assert.equal(saved.pendingCelebration.step, "book");
    assert.equal(await page.locator(".final-gift").count(), 0);
    assert.equal(await page.locator(".family-frame").count(), 0);
    if (stage === 5)
      assert.ok(!(await page.locator(".reward").innerText()).includes("Blade"));
    await page.reload();
    await page.getByText("Fase concluída!", { exact: true }).waitFor();
    assert.deepEqual(await read(), saved);
  }
  await page
    .getByRole("button", { name: "Guardar livro", exact: true })
    .click();
  if (stage === 5 || stage === 10) {
    const kind = stage === 5 ? "blade" : "family";
    await page.locator(`.celebration-${kind}`).waitFor();
    assert.equal(await page.locator(".library-room").count(), 0);
    assert.equal((await read()).pendingCelebration.step, "reveal");
    await page.reload();
    await page.locator(`.celebration-${kind}`).waitFor();
    await page
      .locator(".celebration-art img")
      .evaluate((img: HTMLImageElement) => img.decode());
    await page.screenshot({
      path: `test-results/ceremony-${kind}.png`,
      fullPage: true,
    });
    await page.locator(".celebration .primary").click();
    assert.equal((await read()).pendingCelebration, undefined);
    assert.ok((await read()).revealed.includes(kind));
  }
  assert.equal(await page.locator(".shelf-books button").count(), stage);
  assert.equal(await page.locator(".blade").count(), stage >= 5 ? 1 : 0);
  assert.equal(
    await page.locator(".family-frame").count(),
    stage === 10 ? 1 : 0,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Modo infinito", exact: true })
      .count(),
    stage === 10 ? 1 : 0,
  );
  if (stage < 10) {
    await page.getByRole("button", { name: "Ver fases", exact: true }).click();
    assert.equal(
      await page.locator(".level-card:not(:disabled)").count(),
      stage + 1,
    );
    await page
      .getByRole("button", { name: "Voltar à biblioteca", exact: true })
      .click();
  }
  if (stage === 6) {
    await page.reload();
    const restored = await read();
    assert.deepEqual(restored, saved);
    assert.ok(
      (await page.locator(".hub-actions .primary").innerText()).includes(
        "Fase 7",
      ),
    );
  }
}
const all = await read();
await page.getByRole("button", { name: "Ver fases", exact: true }).click();
await page.locator(".level-card").first().click();
await page
  .getByRole("button", { name: "Concluir fase · QA", exact: true })
  .click();
await page.getByText("Fase concluída!", { exact: true }).waitFor();
assert.equal(await page.locator(".reward-book").count(), 0);
assert.deepEqual(await read(), all);
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
await page.getByRole("button", { name: "Modo infinito", exact: true }).click();
await page
  .getByRole("button", { name: "Concluir fase · QA", exact: true })
  .click();
await page.getByText("Fase concluída!", { exact: true }).waitFor();
assert.deepEqual(await read(), all);
assert.equal(await page.locator(".reward-book").count(), 0);
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
await page.getByRole("button", { name: "Quer petisco?", exact: true }).click();
assert.ok(
  (await page.locator(".blade img").getAttribute("src"))!.endsWith(
    "blade-4.webp",
  ),
);
await page
  .getByRole("button", { name: "Blade, boa noite.", exact: true })
  .click();
assert.ok(
  (await page.locator(".blade img").getAttribute("src"))!.endsWith(
    "blade-5.webp",
  ),
);
await context.setOffline(true);
await page.reload();
await page.locator(".library-room").waitFor();
assert.deepEqual(await read(), all);
await page.screenshot({ path: "test-results/qa-complete-library.png" });
assert.deepEqual(errors, []);
await writeFile(
  "test-results/qa-report.json",
  JSON.stringify(
    {
      qaCampaign: true,
      completed: 10,
      uniqueBooks: 10,
      reload: true,
      replay: true,
      infinite: true,
      blade: true,
      portrait: true,
      offline: true,
      errors,
    },
    null,
    2,
  ),
);
console.log(
  "QA: ten phases/rewards, double-click guard, milestones, persistence, replay, infinite and offline passed.",
);
await browser.close();
