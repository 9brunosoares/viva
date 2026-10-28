import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { stories } from "../src/stories";
import { levels } from "../src/config";
import { balancedLevel } from "../src/difficulty";
import { tile, moves } from "../src/engine";
import { waitForCache } from "./boardHelper";
const { chromium, webkit } = createRequire(import.meta.url)("playwright");
const engine = process.env.BROWSER_ENGINE || "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
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
page.on("response", (r: any) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await page.goto("http://127.0.0.1:4173/viva-test/");
await waitForCache(page);
async function seed(count: number, difficulty = "easy") {
  // Wait for the previous React commit before replacing this isolated fixture.
  await page.waitForTimeout(120);
  await page.evaluate(
    ({ count, difficulty }) => {
      localStorage.setItem(
        "viva-progress-v1",
        JSON.stringify({
          version: 1,
          order: [1, 9, 8, 5, 2, 4, 10, 6, 3, 7],
          completed: Array.from({ length: count }, (_, i) => i + 1),
          sound: true,
          motion: true,
        }),
      );
      localStorage.setItem("viva-difficulty-v1", difficulty);
      localStorage.removeItem("viva-session-v1");
      localStorage.removeItem("viva-stories-v1");
    },
    { count, difficulty },
  );
  await page.reload();
  if (!count)
    await page.getByRole("button", { name: "Entrar na biblioteca" }).click();
  await page.locator(".library").waitFor();
}
await seed(0);
assert.equal(
  await page
    .locator(".blade,.blade-context,.blade-prompts,.library-caption")
    .count(),
  0,
);
let intros = 0;
for (let id = 1; id <= 10; id++) {
  await seed(id - 1);
  const saved = await page.evaluate(() =>
    localStorage.getItem("viva-progress-v1"),
  );
  await page.locator(".hub-actions .primary").click();
  await page.locator(".stage-intro").waitFor();
  assert.equal(
    await page.locator(".stage-intro h1").innerText(),
    levels[id - 1].name,
  );
  assert.equal(
    await page.locator(".intro-editorial > p").innerText(),
    stories[id - 1],
  );
  assert.ok(
    !/Blade|Bruno|porta.retrato/i.test(
      await page.locator(".stage-intro").innerText(),
    ),
  );
  assert.equal(
    await page.locator(".intro-pieces img").count(),
    levels[id - 1].targets.length,
  );
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForFunction(
      () =>
        Math.abs(
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue("--vh"),
          ) -
            innerHeight / 100,
        ) < 0.02,
    );
    const rect = await page.locator(".intro-editorial .primary").boundingBox();
    assert.ok(rect && rect.y >= 0 && rect.y + rect.height <= size.height + 1);
    assert.ok(
      await page
        .locator(".stage-intro")
        .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
    );
    intros++;
    if (size.width === 390)
      await page.screenshot({ path: `test-results/story-${engine}-${id}.png` });
  }
  await page.reload();
  await page.locator(".stage-intro").waitFor();
  assert.equal(await page.locator(".stage-intro").count(), 1);
  await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  await page.locator(".board").waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
    saved,
  );
  await page.reload();
  await page.locator(".board").waitFor();
  assert.equal(await page.locator(".stage-intro").count(), 0);
  assert.equal(await page.locator(".board").count(), 1);
}
// Revisit goes straight to the game even without an introductions record.
await seed(1);
await page.getByRole("button", { name: "Ver fases" }).click();
await page.locator(".level-card").first().click();
assert.equal(await page.locator(".stage-intro").count(), 0);
for (const difficulty of ["easy", "medium", "hard"] as const) {
  await seed(0, difficulty);
  await page.locator(".hub-actions .primary").click();
  await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  assert.equal(
    Number(await page.locator(".moves strong").innerText()),
    balancedLevel(levels[0], difficulty).moves,
  );
  const b = await page.locator(".tile").evaluateAll((els: any[]) =>
    els.map((e) => ({
      kind: Number(e.dataset.kind),
      special: e.dataset.special || undefined,
    })),
  );
  const pair = moves(b.map((t: any) => tile(t.kind, t.special)))[0];
  const previousMoves = await page.locator(".moves strong").innerText();
  await page.locator(".tile").nth(pair[0]).click();
  await page.locator(".tile").nth(pair[1]).click();
  await page.waitForFunction(
    (previous: string) =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "false" &&
      document.querySelector(".moves strong")?.textContent !== previous,
    previousMoves,
  );
  const snap = await page.evaluate(
    () => JSON.parse(localStorage.getItem("viva-session-v1")!).snapshot,
  );
  await page.reload();
  await page.locator(".board").waitFor();
  const restored = await page.locator(".tile").evaluateAll((els: any[]) =>
    els.map((e) => ({
      kind: Number(e.dataset.kind),
      special: e.dataset.special || undefined,
    })),
  );
  assert.deepEqual(
    restored,
    snap.board.map((t: any) => ({ kind: t.kind, special: t.special })),
  );
  assert.equal(
    Number(await page.locator(".moves strong").innerText()),
    snap.remaining,
  );
  assert.equal(await page.locator(".stage-intro").count(), 0);
  await page.getByRole("button", { name: "Pausar partida" }).click();
  await page
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
  await page.locator(".hub-actions .primary").click();
  assert.equal(
    Number(await page.locator(".moves strong").innerText()),
    snap.remaining,
  );
}
let bladeChecks = 0;
let libraryLayouts = 0;
for (const count of [0, 4, 5, 10]) {
  await seed(count);
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForFunction(
      () =>
        Math.abs(
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue("--vh"),
          ) -
            innerHeight / 100,
        ) < 0.02,
    );
    assert.equal(await page.locator(".blade").count(), count >= 5 ? 1 : 0);
    assert.equal(
      await page.locator(".family-frame").count(),
      count === 10 ? 1 : 0,
    );
    assert.equal(
      await page
        .locator(".blade-context,.blade-prompts,.library-caption")
        .count(),
      0,
    );
    assert.ok(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    );
    await page.screenshot({
      path: `test-results/story-library-${engine}-${count}-${size.width}.png`,
    });
    libraryLayouts++;
  }
}
for (const size of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
]) {
  await seed(10);
  await page.setViewportSize(size);
  await page.waitForTimeout(150);
  const before = await page.evaluate(() =>
    localStorage.getItem("viva-progress-v1"),
  );
  const dog = page.getByRole("button", { name: "Blade", exact: true });
  await page
    .locator(".blade img")
    .evaluate((i: HTMLImageElement) => i.decode());
  assert.equal(
    await page
      .locator(".blade-context,.blade-prompts,.library-caption")
      .count(),
    0,
  );
  await page.screenshot({
    path: `test-results/blade-${engine}-quiet-${size.width}.png`,
  });
  const feet = (await dog.boundingBox())!;
  await dog.click();
  assert.equal(await page.getByRole("menuitem").count(), 3);
  const menu = (await page.getByRole("menu").boundingBox())!;
  console.log("menu bounds", size, menu);
  await page.screenshot({
    path: `test-results/blade-${engine}-bounds-${size.width}.png`,
  });
  assert.ok(
    menu.x >= 0 &&
      menu.y >= 0 &&
      menu.x + menu.width <= size.width + 1 &&
      menu.y + menu.height <= size.height + 1,
  );
  assert.equal(await page.locator(".modal-backdrop").count(), 0);
  await page.screenshot({
    path: `test-results/blade-${engine}-menu-${size.width}.png`,
  });
  await page.locator(".hub-header h1").click();
  await page.waitForTimeout(220);
  assert.equal(await page.locator(".blade-context").count(), 0);
  for (const [name, pose] of [
    ["Blade, vamos passear?", 2],
    ["Quer petisco?", 4],
    ["Blade, boa noite.", 5],
  ] as const) {
    await dog.click();
    await page.getByRole("menuitem", { name, exact: true }).click();
    await page.waitForTimeout(220);
    assert.equal(await page.locator(".blade-context").count(), 0);
    assert.ok(
      (await page.locator(".blade img").getAttribute("src"))?.includes(
        `blade-${pose}`,
      ),
    );
    await page
      .locator(".blade img")
      .evaluate((i: HTMLImageElement) => i.decode());
    const current = (await dog.boundingBox())!;
    assert.ok(Math.abs(current.y + current.height - feet.y - feet.height) < 1);
    const natural = await page
      .locator(".blade img")
      .evaluate((i: HTMLImageElement) => ({
        w: i.naturalWidth,
        h: i.naturalHeight,
      }));
    const width = Math.min(
      current.width,
      (current.height * natural.w) / natural.h,
    );
    assert.ok(
      width >= feet.width * 0.78 && width <= feet.width * 1.02,
      "pose apparent width stays consistent",
    );
    await page.screenshot({
      path: `test-results/blade-${engine}-pose-${pose}-${size.width}.png`,
    });
    bladeChecks++;
  }
  await dog.click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(220);
  assert.equal(await page.locator(".blade-context").count(), 0);
  await page.getByRole("button", { name: /Meus livros/ }).click();
  await page.getByRole("button", { name: "Ler sinopse" }).click();
  await page
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
    before,
  );
}
await seed(10, "hard");
await page.getByRole("button", { name: "Modo infinito", exact: true }).click();
assert.equal(await page.locator(".stage-intro").count(), 0);
assert.equal(await page.locator(".moves strong").innerText(), "∞");
if (engine === "chromium") {
  await seed(0);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Entrar na biblioteca" }).click();
  await page.locator(".hub-actions .primary").click();
  assert.equal(
    await page.locator(".intro-editorial > p").innerText(),
    stories[0],
  );
  await page.getByRole("button", { name: "Vamos lá!" }).click();
  await page.reload();
  await page.locator(".board").waitFor();
  assert.equal(await page.locator(".board").count(), 1);
}
assert.deepEqual(errors, []);
await writeFile(
  `test-results/story-blade-${engine}-report.json`,
  JSON.stringify(
    {
      intros,
      libraryLayouts,
      bladeChecks,
      resumeThreeDifficulties: true,
      noSpoilers: true,
      noPermanentBladeUI: true,
      offline: engine === "chromium",
      errors,
    },
    null,
    2,
  ),
);
console.log(engine, { intros, bladeChecks, errors });
await browser.close();
