import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { books } from "../src/config.ts";
import { waitForCache } from "./boardHelper.ts";
const { chromium, webkit } = createRequire(import.meta.url)("playwright");
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
const url = "http://127.0.0.1:4173/viva-test/";
await page.goto(url);
await waitForCache(page);
const orders = [
  [7, 2, 9, 1, 8, 4, 10, 3, 6, 5],
  [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
];
let checks = 0;
async function saved(order: number[], count: number) {
  await page.evaluate(
    ({ order, count }) =>
      localStorage.setItem(
        "viva-progress-v1",
        JSON.stringify({
          version: 1,
          order,
          completed: Array.from({ length: count }, (_, i) => i + 1),
          sound: false,
          motion: false,
        }),
      ),
    { order, count },
  );
  await page.reload();
}
async function checkBook(id: number) {
  const book = books[id - 1],
    modal = page.locator(".book-modal");
  await modal.waitFor();
  assert.equal(await modal.locator("h2").innerText(), book.title);
  assert.equal(await modal.locator(".author").innerText(), book.author);
  assert.equal(
    await modal.locator(".book-synopsis").innerText(),
    book.synopsis,
  );
  assert.ok(
    (await modal.locator("img").getAttribute("src"))?.endsWith(
      `book-${id}-cover.webp`,
    ),
  );
  await modal.locator("img").evaluate((i: HTMLImageElement) => i.decode());
  const sizes = await modal.evaluate((m) => {
    const r = m.getBoundingClientRect(),
      s = m.querySelector(".book-synopsis")!,
      b = m.querySelector("button.primary")!.getBoundingClientRect();
    return {
      top: r.top,
      bottom: r.bottom,
      vh: innerHeight,
      scroll: m.scrollHeight,
      client: m.clientHeight,
      sw: s.scrollWidth,
      cw: s.clientWidth,
      button: b.bottom,
    };
  });
  assert.ok(
    sizes.top >= 0 && sizes.bottom <= sizes.vh + 1 && sizes.button <= sizes.vh,
  );
  assert.ok(sizes.scroll <= sizes.client + 1, "only synopsis may scroll");
  assert.ok(sizes.sw <= sizes.cw + 1, "no horizontal text clipping");
  await modal.locator(".book-synopsis").evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  assert.ok(
    await modal
      .locator(".book-synopsis")
      .evaluate((e) => e.scrollTop + e.clientHeight >= e.scrollHeight - 1),
  );
  checks++;
}
for (const order of orders) {
  await saved(order, 10);
  const before = await page.evaluate(() =>
    localStorage.getItem("viva-progress-v1"),
  );
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(size);
    for (const id of order) {
      const spine = page.locator(".shelf-books button").nth(order.indexOf(id));
      const point = await spine.evaluate((el) => {
        const r = el.getBoundingClientRect();
        for (let y = Math.floor(r.top); y < r.bottom; y++)
          for (let x = Math.floor(r.left) - 3; x < r.right + 3; x++)
            if (
              [0, -1, 1].every(
                (dx) =>
                  document.elementFromPoint(x + dx, y)?.closest("button") ===
                  el,
              )
            )
              return { x, y };
        return null;
      });
      assert.ok(
        point,
        "exposed touch point for book " + id + " at " + size.width,
      );
      await page.mouse.click(point.x, point.y);
      await checkBook(id);
      if (id === 6 && size.width === 320)
        await page.screenshot({
          path: `test-results/synopsis-${engine}-320.png`,
        });
      await page
        .getByRole("button", { name: "Voltar à biblioteca", exact: true })
        .click();
      assert.equal(await page.locator(".book-modal").count(), 0);
    }
  }
  assert.equal(
    await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
    before,
  );
}
await saved(orders[0], 3);
assert.equal(await page.locator(".shelf-books button").count(), 3);
await page.getByRole("button", { name: /Meus livros/ }).click();
for (let n = 0; n < 3; n++) {
  await checkBook(orders[0][n]);
  const next = page.getByRole("button", { name: "Próximo livro", exact: true });
  assert.equal(await next.isDisabled(), n === 2);
  if (n < 2) await next.click();
}
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
assert.equal(await page.locator(".qa-button,.qa-tools").count(), 0);
await page.locator(".hub-actions .primary").click();
assert.equal(
  await page.getByRole("button", { name: /Concluir fase|pular|QA/i }).count(),
  0,
);
await page.getByRole("button", { name: "Pausar partida" }).click();
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
await saved(orders[0], 10);
if (engine === "chromium") {
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Meus livros/ }).click();
  for (let n = 0; n < 10; n++) {
    await checkBook(orders[0][n]);
    if (n < 9)
      await page
        .getByRole("button", { name: "Próximo livro", exact: true })
        .click();
  }
}
assert.deepEqual(errors, []);
await writeFile(
  `test-results/synopses-${engine}-report.json`,
  JSON.stringify(
    {
      engine,
      checks,
      orders: 2,
      sizes: 3,
      lockedHidden: true,
      noSkip: true,
      progressUnchanged: true,
      offline: engine === "chromium",
      errors,
    },
    null,
    2,
  ),
);
console.log(
  `${engine}: ${checks} book checks, locked books hidden, no skip, preserved progress${engine === "chromium" ? ", offline synopses" : ""}.`,
);
await browser.close();
