import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { asset } from "./config";
type Rect = { x: number; y: number; width: number; height: number };
export type Flight = {
  book: number;
  from: Rect;
  to: Rect;
};
export default function RewardFlight({
  flight,
  reduced,
  onFinish,
}: {
  flight: Flight;
  reduced: boolean;
  onFinish: () => void;
}) {
  const image = useRef<HTMLImageElement>(null),
    finish = useRef(onFinish);
  finish.current = onFinish;
  useLayoutEffect(() => {
    if (reduced || document.hidden) {
      finish.current();
      return;
    }
    const el = image.current;
    if (!el) return;
    const from = flight.from,
      to = flight.to;
    const scale = Math.min(
      to.height / from.height,
      (to.width / from.width) * 2.1,
    );
    const dx = to.x + to.width / 2 - (from.x + from.width / 2),
      dy = to.y + to.height / 2 - (from.y + from.height / 2);
    const a = el.animate(
      [
        { transform: "translate(0,0) scale(1) rotateY(0)", opacity: 1 },
        {
          transform: `translate(${dx}px,${dy}px) scale(${scale}) rotateY(63deg)`,
          opacity: 1,
        },
      ],
      {
        duration: 730,
        easing: "cubic-bezier(.32,.02,.18,1)",
        fill: "forwards",
      },
    );
    a.onfinish = () => finish.current();
    const hide = () => {
      if (document.hidden) finish.current();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      a.cancel();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [flight, reduced]);
  const rect = flight.from;
  return createPortal(
    <img
      ref={image}
      className="reward-flight"
      aria-hidden="true"
      alt=""
      src={asset(`book-${flight.book}-cover`)}
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
