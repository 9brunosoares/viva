import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { tile, moves } from "../src/engine";
import { levels } from "../src/config";
import { balancedLevel } from "../src/difficulty";
import { waitForCache } from "./boardHelper";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
const page = await context.newPage(),
  errors: string[] = [];
const initialMoves = balancedLevel(levels[4], "medium").moves;
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:4173/viva-test/?v=feel4");
  await waitForCache(page);
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    localStorage.setItem(
      "viva-progress-v1",
      JSON.stringify({
        version: 1,
        order: [1, 9, 8, 5, 2, 4, 10, 6, 3, 7],
        completed: [1, 2, 3, 4],
        sound: true,
        motion: true,
      }),
    );
    localStorage.setItem("viva-difficulty-v1", "hard");
    localStorage.removeItem("viva-session-v1");
  });
  await page.reload();
  await page.locator(".library-room").waitFor();
  const progress = await page.evaluate(() =>
    localStorage.getItem("viva-progress-v1"),
  );
  assert.equal(await page.locator(".blade,.family-frame").count(), 0);
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page
    .locator(".settings-difficulty")
    .getByRole("button", { name: "Médio", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Médio", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page
    .getByRole("button", { name: "Fechar configurações", exact: true })
    .click();
  await page.locator(".hub-actions .primary").click();
  await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  await page.locator(".tile").first().waitFor();
  assert.equal(
    Number(await page.locator(".moves strong").innerText()),
    balancedLevel(levels[4], "medium").moves,
  );
  const board = await page.locator(".tile").evaluateAll((els) =>
    els.map((e) => ({
      kind: Number((e as HTMLElement).dataset.kind),
      special: (e as HTMLElement).dataset.special,
    })),
  );
  const [a, b] = moves(board.map((t) => tile(t.kind, t.special as any)))[0];
  await page.locator(".tile").nth(a).tap();
  await page.locator(".tile").nth(b).tap();
  await page.waitForFunction(
    (initialMoves: number) =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "false" &&
      JSON.parse(localStorage.getItem("viva-session-v1")!).snapshot.remaining <
        initialMoves,
    initialMoves,
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("viva-session-v1")!),
  );
  assert.equal(saved.difficulty, "medium");
  assert.equal(saved.snapshot.remaining, initialMoves - 1);
  await page
    .getByRole("button", { name: "Pausar partida", exact: true })
    .click();
  await page.getByRole("button", { name: "Retomar", exact: true }).click();
  assert.equal(
    Number(await page.locator(".moves strong").innerText()),
    initialMoves - 1,
  );
  await page
    .getByRole("button", { name: "Pausar partida", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
  assert.equal(await page.locator(".shelf-books button").count(), 4);
  assert.equal(await page.locator(".blade,.family-frame").count(), 0);
  await context.setOffline(true);
  await page.reload();
  await page.locator(".board").waitFor();
  const restored = await page.locator(".tile").evaluateAll((els) =>
    els.map((e) => ({
      kind: Number((e as HTMLElement).dataset.kind),
      special: (e as HTMLElement).dataset.special || undefined,
    })),
  );
  assert.deepEqual(
    restored,
    saved.snapshot.board.map((t: any) => ({
      kind: t.kind,
      special: t.special,
    })),
  );
  assert.equal(
    Number(await page.locator(".moves strong").innerText()),
    initialMoves - 1,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
    progress,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-difficulty-v1")),
    "medium",
  );
  assert.deepEqual(errors, []);
  const report = {
    difficultyChangePersisted: true,
    oneMoveConsumed: true,
    pauseAndResume: true,
    offlineBoardRestored: true,
    acquiredBooksPreserved: true,
    noEarlyBladeOrFrame: true,
    errors,
  };
  await writeFile(
    "test-results/game-feel-app-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
