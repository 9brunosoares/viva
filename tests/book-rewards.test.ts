import test from "node:test";
import assert from "node:assert/strict";
import { books, campaignBookIds } from "../src/config";
import {
  fresh,
  validate,
  load,
  save,
  complete,
  acceptMilestoneBook,
  finishMilestone,
} from "../src/progress";

const expected = [
  "O Código Da Vinci",
  "A Sombra do Vento",
  "Verity",
  "Se Houver Amanhã",
  "O Caçador de Pipas",
  "O Livro dos Espíritos",
  "Comer, Rezar, Amar",
  "Nosso Lar",
  "A Paciente Silenciosa",
  "A Biblioteca da Meia-Noite",
];
test("each phase grants the requested actual book ID and title, without randomness", () => {
  assert.deepEqual(campaignBookIds, [1, 9, 8, 5, 2, 4, 10, 6, 3, 7]);
  assert.deepEqual(
    campaignBookIds.map((id) => books.find((b) => b.id === id)?.title),
    expected,
  );
  const random = Math.random;
  try {
    Math.random = () => {
      throw Error("reward order must never draw randomness");
    };
    const a = fresh(),
      b = fresh();
    assert.deepEqual(a.order, campaignBookIds);
    assert.deepEqual(a.order, b.order);
    assert.notEqual(a.order, b.order);
  } finally {
    Math.random = random;
  }
});
test("fixed campaign saves every book once, including interruptions at Blade and family", () => {
  let p = fresh(),
    raw = "";
  const storage = {
    getItem: () => raw,
    setItem: (_: string, value: string) => {
      raw = value;
    },
  };
  for (let stage = 1; stage <= 10; stage++) {
    p = complete(p, stage);
    assert.equal(
      books.find((b) => b.id === p.order[stage - 1])?.title,
      expected[stage - 1],
    );
    assert.ok(save(p, storage));
    assert.deepEqual(load(storage).progress, p);
    assert.deepEqual(complete(p, stage), p);
    if (stage === 5 || stage === 10) {
      assert.equal(p.pendingCelebration?.bookId, campaignBookIds[stage - 1]);
      p = acceptMilestoneBook(p);
      save(p, storage);
      p = load(storage).progress;
      assert.equal(p.pendingCelebration?.step, "reveal");
    }
    p = finishMilestone(p);
    assert.equal(new Set(p.order.slice(0, p.completed.length)).size, stage);
  }
  assert.equal(p.completed.length, 10);
  assert.ok(validate(p));
});
test("incompatible experimental permutations are discarded, while canonical saves round-trip", () => {
  const old = {
    ...fresh(),
    order: [7, 2, 9, 1, 8, 4, 10, 3, 6, 5],
    completed: [1, 2, 3, 4],
  };
  assert.equal(validate(old), false);
  const restored = load({ getItem: () => JSON.stringify(old) });
  assert.deepEqual(restored.progress, fresh());
  assert.ok(restored.warning);
  assert.equal(validate({ ...fresh(), order: Array(10).fill(1) }), false);
  assert.equal(validate({ ...fresh(), order: Array(10) }), false);
});
