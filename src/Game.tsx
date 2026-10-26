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
} from "./engine";
import { sound } from "./audio";
import { useDialog } from "./useDialog";
import ComboEffects from "./ComboEffects";
import { hapticPower } from "./haptics";
type Props = {
  level: Level;
  audio: boolean;
  motion: boolean;
  onWin: () => void;
  onExit: () => void;
  endless?: boolean;
};
export default function Game({
  level,
  audio,
  motion,
  onWin,
  onExit,
  endless = false,
}: Props) {
  const [board, setBoard] = useState<Board>(() => createBoard());
  const current = useRef(board);
  const [selected, select] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [clearing, setClearing] = useState<number[]>([]);
  const lock = useRef(false),
    alive = useRef(true),
    [remaining, setRemaining] = useState(level.moves),
    [counts, setCounts] = useState([0, 0, 0, 0, 0, 0]);
  const [powers, setPowers] = useState(0),
    [cascades, setCascades] = useState(0),
    [paused, pause] = useState(false),
    [lost, setLost] = useState(false),
    [message, setMessage] = useState("Combine 3 peças iguais. Sem pressa.");
  const [hint, setHint] = useState<number[]>([]),
    [offset, setOffset] = useState<Record<number, number>>({});
  const [effects, setEffects] = useState<Wave["effects"]>([]),
    [created, setCreated] = useState<number[]>([]);
  const [effectCount, setEffectCount] = useState(0);
  const [clearDelays, setClearDelays] = useState<Record<number, number>>({});
  const [victory, setVictory] = useState<"" | "shine" | "leave">("");
  const [lastItems, setLastItems] = useState<{ index: number; kind: number }[]>(
    [],
  );
  const [round, setRound] = useState(1);
  const drag = useRef<{ i: number; x: number; y: number } | null>(null),
    suppress = useRef(false);
  const grid = useRef<HTMLDivElement>(null),
    previous = useRef(board);
  useLayoutEffect(() => {
    if (motion && grid.current) {
      const positions = new Map(previous.current.map((t, i) => [t.id, i]));
      Array.from(grid.current.children).forEach((node, i) => {
        const before = positions.get(board[i].id);
        if (before === undefined || before === i) return;
        const el = node as HTMLElement;
        el.animate(
          [
            {
              transform: `translate(${((before % COLS) - (i % COLS)) * (el.offsetWidth + 3)}px,${(Math.floor(before / COLS) - Math.floor(i / COLS)) * (el.offsetHeight + 3)}px)`,
            },
            { transform: "translate(0,0)" },
          ],
          { duration: 170, easing: "ease-out" },
        );
      });
    }
    previous.current = board;
  }, [board, motion]);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  useDialog(paused || lost);
  const wait = (ms: number) =>
    new Promise((r) => setTimeout(r, motion ? ms : 25));
  function show(b: Board) {
    current.current = b;
    setBoard(b);
  }
  function restart() {
    if (lock.current) return;
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
    setLost(false);
    setVictory("");
    setRound(1);
    pause(false);
    setMessage("Um novo começo. Vamos juntas!");
  }
  async function play(a: number, b: number) {
    if (lock.current || paused || lost) return;
    lock.current = true;
    setBusy(true);
    select(null);
    setHint([]);
    const before = current.current;
    if (!validSwap(before, a, b)) {
      setOffset({ [a]: b - a, [b]: a - b });
      await wait(160);
      setOffset({});
      setMessage("Tente outra combinação.");
      await wait(150);
      lock.current = false;
      setBusy(false);
      return;
    }
    const swapped = swap(before, a, b);
    const colorKind =
      swapped[a].special === "color"
        ? swapped[b].kind
        : swapped[b].special === "color"
          ? swapped[a].kind
          : undefined;
    show(swapped);
    await wait(160);
    let active = [a, b].filter((i) => swapped[i].special);
    let next = swapped;
    let total = counts.slice(),
      power = powers,
      chain = cascades,
      depth = 0;
    while (matches(next).length || active.length) {
      const wave = resolveWave(
        next,
        b,
        active,
        active.length ? colorKind : undefined,
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
      sound(
        audio,
        wave.powers > 1
          ? "duo"
          : wave.powers
            ? "power"
            : depth >= 2
              ? "cascade"
              : "match",
      );
      await wait(
        wave.powers > 1
          ? 940
          : wave.effects.some((e) => e.type === "color")
            ? 860
            : wave.powers
              ? 740
              : 210,
      );
      if (!alive.current) return;
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
      setCreated(wave.created);
      if (wave.created.length) sound(audio, "create");
      next = fall(wave.board, wave.clear);
      show(next);
      depth++;
      setMessage(
        wave.created.length
          ? "Um poder! Troque para ver a magia."
          : depth > 1
            ? `${depth} combinações em sequência!`
            : "Que bela combinação!",
      );
      await wait(190);
      setCreated([]);
      if (depth >= 80) {
        next = createBoard();
        show(next);
        break;
      }
    }
    const playable = ensurePlayable(next);
    if (playable !== next) {
      show(playable);
      setMessage("Peças novas, novas chances.");
    }
    const left = remaining - 1;
    setRemaining(left);
    if (
      level.targets.every((t) => total[t.kind] >= t.amount) &&
      power >= level.powers &&
      chain >= level.cascades
    ) {
      sound(audio, "win");
      setVictory("shine");
      setMessage("Conseguiu!");
      await new Promise((r) => setTimeout(r, depth >= 4 ? 2600 : 2200));
      if (!alive.current) return;
      if (endless) {
        setCounts([0, 0, 0, 0, 0, 0]);
        setPowers(0);
        setCascades(0);
        setRound((n) => n + 1);
        setRemaining(level.moves);
        setVictory("");
        setMessage("Mais um momento de alegria. Sem pressa.");
      } else {
        setVictory("leave");
        await wait(320);
        if (alive.current) onWin();
        return;
      }
    } else if (left <= 0 && !endless) setLost(true);
    lock.current = false;
    setBusy(false);
  }
  function tap(i: number) {
    if (lock.current || paused || lost) return;
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
    else select(i);
  }
  return (
    <section
      className={`game-screen ${victory ? `victory-${victory}` : ""}`}
      style={{
        backgroundImage: `linear-gradient(#102e2980,#102e29b0),url('${asset(`scene-${level.id}`)}')`,
      }}
    >
      <header className="game-header">
        <button
          className="round atlas-control pause-control"
          disabled={busy}
          onClick={(e) => {
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
          <div className={powers >= level.powers ? "done" : ""}>
            <img src={asset("power-0")} alt="Ativar poderes" />
            <strong>
              {Math.min(powers, level.powers)}/{level.powers}
            </strong>
          </div>
        )}
        {level.cascades > 0 && (
          <div className={cascades >= level.cascades ? "done" : ""}>
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
              className={`tile ${t.special ? "special special-" + t.special : ""} ${created.includes(i) ? "power-born" : ""} ${effects.length && clearing.includes(i) ? "power-hit" : ""} ${selected === i ? "selected" : ""} ${clearing.includes(i) ? "clearing" : ""} ${hint.includes(i) ? "hint" : ""}`}
              style={
                {
                  "--clear-delay": `${clearDelays[i] ?? 0}ms`,
                  ...(offset[i]
                    ? {
                        transform: `translate(${Math.abs(offset[i]) === 1 ? offset[i] * 100 : 0}%,${Math.abs(offset[i]) === COLS ? (offset[i] / COLS) * 100 : 0}%)`,
                      }
                    : {}),
                } as React.CSSProperties
              }
              data-kind={t.kind}
              data-special={t.special}
              aria-label={`${names[level.id - 1][t.kind]}${t.special ? ", poder " + { row: "horizontal", column: "vertical", area: "em área", color: "de cores" }[t.special] : ""}, linha ${Math.floor(i / COLS) + 1}, coluna ${(i % COLS) + 1}`}
              aria-pressed={selected === i}
              disabled={paused || lost}
              onClick={() => {
                if (suppress.current) {
                  suppress.current = false;
                  return;
                }
                tap(i);
              }}
              onPointerDown={(e) => {
                if (lock.current) return;
                drag.current = { i, x: e.clientX, y: e.clientY };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                drag.current = null;
                suppress.current = false;
              }}
              onPointerUp={(e) => {
                const d = drag.current;
                drag.current = null;
                if (!d || lock.current) return;
                const rotated =
                  document.documentElement.classList.contains(
                    "portrait-fallback",
                  );
                const dx = rotated ? e.clientY - d.y : e.clientX - d.x,
                  dy = rotated ? -(e.clientX - d.x) : e.clientY - d.y;
                if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
                const target =
                  d.i +
                  (Math.abs(dx) > Math.abs(dy)
                    ? Math.sign(dx)
                    : Math.sign(dy) * COLS);
                suppress.current = true;
                if (
                  target >= 0 &&
                  target < 56 &&
                  (Math.abs(dx) <= Math.abs(dy) ||
                    Math.floor(target / COLS) === Math.floor(d.i / COLS))
                )
                  void play(d.i, target);
              }}
            >
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
            </button>
          ))}
        </div>
        <ComboEffects effects={effects} affected={clearing} />
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
      <p className="game-message" role="status">
        {message}
      </p>
      <div className="game-tools">
        <button
          className="text-button light"
          disabled={busy || paused || lost}
          onClick={() => {
            const m = moves(current.current)[0];
            if (m) setHint(m);
            setMessage("Troque as peças que brilham.");
          }}
        >
          Uma dica
        </button>
      </div>
      {(paused || lost) && (
        <div className="modal-backdrop">
          <div className="modal">
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
            <button onClick={restart}>Recomeçar fase</button>
            <button onClick={onExit}>Voltar à biblioteca</button>
            <p className="muted">Ao sair, esta partida recomeça.</p>
          </div>
        </div>
      )}
    </section>
  );
}
