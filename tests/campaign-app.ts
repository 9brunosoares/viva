import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { createBoard, moves, type Board } from "../src/engine";
import { books, levels } from "../src/config";
import { stories } from "../src/stories";
import { BRUNO_SIGNATURE } from "../src/narrative";
import { waitForCache } from "./boardHelper";
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
await context.addInitScript(
  "globalThis.__name=fn=>fn; let seed=98123; Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296;}",
);
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const order = [7, 2, 9, 1, 8, 4, 10, 3, 6, 5];
async function seed(count: number, session: unknown = null) {
  await page.evaluate(
    ({ count, session, order }) => {
      localStorage.setItem(
        "viva-progress-v1",
        JSON.stringify({
          version: 1,
          order,
          completed: Array.from({ length: count }, (_, i) => i + 1),
          sound: false,
          motion: true,
        }),
      );
      localStorage.setItem("viva-difficulty-v1", "easy");
      if (session)
        localStorage.setItem("viva-session-v1", JSON.stringify(session));
      else localStorage.removeItem("viva-session-v1");
    },
    { count, session, order },
  );
  await page.reload();
  if (!count && !session)
    await page
      .getByRole("button", { name: "Entrar na biblioteca", exact: true })
      .click();
}
async function tiles() {
  return page.locator(".tile").evaluateAll((elements) =>
    elements.map((e) => ({
      kind: Number((e as HTMLElement).dataset.kind),
      special: (e as HTMLElement).dataset.special || null,
    })),
  );
}
async function step() {
  const board = (await tiles()) as unknown as Board;
  const [a, b] = moves(board)[0];
  const remaining = await page.locator(".moves strong").innerText();
  await page.locator(".tile").nth(a).click();
  await page.locator(".tile").nth(b).click();
  await page.waitForFunction(
    (n) =>
      !document.querySelector(".board") ||
      (document.querySelector(".board")?.getAttribute("aria-busy") ===
        "false" &&
        document.querySelector(".moves strong")?.textContent !== n),
    remaining,
  );
  // A committed idle frame can precede React's passive autosave effect in WebKit.
  await page.waitForFunction(
    () =>
      !document.querySelector(".board") ||
      JSON.parse(localStorage.getItem("viva-session-v1") || "null")?.snapshot
        ?.remaining ===
        Number(document.querySelector(".moves strong")?.textContent),
  );
}
let layouts = 0;
try {
  await page.goto("http://127.0.0.1:4173/viva-test/?v=campaign");
  await waitForCache(page);
  for (const count of [0, 1, 4, 5, 6, 9, 10]) {
    await seed(count);
    await page.locator(".library-room").waitFor();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("viva-progress-v1")!),
    );
    assert.equal(await page.locator(".shelf-books button").count(), count);
    assert.equal(await page.locator(".blade").count(), count >= 5 ? 1 : 0);
    assert.equal(
      await page.locator(".family-frame").count(),
      count === 10 ? 1 : 0,
    );
    for (const [width, height] of count === 4 || count === 5 || count === 10
      ? [
          [320, 568],
          [393, 852],
          [430, 932],
        ]
      : [[393, 852]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(100);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      );
      for (const button of await page.locator(".shelf-books button").all()) {
        const box = (await button.boundingBox())!;
        assert.ok(
          box.x >= 0 &&
            box.y >= 0 &&
            box.x + box.width <= width + 1 &&
            box.y + box.height <= height + 1,
        );
        assert.ok(
          await button.evaluate((e) => {
            const b = e.getBoundingClientRect();
            return (
              document
                .elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
                ?.closest("button") === e
            );
          }),
        );
      }
      await page.screenshot({
        path: `test-results/campaign-${engine}-library-${count}-${width}.png`,
      });
      layouts++;
    }
    if (count) {
      await page
        .getByRole("button", {
          name: `Abrir ${books[order[count - 1] - 1].title}`,
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Ler sinopse", exact: true })
        .click();
      assert.equal(
        await page.locator(".book-synopsis p").innerText(),
        books[order[count - 1] - 1].synopsis,
      );
      await page.keyboard.press("Escape");
      await page.locator(".book-viewer").waitFor({ state: "detached" });
    }
    assert.deepEqual(
      JSON.parse(
        (await page.evaluate(() => localStorage.getItem("viva-progress-v1"))) ||
          "{}",
      ).order,
      saved.order,
    );
  }
  await page.setViewportSize({ width: 393, height: 852 });
  let random = 9123;
  const rng = () => {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    return random / 4294967296;
  };
  const legacyBoard = createBoard(rng);
  const oldSession = {
    version: 2,
    campaign: order.join(","),
    completedCount: 8,
    stage: 9,
    endless: false,
    difficulty: "easy",
    phase: "game",
    snapshot: {
      board: legacyBoard,
      remaining: 17,
      counts: [1, 2, 3, 4, 5, 6],
      powers: 0,
      cascades: 1,
      round: 1,
    },
  };
  await seed(8, oldSession);
  await page.locator(".board").waitFor();
  assert.equal(await page.locator(".moves strong").innerText(), "17");
  assert.deepEqual(
    await tiles(),
    legacyBoard.map((t) => ({ kind: t.kind, special: t.special || null })),
  );
  assert.ok(
    (await page.locator('[data-objective-kind="0"]').innerText()).includes(
      "20",
    ),
  );
  assert.ok(
    (await page.locator(".game-header").innerText()).includes("Tatuagens"),
  );
  assert.ok(!(await page.locator("body").innerText()).includes("Cinema"));
  await seed(8);
  await page.locator(".hub-actions .primary").click();
  await page.locator(".stage-intro").waitFor();
  assert.equal(
    await page.locator(".intro-editorial > p").innerText(),
    stories[8],
  );
  assert.ok(
    (await page.locator(".stage-intro").getAttribute("style"))!.includes(
      "scenes/tattoo-studio",
    ),
  );
  await page.screenshot({
    path: `test-results/campaign-${engine}-tattoo-intro.png`,
  });
  await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  await page.locator(".tile").first().waitFor();
  assert.equal(await page.locator(".test-complete").count(), 0);
  assert.equal(await page.locator(".tile").count(), 56);
  assert.equal(new Set((await tiles()).map((t) => t.kind)).size, 7);
  assert.equal(await page.locator(".moves strong").innerText(), "58");
  await page.screenshot({
    path: `test-results/campaign-${engine}-tattoo-board.png`,
  });
  await step();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("viva-session-v1")!),
  );
  assert.equal(stored.version, 2);
  assert.equal(stored.snapshot.counts.length, 7);
  await page.reload();
  await page.locator(".board").waitFor();
  assert.deepEqual(
    await tiles(),
    stored.snapshot.board.map((t: any) => ({
      kind: t.kind,
      special: t.special || null,
    })),
  );
  assert.equal(await page.locator(".moves strong").innerText(), "57");
  if (engine === "chromium") {
    await context.setOffline(true);
    await page.reload();
    await page.locator(".board").waitFor();
    assert.deepEqual(
      await tiles(),
      stored.snapshot.board.map((t: any) => ({
        kind: t.kind,
        special: t.special || null,
      })),
    );
    await context.setOffline(false);
  }
  const lose = {
    ...oldSession,
    snapshot: {
      ...oldSession.snapshot,
      board: createBoard(rng, levels[8].rules),
      remaining: 1,
      counts: Array(7).fill(0),
      cascades: 0,
    },
  };
  await seed(8, lose);
  await page.locator(".board").waitFor();
  await step();
  await page
    .getByRole("button", { name: "Recomeçar fase", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector(".moves strong")?.textContent === "58",
  );
  // The separate QA build has the requested shortcut; use the complete real reward/reveal flow.
  const qa = await context.newPage();
  qa.on("pageerror", (e) => errors.push(e.message));
  await qa.goto("http://127.0.0.1:4177/viva-test/");
  await qa
    .getByRole("button", { name: "Entrar na biblioteca", exact: true })
    .click();
  let qaOrder: number[] = [];
  for (let stage = 1; stage <= 10; stage++) {
    await qa.locator(".hub-actions .primary").click();
    await qa.getByRole("button", { name: "Vamos lá!", exact: true }).click();
    await qa.locator(".tile").first().waitFor();
    await qa
      .getByRole("button", { name: "Concluir fase", exact: true })
      .evaluate((e: HTMLButtonElement) => {
        e.click();
        e.click();
      });
    if (
      await qa
        .getByRole("button", { name: "Descobrir meu livro", exact: true })
        .count()
    )
      await qa
        .getByRole("button", { name: "Descobrir meu livro", exact: true })
        .click();
    await qa.locator(".reward-book").waitFor();
    assert.equal(await qa.locator(".reward-synopsis").count(), 0);
    const p = await qa.evaluate(() =>
      JSON.parse(localStorage.getItem("viva-progress-v1")!),
    );
    assert.equal(p.completed.length, stage);
    if (!qaOrder.length) qaOrder = p.order;
    assert.deepEqual(p.order, qaOrder);
    assert.equal(
      await qa.locator(".reward h2").innerText(),
      books[qaOrder[stage - 1] - 1].title,
    );
    await qa
      .getByRole("button", { name: "Guardar na biblioteca", exact: true })
      .click();
    if (stage === 5 || stage === 10) {
      await qa.locator(".celebration .primary").waitFor();
      if (stage === 10)
        assert.equal(
          await qa.locator(".bruno-signature").textContent(),
          BRUNO_SIGNATURE,
        );
      await qa.locator(".celebration .primary").click();
    }
    await qa.locator(".library-room").waitFor();
    assert.equal(await qa.locator(".shelf-books button").count(), stage);
    assert.equal(await qa.locator(".blade").count(), stage >= 5 ? 1 : 0);
    assert.equal(
      await qa.locator(".family-frame").count(),
      stage === 10 ? 1 : 0,
    );
  }
  await qa.reload();
  await qa.locator(".library-room").waitFor();
  assert.equal(await qa.locator(".celebration").count(), 0);
  await qa.getByRole("button", { name: "Modo infinito", exact: true }).click();
  await qa.locator(".board").waitFor();
  assert.equal(await qa.locator(".test-complete").count(), 0);
  assert.deepEqual(errors, []);
  const report = {
    engine,
    layouts,
    sevenTattooKinds: true,
    cleanSessionPreserved: true,
    newSessionRoundTrip: true,
    rewardSynopsisSeparated: true,
    booksAndHitAreas: true,
    tenStageQaNavigation: true,
    milestonesPreserved: true,
    endless: true,
    offline: engine === "chromium",
    errors,
  };
  await writeFile(
    `test-results/campaign-app-${engine}-report.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (error) {
  await page
    .screenshot({ path: `test-results/campaign-app-${engine}-failure.png` })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
