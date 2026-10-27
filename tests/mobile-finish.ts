import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { waitForCache } from "./boardHelper";
import { BRUNO_SIGNATURE } from "../src/narrative";

const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript("globalThis.__name = (fn) => fn");
const order = [7, 2, 9, 1, 8, 4, 10, 3, 6, 5];
let layouts = 0;
async function seed(count: number) {
  await page.waitForTimeout(80);
  await page.evaluate(
    ({ count, order }) => {
      localStorage.setItem(
        "viva-progress-v1",
        JSON.stringify({
          version: 1,
          order,
          completed: Array.from({ length: count }, (_, i) => i + 1),
          sound: true,
          motion: true,
        }),
      );
      localStorage.removeItem("viva-session-v1");
    },
    { count, order },
  );
  await page.reload();
  if (!count)
    await page.getByRole("button", { name: "Entrar na biblioteca" }).click();
  await page.locator(".library-room").waitFor();
  await page.waitForTimeout(240);
}
async function size(width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(
    ({ height }) =>
      Math.abs(
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--vh"),
        ) *
          100 -
          height,
      ) < 1,
    { height },
  );
}
try {
  await page.goto("http://127.0.0.1:4173/viva-test/?v=finish5");
  await waitForCache(page);
  assert.equal(
    await page.title(),
    "Viva! — Um joguinho pra viver e passar o tempo",
  );
  assert.equal(await page.locator("#boot-status").count(), 0);
  assert.ok(!/Elis|Bruno/.test(await page.locator(".home").innerText()));
  await page.screenshot({ path: `test-results/mobile-${engine}-home.png` });
  for (const count of [0, 2, 5, 8, 10]) {
    await seed(count);
    for (const [width, height] of [
      [320, 568],
      [393, 852],
      [430, 932],
    ]) {
      await size(width, height);
      assert.ok(
        await page.evaluate(
          () =>
            document.documentElement.scrollHeight <= innerHeight + 1 &&
            document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      for (const selector of [
        ".hub-actions .primary",
        ".difficulty-trigger",
        ".hub-map",
        ".collection-link",
      ]) {
        const b = (await page.locator(selector).boundingBox())!;
        assert.ok(
          b.width >= 44 &&
            b.height >= 44 &&
            b.x >= 0 &&
            b.y >= 0 &&
            b.x + b.width <= width + 1 &&
            b.y + b.height <= height + 1,
          `${selector} ${width}x${height}`,
        );
      }
      assert.equal(await page.locator(".shelf-books button").count(), count);
      assert.equal(await page.locator(".blade").count(), count >= 5 ? 1 : 0);
      assert.equal(
        await page.locator(".family-frame").count(),
        count === 10 ? 1 : 0,
      );
      await page.screenshot({
        path: `test-results/mobile-${engine}-library-${count}-${width}.png`,
      });
      layouts++;
    }
    await page.getByRole("button", { name: "Ver fases", exact: true }).click();
    await page.locator(".journey").waitFor();
    await page.waitForTimeout(230);
    assert.equal(await page.locator(".level-card").count(), 10);
    assert.equal(
      await page.locator(".level-card[aria-current=step]").count(),
      count < 10 ? 1 : 0,
    );
    if (count < 10) {
      const current = (await page
        .locator(".level-card[aria-current=step]")
        .boundingBox())!;
      assert.ok(current.y >= 0 && current.y + current.height <= 932);
    }
    assert.equal(await page.locator(".level-card:disabled img").count(), 0);
    const list = await page
      .locator(".level-list")
      .evaluate((e) => ({ inside: e.clientHeight, full: e.scrollHeight }));
    assert.ok(
      list.full > list.inside,
      "chapters scroll internally, not the app",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    );
    await page.screenshot({
      path: `test-results/mobile-${engine}-chapters-${count}.png`,
    });
    await page
      .getByRole("button", { name: "Voltar à biblioteca", exact: true })
      .click();
  }
  await size(393, 852);
  await page.locator(".library-room").waitFor();
  await page.evaluate(() =>
    document.querySelector<HTMLButtonElement>(".hub-map")!.click(),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".journey").waitFor();
  assert.equal(
    await page.locator(".app > section").getAttribute("inert"),
    null,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
  await page.locator(".library-room").waitFor();
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>(".hub-map")!.click();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.locator(".journey").waitFor();
  assert.equal(
    await page.locator(".app > section").getAttribute("inert"),
    null,
  );
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
  await page.locator(".library-room").waitFor();
  const progress = await page.evaluate(() =>
    localStorage.getItem("viva-progress-v1"),
  );
  await page.locator(".difficulty-trigger").click();
  await page.getByRole("button", { name: "Médio", exact: true }).click();
  assert.equal(await page.locator(".difficulty-picker").count(), 0);
  assert.ok(
    (await page.evaluate(() => document.activeElement?.className))?.includes(
      "difficulty-trigger",
    ),
  );
  await page.locator(".difficulty-trigger").click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".difficulty-picker").count(), 0);
  await page.locator(".difficulty-trigger").click();
  await page.locator(".hub-header h1").click();
  assert.equal(await page.locator(".difficulty-picker").count(), 0);

  const source = page.locator(".shelf-books button").first();
  await source.click();
  await page.locator(".book-viewer").waitFor();
  assert.equal(
    await page.locator(".book-viewer").getAttribute("aria-modal"),
    "true",
  );
  assert.equal(await page.locator(".library").getAttribute("inert"), "");
  await page.keyboard.press("Shift+Tab");
  assert.ok(
    await page.evaluate(
      () =>
        !!document.activeElement?.closest(".modal") &&
        !document.activeElement.closest("[inert]"),
    ),
  );
  await page.getByRole("button", { name: "Ler sinopse", exact: true }).click();
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("Tab");
    assert.ok(
      await page.evaluate(
        () =>
          !!document.activeElement?.closest(".modal") &&
          !document.activeElement.closest("[inert]"),
      ),
    );
  }
  await page.waitForFunction(() => {
    const inner = document.querySelector<HTMLElement>(".book-turn-inner");
    return (
      inner &&
      new DOMMatrixReadOnly(getComputedStyle(inner).transform).m11 <= -0.999
    );
  });
  await page.screenshot({ path: `test-results/mobile-${engine}-book.png` });
  await page.keyboard.press("Escape");
  await page.locator(".book-viewer").waitFor({ state: "detached" });
  assert.equal(await page.locator(".library").getAttribute("inert"), null);
  assert.ok(await source.evaluate((e) => e === document.activeElement));

  await page.evaluate(() => {
    document.documentElement.style.setProperty("--safe-top", "59px");
    document.documentElement.style.setProperty("--safe-bottom", "34px");
  });
  for (const selector of [
    ".hub-map",
    ".hub-actions .primary",
    ".difficulty-trigger",
  ]) {
    const b = (await page.locator(selector).boundingBox())!;
    assert.ok(b.y >= 59 && b.y + b.height <= 852 - 34, selector);
  }
  await source.click();
  const close = (await page.locator(".book-close").boundingBox())!;
  assert.ok(close.y >= 59);
  await page.keyboard.press("Escape");
  await page.locator(".book-viewer").waitFor({ state: "detached" });
  await page
    .getByRole("button", { name: "Ampliar retrato da família", exact: true })
    .click();
  assert.equal(
    await page.locator(".portrait-modal .bruno-signature").innerText(),
    BRUNO_SIGNATURE,
  );
  const portrait = (await page.locator(".portrait-modal").boundingBox())!;
  assert.ok(portrait.y >= 59 && portrait.y + portrait.height <= 852 - 34);
  await page.waitForFunction(() => {
    const modal = document.querySelector<HTMLElement>(".portrait-modal"),
      photo = modal?.querySelector("img");
    return (
      modal &&
      Number(getComputedStyle(modal).opacity) >= 0.99 &&
      photo?.complete &&
      photo.naturalWidth > 0
    );
  });
  await page.screenshot({
    path: `test-results/mobile-${engine}-portrait-safe.png`,
  });
  await page.keyboard.press("Escape");
  await page.locator(".portrait-modal").waitFor({ state: "detached" });
  await page
    .getByRole("button", { name: "Ampliar retrato da família", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar este carinho", exact: true })
    .click();
  await page.locator(".portrait-modal").waitFor({ state: "detached" });
  await page.evaluate(() => {
    document.documentElement.style.removeProperty("--safe-top");
    document.documentElement.style.removeProperty("--safe-bottom");
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() =>
    document.documentElement.classList.contains("portrait-fallback"),
  );
  assert.ok(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth + 1 &&
        document.documentElement.scrollHeight <= innerHeight + 1,
    ),
  );
  await page.screenshot({ path: `test-results/mobile-${engine}-rotated.png` });
  await size(393, 852);
  await size(393, 650);
  await size(393, 852);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() =>
    document.querySelector(".app")?.classList.contains("reduced"),
  );
  await source.click();
  await page
    .getByRole("button", { name: "Voltar à biblioteca", exact: true })
    .click();
  assert.equal(await page.locator(".book-viewer").count(), 0);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
    progress,
  );
  assert.deepEqual(errors, []);
  const report = {
    engine,
    layouts,
    iphone14ProViewport: true,
    internalChapterScroll: true,
    modalFocusAndEscape: true,
    hiddenFacesExcluded: true,
    safeAreaGeometry: true,
    progressUnchanged: true,
    reducedMotion: true,
    errors,
  };
  await writeFile(
    `test-results/mobile-finish-${engine}-report.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
