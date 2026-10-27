import { COLS, ROWS, Wave } from "./engine";
import { asset } from "./config";
export default function ComboEffects({
  effects,
  affected,
}: {
  effects: Wave["effects"];
  affected: number[];
}) {
  if (!effects.length) return null;
  return (
    <div
      className={`combo-layer ${effects.length > 1 ? "combo-chain" : ""}`}
      aria-hidden="true"
    >
      <div className="combo-aura" />
      {effects.slice(0, 6).map(({ index, type }) => (
        <i
          key={index}
          className={`combo-effect combo-${type}`}
          style={
            {
              "--cx": `${(((index % COLS) + 0.5) * 100) / COLS}%`,
              "--cy": `${((Math.floor(index / COLS) + 0.5) * 100) / ROWS}%`,
            } as React.CSSProperties
          }
        >
          <span className="combo-core" />
          <span className="combo-shock" />
          <img
            className="combo-atlas"
            src={asset(
              `power-${{ row: 4, column: 5, area: 6, color: 7 }[type]}`,
            )}
            alt=""
          />
        </i>
      ))}
      {affected
        .filter(
          (_, i) => i % Math.max(1, Math.ceil(affected.length / 18)) === 0,
        )
        .map((index, i) => (
          <b
            key={index}
            className="combo-spark"
            style={{
              left: `${(((index % COLS) + 0.5) * 100) / COLS}%`,
              top: `${((Math.floor(index / COLS) + 0.5) * 100) / ROWS}%`,
              animationDelay: `${(i % 3) * 30}ms`,
            }}
          >
            {i % 4 === 0 ? <img src={asset("power-9")} alt="" /> : "✦"}
          </b>
        ))}
    </div>
  );
}
