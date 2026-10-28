import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import {
  fresh,
  complete,
  acceptMilestoneBook,
  finishMilestone,
} from "../src/progress";
import { BRUNO_SIGNATURE } from "../src/narrative";
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  serviceWorkers: "block",
  recordVideo:
    engine === "chromium"
      ? {
          dir: "test-results/interface-blade/video",
          size: { width: 390, height: 844 },
        }
      : undefined,
});
await context.addInitScript(`globalThis.__name=fn=>fn;
const fixture=sessionStorage.getItem('interface-progress-fixture');
if(fixture){localStorage.setItem('viva-progress-v1',fixture);localStorage.removeItem('viva-session-v1');sessionStorage.removeItem('interface-progress-fixture');}`);
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
function progress(count: number, reveal = false) {
  let p = fresh(() => 0.43);
  for (let i = 1; i <= count; i++) {
    p = complete(p, i);
    p =
      reveal && i === count
        ? acceptMilestoneBook(p)
        : finishMilestone(acceptMilestoneBook(p));
  }
  return p;
}
async function seed(count: number, reveal = false) {
  await page.evaluate(
    (p) => {
      sessionStorage.setItem("interface-progress-fixture", JSON.stringify(p));
    },
    progress(count, reveal),
  );
  await page.reload({ waitUntil: "domcontentloaded" });
}
async function bladeVisible() {
  await page.locator('.celebration-blade[data-art-ready="true"]').waitFor();
  await page.waitForFunction(() => {
    let el: HTMLElement | null = document.querySelector(".celebration-art");
    while (el) {
      if (Number(getComputedStyle(el).opacity) < 0.95) return false;
      el = el.parentElement;
    }
    return true;
  });
  const facts = await page
    .locator(".celebration-art img")
    .evaluate((img: HTMLImageElement) => {
      const rect = img.getBoundingClientRect();
      let el: Element | null = img,
        opacity = 1,
        visible = true;
      while (el) {
        const s = getComputedStyle(el);
        opacity *= Number(s.opacity);
        visible = visible && s.visibility === "visible" && s.display !== "none";
        el = el.parentElement;
      }
      return {
        loaded: img.complete && img.naturalWidth > 0,
        src: img.getAttribute("src"),
        naturalWidth: img.naturalWidth,
        rect: rect.toJSON(),
        opacity,
        visible,
        inViewport:
          rect.x >= 0 &&
          rect.y >= 0 &&
          rect.right <= innerWidth + 0.5 &&
          rect.bottom <= innerHeight + 0.5,
        uncovered:
          document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          ) === img,
      };
    });
  assert.ok(
    facts.loaded &&
      facts.visible &&
      facts.opacity >= 0.95 &&
      facts.inViewport &&
      facts.uncovered,
    JSON.stringify(facts),
  );
  assert.ok(facts.rect.width >= 280 && facts.rect.height >= 200);
  assert.equal(
    await page.locator("#celebration-title").textContent(),
    "O Blade chegou!",
  );
  assert.equal(
    await page.getByRole("button", { name: "Ouvir", exact: true }).count(),
    0,
  );
  return facts;
}
const results: any[] = [];
await mkdir("test-results/interface-blade", { recursive: true });
try {
  await page.goto(
    process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
  );
  // Library action and settings in the three requested sizes, with and without audio API.
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    await seed(4);
    await page.locator(".hub-actions").waitFor();
    assert.equal(
      await page.locator(".difficulty-trigger,.difficulty-picker").count(),
      0,
    );
    const action = (await page.locator(".hub-actions .primary").boundingBox())!;
    assert.ok(
      action.width >= width - 34 && action.y + action.height <= height + 0.5,
      JSON.stringify({ width, height, action }),
    );
    await page
      .getByRole("button", { name: "Configurações", exact: true })
      .click();
    await page.getByRole("button", { name: "Difícil", exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "Difícil", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    const panel = (await page.locator(".settings-panel").boundingBox())!;
    assert.ok(panel.x >= 0 && panel.y >= 0 && panel.y + panel.height <= height);
    await page.screenshot({
      path: `test-results/interface-blade/${engine}-settings-${width}.png`,
    });
    await page.reload();
    await page
      .getByRole("button", { name: "Configurações", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Difícil", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page
      .getByRole("button", { name: "Fechar configurações", exact: true })
      .click();
    await page.locator(".hub-actions .primary").click();
    await page.locator(".board,.stage-intro").first().waitFor();
    if (await page.locator(".stage-intro").count())
      await page
        .getByRole("button", { name: "Vamos lá!", exact: true })
        .click();
    await page.locator(".board").waitFor();
    await page.waitForFunction(
      () =>
        !!JSON.parse(localStorage.getItem("viva-session-v1") || "null")
          ?.snapshot,
    );
    const before = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("viva-session-v1")!),
    );
    assert.equal(before.difficulty, "hard");
    await page
      .getByRole("button", { name: "Configurações", exact: true })
      .click();
    await page.getByRole("button", { name: "Fácil", exact: true }).click();
    const after = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("viva-session-v1")!),
    );
    assert.deepEqual(after, before);
    await page.reload();
    await page.locator(".board").waitFor();
    assert.equal(
      await page.locator(".moves strong").textContent(),
      String(before.snapshot.remaining),
    );
    results.push({
      width,
      settings: panel,
      mainAction: action,
      difficultyPersists: true,
      activeMatchUnchanged: true,
    });
  }
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [430, 932],
  ])
    for (const reduced of [false, true]) {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({
        reducedMotion: reduced ? "reduce" : "no-preference",
      });
      await seed(5, true);
      const blade = await bladeVisible();
      await page.screenshot({
        path: `test-results/interface-blade/${engine}-blade-${width}-${reduced ? "reduced" : "motion"}.png`,
      });
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      assert.equal(
        await page.locator(".celebration").getAttribute("data-paused"),
        "true",
      );
      await page.evaluate(() => {
        Reflect.deleteProperty(document, "hidden");
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await bladeVisible();
      await page
        .getByRole("button", { name: "Vem, Blade!", exact: true })
        .click();
      await page.locator(".hub-actions").waitFor();
      assert.equal(await page.locator(".blade").count(), 1);
      await page.locator(".blade").click();
      for (const text of [
        "Blade, vamos passear?",
        "Quer petisco?",
        "Blade, boa noite.",
      ])
        assert.equal(
          await page.getByRole("menuitem", { name: text, exact: true }).count(),
          1,
        );
      await page.keyboard.press("Escape");
      results.push({
        width,
        reduced,
        blade,
        visibilityResume: true,
        libraryUnlocked: true,
      });
    }
  // Explicitly hold the sprite response past the former entrance duration.
  let release!: () => void, requested!: () => void;
  const gate = new Promise<void>((r) => (release = r)),
    request = new Promise<void>((r) => (requested = r));
  await context.route("**/assets/blade-4.webp", async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seed(5, true);
  await request;
  await page.waitForTimeout(1200);
  assert.equal(
    await page.locator(".celebration-blade").getAttribute("data-art-ready"),
    "false",
  );
  assert.ok(await page.locator(".ceremony-loading").isVisible());
  assert.ok(
    await page
      .getByRole("button", { name: "Vem, Blade!", exact: true })
      .isDisabled(),
  );
  release();
  const slow = await bladeVisible();
  results.push({ slowAsset: true, blade: slow });
  await context.unroute("**/assets/blade-4.webp");
  // Failed load offers a retry in the existing primary action, never an empty ready scene.
  let attempts = 0;
  await context.route("**/assets/blade-4.webp", async (route) => {
    if (attempts++ === 0) await route.abort();
    else await route.continue();
  });
  await seed(5, true);
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await bladeVisible();
  await context.unroute("**/assets/blade-4.webp");
  results.push({ assetRetry: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(10, true);
  await page.locator(".bruno-signature").waitFor();
  assert.equal(
    await page.locator(".bruno-signature").textContent(),
    BRUNO_SIGNATURE,
  );
  assert.equal(
    await page.getByRole("button", { name: "Ouvir", exact: true }).count(),
    0,
  );
  assert.ok(await page.locator(".family-frame img").isVisible());
  await page.screenshot({
    path: `test-results/interface-blade/${engine}-family.png`,
  });
  await page
    .getByRole("button", { name: "Voltar ao meu cantinho", exact: true })
    .click();
  await page.locator(".hub-actions").waitFor();
  await page.screenshot({
    path: `test-results/interface-blade/${engine}-library-complete.png`,
  });
  assert.deepEqual(errors, []);
  await writeFile(
    `test-results/interface-blade/ceremonies-${engine}.json`,
    JSON.stringify(
      {
        engine,
        results,
        familyPreserved: true,
        listenButtons: 0,
        errors,
        realIPhone: false,
      },
      null,
      2,
    ),
  );
  console.log(engine, "ceremonies/settings:", results.length, "passed");
} finally {
  await context.close();
  await browser.close();
}
