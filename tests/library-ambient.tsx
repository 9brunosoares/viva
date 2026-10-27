// Local-only inspection surface. Not imported by the app and never included in dist.
// Uses the actual component, four source illustrations and production composition CSS.
import { createRoot } from "react-dom/client";
import { useState, type CSSProperties } from "react";
import LibraryAtmosphere, {
  useLibraryActivity,
} from "../src/LibraryAtmosphere";
import { useReducedMotion } from "../src/useReducedMotion";
import { usePortrait } from "../src/usePortrait";
import { asset } from "../src/config";
import "../src/style.css";
import "../src/library-life.css";
import "../src/app-finish.css";
import "./library-ambient.css";

function Inspector() {
  usePortrait();
  const reduced = useReducedMotion(),
    activity = useLibraryActivity(true, reduced);
  const [stage, setStage] = useState(0),
    [layer, setLayer] = useState("all"),
    [paused, setPaused] = useState(false),
    [quality, setQuality] = useState("auto");
  const mode = reduced ? "still" : quality === "auto" ? activity.mode : quality;
  return (
    <>
      <main
        className={`app ${reduced ? "reduced" : ""}`}
        data-diagnostic-layer={layer}
        data-diagnostic-paused={paused}
      >
        <section
          className="page library immersive"
          style={
            {
              "--room-art": `url('${asset(`library-${stage}`)}')`,
            } as CSSProperties
          }
        >
          <div className="library-stage">
            <div
              className="library-room library-alive"
              data-stage={stage}
              data-motion={mode}
              data-ambient={activity.active ? "active" : "paused"}
              data-attention="room"
            >
              <img
                className="room-image"
                src={asset(`library-${stage}`)}
                width={496}
                height={756}
                alt="Biblioteca original"
              />
              <LibraryAtmosphere
                key={stage}
                stage={stage}
                limited={mode !== "full"}
                still={mode === "still"}
              />
              <img
                className="library-foreground"
                src={asset("library-foreground")}
                alt=""
              />
            </div>
          </div>
        </section>
      </main>
      <aside className="ambient-inspector" aria-label="Diagnóstico local">
        <strong>Ambientação · diagnóstico local</strong>
        <small>Não altera conquistas e não integra a versão publicada.</small>
        <label>
          Ilustração{" "}
          <select
            aria-label="Estágio"
            value={stage}
            onChange={(e) => setStage(Number(e.target.value))}
          >
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                Estágio {n + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recursos{" "}
          <select
            aria-label="Qualidade"
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
          >
            <option value="auto">Automático</option>
            <option value="full">Completo</option>
            <option value="limited">Simplificado</option>
          </select>
        </label>
        <div className="ambient-layer-controls">
          {[
            ["all", "Tudo"],
            ["rays", "Raios"],
            ["dust", "Poeira"],
            ["light", "Luz"],
            ["reflection", "Reflexo"],
            ["none", "Original"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={layer === value}
              onClick={() => setLayer(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <button aria-pressed={paused} onClick={() => setPaused(!paused)}>
          {paused ? "Retomar animações" : "Pausar animações"}
        </button>
        <output>
          Modo: {mode} · {activity.active ? "ativo" : "pausado"}
        </output>
      </aside>
    </>
  );
}
if (import.meta.env.DEV)
  createRoot(document.getElementById("root")!).render(<Inspector />);
