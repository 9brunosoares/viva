import { chromium } from "playwright";
import {
  fresh,
  complete,
  acceptMilestoneBook,
  finishMilestone,
} from "../src/progress";
import { scenario } from "./vfx-scenarios";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const b = await chromium.launch({ headless: true, channel: "msedge" }),
  p = await b.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
await p.addInitScript("globalThis.__name=fn=>fn");
try {
  await p.goto("http://127.0.0.1:4173/viva-test/");
  await p.locator(".home").waitFor();
  await p.waitForTimeout(200);
  let progress = fresh(() => 0.4);
  for (let i = 1; i < 5; i++)
    progress = finishMilestone(acceptMilestoneBook(complete(progress, i)));
  const session = {
    version: 1,
    campaignVersion: 3,
    campaign: progress.order.join(","),
    completedCount: 4,
    stage: 5,
    endless: false,
    difficulty: "easy",
    phase: "game",
    snapshot: {
      board: scenario("3").board,
      remaining: 30,
      counts: Array(6).fill(0),
      powers: 0,
      cascades: 0,
      round: 1,
      obstacles: {
        petals: Array(56).fill(false),
        swept: 3,
        opened: 0,
        brought: 0,
        spawned: 0,
      },
    },
  };
  await p.evaluate(
    ({ progress, session }) => {
      localStorage.setItem("viva-progress-v1", JSON.stringify(progress));
      localStorage.setItem("viva-session-v1", JSON.stringify(session));
    },
    { progress, session },
  );
  await p.reload();
  await p.locator(".board").waitFor();
  const frames = [];
  for (let n = 1; n <= 2; n++) {
    await p.locator(".tail-peek").waitFor({ timeout: 17000 });
    await p.waitForTimeout(200);
    const frame = await p.locator(".tail-peek").evaluate((e) => {
      const r = e.getBoundingClientRect(),
        im = e.querySelector("img")!;
      return {
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        opacity: getComputedStyle(e).opacity,
        complete: im.complete,
        natural: im.naturalWidth,
        transform: getComputedStyle(im).transform,
      };
    });
    frames.push(frame);
    await p.screenshot({ path: `test-results/premium6/tail-real-${n}.png` });
    await p.locator(".tail-peek").waitFor({ state: "detached" });
    assert.ok(Number(frame.opacity) > 0.1);
  }
  await p.waitForTimeout(14000);
  assert.equal(await p.locator(".tail-peek").count(), 0);
  await writeFile(
    "test-results/premium6/tail-report.json",
    JSON.stringify(
      { frames, maximumTwo: true, clockEmulation: false },
      null,
      2,
    ),
  );
  console.log(frames);
} finally {
  await b.close();
}
