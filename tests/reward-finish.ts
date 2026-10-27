import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { books } from "../src/config";
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const page = await browser.newPage({
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
await page.addInitScript("globalThis.__name = (fn) => fn");
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
let checks = 0;
try {
  await page.goto("http://127.0.0.1:4173/viva-test/?v=reward5");
  await page.waitForTimeout(150);
  for (const book of books) {
    const order = books.map((b) => b.id).filter((id) => id !== book.id);
    order.splice(4, 0, book.id);
    await page.evaluate(
      ({ order, id }) => {
        localStorage.setItem(
          "viva-progress-v1",
          JSON.stringify({
            version: 1,
            order,
            completed: [1, 2, 3, 4, 5],
            sound: false,
            motion: true,
            revealed: [],
            pendingCelebration: { kind: "blade", bookId: id, step: "book" },
          }),
        );
        localStorage.removeItem("viva-session-v1");
      },
      { order, id: book.id },
    );
    await page.reload();
    await page.locator(".reward-book").waitFor();
    for (const [width, height] of [
      [320, 568],
      [393, 852],
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
      await page.evaluate((safe) => {
        document.documentElement.style.setProperty(
          "--safe-top",
          safe ? "59px" : "0px",
        );
        document.documentElement.style.setProperty(
          "--safe-bottom",
          safe ? "34px" : "0px",
        );
      }, width === 393);
      const minimum = width === 393 ? 59 : 0,
        maximum = height - (width === 393 ? 34 : 0);
      for (const selector of [
        ".reward h1",
        ".reward h2",
        ".reward .author",
        ".reward .reward-book",
        ".reward-synopsis",
        ".reward > .primary",
      ]) {
        const b = (await page.locator(selector).boundingBox())!;
        assert.ok(
          b.height > 0 && b.y >= minimum - 1 && b.y + b.height <= maximum + 1,
          `${book.id} ${selector} ${width}: ${JSON.stringify(b)}`,
        );
      }
      assert.equal(await page.locator(".reward h2").innerText(), book.title);
      assert.equal(
        await page.locator(".reward .author").innerText(),
        book.author,
      );
      assert.equal(
        await page.locator(".reward-synopsis p").innerText(),
        book.synopsis,
      );
      const contrasts = await page.locator(".reward").evaluate((surface) => {
        const luminance = (rgb: number[]) => {
          const [r, g, b] = rgb.map((v) => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        // The darkest endpoint of the approved paper gradient is the conservative background.
        const background = luminance([241, 228, 201]);
        return Array.from(
          surface.querySelectorAll(
            "h1,h2,.author,.collection-intro,.reward-synopsis p",
          ),
        ).map((e) => {
          const foreground = luminance(
            getComputedStyle(e)
              .color.match(/[\d.]+/g)!
              .slice(0, 3)
              .map(Number),
          );
          return {
            text: e.textContent?.slice(0, 40),
            ratio:
              (Math.max(background, foreground) + 0.05) /
              (Math.min(background, foreground) + 0.05),
          };
        });
      });
      assert.ok(
        contrasts.every(({ ratio }) => ratio >= 4.5),
        JSON.stringify(contrasts),
      );
      assert.ok(
        await page
          .locator(".reward")
          .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
      );
      if ([4, 6, 7].includes(book.id))
        await page.screenshot({
          path: `test-results/reward-finish-${engine}-${book.id}-${width}.png`,
        });
      checks++;
    }
  }
  assert.deepEqual(errors, []);
  const report = {
    engine,
    checks,
    allBooks: true,
    safeAreaSimulated: true,
    onlySynopsisScrolls: true,
    readingContrastAtLeast4_5: true,
    errors,
  };
  await writeFile(
    `test-results/reward-finish-${engine}-report.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
