// Record the actual production app at normal speed, in a fresh mobile context.
import { chromium } from "playwright";
import { mkdir, writeFile, rename } from "node:fs/promises";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
await mkdir("test-results/ambient-video", { recursive: true });
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
  recordVideo: {
    dir: "test-results/ambient-video",
    size: { width: 393, height: 852 },
  },
});
await context.addInitScript(() =>
  Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 }),
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:4173/viva-test/?v=ambient-review");
  await page
    .getByRole("button", { name: "Entrar na biblioteca", exact: true })
    .click();
  await page.locator(".library-room").waitFor();
  await page.waitForTimeout(1500);
  const frames = [];
  const start = Date.now();
  // Real elapsed time, not animation seeking or accelerated playback.
  for (let frame = 0; frame < 36; frame++) {
    const target = start + frame * 350;
    if (Date.now() < target) await page.waitForTimeout(target - Date.now());
    const path = `test-results/ambient-video/frame-${String(frame).padStart(3, "0")}.png`;
    await page.screenshot({ path });
    frames.push({ path, time: Date.now() - start });
  }
  const video = page.video();
  await context.close();
  const original = await video.path();
  await rename(original, "test-results/library-atmosphere.webm");
  await writeFile(
    "test-results/ambient-video/frames.json",
    JSON.stringify({ frames, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      recording: "test-results/library-atmosphere.webm",
      sampledFrames: frames.length,
      elapsed: frames.at(-1).time,
      errors,
    }),
  );
} finally {
  await browser.close();
}
