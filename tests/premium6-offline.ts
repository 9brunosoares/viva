import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { webkit } from "playwright";
import {
  fresh,
  complete,
  acceptMilestoneBook,
  finishMilestone,
} from "../src/progress";
import { scenario } from "./vfx-scenarios";
const root = resolve("dist"),
  types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".webp": "image/webp",
    ".png": "image/png",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".woff2": "font/woff2",
  };
const server = createServer(async (req, res) => {
  try {
    const f = resolve(
      root,
      new URL(req.url!, "http://localhost").pathname.replace(
        /^\/viva-test\//,
        "",
      ) || "index.html",
    );
    if (!f.startsWith(root)) throw Error();
    res.setHeader(
      "Content-Type",
      types[extname(f)] || "application/octet-stream",
    );
    res.end(await readFile(f));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise<void>((r) => server.listen(4198, "127.0.0.1", r));
const browser = await webkit.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  reducedMotion: "reduce",
});
await context.addInitScript("globalThis.__name=fn=>fn");
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:4198/viva-test/");
  await page.locator(".home").waitFor();
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker.ready)?.active,
  );
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  let p = fresh(() => 0.4);
  for (let id = 1; id < 3; id++)
    p = finishMilestone(acceptMilestoneBook(complete(p, id)));
  const { board } = scenario("win");
  const session = {
    version: 2,
    campaign: p.order.join(","),
    completedCount: 2,
    stage: 3,
    endless: false,
    difficulty: "easy",
    phase: "game",
    snapshot: {
      board,
      remaining: 25,
      counts: Array(6).fill(100),
      powers: 1,
      cascades: 2,
      round: 1,
    },
  };
  await page.evaluate(
    ({ p, session }) => {
      localStorage.setItem("viva-progress-v1", JSON.stringify(p));
      localStorage.setItem("viva-session-v1", JSON.stringify(session));
    },
    { p, session },
  );
  await page.reload();
  await page.locator(".board").waitFor();
  await new Promise<void>((r) => server.close(() => r()));
  await page.reload();
  await page.locator(".board").waitFor();
  await page.locator(".tile").nth(16).click();
  await page.locator(".tile").nth(23).click();
  await page.locator(".reward-book").waitFor();
  await page.screenshot({
    path: "test-results/premium6/offline-earned-book.png",
  });
  await page
    .getByRole("button", { name: "Guardar na biblioteca", exact: true })
    .click();
  await page.locator(".hub-actions").waitFor();
  await page.reload();
  await page.locator(".hub-actions").waitFor();
  assert.equal(await page.locator(".shelf-books button").count(), 3);
  await page.locator(".shelf-books button").last().click();
  await page.getByRole("button", { name: "Ler sinopse", exact: true }).click();
  assert.ok(
    (await page.locator(".book-synopsis p").textContent())!.length > 200,
  );
  const resources = await page.evaluate(async () => {
    const paths = ["gift-wrapped", "gift-unwrapped", "gift-open"].map(
      (p) => "assets/premium6/" + p + ".webp",
    );
    paths.push(
      ...["nunito", "fraunces", "caveat"].flatMap((f) =>
        ["latin", "latin-ext"].map(
          (s) => "assets/fonts/" + f + "-" + s + ".woff2",
        ),
      ),
    );
    const checks = await Promise.all(
      paths.map(async (path) => ({ path, status: (await fetch(path)).status })),
    );
    await document.fonts.load("800 16px Nunito");
    await document.fonts.load("600 24px Fraunces");
    await document.fonts.load("500 32px Caveat");
    await document.fonts.ready;
    return {
      checks,
      fontFaces: Array.from(document.fonts).map((f) => ({
        family: f.family,
        status: f.status,
        weight: f.weight,
      })),
      cachedRemoved: (
        await Promise.all(
          (await caches.keys()).map(async (key) =>
            (await (await caches.open(key)).keys()).map((r) => r.url),
          ),
        )
      )
        .flat()
        .filter((url) =>
          /assets\/premium6\/(petals|tail|diploma|drawing|caipirinha|belt|candle|album|speaker|tattoo-frame)\.webp/.test(
            url,
          ),
        ),
      fonts:
        document.fonts.check("800 16px Nunito") &&
        document.fonts.check("600 24px Fraunces") &&
        document.fonts.check("500 32px Caveat"),
    };
  });
  assert.deepEqual(resources.cachedRemoved, []);
  assert.ok(resources.fonts, JSON.stringify(resources));
  assert.ok(resources.checks.every((r) => r.status === 200));
  // Both decoded ceremonial assets must also work with the origin still stopped.
  for (const count of [5, 10]) {
    let milestone = fresh(() => 0.4);
    for (let id = 1; id <= count; id++) {
      milestone = complete(milestone, id);
      milestone =
        id === count
          ? acceptMilestoneBook(milestone)
          : finishMilestone(acceptMilestoneBook(milestone));
    }
    await page.evaluate((p) => {
      localStorage.setItem("viva-progress-v1", JSON.stringify(p));
      localStorage.removeItem("viva-session-v1");
    }, milestone);
    await page.reload();
    if (count === 5) {
      await page.locator('.celebration-blade[data-art-ready="true"]').waitFor();
      assert.ok(await page.locator(".celebration-art img").isVisible());
    } else await page.locator(".family-frame img").waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Ouvir", exact: true }).count(),
      0,
    );
    await page.locator(".celebration .primary").click();
    await page.locator(".hub-actions").waitFor();
  }
  const criticalErrors = errors.filter(
    (e) => !e.endsWith("/viva-test/sw.js due to access control checks."),
  );
  assert.deepEqual(criticalErrors, []);
  await writeFile(
    "test-results/premium6/offline-report.json",
    JSON.stringify(
      {
        engine: "webkit",
        originServerStopped: true,
        earnedBookOffline: true,
        bladeAndFamilyCeremoniesOffline: true,
        reloadPreserved: true,
        resources,
        criticalErrors,
        offlineWorkerDiagnostics: errors,
      },
      null,
      2,
    ),
  );
  console.log({
    offline: "passed",
    resources: resources.checks.length,
    fonts: resources.fonts,
    errors,
  });
} finally {
  if (server.listening) server.close();
  await browser.close();
}
