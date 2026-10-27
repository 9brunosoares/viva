import { asset, Level } from "./config";
import { stories } from "./stories";

export default function StageIntro({
  level,
  onBegin,
  onBack,
}: {
  level: Level;
  onBegin: () => void;
  onBack: () => void;
}) {
  return (
    <section
      className="stage-intro"
      style={{ backgroundImage: `url('${asset(`scene-${level.id}`)}')` }}
    >
      <button
        className="round intro-back"
        aria-label="Voltar à biblioteca"
        onClick={onBack}
      >
        <img src={asset("control-back")} alt="" />
      </button>
      <div className="intro-editorial">
        <span className="intro-number">Fase {level.id}</span>
        <h1>{level.name}</h1>
        <p>{stories[level.id - 1]}</p>
        <div className="intro-pieces" aria-hidden="true">
          {level.targets.map((t) => (
            <img
              key={t.kind}
              src={asset(`tile-${level.id}-${t.kind}`)}
              alt=""
            />
          ))}
        </div>
        <button className="primary" onClick={onBegin}>
          Vamos lá!
        </button>
      </div>
    </section>
  );
}
