import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import {
  fresh,
  complete,
  acceptMilestoneBook,
  finishMilestone,
} from "../src/progress";
import { books } from "../src/config";
import { bookPlacement } from "../src/libraryLayout";
import { libraryState } from "../src/progress";

const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium";
const before = process.env.REWARD_BEFORE === "true";
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
await context.addInitScript(
  `globalThis.__name=fn=>fn;const f=sessionStorage.getItem('reward-shelf-fixture');if(f){localStorage.setItem('viva-progress-v1',f);localStorage.removeItem('viva-session-v1');sessionStorage.removeItem('reward-shelf-fixture');}`,
);
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const folder = "test-results/reward-shelf",
  results: any[] = [];
await mkdir(folder, { recursive: true });
const baseline = before
  ? null
  : await readFile(`${folder}/before-${engine}.json`, "utf8")
      .then(JSON.parse)
      .catch(() => null);
const viewports = [
  [375, 667],
  [390, 844],
  [430, 932],
];
async function viewport(width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(
    (h) =>
      Math.abs(
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--vh"),
        ) *
          100 -
          h,
      ) < 0.5,
    height,
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
async function composition(label: string) {
  for (const [width, height] of viewports)
    for (const safe of [false, true]) {
      await viewport(width, height);
      await page.evaluate((s) => {
        document.documentElement.style.setProperty(
          "--safe-top",
          s ? "59px" : "0px",
        );
        document.documentElement.style.setProperty(
          "--safe-bottom",
          s ? "34px" : "0px",
        );
      }, safe);
      await page.evaluate(() => document.fonts.ready);
      const box = await page
        .locator(label === "intro" ? ".reward-intro" : ".reward-content")
        .boundingBox();
      assert.ok(box);
      const centerDelta =
        box.y +
        box.height / 2 -
        (safe ? 59 + (height - 59 - 34) / 2 : height / 2);
      if (!before) {
        assert.ok(
          Math.abs(centerDelta) <= 3,
          `${engine} ${label} ${width} ${safe}: center ${centerDelta}`,
        );
        const children = await page
          .locator(
            label === "intro" ? ".reward-intro > *" : ".reward-content > *",
          )
          .evaluateAll((es) =>
            es.map((e) => {
              const r = e.getBoundingClientRect();
              return {
                tag: e.tagName,
                y: r.y,
                bottom: r.bottom,
                x: r.x,
                right: r.right,
                height: r.height,
              };
            }),
          );
        for (const r of children)
          assert.ok(
            r.height > 0 &&
              r.y >= (safe ? 59 : 0) + 10 &&
              r.bottom <= height - (safe ? 34 : 0) - 10 &&
              r.x >= 0 &&
              r.right <= width + 0.5,
            JSON.stringify({ label, width, safe, r }),
          );
        for (let i = 1; i < children.length; i++)
          assert.ok(
            children[i].y >= children[i - 1].bottom - 0.5,
            JSON.stringify({ label, width, safe, children }),
          );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight + 1,
          ),
        );
      }
      results.push({ label, width, height, safe, box, centerDelta });
      await page.screenshot({
        path: `${folder}/${before ? "before" : "after"}-${engine}-${label}-${width}-${safe ? "safe" : "plain"}.png`,
      });
    }
}
try {
  await page.goto(
    process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
  );
  await page
    .getByRole("button", { name: "Entrar na biblioteca", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByRole("switch", { name: "Modo teste", exact: true }).click();
  await page
    .getByRole("button", { name: "Fechar configurações", exact: true })
    .click();
  await page.locator(".hub-actions .primary").click();
  await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  await page
    .getByRole("button", { name: "Concluir fase", exact: true })
    .click();
  await page
    .locator(".reward-intro img")
    .evaluate((e: HTMLImageElement) => e.decode());
  await composition("intro");
  await page
    .getByRole("button", { name: "Descobrir meu livro", exact: true })
    .click();
  await page
    .locator(".reward-book")
    .evaluate((e: HTMLImageElement) => e.decode());
  await composition("book");
  if (!before)
    assert.equal(
      await page.locator(".reward h2").innerText(),
      "O Código Da Vinci",
    );
  await page
    .getByRole("button", { name: "Guardar na biblioteca", exact: true })
    .click();
  await page.locator(".library-room").waitFor();
  for (const count of [1, 4, 5, 10]) {
    let p = fresh();
    for (let i = 1; i <= count; i++)
      p = finishMilestone(acceptMilestoneBook(complete(p, i)));
    await page.evaluate(
      (p) => sessionStorage.setItem("reward-shelf-fixture", JSON.stringify(p)),
      p,
    );
    await page.reload();
    await page.locator(".library-room[data-ready=true]").waitFor();
    await page
      .locator(".shelf-books img")
      .evaluateAll((es) =>
        Promise.all(es.map((e) => (e as HTMLImageElement).decode())),
      );
    for (const [width, height] of viewports) {
      await viewport(width, height);
      const slots = await page
        .locator(".shelf-books button")
        .evaluateAll((es) =>
          es.map((e) => {
            const r = e.getBoundingClientRect();
            return {
              id: Number((e as HTMLElement).dataset.bookId),
              anchorLeft: (e as HTMLElement).style.left,
              anchorBottom: parseFloat((e as HTMLElement).style.bottom),
              anchorHeight: (e as HTMLElement).style.height,
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              hit:
                document
                  .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
                  ?.closest("button") === e,
            };
          }),
        );
      assert.equal(slots.length, count);
      assert.ok(slots.every((s) => s.hit));
      if (!before) {
        assert.deepEqual(
          slots.map((s) => s.id),
          p.order.slice(0, count),
        );
        const old = baseline?.results.find(
          (r: any) =>
            r.label === "shelf" && r.count === count && r.width === width,
        )?.slots;
        if (old)
          for (let i = 0; i < slots.length; i++) {
            assert.equal(slots[i].anchorLeft, old[i].anchorLeft);
            assert.equal(slots[i].anchorHeight, old[i].anchorHeight);
            const expected = bookPlacement(libraryState(count), i, slots[i].id);
            assert.ok(
              Math.abs(slots[i].anchorBottom - expected.bottom) < 0.001,
            );
          }
      }
      await page.screenshot({
        path: `${folder}/${before ? "before" : "after"}-${engine}-shelf-${count}-${width}.png`,
      });
      results.push({ label: "shelf", count, width, height, slots });
    }
    if (!before) {
      await page.locator(".shelf-books button").last().click();
      await page
        .getByRole("button", { name: "Ler sinopse", exact: true })
        .click();
      assert.equal(
        await page.locator(".book-synopsis p").innerText(),
        books[p.order[count - 1] - 1].synopsis,
      );
      await page.keyboard.press("Escape");
    }
  }
  // The final, longer book title must fit as a coherent reward composition too.
  let final = fresh();
  for (let i = 1; i <= 10; i++) {
    final = complete(final, i);
    if (i < 10) final = finishMilestone(acceptMilestoneBook(final));
  }
  await page.evaluate(
    (p) => sessionStorage.setItem("reward-shelf-fixture", JSON.stringify(p)),
    final,
  );
  await page.reload();
  await page
    .locator(".reward-book")
    .evaluate((e: HTMLImageElement) => e.decode());
  await composition("final-book");
  const critical = errors.filter(
    (e) => !e.endsWith("/sw.js due to access control checks."),
  );
  assert.deepEqual(critical, []);
  await writeFile(
    `${folder}/${before ? "before" : "after"}-${engine}.json`,
    JSON.stringify(
      { engine, before, results, errors: critical, realIPhone: false },
      null,
      2,
    ),
  );
  console.log(
    engine,
    results.length,
    "reward/shelf states passed",
    before ? "baseline" : "refined",
  );
} finally {
  await browser.close();
}
