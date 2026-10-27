import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { createBoard } from "../src/engine";
import { levels } from "../src/config";
import { waitForCache } from "./boardHelper";
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
await context.addInitScript("globalThis.__name=fn=>fn");
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const order = [7, 2, 9, 1, 8, 4, 10, 3, 6, 5];
async function seed(count = 10, session: unknown = null) {
  await page.evaluate(
    ({ order, count, session }) => {
      localStorage.setItem(
        "viva-progress-v1",
        JSON.stringify({
          version: 1,
          order,
          completed: Array.from({ length: count }, (_, i) => i + 1),
          sound: true,
          motion: true,
        }),
      );
      localStorage.setItem(
        "viva-stories-v1",
        JSON.stringify({
          campaign: order.join(","),
          seen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        }),
      );
      localStorage.setItem("viva-difficulty-v1", "hard");
      localStorage.setItem(
        "viva-audio-v3",
        JSON.stringify({ muted: true, effects: 0.35, music: 0 }),
      );
      localStorage.setItem("unrelated", "keep");
      if (session)
        localStorage.setItem("viva-session-v1", JSON.stringify(session));
      else localStorage.removeItem("viva-session-v1");
    },
    { order, count, session },
  );
  await page.reload();
}
async function open() {
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Configurações", exact: true })
    .waitFor();
}
async function reset() {
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Começar um novo jogo?", exact: true })
    .waitFor();
}
async function verifyFresh() {
  await page.locator(".home").waitFor();
  await page.waitForTimeout(350);
  const state = await page.evaluate(() =>
    Object.fromEntries(
      [
        "viva-progress-v1",
        "viva-session-v1",
        "viva-stories-v1",
        "viva-difficulty-v1",
        "viva-audio-v3",
        "unrelated",
      ].map((k) => [k, localStorage.getItem(k)]),
    ),
  );
  const progress = JSON.parse(state["viva-progress-v1"]!);
  assert.deepEqual(progress.completed, []);
  assert.deepEqual(progress.revealed, []);
  assert.equal(new Set(progress.order).size, 10);
  assert.equal(progress.pendingCelebration, undefined);
  for (const key of [
    "viva-session-v1",
    "viva-stories-v1",
    "viva-difficulty-v1",
  ])
    assert.equal(state[key], null);
  assert.equal(JSON.parse(state["viva-audio-v3"]!).muted, true);
  assert.equal(JSON.parse(state["viva-audio-v3"]!).effects, 0.35);
  assert.equal(state.unrelated, "keep");
  assert.equal(
    await page.locator(".blade,.family-frame,.shelf-books button").count(),
    0,
  );
  assert.ok(!(await page.locator(".home").innerText()).includes("Elis"));
}
try {
  await page.goto("http://127.0.0.1:4173/viva-test/?v=settings");
  await waitForCache(page);
  await seed();
  await page.locator(".library-room").waitFor();
  const before = await page.evaluate(() =>
    localStorage.getItem("viva-progress-v1"),
  );
  await open();
  const audioApiAvailable = await page.evaluate(
    () =>
      typeof (window.AudioContext || (window as any).webkitAudioContext) ===
      "function",
  );
  if (audioApiAvailable)
    assert.equal(
      await page
        .getByRole("switch", { name: "Efeitos", exact: true })
        .getAttribute("aria-checked"),
      "false",
    );
  await reset();
  assert.equal(
    await page
      .locator(".restart-dialog")
      .evaluate((e: HTMLDialogElement) => e.open),
    true,
  );
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Continuar jogando",
  );
  await page.screenshot({
    path: `test-results/settings-${engine}-confirmation.png`,
  });
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .locator(".restart-dialog")
      .evaluate((e: HTMLDialogElement) => e.open),
    false,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
    before,
  );
  await reset();
  await page
    .getByRole("button", { name: "Continuar jogando", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
    before,
  );
  if (audioApiAvailable) {
    await page.getByRole("switch", { name: "Efeitos", exact: true }).click();
    assert.equal(
      await page
        .getByRole("switch", { name: "Efeitos", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    await page
      .getByRole("button", { name: "Silenciar som", exact: true })
      .click();
  }
  await reset();
  await page
    .getByRole("button", { name: "Sim, começar do zero", exact: true })
    .click();
  await verifyFresh();
  await page.reload();
  await verifyFresh();
  await page
    .getByRole("button", { name: "Entrar na biblioteca", exact: true })
    .click();
  assert.equal(await page.locator(".shelf-books button").count(), 0);
  assert.ok(
    (await page.locator(".difficulty-trigger").innerText()).includes("Fácil"),
  );
  // Reset an in-flight real power; unmount must cancel late snapshots/rewards.
  const board = createBoard(undefined, levels[8].rules);
  board[24].special = "row";
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seed(8, {
    version: 1,
    campaignVersion: 2,
    campaign: order.join(","),
    completedCount: 8,
    stage: 9,
    endless: false,
    difficulty: "easy",
    phase: "game",
    snapshot: {
      board,
      remaining: 58,
      counts: Array(7).fill(0),
      powers: 0,
      cascades: 0,
      round: 1,
    },
  });
  await page.locator(".board").waitFor();
  assert.equal(await page.locator(".app.reduced").count(), 0);
  await page.locator(".tile").first().waitFor();
  await page.waitForTimeout(500);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 200));
  await page.evaluate(() => {
    (document.querySelectorAll(".tile")[24] as HTMLElement).click();
    (document.querySelectorAll(".tile")[25] as HTMLElement).click();
  });
  await page.clock.runFor(280);
  await page.waitForFunction(
    () =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "true",
  );
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("button", { name: "Novo jogo", exact: true })
    .dispatchEvent("click");
  await page.locator(".restart-dialog[open]").waitFor();
  const busyAtReset = await page.locator(".board").getAttribute("aria-busy");
  assert.equal(busyAtReset, "true");
  await page
    .getByRole("button", { name: "Sim, começar do zero", exact: true })
    .dispatchEvent("click");
  await page.clock.runFor(3000);
  await page.clock.resume();
  await verifyFresh();
  await page.waitForTimeout(1200);
  await verifyFresh();
  if (engine === "chromium") {
    await seed();
    await context.setOffline(true);
    await page.reload();
    await page.locator(".library-room").waitFor();
    await open();
    await reset();
    await page
      .getByRole("button", { name: "Sim, começar do zero", exact: true })
      .click();
    await verifyFresh();
    await context.setOffline(false);
  }
  const noAudio = await browser.newContext({
    viewport: { width: 320, height: 568 },
    reducedMotion: "reduce",
  });
  await noAudio.addInitScript(
    'globalThis.__name=fn=>fn;Object.defineProperty(window,"AudioContext",{value:undefined});Object.defineProperty(window,"webkitAudioContext",{value:undefined});',
  );
  const silent = await noAudio.newPage();
  await silent.goto("http://127.0.0.1:4173/viva-test/");
  await silent
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  assert.equal(
    await silent
      .getByRole("button", { name: "Novo jogo", exact: true })
      .count(),
    1,
  );
  await silent.screenshot({ path: `test-results/settings-${engine}-320.png` });
  await noAudio.close();
  assert.deepEqual(errors, []);
  const report = {
    engine,
    audioApiAvailable,
    confirmationRequired: true,
    escapeAndCancelPreserveProgress: true,
    tenBooksReset: true,
    freshOnReload: true,
    preferencesPreserved: true,
    snapshotsAndStoriesRemoved: true,
    noPrematureReveals: true,
    busyAtReset,
    oldTurnCannotRestoreProgress: true,
    offlineReset: engine === "chromium",
    worksWithoutAudioApi: true,
    errors,
  };
  await writeFile(
    `test-results/settings-${engine}-report.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (error) {
  await page
    .screenshot({ path: `test-results/settings-${engine}-failure.png` })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
