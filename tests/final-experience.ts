import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  fresh,
  complete,
  acceptMilestoneBook,
  finishMilestone,
} from "../src/progress.ts";
import { BRUNO_SIGNATURE } from "../src/narrative.ts";
import { books } from "../src/config.ts";
import { waitForCache } from "./boardHelper.ts";
const require = createRequire(import.meta.url),
  { chromium, webkit } = require("playwright");
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" && process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "no-preference",
});
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
page.on("response", (r: any) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await context.addInitScript(() => {
  const Original = window.AudioContext;
  (window as any).__audioStarts = 0;
  if (Original)
    (window as any).AudioContext = new Proxy(Original, {
      construct(target, args) {
        (window as any).__audioStarts++;
        return Reflect.construct(target, args);
      },
    });
});
await mkdir("test-results", { recursive: true });
await page.goto(
  process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
);
await waitForCache(page);
assert.equal(await page.evaluate(() => (window as any).__audioStarts), 0);
assert.equal(
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .count(),
  0,
);
async function playerCopy() {
  return page.evaluate(() => {
    const root = document.querySelector(".app")!.cloneNode(true) as HTMLElement;
    root.querySelectorAll(".qa-tools,.qa-button").forEach((e) => e.remove());
    return root.innerText || root.textContent || "";
  });
}
const forbidden =
  /PWA|offline|navegador|armazenamento|Safari|persistente|configurações|atualizaç/i;
assert.ok(!forbidden.test(await playerCopy()));
assert.ok(!(await playerCopy()).includes(BRUNO_SIGNATURE));
await page.getByRole("button", { name: "Entrar na biblioteca" }).click();
const audioSupported = await page.evaluate(
  () => typeof window.AudioContext === "function",
);
assert.equal(
  await page.evaluate(() => (window as any).__audioStarts > 0),
  audioSupported,
);
let p = fresh();
for (let i = 1; i <= 10; i++)
  p = finishMilestone(acceptMilestoneBook(complete(p, i)));
p.sound = false;
p.motion = false;
await page.evaluate(
  (p) => localStorage.setItem("viva-progress-v1", JSON.stringify(p)),
  p,
);
await page.reload();
await page.locator(".library-room").waitFor();
const saved = await page.evaluate(() =>
  localStorage.getItem("viva-progress-v1"),
);
assert.equal(
  await page.locator(".app.reduced").count(),
  0,
  "Only the system, not old manual settings, controls reduced motion",
);
assert.ok(!forbidden.test(await playerCopy()));
await page.getByRole("button", { name: /^Meus livros/ }).click();
for (let i = 0; i < 10; i++) {
  assert.equal(
    await page.locator(".book-modal h2").textContent(),
    books[p.order[i] - 1].title,
  );
  if (i < 9)
    await page
      .getByRole("button", { name: "Próximo livro", exact: true })
      .click();
}
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
assert.equal(
  await page.evaluate(() => document.activeElement?.className),
  "collection-link",
);
assert.equal(
  await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
  saved,
);
await page.emulateMedia({ reducedMotion: "reduce" });
await page.locator(".app.reduced").waitFor();
await page.emulateMedia({ reducedMotion: "no-preference" });
await page.waitForFunction(() => !document.querySelector(".app.reduced"));
for (const [kind, label] of [
  ["blade", "Rever chegada do Blade · QA"],
  ["family", "Rever encerramento · QA"],
] as const) {
  await page.locator(".qa-tools summary").click();
  await page.getByRole("button", { name: label, exact: true }).click();
  await page
    .locator(".celebration-art img")
    .evaluate((img: HTMLImageElement) => img.decode());
  if (kind === "family")
    assert.equal(
      await page.locator(".bruno-signature").textContent(),
      BRUNO_SIGNATURE,
    );
  else assert.equal(await page.locator(".bruno-signature").count(), 0);
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(1050);
    const metrics = await page.evaluate(() => ({
      vh: innerHeight,
      h: document.documentElement.scrollHeight,
      rects: Array.from(
        document.querySelectorAll(
          ".celebration .primary,.bruno-signature,.celebration-art img",
        ),
      ).map((e) => {
        const r = e.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      }),
    }));
    assert.ok(metrics.h <= metrics.vh + 1, JSON.stringify(metrics));
    assert.ok(
      metrics.rects.every((r) => r.top >= 0 && r.bottom <= metrics.vh + 1),
    );
    await page.screenshot({
      path: `test-results/final-${engine}-${kind}-${size.width}.png`,
    });
  }
  await page.locator(".celebration .primary").click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
    saved,
  );
}
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: `test-results/final-${engine}-library.png` });
await page
  .getByRole("button", { name: "Ampliar retrato da família", exact: true })
  .click();
await page
  .locator(".portrait-modal img")
  .evaluate((img: HTMLImageElement) => img.decode());
assert.ok(
  (await page.locator(".portrait-modal img").getAttribute("src"))!.includes(
    "/family.webp",
  ),
);
await page.screenshot({ path: `test-results/final-${engine}-portrait.png` });
await page
  .getByRole("button", { name: "Guardar este carinho", exact: true })
  .click();
assert.deepEqual(errors, []);
await writeFile(
  `test-results/final-${engine}-report.json`,
  JSON.stringify(
    {
      engine,
      noSettings: true,
      noTechnicalCopy: true,
      audioAfterGesture: audioSupported
        ? "verified"
        : "unavailable in test engine",
      legacyPrefsPreserved: true,
      bookNavigation: true,
      systemMotionLive: true,
      signatureExact: true,
      officialPortrait: true,
      progressUnchanged: true,
      errors,
    },
    null,
    2,
  ),
);
console.log(
  `${engine}: clean copy, no settings, gesture audio, 10 books, system motion, 8 ceremony layouts, exact signature and untouched progress passed.`,
);
await browser.close();
