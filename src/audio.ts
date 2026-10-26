let ctx: AudioContext | undefined;
let unlocked = false;
function audioConstructor() {
  return (
    globalThis.AudioContext ||
    (
      globalThis as typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext
  );
}
export function audioAvailable() {
  return typeof audioConstructor() === "function";
}
/** Called only by trusted pointer/keyboard interaction; never at page startup. */
export function unlockAudio(event?: { isTrusted?: boolean }) {
  if (event?.isTrusted === false) return;
  const Constructor = audioConstructor();
  if (!Constructor) return;
  unlocked = true;
  try {
    ctx ??= new Constructor();
    void ctx.resume().catch(() => {});
  } catch {}
}
export type SoundKind =
  | "select"
  | "match"
  | "create"
  | "power"
  | "duo"
  | "cascade"
  | "win"
  | "book";
export const soundNotes: Record<SoundKind, number[]> = {
  select: [392],
  match: [523, 659],
  create: [659, 880, 1318],
  power: [392, 784, 1175, 1568],
  duo: [330, 494, 784, 988, 1480],
  cascade: [587, 784, 988, 1175],
  win: [523, 659, 784, 1046, 1318],
  book: [659, 784],
};
function bell(
  audio: AudioContext,
  frequency: number,
  time: number,
  duration: number,
  volume: number,
  nodes?: OscillatorNode[],
) {
  for (const [ratio, weight] of [
    [1, 1],
    [2, 0.15],
  ]) {
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency * ratio;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume * weight, time + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(time);
    osc.stop(time + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    nodes?.push(osc);
  }
}
export function sound(enabled: boolean, type: SoundKind) {
  if (!enabled || !unlocked || !ctx) return;
  try {
    const audio = ctx;
    void audio.resume().catch(() => {});
    const notes = soundNotes[type];
    const volume = type === "select" ? 0.018 : type === "duo" ? 0.024 : 0.03;
    const duration =
      type === "power" || type === "duo"
        ? 0.52
        : type === "create"
          ? 0.36
          : 0.25;
    notes.forEach((f, i) =>
      bell(
        audio,
        f,
        audio.currentTime + i * (type === "duo" ? 0.055 : 0.075),
        duration,
        volume,
      ),
    );
  } catch {}
}
/** Finite instrumental themes; stop immediately when their scene closes. */
export function ceremonyMusic(enabled: boolean, kind: "blade" | "family") {
  const nodes: OscillatorNode[] = [];
  let cancelled = false;
  if (enabled && unlocked && ctx)
    try {
      const audio = ctx;
      void audio
        .resume()
        .then(() => {
          if (cancelled || audio.state !== "running") return;
          const notes =
            kind === "blade"
              ? [392, 494, 587, 659, 587, 494, 440, 392]
              : [262, 330, 392, 494, 440, 392, 330, 294, 262, 330, 392, 523];
          const step = kind === "blade" ? 0.48 : 0.65;
          notes.forEach((f, i) =>
            bell(
              audio,
              f,
              audio.currentTime + 0.05 + i * step,
              step * 2.1,
              kind === "blade" ? 0.025 : 0.021,
              nodes,
            ),
          );
        })
        .catch(() => {});
    } catch {}
  return () => {
    cancelled = true;
    for (const node of nodes)
      try {
        node.stop();
      } catch {}
  };
}
