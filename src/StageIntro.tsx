import { asset, Level } from "./config";
import { stories } from "./stories";
import FlatIcon from "./FlatIcon";
import { obstacleHint } from "./obstacles";

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
        <FlatIcon kind="back" />
      </button>
      <div className="intro-editorial">
        <span className="intro-number">
          Fase {level.id}
          {level.id === 9 && (
            <img
              className="tattoo-intro-mark"
              src={asset("tattoos/studio-flash")}
              alt=""
              aria-hidden="true"
            />
          )}
        </span>
        <h1>{level.name}</h1>
        <p>{stories[level.id - 1]}</p>
        {obstacleHint(level) && (
          <p className="obstacle-intro">{obstacleHint(level)}</p>
        )}
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
