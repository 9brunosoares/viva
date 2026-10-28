import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { levels, books } from "../src/config";
import { balancedLevel, type Difficulty } from "../src/difficulty";
import { moves, swap, resolveWave, type Board } from "../src/engine";
import { obstacleMoveScore, type ObstacleState } from "../src/obstacles";
const browser = await chromium.launch({ headless: true, channel: "msedge" }),
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
await context.addInitScript(
  "globalThis.__name=fn=>fn;let seed=38259;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}",
);
await context.addInitScript(`window.__ceremonyStarts=[];
const Audio=window.AudioContext||window.webkitAudioContext;
if(Audio){const create=Audio.prototype.createOscillator;Audio.prototype.createOscillator=function(...args){const osc=create.apply(this,args),start=osc.start;osc.start=function(...times){const c=document.querySelector('.celebration');if(c)window.__ceremonyStarts.push(c.classList.contains('celebration-blade')?'blade':'family');return start.apply(this,times)};return osc;};}`);
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const results: any[] = [];
await mkdir("test-results/premium6", { recursive: true });
async function play(stage: number, mode: Difficulty = "easy") {
  const level = balancedLevel(levels[stage - 1], mode);
  let turns = 0,
    restarts = 0;
  await page.locator(".tile").first().waitFor();
  await page.screenshot({
    path: `test-results/premium6/play-${stage}-${mode}.png`,
  });
  while (await page.locator(".game-screen").count()) {
    if (await page.locator(".game-menu").count()) {
      if (++restarts > 3) throw Error(`stage ${stage} failed repeatedly`);
      await page
        .getByRole("button", { name: "Recomeçar fase", exact: true })
        .click();
    }
    await page.waitForFunction(
      () =>
        document.querySelector(".game-screen")?.getAttribute("data-phase") ===
          "idle" || !document.querySelector(".game-screen"),
    );
    if (!(await page.locator(".board").count())) break;
    const snapshot = await page.evaluate(
      () => JSON.parse(localStorage.getItem("viva-session-v1")!).snapshot,
    );
    const board = snapshot.board as Board,
      counts = snapshot.counts as number[];
    const choices = moves(board)
      .map(([a, b]) => {
        const next = swap(board, a, b),
          active = [a, b].filter((i) => next[i].special),
          colorKind =
            next[a].special === "color"
              ? next[b].kind
              : next[b].special === "color"
                ? next[a].kind
                : undefined,
          w = resolveWave(next, b, active, colorKind, level.rules);
        return {
          a,
          b,
          score:
            obstacleMoveScore(
              next,
              new Set([...w.clear, ...(w.giftHits ?? [])]),
              snapshot.obstacles,
            ) +
            level.targets.reduce(
              (sum, t) =>
                sum +
                Math.min(
                  Math.max(0, t.amount - counts[t.kind]),
                  w.collected[t.kind],
                ) *
                  2,
              0,
            ) +
            w.clear.length +
            w.created.length * 14 +
            w.powers * 5,
        };
      })
      .sort((a, b) => b.score - a.score);
    assert.ok(choices.length);
    const { a, b } = choices[0],
      before = snapshot.remaining;
    await page.locator(".tile").nth(a).click();
    await page.locator(".tile").nth(b).click();
    turns++;
    await page.waitForFunction(
      (n) =>
        !document.querySelector(".game-screen") ||
        document.querySelector(".game-screen")?.getAttribute("data-phase") ===
          "completing" ||
        document.querySelector(".game-menu") ||
        (document.querySelector(".game-screen")?.getAttribute("data-phase") ===
          "idle" &&
          Number(document.querySelector(".moves strong")?.textContent) !== n),
      before,
    );
    if (await page.locator(".victory-word").count()) {
      const saved = await page.evaluate(
        () => JSON.parse(localStorage.getItem("viva-session-v1")!).snapshot,
      );
      assert.equal(saved.won, true);
      assert.ok(saved.board.every((t: any) => t.kind >= 0 || t.role));
      await page.screenshot({
        path: `test-results/premium6/win-${stage}-${mode}.png`,
      });
      await page.locator(".reward").waitFor();
      break;
    }
    if (turns > 200) throw Error("turn guard");
  }
  results.push({ stage, mode, turns, restarts });
}
try {
  await page.goto("http://127.0.0.1:4173/viva-test/");
  await page
    .getByRole("button", { name: "Entrar na biblioteca", exact: true })
    .click();
  let order: number[] = [];
  for (let stage = 1; stage <= 10; stage++) {
    await page.locator(".hub-actions .primary").click();
    await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
    await play(stage);
    if (
      await page
        .getByRole("button", { name: "Descobrir meu livro", exact: true })
        .count()
    )
      await page
        .getByRole("button", { name: "Descobrir meu livro", exact: true })
        .click();
    await page.locator(".reward-book").waitFor();
    const p = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("viva-progress-v1")!),
    );
    assert.equal(p.completed.length, stage);
    if (!order.length) order = p.order;
    assert.deepEqual(p.order, order);
    assert.equal(
      await page.locator(".reward h2").innerText(),
      books[order[stage - 1] - 1].title,
    );
    assert.equal(await page.locator(".reward-synopsis").count(), 0);
    await page
      .getByRole("button", { name: "Guardar na biblioteca", exact: true })
      .click();
    if (stage === 5) {
      await page.locator('.celebration-blade[data-art-ready="true"]').waitFor();
      const sprite = await page
        .locator(".celebration-art img")
        .evaluate((img: HTMLImageElement) => {
          const r = img.getBoundingClientRect();
          return {
            loaded: img.complete && img.naturalWidth > 0,
            width: r.width,
            height: r.height,
            display: getComputedStyle(img.parentElement!).display,
            visibility: getComputedStyle(img.parentElement!).visibility,
          };
        });
      assert.ok(
        sprite.loaded &&
          sprite.width > 280 &&
          sprite.height > 200 &&
          sprite.display !== "none" &&
          sprite.visibility === "visible",
      );
      assert.equal(
        await page.locator("#celebration-title").textContent(),
        "O Blade chegou!",
      );
      assert.equal(
        await page.getByRole("button", { name: "Ouvir", exact: true }).count(),
        0,
      );
      await page.screenshot({
        path: "test-results/interface-blade/blade-after-real-win.png",
      });
    }
    if (stage === 5 || stage === 10) {
      await page.waitForFunction(
        (kind) => (window as any).__ceremonyStarts.includes(kind),
        stage === 5 ? "blade" : "family",
      );
      await page.locator(".celebration .primary").click();
    }
    await page.locator(".hub-actions").waitFor();
    console.log(`Real Easy stage ${stage}:`, results.at(-1));
  }
  // Targeted real-play sessions in Medium and Hard, using the approved map.
  for (const [stage, mode] of [
    [4, "medium"],
    [9, "hard"],
  ] as const) {
    await page.evaluate(
      (mode) => localStorage.setItem("viva-difficulty-v1", mode),
      mode,
    );
    await page.reload();
    await page.getByRole("button", { name: "Ver fases", exact: false }).click();
    await page
      .locator(".level-card")
      .nth(stage - 1)
      .click();
    if (await page.locator(".stage-intro").count())
      await page
        .getByRole("button", { name: "Vamos lá!", exact: true })
        .click();
    await play(stage, mode);
    await page
      .getByRole("button", { name: "Voltar à biblioteca", exact: true })
      .click();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    "test-results/premium6/journey-report.json",
    JSON.stringify(
      {
        results,
        errors,
        usedSkipButton: false,
        bladeVisibleAfterRealWin: true,
        ceremonyAudioStartedWithoutListenButton: true,
        physicalDevice: false,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results));
} catch (e) {
  await page
    .screenshot({ path: "test-results/premium6/journey-failure.png" })
    .catch(() => {});
  throw e;
} finally {
  await browser.close();
}
