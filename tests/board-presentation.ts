import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  fresh,
  complete,
  finishMilestone,
  acceptMilestoneBook,
} from "../src/progress";
import { createBoard } from "../src/engine";
import { levels } from "../src/config";
import { balancedLevel } from "../src/difficulty";
import { newObstacles, obstacleSpec } from "../src/obstacles";
const before = process.env.BOARD_BEFORE === "true",
  engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  reducedMotion: "reduce",
});
await context.addInitScript(
  `globalThis.__name=fn=>fn;const f=sessionStorage.getItem('board-fixture');if(f){const v=JSON.parse(f);localStorage.setItem('viva-progress-v1',JSON.stringify(v.p));localStorage.setItem('viva-session-v1',JSON.stringify(v.session));localStorage.removeItem('viva-test-mode-v1');sessionStorage.removeItem('board-fixture');}`,
);
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const folder = "test-results/board-redesign";
await mkdir(folder, { recursive: true });
const art = JSON.parse(await readFile(`${folder}/art-metrics.json`, "utf8"));
const baseline = before
  ? null
  : await readFile(`${folder}/before-${engine}.json`, "utf8")
      .then(JSON.parse)
      .catch((error) => {
        if (error.code !== "ENOENT") throw error;
        return null;
      });
const results: any[] = [];
try {
  await page.goto(
    process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
  );
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [430, 932],
  ])
    for (let stage = 1; stage <= 10; stage++) {
      let p = fresh(() => 0.43);
      for (let i = 1; i < stage; i++)
        p = finishMilestone(acceptMilestoneBook(complete(p, i)));
      const level = balancedLevel(levels[stage - 1], "easy"),
        spec = obstacleSpec(level, "easy");
      let seed = stage * 837;
      const rng = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const setup = newObstacles(createBoard(rng, level.rules), spec, rng);
      const session = {
        version: 2,
        campaign: p.order.join(","),
        completedCount: stage - 1,
        stage,
        endless: false,
        difficulty: "easy",
        phase: "game",
        snapshot: {
          board: setup.board,
          remaining: level.moves,
          counts: Array(stage === 9 ? 7 : 6).fill(0),
          powers: 0,
          cascades: 0,
          round: 1,
          ...(spec ? { obstacles: setup.state } : {}),
        },
      };
      await page.setViewportSize({ width, height });
      await page.evaluate(
        (v) => sessionStorage.setItem("board-fixture", JSON.stringify(v)),
        { p, session },
      );
      await page.reload();
      await page.locator(".board").waitFor();
      await page
        .locator(".tile img")
        .evaluateAll((imgs) =>
          Promise.all(imgs.map((i) => (i as HTMLImageElement).decode())),
        );
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.locator(".tile").evaluateAll((tiles) =>
        tiles.map((el) => {
          const img = el.querySelector("img")!,
            s = getComputedStyle(el);
          const rect = (e: Element) => {
            const r = e.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          };
          return {
            kind: Number((el as HTMLElement).dataset.kind),
            role: (el as HTMLElement).dataset.role || null,
            rect: rect(el),
            image: rect(img),
            background: s.backgroundColor,
            backgroundImage: s.backgroundImage,
            border: s.borderWidth,
            shadow: s.boxShadow,
            outline: s.outlineStyle,
          };
        }),
      );
      const board = (await page.locator(".board-wrap").boundingBox())!;
      assert.ok(board.y >= 0 && board.y + board.height <= height + 0.5);
      assert.equal(await page.locator(".tile").count(), 56);
      assert.equal(await page.locator(".test-complete").count(), 0);
      let minGrowth = Infinity,
        minFill = Infinity,
        maxFill = 0;
      for (let i = 0; i < metrics.length; i++) {
        const m = metrics[i];
        if (m.role) continue;
        const box = art[`${stage}-${m.kind}`].bounds;
        const size = Math.min(m.image.width, m.image.height),
          scale = size / 160;
        const bounds = {
          x: m.image.x + (m.image.width - size) / 2 + box[0] * scale,
          y: m.image.y + (m.image.height - size) / 2 + box[1] * scale,
          width: (box[2] - box[0]) * scale,
          height: (box[3] - box[1]) * scale,
        };
        const fill =
          Math.max(bounds.width, bounds.height) /
          Math.min(m.rect.width, m.rect.height);
        minFill = Math.min(minFill, fill);
        maxFill = Math.max(maxFill, fill);
        if (!before) {
          assert.equal(m.background, "rgba(0, 0, 0, 0)");
          assert.equal(m.backgroundImage, "none");
          assert.equal(m.border, "0px");
          assert.equal(m.shadow, "none");
          const old = baseline?.results.find(
            (r: any) => r.width === width && r.stage === stage,
          )?.tiles[i];
          if (old) {
            for (const k of ["x", "y", "width", "height"])
              assert.ok(
                Math.abs((m.rect as any)[k] - old.rect[k]) <= 0.5,
                JSON.stringify({ stage, width, i, m, old }),
              );
            const oldSize = Math.min(old.image.width, old.image.height);
            minGrowth = Math.min(minGrowth, size / oldSize);
          }
          assert.ok(
            bounds.x >= m.rect.x - 0.3 &&
              bounds.y >= m.rect.y - 0.3 &&
              bounds.x + bounds.width <= m.rect.x + m.rect.width + 0.3 &&
              bounds.y + bounds.height <= m.rect.y + m.rect.height + 0.3,
            JSON.stringify({ stage, width, i, bounds, tile: m.rect }),
          );
          assert.ok(
            fill >= 0.82 && fill <= 0.9,
            JSON.stringify({ stage, kind: m.kind, fill }),
          );
        }
      }
      if (!before && baseline)
        assert.ok(
          minGrowth >= 1.06,
          JSON.stringify({ stage, width, minGrowth }),
        );
      if (width === 390 && [1, 3, 4, 5, 9, 10].includes(stage))
        await page.screenshot({
          path: `${folder}/${before ? "before" : "after"}-${engine}-${stage}.png`,
        });
      results.push({
        stage,
        width,
        height,
        board,
        minGrowth: before || !baseline ? null : minGrowth,
        minFill,
        maxFill,
        tiles: metrics,
      });
      console.log(
        before ? "before" : engine,
        stage,
        width,
        minFill.toFixed(3),
        maxFill.toFixed(3),
      );
    }
  const critical = errors.filter(
    (e) => !e.endsWith("/sw.js due to access control checks."),
  );
  assert.deepEqual(critical, []);
  await writeFile(
    `${folder}/${before ? "before" : "after"}-${engine}.json`,
    JSON.stringify(
      {
        engine,
        before,
        comparedWithBaseline: !!baseline,
        results,
        errors: critical,
        realIPhone: false,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
