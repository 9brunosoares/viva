import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fresh } from "../src/progress";
import { levels } from "../src/config";
import { swap, resolveWave, matches, fall } from "../src/engine";
import { scenario } from "./vfx-scenarios";
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
await context.addInitScript(
  `globalThis.__name=fn=>fn;try{let seed=Number(localStorage.getItem('interface-seed')||837);Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}catch{}`,
);
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
function simulation(seed: number) {
  const rng = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const s = scenario("cascade");
  let b = swap(s.board, s.from, s.to),
    depth = 0,
    first = 0,
    total = 0;
  while (matches(b).length) {
    const w = resolveWave(b, s.to, [], undefined, levels[0].rules);
    if (depth === 0) first = w.collected[0];
    total += w.collected[0];
    b = fall(w.board, w.clear, rng, levels[0].rules);
    if (++depth > 30) break;
  }
  return { depth, first, total };
}
let cascadeSeed = 0,
  cascadeNeed = 0;
for (let seed = 1; seed < 20000; seed++) {
  const r = simulation(seed);
  if (r.depth >= 3 && r.total > r.first && r.total <= 16) {
    cascadeSeed = seed;
    cascadeNeed = r.total;
    break;
  }
}
assert.ok(cascadeSeed);
const p = fresh(() => 0.43),
  results: any[] = [];
await mkdir("test-results/interface-blade", { recursive: true });
try {
  await page.goto("http://127.0.0.1:4173/viva-test/");
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [430, 932],
  ])
    for (const reduced of [false, true])
      for (const mode of ["win", "cascade", "row"])
        for (const remaining of [1, 20]) {
          await page.setViewportSize({ width, height });
          await page.emulateMedia({
            reducedMotion: reduced ? "reduce" : "no-preference",
          });
          const s = scenario(mode),
            seed = mode === "cascade" ? cascadeSeed : 837;
          const need =
            mode === "cascade" ? cascadeNeed : mode === "row" ? 1 : 3;
          const session = {
            version: 2,
            campaign: p.order.join(","),
            completedCount: 0,
            stage: 1,
            endless: false,
            difficulty: "easy",
            phase: "game",
            snapshot: {
              board: s.board,
              remaining,
              counts: [16 - need, 16, 0, 0, 0, 0],
              powers: 0,
              cascades: 0,
              round: 1,
            },
          };
          await page.evaluate(
            ({ p, session, seed }) => {
              localStorage.setItem("viva-progress-v1", JSON.stringify(p));
              localStorage.setItem("viva-session-v1", JSON.stringify(session));
              localStorage.setItem("interface-seed", String(seed));
            },
            { p, session, seed },
          );

          await page.reload();
          await page.locator(".board").waitFor();
          await page.evaluate(() => document.fonts.ready);
          await page.waitForFunction(
            () =>
              document
                .querySelector(".game-screen")
                ?.getAttribute("data-phase") === "idle",
          );
          // Seed immediately before play, after React's module initialization.
          await page.evaluate((seed) => {
            Math.random = () => {
              seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
              return seed / 4294967296;
            };
          }, seed);
          await page.evaluate(() => {
            const wrap = document.querySelector(".board-wrap")!;
            const rect = () => {
              const r = wrap.getBoundingClientRect();
              return { x: r.x, y: r.y, width: r.width, height: r.height };
            };
            const samples: any[] = [];
            (window as any).__geometry = {
              before: rect(),
              samples,
              running: true,
            };
            function capture() {
              const g = (window as any).__geometry;
              if (!g.running || !wrap.isConnected) return;
              samples.push({
                at: performance.now(),
                phase: document
                  .querySelector(".game-screen")
                  ?.getAttribute("data-phase"),
                ...rect(),
              });
            }
            const observer = new MutationObserver(capture);
            observer.observe(document.querySelector(".game-screen")!, {
              subtree: true,
              attributes: true,
              attributeFilter: ["data-phase", "aria-valuenow"],
            });
            (window as any).__geometry.observer = observer;
            function frame() {
              if (!(window as any).__geometry.running) return;
              capture();
              requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
          });
          if (remaining === 20 && mode === "win")
            await page.screenshot({
              path: `test-results/interface-blade/${engine}-before-victory-${width}-${reduced ? "reduced" : "motion"}.png`,
            });
          await page.locator(".tile").nth(s.from).click();
          await page.locator(".tile").nth(s.to).click();
          try {
            await page.locator(".victory-word").waitFor({ timeout: 10000 });
          } catch (error) {
            console.log({
              width,
              reduced,
              mode,
              remaining,
              seed,
              need,
              state: await page.evaluate(() => ({
                saved: localStorage.getItem("viva-session-v1"),
                phase: document
                  .querySelector(".game-screen")
                  ?.getAttribute("data-phase"),
                message: document.querySelector(".game-message")?.textContent,
              })),
            });
            throw error;
          }
          await page.waitForTimeout(650);

          const evidence = await page.evaluate(() => {
            const g = (window as any).__geometry;
            g.running = false;
            g.observer.disconnect();
            const phases = g.samples as any[];
            const completing = phases.filter((x) => x.phase === "completing");
            return {
              before: g.before,
              // Reduced motion may commit final resolution and victory together.
              afterResolution:
                phases.filter((x) => x.phase === "falling").at(-1) ??
                completing[0],
              entry: completing[0],
              during: completing.at(-1),
              samples: phases,
              snapshot: JSON.parse(localStorage.getItem("viva-session-v1")!)
                .snapshot,
            };
          });
          assert.ok(
            evidence.afterResolution && evidence.entry && evidence.during,
            JSON.stringify({ mode, width, reduced, evidence }),
          );
          assert.ok(evidence.snapshot.won);
          assert.equal(evidence.snapshot.remaining, remaining - 1);
          if (mode === "cascade")
            assert.ok(
              evidence.snapshot.cascades >= 2,
              JSON.stringify(evidence.snapshot),
            );
          const all = evidence.samples.filter(
            (s: any) => s.phase !== "transitioning",
          );
          const maxDelta = Object.fromEntries(
            ["x", "y", "width", "height"].map((k) => [
              k,
              Math.max(
                ...all.map((s: any) =>
                  Math.abs(s[k] - (evidence.before as any)[k]),
                ),
              ),
            ]),
          );
          if (Object.values(maxDelta).some((d) => d > 0.5))
            await writeFile(
              `test-results/interface-blade/geometry-failure-${engine}.json`,
              JSON.stringify(
                { mode, width, reduced, remaining, maxDelta, evidence },
                null,
                2,
              ),
            );
          assert.ok(
            Object.values(maxDelta).every((d) => d <= 0.5),
            JSON.stringify({
              mode,
              width,
              reduced,
              remaining,
              maxDelta,
              evidence,
            }),
          );
          if (remaining === 20 && mode === "win")
            await page.screenshot({
              path: `test-results/interface-blade/${engine}-victory-${width}-${reduced ? "reduced" : "motion"}.png`,
            });
          const { samples, snapshot, ...summary } = evidence;
          results.push({
            width,
            height,
            reduced,
            mode,
            remaining,
            ...summary,
            maxDelta,
            frames: samples.length,
            cascades: snapshot.cascades,
          });
          console.log(engine, width, reduced, mode, remaining, maxDelta);
        }
  const critical = errors.filter(
    (e) => !e.endsWith("/sw.js due to access control checks."),
  );
  assert.deepEqual(critical, []);
  await writeFile(
    `test-results/interface-blade/geometry-${engine}.json`,
    JSON.stringify(
      {
        engine,
        cases: results.length,
        tolerance: 0.5,
        cascadeSeed,
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
