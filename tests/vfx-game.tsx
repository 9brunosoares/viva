// Development-only harness: runs the real Game component, outside the release.
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import Game from "../src/Game";
import { useReducedMotion } from "../src/useReducedMotion";
import { usePortrait } from "../src/usePortrait";
import { scenario } from "./vfx-scenarios";
import { audioDirector, unlockAudio } from "../src/audio";
import { levels } from "../src/config";
import type { GameSnapshot } from "../src/session";
import "../src/style.css";
import "../src/gameplay-vfx.css";
const mode = new URLSearchParams(location.search).get("type") || "3";
const audible = new URLSearchParams(location.search).get("sound") === "1";
const endless = new URLSearchParams(location.search).get("endless") === "1";
const remaining = Number(
  new URLSearchParams(location.search).get("remaining") ?? 100,
);
let randomSeed = Number(
  new URLSearchParams(location.search).get("seed") || 837,
);
Math.random = () => {
  randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0;
  return randomSeed / 4294967296;
};
const { board } = scenario(mode);
function Fixture() {
  useEffect(() => {
    if (audible) {
      (window as any).__audio = audioDirector;
      (window as any).__audioSync = [];
      const effect = audioDirector.effect.bind(audioDirector);
      audioDirector.effect = (name, options) => {
        if (/^match|^power$|^cascade$|^duo$|^create$|^win$/.test(name))
          (window as any).__audioSync.push({
            name,
            clearing: !!document.querySelector(".tile.clearing"),
            birth: !!document.querySelector(".power-born"),
            at: performance.now(),
          });
        return effect(name, options);
      };
      audioDirector.prepare();
    }
    return () => {
      if (audible) audioDirector.dispose();
    };
  }, []);
  const reduced = useReducedMotion();
  usePortrait();
  const [won, setWon] = useState(false),
    [mounted, setMounted] = useState(true);
  useEffect(() => {
    (window as any).__onWinCalls = 0;
    (window as any).__snapshots = [];
    (window as any).__unmount = () => setMounted(false);
    (window as any).__mount = () => setMounted(true);
    return () => {
      delete (window as any).__unmount;
      delete (window as any).__mount;
    };
  }, []);
  return (
    <main
      className={`app ${reduced ? "reduced" : ""}`}
      onPointerDown={audible ? unlockAudio : undefined}
      onClickCapture={audible ? unlockAudio : undefined}
    >
      {mounted && !won ? (
        <Game
          level={{
            ...levels[0],
            moves: 100,
            targets: [{ kind: 0, amount: mode === "win" ? 3 : 999 }],
            powers: 0,
            cascades: 0,
          }}
          initialSnapshot={{
            board,
            remaining,
            counts: mode === "dead" ? [2, 1, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0],
            powers: mode === "dead" ? 2 : 0,
            cascades: mode === "dead" ? 1 : 0,
            round: 1,
          }}
          motion={!reduced}
          endless={endless}
          audio={audible}
          onWin={() => {
            (window as any).__onWinCalls++;
            setWon(true);
          }}
          onExit={() => setMounted(false)}
          onSnapshot={(s: GameSnapshot) => {
            (window as any).__vfxSnapshot = s;
            (window as any).__snapshots?.push(s);
          }}
        />
      ) : (
        <section className="page">
          <h1>{won ? "Vitória verificada" : "Partida encerrada"}</h1>
        </section>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
