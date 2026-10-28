import { useEffect, useRef, useState } from "react";
import { asset } from "./config";
import { Milestone } from "./progress";
import { ceremonyMusic } from "./audio";
import { BRUNO_SIGNATURE } from "./narrative";
const dedicationBreaks = [
  0,
  BRUNO_SIGNATURE.indexOf("um filho"),
  BRUNO_SIGNATURE.indexOf("e te admira"),
  BRUNO_SIGNATURE.length,
];
const dedicationLines = dedicationBreaks
  .slice(0, -1)
  .map((start, i) => BRUNO_SIGNATURE.slice(start, dedicationBreaks[i + 1]));
export default function Celebration({
  kind,
  audio,
  onFinish,
  scene,
}: {
  kind: Milestone;
  audio: boolean;
  onFinish: () => void;
  scene?: React.ReactNode;
}) {
  const stop = useRef<() => void>(() => {});
  const family = kind === "family";
  const [artState, setArtState] = useState<"loading" | "ready" | "error">(
    family ? "ready" : "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const image = useRef<HTMLImageElement>(null);
  const ready = family || artState === "ready";
  useEffect(() => {
    if (family) return;
    let active = true;
    const img = image.current!;
    const loaded = async () => {
      try {
        await img.decode();
        if (active && img.naturalWidth > 0) setArtState("ready");
      } catch {
        if (active) setArtState("error");
      }
    };
    const failed = () => {
      if (active) setArtState("error");
    };
    img.addEventListener("load", loaded);
    img.addEventListener("error", failed);
    if (img.complete) {
      if (img.naturalWidth > 0) void loaded();
      else failed();
    }
    return () => {
      active = false;
      img.removeEventListener("load", loaded);
      img.removeEventListener("error", failed);
    };
  }, [family, attempt]);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!ready) return;
    title.current?.focus({ preventScroll: true });
    stop.current();
    stop.current = ceremonyMusic(audio, kind);
    return () => stop.current();
  }, [audio, kind, ready]);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const visibility = () => {
      if (root.current) root.current.dataset.paused = String(document.hidden);
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  return (
    <section
      ref={root}
      className={`celebration celebration-${kind} library immersive ceremony-in-room`}
      aria-labelledby="celebration-title"
      aria-busy={!ready}
      data-art-ready={ready}
    >
      {scene}
      <div className="ceremony-dim" aria-hidden="true" />
      <div className="ceremony-light" aria-hidden="true" />
      <small>
        {family ? "AS HISTÓRIAS MAIS BONITAS" : "UMA COMPANHIA ESPECIAL"}
      </small>
      <h1 ref={title} tabIndex={-1} id="celebration-title">
        {family ? "Seu lugar é junto de quem você ama." : "O Blade chegou!"}
      </h1>
      {!family && artState !== "ready" && (
        <p
          className="ceremony-loading"
          role={artState === "error" ? "alert" : "status"}
        >
          {artState === "error"
            ? "Não foi possível carregar a imagem."
            : "Um instante…"}
        </p>
      )}
      <div className="celebration-art">
        <img
          key={attempt}
          ref={image}
          decoding="async"
          src={asset(family ? "family-object" : "blade-4")}
          alt={
            family
              ? "Bruno, Elis, o pai, a avó e Blade no jardim"
              : "Blade, seu chow chow preto, chegou para fazer companhia"
          }
        />
      </div>
      <p className={family ? "bruno-signature" : ""}>
        {family ? (
          <>
            {dedicationLines.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </>
        ) : (
          "Chegou uma companhia para as próximas páginas."
        )}
      </p>
      <button
        className="primary"
        disabled={!ready && artState !== "error"}
        onClick={() => {
          if (artState === "error") {
            setArtState("loading");
            setAttempt((n) => n + 1);
          } else onFinish();
        }}
      >
        {artState === "error"
          ? "Tentar novamente"
          : family
            ? "Voltar ao meu cantinho"
            : "Vem, Blade!"}
      </button>
    </section>
  );
}
