import { useEffect, useId, useState, type CSSProperties } from "react";

/** These four illustrations share a left window and lamp; coordinates are room-relative. */
export const roomLights = [
  { windowX: "13%", windowY: "26%", lampX: "37%", lampY: "35%" },
  { windowX: "13%", windowY: "26%", lampX: "37%", lampY: "35%" },
  { windowX: "13%", windowY: "26%", lampX: "37%", lampY: "36%" },
  { windowX: "13%", windowY: "26%", lampX: "37%", lampY: "36%" },
] as const;

// Anchors follow the diagonal light from the left window towards the rug.
// CSS pixels stay legible at phone scale; fixed phases never consume gameplay RNG.
const motes = [
  [13, 23, 2.2, 13, -2],
  [19, 30, 2, 17, -7],
  [25, 39, 2.8, 18, -12],
  [30, 45, 2.4, 14, -4],
  [39, 56, 2, 20, -15],
  [46, 62, 2.6, 16, -5],
  [21, 35, 1.8, 15, -9],
  [49, 67, 2.2, 19, -13],
];

// Parallel feathered bands, anchored in the original window opening (496 × 756).
// They stop before the foreground table; no image geometry or furniture is animated.
const rays = [
  { points: "24,104 64,80 300,468 260,492", start: [24, 104], end: [64, 80] },
  { points: "21,174 71,144 319,552 269,582", start: [21, 174], end: [71, 144] },
  { points: "44,247 80,225 286,564 250,586", start: [44, 247], end: [80, 225] },
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
  still = false,
}: {
  stage: number;
  limited: boolean;
  still?: boolean;
}) {
  const light = roomLights[stage];
  const id = useId().replace(/:/g, "");
  const visibleMotes = limited ? [motes[1], motes[3], motes[5]] : motes;
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
        <div className="library-curtain-light" />
        <svg
          className="library-sunrays"
          viewBox="0 0 496 756"
          focusable="false"
        >
          <defs>
            <linearGradient
              id={`${id}-fade`}
              x1="0"
              y1="70"
              x2="0"
              y2="590"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="white" stopOpacity="0.2" />
              <stop offset="0.18" stopColor="white" />
              <stop offset="0.62" stopColor="white" stopOpacity="0.8" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <mask
              id={`${id}-air`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="496"
              height="756"
              style={{ maskType: "alpha" }}
            >
              <rect width="496" height="756" fill={`url(#${id}-fade)`} />
            </mask>
            {rays.map(({ start, end }, i) => (
              <linearGradient
                key={i}
                id={`${id}-ray-${i}`}
                x1={start[0]}
                y1={start[1]}
                x2={end[0]}
                y2={end[1]}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor="#fff6dd" stopOpacity="0" />
                <stop offset="0.32" stopColor="#fff6dd" stopOpacity="0.13" />
                <stop offset="0.52" stopColor="#fff6dd" stopOpacity="0.28" />
                <stop offset="0.73" stopColor="#fff6dd" stopOpacity="0.12" />
                <stop offset="1" stopColor="#fff6dd" stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          <g mask={`url(#${id}-air)`}>
            {rays.map(({ points }, i) => (
              <polygon
                key={i}
                className={`library-sunbeam library-sunbeam-${i}`}
                points={points}
                fill={`url(#${id}-ray-${i})`}
              />
            ))}
          </g>
        </svg>
      </div>
      {!still && (
        <div className="library-dust">
          {visibleMotes.map(([x, y, size, duration, delay], i) => (
            <i
              key={i}
              style={
                {
                  left: `${x}%`,
                  top: `${y}%`,
                  width: size,
                  height: size,
                  "--drift": `${i % 2 ? -14 : 18}px`,
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
