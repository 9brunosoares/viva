// Test-only entry, never an input to the production build.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { createBoard, resolveWave, tile, Special } from "../src/engine";
import { asset } from "../src/config";
import ComboEffects from "../src/ComboEffects";
import { useReducedMotion } from "../src/useReducedMotion";
import "../src/style.css";
import "../src/gameplay-vfx.css";
const mode = new URLSearchParams(location.search).get("type") || "row";
let seed = 123;
const board = createBoard(() => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
});
const special = mode === "combined" ? "row" : (mode as Special);
board[24] = tile(board[24].kind, special);
if (mode === "combined") board[25] = tile(board[25].kind, "column");
const wave = resolveWave(
  board,
  undefined,
  mode === "combined" ? [24, 25] : [24],
  2,
);
function Fixture() {
  const [active, setActive] = useState(false),
    reduced = useReducedMotion();
  return (
    <main className={`app ${reduced ? "reduced" : ""}`}>
      <section className="game-screen" style={{ background: "#224b37" }}>
        <h1>Verificação · {mode}</h1>
        <div
          className={`board-wrap ${active ? "power-active" : ""} ${mode === "combined" ? "powers-combined" : ""}`}
        >
          <div className="board">
            {board.map((t, i) => (
              <button
                key={t.id}
                className={`tile ${t.special ? "special special-" + t.special : ""} ${active && wave.clear.includes(i) ? "power-hit clearing" : ""}`}
              >
                <img
                  src={asset(
                    t.special
                      ? `power-${{ row: 0, column: 1, area: 2, color: 3 }[t.special]}`
                      : `tile-1-${t.kind}`,
                  )}
                  alt=""
                />
                {t.special && (
                  <span className="special-badge">
                    {
                      { row: "↔", column: "↕", area: "✦", color: "✧" }[
                        t.special
                      ]
                    }
                  </span>
                )}
              </button>
            ))}
          </div>
          <ComboEffects
            effects={active ? wave.effects : []}
            affected={wave.clear}
          />
        </div>
        <button onClick={() => setActive(true)}>Ativar</button>
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
