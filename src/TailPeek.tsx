import { useEffect, useRef, useState } from "react";
import { asset } from "./config";
/** Two silent peeks, scheduled only in genuinely idle time. No gameplay writes. */
export default function TailPeek({
  enabled,
  motion,
}: {
  enabled: boolean;
  motion: boolean;
}) {
  const count = useRef(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    if (!enabled || !motion || count.current >= 2) return;
    let hide: ReturnType<typeof setTimeout>;
    let show: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(show);
      clearTimeout(hide);
      setVisible(false);
      if (document.hidden || count.current >= 2) return;
      show = setTimeout(
        () => {
          count.current++;
          setVisible(true);
          hide = setTimeout(() => {
            setVisible(false);
            arm();
          }, 1600);
        },
        6000 + Math.random() * 6000,
      );
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [enabled, motion]);
  return visible ? (
    <span className="tail-peek" aria-hidden="true">
      <img src={asset("premium6/tail")} alt="" />
    </span>
  ) : null;
}
