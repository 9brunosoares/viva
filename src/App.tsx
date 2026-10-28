import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { asset, books, levels, names } from "./config";
import {
  complete,
  libraryState,
  load,
  Progress,
  save,
  isRevealed,
  acceptMilestoneBook,
  finishMilestone,
  milestoneStage,
} from "./progress";
import Game from "./Game";
import {
  sound,
  unlockAudio,
  audioDirector,
  readAudioPreferences,
  AUDIO_KEY,
} from "./audio";
import SoundToggle from "./SoundToggle";
import { restartJourney } from "./restart";
import { useReducedMotion } from "./useReducedMotion";
import { BRUNO_SIGNATURE } from "./narrative";
import { useDialog } from "./useDialog";
import Celebration from "./Celebration";
import BookViewer from "./BookViewer";
import FlatIcon from "./FlatIcon";
import LibraryScene from "./LibraryScene";
import RewardFlight, { type Flight } from "./RewardFlight";
import { obstacleSpec } from "./obstacles";
import {
  balancedLevel,
  Difficulty,
  DIFFICULTY_KEY,
  readDifficulty,
} from "./difficulty";
import { usePortrait } from "./usePortrait";
import StageIntro from "./StageIntro";
import { useSceneTransition } from "./useSceneTransition";
import { useDialogExit } from "./useDialogExit";
import { consumeUpdateReturn, usePwaUpdates } from "./usePwaUpdates";
import {
  GameSession,
  GameSnapshot,
  readSession,
  writeSession,
  storySeen,
  rememberStory,
  SESSION_KEY,
} from "./session";
type Screen =
  | "home"
  | "levels"
  | "library"
  | "intro"
  | "game"
  | "reward"
  | "celebration";
function preparedLevel(
  base: import("./config").Level,
  mode: Difficulty,
  endless: boolean,
) {
  const level = balancedLevel(base, mode, endless);
  return {
    ...level,
    obstacles: obstacleSpec(level, mode, endless),
  };
}
export default function App() {
  const [journey, setJourney] = useState(0);
  return <Journey key={journey} onRestarted={() => setJourney((n) => n + 1)} />;
}
function Journey({ onRestarted }: { onRestarted: () => void }) {
  usePortrait();
  const reduced = useReducedMotion();
  const appRoot = useRef<HTMLElement>(null);
  const [updateReturn] = useState(consumeUpdateReturn);
  const [difficulty, setDifficulty] = useState<Difficulty>(readDifficulty);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [firstGift, setFirstGift] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [giftIntro, setGiftIntro] = useState(false);
  const [bladePose, setBladePose] = useState(5);
  const initial = useRef<ReturnType<typeof load> | null>(null);
  if (!initial.current) {
    try {
      initial.current = load(localStorage);
    } catch {
      initial.current = load({
        getItem: () => {
          throw Error();
        },
      });
    }
  }
  const [activeSession, setActiveSession] = useState<GameSession | null>(() =>
    readSession(initial.current!.progress),
  );
  const activeRef = useRef(activeSession);
  const saved = useRef({ progress: true, session: true });
  const [playingLevel, setPlayingLevel] = useState(() =>
    activeSession
      ? preparedLevel(
          {
            ...levels[activeSession.stage - 1],
            name:
              activeSession.stage === 5 &&
              isRevealed(initial.current!.progress, "blade")
                ? "Blade"
                : levels[activeSession.stage - 1].name,
          },
          activeSession.difficulty,
          activeSession.endless,
        )
      : levels[0],
  );
  const saveMatch = useCallback((snapshot: GameSnapshot) => {
    if (!activeRef.current) return;
    activeRef.current = { ...activeRef.current, snapshot };
    saved.current.session = writeSession(activeRef.current);
  }, []);
  const [progress, setProgress] = useState<Progress>(initial.current.progress),
    [warning, setWarning] = useState(
      initial.current.warning
        ? "Não foi possível recuperar suas conquistas."
        : "",
    );
  const [audioPrefs, setAudioPrefs] = useState(() =>
    readAudioPreferences(initial.current!.progress.sound),
  );
  const [screen, setScreenState] = useState<Screen>(() =>
      initial.current!.progress.pendingCelebration
        ? initial.current!.progress.pendingCelebration.step === "book"
          ? "reward"
          : "celebration"
        : (updateReturn ??
          (activeSession
            ? activeSession.phase === "intro"
              ? "intro"
              : "game"
            : initial.current!.progress.completed.length
              ? "library"
              : "home")),
    ),
    [stage, setStage] = useState(() =>
      initial.current!.progress.pendingCelebration
        ? milestoneStage(initial.current!.progress.pendingCelebration.kind)
        : (activeSession?.stage ?? 1),
    ),
    [session, setSession] = useState(0),
    [infinite, setInfinite] = useState(activeSession?.endless ?? false);
  const setScreen = useSceneTransition(
    screen,
    setScreenState,
    appRoot,
    reduced,
  );
  const [book, setBook] = useState<number | null>(null),
    [portrait, setPortrait] = useState(false),
    [reward, setReward] = useState<number | null>(
      () => initial.current!.progress.pendingCelebration?.bookId ?? null,
    );
  const count = progress.completed.length,
    next = Math.min(10, count + 1),
    acquired = progress.order.slice(0, count);
  useEffect(() => {
    if (screen === "reward" && reward !== null && !giftIntro)
      sound(true, "book");
  }, [screen, reward, giftIntro]);
  const bladeKnown = isRevealed(progress, "blade"),
    familyKnown = isRevealed(progress, "family");
  const titleFor = (id: number) =>
    id === 5 && bladeKnown ? "Blade" : levels[id - 1].name;
  const [arrivingBook, setArrivingBook] = useState<number | null>(
    () => initial.current!.progress.pendingCelebration?.bookId ?? null,
  );
  const [bookArrival, setBookArrival] = useState<number | null>(null);
  useEffect(() => {
    if (screen !== "library" || arrivingBook === null) return;
    setBookArrival(arrivingBook);
    setArrivingBook(null);
  }, [screen, arrivingBook]);
  useEffect(() => {
    if (bookArrival === null) return;
    if (screen !== "library") {
      setBookArrival(null);
      return;
    }
    const timer = window.setTimeout(
      () => setBookArrival(null),
      reduced ? 0 : 1400,
    );
    return () => clearTimeout(timer);
  }, [screen, bookArrival, reduced]);
  useEffect(() => {
    audioDirector.configure(audioPrefs);
    try {
      localStorage.setItem(AUDIO_KEY, JSON.stringify(audioPrefs));
    } catch {}
  }, [audioPrefs]);
  useEffect(() => {
    audioDirector.prepare();
    const visibility = () => audioDirector.visibility(document.hidden);
    const hide = () => audioDirector.visibility(true);
    const show = () => audioDirector.visibility(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
      audioDirector.dispose();
    };
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    const heading = document.querySelector<HTMLElement>(".app>section h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    if (screen === "levels") {
      const list = document.querySelector(".level-list");
      (
        list?.querySelector<HTMLElement>('[aria-current="step"]') ??
        list?.lastElementChild
      )?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [screen]);
  useLayoutEffect(() => {
    // Commit the existing milestone step before its new screen becomes interactive.
    // A reload immediately after acceptance must never observe the previous step.
    try {
      saved.current.progress = save(progress, localStorage);
      if (!saved.current.progress)
        setWarning("Não foi possível guardar suas conquistas agora.");
    } catch {
      saved.current.progress = false;
      setWarning("Não foi possível guardar suas conquistas agora.");
    }
  }, [progress]);
  usePwaUpdates({
    safe:
      ["home", "library", "levels"].includes(screen) &&
      book === null &&
      !portrait &&
      !settingsOpen &&
      !progress.pendingCelebration &&
      arrivingBook === null &&
      bookArrival === null &&
      flight === null,
    screen,
    persist: () => {
      try {
        // Autosave runs before this hook. Never overwrite newer data from another window.
        localStorage.getItem(SESSION_KEY);
        return saved.current.progress && saved.current.session;
      } catch {
        return false;
      }
    },
  });
  useEffect(() => {
    // Warm only the next destination, never every illustrated chapter at startup.
    const paths =
      screen === "home"
        ? [asset(`library-${libraryState(count)}`)]
        : screen === "library"
          ? [asset(`scene-${activeSession?.stage ?? next}`)]
          : screen === "intro"
            ? [
                ...Array.from({ length: names[stage - 1].length }, (_, kind) =>
                  asset(`tile-${stage}-${kind}`),
                ),
                ...Array.from({ length: 4 }, (_, kind) =>
                  asset(`power-${kind}`),
                ),
                asset("vfx/sequences"),
              ]
            : screen === "game"
              ? [
                  asset(`library-${libraryState(Math.min(10, count + 1))}`),
                  asset(
                    `book-${progress.order[count] ?? progress.order[9]}-cover`,
                  ),
                ]
              : [];
    for (const path of paths) {
      const image = new Image();
      image.src = path;
      void image.decode?.().catch(() => {});
    }
  }, [screen, count, next, stage, activeSession?.stage]);
  function start(id: number, endless = false) {
    if (progress.pendingCelebration) {
      visitLibrary();
      return;
    }
    const previous = readSession(progress);
    const resume =
      previous?.stage === id && previous.endless === endless ? previous : null;
    const mode = resume?.difficulty ?? difficulty;
    const phase =
      resume?.phase ??
      (!endless && !storySeen(progress, id) ? "intro" : "game");
    const metadata: GameSession = resume ?? {
      version: 2,
      campaign: progress.order.join(","),
      completedCount: progress.completed.length,
      stage: id,
      endless,
      difficulty: mode,
      phase,
    };
    activeRef.current = metadata;
    setActiveSession(metadata);
    saved.current.session = writeSession(metadata);
    setStage(id);
    setPlayingLevel(
      preparedLevel(
        {
          ...levels[id - 1],
          name: titleFor(id),
        },
        mode,
        endless,
      ),
    );
    setInfinite(endless);
    setSession((n) => n + 1);
    setScreen(phase);
  }
  function beginStage() {
    rememberStory(progress, stage);
    const metadata = { ...activeRef.current!, phase: "game" as const };
    activeRef.current = metadata;
    setActiveSession(metadata);
    saved.current.session = writeSession(metadata);
    setSession((n) => n + 1);
    setScreen("game");
  }
  function win() {
    saved.current.session = writeSession(null);
    activeRef.current = null;
    setActiveSession(null);
    const first = !infinite && !progress.completed.includes(stage);
    setFirstGift(first && count === 0);
    setGiftIntro(first && count === 0);
    setReward(first ? progress.order[count] : null);
    if (first) setArrivingBook(progress.order[count]);
    if (!infinite) setProgress((p) => complete(p, stage));
    setScreen("reward");
  }
  function visitLibrary() {
    sound(true, "book");
    if (progress.pendingCelebration) {
      setScreen(
        progress.pendingCelebration.step === "book" ? "reward" : "celebration",
      );
      return;
    }
    setScreen("library");
  }
  function acceptReward() {
    if (reward && !reduced) {
      const from = document
        .querySelector(".reward-book")
        ?.getBoundingClientRect();
      const to = document
        .querySelector(`[data-book-id="${reward}"]`)
        ?.getBoundingClientRect();
      if (from && to) {
        setFlight({
          book: reward,
          from: {
            x: from.x,
            y: from.y,
            width: from.width,
            height: from.height,
          },
          to: { x: to.x, y: to.y, width: to.width, height: to.height },
        });
      }
    }
    if (progress.pendingCelebration) {
      setProgress(acceptMilestoneBook);
      setScreen("celebration");
    } else setScreen("library");
  }
  function finishCelebration() {
    setProgress(finishMilestone);
    setScreen("library");
  }
  const selectedBook = book === null ? null : books[book - 1];
  const portraitExit = useDialogExit(() => setPortrait(false));
  useDialog(portrait, portraitExit.close);
  return (
    <main
      ref={appRoot}
      data-screen={screen}
      className={reduced ? "app reduced" : "app"}
      onPointerDown={unlockAudio}
      onKeyDown={unlockAudio}
      onClickCapture={unlockAudio}
    >
      {screen === "game" ? (
        <Game
          key={session}
          level={playingLevel}
          endless={infinite}
          initialSnapshot={activeSession?.snapshot}
          onSnapshot={saveMatch}
          audio={true}
          motion={!reduced}
          onWin={win}
          onExit={visitLibrary}
        />
      ) : screen === "intro" ? (
        <StageIntro
          level={playingLevel}
          onBegin={beginStage}
          onBack={visitLibrary}
        />
      ) : screen === "celebration" ? (
        <Celebration
          kind={progress.pendingCelebration?.kind ?? "blade"}
          audio={!audioPrefs.muted && audioPrefs.effects > 0}
          onFinish={finishCelebration}
          scene={
            <LibraryScene
              completed={progress.completed}
              acquired={acquired}
              blade={
                bladeKnown && progress.pendingCelebration?.kind !== "blade"
              }
              family={
                familyKnown || progress.pendingCelebration?.kind === "family"
              }
              reduced={reduced}
              pose={bladePose}
              onPose={setBladePose}
              hiddenBook={flight?.book}
              focused
              cinematic={progress.pendingCelebration?.kind === "family"}
            />
          }
        />
      ) : screen === "home" ? (
        <section
          className="home"
          style={{
            backgroundImage: `linear-gradient(0deg,#123626ee,transparent 75%),url('${asset("scene-5")}')`,
          }}
        >
          <div className="home-top">
            <small>BEM-VINDA AO VIVA!</small>
            <img
              className="logo"
              src={asset("logo")}
              alt="Viva! Um joguinho pra viver e passar o tempo"
            />
          </div>
          <div className="home-bottom">
            <h1>
              O seu cantinho
              <br />
              de alegria.
            </h1>
            <p>Combine peças. Descubra histórias.</p>
            <button className="primary illustrated" onClick={visitLibrary}>
              Entrar na biblioteca
            </button>
          </div>
        </section>
      ) : screen === "levels" ? (
        <section className="page journey">
          <PageHeader
            title="Sua jornada"
            subtitle="Cada destino, uma descoberta."
            back={visitLibrary}
          />
          <div className="level-list">
            {levels.map((l) => (
              <button
                className="level-card"
                aria-current={l.id === next && count < 10 ? "step" : undefined}
                data-completed={l.id <= count ? "true" : undefined}
                disabled={l.id > next}
                key={l.id}
                onClick={() => start(l.id)}
              >
                {l.id > next ? (
                  <span className="locked-art" aria-hidden="true">
                    <svg viewBox="0 0 48 48" fill="none">
                      <rect x="12" y="21" width="24" height="20" rx="6" />
                      <path d="M17 21v-7a7 7 0 0 1 14 0v7M24 29v5" />
                    </svg>
                  </span>
                ) : (
                  <img src={asset(`scene-${l.id}`)} alt="" />
                )}
                <span className="level-number">{l.id}</span>
                <div>
                  <small>
                    {l.id <= count
                      ? "CONCLUÍDA"
                      : l.id === next
                        ? "PRÓXIMA DESCOBERTA"
                        : "EM BREVE"}
                  </small>
                  <h2>{l.id > next ? "Fase bloqueada" : titleFor(l.id)}</h2>
                </div>
                <span aria-hidden="true">{l.id <= count ? "✓" : "›"}</span>
              </button>
            ))}
          </div>
        </section>
      ) : screen === "library" ? (
        <section
          className="page library immersive"
          style={
            {
              "--room-art": `url('${new URL(asset(`library-${libraryState(count)}`), document.baseURI).href}')`,
            } as React.CSSProperties
          }
        >
          <header className="page-header hub-header">
            <div>
              <h1>Minha biblioteca</h1>
              <button
                className="collection-link"
                disabled={!count}
                onClick={(e) => {
                  e.currentTarget.focus({ preventScroll: true });
                  setBook(acquired[0]);
                }}
              >
                Meus livros · {count}/10
              </button>
            </div>
            <button className="hub-map" onClick={() => setScreen("levels")}>
              Ver fases <span aria-hidden="true">›</span>
            </button>
          </header>
          <nav className="hub-actions" aria-label="Sua jornada">
            <button
              className="primary"
              onClick={() =>
                start(
                  activeSession?.stage ?? next,
                  activeSession?.endless ?? false,
                )
              }
            >
              {activeSession
                ? "Continuar"
                : count === 10
                  ? "Jogar novamente"
                  : count
                    ? "Continuar"
                    : "Jogar"}
              <span>
                Fase {next} · {titleFor(next)}
              </span>
            </button>
          </nav>
          {count === 10 && (
            <button
              className="gold hub-infinite"
              onClick={() => start(1 + Math.floor(Math.random() * 10), true)}
            >
              Modo infinito
            </button>
          )}
          <LibraryScene
            completed={progress.completed}
            acquired={acquired}
            blade={bladeKnown}
            family={familyKnown}
            reduced={reduced}
            pose={bladePose}
            onPose={setBladePose}
            selected={book}
            arrival={bookArrival}
            hiddenBook={flight?.book}
            onBook={setBook}
            onPortrait={() => setPortrait(true)}
            focused={book !== null || portrait || settingsOpen}
          />
        </section>
      ) : (
        <section className="page reward library immersive reward-in-room">
          <LibraryScene
            completed={progress.completed}
            acquired={acquired}
            blade={bladeKnown}
            family={familyKnown}
            reduced={reduced}
            pose={bladePose}
            onPose={setBladePose}
            hiddenBook={reward}
            focused
          />
          <div className="reward-shade" aria-hidden="true" />
          <div className="reward-content">
            {giftIntro ? (
              <div className="reward-intro">
                <img
                  src={asset("reward-5")}
                  alt="Emblema floral de conquista"
                />
                <h1>Uma surpresa pra você!</h1>
                <p className="collection-intro">
                  Cada fase concluída revela um novo livro para sua coleção. São
                  dez histórias esperando por você na sua biblioteca.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setGiftIntro(false);
                  }}
                >
                  Descobrir meu livro
                </button>
              </div>
            ) : (
              <>
                <img
                  className="reward-badge"
                  src={asset("reward-5")}
                  alt="Emblema floral de conquista"
                />

                <h1>Fase concluída!</h1>
                {reward && (
                  <p className="collection-intro">
                    {firstGift
                      ? "Sua primeira história chegou!"
                      : [
                          "Mais uma história para sua coleção!",
                          "Um novo livro chegou!",
                          "Tem uma nova história esperando por você.",
                        ][(count - 1) % 3]}
                  </p>
                )}
                {reward ? (
                  <>
                    <img
                      className={`reward-book ${flight ? "arrival-hidden" : ""}`}
                      src={asset(`book-${reward}-cover`)}
                      alt={`Capa de ${books[reward - 1].title}`}
                    />
                    <h2>{books[reward - 1].title}</h2>
                    <p className="author">{books[reward - 1].author}</p>
                  </>
                ) : (
                  <p>
                    {infinite
                      ? "Que bom ter um momento só seu. Vamos a mais uma?"
                      : "É sempre bom revisitar um lugar querido."}
                  </p>
                )}
                <button
                  className="primary"
                  onClick={() =>
                    infinite && !reward
                      ? start(1 + Math.floor(Math.random() * 10), true)
                      : acceptReward()
                  }
                >
                  {reward
                    ? "Guardar na biblioteca"
                    : infinite
                      ? "Mais um momento"
                      : "Voltar à biblioteca"}
                </button>
                {infinite && (
                  <button onClick={visitLibrary}>Voltar à biblioteca</button>
                )}
              </>
            )}
          </div>
        </section>
      )}
      {flight && (
        <RewardFlight
          flight={flight}
          reduced={reduced}
          onFinish={() => {
            setFlight(null);
          }}
        />
      )}
      {warning && (
        <div className="storage-warning" role="alert">
          {warning}
          <button aria-label="Fechar aviso" onClick={() => setWarning("")}>
            ×
          </button>
        </div>
      )}
      {selectedBook && (
        <BookViewer
          id={selectedBook.id}
          acquired={acquired}
          onSelect={setBook}
          onClose={() => setBook(null)}
        />
      )}
      {portrait && (
        <div className="modal-backdrop" ref={portraitExit.root}>
          <div className="modal portrait-modal">
            <img
              src={asset("family")}
              alt="Bruno, Elis, o pai, a avó e Blade no jardim"
            />
            <h2 className="visually-hidden">Retrato da família</h2>
            <p className="bruno-signature">{BRUNO_SIGNATURE}</p>
            <button className="primary" onClick={portraitExit.close}>
              Guardar este carinho
            </button>
          </div>
        </div>
      )}
      <SoundToggle
        difficulty={difficulty}
        onDifficultyChange={(value) => {
          setDifficulty(value);
          try {
            localStorage.setItem(DIFFICULTY_KEY, value);
          } catch {}
        }}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onRestart={() => {
          try {
            if (!restartJourney(localStorage)) return false;
            activeRef.current = null;
            consumeUpdateReturn();
            onRestarted();
            return true;
          } catch {
            return false;
          }
        }}
        position={
          book !== null || portrait
            ? "modal"
            : screen === "library"
              ? "hub"
              : screen === "game"
                ? "game"
                : "top"
        }
        preferences={audioPrefs}
        onChange={(next, event) => {
          audioDirector.configure(next);
          setAudioPrefs(next);
          if (!next.muted) unlockAudio(event);
        }}
      />
    </main>
  );
}
function PageHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle: string;
  back: () => void;
}) {
  return (
    <header className="page-header">
      <button className="round" onClick={back} aria-label="Voltar à biblioteca">
        <FlatIcon kind="back" />
      </button>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}
