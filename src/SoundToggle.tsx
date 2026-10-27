import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { audioAvailable, type AudioPreferences } from "./audio";
export default function SoundToggle({
  preferences,
  onChange,
  position,
}: {
  preferences: AudioPreferences;
  onChange: (next: AudioPreferences, event: SyntheticEvent) => void;
  position: "hub" | "top" | "game" | "modal";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const remembered = useRef(preferences.effects || 0.6);
  const silent = preferences.muted || preferences.effects === 0;
  useEffect(() => setOpen(false), [position]);
  useEffect(() => {
    if (!open) return;
    root.current
      ?.querySelector<HTMLButtonElement>('[role="switch"]')
      ?.focus({ preventScroll: true });
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus({ preventScroll: true });
      }
    }
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  if (!audioAvailable()) return null;
  function volume(value: number, event: SyntheticEvent) {
    if (value > 0) remembered.current = value;
    onChange({ muted: false, music: 0, effects: value }, event);
  }
  return (
    <div className={"audio-control audio-control-" + position} ref={root}>
      <button
        ref={trigger}
        className="audio-toggle"
        onClick={() => setOpen(!open)}
        aria-label="Áudio"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M11 4 6 8H3v8h3l5 4Z" />
          {silent ? (
            <path d="m16 9 5 6m0-6-5 6" />
          ) : (
            <>
              <path d="M15 8a6 6 0 0 1 0 8" />
              <path d="M18 5a10 10 0 0 1 0 14" />
            </>
          )}
        </svg>
      </button>
      {open && (
        <div className="audio-panel" role="dialog" aria-label="Áudio">
          <div className="audio-panel-heading">
            <strong>Som</strong>
            <button
              aria-label="Fechar áudio"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus({ preventScroll: true });
              }}
            >
              ×
            </button>
          </div>
          <div className="audio-channel">
            <button
              role="switch"
              aria-label="Efeitos"
              aria-checked={!silent}
              onClick={(event) =>
                volume(silent ? remembered.current : 0, event)
              }
            >
              <span>Efeitos</span>
              <span className="audio-switch" aria-hidden="true">
                <i />
              </span>
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={silent ? 0 : Math.round(preferences.effects * 100)}
              aria-label="Volume dos efeitos"
              aria-valuetext={
                (silent ? 0 : Math.round(preferences.effects * 100)) + "%"
              }
              onChange={(event) =>
                volume(Number(event.target.value) / 100, event)
              }
            />
          </div>
          <button
            className="audio-master"
            onClick={(event) => {
              const next = { ...preferences, music: 0, muted: !silent };
              if (!next.muted && next.effects === 0)
                next.effects = remembered.current;
              onChange(next, event);
            }}
          >
            {silent ? "Ativar som" : "Silenciar som"}
          </button>
        </div>
      )}
    </div>
  );
}
