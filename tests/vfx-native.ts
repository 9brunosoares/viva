import assert from "node:assert/strict";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { scenario } from "./vfx-scenarios";
import { vfxAtlas } from "../src/vfxAtlas";
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const record = process.env.VFX_RECORD !== "false";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
await mkdir("test-results/native-vfx", { recursive: true });
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
  ...(record
    ? {
        recordVideo: {
          dir: "test-results/native-vfx",
          size: { width: 393, height: 852 },
        },
      }
    : {}),
});
await context.addInitScript(`globalThis.__name=fn=>fn;window.__nativeDraws=[];window.__waveStart=0;window.__nativeTrace=[];
const draw=CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
 if(this.canvas.classList.contains('game-vfx')&&image?.src?.includes('/vfx/sequences.webp')&&args.length===8&&window.__nativeDraws.length<12000){
  const [sx,sy,sw,sh,dx,dy,dw,dh]=args,m=this.getTransform();
  window.__nativeDraws.push({time:performance.now(),sx,sy,sw,sh,dw,dh,x:m.a*(dx+dw/2)+m.c*(dy+dh/2)+m.e,y:m.b*(dx+dw/2)+m.d*(dy+dh/2)+m.f,alpha:this.globalAlpha});
 }
 return draw.call(this,image,...args);
};
new MutationObserver(()=>{const c=document.querySelector('.game-vfx');if(!window.__waveStart&&Number(c?.dataset.emissions)>0)window.__waveStart=performance.now();if(c)window.__nativeTrace.push({time:performance.now(),...c.dataset});}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-emissions','data-running','data-clips','width','height']});`);
const recordingStarted = Date.now();
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const results = [];
try {
  for (const mode of [
    "3",
    "4",
    "5",
    "row",
    "column",
    "area",
    "color",
    "intersection",
    "combined",
    "pair-area-color",
  ] as const) {
    if (engine === "webkit") await page.clock.install();
    await page.goto(
      `http://127.0.0.1:4175/tests/vfx-game.html?type=${mode}&seed=918`,
    );
    await page.locator(".tile").first().waitFor();
    await page.waitForTimeout(900);
    const { from, to } = scenario(mode);
    await page.locator(".tile").nth(from).click();
    await page.locator(".tile").nth(to).click();
    if (engine === "webkit") await page.clock.runFor(5000);
    await page.waitForFunction(() => Number((window as any).__waveStart) > 0);
    const wave = await page.evaluate(() => ({
      wall: performance.timeOrigin + (window as any).__waveStart,
      time: (window as any).__waveStart,
    }));
    const boardBounds = await page.locator(".board-wrap").boundingBox();
    // Let the animation run freely. PNG captures here can stall WebKit's RAF;
    // evidence frames are extracted from the continuous video afterward.
    await page.waitForTimeout(850);
    const calls = (await page.evaluate(
      () => (window as any).__nativeDraws,
    )) as {
      time: number;
      sx: number;
      sy: number;
      sw: number;
      sh: number;
      dw: number;
      dh: number;
      x: number;
      y: number;
      alpha: number;
    }[];
    await writeFile(
      `test-results/native-vfx/${engine}-${mode}-draws.json`,
      JSON.stringify(calls),
    );
    assert.ok(calls.length > 3, `${mode}: native atlas really paints`);
    const available = new Set(
      Object.values(vfxAtlas.sequences).flatMap((s) => [...s.frames]),
    );
    assert.ok(
      calls.every(
        (c) =>
          c.sw === c.sh &&
          c.sw === vfxAtlas.cell &&
          Math.abs(c.dw - c.dh) < 0.001,
      ),
    );
    assert.ok(
      calls.every((c) =>
        available.has(
          (c.sy / vfxAtlas.cell) * vfxAtlas.columns + c.sx / vfxAtlas.cell,
        ),
      ),
    );
    assert.ok(
      new Set(calls.map((c) => `${c.sx},${c.sy}`)).size >= 3,
      `${mode}: genuine temporal frame progression`,
    );
    const primary = (
      {
        "3": "match3",
        "4": "match4",
        "5": "colorBirth",
        row: "horizontal",
        column: "vertical",
        area: "area",
        color: "color",
        intersection: "areaBirth",
        combined: "cross",
        "pair-area-color": "area",
      } as const
    )[mode];
    const lateFrames = vfxAtlas.sequences[primary].frames.slice(
      -3,
    ) as readonly number[];
    assert.ok(
      calls.some(
        (c) =>
          c.alpha > 0.04 &&
          lateFrames.includes(
            (c.sy / vfxAtlas.cell) * vfxAtlas.columns + c.sx / vfxAtlas.cell,
          ),
      ),
      `${mode}: later native bloom frames really paint`,
    );
    if (mode === "row" || mode === "column") {
      const sequence =
        mode === "row"
          ? vfxAtlas.sequences.horizontal
          : vfxAtlas.sequences.vertical;
      const head = calls.filter(
        (c) =>
          c.time < wave.time + 600 &&
          (sequence.frames as readonly number[]).includes(
            (c.sy / vfxAtlas.cell) * vfxAtlas.columns + c.sx / vfxAtlas.cell,
          ),
      );
      assert.ok(head.length > 3);
      const moving = new Set(
          head.map((c) => Math.round(mode === "row" ? c.x : c.y)),
        ),
        fixed = new Set(
          head.map((c) => Math.round(mode === "row" ? c.y : c.x)),
        );
      const positions = [...moving];
      // The real-time 25fps recorder can skip early RAFs on this desktop.
      // Deterministic WebKit retains the denser trajectory check.
      assert.ok(
        moving.size >= (engine === "webkit" ? 5 : 3) &&
          Math.max(...positions) - Math.min(...positions) > 100,
        `${mode}: front traverses real cells`,
      );
      assert.equal(fixed.size, 1, `${mode}: direction stays on its row/column`);
    }
    await page.waitForFunction(
      () =>
        document.querySelector(".board")?.getAttribute("aria-busy") === "false",
    );
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLElement>(".game-vfx")?.dataset.running ===
        "false",
    );
    results.push({
      mode,
      nativeDraws: calls.length,
      uniqueFrames: new Set(calls.map((c) => `${c.sx},${c.sy}`)).size,
      squareDestinations: true,
      waveAtMs: wave.wall - recordingStarted,
      boardBounds,
    });
  }
  const video = page.video();
  const recordingMs = Date.now() - recordingStarted;
  await context.close();
  if (video)
    await rename(await video.path(), `test-results/vfx-native-${engine}.webm`);
  assert.deepEqual(errors, []);
  await writeFile(
    `test-results/vfx-native-${engine}-report.json`,
    JSON.stringify(
      {
        engine,
        results,
        recordingMs,
        recordedVideo: record,
        deterministicClock: engine === "webkit",
        errors,
        physicalIphone: false,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      engine,
      scenarios: results.length,
      temporalFrames: true,
      uniformScaling: true,
      travelingFronts: true,
      errors,
    }),
  );
} catch (error) {
  console.log(
    await page.evaluate(() => ({
      trace: (window as any).__nativeTrace,
      draws: (window as any).__nativeDraws.length,
    })),
  );
  await page
    .screenshot({ path: `test-results/vfx-native-${engine}-failure.png` })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
