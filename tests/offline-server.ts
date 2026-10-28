import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { waitForCache } from "./boardHelper.ts";
import { tile, moves, createBoard, type Special } from "../src/engine";
import { levels } from "../src/config";
const require = createRequire(import.meta.url),
  { webkit } = require("playwright");
const root = resolve("dist"),
  types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".webp": "image/webp",
    ".png": "image/png",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
  };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url!, "http://localhost").pathname;
    const relative = pathname.replace(/^\/viva-test\//, "") || "index.html";
    const file = resolve(root, relative);
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader(
      "Content-Type",
      types[extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise<void>((r) => server.listen(4199, "127.0.0.1", r));
const browser = await webkit.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await page.addInitScript("globalThis.__name = (fn) => fn");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4199/viva-test/");
  await waitForCache(page);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    localStorage.setItem(
      "viva-progress-v1",
      JSON.stringify({
        version: 1,
        order: [1, 9, 8, 5, 2, 4, 10, 6, 3, 7],
        completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        sound: true,
        motion: true,
      }),
    );
  });
  await page.reload();
  await page.locator(".library-room").waitFor();
  const before = await page.evaluate(async () => ({
    controller: navigator.serviceWorker.controller?.scriptURL,
    keys: await caches.keys(),
  }));
  assert.ok(before.keys.length);
  await new Promise<void>((r) => {
    server.close(() => r());
    server.closeAllConnections();
  });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    }),
  );
  await page.reload();
  await page.locator(".library-room").waitFor();
  await page
    .locator(".room-image")
    .evaluate((img: HTMLImageElement) => img.decode());
  assert.equal(await page.locator(".library-atmosphere").count(), 1);
  assert.equal(await page.locator(".library-dust i").count(), 8);
  assert.equal(await page.locator(".library-sunbeam").count(), 3);
  await page.waitForFunction(
    () =>
      document.querySelector(".library-sunbeam")?.getAnimations()[0]
        ?.playState === "running",
  );
  await page.locator(".shelf-books button").first().click();
  await page.getByRole("button", { name: "Ler sinopse", exact: true }).click();
  assert.ok((await page.locator(".book-synopsis p").innerText()).length > 200);
  await page
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
  await page
    .locator(".family-frame img")
    .evaluate((img: HTMLImageElement) => img.decode());
  await page
    .getByRole("button", { name: "Ampliar retrato da família", exact: true })
    .click();
  await page
    .locator(".portrait-modal img")
    .evaluate((img: HTMLImageElement) => img.decode());
  await page.screenshot({ path: "test-results/webkit-no-server.png" });
  await page
    .getByRole("button", { name: "Guardar este carinho", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Modo infinito", exact: true })
    .click();
  await page.locator(".tile").first().waitFor();
  const tiles = await page.locator(".tile").evaluateAll((els) =>
    els.map((el) => ({
      kind: Number((el as HTMLElement).dataset.kind),
      special: (el as HTMLElement).dataset.special,
    })),
  );
  const [a, b] = moves(tiles.map((t) => tile(t.kind, t.special as Special)))[0];
  await page.locator(".tile").nth(a).click();
  await page.locator(".tile").nth(b).click();
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector<HTMLElement>(".game-vfx")?.dataset.emissions,
      ) > 0,
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "false",
  );
  await page
    .locator(".tile img")
    .evaluateAll((imgs) =>
      Promise.all(imgs.map((img) => (img as HTMLImageElement).decode())),
    );
  assert.equal(await page.locator(".tile").count(), 56);
  const tattooBoard = createBoard(undefined, levels[8].rules);
  await page.evaluate((board) => {
    const progress = JSON.parse(localStorage.getItem("viva-progress-v1")!);
    localStorage.setItem(
      "viva-session-v1",
      JSON.stringify({
        version: 1,
        campaignVersion: 2,
        campaign: progress.order.join(","),
        completedCount: 10,
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
  }, tattooBoard);
  await page.addInitScript(
    `window.__offlineNativeDraws=0;const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(image?.src?.includes('/vfx/sequences.webp'))window.__offlineNativeDraws++;return draw.call(this,image,...args);};`,
  );
  await page.reload();
  await page.locator(".board").waitFor();
  assert.ok(
    (await page.locator(".game-header").innerText()).includes("Tatuagens"),
  );
  const offlineAssets = await page.evaluate(async () => {
    const keys = (
      await Promise.all(
        (await caches.keys()).map(async (k) => (await caches.open(k)).keys()),
      )
    ).flat();
    const urls = keys
      .map((r) => r.url)
      .filter((u) => /tattoo|vfx\/sequences|shelf-depth/.test(u));
    const assets = urls.filter((u) => u.endsWith(".webp"));
    await Promise.all(
      assets.map(async (url) => {
        const img = new Image();
        img.src = url;
        await img.decode();
      }),
    );
    return urls;
  });
  assert.ok(offlineAssets.some((u) => u.includes("vfx/sequences.webp")));
  assert.ok(
    offlineAssets.some((u) => u.includes("tattoos/outline-square.webp")),
  );
  assert.ok(offlineAssets.some((u) => u.includes("scenes/tattoo-studio.webp")));
  const [ta, tb] = moves(tattooBoard)[0];
  await page.locator(".tile").nth(ta).click();
  await page.locator(".tile").nth(tb).click();
  await page.waitForFunction(() => (window as any).__offlineNativeDraws > 0);
  await page.waitForFunction(
    () =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "false",
  );
  await page.screenshot({ path: "test-results/webkit-tattoo-no-server.png" });
  assert.deepEqual(errors, []);
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/webkit-no-server-report.json",
    JSON.stringify(
      {
        serverStopped: true,
        reloadFromCache: true,
        libraryImageCached: true,
        officialPortraitCached: true,
        animatedGameplayOffline: true,
        sunlightAndDustOffline: true,
        tattooStageOffline: true,
        nativeAtlasPaintedOffline: true,
        offlineAssets,
        errors,
        ...before,
      },
      null,
      2,
    ),
  );
  console.log(
    "WebKit: library and animated gameplay loaded from cache with HTTP server stopped.",
  );
} finally {
  server.close();
  server.closeAllConnections();
  await browser.close();
}
