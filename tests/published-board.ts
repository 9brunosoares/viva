import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
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
  errors: string[] = [],
  httpErrors: string[] = [];
// A cold Pages cache downloads the full offline set before activating the worker.
page.setDefaultTimeout(90_000);
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) httpErrors.push(`${r.status()} ${r.url()}`);
});
const url = process.env.VIVA_TEST_URL || "https://9brunosoares.github.io/viva/";
const folder = "test-results/board-redesign";
await mkdir(folder, { recursive: true });
try {
  const response = await page.goto(url);
  assert.equal(response?.status(), 200);
  await waitForCache(page);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const resources = await page.evaluate(async () => {
    const manifestResponse = await fetch("./manifest.webmanifest"),
      manifest = await manifestResponse.json();
    const sw = await fetch("./sw.js"),
      worker = await sw.text();
    const paths = [
      ...Array.from(
        document.querySelectorAll<HTMLScriptElement>("script[src]"),
      ).map((e) => e.src),
      ...Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
      ).map((e) => e.href),
      ...manifest.icons.map(
        (i: { src: string }) => new URL(i.src, location.href).href,
      ),
    ];
    const checks = await Promise.all(
      paths.map(async (path) => ({ path, status: (await fetch(path)).status })),
    );
    return {
      manifest,
      status: manifestResponse.status,
      workerStatus: sw.status,
      cache: worker.match(/const CACHE='([^']+)'/)?.[1],
      internalPaths: /["']\.\/tests\//.test(worker),
      checks,
    };
  });
  assert.equal(resources.status, 200);
  assert.equal(resources.workerStatus, 200);
  assert.equal(resources.manifest.display, "standalone");
  assert.equal(resources.manifest.orientation, "portrait");
  assert.ok(resources.cache?.startsWith("viva-"));
  assert.equal(resources.internalPaths, false);
  assert.ok(resources.checks.every((r) => r.status === 200));
  await page
    .getByRole("button", { name: "Entrar na biblioteca", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("switch", { name: "Modo teste", exact: true })
      .getAttribute("aria-checked"),
    "false",
  );
  await page.screenshot({ path: `${folder}/published-${engine}-settings.png` });
  await page
    .getByRole("button", { name: "Fechar configurações", exact: true })
    .click();
  await page.locator(".hub-actions .primary").click();
  await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  await page.locator(".tile").first().waitFor();
  await page
    .locator(".tile img")
    .evaluateAll((imgs) =>
      Promise.all(imgs.map((i) => (i as HTMLImageElement).decode())),
    );
  assert.equal(
    await page.locator(".test-complete,.qa-tools,.qa-button").count(),
    0,
  );
  const css = await page
    .locator(".tile")
    .first()
    .evaluate((e) => {
      const s = getComputedStyle(e);
      return {
        background: s.backgroundColor,
        image: s.backgroundImage,
        shadow: s.boxShadow,
        border: s.borderWidth,
      };
    });
  assert.deepEqual(css, {
    background: "rgba(0, 0, 0, 0)",
    image: "none",
    shadow: "none",
    border: "0px",
  });
  await page.screenshot({ path: `${folder}/published-${engine}-board.png` });
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByRole("switch", { name: "Modo teste", exact: true }).click();
  await page
    .getByRole("button", { name: "Fechar configurações", exact: true })
    .click();
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
  await page
    .getByRole("button", { name: "Guardar na biblioteca", exact: true })
    .click();
  await page.locator(".library-room").waitFor();
  assert.equal(await page.locator(".shelf-books button").count(), 1);
  // Playwright/WebKit on Windows fails navigation with setOffline(). The separate
  // premium6-offline test verifies WebKit by actually stopping its HTTP origin.
  if (engine === "chromium") await context.setOffline(true);
  await page.reload();
  await page.locator(".library-room").waitFor();
  assert.equal(await page.locator(".shelf-books button").count(), 1);
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  const mode = page.getByRole("switch", { name: "Modo teste", exact: true });
  assert.equal(await mode.getAttribute("aria-checked"), "true");
  await mode.click();
  assert.equal(await mode.getAttribute("aria-checked"), "false");
  assert.deepEqual(
    errors.filter((e) => !e.endsWith("/sw.js due to access control checks.")),
    [],
  );
  assert.deepEqual(httpErrors, []);
  const report = {
    engine,
    url,
    resources,
    defaultOff: true,
    newBoard: true,
    oneReward: true,
    offlinePersisted: engine === "chromium",
    httpErrors,
    errors,
    realIPhone: false,
  };
  await writeFile(
    `${folder}/published-${engine}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
