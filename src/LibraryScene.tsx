import { asset, books, themes } from "./config";
import { useEffect, useState } from "react";
import { libraryState } from "./progress";
import { shelfPositions, keepsakePlaces } from "./libraryLayout";
import { keepsakeByTheme } from "./obstacles";
import { spineMetrics } from "./spineMetrics";
import BladeCompanion from "./BladeCompanion";
import LibraryAtmosphere, { useLibraryActivity } from "./LibraryAtmosphere";
type Props = {
  completed: number[];
  acquired: number[];
  blade: boolean;
  family: boolean;
  reduced: boolean;
  pose: number;
  onPose: (n: number) => void;
  onBook?: (n: number) => void;
  onPortrait?: () => void;
  selected?: number | null;
  arrival?: number | null;
  hiddenBook?: number | null;
  hiddenKeepsake?: number | null;
  focused?: boolean;
  cinematic?: boolean;
};
export default function LibraryScene(p: Props) {
  const stage = libraryState(p.completed.length),
    positions = shelfPositions(stage);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    setReady(false);
    const image = new Image();
    image.src = asset(`library-${stage}`);
    void image
      .decode()
      .catch(() => {})
      .then(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [stage]);
  const activity = useLibraryActivity(!p.focused, p.reduced);
  return (
    <div
      className={`library-stage ${p.cinematic ? "cinematic-stage" : ""}`}
      inert={!p.onBook && !p.onPortrait ? true : undefined}
    >
      <div
        className={`library-room library-alive ${p.blade ? "has-blade" : ""}`}
        data-stage={stage}
        data-ready={ready}
        data-ambient={activity.active && !p.focused ? "active" : "paused"}
        data-motion={activity.mode}
        data-attention={p.focused ? "focused" : "room"}
      >
        <img
          className="room-image"
          src={asset(`library-${stage}`)}
          width={496}
          height={756}
          alt={`Seu recanto de leitura, evolução ${stage + 1} de 4`}
          decoding="async"
        />
        <LibraryAtmosphere
          stage={stage}
          limited={activity.mode !== "full"}
          still={activity.mode === "still"}
        />
        <div className="room-keepsakes" aria-hidden="true">
          {p.completed.map((id) => {
            const name = keepsakeByTheme[themes[id - 1]];
            if (!name) return null;
            const spot = keepsakePlaces[name];
            return (
              <img
                key={id}
                data-keepsake={id}
                className={p.hiddenKeepsake === id ? "arrival-hidden" : ""}
                src={asset(`premium6/${name}`)}
                alt=""
                style={{
                  left: `${(spot.x / 496) * 100}%`,
                  bottom: `${((756 - spot.y) / 756) * 100}%`,
                  width: `${(spot.w / 496) * 100}%`,
                  height: `${(spot.h / 756) * 100}%`,
                }}
              />
            );
          })}
        </div>
        <div className="shelf-books">
          {p.acquired.map((id, i) => {
            const slot = positions[i],
              m = spineMetrics[id];
            return (
              <button
                key={id}
                data-book-id={id}
                className={`${p.selected === id ? "book-selected" : ""} ${p.arrival === id ? "book-arriving" : ""} ${p.hiddenBook === id ? "arrival-hidden" : ""}`}
                style={
                  {
                    left: `${slot.left}%`,
                    bottom: `${slot.bottom}%`,
                    height: `${slot.height}%`,
                    width: `${(((slot.height * 756) / 496) * m.artWidth) / m.artHeight}%`,
                    "--lean": `${[0, -1, 0, 1, 0, -1, 0, 1, 0, 0][i]}deg`,
                  } as React.CSSProperties
                }
                onClick={(e) => {
                  e.currentTarget.focus({ preventScroll: true });
                  p.onBook?.(id);
                }}
                disabled={!p.onBook}
                aria-label={`Abrir ${books[id - 1].title}`}
              >
                <img
                  src={asset(`book-${id}-spine`)}
                  alt=""
                  width={60}
                  height={160}
                  style={{
                    position: "absolute",
                    width: `${(m.width / m.artWidth) * 100}%`,
                    height: `${(m.height / m.artHeight) * 100}%`,
                    left: `${(-m.left / m.artWidth) * 100}%`,
                    top: `${(-m.top / m.artHeight) * 100}%`,
                  }}
                />
              </button>
            );
          })}
        </div>
        <img
          className="shelf-depth"
          src={asset(`library-shelf-depth-${stage}`)}
          alt=""
          aria-hidden="true"
        />
        {p.blade && (
          <BladeCompanion reduced={p.reduced} pose={p.pose} onPose={p.onPose} />
        )}
        <img
          className="library-foreground"
          src={asset("library-foreground")}
          alt=""
          aria-hidden="true"
        />
        {p.family && (
          <button
            className="family-frame"
            onClick={(e) => {
              e.currentTarget.focus({ preventScroll: true });
              p.onPortrait?.();
            }}
            disabled={!p.onPortrait}
            aria-label="Ampliar retrato da família"
          >
            <img
              src={asset("family-object")}
              alt="Retrato da família apoiado na mesa em primeiro plano"
            />
          </button>
        )}
      </div>
    </div>
  );
}
