import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import {
  swap,
  matches,
  resolveWave,
  fall,
  ensurePlayable,
  validSwap,
  type Board,
} from "../src/engine";
import { scenario, powerPairs } from "./vfx-scenarios";

const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium"
    ? { channel: process.env.BROWSER_CHANNEL || "msedge" }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "no-preference",
});
const page = await context.newPage(),
  errors: string[] = [],
  results: any[] = [];
await page.addInitScript(() => {
  (window as any).__objectivePulses = [];
  const evidence = ((window as any).__fxEvidence = {
    first: null as any,
    painted: false,
    invalid: false,
    invalidAnimating: false,
  });
  let sampling = false;
  const observer = new MutationObserver(() => {
    if (document.querySelectorAll(".tile.invalid").length === 2)
      evidence.invalid = true;
    if (!evidence.first && document.querySelector(".tile.clearing"))
      evidence.first = {
        types: (
          document.querySelector<HTMLElement>(".game-vfx")?.dataset
            .effectTypes || ""
        )
          .split(",")
          .filter(Boolean),
        tier: document.querySelector(".match-aura")?.className,
      };
    const c = document.querySelector<HTMLCanvasElement>(".game-vfx");
    if (!sampling && !evidence.painted && c?.dataset.running === "true") {
      sampling = true;
      let tries = 0;
      const sampler = {
        run() {
          evidence.painted = c
            .getContext("2d")!
            .getImageData(0, 0, c.width, c.height)
            .data.some((n, i) => i % 4 === 3 && n > 0);
          if (!evidence.painted && ++tries < 16)
            requestAnimationFrame(() => sampler.run());
        },
      };
      requestAnimationFrame(() => sampler.run());
    }
  });
  observer.observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "data-running"],
  });
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (frames, options) {
    if (
      this.classList.contains("tile") &&
      typeof options === "object" &&
      options?.duration === 330
    )
      evidence.invalidAnimating = true;
    if (this.hasAttribute("data-objective-kind"))
      (window as any).__objectivePulses.push(
        this.getAttribute("data-objective-kind"),
      );
    return animate.call(this, frames, options);
  };
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await mkdir("test-results", { recursive: true });
const base = "http://127.0.0.1:4175/tests/vfx-game.html";
const initial = (mode: string) => scenario(mode).board;
const state = (b: Board) =>
  b.map((t) => ({ kind: t.kind, special: t.special || null }));
function simulate(mode: string, seed: number) {
  const rng = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const { from: a, to: b } = scenario(mode);
  let board = swap(initial(mode), a, b),
    active = [a, b].filter((i) => board[i].special),
    depth = 0,
    powers = 0;
  const counts = [0, 0, 0, 0, 0, 0],
    first = resolveWave(
      board,
      b,
      active,
      board[a].special === "color"
        ? board[b].kind
        : board[b].special === "color"
          ? board[a].kind
          : undefined,
    );
  const color =
    board[a].special === "color"
      ? board[b].kind
      : board[b].special === "color"
        ? board[a].kind
        : undefined;
  while (matches(board).length || active.length) {
    const w = resolveWave(board, b, active, active.length ? color : undefined);
    active = [];
    powers += w.powers;
    w.collected.forEach((n, i) => (counts[i] += n));
    board = fall(w.board, w.clear, rng);
    assert.ok(++depth < 80);
  }
  return {
    board: state(ensurePlayable(board, rng)),
    counts,
    powers,
    cascades: depth - 1,
    first,
  };
}
let cascadeSeed = 0;
for (let attempt = 1; attempt <= 20000; attempt++) {
  const candidate = Math.imul(attempt, 2654435761) >>> 0;
  if (simulate("cascade", candidate).cascades >= 2) {
    cascadeSeed = candidate;
    break;
  }
}
assert.ok(
  cascadeSeed,
  "a deterministic sequence of at least three waves exists",
);
async function load(mode: string, seed = 837, reduced = false) {
  await page.emulateMedia({
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  await page.goto(`${base}?type=${mode}&seed=${seed}`);
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".tile").length === 56 &&
      !!(window as any).__vfxSnapshot,
  );
  await page
    .locator(".tile img")
    .evaluateAll((imgs) =>
      Promise.all(imgs.map((img) => (img as HTMLImageElement).decode())),
    );
  await page.waitForTimeout(reduced ? 50 : 420);
}
async function play(mode: string) {
  const { from, to } = scenario(mode);
  await page.locator(".tile").nth(from).click();
  await page.locator(".tile").nth(to).click();
}
async function settled() {
  await page.waitForFunction(
    () =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "false" &&
      (window as any).__vfxSnapshot?.remaining === 99,
    undefined,
    { timeout: 30000 },
  );
  return page.evaluate(() => {
    const s = (window as any).__vfxSnapshot;
    return {
      board: s.board.map((t: any) => ({
        kind: t.kind,
        special: t.special || null,
      })),
      counts: s.counts,
      powers: s.powers,
      cascades: s.cascades,
      remaining: s.remaining,
    };
  });
}
try {
  await load("3");
  const before = await page.evaluate(() => (window as any).__vfxSnapshot);
  await page.getByRole("button", { name: "Uma dica", exact: true }).click();
  await page.locator(".tile.hint").first().waitFor();
  assert.ok(
    await page
      .locator(".tile.hint img")
      .first()
      .evaluate((e) => getComputedStyle(e).filter.includes("drop-shadow")),
  );
  assert.equal(
    await page
      .locator(".tile.hint")
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundColor),
    "rgba(0, 0, 0, 0)",
  );
  await page.screenshot({
    path: `test-results/board-redesign/hint-${engine}.png`,
  });
  assert.equal(validSwap(initial("3"), 0, 1), false);
  await page.locator(".tile").nth(0).click();
  await page.waitForTimeout(190);
  assert.equal(
    await page
      .locator(".tile.selected")
      .evaluate((e) => getComputedStyle(e).backgroundImage),
    "none",
  );
  assert.equal(
    await page
      .locator(".tile.selected")
      .evaluate((e) => getComputedStyle(e).boxShadow),
    "none",
  );
  assert.ok(
    await page
      .locator(".tile.selected img")
      .evaluate((e) => getComputedStyle(e).filter.includes("drop-shadow")),
  );
  await page.screenshot({
    path: `test-results/board-redesign/selected-${engine}.png`,
  });
  assert.notEqual(
    await page
      .locator(".tile.selected .tile-visual")
      .evaluate((el) => getComputedStyle(el).transform),
    "none",
  );
  await page.locator(".tile").nth(1).click();
  await page.waitForFunction(() => (window as any).__fxEvidence.invalid);
  assert.ok(
    await page.evaluate(() => (window as any).__fxEvidence.invalidAnimating),
  );
  await page.screenshot({ path: `test-results/vfx-${engine}-invalid.png` });
  await page.waitForFunction(
    () =>
      document.querySelector(".board")?.getAttribute("aria-busy") === "false",
  );
  assert.deepEqual(
    await page.evaluate(() => (window as any).__vfxSnapshot),
    before,
  );
  assert.equal(
    await page
      .locator(".tile.invalid,.tile.selected,.tile.pressed,.tile.hint")
      .count(),
    0,
  );
  for (const mode of [
    "3",
    "4",
    "5",
    "row",
    "column",
    "area",
    "color",
    "combined",
    "cascade",
    "vertical4",
    "intersection",
    ...powerPairs,
  ]) {
    const seed = mode === "cascade" ? cascadeSeed : 837,
      expected = simulate(mode, seed);
    await load(mode, seed);
    await play(mode);
    await page.waitForFunction(
      () =>
        (window as any).__fxEvidence.first &&
        (window as any).__fxEvidence.painted,
    );
    const evidence = await page.evaluate(() => (window as any).__fxEvidence);
    const effectTypes = evidence.first.types;
    assert.deepEqual(
      effectTypes,
      expected.first.effects.slice(0, 6).map((e) => e.type),
    );
    if (["3", "4", "5"].includes(mode))
      assert.equal(evidence.first.tier.includes(`match-tier-${mode}`), true);
    const active = await page
      .locator(".game-vfx")
      .evaluate((c: HTMLCanvasElement) => ({
        ...c.dataset,
        pixels: (window as any).__fxEvidence.painted,
      }));
    assert.equal(active.pixels, true, `${mode} paints particles`);
    assert.ok(Number(active.peak) <= 180 && Number(active.peak) > 0);
    assert.equal(active.budget, "180");
    await page.screenshot({ path: `test-results/vfx-${engine}-${mode}.png` });
    const actual = await settled();
    assert.deepEqual(
      actual,
      {
        board: expected.board,
        counts: expected.counts,
        powers: expected.powers,
        cascades: expected.cascades,
        remaining: 99,
      },
      `${mode} follows the pure engine exactly`,
    );
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLElement>(".game-vfx")?.dataset.running ===
        "false",
    );
    const stats = await page
      .locator(".game-vfx")
      .evaluate((el) => ({ ...(el as HTMLElement).dataset }));
    if (expected.counts[0] > 0)
      assert.ok(
        await page.evaluate(() =>
          (window as any).__objectivePulses.includes("0"),
        ),
        `${mode}: objective receives the flight and pulses`,
      );
    // Replaying the same inputs without motion must produce the identical board and counters.
    await load(mode, seed, true);
    await play(mode);
    assert.deepEqual(
      await settled(),
      actual,
      `${mode}: motion cannot change gameplay randomness`,
    );
    assert.equal(
      await page
        .locator(".game-vfx")
        .evaluate((el) => getComputedStyle(el).display),
      "none",
    );
    assert.equal(
      await page.locator(".game-vfx").getAttribute("data-emissions"),
      null,
    );
    results.push({
      mode,
      waves: actual.cascades + 1,
      powers: actual.powers,
      ...stats,
    });
    console.log(
      `${engine}: ${mode}, ${actual.cascades + 1} waves, matches engine with/without motion`,
    );
  }
  await load("color");
  await play("color");
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>(".game-vfx")?.dataset.running ===
      "true",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>(".game-vfx")?.dataset.running ===
      "false",
  );
  await settled();
  assert.equal(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) =>
            (a.effect as KeyframeEffect)?.target?.classList.contains("tile"),
          ).length,
    ),
    0,
  );
  await load("cascade", cascadeSeed);
  await play("cascade");
  await page.waitForFunction(() => (window as any).__fxEvidence.first);
  await page.evaluate(() => {
    const until = performance.now() + 420;
    while (performance.now() < until) {
      /* Simulate one slow main-thread frame. */
    }
  });
  await settled();
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>(".game-vfx")?.dataset.running ===
      "false",
  );
  assert.ok(
    await page.evaluate(() => (window as any).__objectivePulses.includes("0")),
    "objective flights survive a slow frame between cascades",
  );
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await load("row");
    const from = await page.locator(".tile").nth(24).boundingBox(),
      to = await page.locator(".tile").nth(25).boundingBox();
    assert.ok(from && to);
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
      steps: 5,
    });
    await page.mouse.up();
    await page.waitForFunction(() => (window as any).__fxEvidence.first);
    await page.screenshot({
      path: `test-results/vfx-${engine}-${viewport.width}x${viewport.height}.png`,
    });
    await settled();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await load("win");
  await play("win");
  await page.locator(".victory-shine").waitFor({ timeout: 20000 });
  assert.equal(await page.locator(".objectives .done").count(), 1);
  await page.waitForTimeout(1200);
  assert.equal(
    await page.locator(".board").count(),
    1,
    "victory preserves contemplation",
  );
  await page.screenshot({ path: `test-results/vfx-${engine}-victory.png` });
  await page.getByRole("heading", { name: "Vitória verificada" }).waitFor();
  const retina = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const retinaPage = await retina.newPage();
  retinaPage.on("pageerror", (e) => errors.push(e.message));
  await retinaPage.goto(`${base}?type=combined`);
  await retinaPage.waitForFunction(
    () => !!document.querySelector<HTMLCanvasElement>(".game-vfx")?.width,
  );
  const density = await retinaPage
    .locator(".game-vfx")
    .evaluate((c: HTMLCanvasElement) => ({
      width: c.width,
      height: c.height,
      cssWidth: c.clientWidth,
      cssHeight: c.clientHeight,
      dpr: devicePixelRatio,
    }));
  assert.equal(density.dpr, 3);
  assert.equal(density.width, Math.round(density.cssWidth * 1.75));
  assert.equal(density.height, Math.round(density.cssHeight * 1.75));
  await retina.close();
  assert.deepEqual(errors, []);
  await writeFile(
    `test-results/vfx-${engine}-report.json`,
    JSON.stringify(
      {
        engine,
        cascadeSeed,
        results,
        invalidPreservesMove: true,
        liveReducedMotion: true,
        slowFrame: true,
        dragIncludingRotatedScreen: true,
        retinaDensityCapped: true,
        viewports: 4,
        victoryContemplation: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `${engine}: invalid moves, all powers, repeated cascades, reduced motion, mobile sizes and victory passed.`,
  );
} catch (error) {
  await page
    .screenshot({ path: `test-results/vfx-${engine}-failure.png` })
    .catch(() => {});
  console.log(
    await page.evaluate(() => ({
      url: location.href,
      snapshot: (window as any).__vfxSnapshot,
      busy: document.querySelector(".board")?.getAttribute("aria-busy"),
      selected: document
        .querySelector(".tile.selected")
        ?.getAttribute("aria-label"),
      message: document.querySelector(".game-message")?.textContent,
      evidence: (window as any).__fxEvidence,
      canvas: { ...document.querySelector<HTMLElement>(".game-vfx")?.dataset },
    })),
  );
  console.log(errors);
  throw error;
} finally {
  await browser.close();
}
