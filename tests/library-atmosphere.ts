import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { waitForCache } from "./boardHelper";
import { bookPlacement } from "../src/libraryLayout";

const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const errors: string[] = [];
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
});
await context.addInitScript(
  "globalThis.__name=(fn)=>fn; Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>8})",
);
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const order = [1, 9, 8, 5, 2, 4, 10, 6, 3, 7];
async function enter() {
  if (await page.locator(".home").count())
    await page
      .getByRole("button", { name: "Entrar na biblioteca", exact: true })
      .click();
  await page.locator('.library-room[data-ambient="active"]').waitFor();
}
async function sample() {
  return page.locator(".library-atmosphere").evaluate((root) => ({
    rect: root.getBoundingClientRect().toJSON(),
    rays: [...root.querySelectorAll(".library-sunbeam")].map((e) => ({
      opacity: Number(getComputedStyle(e).opacity),
      state: getComputedStyle(e).animationPlayState,
      time: e.getAnimations()[0]?.currentTime,
    })),
    motes: [...root.querySelectorAll(".library-dust i")].map((e) => ({
      opacity: Number(getComputedStyle(e).opacity),
      rect: e.getBoundingClientRect().toJSON(),
      state: getComputedStyle(e).animationPlayState,
    })),
    animations: root
      .getAnimations({ subtree: true })
      .filter((a) => a.playState === "running").length,
  }));
}
try {
  await page.goto("http://127.0.0.1:4173/viva-test/?v=ambient-fix");
  await waitForCache(page);
  await enter();
  await page.waitForTimeout(1500);
  const start = await sample();
  assert.equal(start.rays.length, 3);
  assert.equal(start.motes.length, 8);
  assert.ok(start.animations >= 13);
  assert.ok(start.rays.every((r) => r.opacity > 0.4 && r.state === "running"));
  assert.ok(start.motes.some((m) => m.opacity > 0.35 && m.rect.width >= 2));
  await page.screenshot({ path: `test-results/ambient-${engine}-0s.png` });
  await page.waitForTimeout(4000);
  const middle = await sample();
  await page.screenshot({ path: `test-results/ambient-${engine}-4s.png` });
  assert.ok(
    start.rays.some(
      (r, i) => Math.abs(r.opacity - middle.rays[i].opacity) > 0.04,
    ),
  );
  assert.ok(
    start.motes.some((r, i) => Math.abs(r.rect.y - middle.motes[i].rect.y) > 3),
  );
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `test-results/ambient-${engine}-8s.png` });
  const end = await sample();
  assert.ok(
    end.rays.every(
      (r, i) => Number(r.time) > Number(start.rays[i].time) + 7000,
    ),
  );
  // An attention surface pauses every actual environmental animation, then resumes it.
  await page.locator(".audio-toggle").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".library-room")?.getAttribute("data-ambient") ===
      "paused",
  );
  await page.waitForTimeout(350);
  const paused = await sample();
  await page.waitForTimeout(350);
  const pausedAgain = await sample();
  assert.ok(
    paused.rays.every(
      (r, i) =>
        r.state === "paused" &&
        Math.abs(Number(r.time) - Number(pausedAgain.rays[i].time)) < 2,
    ),
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () =>
      document.querySelector(".library-room")?.getAttribute("data-ambient") ===
      "active",
  );
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
  await page.waitForTimeout(350);
  assert.equal((await sample()).animations, 0);
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
  // Four source illustrations, the real collection, and three phone aspect ratios.
  let layouts = 0;
  for (const [stage, count] of [
    [0, 0],
    [1, 2],
    [2, 5],
    [3, 8],
  ]) {
    await page.evaluate(
      ({ count, order }) => {
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
        localStorage.removeItem("viva-session-v1");
      },
      { count, order },
    );
    await page.reload();
    await enter();
    const saved = await page.evaluate(() =>
      localStorage.getItem("viva-progress-v1"),
    );
    for (const [width, height] of [
      [320, 568],
      [393, 852],
      [430, 932],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(
        (h) =>
          Math.abs(
            parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                "--vh",
              ),
            ) *
              100 -
              h,
          ) < 1,
        height,
      );
      assert.equal(
        await page.locator(".library-room").getAttribute("data-stage"),
        String(stage),
      );
      const geometry = await page.locator(".library-room").evaluate((e) => ({
        room: e.getBoundingClientRect().toJSON(),
        ambient: e
          .querySelector(".library-atmosphere")!
          .getBoundingClientRect()
          .toJSON(),
        pointer: getComputedStyle(e.querySelector(".library-atmosphere")!)
          .pointerEvents,
        overflows: document.documentElement.scrollHeight > innerHeight + 1,
      }));
      assert.equal(geometry.pointer, "none");
      assert.equal(geometry.overflows, false);
      assert.ok(
        Math.abs(geometry.room.width / geometry.room.height - 496 / 756) <
          0.001,
      );
      assert.deepEqual(geometry.room, geometry.ambient);
      const actual = await page
        .locator(".shelf-books button")
        .evaluateAll((els) =>
          els.map((e) => ({
            left: parseFloat((e as HTMLElement).style.left),
            bottom: parseFloat((e as HTMLElement).style.bottom),
          })),
        );
      actual.forEach((p, i) => {
        const expected = bookPlacement(stage, i, order[i]);
        assert.ok(Math.abs(p.left - expected.left) < 0.001);
        assert.ok(Math.abs(p.bottom - expected.bottom) < 0.001);
      });
      if (width === 393) {
        await page.waitForTimeout(1450);
        await page.screenshot({
          path: `test-results/ambient-${engine}-stage-${stage}.png`,
        });
      }
      layouts++;
    }
    assert.equal(
      await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
      saved,
    );
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () =>
      document.querySelector(".library-room")?.getAttribute("data-motion") ===
      "still",
  );
  assert.equal(await page.locator(".library-dust i").count(), 0);
  assert.equal((await sample()).animations, 0);
  assert.equal(await page.locator(".library-sunrays").count(), 1);
  await page.screenshot({ path: `test-results/ambient-${engine}-reduced.png` });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(
    () =>
      document.querySelector(".library-room")?.getAttribute("data-motion") ===
      "full",
  );
  assert.equal(await page.locator(".library-dust i").count(), 8);
  if (engine === "chromium") {
    await context.setOffline(true);
    await page.reload();
    await enter();
    assert.equal(await page.locator(".library-sunbeam").count(), 3);
    assert.ok((await sample()).animations >= 13);
    await context.setOffline(false);
  }
  const limited = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
  });
  await limited.addInitScript(
    "Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>2})",
  );
  const low = await limited.newPage();
  low.on("pageerror", (e) => errors.push(e.message));
  await low.goto("http://127.0.0.1:4173/viva-test/");
  await low
    .getByRole("button", { name: "Entrar na biblioteca", exact: true })
    .click();
  await low.locator(".library-room").waitFor();
  assert.equal(
    await low.locator(".library-room").getAttribute("data-motion"),
    "limited",
  );
  assert.equal(await low.locator(".library-dust i").count(), 3);
  const lowStart = await low
    .locator(".library-dust i")
    .first()
    .evaluate((e) => getComputedStyle(e).transform);
  await low.waitForTimeout(1800);
  assert.notEqual(
    await low
      .locator(".library-dust i")
      .first()
      .evaluate((e) => getComputedStyle(e).transform),
    lowStart,
  );
  assert.notEqual(
    await low
      .locator(".library-window-light")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  assert.notEqual(
    await low
      .locator(".library-sunbeam-1")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  await low.screenshot({ path: `test-results/ambient-${engine}-limited.png` });
  await limited.close();
  // Inspector controls act on the very same component; never part of the release bundle.
  const diagnostic = await context.newPage();
  await diagnostic.goto("http://127.0.0.1:4175/tests/library-ambient.html");
  await diagnostic.locator(".library-sunrays").waitFor();
  for (const [label, visible, hidden] of [
    ["Raios", ".library-sunrays", ".library-dust"],
    ["Poeira", ".library-dust", ".library-light-entry"],
    ["Luz", ".library-window-light", ".library-sunrays"],
    ["Reflexo", ".library-curtain-light", ".library-dust"],
  ]) {
    await diagnostic.getByRole("button", { name: label, exact: true }).click();
    assert.equal(
      await diagnostic
        .locator(visible)
        .evaluate((e) => getComputedStyle(e).visibility),
      "visible",
    );
    assert.equal(
      await diagnostic
        .locator(hidden)
        .evaluate((e) => getComputedStyle(e).visibility),
      "hidden",
    );
  }
  await diagnostic.waitForTimeout(1500);
  await diagnostic
    .getByRole("button", { name: "Pausar animações", exact: true })
    .click();
  assert.equal(
    await diagnostic
      .locator(".library-sunbeam")
      .first()
      .evaluate((e) => getComputedStyle(e).animationPlayState),
    "paused",
  );
  // Pixel evidence of each renderer, on a neutral background. No changed source assets.
  await diagnostic.addStyleTag({
    content:
      ".ambient-inspector{display:none}.room-image,.library-foreground{visibility:hidden}.library-room{background:#202020}",
  });
  const isolatedRoom = await diagnostic.locator(".library-room").boundingBox();
  await writeFile(
    `test-results/ambient-layers-${engine}-bounds.json`,
    JSON.stringify(isolatedRoom),
  );
  for (const layer of ["none", "rays", "dust", "light", "reflection"]) {
    await diagnostic
      .locator(".app")
      .evaluate(
        (e, layer) => e.setAttribute("data-diagnostic-layer", layer),
        layer,
      );
    await diagnostic.screenshot({
      path: `test-results/ambient-layer-${engine}-${layer}.png`,
    });
  }
  const html = await readFile("dist/index.html", "utf8");
  const script = /src="([^"]+\.js)"/.exec(html)![1].split("/").pop()!;
  assert.ok(
    !(await readFile(`dist/assets/${script}`, "utf8")).includes(
      "data-diagnostic-layer",
    ),
  );
  assert.ok(
    !(await readFile("dist/sw.js", "utf8")).includes("library-ambient"),
  );
  assert.deepEqual(errors, []);
  const report = {
    engine,
    layouts,
    realTimeMotion: true,
    threeRenderedBeams: true,
    eightVisibleMotes: true,
    limitedStillAnimated: true,
    reducedMotion: true,
    backgroundPause: true,
    attentionPause: true,
    collectionGeometryUnchanged: true,
    diagnosticsOutsideRelease: true,
    offline: engine === "chromium",
    start,
    middle,
    end,
    errors,
  };
  await writeFile(
    `test-results/ambient-${engine}-report.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      ...report,
      start: undefined,
      middle: undefined,
      end: undefined,
    }),
  );
} finally {
  await browser.close();
}
