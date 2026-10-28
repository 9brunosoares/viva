import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { asset, themes } from "./config";
import { keepsakeByTheme } from "./obstacles";
type Rect = { x: number; y: number; width: number; height: number };
export type Flight = {
  book: number;
  stage: number;
  from: Rect;
  to: Rect;
  keepsake?: Rect;
};
export default function RewardFlight({
  flight,
  reduced,
  onFinish,
  onBookSettled,
}: {
  flight: Flight;
  reduced: boolean;
  onFinish: () => void;
  onBookSettled: () => void;
}) {
  const image = useRef<HTMLImageElement>(null),
    finish = useRef(onFinish),
    stored = useRef(onBookSettled);
  finish.current = onFinish;
  stored.current = onBookSettled;
  const [part, setPart] = useState<"book" | "keepsake">("book");
  const name = keepsakeByTheme[themes[flight.stage - 1]];
  useLayoutEffect(() => {
    if (reduced || document.hidden) {
      finish.current();
      return;
    }
    const el = image.current;
    if (!el) return;
    const from =
      part === "book"
        ? flight.from
        : {
            x: innerWidth / 2 - 60,
            y: innerHeight / 2 - 60,
            width: 120,
            height: 120,
          };
    const to = part === "book" ? flight.to : flight.keepsake!;
    const scale = Math.min(
      to.height / from.height,
      (to.width / from.width) * (part === "book" ? 2.1 : 1),
    );
    const dx = to.x + to.width / 2 - (from.x + from.width / 2),
      dy = to.y + to.height / 2 - (from.y + from.height / 2);
    const a = el.animate(
      [
        { transform: "translate(0,0) scale(1) rotateY(0)", opacity: 1 },
        {
          transform: `translate(${dx}px,${dy}px) scale(${scale}) rotateY(${part === "book" ? 63 : 0}deg)`,
          opacity: 1,
        },
      ],
      {
        duration: part === "book" ? 730 : 650,
        easing: "cubic-bezier(.32,.02,.18,1)",
        fill: "forwards",
      },
    );
    a.onfinish = () => {
      if (part === "book") stored.current();
      if (part === "book" && flight.keepsake && name) setPart("keepsake");
      else finish.current();
    };
    const hide = () => {
      if (document.hidden) finish.current();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      a.cancel();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [flight, part, reduced, name]);
  const rect =
    part === "book"
      ? flight.from
      : {
          x: innerWidth / 2 - 60,
          y: innerHeight / 2 - 60,
          width: 120,
          height: 120,
        };
  return createPortal(
    <img
      key={part}
      ref={image}
      className="reward-flight"
      aria-hidden="true"
      alt=""
      src={asset(
        part === "book" ? `book-${flight.book}-cover` : `premium6/${name}`,
      )}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    />,
    document.body,
  );
}
