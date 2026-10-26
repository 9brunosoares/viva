import { useEffect, useRef } from "react";
import { asset } from "./config";
import { Milestone } from "./progress";
import { ceremonyMusic, audioAvailable } from "./audio";
import { BRUNO_SIGNATURE } from "./narrative";
export default function Celebration({
  kind,
  audio,
  onFinish,
}: {
  kind: Milestone;
  audio: boolean;
  onFinish: () => void;
}) {
  const stop = useRef<() => void>(() => {});
  const listen = () => {
    stop.current();
    stop.current = ceremonyMusic(audio, kind);
  };
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus();
    stop.current();
    stop.current = ceremonyMusic(audio, kind);
    return () => stop.current();
  }, [audio, kind]);
  const family = kind === "family";
  return (
    <section
      className={`celebration celebration-${kind}`}
      aria-labelledby="celebration-title"
    >
      <div className="ceremony-light" aria-hidden="true" />
      <small>
        {family ? "AS HISTÓRIAS MAIS BONITAS" : "UMA COMPANHIA ESPECIAL"}
      </small>
      <h1 ref={title} tabIndex={-1} id="celebration-title">
        {family ? "Seu lugar é junto de quem você ama." : "Este é o Blade."}
      </h1>
      <div className="celebration-art">
        <img
          src={asset(family ? "family-object" : "blade-4")}
          alt={
            family
              ? "Bruno, Elis, o pai, a avó e Blade no jardim"
              : "Blade, seu chow chow preto, chegou para fazer companhia"
          }
        />
      </div>
      <p className={family ? "bruno-signature" : ""}>
        {family
          ? BRUNO_SIGNATURE
          : "Chegou uma companhia para as próximas páginas."}
      </p>
      <button className="primary" onClick={onFinish}>
        {family ? "Voltar ao meu cantinho" : "Vem, Blade!"}
      </button>
      {audio && audioAvailable() && (
        <button className="text-button ceremony-audio" onClick={listen}>
          Ouvir
        </button>
      )}
    </section>
  );
}
