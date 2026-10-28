import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium, webkit } from "playwright";
import { tile, moves } from "../src/engine";
import { levels } from "../src/config";
import { balancedLevel } from "../src/difficulty";
import { waitForCache } from "./boardHelper";

const root = resolve("dist"),
  template = await readFile(resolve(root, "sw.js"), "utf8");
let version = 1;
const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".png": "image/png",
};
const server = createServer(async (req, res) => {
  try {
    const path =
      new URL(req.url!, "http://localhost").pathname.replace(
        /^\/viva-test\//,
        "",
      ) || "index.html";
    res.setHeader(
      "Content-Type",
      mime[extname(path)] || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "no-store");
    if (path === "sw.js") {
      const list = JSON.parse(/const FILES=(.*);/.exec(template)![1]);
      if (version === 1) list.push("./assets/previous-00000001.js");
      res.end(
        template
          .replace(
            /const CACHE='[^']+';/,
            `const CACHE='viva-mobile-update-${version}';`,
          )
          .replace(/const FILES=.*;/, `const FILES=${JSON.stringify(list)};`),
      );
      return;
    }
    if (path === "assets/previous-00000001.js") {
      if (version === 1) res.end("// previous chunk");
      else res.writeHead(404).end();
      return;
    }
    const file = resolve(root, path);
    if (!file.startsWith(root)) throw Error();
    let body = await readFile(file);
    if (path === "index.html")
      body = Buffer.from(
        body
          .toString()
          .replace(
            '<html lang="pt-BR">',
            `<html lang="pt-BR" data-release="${version}">`,
          ),
      );
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise<void>((r) => server.listen(4198, "127.0.0.1", r));
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
await context.addInitScript("globalThis.__name = (fn) => fn");
await context.addInitScript(`window.__pwaTrace=[];
const post=MessagePort.prototype.postMessage;
MessagePort.prototype.postMessage=function(data,...args){if(data&&typeof data.ready==='boolean')window.__pwaTrace.push({event:'reply',ready:data.ready,screen:document.querySelector('.app')?.dataset.screen,hidden:document.hidden});return post.call(this,data,...args);};
navigator.serviceWorker.addEventListener('message',event=>window.__pwaTrace.push({event:event.data?.type,screen:document.querySelector('.app')?.dataset.screen,hidden:document.hidden}));`);
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = "http://127.0.0.1:4198/viva-test/";
const savedState = () =>
  page.evaluate(() => {
    const session = JSON.parse(
      localStorage.getItem("viva-session-v1") || "null",
    );
    if (session?.snapshot)
      session.snapshot.board = session.snapshot.board.map(
        ({ id, ...piece }: any) => piece,
      );
    return {
      progress: localStorage.getItem("viva-progress-v1"),
      session,
      difficulty: localStorage.getItem("viva-difficulty-v1"),
    };
  });
async function waiting() {
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker.getRegistration())?.waiting,
  );
}
async function release(page: any, n: number) {
  await page.waitForFunction(
    (n: number) => document.documentElement.dataset.release === String(n),
    n,
  );
  await page.locator(".library-room").waitFor();
}
try {
  await page.goto(url);
  await waitForCache(page);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.evaluate(() => {
    localStorage.setItem(
      "viva-progress-v1",
      JSON.stringify({
        version: 1,
        order: [7, 2, 9, 1, 8, 4, 10, 3, 6, 5],
        completed: [1, 2, 3, 4],
        sound: false,
        motion: true,
      }),
    );
    localStorage.setItem("viva-difficulty-v1", "medium");
  });
  await page.reload();
  await page.locator(".library-room").waitFor();
  await page.locator(".hub-actions .primary").click();
  await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  await page.locator(".tile").first().waitFor();
  const b = await page.locator(".tile").evaluateAll((els) =>
    els.map((e) => ({
      kind: Number((e as HTMLElement).dataset.kind),
      special: (e as HTMLElement).dataset.special,
    })),
  );
  const [a, c] = moves(b.map((t) => tile(t.kind, t.special as any)))[0];
  await page.locator(".tile").nth(a).click();
  await page.locator(".tile").nth(c).click();
  await page.waitForFunction(
    (expected: number) =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "false" &&
      JSON.parse(localStorage.getItem("viva-session-v1")!).snapshot
        .remaining === expected,
    balancedLevel(levels[4], "medium").moves - 1,
  );
  const stored = await savedState();
  // Old installs may retain one previous chunk cache: discarded art must still go.
  await page.evaluate(async () => {
    const key = (await caches.keys()).find((key) => key.startsWith("viva-"))!;
    const cache = await caches.open(key);
    for (const name of [
      "petals",
      "tail",
      "diploma",
      "drawing",
      "caipirinha",
      "belt",
      "candle",
      "album",
      "speaker",
      "tattoo-frame",
    ])
      await cache.put(
        new URL("assets/premium6/" + name + ".webp", location.href),
        new Response("obsolete fixture"),
      );
  });
  version = 2;
  await page.evaluate(
    async () =>
      await (await navigator.serviceWorker.getRegistration())!.update(),
  );
  await waiting();
  await page.waitForTimeout(700);
  assert.equal(await page.locator("html").getAttribute("data-release"), "1");
  assert.equal(await page.locator(".board").count(), 1);
  const other = await context.newPage();
  other.on("pageerror", (e) => errors.push(e.message));
  await other.goto(url);
  await other.locator(".board").waitFor();
  await other
    .getByRole("button", { name: "Pausar partida", exact: true })
    .click();
  await other
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
  await other.locator(".library-room").waitFor();
  await page.waitForTimeout(1600);
  assert.equal(
    await other.locator("html").getAttribute("data-release"),
    "1",
    "another active game blocks adoption",
  );
  await page.bringToFront();
  await page
    .getByRole("button", { name: "Pausar partida", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
  await release(page, 2);
  assert.deepEqual(await savedState(), stored);
  assert.equal(
    await page.evaluate(async () => {
      const requests = (
        await Promise.all(
          (await caches.keys()).map(
            async (key) => await (await caches.open(key)).keys(),
          ),
        )
      ).flat();
      return requests.filter((request) =>
        /assets\/premium6\/(petals|tail|diploma|drawing|caipirinha|belt|candle|album|speaker|tattoo-frame)\.webp$/.test(
          new URL(request.url).pathname,
        ),
      ).length;
    }),
    0,
  );
  assert.match(
    await page.evaluate(
      async () => await (await fetch("./assets/previous-00000001.js")).text(),
    ),
    /previous chunk/,
  );
  await other.bringToFront();
  await release(other, 2);
  await page.bringToFront();
  await page.locator(".shelf-books button").first().click();
  await page.locator(".book-viewer").waitFor();
  version = 3;
  await page.evaluate(
    async () =>
      await (await navigator.serviceWorker.getRegistration())!.update(),
  );
  await waiting();
  await page.waitForTimeout(700);
  assert.equal(await page.locator("html").getAttribute("data-release"), "2");
  assert.equal(await page.locator(".book-viewer").count(), 1);
  await page.keyboard.press("Escape");
  await release(page, 3);
  const keys = await page.evaluate(() => caches.keys());
  assert.deepEqual(keys.filter((k) => k.startsWith("viva-")).sort(), [
    "viva-mobile-update-2",
    "viva-mobile-update-3",
  ]);
  assert.deepEqual(await savedState(), stored);
  await other.close();
  if (engine === "webkit") {
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => false,
      }),
    );
    await new Promise<void>((r) => {
      server.close(() => r());
      server.closeAllConnections();
    });
  } else await context.setOffline(true);
  await page.reload();
  await page.locator(".board").waitFor();
  assert.equal(
    await page.locator(".moves strong").innerText(),
    String(balancedLevel(levels[4], "medium").moves - 1),
  );
  assert.equal(await page.locator("html").getAttribute("data-release"), "3");
  assert.deepEqual(errors, []);
  const report = {
    engine,
    threeVersions: true,
    gameAndReadingDeferred: true,
    multipleWindowsCoordinated: true,
    returnToLibraryPreserved: true,
    progressAndBoardPreserved: true,
    previousChunkAvailable: true,
    twoCachesOnly: true,
    retiredArtPurgedFromPreviousCache: true,
    newVersionOffline: true,
    errors,
  };
  await writeFile(
    engine === "webkit"
      ? "test-results/pwa-update-webkit-report.json"
      : "test-results/pwa-update-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (error) {
  console.log(
    await Promise.all(
      context.pages().map((p) =>
        p.evaluate(async () => ({
          version: document.documentElement.dataset.release,
          screen: document.querySelector<HTMLElement>(".app")?.dataset.screen,
          hidden: document.hidden,
          waiting: (await navigator.serviceWorker.getRegistration())?.waiting
            ?.state,
          trace: (window as any).__pwaTrace,
        })),
      ),
    ),
  );
  throw error;
} finally {
  await browser.close();
  server.close();
  server.closeAllConnections();
}
