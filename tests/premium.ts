import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { balancedLevel, Difficulty } from "../src/difficulty";
import { levels } from "../src/config";
import { tile, moves, swap, resolveWave } from "../src/engine";
import { waitForCache } from "./boardHelper";
const { chromium, webkit } = createRequire(import.meta.url)("playwright");
const engine = process.env.BROWSER_ENGINE || "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(engine === "chromium" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "no-preference",
});
const page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e: Error) => errors.push(e.message));
page.on("response", (r: any) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await page.goto("http://127.0.0.1:4173/viva-test/");
await waitForCache(page);
const order = [7, 2, 9, 1, 8, 4, 10, 3, 6, 5];
async function seed(count: number) {
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    localStorage.removeItem("viva-session-v1");
    localStorage.removeItem("viva-stories-v1");
  });
  await page.evaluate(
    ({ order, count }) =>
      localStorage.setItem(
        "viva-progress-v1",
        JSON.stringify({
          version: 1,
          order,
          completed: Array.from({ length: count }, (_, i) => i + 1),
          sound: true,
          motion: true,
        }),
      ),
    { order, count },
  );
  await page.reload();
  if (!count)
    await page.getByRole("button", { name: "Entrar na biblioteca" }).click();
}
let layouts = 0;
for (const count of [0, 2, 5, 8, 10]) {
  await seed(count);
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForFunction(
      () =>
        Math.abs(
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue("--vh"),
          ) -
            innerHeight / 100,
        ) < 0.02,
    );
    await page.waitForTimeout(150);
    await page
      .locator(".room-image")
      .evaluate((i: HTMLImageElement) => i.decode());
    const m = await page.locator(".library").evaluate((el) => {
      const room = el.querySelector(".library-room")!.getBoundingClientRect();
      const buttons = Array.from(
        el.querySelectorAll(
          ".hub-header button,.hub-actions button,.blade-prompts button,.difficulty-picker button,.hub-infinite",
        ),
      );
      return {
        scroll: document.documentElement.scrollHeight,
        wh: innerHeight,
        roomRatio: room.height / innerHeight,
        border: getComputedStyle(el.querySelector(".library-room")!)
          .borderRadius,
        controls: buttons.map((b) => {
          const r = b.getBoundingClientRect();
          return {
            top: r.top,
            bottom: r.bottom,
            left: r.left,
            right: r.right,
            h: r.height,
          };
        }),
      };
    });
    assert.ok(m.scroll <= size.height + 1);
    assert.ok(m.roomRatio > 0.75);
    assert.equal(m.border, "0px");
    assert.ok(
      m.controls.every(
        (r: any) =>
          r.top >= 0 &&
          r.bottom <= size.height + 1 &&
          r.left >= 0 &&
          r.right <= size.width + 1 &&
          r.h >= 36,
      ),
    );
    assert.equal(await page.locator(".blade").count(), count >= 5 ? 1 : 0);
    assert.equal(
      await page.locator(".family-frame").count(),
      count === 10 ? 1 : 0,
    );
    await page.screenshot({
      path: `test-results/premium-${engine}-library-${count}-${size.width}.png`,
    });
    layouts++;
  }
}
await page.setViewportSize({ width: 390, height: 844 });
const before = await page.evaluate(() =>
  localStorage.getItem("viva-progress-v1"),
);
for (const label of ["Médio", "Difícil", "Fácil"]) {
  await page.getByRole("button", { name: /^Dificuldade:/ }).click();
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.reload();
  assert.equal(
    await page
      .getByRole("button", { name: `Dificuldade: ${label}`, exact: true })
      .count(),
    1,
  );
}
assert.equal(
  await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
  before,
);
await page.getByRole("button", { name: "Blade", exact: true }).click();
await page
  .getByRole("menuitem", { name: "Quer petisco?", exact: true })
  .click();
assert.ok(
  (await page.locator(".blade img").getAttribute("src"))?.includes("blade-4"),
);
await page.getByRole("button", { name: "Blade", exact: true }).click();
await page
  .getByRole("menuitem", { name: "Blade, boa noite.", exact: true })
  .click();
assert.ok(
  (await page.locator(".blade img").getAttribute("src"))?.includes("blade-5"),
);
await page.getByRole("button", { name: /Meus livros/ }).click();
assert.equal(await page.locator(".book-turn.is-back").count(), 0);
await page.getByRole("button", { name: "Ler sinopse", exact: true }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `test-results/premium-${engine}-book-back.png` });
await page.getByRole("button", { name: "Voltar à capa", exact: true }).click();
await page.waitForTimeout(600);
await page.screenshot({
  path: `test-results/premium-${engine}-book-cover.png`,
});
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForFunction(() =>
  document.documentElement.classList.contains("portrait-fallback"),
);
await page.screenshot({ path: `test-results/premium-${engine}-rotated.png` });
assert.equal(await page.locator(".landscape-note").count(), 0);
await page.getByRole("button", { name: "Ver fases" }).click();
await page.locator(".level-card").first().click();
assert.ok(await page.locator(".board").isVisible());
await page.getByRole("button", { name: "Pausar partida" }).click();
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
await page.setViewportSize({ width: 390, height: 844 });
await page.emulateMedia({ reducedMotion: "reduce" });
const played = [];
let celebrations = 0;
async function playRound(celebrate: boolean) {
  let turns = 0;
  while (await page.locator(".board").count()) {
    if (await page.locator(".victory-shine").count()) {
      assert.equal(
        await page.locator(".board").getAttribute("aria-busy"),
        "true",
      );
      if (celebrate) {
        assert.equal(await page.locator(".combo-layer").count(), 0);
        await page.waitForTimeout(650);
        await page.screenshot({
          path: `test-results/premium-${engine}-victory-${celebrations++}.png`,
        });
        await page.waitForTimeout(650);
        assert.equal(await page.locator(".reward").count(), 0);
      }
      await page.locator(".reward").waitFor();
      break;
    }
    if (await page.getByText("Vamos tentar de novo?", { exact: true }).count())
      throw Error("stage one failed");
    const b = await page.locator(".tile").evaluateAll((els: any[]) =>
      els.map((e) => ({
        kind: Number(e.dataset.kind),
        special: e.dataset.special || undefined,
      })),
    );
    const board = b.map((t: any) => tile(t.kind, t.special));
    const choice = moves(board)
      .map(([a, b]) => {
        const n = swap(board, a, b),
          w = resolveWave(
            n,
            b,
            [a, b].filter((i) => n[i].special),
          );
        return {
          a,
          b,
          score: w.clear.length + w.created.length * 18 + w.powers * 8,
        };
      })
      .sort((a, b) => b.score - a.score)[0];
    await page.locator(".tile").nth(choice.a).click();
    await page.locator(".tile").nth(choice.b).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".victory-shine") ||
        !document.querySelector(".board") ||
        document.querySelector(".board")?.getAttribute("aria-busy") === "false",
    );
    assert.ok(++turns < 65);
  }
  return turns;
}
for (const [difficulty, label] of [
  ["easy", "Fácil"],
  ["medium", "Médio"],
  ["hard", "Difícil"],
] as const) {
  await seed(0);
  await page.emulateMedia({
    reducedMotion: difficulty === "easy" ? "no-preference" : "reduce",
  });
  await page.getByRole("button", { name: /^Dificuldade:/ }).click();
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.locator(".hub-actions .primary").click();
  await page.getByRole("button", { name: "Vamos lá!", exact: true }).click();
  const expected = balancedLevel(levels[0], difficulty);
  assert.equal(
    Number(await page.locator(".moves strong").textContent()),
    expected.moves,
  );
  assert.ok(
    (await page.locator(".objectives").innerText()).includes(
      "/" + expected.targets[0].amount,
    ),
  );
  played.push({ difficulty, moves: await playRound(true) });
  await page.setViewportSize({ width: 320, height: 568 });
  assert.ok(
    await page
      .locator(".reward .primary")
      .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight),
  );
  await page.screenshot({
    path: `test-results/premium-${engine}-intro-${difficulty}.png`,
  });
  await page.getByText("Uma surpresa pra você!", { exact: true }).waitFor();
  assert.ok(
    (await page.locator(".collection-intro").innerText()).includes(
      "São dez histórias",
    ),
  );
  await page
    .getByRole("button", { name: "Descobrir meu livro", exact: true })
    .click();
  assert.ok(
    await page
      .locator(".reward .primary")
      .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight),
  );
  assert.ok(
    await page
      .locator(".reward-book")
      .evaluate((el) => el.getBoundingClientRect().height >= 80),
  );
  await page.screenshot({
    path: `test-results/premium-${engine}-reward-${difficulty}.png`,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Guardar na biblioteca", exact: true })
    .click();
  assert.equal(await page.locator(".shelf-books button").count(), 1);
}
await seed(10);
const saved = await page.evaluate(() =>
  localStorage.getItem("viva-progress-v1"),
);
await page.getByRole("button", { name: "Modo infinito", exact: true }).click();
assert.equal(await page.locator(".moves strong").innerText(), "∞");
// Play until the first renewed moment, keeping the same mounted board.
for (let n = 0; n < 65; n++) {
  if ((await page.locator(".game-header").innerText()).includes("Momento 2"))
    break;
  if (await page.locator(".victory-shine").count()) {
    await page.waitForTimeout(2400);
    continue;
  }
  const b = await page.locator(".tile").evaluateAll((els: any[]) =>
    els.map((e) => ({
      kind: Number(e.dataset.kind),
      special: e.dataset.special || undefined,
    })),
  );
  const board = b.map((t: any) => tile(t.kind, t.special));
  const c = moves(board)
    .map(([a, b]) => {
      const next = swap(board, a, b),
        w = resolveWave(
          next,
          b,
          [a, b].filter((i) => next[i].special),
        );
      return { a, b, score: w.clear.length + w.created.length * 18 };
    })
    .sort((a, b) => b.score - a.score)[0];
  await page.locator(".tile").nth(c.a).click();
  await page.locator(".tile").nth(c.b).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".victory-shine") ||
      document.querySelector(".board")?.getAttribute("aria-busy") === "false",
  );
}
assert.ok(
  (await page.locator(".game-header").innerText()).includes("Momento 2"),
);
assert.equal(await page.locator(".reward").count(), 0);
await page.getByRole("button", { name: "Pausar partida" }).click();
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
assert.equal(
  await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
  saved,
);
await page.getByRole("button", { name: "Ver fases" }).click();
await page.locator(".level-card").first().click();
await playRound(false);
assert.equal(await page.locator(".reward-book,.reward-intro").count(), 0);
await page
  .getByRole("button", { name: "Voltar à biblioteca", exact: true })
  .click();
assert.equal(
  await page.evaluate(() => localStorage.getItem("viva-progress-v1")),
  saved,
);
assert.equal(await page.locator(".qa-button,.qa-tools").count(), 0);
assert.deepEqual(errors, []);
await writeFile(
  `test-results/premium-${engine}-report.json`,
  JSON.stringify(
    {
      layouts,
      difficulties: played,
      portraitFallback: true,
      endlessContinues: true,
      progressPreserved: true,
      errors,
    },
    null,
    2,
  ),
);
console.log(engine, { layouts, played, errors });
await browser.close();
