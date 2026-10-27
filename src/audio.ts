import type { Special } from "./engine";

// The approved, pre-upgrade instruments and melodies. No continuous soundtrack.
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
export type AudioPreferences = {
  muted: boolean;
  music: number;
  effects: number;
};
export const AUDIO_KEY = "viva-audio-v3";
const clamp = (n: number) => Math.max(0, Math.min(1, n));
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
export const audioAvailable = () => typeof audioConstructor() === "function";
export function readAudioPreferences(sound = true): AudioPreferences {
  for (const key of [AUDIO_KEY, "viva-audio-v2", "viva-audio-v1"])
    try {
      const p = JSON.parse(localStorage.getItem(key) || "null");
      if (p && typeof p.muted === "boolean" && Number.isFinite(p.effects))
        return { muted: p.muted, music: 0, effects: clamp(p.effects) };
    } catch {}
  return { muted: !sound, music: 0, effects: 0.6 };
}
type Voice = { osc: OscillatorNode; gain: GainNode };
/** Original bells, with only mute/volume, bounded voices and lifecycle protection added. */
export class AudioDirector {
  private ctx?: AudioContext;
  private master?: GainNode;
  private voices = new Set<Voice>();
  private unlocked = false;
  private hidden = false;
  private prefs: AudioPreferences = { muted: false, music: 0, effects: 0.6 };
  constructor(
    private environment: { create?: () => AudioContext | undefined } = {},
  ) {}
  prepare() {} // No files or network are needed for the original instruments.
  async unlock(event?: { isTrusted?: boolean }) {
    if (event?.isTrusted === false || this.hidden) return;
    try {
      if (!this.ctx) {
        const C = audioConstructor();
        this.ctx = this.environment.create
          ? this.environment.create()
          : C
            ? new C()
            : undefined;
        if (!this.ctx) return;
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.master.gain.value = this.prefs.muted
          ? 0
          : this.prefs.effects / 0.6;
      }
      this.unlocked = true;
      await this.ctx.resume();
    } catch {
      this.unlocked = false;
    }
  }
  configure(next: AudioPreferences) {
    this.prefs = { muted: next.muted, effects: clamp(next.effects), music: 0 };
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(
        next.muted ? 0 : this.prefs.effects / 0.6,
        this.ctx.currentTime,
        0.012,
      );
    }
    if (next.muted || !next.effects) this.stopAll();
  }
  private audible() {
    return (
      !!this.ctx &&
      this.unlocked &&
      !this.hidden &&
      !this.prefs.muted &&
      this.prefs.effects > 0
    );
  }
  private stop(v: Voice) {
    try {
      v.osc.stop();
    } catch {}
    v.osc.disconnect();
    v.gain.disconnect();
    this.voices.delete(v);
  }
  private stopAll() {
    for (const v of this.voices) this.stop(v);
  }
  private bell(
    frequency: number,
    time: number,
    duration: number,
    volume: number,
    group?: Voice[],
  ) {
    const audio = this.ctx!;
    for (const [ratio, weight] of [
      [1, 1],
      [2, 0.15],
    ]) {
      const osc = audio.createOscillator(),
        gain = audio.createGain(),
        v = { osc, gain };
      this.voices.add(v);
      group?.push(v);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        this.voices.delete(v);
      };
      osc.type = "sine";
      osc.frequency.value = frequency * ratio;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume * weight, time + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start(time);
      osc.stop(time + duration + 0.02);
    }
  }
  effect(
    type: SoundKind,
    _options?: { duration?: number; pan?: number; cooldown?: number },
  ) {
    const notes = soundNotes[type];
    if (!this.audible() || !notes || this.voices.size + notes.length * 2 > 96)
      return false;
    const group: Voice[] = [];
    try {
      const volume = type === "select" ? 0.018 : type === "duo" ? 0.024 : 0.03;
      const duration =
        type === "power" || type === "duo"
          ? 0.52
          : type === "create"
            ? 0.36
            : 0.25;
      notes.forEach((f, i) =>
        this.bell(
          f,
          this.ctx!.currentTime + i * (type === "duo" ? 0.055 : 0.075),
          duration,
          volume,
          group,
        ),
      );
      return true;
    } catch {
      for (const v of group) this.stop(v);
      return false;
    }
  }
  ceremony(enabled: boolean, kind: "blade" | "family") {
    const nodes: Voice[] = [];
    let cancelled = false;
    if (enabled && this.audible()) {
      const audio = this.ctx!;
      void audio
        .resume()
        .then(() => {
          if (
            cancelled ||
            !this.audible() ||
            this.ctx !== audio ||
            audio.state !== "running"
          )
            return;
          const notes =
            kind === "blade"
              ? [392, 494, 587, 659, 587, 494, 440, 392]
              : [262, 330, 392, 494, 440, 392, 330, 294, 262, 330, 392, 523];
          const step = kind === "blade" ? 0.48 : 0.65;
          if (this.voices.size + notes.length * 2 > 96) return;
          try {
            notes.forEach((f, i) =>
              this.bell(
                f,
                audio.currentTime + 0.05 + i * step,
                step * 2.1,
                kind === "blade" ? 0.025 : 0.021,
                nodes,
              ),
            );
          } catch {
            for (const v of nodes) this.stop(v);
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      for (const v of nodes) this.stop(v);
    };
  }
  visibility(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) {
      this.unlocked = false;
      this.stopAll();
      void this.ctx?.suspend().catch(() => {});
    }
  }
  inspect() {
    return {
      available: !!this.ctx,
      unlocked: this.unlocked,
      muted: this.prefs.muted,
      voices: this.voices.size,
      fxNodes: this.voices.size,
      musicNodes: 0,
      tracks: [],
      levels: { ...this.prefs },
      state: this.ctx?.state,
    };
  }
  dispose() {
    this.stopAll();
    this.master?.disconnect();
    this.master = undefined;
    const c = this.ctx;
    this.ctx = undefined;
    this.unlocked = false;
    void c?.close().catch(() => {});
  }
}
export const audioDirector = new AudioDirector();
export const unlockAudio = (event?: { isTrusted?: boolean }) => {
  void audioDirector.unlock(event);
};
export function sound(
  enabled: boolean,
  type: SoundKind,
  options?: { duration?: number },
) {
  if (enabled) audioDirector.effect(type, options);
}
export function ceremonyMusic(enabled: boolean, kind: "blade" | "family") {
  return audioDirector.ceremony(enabled, kind);
}
/** Sound still starts in the visual wave commit; its approved musical identity is unchanged. */
export function waveSound(
  enabled: boolean,
  wave: {
    tier: number;
    depth: number;
    powers: number;
    power?: Special;
    clearMs: number;
  },
  _motion = true,
) {
  sound(
    enabled,
    wave.powers > 1
      ? "duo"
      : wave.powers
        ? "power"
        : wave.depth >= 2
          ? "cascade"
          : "match",
  );
}
