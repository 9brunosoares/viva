import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { shelfPositions } from "../src/libraryLayout";
import { spineMetrics } from "../src/spineMetrics";
import { libraryState } from "../src/progress";
import { books } from "../src/config";
import { waitForCache } from "./boardHelper";

const engine = process.env.BROWSER_ENGINE || "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage(),
  errors: string[] = [];
const order = [7, 2, 9, 1, 8, 4, 10, 3, 6, 5];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await mkdir("test-results", { recursive: true });
await page.addInitScript(() => {
  (window as any).__tones = [];
  const C = window.AudioContext || (window as any).webkitAudioContext;
  if (!C) return;
  const create = C.prototype.createOscillator;
  C.prototype.createOscillator = function () {
    const osc = create.call(this),
      start = osc.start;
    osc.start = function (...args: any[]) {
      (window as any).__tones.push({
        frequency: osc.frequency.value,
        type: osc.type,
        time: args[0],
      });
      return start.apply(osc, args);
    };
    return osc;
  };
});
const report: Record<string, unknown> = { engine };
let layouts = 0,
  synopsisChecks = 0;
async function seed(count: number, pending?: "blade" | "family") {
  await page.waitForTimeout(60);
  await page.evaluate(
    ({ count, order, pending }) => {
      localStorage.setItem(
        "viva-progress-v1",
        JSON.stringify({
          version: 1,
          order,
          completed: Array.from({ length: count }, (_, i) => i + 1),
          sound: true,
          motion: true,
          ...(pending
            ? {
                pendingCelebration: {
                  kind: pending,
                  bookId: order[count - 1],
                  step: "reveal",
                },
                revealed: pending === "family" ? ["blade"] : [],
              }
            : {}),
        }),
      );
      localStorage.removeItem("viva-session-v1");
    },
    { count, order, pending },
  );
  await page.reload();
  if (!count)
    await page.getByRole("button", { name: "Entrar na biblioteca" }).click();
  await page.locator(pending ? ".celebration" : ".library-alive").waitFor();
}
try {
  await page.goto("http://127.0.0.1:4173/viva-test/?v=library3");
  await waitForCache(page);
  for (const count of [0, 2, 5, 8, 10]) {
    await seed(count);
    const saved = await page.evaluate(() =>
      localStorage.getItem("viva-progress-v1"),
    );
    assert.equal(await page.locator(".library-dust i").count(), 8);
    assert.equal(await page.locator(".shelf-books button").count(), count);
    assert.equal(await page.locator(".blade").count(), count >= 5 ? 1 : 0);
    assert.equal(
      await page.locator(".family-frame").count(),
      count === 10 ? 1 : 0,
    );
    assert.equal(await page.locator(".blade-context").count(), 0);
    assert.equal(
      await page.locator(".book-arriving").count(),
      0,
      "existing books do not replay arrival",
    );
    const state = libraryState(count),
      positions = shelfPositions(state);
    assert.equal(
      await page.locator(".library-alive").getAttribute("data-stage"),
      String(state),
    );
    for (const size of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
    ]) {
      await page.setViewportSize(size);
      await page.waitForFunction(
        ({ width, height }) =>
          innerWidth === width &&
          innerHeight === height &&
          Math.abs(
            parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                "--vh",
              ),
            ) -
              height / 100,
          ) < 0.02,
        size,
      );
      assert.ok(
        await page.evaluate(
          () =>
            document.documentElement.scrollHeight <= innerHeight + 1 &&
            document.documentElement.scrollWidth <= innerWidth,
        ),
        `viewport ${size.width} x ${size.height}, stage ${state}`,
      );
      const room = (await page.locator(".library-room").boundingBox())!;
      for (let i = 0; i < count; i++) {
        const b = await page
          .locator(".shelf-books button")
          .nth(i)
          .evaluate((e) => ({
            left: e.style.left,
            bottom: e.style.bottom,
            height: e.style.height,
            width: e.style.width,
          }));
        for (const key of ["left", "bottom", "height"] as const)
          assert.ok(Math.abs(parseFloat(b[key]) - positions[i][key]) < 0.001);
        const metric = spineMetrics[order[i]];
        assert.ok(
          Math.abs(
            parseFloat(b.width) -
              (((positions[i].height * 756) / 496) * metric.artWidth) /
                metric.artHeight,
          ) < 0.001,
        );
      }
      assert.ok(Math.abs(room.width / room.height - 496 / 756) < 0.001);
      await page.screenshot({
        path: `test-results/library-alive-${engine}-${count}-${size.width}.png`,
      });
      layouts++;
    }
    assert.equal(
      await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
      saved,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const saved = await page.evaluate(() =>
    localStorage.getItem("viva-progress-v1"),
  );
  for (let i = 0; i < 10; i++) {
    const source = page.locator(".shelf-books button").nth(i);
    await source.click();
    await page.locator(".book-viewer").waitFor();
    assert.equal(await source.getAttribute("class"), "book-selected ");
    assert.equal(
      await page.locator(".library-room").getAttribute("data-ambient"),
      "paused",
    );
    assert.ok(
      (await page.locator(".book-front img").getAttribute("src"))!.includes(
        `book-${order[i]}-cover`,
      ),
    );
    await page
      .getByRole("button", { name: "Ler sinopse", exact: true })
      .click();
    assert.equal(
      await page.locator(".book-back h3").innerText(),
      books[order[i] - 1].title,
    );
    assert.equal(
      await page.locator(".book-back .author").innerText(),
      books[order[i] - 1].author,
    );
    assert.equal(
      await page.locator(".book-synopsis p").innerText(),
      books[order[i] - 1].synopsis,
    );
    await page
      .getByRole("button", { name: "Voltar à biblioteca", exact: true })
      .click();
    await page.locator(".book-viewer").waitFor({ state: "detached" });
    assert.equal(
      await page.locator(".library-room").getAttribute("data-ambient"),
      "active",
    );
    synopsisChecks++;
  }
  const dog = page.getByRole("button", { name: "Blade", exact: true });
  const original = (await dog.boundingBox())!;
  assert.equal(
    await page
      .locator(".blade-resting")
      .evaluate((e) =>
        getComputedStyle(e).animationName.includes("library-breath"),
      ),
    true,
  );
  for (const [name, pose] of [
    ["Blade, vamos passear?", 2],
    ["Quer petisco?", 4],
    ["Blade, boa noite.", 5],
  ] as const) {
    await dog.click();
    assert.equal(await page.getByRole("menuitem").count(), 3);
    await page.getByRole("menuitem", { name, exact: true }).click();
    assert.ok((await page.locator(".blade-previous").count()) <= 1);
    await page.waitForTimeout(280);
    assert.equal(
      await page.locator(".blade-previous,.blade-context").count(),
      0,
    );
    assert.ok(
      (await page.locator(".blade-current img").getAttribute("src"))!.includes(
        `blade-${pose}`,
      ),
    );
    const rect = (await dog.boundingBox())!;
    assert.ok(
      Math.abs(rect.y + rect.height - original.y - original.height) < 1,
      "feet remain anchored",
    );
    await page.screenshot({
      path: `test-results/library-alive-${engine}-blade-${pose}.png`,
    });
  }
  await dog.click();
  await page.locator(".hub-header h1").click();
  await page.waitForTimeout(230);
  assert.equal(await page.locator(".blade-context").count(), 0);
  await dog.click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(230);
  assert.equal(await page.locator(".blade-context").count(), 0);
  await page
    .getByRole("button", { name: "Ampliar retrato da família" })
    .click();
  assert.equal(
    await page.locator(".library-room").getAttribute("data-ambient"),
    "paused",
  );
  await page.getByRole("button", { name: "Guardar este carinho" }).click();
  assert.equal(
    await page
      .locator(".family-frame")
      .evaluate((e) => getComputedStyle(e, "::before").animationName),
    "none",
  );
  // Exercise the real visibility handler in this isolated browser context.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(
    () =>
      document.querySelector(".library-room")?.getAttribute("data-ambient") ===
      "paused",
  );
  assert.equal(
    await page
      .locator(".library-dust i")
      .first()
      .evaluate((e) => getComputedStyle(e).animationPlayState),
    "paused",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(
    () =>
      document.querySelector(".library-room")?.getAttribute("data-ambient") ===
      "active",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () =>
      document.querySelector(".library-room")?.getAttribute("data-motion") ===
      "still",
  );
  assert.equal(await page.locator(".library-dust i").count(), 0);
  assert.equal(
    await page
      .locator(".blade-resting")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(
    () =>
      document.querySelector(".library-room")?.getAttribute("data-motion") ===
      "full",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
    saved,
  );
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Ver fases", exact: true }).click();
    await page.locator(".journey").waitFor();
    assert.equal(await page.locator(".library-atmosphere").count(), 0);
    await page
      .getByRole("button", { name: "Voltar à biblioteca", exact: true })
      .click();
    await page.locator(".library-room").waitFor();
    assert.equal(await page.locator(".library-atmosphere").count(), 1);
    assert.equal(await page.locator(".library-dust i").count(), 8);
  }
  // Pending milestone fixtures are isolated saves; scene acknowledgment still uses the real UI.
  for (const kind of ["blade", "family"] as const) {
    await seed(kind === "blade" ? 5 : 10, kind);
    assert.equal(await page.locator(".library-room").count(), 0);
    const supported = await page.evaluate(
      () => typeof AudioContext === "function",
    );
    assert.equal(
      await page.evaluate(() => (window as any).__tones.length),
      0,
      "no autoplay on reload",
    );
    if (supported) {
      await page.getByRole("button", { name: "Ouvir", exact: true }).click();
      await page.waitForFunction(() => (window as any).__tones.length > 0);
      const tones = await page.evaluate(() => (window as any).__tones);
      assert.equal(tones.length, kind === "blade" ? 16 : 24);
      assert.equal(tones[0].frequency, kind === "blade" ? 392 : 262);
      assert.ok(tones.every((t: any) => t.type === "sine"));
    }
    await page.locator(".celebration .primary").click();
    await page.locator(".book-arriving").waitFor();
    const expected = order[(kind === "blade" ? 5 : 10) - 1];
    assert.ok(
      (await page.locator(".book-arriving img").getAttribute("src"))!.includes(
        `book-${expected}-spine`,
      ),
    );
    await page.waitForTimeout(1500);
    assert.equal(await page.locator(".book-arriving").count(), 0);
    await page.reload();
    await page.locator(".library-room").waitFor();
    assert.equal(await page.locator(".celebration,.book-arriving").count(), 0);
  }
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "hardwareConcurrency", {
      configurable: true,
      value: 2,
    }),
  );
  await page.reload();
  await page.locator(".library-room").waitFor();
  assert.equal(
    await page.locator(".library-room").getAttribute("data-motion"),
    "limited",
  );
  assert.equal(await page.locator(".library-dust i").count(), 3);
  assert.notEqual(
    await page
      .locator(".library-window-light")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  if (engine === "chromium") await context.setOffline(true);
  await page.reload();
  await page.locator(".library-room").waitFor();
  assert.equal(await page.locator(".shelf-books button").count(), 10);
  await page.locator(".shelf-books button").first().click();
  await page.getByRole("button", { name: "Ler sinopse", exact: true }).click();
  assert.equal(
    await page.locator(".book-synopsis p").innerText(),
    books[order[0] - 1].synopsis,
  );
  assert.deepEqual(errors, []);
  Object.assign(report, {
    layouts,
    synopsisChecks,
    hiddenAndReducedMotion: true,
    posesAnchored: true,
    pendingMilestoneArrival: true,
    originalCeremonyNotes: (await page.evaluate(
      () => typeof AudioContext === "function",
    ))
      ? true
      : "Web Audio unavailable in this WebKit runtime",
    offline: engine === "chromium",
    progressPreserved: true,
    errors,
  });
  console.log(JSON.stringify(report));
  await writeFile(
    `test-results/library-alive-${engine}-report.json`,
    JSON.stringify(report, null, 2),
  );
} catch (error) {
  await page
    .screenshot({ path: `test-results/library-life-${engine}-failure.png` })
    .catch(() => {});
  console.log(
    await page
      .locator(".blade-context")
      .evaluateAll((elements) =>
        elements.map((e) => ({
          bounds: e.getBoundingClientRect().toJSON(),
          animation: getComputedStyle(e).animationName,
          state: getComputedStyle(e).animationPlayState,
        })),
      )
      .catch(() => []),
  );
  throw error;
} finally {
  await browser.close();
}
