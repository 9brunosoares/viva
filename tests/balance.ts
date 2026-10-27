import { writeFile } from "node:fs/promises";
import { levels } from "../src/config";
import { balancedLevel, Difficulty } from "../src/difficulty";
import {
  createBoard,
  moves,
  swap,
  resolveWave,
  matches,
  fall,
  ensurePlayable,
} from "../src/engine";
const results = [];
for (const difficulty of ["easy", "medium", "hard"] as Difficulty[]) {
  for (const base of levels) {
    const level = balancedLevel(base, difficulty);
    let wins = 0,
      played = 0,
      activated = 0,
      created = 0,
      reshuffles = 0;
    let legalSum = 0,
      states = 0,
      minLegal = Infinity,
      wavesTotal = 0,
      maxWaves = 0;
    const exposure = Array(7).fill(0);
    const attempts = Number(process.env.BALANCE_SAMPLES || 24);
    for (let seed = 1; seed <= attempts; seed++) {
      let state = seed * 9127 + base.id * 701;
      const rng = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
      };
      let board = createBoard(rng, level.rules),
        counts = Array(
          Math.max(
            6,
            ...(level.rules?.kinds ?? [0, 1, 2, 3, 4, 5]).map((k) => k + 1),
          ),
        ).fill(0),
        powers = 0,
        cascades = 0;
      for (let turn = 0; turn < level.moves; turn++) {
        const options = moves(board);
        legalSum += options.length;
        states++;
        minLegal = Math.min(minLegal, options.length);
        board.forEach((t) => exposure[t.kind]++);
        if (!options.length) throw Error("unplayable board");
        const choice = options
          .map(([a, b]) => {
            const n = swap(board, a, b),
              active = [a, b].filter((i) => n[i].special);
            const colorKind =
              n[a].special === "color"
                ? n[b].kind
                : n[b].special === "color"
                  ? n[a].kind
                  : undefined;
            const wave = resolveWave(n, b, active, colorKind, level.rules);
            const useful = level.targets.reduce(
              (sum, t) =>
                sum +
                Math.min(
                  Math.max(0, t.amount - counts[t.kind]),
                  wave.collected[t.kind],
                ),
              0,
            );
            return {
              a,
              b,
              colorKind,
              score:
                useful * 2 +
                wave.clear.length +
                wave.created.length *
                  (process.env.BALANCE_STRATEGY === "powers" ? 24 : 14) +
                wave.powers * 5,
            };
          })
          .sort((a, b) => b.score - a.score)[0];
        board = swap(board, choice.a, choice.b);
        let active = [choice.a, choice.b].filter((i) => board[i].special),
          depth = 0;
        while (matches(board).length || active.length) {
          const wave = resolveWave(
            board,
            choice.b,
            active,
            active.length ? choice.colorKind : undefined,
            level.rules,
          );
          active = [];
          counts = counts.map((n, i) => n + (wave.collected[i] ?? 0));
          powers += wave.powers;
          activated += wave.powers;
          created += wave.created.length;
          if (depth > 0) cascades++;
          board = fall(wave.board, wave.clear, rng, level.rules);
          if (++depth >= 80) {
            board = createBoard(rng, level.rules);
            break;
          }
        }
        const next = ensurePlayable(board, rng, level.rules);
        wavesTotal += depth;
        maxWaves = Math.max(maxWaves, depth);
        if (next !== board) reshuffles++;
        board = next;
        played++;
        if (
          level.targets.every((t) => counts[t.kind] >= t.amount) &&
          powers >= level.powers &&
          cascades >= level.cascades
        ) {
          wins++;
          break;
        }
      }
    }
    results.push({
      difficulty,
      stage: base.id,
      attempts,
      wins,
      winRate: wins / attempts,
      meanMoves: Math.round((played / attempts) * 10) / 10,
      estimatedSecondsAt3SecondsPerMove: Math.round((played / attempts) * 3),
      createdPerGame: Math.round((created / attempts) * 10) / 10,
      activatedPerGame: Math.round((activated / attempts) * 10) / 10,
      reshuffles,
      meanLegalMoves: Math.round((legalSum / states) * 100) / 100,
      minLegalMoves: minLegal,
      meanWavesPerMove: Math.round((wavesTotal / played) * 100) / 100,
      maxWaves,
      stableBoardPieceExposure: exposure.map(
        (n) => Math.round((n / (states * 56)) * 10000) / 10000,
      ),
    });
  }
  console.log(
    difficulty,
    results
      .filter((r) => r.difficulty === difficulty)
      .map((r) => `${r.stage}:${r.wins}/${r.attempts} ${r.meanMoves}moves`)
      .join(" | "),
  );
}
await writeFile(
  `test-results/${process.env.BALANCE_REPORT || "balance-report.json"}`,
  JSON.stringify(
    {
      policy:
        "seeded greedy bot; 3 seconds/move is an assumption, excludes extra FX and user thinking",
      results,
    },
    null,
    2,
  ),
);
