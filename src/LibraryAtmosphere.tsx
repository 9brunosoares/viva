import { useEffect, useState, type CSSProperties } from "react";

/** These four illustrations share a left window and lamp; coordinates are room-relative. */
export const roomLights = [
  { windowX: "23%", windowY: "20%", lampX: "37%", lampY: "36%" },
  { windowX: "23%", windowY: "20%", lampX: "37%", lampY: "36%" },
  { windowX: "23%", windowY: "20%", lampX: "37%", lampY: "37%" },
  { windowX: "23%", windowY: "20%", lampX: "37%", lampY: "37%" },
] as const;

// Fixed reusable motes, outside the shelves. Never consume the gameplay random stream.
const motes = [
  [21, 13, 1.5, 19, -4],
  [25, 18, 1.2, 24, -13],
  [28, 24, 1.8, 22, -8],
  [22, 29, 1.1, 26, -19],
  [31, 32, 1.3, 21, -16],
  [26, 12, 1.2, 28, -22],
  [20, 22, 1.7, 25, -10],
  [29, 17, 1.1, 23, -3],
];

export function useLibraryActivity(enabled: boolean, reduced: boolean) {
  const [hidden, setHidden] = useState(() => document.hidden);
  const [limited] = useState(() => {
    const device = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    return (
      !!device.connection?.saveData ||
      (device.deviceMemory ?? 8) <= 2 ||
      (navigator.hardwareConcurrency || 8) <= 2
    );
  });
  useEffect(() => {
    if (!enabled) return;
    const visibility = () => setHidden(document.hidden);
    const hide = () => setHidden(true);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", visibility);
    };
  }, [enabled]);
  return {
    active: enabled && !hidden && !reduced,
    mode: reduced ? "still" : limited ? "limited" : "full",
  };
}

export default function LibraryAtmosphere({
  stage,
  limited,
}: {
  stage: number;
  limited: boolean;
}) {
  const light = roomLights[stage];
  return (
    <div
      className="library-atmosphere"
      aria-hidden="true"
      style={
        {
          "--window-x": light.windowX,
          "--window-y": light.windowY,
          "--lamp-x": light.lampX,
          "--lamp-y": light.lampY,
        } as CSSProperties
      }
    >
      <div className="library-light-entry">
        <div className="library-window-light" />
        <div className="library-lamp-light" />
      </div>
      {!limited && (
        <div className="library-dust">
          {motes.map(([x, y, size, duration, delay], i) => (
            <i
              key={i}
              style={
                {
                  left: `${x}%`,
                  top: `${y}%`,
                  width: size,
                  height: size,
                  "--drift": `${i % 2 ? -7 : 9}px`,
                  animationDuration: `${duration}s`,
                  animationDelay: `${delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
