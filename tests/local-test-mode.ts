import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { books } from "../src/config";
import { moves, type Board } from "../src/engine";
import { BRUNO_SIGNATURE } from "../src/narrative";
import { waitForCache } from "./boardHelper";

const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
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
await context.addInitScript("globalThis.__name=fn=>fn");
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const folder = "test-results/board-redesign";
await mkdir(folder, { recursive: true });
async function open() {
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
}
async function close() {
  await page
    .getByRole("button", { name: "Fechar configurações", exact: true })
    .click();
}
async function idle() {
  await page.waitForFunction(
    () =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "false" &&
      !!localStorage.getItem("viva-session-v1"),
  );
}
async function play() {
  const board = (await page.locator(".tile").evaluateAll((els) =>
    els.map((e) => ({
      kind: Number((e as HTMLElement).dataset.kind),
      special: (e as HTMLElement).dataset.special || undefined,
      ...((e as HTMLElement).dataset.role === "gift"
        ? { role: "gift", hp: Number((e as HTMLElement).dataset.hp) }
        : {}),
    })),
  )) as unknown as Board;
  const [a, b] = moves(board)[0];
  const remaining = Number(await page.locator(".moves strong").innerText());
  await page.locator(".tile").nth(a).tap();
  await page.locator(".tile").nth(b).tap();
  if (!Number.isFinite(remaining)) {
    await page.waitForFunction(
      (kinds) =>
        document.querySelector(".board")?.getAttribute("aria-busy") ===
          "false" &&
        Array.from(document.querySelectorAll<HTMLElement>(".tile"))
          .map((e) => e.dataset.kind)
          .join(",") !== kinds,
      board.map((t) => t.kind).join(","),
    );
    return;
  }
  await page.waitForFunction(
    (n) =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "false" &&
      JSON.parse(localStorage.getItem("viva-session-v1") || "null")?.snapshot
        .remaining ===
        n - 1,
    remaining,
  );
}
try {
  await page.goto(
    process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
  );
  await waitForCache(page);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-test-mode-v1")),
    null,
  );
  await open();
  assert.equal(
    await page
      .getByRole("switch", { name: "Modo teste", exact: true })
      .getAttribute("aria-checked"),
    "false",
  );
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    const mode = page.getByRole("switch", { name: "Modo teste", exact: true });
    await mode.scrollIntoViewIfNeeded();
    const r = (await mode.boundingBox())!;
    assert.ok(
      r.x >= 0 &&
        r.y >= 0 &&
        r.x + r.width <= width + 1 &&
        r.y + r.height <= height + 1,
    );
    assert.equal(
      await page.locator(".settings-test-mode").innerText(),
      "Modo teste",
    );
    await page.screenshot({
      path: `${folder}/settings-${engine}-${width}.png`,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await close();
  await page
    .getByRole("button", { name: "Entrar na biblioteca", exact: true })
    .click();
  await page.locator(".hub-actions .primary").click();
  await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  await idle();
  assert.equal(await page.locator(".test-complete").count(), 0);
  await play();
  const session = await page.evaluate(() =>
    localStorage.getItem("viva-session-v1"),
  );
  await open();
  const originalDifficulty = await page
    .locator(".settings-difficulty [aria-pressed=true]")
    .innerText();
  await page.getByRole("switch", { name: "Modo teste", exact: true }).click();
  assert.equal(
    await page.locator(".settings-difficulty [aria-pressed=true]").innerText(),
    originalDifficulty,
  );
  await close();
  const detached = await page.locator(".test-complete").elementHandle();
  assert.ok(detached);
  const button = (await page.locator(".test-complete").boundingBox())!,
    board = (await page.locator(".board-wrap").boundingBox())!;
  assert.ok(
    button.y >= board.y + board.height && button.y + button.height <= 844,
  );
  await open();
  await page.getByRole("switch", { name: "Modo teste", exact: true }).click();
  await close();
  assert.equal(await page.locator(".test-complete").count(), 0);
  await detached.evaluate((e: HTMLButtonElement) => e.click());
  assert.equal(await page.locator(".reward").count(), 0);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-session-v1")),
    session,
  );
  await open();
  await page.getByRole("switch", { name: "Modo teste", exact: true }).click();
  await close();
  await page.reload();
  await idle();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-test-mode-v1")),
    "true",
  );
  // Snapshot loading assigns fresh render IDs; compare gameplay identity/state.
  const resumed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("viva-session-v1")!),
  );
  const previous = JSON.parse(session!);
  for (const value of [resumed, previous])
    value.snapshot.board = value.snapshot.board.map(
      ({ id, ...tile }: { id: number }) => tile,
    );
  assert.deepEqual(resumed, previous);
  let order: number[] = [];
  for (let stage = 1; stage <= 10; stage++) {
    if (stage > 1) {
      await page.locator(".hub-actions .primary").click();
      await page
        .getByRole("button", { name: "Vamos lá!", exact: true })
        .click();
      await idle();
    }
    await page.locator(".test-complete").evaluate((e: HTMLButtonElement) => {
      e.click();
      e.click();
    });
    const discover = page.getByRole("button", {
      name: "Descobrir meu livro",
      exact: true,
    });
    if (await discover.count()) await discover.click();
    await page.locator(".reward-book").waitFor();
    const progress = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("viva-progress-v1")!),
    );
    if (!order.length) order = progress.order;
    assert.deepEqual(progress.order, order);
    assert.deepEqual(
      progress.completed,
      Array.from({ length: stage }, (_, i) => i + 1),
    );
    assert.equal(
      await page.locator(".reward h2").innerText(),
      books[order[stage - 1] - 1].title,
    );
    assert.equal(
      await page.locator(".reward-synopsis,.book-synopsis").count(),
      0,
    );
    await page
      .getByRole("button", { name: "Guardar na biblioteca", exact: true })
      .click();
    if (stage === 5 || stage === 10) {
      await page.locator('.celebration[data-art-ready="true"]').waitFor();
      assert.equal(
        await page.getByRole("button", { name: "Ouvir", exact: true }).count(),
        0,
      );
      if (stage === 5) {
        assert.equal(
          await page.locator(".celebration h1").innerText(),
          "O Blade chegou!",
        );
        const visible = await page
          .locator(".celebration-art img")
          .evaluate((e: HTMLImageElement) => {
            const r = e.getBoundingClientRect(),
              s = getComputedStyle(e);
            return (
              e.complete &&
              e.naturalWidth > 0 &&
              r.width > 100 &&
              r.height > 100 &&
              r.x >= 0 &&
              r.y >= 0 &&
              r.right <= innerWidth &&
              r.bottom <= innerHeight &&
              s.opacity !== "0"
            );
          });
        assert.ok(visible);
      } else
        assert.equal(
          await page.locator(".bruno-signature").textContent(),
          BRUNO_SIGNATURE,
        );
      await page.screenshot({
        path: `${folder}/mode-${engine}-ceremony-${stage}.png`,
      });
      await page.locator(".celebration .primary").click();
    }
    await page.locator(".library-room").waitFor();
    assert.equal(await page.locator(".shelf-books button").count(), stage);
    assert.equal(await page.locator(".blade").count(), stage >= 5 ? 1 : 0);
    console.log(engine, "test-mode stage", stage, "one reward");
  }
  await page
    .getByRole("button", { name: "Modo infinito", exact: true })
    .click();
  await idle();
  assert.equal(await page.locator(".test-complete").count(), 0);
  assert.equal(
    await page
      .locator(".tile:not([data-role]):not([data-special])")
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundImage),
    "none",
  );
  await play();
  await page
    .getByRole("button", { name: "Pausar partida", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
  await open();
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  await page
    .getByRole("button", { name: "Sim, começar do zero", exact: true })
    .click();
  await page.locator(".home").waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-test-mode-v1")),
    "true",
  );
  await open();
  await page.getByRole("switch", { name: "Modo teste", exact: true }).click();
  await close();
  await page.reload();
  await open();
  assert.equal(
    await page
      .getByRole("switch", { name: "Modo teste", exact: true })
      .getAttribute("aria-checked"),
    "false",
  );
  assert.deepEqual(errors, []);
  const report = {
    engine,
    defaultOff: true,
    unmountedWhenOff: true,
    detachedClickInert: true,
    preferencePersisted: true,
    normalMove: true,
    tenUniqueRewards: true,
    bladeVisible: true,
    familyPreserved: true,
    endless: true,
    newGamePreservesPreference: true,
    viewports: 3,
    errors,
  };
  await writeFile(
    `${folder}/test-mode-${engine}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (e) {
  await page
    .screenshot({ path: `${folder}/mode-${engine}-failure.png` })
    .catch(() => {});
  throw e;
} finally {
  await browser.close();
}
