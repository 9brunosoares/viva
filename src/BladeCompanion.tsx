import { useEffect, useRef, useState } from "react";
import { asset } from "./config";

export default function BladeCompanion({
  reduced,
  pose,
  onPose,
}: {
  reduced: boolean;
  pose: number;
  onPose: (pose: number) => void;
}) {
  const [open, setOpen] = useState(false),
    [present, setPresent] = useState(false);
  const [reaction, setReaction] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null),
    dog = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Warm the two existing awake sprites only after Blade has been revealed.
    for (const n of [2, 4]) {
      const image = new Image();
      image.src = asset(`blade-${n}`);
    }
  }, []);
  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(() => setPrevious(null), reduced ? 0 : 240);
    return () => clearTimeout(timer);
  }, [previous, pose, reduced]);
  useEffect(() => {
    if (!present || open) return;
    const timer = window.setTimeout(() => setPresent(false), reduced ? 0 : 180);
    return () => clearTimeout(timer);
  }, [open, present, reduced]);
  useEffect(() => {
    if (!open) return;
    root.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
      ?.focus({ preventScroll: true });
    function outside(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        dog.current?.focus({ preventScroll: true });
      }
    }
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  function choose(next: number) {
    if (next !== pose && !reduced) setPrevious(pose);
    onPose(next);
    setReaction((n) => n + 1);
    setOpen(false);
    dog.current?.focus({ preventScroll: true });
  }
  return (
    <div className="blade-companion" ref={root}>
      <button
        ref={dog}
        className={`blade ${pose === 2 ? "blade-standing" : ""}`}
        onClick={() => {
          if (open) setOpen(false);
          else {
            setPresent(true);
            setOpen(true);
          }
        }}
        aria-label="Blade"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={present ? "blade-menu" : undefined}
      >
        {previous !== null && (
          <span
            className="blade-layer blade-previous"
            aria-hidden="true"
            style={{
              height: `${((previous === 2 ? 30 : 22) / (pose === 2 ? 30 : 22)) * 100}%`,
            }}
          >
            <img src={asset(`blade-${previous}`)} alt="" />
          </span>
        )}
        <span
          key={`${pose}-${reaction}`}
          className={`blade-layer blade-current ${previous !== null ? "blade-transition" : ""} ${pose === 5 ? "blade-resting" : ""} ${pose === 4 && reaction ? "blade-content" : ""}`}
        >
          <img
            src={asset(`blade-${pose}`)}
            alt={
              pose === 5
                ? "Blade dormindo, chow chow preto"
                : pose === 2
                  ? "Blade em pé, chow chow preto"
                  : "Blade acordado, chow chow preto"
            }
          />
        </span>
      </button>
      {present && (
        <div
          id="blade-menu"
          className={`blade-context ${open ? "is-open" : "is-closing"}`}
          role="menu"
          aria-label="Converse com o Blade"
          aria-hidden={!open}
          inert={!open}
          onKeyDown={(e) => {
            const items = Array.from(
              e.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
            );
            const index = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              items[
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? 2
                    : (index + (e.key === "ArrowUp" ? 2 : 1)) % 3
              ]?.focus();
            }
          }}
        >
          <button role="menuitem" onClick={() => choose(2)}>
            Blade, vamos passear?
          </button>
          <button role="menuitem" onClick={() => choose(4)}>
            Quer petisco?
          </button>
          <button role="menuitem" onClick={() => choose(5)}>
            Blade, boa noite.
          </button>
        </div>
      )}
    </div>
  );
}
