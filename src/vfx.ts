import type { Board, Wave } from "./engine";

/** Presentation-only timing; no random draws or writes to the game board. */
export const fallDuration = (depth: number) => Math.max(235, 350 - depth * 18);
export const fallTweenDuration = (dy: number, depth: number) =>
  Math.min(fallDuration(depth) - 20, 220 + Math.abs(dy) * 0.3);
/** Same movement budget as useTileMotion, including its column stagger and a paint margin. */
export function fallWait(
  before: Board,
  after: Board,
  origins: Map<number, number>,
  depth: number,
  stepY: number,
) {
  const old = new Map(before.map((t, i) => [t.id, i]));
  const entering = new Array(7).fill(0);
  after.forEach((t, i) => {
    if (!old.has(t.id) && !origins.has(t.id)) entering[i % 7]++;
  });
  let longest = 0;
  after.forEach((t, i) => {
    const from = old.get(t.id) ?? origins.get(t.id);
    if (from === i) return;
    const dy =
      from === undefined
        ? -entering[i % 7] * stepY
        : (Math.floor(from / 7) - Math.floor(i / 7)) * stepY;
    longest = Math.max(longest, fallTweenDuration(dy, depth) + (i % 7) * 3);
  });
  // The inner birth animation lasts 320 ms even when the new power hardly falls.
  return Math.max(
    origins.size ? 336 : 0,
    Math.min(fallDuration(depth), Math.ceil(longest + 16)),
  );
}
export function feedbackProfile(board: Board, wave: Wave, depth: number) {
  const tier = wave.created.some((i) => board[i]?.special === "color")
    ? 5
    : wave.created.length
      ? 4
      : 3;
  const intensity = Math.min(3, 1 + depth * 0.35);
  const clearMs =
    wave.powers > 1
      ? 1000
      : wave.effects.some((e) => e.type === "color")
        ? 920
        : wave.effects.some((e) => e.type === "area")
          ? 800
          : wave.powers
            ? 760
            : Math.max(
                240,
                (tier === 5 ? 450 : tier === 4 ? 350 : 300) - depth * 15,
              );
  return {
    tier,
    intensity,
    clearMs,
    fallMs: fallDuration(depth),
    burstLimit:
      wave.powers > 1
        ? 126
        : wave.powers
          ? 98
          : Math.min(76, Math.round(28 * intensity + (tier - 3) * 10)),
  };
}

export type Particle = {
  active: boolean;
  type: "spark" | "chip" | "petal" | "ring" | "flight";
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  life: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  sprite: number;
  tx: number;
  ty: number;
  cx: number;
  cy: number;
  target: number;
};
export class ParticlePool {
  readonly particles: Particle[];
  peak = 0;
  dropped = 0;
  constructor(readonly capacity = 180) {
    this.particles = Array.from({ length: capacity }, () => ({
      active: false,
      type: "spark",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      gravity: 0,
      age: 0,
      life: 0.4,
      size: 4,
      rotation: 0,
      spin: 0,
      color: "#f5d58c",
      sprite: -1,
      tx: 0,
      ty: 0,
      cx: 0,
      cy: 0,
      target: -1,
    }));
  }
  emit(values: Partial<Particle>) {
    let p = this.particles.find((p) => !p.active);
    if (!p) {
      let oldest = -Infinity;
      for (const candidate of this.particles)
        if (
          candidate.type !== "flight" &&
          candidate.age / candidate.life > oldest
        ) {
          p = candidate;
          oldest = candidate.age / candidate.life;
        }
      this.dropped++;
    }
    if (!p) return;
    Object.assign(
      p,
      {
        active: true,
        type: "spark",
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        gravity: 0,
        age: 0,
        life: 0.4,
        size: 4,
        rotation: 0,
        spin: 0,
        color: "#f5d58c",
        sprite: -1,
        tx: 0,
        ty: 0,
        cx: 0,
        cy: 0,
        target: -1,
      },
      values,
    );
    this.peak = Math.max(this.peak, this.count());
  }
  count() {
    let n = 0;
    for (const p of this.particles) if (p.active) n++;
    return n;
  }
  step(dt: number, onArrival?: (target: number) => void) {
    for (const p of this.particles)
      if (p.active) {
        p.age += Math.max(0, dt);
        if (p.age >= p.life) {
          p.active = false;
          if (p.type === "flight") onArrival?.(p.target);
        }
      }
  }
  clear() {
    for (const p of this.particles) p.active = false;
  }
}
