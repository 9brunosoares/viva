import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { createBoard } from "../src/engine";
import { levels } from "../src/config";
import { waitForCache } from "./boardHelper";
const base = "https://9brunosoares.github.io/viva/";
const results = [];
for (const engine of ["chromium", "webkit"] as const) {
  const browser = await (engine === "webkit" ? webkit : chromium).launch({
    headless: true,
    ...(engine === "chromium" ? { channel: "msedge" } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(
    `globalThis.__name=fn=>fn;window.__publishedNative=0;const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(image?.src?.includes('/vfx/sequences.webp'))window.__publishedNative++;return draw.call(this,image,...args);}`,
  );
  const page = await context.newPage(),
    errors: string[] = [],
    httpErrors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith(base) && r.status() >= 400)
      httpErrors.push(`${r.status()} ${r.url()}`);
  });
  try {
    await page.goto(base + "?v=vfx-final");
    await page.locator(".home").waitFor();
    await waitForCache(page);
    const metadata = await page.evaluate(
      async () => await (await fetch("assets/vfx/sequences.json")).json(),
    );
    assert.equal(metadata.frameCount, 74);
    await page
      .getByRole("button", { name: "Configurações", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Novo jogo", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Fechar configurações", exact: true })
      .click();
    const order = [7, 2, 9, 1, 8, 4, 10, 3, 6, 5],
      board = createBoard(undefined, levels[8].rules);
    board[24].special = "row";
    await page.evaluate(
      ({ order, board }) => {
        localStorage.setItem(
          "viva-progress-v1",
          JSON.stringify({
            version: 1,
            order,
            completed: [1, 2, 3, 4, 5, 6, 7, 8],
            sound: false,
            motion: true,
          }),
        );
        localStorage.setItem(
          "viva-session-v1",
          JSON.stringify({
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
          }),
        );
      },
      { order, board },
    );
    await page.reload();
    await page.locator(".board").waitFor();
    await page.waitForTimeout(900);
    assert.equal(await page.locator(".test-complete").count(), 0);
    await page.locator(".tile").nth(24).click();
    await page.locator(".tile").nth(25).click();
    await page.waitForFunction(() => (window as any).__publishedNative > 0);
    await page.waitForFunction(
      () =>
        document.querySelector(".board")?.getAttribute("aria-busy") === "false",
    );
    await page.screenshot({
      path: `test-results/published-vfx-${engine}-board.png`,
    });
    await page
      .getByRole("button", { name: "Configurações", exact: true })
      .click();
    await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
    await page
      .getByRole("button", { name: "Continuar jogando", exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("viva-progress-v1")!).completed
            .length,
      ),
      8,
    );
    await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
    await page
      .getByRole("button", { name: "Sim, começar do zero", exact: true })
      .click();
    await page.locator(".home").waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("viva-progress-v1")!).completed
            .length,
      ),
      0,
    );
    let offline = false;
    if (engine === "chromium") {
      await context.setOffline(true);
      await page.reload();
      await page.locator(".home").waitFor();
      await page
        .getByRole("button", { name: "Entrar na biblioteca", exact: true })
        .click();
      await page.locator(".library-room").waitFor();
      offline = true;
      await context.setOffline(false);
    }
    const cache = await page.evaluate(async () => await caches.keys());
    assert.deepEqual(errors, []);
    assert.deepEqual(httpErrors, []);
    results.push({
      engine,
      url: base,
      nativeAtlasFrames: metadata.frameCount,
      nativeAtlasActuallyDrawn: true,
      newGameConfirmedAndCancelSafe: true,
      officialHasNoTestShortcut: true,
      offline,
      cache,
      errors,
      httpErrors,
      physicalIphone: false,
    });
  } catch (e) {
    await page
      .screenshot({ path: `test-results/published-vfx-${engine}-failure.png` })
      .catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
}
await writeFile(
  "test-results/published-vfx-report.json",
  JSON.stringify({ commit: process.env.PUBLISHED_COMMIT, results }, null, 2),
);
console.log(JSON.stringify(results));
