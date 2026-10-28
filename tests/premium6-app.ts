import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import {
  fresh,
  complete,
  acceptMilestoneBook,
  finishMilestone,
} from "../src/progress";
import { levels, books } from "../src/config";
import {
  createBoard,
  moves,
  resolveWave,
  swap,
  type Board,
} from "../src/engine";
import { BRUNO_SIGNATURE } from "../src/narrative";
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
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/";
await mkdir("test-results/premium6", { recursive: true });
let checks = 0;
function progress(count: number, pending = false) {
  let p = fresh(() => 0.43);
  for (let id = 1; id <= count; id++) {
    p = complete(p, id);
    if (!pending || id !== count) p = finishMilestone(acceptMilestoneBook(p));
  }
  return p;
}
async function seed(count: number, session: unknown = null, pending = false) {
  const p = progress(count, pending);
  await page.evaluate(
    ({ p, session }) => {
      localStorage.setItem("viva-progress-v1", JSON.stringify(p));
      localStorage.setItem("viva-difficulty-v1", "easy");
      if (session)
        localStorage.setItem("viva-session-v1", JSON.stringify(session));
      else localStorage.removeItem("viva-session-v1");
    },
    { p, session },
  );
  await page.reload();
  await page.waitForFunction(() => !!document.querySelector(".app"));
  const restored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("viva-progress-v1")!),
  );
  assert.deepEqual(restored, p, `seed ${count}, pending ${pending}`);
  return p;
}
try {
  await page.goto(url);
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker?.ready)?.active,
  );
  for (const count of [0, 1, 4, 5, 6, 9, 10]) {
    await seed(count);
    if (!count)
      await page
        .getByRole("button", { name: "Entrar na biblioteca", exact: true })
        .click();
    await page.locator(".hub-actions").waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator(".shelf-books button").count(), count);
    assert.equal(await page.locator(".blade").count(), count >= 5 ? 1 : 0);
    assert.equal(
      await page.locator(".family-frame").count(),
      count === 10 ? 1 : 0,
    );
    assert.equal(
      await page.locator("[data-keepsake]").count(),
      Math.min(count, 4) + Math.max(0, Math.min(count, 9) - 5),
    );
    for (const [width, height] of [
      [375, 667],
      [390, 844],
      [430, 932],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(
        () =>
          Math.abs(
            parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                "--vh",
              ),
            ) *
              100 -
              innerHeight,
          ) < 2,
      );
      await page.waitForTimeout(200);
      const viewportMetrics = await page.evaluate(() => ({
        html: document.documentElement.scrollHeight,
        inner: innerHeight,
        app: document.querySelector(".app")?.clientHeight,
        vh: getComputedStyle(document.documentElement).getPropertyValue("--vh"),
      }));
      assert.ok(
        viewportMetrics.html <= viewportMetrics.inner + 1,
        JSON.stringify({ count, width, height, ...viewportMetrics }),
      );
      for (const el of await page.locator(".shelf-books button").all())
        assert.ok(
          await el.evaluate((e) => {
            const b = e.getBoundingClientRect();
            return (
              document
                .elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
                ?.closest("button") === e
            );
          }),
        );
      if (count === 10) {
        const a = (await page.locator(".hub-infinite").boundingBox())!,
          b = (await page.locator(".family-frame").boundingBox())!;
        assert.ok(
          a.y + a.height < b.y ||
            b.y + b.height < a.y ||
            a.x + a.width < b.x ||
            b.x + b.width < a.x,
        );
      }
      await page.screenshot({
        path: `test-results/premium6/${engine}-library-${count}-${width}.png`,
      });
      checks++;
    }
    if (count) {
      await page.locator(".shelf-books button").last().click();
      await page
        .getByRole("button", { name: "Ler sinopse", exact: true })
        .click();
      assert.ok(
        (await page.locator(".book-synopsis p").innerText()).length > 200,
      );
      await page
        .getByRole("button", { name: "Voltar à biblioteca", exact: true })
        .click();
    }
  }
  // Previous build: no obstacles may be retrofitted into a saved mid-phase board.
  const p = progress(8),
    b = createBoard(() => 0.42, levels[8].rules);
  const legacy = {
    version: 1,
    campaignVersion: 2,
    campaign: p.order.join(","),
    completedCount: 8,
    stage: 9,
    endless: false,
    difficulty: "easy",
    phase: "game",
    snapshot: {
      board: b,
      remaining: 31,
      counts: Array(7).fill(0),
      powers: 0,
      cascades: 0,
      round: 1,
    },
  };
  await seed(8, legacy);
  await page.locator(".board").waitFor();
  assert.equal(await page.locator("[data-obstacle-objective]").count(), 0);
  assert.equal(await page.locator(".moves strong").innerText(), "31");
  checks++;
  // A won snapshot resumes the reward without replaying a move or losing a book.
  await seed(8, {
    ...legacy,
    snapshot: { ...legacy.snapshot, won: true, counts: Array(7).fill(99) },
  });
  await page.locator(".reward-book").waitFor();
  assert.equal(await page.locator(".reward-synopsis").count(), 0);
  assert.equal(await page.locator(".reward .library-room").count(), 1);
  await page
    .getByRole("button", { name: "Guardar na biblioteca", exact: true })
    .click();
  await page.locator(".hub-actions").waitFor();
  checks++;
  // All legacy pending book/reveal steps still gate each milestone.
  for (const count of [5, 10]) {
    await seed(count, null, true);
    await page.locator(".reward-book").waitFor();
    await page
      .getByRole("button", { name: "Guardar na biblioteca", exact: true })
      .click();
    await page.locator(".celebration").waitFor();
    assert.equal(await page.locator(".celebration .library-room").count(), 1);
    if (count === 10)
      assert.equal(
        await page.locator(".celebration .bruno-signature").textContent(),
        BRUNO_SIGNATURE,
      );
    await page.screenshot({
      path: `test-results/premium6/${engine}-ceremony-${count}.png`,
    });
    await page.reload();
    await page.locator(".celebration .primary").click();
    await page.locator(".hub-actions").waitFor();
    await page.reload();
    assert.equal(await page.locator(".celebration").count(), 0);
    checks++;
  }
  // New sessions get the new profile; hidden QA never ships in the release build.
  await seed(2);
  await page.locator(".hub-actions .primary").click();
  await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  await page.locator(".tile").first().waitFor();
  assert.equal(
    await page.locator('[data-obstacle-objective="petals"]').count(),
    1,
  );
  assert.equal(await page.locator(".test-complete").count(), 0);
  await page.screenshot({ path: `test-results/premium6/${engine}-petals.png` });
  checks++;
  // A later phase has five objective chips. Verify the actual board and footer fit,
  // including a simulated iPhone notch, not just the library composition.
  const late = progress(8);
  await seed(8, {
    version: 1,
    campaignVersion: 3,
    campaign: late.order.join(","),
    completedCount: 8,
    stage: 9,
    endless: false,
    difficulty: "medium",
    phase: "game",
  });
  await page.locator(".board").waitFor();
  for (const [width, height, safeTop, safeBottom] of [
    [375, 667, 0, 0],
    [390, 844, 0, 0],
    [430, 932, 0, 0],
    [390, 844, 59, 34],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(
      () =>
        Math.abs(
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue("--vh"),
          ) *
            100 -
            innerHeight,
        ) < 2,
    );
    await page.evaluate(
      ({ safeTop, safeBottom }) => {
        document.documentElement.style.setProperty(
          "--safe-top",
          safeTop + "px",
        );
        document.documentElement.style.setProperty(
          "--safe-bottom",
          safeBottom + "px",
        );
      },
      { safeTop, safeBottom },
    );
    const board = (await page.locator(".board").boundingBox())!,
      footer = (await page.locator(".game-tools").boundingBox())!;
    assert.ok(
      board.y >= safeTop && board.y + board.height <= height - safeBottom + 1,
      JSON.stringify({ board, width, height, safeTop, safeBottom }),
    );
    assert.ok(
      footer.y + footer.height <= height - safeBottom + 1,
      JSON.stringify({ footer, width, height, safeTop, safeBottom }),
    );
    await page.screenshot({
      path: `test-results/premium6/${engine}-tattoos-${width}-safe${safeTop}.png`,
    });
    checks++;
  }
  const workerDiagnostics =
    engine === "webkit"
      ? errors.filter((e) => /\/sw\.js due to access control checks\.$/.test(e))
      : [];
  const criticalErrors = errors.filter((e) => !workerDiagnostics.includes(e));
  const workerHealth = await page.evaluate(async () => ({
    controlled: !!navigator.serviceWorker.controller,
    active: !!(await navigator.serviceWorker.getRegistration())?.active,
    status: (await fetch(new URL("sw.js", location.href))).status,
  }));
  assert.deepEqual(criticalErrors, []);
  assert.ok(
    workerHealth.controlled &&
      workerHealth.active &&
      workerHealth.status === 200,
  );
  await writeFile(
    `test-results/premium6/${process.env.VIVA_REPORT_PREFIX || ""}${engine}-report.json`,
    JSON.stringify(
      {
        engine,
        url,
        checks,
        errors: criticalErrors,
        workerDiagnostics,
        workerHealth,
        realIPhone: false,
      },
      null,
      2,
    ),
  );
  console.log({
    engine,
    checks,
    errors: criticalErrors,
    workerDiagnostics,
    workerHealth,
  });
} catch (error) {
  await page
    .screenshot({ path: `test-results/premium6/${engine}-failure.png` })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
