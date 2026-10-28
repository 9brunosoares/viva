import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import {
  fresh,
  complete,
  acceptMilestoneBook,
  finishMilestone,
} from "../src/progress";
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
await context.addInitScript(
  `globalThis.__name=fn=>fn;const f=sessionStorage.getItem('blade-pigment-fixture');if(f){localStorage.setItem('viva-progress-v1',f);localStorage.removeItem('viva-session-v1');sessionStorage.removeItem('blade-pigment-fixture');}`,
);
await context.addInitScript(
  "let seed=953;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}",
);
const page = await context.newPage(),
  errors: string[] = [],
  results: any[] = [];
page.setDefaultTimeout(90_000);
page.on("pageerror", (e) => errors.push(e.message));
const folder = "test-results/blade-tongue";
await mkdir(folder, { recursive: true });
function progress(count: number, reveal = false) {
  let p = fresh();
  for (let i = 1; i <= count; i++) {
    p = complete(p, i);
    if (!reveal || i !== count) p = finishMilestone(acceptMilestoneBook(p));
  }
  return reveal ? acceptMilestoneBook(p) : p;
}
async function seed(count: number, reveal = false) {
  await page.evaluate(
    (p) => sessionStorage.setItem("blade-pigment-fixture", JSON.stringify(p)),
    progress(count, reveal),
  );
  await page.reload();
}
async function blue(selector: string, x: number, y: number, label: string) {
  const image = page.locator(selector);
  await image.evaluate((e: HTMLImageElement) => e.decode());
  const actual = await image.evaluate(
    (e: HTMLImageElement, { x, y }) => {
      const c = document.createElement("canvas");
      c.width = e.naturalWidth;
      c.height = e.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(e, 0, 0);
      const rgba = Array.from(ctx.getImageData(x, y, 1, 1).data),
        r = e.getBoundingClientRect(),
        style = getComputedStyle(e);
      return {
        rgba,
        src: e.currentSrc,
        box: { x: r.x, y: r.y, width: r.width, height: r.height },
        filter: style.filter,
        opacity: style.opacity,
      };
    },
    { x, y },
  );
  assert.ok(
    actual.rgba[2] > 1.2 * actual.rgba[0] &&
      actual.rgba[2] > 1.2 * actual.rgba[1],
    JSON.stringify({ label, actual }),
  );
  assert.ok(actual.box.width > 0 && actual.box.height > 0);
  results.push({ label, ...actual });
}
try {
  await page.goto(
    process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
  );
  await waitForCache(page);
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    await seed(5);
    await page.locator(".blade-current img").waitFor();
    const saved = await page.evaluate(() =>
      localStorage.getItem("viva-progress-v1"),
    );
    for (const [text, pose, x, y] of [
      ["Quer petisco?", 4, 130, 145],
      ["Blade, vamos passear?", 2, 121, 173],
    ] as const) {
      await page.getByRole("button", { name: "Blade", exact: true }).click();
      await page.getByRole("menuitem", { name: text, exact: true }).click();
      await page.waitForFunction(
        (n) =>
          document
            .querySelector<HTMLImageElement>(".blade-current img")
            ?.src.includes(`blade-${n}.webp`),
        pose,
      );
      await blue(".blade-current img", x, y, `library-${pose}-${width}`);
      await page.screenshot({
        path: `${folder}/${engine}-library-${pose}-${width}.png`,
      });
    }
    await page.getByRole("button", { name: "Blade", exact: true }).click();
    await page
      .getByRole("menuitem", { name: "Blade, boa noite.", exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .querySelector<HTMLImageElement>(".blade-current img")
        ?.src.includes("blade-5.webp"),
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
      saved,
    );
    await seed(5, true);
    await page.locator(".celebration-blade[data-art-ready=true]").waitFor();
    await blue(".celebration-art img", 130, 145, `ceremony-${width}`);
    assert.equal(
      await page.locator(".celebration h1").innerText(),
      "O Blade chegou!",
    );
    await page.screenshot({
      path: `${folder}/${engine}-ceremony-${width}.png`,
    });
    // The campaign pet profile has five kinds; the face is actually used by
    // the existing six-kind infinite profile. Choose that theme for this check.
    await seed(10);
    await page.locator(".hub-infinite").waitFor();
    await page.evaluate(() => {
      const draw = Math.random;
      Math.random = () => {
        Math.random = draw;
        return 0.45;
      };
      document.querySelector<HTMLButtonElement>(".hub-infinite")!.click();
    });
    await page.locator('.tile[data-kind="5"] img').first().waitFor();
    await blue(
      '.tile[data-kind="5"] img >> nth=0',
      82,
      105,
      `pet-tile-${width}`,
    );
    await page.screenshot({ path: `${folder}/${engine}-pet-${width}.png` });
    // Leave the active match before seeding the next presentation.
    await page
      .getByRole("button", { name: "Pausar partida", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Voltar à biblioteca", exact: true })
      .click();
  }
  await seed(10, true);
  await page.locator(".celebration-family").waitFor();
  await blue(".family-frame img", 718, 731, "family");
  await page.screenshot({ path: `${folder}/${engine}-family.png` });
  await page.locator(".celebration .primary").click();
  await page
    .getByRole("button", { name: "Ampliar retrato da família", exact: true })
    .click();
  await blue(".portrait-modal img", 720, 777, "family-enlarged");
  await page.screenshot({ path: `${folder}/${engine}-portrait.png` });
  const critical = errors.filter(
    (e) => !e.endsWith("/sw.js due to access control checks."),
  );
  assert.deepEqual(critical, []);
  const report = {
    engine,
    url: process.env.VIVA_TEST_URL || "local",
    cases: results.length,
    results,
    progressUnaffectedByInteractions: true,
    errors: critical,
    realIPhone: false,
  };
  await writeFile(
    `${folder}/${engine}-report.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(
    engine,
    results.length,
    "rendered blue tongues, interactions and progress passed",
  );
} catch (e) {
  await page
    .screenshot({ path: `${folder}/${engine}-failure.png` })
    .catch(() => {});
  throw e;
} finally {
  await browser.close();
}
