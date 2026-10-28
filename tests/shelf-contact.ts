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
const engine = process.env.BROWSER_ENGINE === "webkit" ? "webkit" : "chromium",
  before = process.env.SHELF_BEFORE === "true";
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
  `globalThis.__name=fn=>fn;const f=sessionStorage.getItem('shelf-contact-fixture');if(f){localStorage.setItem('viva-progress-v1',f);localStorage.removeItem('viva-session-v1');sessionStorage.removeItem('shelf-contact-fixture');}`,
);
const page = await context.newPage(),
  errors: string[] = [],
  results: any[] = [];
page.setDefaultTimeout(90000);
page.on("pageerror", (e) => errors.push(e.message));
const folder = "test-results/shelf-contact";
await mkdir(folder, { recursive: true });
const bases = JSON.parse(
  await readFile(`${folder}/visible-bases.json`, "utf8"),
);
const calibration = JSON.parse(
  await readFile("source-assets/shelf-contact/calibration.json", "utf8"),
);
const baseline = before
  ? null
  : await readFile(`${folder}/before-chromium.json`, "utf8")
      .then(JSON.parse)
      .catch(() => null);
try {
  await page.goto(
    process.env.VIVA_TEST_URL || "http://127.0.0.1:4173/viva-test/",
  );
  for (const count of [0, 1, 4, 5, 6, 9, 10]) {
    let p = fresh();
    for (let i = 1; i <= count; i++)
      p = finishMilestone(acceptMilestoneBook(complete(p, i)));
    await page.evaluate(
      (p) => sessionStorage.setItem("shelf-contact-fixture", JSON.stringify(p)),
      p,
    );
    await page.reload();
    if (!count)
      await page
        .getByRole("button", { name: "Entrar na biblioteca", exact: true })
        .click();
    await page.locator(".library-room[data-ready=true]").waitFor();
    await page
      .locator(".shelf-books img")
      .evaluateAll((es) =>
        Promise.all(es.map((e) => (e as HTMLImageElement).decode())),
      );
    await page.evaluate(() => document.fonts.ready);
    for (const [width, height] of [
      [375, 667],
      [390, 844],
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
          ) < 0.5,
        height,
      );
      await page.evaluate(
        () =>
          new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
          ),
      );
      const record = await page.evaluate(
        ({ bases, calibration }) => {
          const room = document.querySelector<HTMLElement>(".library-room")!,
            r = room.getBoundingClientRect(),
            stage = Number(room.dataset.stage),
            points = calibration.surfaces[stage] as number[][];
          const floor = (x: number) => {
            let i = 1;
            while (i < points.length - 1 && x > points[i][0]) i++;
            const [a, b] = [points[i - 1], points[i]];
            return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
          };
          const slots = Array.from(
            document.querySelectorAll<HTMLButtonElement>(".shelf-books button"),
          ).map((button) => {
            const id = Number(button.dataset.bookId),
              m = bases[id],
              node = document.createElement("i");
            Object.assign(node.style, {
              position: "absolute",
              width: "0px",
              height: "0px",
              visibility: "hidden",
              pointerEvents: "none",
              left: `${((m.x - m.left) / m.artWidth) * 100}%`,
              top: `${((m.y - m.top) / m.artHeight) * 100}%`,
            });
            button.appendChild(node);
            const q = node.getBoundingClientRect();
            node.remove();
            const nativeX = ((q.x - r.x) / r.width) * 496,
              supportY = r.y + (floor(nativeX) / 756) * r.height,
              box = button.getBoundingClientRect();
            return {
              id,
              base: { x: q.x, y: q.y },
              support: { x: q.x, y: supportY },
              gap: supportY - q.y,
              nativeX,
              box: { x: box.x, y: box.y, width: box.width, height: box.height },
              left: button.style.left,
              height: button.style.height,
              width: button.style.width,
              hit:
                document
                  .elementFromPoint(
                    box.x + box.width / 2,
                    box.y + box.height / 2,
                  )
                  ?.closest("button") === button,
            };
          });
          return {
            stage,
            room: { x: r.x, y: r.y, width: r.width, height: r.height },
            floor: points.map(([x, y]) => ({
              x: r.x + (x / 496) * r.width,
              y: r.y + (y / 756) * r.height,
            })),
            slots,
          };
        },
        { bases, calibration },
      );
      assert.equal(record.slots.length, count);
      assert.deepEqual(
        record.slots.map((s) => s.id),
        p.order.slice(0, count),
      );
      assert.ok(record.slots.every((s) => s.hit));
      assert.ok(
        await page.evaluate(
          () =>
            document.documentElement.scrollHeight <= innerHeight + 1 &&
            document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const previous = baseline?.results.find(
        (r: any) => r.count === count && r.width === width,
      );
      if (previous)
        record.slots.forEach((slot, i) => {
          for (const field of ["left", "height", "width"] as const)
            assert.ok(
              Math.abs(
                parseFloat(slot[field]) - parseFloat(previous.slots[i][field]),
              ) < 1e-10,
              `unchanged ${field}`,
            );
        });
      if (!before)
        for (const s of record.slots)
          assert.ok(
            Math.abs(s.gap) <= 0.5,
            JSON.stringify({ count, width, s }),
          );
      const label = `${before ? "before" : "after"}-${engine}-${count}-${width}`;
      await page.screenshot({ path: `${folder}/${label}.png` });
      results.push({ count, width, height, label, ...record });
    }
    const stored = await page.evaluate(() =>
      localStorage.getItem("viva-progress-v1"),
    );
    for (const id of p.order.slice(0, count)) {
      await page
        .getByRole("button", {
          name: `Abrir ${books[id - 1].title}`,
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Ler sinopse", exact: true })
        .click();
      assert.equal(
        await page.locator(".book-synopsis p").innerText(),
        books[id - 1].synopsis,
      );
      await page.keyboard.press("Escape");
      await page.locator(".book-viewer").waitFor({ state: "detached" });
    }
    assert.equal(
      await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
      stored,
    );
  }
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
    before ? "before" : "after",
    results.length,
    "states, max gap",
    Math.max(
      ...results.flatMap((r) => r.slots.map((s: any) => Math.abs(s.gap))),
    ),
  );
} finally {
  await browser.close();
}
