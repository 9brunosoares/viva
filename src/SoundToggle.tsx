import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { audioAvailable, type AudioPreferences } from "./audio";
export default function SoundToggle({
  preferences,
  onChange,
  position,
  open,
  onOpenChange,
  onRestart,
}: {
  preferences: AudioPreferences;
  onChange: (next: AudioPreferences, event: SyntheticEvent) => void;
  position: "hub" | "top" | "game" | "modal";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestart: () => boolean;
}) {
  const setOpen = onOpenChange;
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  const confirmation = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const remembered = useRef(preferences.effects || 0.6);
  const silent = preferences.muted || preferences.effects === 0;
  useEffect(() => {
    setOpen(false);
    setConfirm(false);
  }, [position, setOpen]);
  useEffect(() => {
    if (confirm) confirmation.current?.showModal();
    else confirmation.current?.close();
  }, [confirm]);
  useEffect(() => {
    if (!open) return;
    root.current
      ?.querySelector<HTMLButtonElement>('[role="switch"]')
      ?.focus({ preventScroll: true });
    function outside(event: PointerEvent) {
      if (!confirm && !root.current?.contains(event.target as Node))
        setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (confirm) return;
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
  }, [open, confirm]);
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
        aria-label="Configurações"
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
          <path d="m9.5 3-.6 2.1-1.4.8L5.4 5.4l-2 3.4L5 10.4v1.7l-1.6 1.6 2 3.4 2.1-.5 1.4.8.6 2.1h4l.6-2.1 1.4-.8 2.1.5 2-3.4-1.6-1.6v-1.7l1.6-1.6-2-3.4-2.1.5-1.4-.8L13.5 3Z" />
          <circle cx="11.5" cy="11.25" r="3.1" />
        </svg>
      </button>
      {open && (
        <div
          className="audio-panel settings-panel"
          role="dialog"
          aria-label="Configurações"
        >
          <div className="audio-panel-heading">
            <strong>Configurações</strong>
            <button
              aria-label="Fechar configurações"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus({ preventScroll: true });
              }}
            >
              ×
            </button>
          </div>
          {audioAvailable() && (
            <>
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
            </>
          )}
          <div className="settings-journey">
            <button
              className="restart-journey"
              onClick={() => {
                setError("");
                setConfirm(true);
              }}
            >
              Novo jogo
            </button>
          </div>
        </div>
      )}
      <dialog
        className="restart-dialog"
        ref={confirmation}
        aria-labelledby="restart-title"
        aria-describedby="restart-description"
        onCancel={(e) => {
          e.preventDefault();
          setConfirm(false);
        }}
      >
        <h2 id="restart-title">Começar um novo jogo?</h2>
        <p id="restart-description">
          Seu progresso, livros e fases serão apagados. Você começará novamente,
          desde a primeira fase. Isso não pode ser desfeito.
        </p>
        {error && <p role="alert">{error}</p>}
        <button
          className="primary"
          autoFocus
          onClick={() => {
            setConfirm(false);
            root.current
              ?.querySelector<HTMLButtonElement>(".restart-journey")
              ?.focus();
          }}
        >
          Continuar jogando
        </button>
        <button
          className="restart-confirm"
          onClick={() => {
            if (!onRestart())
              setError("Não foi possível reiniciar agora. Tente novamente.");
          }}
        >
          Sim, começar do zero
        </button>
      </dialog>
    </div>
  );
}
