import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { waitForCache } from "./boardHelper.ts";
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
  const page = await browser.newPage();
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
        order: [7, 2, 9, 1, 8, 4, 10, 3, 6, 5],
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
  await page.reload();
  await page.locator(".library-room").waitFor();
  await page
    .locator(".room-image")
    .evaluate((img: HTMLImageElement) => img.decode());
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
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/webkit-no-server-report.json",
    JSON.stringify(
      {
        serverStopped: true,
        reloadFromCache: true,
        libraryImageCached: true,
        officialPortraitCached: true,
        ...before,
      },
      null,
      2,
    ),
  );
  console.log(
    "WebKit: navigation and library loaded from cache with HTTP server stopped.",
  );
} finally {
  server.close();
  server.closeAllConnections();
  await browser.close();
}
