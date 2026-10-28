import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { books, campaignBookIds } from "../src/config";
import {
  fresh,
  complete,
  acceptMilestoneBook,
  finishMilestone,
} from "../src/progress";
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
await context.addInitScript(
  `globalThis.__name=fn=>fn;const f=sessionStorage.getItem('reward-fixture');if(f){localStorage.setItem('viva-progress-v1',f);localStorage.removeItem('viva-session-v1');localStorage.setItem('viva-test-mode-v1','true');sessionStorage.removeItem('reward-fixture');}`,
);
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
let checks = 0;
try {
  await page.goto("http://127.0.0.1:4173/viva-test/");
  for (let stage = 1; stage <= 10; stage++) {
    let p = fresh();
    for (let i = 1; i < stage; i++)
      p = finishMilestone(acceptMilestoneBook(complete(p, i)));
    await page.evaluate(
      (p) => sessionStorage.setItem("reward-fixture", JSON.stringify(p)),
      p,
    );
    await page.reload();
    if (stage === 1)
      await page
        .getByRole("button", { name: "Entrar na biblioteca", exact: true })
        .click();
    await page.locator(".hub-actions .primary").click();
    await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
    await page
      .getByRole("button", { name: "Concluir fase", exact: true })
      .click();
    const discover = page.getByRole("button", {
      name: "Descobrir meu livro",
      exact: true,
    });
    if (await discover.count()) await discover.click();
    await page
      .locator(".reward-book")
      .evaluate((e: HTMLImageElement) => e.decode());
    const book = books.find((b) => b.id === campaignBookIds[stage - 1])!;
    assert.equal(await page.locator(".reward h2").innerText(), book.title);
    assert.equal(
      await page.locator(".reward .author").innerText(),
      book.author,
    );
    assert.ok(
      (await page.locator(".reward-book").getAttribute("src"))?.endsWith(
        `book-${book.id}-cover.webp`,
      ),
    );
    assert.equal(
      await page.locator(".reward-synopsis,.book-synopsis").count(),
      0,
    );
    for (const [width, height] of [
      [375, 667],
      [390, 844],
      [430, 932],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => {
        document.documentElement.style.setProperty("--safe-top", "59px");
        document.documentElement.style.setProperty("--safe-bottom", "34px");
      });
      await page.evaluate(() => document.fonts.ready);
      const r = (await page.locator(".reward-content").boundingBox())!;
      assert.ok(
        Math.abs(r.y + r.height / 2 - (59 + (height - 93) / 2)) <= 3,
        `${stage} ${width}: ${JSON.stringify(r)}`,
      );
      for (const selector of [
        ".reward h1",
        ".reward h2",
        ".reward .author",
        ".reward-book",
        ".reward-content .primary",
      ]) {
        const b = (await page.locator(selector).boundingBox())!;
        assert.ok(
          b.y >= 69 && b.y + b.height <= height - 44 && b.height > 0,
          `${stage} ${selector} ${width}: ${JSON.stringify(b)}`,
        );
      }
      checks++;
    }
    await page
      .getByRole("button", { name: "Guardar na biblioteca", exact: true })
      .click();
    if (stage === 5 || stage === 10) {
      await page.locator(".celebration[data-art-ready=true]").waitFor();
      await page.locator(".celebration .primary").click();
    }
    await page.locator(".library-room").waitFor();
    await page
      .getByRole("button", { name: `Abrir ${book.title}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Ler sinopse", exact: true })
      .click();
    assert.equal(
      await page.locator(".book-synopsis p").innerText(),
      book.synopsis,
    );
    await page.keyboard.press("Escape");
  }
  const critical = errors.filter(
    (e) => !e.endsWith("/sw.js due to access control checks."),
  );
  assert.deepEqual(critical, []);
  const report = {
    engine,
    checks,
    allBooks: true,
    fixedPhaseAssociation: true,
    safeAreaSimulated: true,
    rewardHasNoSynopsis: true,
    allSynopsesAvailableInLibrary: true,
    errors: critical,
  };
  await writeFile(
    `test-results/reward-shelf/reward-finish-${engine}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
