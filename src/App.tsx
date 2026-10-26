import { useEffect, useRef, useState } from "react";
import { asset, books, levels } from "./config";
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
import { sound, unlockAudio } from "./audio";
import { useReducedMotion } from "./useReducedMotion";
import { BRUNO_SIGNATURE } from "./narrative";
import { useDialog } from "./useDialog";
import { shelfPositions } from "./libraryLayout";
import Celebration from "./Celebration";
type Screen = "home" | "levels" | "library" | "game" | "reward" | "celebration";
export default function App() {
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
  const [progress, setProgress] = useState<Progress>(initial.current.progress),
    [warning, setWarning] = useState(
      initial.current.warning
        ? "Não foi possível recuperar suas conquistas."
        : "",
    );
  const [screen, setScreen] = useState<Screen>(() =>
      initial.current!.progress.pendingCelebration
        ? initial.current!.progress.pendingCelebration.step === "book"
          ? "reward"
          : "celebration"
        : initial.current!.progress.completed.length
          ? "library"
          : "home",
    ),
    [stage, setStage] = useState(() =>
      initial.current!.progress.pendingCelebration
        ? milestoneStage(initial.current!.progress.pendingCelebration.kind)
        : 1,
    ),
    [session, setSession] = useState(0),
    [infinite, setInfinite] = useState(false);
  const [book, setBook] = useState<number | null>(null),
    [portrait, setPortrait] = useState(false),
    [reward, setReward] = useState<number | null>(
      () => initial.current!.progress.pendingCelebration?.bookId ?? null,
    );
  const [blade, setBlade] = useState(5),
    [bladeText, setBladeText] = useState("Blade descansa pertinho de você.");
  const count = progress.completed.length,
    next = Math.min(10, count + 1),
    acquired = progress.order.slice(0, count);
  const positions = shelfPositions(libraryState(count));
  const bladeKnown = isRevealed(progress, "blade"),
    familyKnown = isRevealed(progress, "family");
  const titleFor = (id: number) =>
    id === 5 && bladeKnown ? "Blade" : levels[id - 1].name;
  const reduced = useReducedMotion();
  useEffect(() => {
    window.scrollTo(0, 0);
    const heading = document.querySelector<HTMLElement>(".app>section h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [screen]);
  useEffect(() => {
    try {
      if (!save(progress, localStorage))
        setWarning("Não foi possível guardar suas conquistas agora.");
    } catch {
      setWarning("Não foi possível guardar suas conquistas agora.");
    }
  }, [progress]);
  useEffect(() => {
    if (!import.meta.env.DEV && "serviceWorker" in navigator)
      void navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .catch(() => {});
  }, []);
  function start(id: number, endless = false) {
    if (progress.pendingCelebration) {
      visitLibrary();
      return;
    }
    setStage(id);
    setInfinite(endless);
    setSession((n) => n + 1);
    setScreen("game");
  }
  function win() {
    const first = !infinite && !progress.completed.includes(stage);
    setReward(first ? progress.order[count] : null);
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
    if (progress.pendingCelebration) {
      sound(true, "book");
      setProgress(acceptMilestoneBook);
      setScreen("celebration");
    } else visitLibrary();
  }
  function finishCelebration() {
    setProgress(finishMilestone);
    setScreen("library");
  }
  function talkToBlade(action: "pet" | "walk" | "treat" | "sleep") {
    setBlade(action === "sleep" ? 5 : 4);
    setBladeText(
      {
        pet: "Blade ficou feliz com seu carinho.",
        walk: "Blade acordou! Um passeio com você é sempre uma boa ideia.",
        treat: "Blade acordou de olho no petisco.",
        sleep: "Boa noite, Blade. Bons sonhos pertinho dos livros.",
      }[action],
    );
  }
  const selectedBook = book === null ? null : books[book - 1];
  useDialog(book !== null || portrait);
  return (
    <main
      className={reduced ? "app reduced" : "app"}
      onPointerDown={unlockAudio}
      onKeyDown={unlockAudio}
      onClickCapture={unlockAudio}
    >
      {screen === "game" ? (
        <Game
          key={session}
          level={
            infinite
              ? {
                  ...levels[stage - 1],
                  name: titleFor(stage),
                  moves: 42,
                  powers: 0,
                  cascades: 0,
                  targets: [
                    { kind: 0, amount: 20 },
                    { kind: 3, amount: 20 },
                  ],
                }
              : { ...levels[stage - 1], name: titleFor(stage) }
          }
          audio={true}
          motion={!reduced}
          onWin={win}
          onExit={visitLibrary}
        />
      ) : screen === "celebration" ? (
        <Celebration
          kind={progress.pendingCelebration?.kind ?? "blade"}
          audio={true}
          onFinish={finishCelebration}
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
        <section className="page library">
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
          </header>
          <nav className="hub-actions" aria-label="Sua jornada">
            <button className="primary" onClick={() => start(next)}>
              {count === 10 ? "Jogar novamente" : count ? "Continuar" : "Jogar"}
              <span>
                Fase {next} · {titleFor(next)}
              </span>
            </button>
            <button onClick={() => setScreen("levels")}>
              Ver fases <span aria-hidden="true">›</span>
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
          <div className="library-stage">
            <div className={`library-room ${bladeKnown ? "has-blade" : ""}`}>
              <img
                className="room-image"
                src={asset(`library-${libraryState(count)}`)}
                width={496}
                height={756}
                alt={`Seu recanto de leitura, evolução ${libraryState(count) + 1} de 4`}
              />
              <div className="shelf-books">
                {acquired.map((id, i) => (
                  <button
                    key={id}
                    style={{
                      left: `${positions[i].left}%`,
                      bottom: `${positions[i].bottom}%`,
                      height: `${positions[i].height}%`,
                      width: `${positions[i].width}%`,
                    }}
                    onClick={(e) => {
                      e.currentTarget.focus({ preventScroll: true });
                      setBook(id);
                    }}
                    aria-label={`Abrir ${books[id - 1].title}`}
                  >
                    <img src={asset(`book-${id}-spine`)} alt="" />
                  </button>
                ))}
              </div>
              {bladeKnown && (
                <button
                  className="blade"
                  onClick={() => talkToBlade("pet")}
                  aria-label="Fazer carinho no Blade"
                  aria-describedby="blade-status"
                >
                  <img
                    src={asset(`blade-${blade}`)}
                    alt={
                      blade === 5
                        ? "Blade dormindo, chow chow preto"
                        : "Blade acordado, chow chow preto"
                    }
                  />
                </button>
              )}
              <img
                className="library-foreground"
                src={asset("library-foreground")}
                alt=""
                aria-hidden="true"
              />
              {familyKnown && (
                <button
                  className="family-frame"
                  onClick={(e) => {
                    e.currentTarget.focus({ preventScroll: true });
                    setPortrait(true);
                  }}
                  aria-label="Ampliar retrato da família"
                >
                  <img
                    src={asset("family-object")}
                    alt="Retrato da família apoiado na mesa em primeiro plano"
                  />
                </button>
              )}
              <span className="room-label">
                {
                  [
                    "Um lugar para começar",
                    "As primeiras histórias",
                    "Aconchego e companhia",
                    "Um cantinho cheio de vida",
                  ][libraryState(count)]
                }
              </span>
            </div>
          </div>
          {bladeKnown && (
            <div className="blade-prompts" aria-label="Converse com o Blade">
              <button onClick={() => talkToBlade("walk")}>
                Blade, vamos passear?
              </button>
              <button onClick={() => talkToBlade("treat")}>
                Quer petisco?
              </button>
              <button onClick={() => talkToBlade("sleep")}>
                Blade, boa noite.
              </button>
            </div>
          )}
          <p id="blade-status" className="library-caption" role="status">
            {bladeKnown
              ? bladeText
              : "Cada nova história deixa este cantinho mais seu."}
          </p>
        </section>
      ) : (
        <section className="page reward">
          <img
            className="reward-badge"
            src={asset("reward-5")}
            alt="Emblema floral de conquista"
          />

          <h1>Fase concluída!</h1>
          {reward ? (
            <>
              <img
                className="reward-book"
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
              ? "Guardar livro"
              : infinite
                ? "Mais um momento"
                : "Voltar à biblioteca"}
          </button>
          {infinite && (
            <button onClick={visitLibrary}>Voltar à biblioteca</button>
          )}
        </section>
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
        <div className="modal-backdrop">
          <div className="modal book-modal">
            <img
              src={asset(`book-${selectedBook.id}-cover`)}
              alt={`Capa de ${selectedBook.title}`}
            />
            <h2 aria-live="polite">{selectedBook.title}</h2>
            <p className="author">{selectedBook.author}</p>
            <div
              key={selectedBook.id}
              className="book-synopsis"
              tabIndex={0}
              role="region"
              aria-label="Sinopse"
            >
              <p>{selectedBook.synopsis}</p>
            </div>
            {acquired.length > 1 && (
              <nav className="book-navigation" aria-label="Seus livros">
                <button
                  disabled={acquired.indexOf(selectedBook.id) === 0}
                  aria-label="Livro anterior"
                  onClick={() =>
                    setBook(acquired[acquired.indexOf(selectedBook.id) - 1])
                  }
                >
                  ‹
                </button>
                <span>
                  {acquired.indexOf(selectedBook.id) + 1} de {count}
                </span>
                <button
                  disabled={acquired.indexOf(selectedBook.id) === count - 1}
                  aria-label="Próximo livro"
                  onClick={() =>
                    setBook(acquired[acquired.indexOf(selectedBook.id) + 1])
                  }
                >
                  ›
                </button>
              </nav>
            )}
            <button className="primary" onClick={() => setBook(null)}>
              Voltar à biblioteca
            </button>
          </div>
        </div>
      )}
      {portrait && (
        <div className="modal-backdrop">
          <div className="modal portrait-modal">
            <img
              src={asset("family")}
              alt="Bruno, Elis, o pai, a avó e Blade no jardim"
            />
            <h2 className="visually-hidden">Retrato da família</h2>
            <p className="bruno-signature">{BRUNO_SIGNATURE}</p>
            <button className="primary" onClick={() => setPortrait(false)}>
              Guardar este carinho
            </button>
          </div>
        </div>
      )}
      <div className="landscape-note">
        Vire o celular para aproveitar seu cantinho na vertical.
      </div>
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
        <img src={asset("control-back")} alt="" />
      </button>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}
