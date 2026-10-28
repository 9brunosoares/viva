import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

// Desktop emulation only: a relative smoke measurement, not a device FPS guarantee.
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
try {
  await page.goto(
    process.env.VIVA_TEST_URL ||
      "http://127.0.0.1:4173/viva-test/?v=library3-perf",
  );
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    localStorage.setItem(
      "viva-progress-v1",
      JSON.stringify({
        version: 1,
        order: [7, 2, 9, 1, 8, 4, 10, 3, 6, 5],
        completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        sound: true,
        motion: true,
      }),
    );
  });
  await page.reload();
  await page.locator(".library-room").waitFor();
  if (process.env.PERF_HIDE_RAYS)
    await page.addStyleTag({
      content: ".library-sunrays{display:none!important}",
    });
  // tsx's keepNames helper is needed only inside serialized test callbacks.
  await page.evaluate("globalThis.__name = (fn) => fn");
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker.ready)?.active,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1100);
  const measure = async () =>
    page.evaluate(async () => {
      const times: number[] = [];
      let last = performance.now(),
        mutations = 0;
      const observer = new MutationObserver(
        (records) => (mutations += records.length),
      );
      observer.observe(document.querySelector(".library-room")!, {
        subtree: true,
        attributes: true,
        childList: true,
      });
      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          times.push(now - last);
          last = now;
          if (times.length < 180) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      observer.disconnect();
      times.shift();
      times.sort((a, b) => a - b);
      return {
        p50: times[Math.floor(times.length * 0.5)],
        p95: times[Math.floor(times.length * 0.95)],
        longFrames: times.filter((t) => t > 50).length,
        mutations,
        nodes: document.querySelector(".library-room")!.querySelectorAll("*")
          .length,
      };
    });
  await page
    .locator(".library-room")
    .evaluate((e) => e.setAttribute("data-ambient", "paused"));
  const paused = await measure();
  await page
    .locator(".library-room")
    .evaluate((e) => e.setAttribute("data-ambient", "active"));
  const animated = await measure();
  assert.equal(
    animated.mutations,
    0,
    "CSS animation must not cause React/DOM updates per frame",
  );
  assert.equal(animated.nodes, paused.nodes);
  const report = {
    environment: `${engine} desktop with 390x844 mobile emulation`,
    paused,
    animated,
    interpretation:
      "Indicative smoke measurement only; no real-iPhone FPS, thermals or battery validation",
  };
  await writeFile(
    process.env.PERF_REPORT ||
      (engine === "webkit"
        ? "test-results/library-performance-webkit-report.json"
        : "test-results/library-performance-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
  assert.ok(
    animated.p95 <= Math.max(50, paused.p95 * 2),
    "no large relative scheduling regression on this desktop",
  );
} finally {
  await browser.close();
}
