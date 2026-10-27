import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { asset, Level, names } from "./config";
import {
  Board,
  createBoard,
  matches,
  swap,
  validSwap,
  resolveWave,
  fall,
  ensurePlayable,
  moves,
  COLS,
  Wave,
  tile,
  adjacent,
} from "./engine";
import type { GameSnapshot } from "./session";
import { sound, waveSound } from "./audio";
import { useDialog } from "./useDialog";
import ComboEffects from "./ComboEffects";
import { hapticPower } from "./haptics";
import { useTileMotion, MotionPhase } from "./useTileMotion";
import { useGameVfx } from "./useGameVfx";
import { feedbackProfile, fallWait } from "./vfx";
import { TurnSequence } from "./TurnSequence";
import { useBoardInput } from "./useBoardInput";
import { chooseHint } from "./hint";

type TurnPhase =
  | "idle"
  | "swapping"
  | "resolving"
  | "falling"
  | "recovering"
  | "completing"
  | "transitioning";
type Props = {
  level: Level;
  audio: boolean;
  motion: boolean;
  onWin: () => void;
  onExit: () => void;
  endless?: boolean;
  initialSnapshot?: GameSnapshot;
  onSnapshot?: (snapshot: GameSnapshot) => void;
};
export default function Game({
  level,
  audio,
  motion,
  onWin,
  onExit,
  endless = false,
  initialSnapshot,
  onSnapshot,
}: Props) {
  const [board, setBoard] = useState<Board>(() =>
    initialSnapshot
      ? initialSnapshot.board.map((t) => tile(t.kind, t.special))
      : createBoard(),
  );
  const current = useRef(board);
  const [selected, setSelected] = useState<number | null>(null),
    [phase, setPhase] = useState<TurnPhase>("idle"),
    [clearing, setClearing] = useState<number[]>([]);
  const busy = phase !== "idle";
  const selection = useRef<number | null>(null);
  function select(index: number | null) {
    selection.current = index;
    setSelected(index);
  }
  const sequence = useRef(new TurnSequence());
  const lock = useRef(false),
    alive = useRef(true),
    [remaining, setRemaining] = useState(
      initialSnapshot?.remaining ?? level.moves,
    ),
    [counts, setCounts] = useState(
      initialSnapshot?.counts ?? [0, 0, 0, 0, 0, 0],
    );
  const [powers, setPowers] = useState(initialSnapshot?.powers ?? 0),
    [cascades, setCascades] = useState(initialSnapshot?.cascades ?? 0),
    [paused, pause] = useState(false),
    [lost, setLost] = useState(!endless && initialSnapshot?.remaining === 0),
    [message, setMessage] = useState("Combine 3 peças iguais. Sem pressa.");
  const [hint, setHint] = useState<number[]>([]),
    [invalid, setInvalid] = useState<number[]>([]);
  const [waveVisual, setWaveVisual] = useState<{
    id: number;
    tier: number;
    depth: number;
    powers: number;
    power?: Wave["effects"][number]["type"];
    clearMs: number;
  } | null>(null);
  const waveSerial = useRef(0);
  const [effects, setEffects] = useState<Wave["effects"]>([]),
    [created, setCreated] = useState<number[]>([]);
  const [effectCount, setEffectCount] = useState(0);
  const [clearDelays, setClearDelays] = useState<Record<number, number>>({});
  const [victory, setVictory] = useState<"" | "shine" | "leave">("");
  const [lastItems, setLastItems] = useState<{ index: number; kind: number }[]>(
    [],
  );
  const [round, setRound] = useState(initialSnapshot?.round ?? 1);
  const [recovery, setRecovery] = useState<"out" | "in" | null>(null);
  const [activity, setActivity] = useState(0);
  const manualHint = useRef(false);
  function interact() {
    manualHint.current = false;
    setHint([]);
    setActivity((n) => n + 1);
  }
  const input = useBoardInput({
    enabled: !busy && !paused && !lost,
    canInteract: () => !lock.current && !paused && !lost,
    onTap: tap,
    onSwap: (a, b) => {
      void play(a, b);
    },
    onActivity: interact,
  });
  const grid = useRef<HTMLDivElement>(null),
    screen = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const motionPhase = useRef<MotionPhase>({ kind: "spawn", depth: 0 });
  const animateTile = useTileMotion(grid, board, motion, motionPhase);
  const vfx = useGameVfx(canvas, screen, grid, level.id, motion);
  const soundedWave = useRef(0),
    soundedBirth = useRef(created);
  useLayoutEffect(() => {
    if (alive.current && waveVisual && soundedWave.current !== waveVisual.id) {
      soundedWave.current = waveVisual.id;
      waveSound(audio, waveVisual, motion);
    }
  }, [waveVisual, audio, motion]);
  useLayoutEffect(() => {
    if (alive.current && created.length && soundedBirth.current !== created)
      sound(audio, "create");
    soundedBirth.current = created;
  }, [created, audio, motion]);
  useEffect(() => {
    alive.current = true;
    // A legacy or interrupted save may contain a stable board with no legal move.
    if (!lost && !moves(current.current).length) {
      const turn = sequence.current.begin();
      lock.current = true;
      setPhase("recovering");
      setRecovery("out");
      setMessage("Peças novas, novas chances.");
      void (async () => {
        if (!(await wait(140, turn))) return;
        motionPhase.current = { kind: "reset", depth: 0 };
        setRecovery("in");
        show(ensurePlayable(current.current));
        if (!(await wait(390, turn))) return;
        lock.current = false;
        setRecovery(null);
        setPhase("idle");
      })();
    }
    return () => {
      alive.current = false;
      sequence.current.cancel();
    };
  }, []);
  useDialog(paused || lost, paused ? () => pause(false) : undefined);
  useEffect(() => {
    if (!lock.current && !busy && !victory)
      onSnapshot?.({ board, remaining, counts, powers, cascades, round });
  }, [
    board,
    remaining,
    counts,
    powers,
    cascades,
    round,
    busy,
    victory,
    onSnapshot,
  ]);
  const wait = (ms: number, turn: number) =>
    sequence.current.wait(motion ? ms : 25, turn);
  useEffect(() => {
    if (busy || paused || lost || victory || input.pressed !== null) return;
    let appear: ReturnType<typeof setTimeout>,
      fade: ReturnType<typeof setTimeout>;
    const clear = () => {
      clearTimeout(appear);
      clearTimeout(fade);
      setHint([]);
    };
    const arm = () => {
      clear();
      if (document.hidden) return;
      appear = setTimeout(() => {
        if (lock.current) return;
        setHint(
          chooseHint(
            current.current,
            level.targets,
            counts,
            powers < level.powers,
          ),
        );
        fade = setTimeout(() => setHint([]), 1600);
      }, 9000);
    };
    const manual = manualHint.current;
    manualHint.current = false;
    if (manual) fade = setTimeout(() => setHint([]), 1600);
    else if (selected === null) arm();
    const visibility = () => {
      if (manual || selected !== null) clear();
      else arm();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearTimeout(appear);
      clearTimeout(fade);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [
    board,
    activity,
    busy,
    paused,
    lost,
    victory,
    selected,
    input.pressed,
    counts,
    powers,
    level,
  ]);
  function show(b: Board) {
    current.current = b;
    setBoard(b);
  }
  function restart() {
    if (lock.current) return;
    sequence.current.cancel();
    setRecovery(null);
    motionPhase.current = { kind: "reset", depth: 0 };
    show(createBoard());
    setRemaining(level.moves);
    setCounts([0, 0, 0, 0, 0, 0]);
    setPowers(0);
    setCascades(0);
    select(null);
    setHint([]);
    setClearing([]);
    setEffects([]);
    setCreated([]);
    setClearDelays({});
    setInvalid([]);
    setWaveVisual(null);
    setLost(false);
    setVictory("");
    setRound(1);
    pause(false);
    setMessage("Um novo começo. Vamos juntas!");
  }
  async function play(a: number, b: number) {
    if (lock.current || paused || lost || !adjacent(a, b)) return;
    const turn = sequence.current.begin();
    lock.current = true;
    setPhase("swapping");
    select(null);
    setHint([]);
    const before = current.current;
    if (!validSwap(before, a, b)) {
      setInvalid([a, b]);
      if (motion && grid.current) {
        const gap = parseFloat(getComputedStyle(grid.current).columnGap) || 0;
        for (const [from, to] of [
          [a, b],
          [b, a],
        ]) {
          const el = grid.current.children[from] as HTMLElement;
          const dx = ((to % COLS) - (from % COLS)) * (el.offsetWidth + gap);
          const dy =
            (Math.floor(to / COLS) - Math.floor(from / COLS)) *
            (el.offsetHeight + gap);
          animateTile(
            el,
            [
              { transform: "translate(0,0)" },
              { transform: `translate(${dx}px,${dy}px)`, offset: 0.46 },
              { transform: "translate(0,0)" },
            ],
            { duration: 330, easing: "cubic-bezier(.2,.75,.3,1)" },
          );
        }
      }
      if (!(await wait(340, turn))) return;
      setInvalid([]);
      setMessage("Tente outra combinação.");
      lock.current = false;
      setPhase("idle");
      return;
    }
    const swapped = swap(before, a, b);
    const colorKind =
      swapped[a].special === "color"
        ? swapped[b].kind
        : swapped[b].special === "color"
          ? swapped[a].kind
          : undefined;
    motionPhase.current = { kind: "swap", depth: 0 };
    show(swapped);
    if (!(await wait(210, turn))) return;
    let active = [a, b].filter((i) => swapped[i].special);
    let next = swapped;
    let total = counts.slice(),
      power = powers,
      chain = cascades,
      depth = 0;
    while (matches(next).length || active.length) {
      setPhase("resolving");
      const wave = resolveWave(
        next,
        b,
        active,
        active.length ? colorKind : undefined,
      );
      const profile = feedbackProfile(wave.board, wave, depth);
      setWaveVisual({
        id: ++waveSerial.current,
        tier: profile.tier,
        depth,
        powers: wave.powers,
        power: wave.effects[0]?.type,
        clearMs: profile.clearMs,
      });
      vfx.current?.wave(
        next,
        wave,
        depth,
        level.targets
          .filter((t) => total[t.kind] < t.amount && wave.collected[t.kind] > 0)
          .map((t) => t.kind),
      );
      active = [];
      if (wave.clear.length)
        setLastItems(
          wave.clear
            .slice(0, 8)
            .map((index) => ({ index, kind: next[index].kind })),
        );
      setClearing(wave.clear);
      setEffects(wave.effects);
      setEffectCount(wave.powers);
      const delays: Record<number, number> = {};
      if (wave.powers) {
        setMessage(
          wave.powers > 1 ? "Que encontro de poderes!" : "Olha essa magia!",
        );
        hapticPower(wave.powers > 1, !motion);
        for (const i of wave.clear) {
          const e = wave.effects[0];
          delays[i] =
            e?.type === "row"
              ? Math.abs((i % COLS) - (e.index % COLS)) * 22
              : e?.type === "column"
                ? Math.abs(Math.floor(i / COLS) - Math.floor(e.index / COLS)) *
                  22
                : Math.min(
                    120,
                    Math.hypot(
                      (i % COLS) - (e.index % COLS),
                      Math.floor(i / COLS) - Math.floor(e.index / COLS),
                    ) * 25,
                  );
        }
      }
      setClearDelays(delays);
      if (!(await wait(profile.clearMs, turn))) return;
      total = total.map((n, i) => n + wave.collected[i]);
      power += wave.powers;
      if (depth > 0) chain++;
      setCounts(total);
      setPowers(power);
      setCascades(chain);
      setClearing([]);
      setEffects([]);
      setEffectCount(0);
      setClearDelays({});
      setWaveVisual(null);
      const createdIds = new Set(wave.created.map((i) => wave.board[i].id));
      const beforeFall = next;
      next = fall(wave.board, wave.clear);
      const origins = new Map(wave.created.map((i) => [wave.board[i].id, i]));
      setCreated(next.flatMap((t, i) => (createdIds.has(t.id) ? [i] : [])));
      motionPhase.current = {
        kind: "fall",
        depth,
        origins,
      };
      setPhase("falling");
      show(next);
      depth++;
      setMessage(
        wave.created.length
          ? "Um poder! Troque para ver a magia."
          : depth > 1
            ? `${depth} combinações em sequência!`
            : "Que bela combinação!",
      );
      const stepY =
        ((grid.current?.firstElementChild as HTMLElement | null)
          ?.offsetHeight ?? 44) +
        (grid.current
          ? parseFloat(getComputedStyle(grid.current).rowGap) || 0
          : 0);
      if (
        !(await wait(
          fallWait(beforeFall, next, origins, depth - 1, stepY),
          turn,
        ))
      )
        return;
      setCreated([]);
      if (depth >= 80) {
        setPhase("recovering");
        setRecovery("in");
        motionPhase.current = { kind: "reset", depth: 0 };
        next = createBoard();
        show(next);
        setMessage("Peças novas, novas chances.");
        if (!(await wait(390, turn))) return;
        setRecovery(null);
        break;
      }
    }
    const playable = ensurePlayable(next);
    if (playable !== next) {
      setPhase("recovering");
      setRecovery("out");
      setMessage("Peças novas, novas chances.");
      if (!(await wait(140, turn))) return;
      motionPhase.current = { kind: "reset", depth: 0 };
      setRecovery("in");
      show(playable);
      if (!(await wait(390, turn))) return;
      setRecovery(null);
    }
    const left = remaining - 1;
    setRemaining(left);
    const won =
      level.targets.every((t) => total[t.kind] >= t.amount) &&
      power >= level.powers &&
      chain >= level.cascades;
    if (won) {
      setPhase("completing");
      sound(audio, "win");
      setVictory("shine");
      setMessage("Conseguiu!");
      if (!(await sequence.current.wait(depth >= 4 ? 2600 : 2200, turn)))
        return;
      if (endless) {
        setCounts([0, 0, 0, 0, 0, 0]);
        setPowers(0);
        setCascades(0);
        setRound((n) => n + 1);
        setRemaining(level.moves);
        setVictory("");
        setMessage("Mais um momento de alegria. Sem pressa.");
      } else {
        setPhase("transitioning");
        setVictory("leave");
        if (await wait(320, turn)) onWin();
        return;
      }
    } else if (left <= 0 && !endless) setLost(true);
    lock.current = false;
    setPhase("idle");
  }
  function tap(i: number) {
    if (lock.current || paused || lost) return;
    const selected = selection.current;
    sound(audio, "select");
    if (selected === null) {
      select(i);
      return;
    }
    if (selected === i) {
      select(null);
      return;
    }
    if (
      Math.abs(selected - i) === COLS ||
      (Math.floor(selected / COLS) === Math.floor(i / COLS) &&
        Math.abs(selected - i) === 1)
    )
      void play(selected, i);
    else {
      select(i);
    }
  }
  return (
    <section
      ref={screen}
      className={`game-screen ${victory ? `victory-${victory}` : ""}`}
      data-phase={phase}
      data-recovery={recovery}
      style={{
        backgroundImage: `linear-gradient(#102e2980,#102e29b0),url('${asset(`scene-${level.id}`)}')`,
      }}
    >
      <header className="game-header">
        <button
          className="round atlas-control pause-control"
          disabled={busy}
          onClick={(e) => {
            interact();
            e.currentTarget.focus({ preventScroll: true });
            pause(true);
          }}
          aria-label="Pausar partida"
        >
          <img src={asset("control-pause")} alt="" />
        </button>
        <div>
          <h1>{level.name}</h1>
          <span>
            {endless ? `Modo infinito · Momento ${round}` : `Fase ${level.id}`}
          </span>
        </div>
        <div className="moves">
          <strong>{endless ? "∞" : remaining}</strong>
          <small>{endless ? "sem pressa" : "jogadas"}</small>
        </div>
      </header>
      <div className="objectives" aria-label="Objetivos">
        {level.targets.map((t) => (
          <div
            data-objective-kind={t.kind}
            role="progressbar"
            aria-label={`${names[level.id - 1][t.kind]}${counts[t.kind] >= t.amount ? ": objetivo concluído" : ""}`}
            aria-valuemin={0}
            aria-valuemax={t.amount}
            aria-valuenow={Math.min(counts[t.kind], t.amount)}
            className={counts[t.kind] >= t.amount ? "done" : ""}
            key={t.kind}
          >
            <img
              src={asset(`tile-${level.id}-${t.kind}`)}
              alt={names[level.id - 1][t.kind]}
            />
            <strong>
              {Math.min(counts[t.kind], t.amount)}/{t.amount}
            </strong>
          </div>
        ))}
        {level.powers > 0 && (
          <div
            className={powers >= level.powers ? "done" : ""}
            role="progressbar"
            aria-label="Ativar poderes"
            aria-valuemin={0}
            aria-valuemax={level.powers}
            aria-valuenow={Math.min(powers, level.powers)}
          >
            <img src={asset("power-0")} alt="Ativar poderes" />
            <strong>
              {Math.min(powers, level.powers)}/{level.powers}
            </strong>
          </div>
        )}
        {level.cascades > 0 && (
          <div
            className={cascades >= level.cascades ? "done" : ""}
            role="progressbar"
            aria-label="Sequências"
            aria-valuemin={0}
            aria-valuemax={level.cascades}
            aria-valuenow={Math.min(cascades, level.cascades)}
          >
            <span>Sequências</span>
            <strong>
              {Math.min(cascades, level.cascades)}/{level.cascades}
            </strong>
          </div>
        )}
      </div>
      <div
        className={`board-wrap ${effects.length ? "power-active" : ""} ${effectCount > 1 ? "powers-combined" : ""}`}
      >
        <div
          ref={grid}
          className="board"
          role="group"
          aria-label="Tabuleiro de 7 colunas e 8 linhas"
          aria-busy={busy}
        >
          {board.map((t, i) => (
            <button
              key={t.id}
              className={`tile ${t.special ? "special special-" + t.special : ""} ${created.includes(i) ? "power-born" : ""} ${effects.length && clearing.includes(i) ? "power-hit" : ""} ${selected === i ? "selected" : ""} ${input.pressed === i ? "pressed" : ""} ${clearing.includes(i) ? "clearing" : ""} ${hint.includes(i) ? "hint" : ""} ${invalid.includes(i) ? "invalid" : ""}`}
              style={
                {
                  "--clear-delay": `${clearDelays[i] ?? 0}ms`,
                } as React.CSSProperties
              }
              data-kind={t.kind}
              data-special={t.special}
              aria-label={`${names[level.id - 1][t.kind]}${t.special ? ", poder " + { row: "horizontal", column: "vertical", area: "em área", color: "de cores" }[t.special] : ""}, linha ${Math.floor(i / COLS) + 1}, coluna ${(i % COLS) + 1}`}
              aria-pressed={selected === i}
              aria-disabled={busy || paused || lost}
              disabled={paused || lost}
              onClick={(e) => input.click(e, i)}
              onPointerDown={(e) => input.down(e, i)}
              onPointerMove={input.move}
              onPointerUp={input.up}
              onPointerCancel={input.cancel}
              onLostPointerCapture={input.cancel}
            >
              <span className="tile-visual">
                <img
                  draggable="false"
                  src={asset(
                    t.special
                      ? `power-${{ row: 0, column: 1, area: 2, color: 3 }[t.special]}`
                      : `tile-${level.id}-${t.kind}`,
                  )}
                  alt=""
                />
                {t.special && (
                  <span className="special-badge" aria-hidden="true">
                    {
                      { row: "↔", column: "↕", area: "✦", color: "✧" }[
                        t.special
                      ]
                    }
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
        <ComboEffects effects={effects} affected={clearing} />
        {waveVisual && (
          <span
            key={waveVisual.id}
            className={`match-aura match-tier-${waveVisual.tier}`}
            style={
              {
                "--cascade": Math.min(3, waveVisual.depth),
              } as React.CSSProperties
            }
            aria-hidden="true"
          />
        )}
        {victory && (
          <div className="victory-light" aria-hidden="true">
            <span className="victory-sweep" />
            {lastItems.map(({ index, kind }) => (
              <img
                key={index}
                src={asset(`tile-${level.id}-${kind}`)}
                alt=""
                style={
                  {
                    left: `${(((index % COLS) + 0.5) * 100) / COLS}%`,
                    top: `${((Math.floor(index / COLS) + 0.5) * 100) / 8}%`,
                    "--n": index % 5,
                  } as React.CSSProperties
                }
              />
            ))}
            <span className="victory-word">Conseguiu!</span>
          </div>
        )}
      </div>
      <canvas ref={canvas} className="game-vfx" aria-hidden="true" />
      <p className="game-message" role="status">
        {message}
      </p>
      <div className="game-tools">
        <button
          className="text-button light"
          disabled={busy || paused || lost}
          onClick={() => {
            interact();
            select(null);
            manualHint.current = true;
            setHint(
              chooseHint(
                current.current,
                level.targets,
                counts,
                powers < level.powers,
              ),
            );
            setMessage("Troque as peças que brilham.");
          }}
        >
          Uma dica
        </button>
      </div>
      {(paused || lost) && (
        <div className="modal-backdrop">
          <div className="modal game-menu">
            <small>NO SEU TEMPO</small>
            <h2>
              {lost ? "Vamos tentar de novo?" : "Uma pausa para respirar"}
            </h2>
            <p>
              {lost
                ? "Vamos de novo, sem pressa."
                : "A gente continua no seu tempo."}
            </p>
            {!lost && (
              <button className="primary" onClick={() => pause(false)}>
                Retomar
              </button>
            )}
            <button className={lost ? "primary" : undefined} onClick={restart}>
              Recomeçar fase
            </button>
            <button onClick={onExit}>Voltar à biblioteca</button>
            <p className="muted">Sua partida fica guardada.</p>
          </div>
        </div>
      )}
    </section>
  );
}
