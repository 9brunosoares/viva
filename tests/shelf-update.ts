import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { createHash } from "node:crypto";
import { chromium, webkit } from "playwright";
import {
  fresh,
  complete,
  acceptMilestoneBook,
  finishMilestone,
} from "../src/progress";
import { createBoard } from "../src/engine";

// Old release is archived before editing/building. Both versions use the real SW.
const roots = [
  resolve("test-results/shelf-contact/release-before"),
  resolve("dist"),
];
const templates = await Promise.all(
  roots.map((r) => readFile(resolve(r, "sw.js"), "utf8")),
);
let version = 1;
const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const path =
      new URL(req.url!, "http://localhost").pathname.replace(
        /^\/viva-test\//,
        "",
      ) || "index.html";
    const root = roots[version - 1],
      file = resolve(root, path);
    if (!file.startsWith(root + sep) && file !== root)
      throw Error("Invalid path");
    res.setHeader(
      "Content-Type",
      mime[extname(path)] || "application/octet-stream",
    );
    res.setHeader(
      "Cache-Control",
      path.includes("library-shelf-depth")
        ? "public, max-age=3600"
        : "no-store",
    );
    if (path === "sw.js") {
      res.end(
        templates[version - 1].replace(
          /const CACHE='[^']+';/,
          `const CACHE='viva-shelf-update-${version}';`,
        ),
      );
      return;
    }
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
  } catch (error) {
    console.error("QA server", version, req.url, String(error));
    res.writeHead(404).end();
  }
});
await new Promise<void>((r) => server.listen(4196, "127.0.0.1", r));
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const reports: unknown[] = [];
try {
  for (const count of [4, 10]) {
    version = 1;
    let p = fresh();
    for (let i = 1; i <= count; i++)
      p = finishMilestone(acceptMilestoneBook(complete(p, i)));
    p.sound = false;
    let seed = 192;
    const board = createBoard(
      () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296,
    ).map((t, i) => ({ ...t, id: i + 1 }));
    const records: Record<string, string> = {
      "viva-progress-v1": JSON.stringify(p),
      "viva-difficulty-v1": "hard",
      "viva-test-mode-v1": "false",
      "viva-audio-v3": JSON.stringify({ muted: true, music: 0, effects: 0.37 }),
      "viva-stories-v1": JSON.stringify({
        campaign: p.order.join(","),
        seen: Array.from({ length: count === 4 ? 5 : 10 }, (_, i) => i + 1),
      }),
    };
    if (count === 4)
      records["viva-session-v1"] = JSON.stringify({
        version: 2,
        campaign: p.order.join(","),
        completedCount: 4,
        stage: 5,
        endless: false,
        difficulty: "hard",
        phase: "game",
        snapshot: {
          board,
          remaining: 19,
          counts: [2, 3, 1, 4, 0, 2],
          powers: 1,
          cascades: 2,
          round: 1,
        },
      });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await context.addInitScript({
      content: `globalThis.__name=fn=>fn;if(!sessionStorage.getItem('fixture-seeded')){for(const [k,v] of Object.entries(${JSON.stringify(records)}))localStorage.setItem(k,v);sessionStorage.setItem('fixture-seeded','true');}`,
    });
    const page = await context.newPage(),
      errors: string[] = [];
    page.setDefaultTimeout(90000);
    page.on("pageerror", (e) => errors.push(e.message));
    const saved = () =>
      page.evaluate(() =>
        Object.fromEntries(
          Object.entries(localStorage)
            .filter(([k]) => k.startsWith("viva-"))
            .sort(),
        ),
      );
    await page.goto("http://127.0.0.1:4196/viva-test/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    if (count === 4) await page.locator(".board[aria-busy=false]").waitFor();
    else {
      await page.locator(".shelf-books button").first().click();
      await page
        .getByRole("button", { name: "Ler sinopse", exact: true })
        .click();
      await page.locator(".book-synopsis").waitFor();
    }
    const snapshot = await saved();
    assert.deepEqual(
      snapshot,
      records,
      "fixture values are preserved on initial load, including the exact session",
    );
    const oldMask = await page.evaluate(async () =>
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            await (
              await fetch("assets/library-shelf-depth-3.webp")
            ).arrayBuffer(),
          ),
        ),
      )
        .map((x) => x.toString(16).padStart(2, "0"))
        .join(""),
    );
    version = 2;
    await page.waitForTimeout(250);
    await page.evaluate(
      async () => await (await navigator.serviceWorker.ready).update(),
    );
    const timeout = Date.now() + 90000;
    while (
      !(await page.evaluate(
        async () =>
          !!(await navigator.serviceWorker.getRegistration())?.waiting,
      ))
    ) {
      assert.ok(Date.now() < timeout, "updated worker installs");
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1600);
    assert.equal(
      await page.locator("html").getAttribute("data-release"),
      "1",
      "never reload an active game or synopsis",
    );
    assert.deepEqual(await saved(), snapshot);
    if (count === 4) {
      await page
        .getByRole("button", { name: "Pausar partida", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Voltar à biblioteca", exact: true })
        .click();
    } else await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => document.documentElement.dataset.release === "2",
    );
    await page.locator(".library-room[data-ready=true]").waitFor();
    assert.deepEqual(
      await saved(),
      snapshot,
      "ALL saved records remain byte-identical across actual old/new releases",
    );
    assert.equal(await page.locator(".shelf-books button").count(), count);
    assert.equal(await page.locator(".reward-book,.celebration").count(), 0);
    const mask = await readFile(
      resolve(roots[1], "assets/library-shelf-depth-3.webp"),
    );
    const digest = createHash("sha256").update(mask).digest("hex");
    const newMask = await page.evaluate(async () =>
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            await (
              await fetch("assets/library-shelf-depth-3.webp")
            ).arrayBuffer(),
          ),
        ),
      )
        .map((x) => x.toString(16).padStart(2, "0"))
        .join(""),
    );
    assert.notEqual(newMask, oldMask);
    assert.equal(
      newMask,
      digest,
      "updated front lip replaces even fresh HTTP cache",
    );
    await page.screenshot({
      path: `test-results/shelf-contact/update-${engine}-${count}.png`,
    });
    if (count === 4) {
      // Reload resumes the exact in-progress match; no new game is created.
      await page.reload();
      await page.locator(".board[aria-busy=false]").waitFor();
      assert.equal(await page.locator(".moves strong").innerText(), "19");
      assert.deepEqual(await saved(), snapshot);
    }
    await page
      .locator(".library-room img.room-image")
      .evaluateAll((es) =>
        Promise.all(es.map((e) => (e as HTMLImageElement).decode())),
      );
    assert.deepEqual(errors, []);
    reports.push({
      engine,
      count,
      exactStoragePreserved: true,
      sessionResumed: count === 4,
      activeScreenNotReloaded: true,
      noRepeatedRewards: true,
      newLipHash: newMask,
      errors,
    });
    await context.close();
  }
  await writeFile(
    `test-results/shelf-contact/update-${engine}.json`,
    JSON.stringify(reports, null, 2),
  );
  console.log(JSON.stringify(reports));
} finally {
  await browser.close();
  server.close();
  server.closeAllConnections();
}
