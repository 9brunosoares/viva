import { useEffect, useRef } from "react";
import { difficulties, type Difficulty } from "./difficulty";

export default function DifficultySelector({
  value,
  open,
  onOpen,
  onChange,
}: {
  value: Difficulty;
  open: boolean;
  onOpen: (open: boolean) => void;
  onChange: (value: Difficulty) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    root.current
      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      ?.focus({ preventScroll: true });
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) onOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpen(false);
        trigger.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [open, onOpen]);
  return (
    <div className="difficulty-control" ref={root}>
      <button
        ref={trigger}
        className="difficulty-trigger"
        aria-expanded={open}
        aria-controls={open ? "difficulty-choice" : undefined}
        aria-label={`Dificuldade: ${difficulties.find((d) => d.id === value)!.label}`}
        onClick={() => onOpen(!open)}
      >
        {difficulties.find((d) => d.id === value)!.label}{" "}
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <fieldset
          className="difficulty-picker"
          id="difficulty-choice"
          aria-describedby="difficulty-description"
        >
          <legend className="visually-hidden">Dificuldade</legend>
          <div>
            {difficulties.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={value === d.id}
                onClick={() => {
                  onChange(d.id);
                  onOpen(false);
                  trigger.current?.focus({ preventScroll: true });
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p id="difficulty-description">
            {difficulties.find((d) => d.id === value)!.description}
          </p>
        </fieldset>
      )}
    </div>
  );
}
