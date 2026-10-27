import { useEffect, useRef, type RefObject } from "react";
import { asset, names } from "./config";
import type { Board, Wave } from "./engine";
import { feedbackProfile, ParticlePool } from "./vfx";
import { AtlasEffects } from "./AtlasEffects";
import { powerHitDelay } from "./powerTimeline";

const colors = [
  "#f394b0",
  "#a8d665",
  "#6dc6f0",
  "#87e4df",
  "#caa0ea",
  "#f0b667",
  "#d9bc8c",
];
class BoardVfx {
  readonly pool = new ParticlePool(180);
  private readonly atlas = new AtlasEffects();
  private images: HTMLImageElement[] = [];
  private frame = 0;
  private last = 0;
  private seed = 918237;
  private ratio = 1;
  private width = 0;
  private height = 0;
  private animations = new Set<Animation>();
  private targets = new Map<number, HTMLElement>();
  private cells = Array.from({ length: 56 }, () => ({ x: 0, y: 0 }));
  private samples = 0;
  private work = 0;
  private ctx: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  constructor(
    private canvas: HTMLCanvasElement,
    private screen: HTMLElement,
    private grid: HTMLElement,
    stage: number,
  ) {
    this.ctx = canvas.getContext("2d")!;
    for (let i = 0; i < names[stage - 1].length; i++) {
      const img = new Image();
      img.src = asset(`tile-${stage}-${i}`);
      this.images.push(img);
    }
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(screen);
    document.addEventListener("visibilitychange", this.visibility);
    this.resize();
    canvas.dataset.budget = "180";
  }
  private random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  private visibility = () => {
    if (document.hidden) this.stop();
  };
  private resize() {
    this.stop();
    this.width = this.screen.clientWidth;
    this.height = this.screen.clientHeight;
    this.ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    this.canvas.width = Math.round(this.width * this.ratio);
    this.canvas.height = Math.round(this.height * this.ratio);
  }
  private point(x: number, y: number, r = this.screen.getBoundingClientRect()) {
    return document.documentElement.classList.contains("portrait-fallback")
      ? { x: y - r.top, y: r.right - x }
      : { x: x - r.left, y: y - r.top };
  }
  private cell(index: number) {
    return this.cells[index];
  }
  private pulse(target: number) {
    const el = this.targets.get(target);
    if (!el?.isConnected) return;
    const a = el.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.13)", offset: 0.36 },
        { transform: "scale(1)" },
      ],
      { duration: 310, easing: "cubic-bezier(.2,.8,.3,1)" },
    );
    this.animations.add(a);
    a.onfinish = () => this.animations.delete(a);
    a.oncancel = () => this.animations.delete(a);
  }
  wave(board: Board, wave: Wave, depth: number, needed: number[]) {
    // One read pass captures the actual tile centers, including padding and rotation.
    const bounds = this.screen.getBoundingClientRect();
    for (let i = 0; i < this.grid.children.length; i++) {
      const r = this.grid.children[i].getBoundingClientRect();
      const p = this.point(r.left + r.width / 2, r.top + r.height / 2, bounds);
      this.cells[i].x = p.x;
      this.cells[i].y = p.y;
    }
    const profile = feedbackProfile(wave.board, wave, depth),
      cellSize = (this.grid.children[0] as HTMLElement).clientWidth;
    this.atlas.wave(board, wave, this.cells, cellSize, profile.clearMs);
    this.canvas.dataset.effectTypes = wave.effects
      .slice(0, 6)
      .map((e) => e.type)
      .join(",");
    if (this.canvas.dataset.beams !== String(this.atlas.beamCount))
      this.canvas.dataset.beams = String(this.atlas.beamCount);
    if (this.canvas.dataset.clips !== String(this.atlas.clipCount))
      this.canvas.dataset.clips = String(this.atlas.clipCount);
    for (const kind of needed) {
      const el = this.screen.querySelector<HTMLElement>(
        `[data-objective-kind="${kind}"]`,
      );
      const source = wave.clear.find((i) => board[i].kind === kind);
      if (!el || source === undefined) continue;
      this.targets.set(kind, el);
      const r = el.getBoundingClientRect(),
        to = this.point(r.left + r.width / 2, r.top + r.height / 2, bounds),
        from = this.cell(source);
      this.pool.emit({
        type: "flight",
        ...from,
        tx: to.x,
        ty: to.y,
        cx: from.x + (to.x - from.x) * 0.65 + 24,
        cy: Math.min(from.y, to.y) + 15,
        life: Math.min(0.36, profile.clearMs / 1000 - 0.025),
        age: -Math.max(0, profile.clearMs / 1000 - 0.36 - 0.025),
        size: Math.min(17, cellSize * 0.29),
        sprite: kind,
        target: kind,
        color: colors[kind],
      });
    }
    let emitted = 0;
    const perCell = Math.min(
      7,
      Math.ceil(profile.burstLimit / Math.max(1, wave.clear.length)),
    );
    for (const index of wave.clear) {
      const p = this.cell(index),
        kind = board[index].kind;
      for (
        let j = 0;
        j < perCell && emitted < profile.burstLimit;
        j++, emitted++
      ) {
        const angle = this.random() * Math.PI * 2,
          speed = (28 + this.random() * 65) * profile.intensity;
        this.pool.emit({
          type: j % 3 === 0 ? "chip" : j % 3 === 1 ? "petal" : "spark",
          ...p,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 24,
          gravity: 90,
          age: -powerHitDelay(index, wave.effects) / 1000,
          life: 0.36 + this.random() * 0.22,
          size: j % 3 === 0 ? cellSize * 0.18 : 3 + this.random() * 3,
          rotation: angle,
          spin: (this.random() - 0.5) * 6,
          color: colors[kind],
          sprite: kind,
        });
      }
    }
    for (const index of wave.created) {
      const p = this.cell(index);
      this.pool.emit({
        type: "ring",
        ...p,
        size: cellSize * 0.6,
        life: 0.5,
        color: "#f7d382",
      });
      for (let j = 0; j < (profile.tier === 5 ? 22 : 12); j++) {
        const angle = (j * Math.PI * 2) / (profile.tier === 5 ? 22 : 12),
          radius = cellSize * (profile.tier === 5 ? 1.6 : 0.95);
        this.pool.emit({
          type: "spark",
          x: p.x + Math.cos(angle) * radius,
          y: p.y + Math.sin(angle) * radius,
          vx: (-Math.cos(angle) * radius) / 0.36,
          vy: (-Math.sin(angle) * radius) / 0.36,
          life: 0.36,
          size: 3 + profile.tier * 0.3,
          color: profile.tier === 5 ? colors[j % 6] : "#f5d58c",
        });
      }
    }
    for (const e of wave.effects) {
      const p = this.cell(e.index);
      if (e.type === "area" || e.type === "color")
        this.pool.emit({
          type: "ring",
          ...p,
          size:
            e.type === "area" ? cellSize * 1.6 : this.grid.clientWidth * 0.6,
          life: 0.7,
          color: e.type === "color" ? "#d5b4ed" : "#f8d891",
        });
      if (e.type === "color")
        for (const i of wave.clear.slice(0, 14)) {
          const to = this.cell(i);
          this.pool.emit({
            type: "flight",
            ...p,
            tx: to.x,
            ty: to.y,
            cx: (p.x + to.x) / 2 + 15,
            cy: (p.y + to.y) / 2 - 30,
            life: 0.42,
            size: 4,
            color: colors[board[i].kind],
            target: -1,
          });
        }
    }
    this.canvas.dataset.peak = String(this.pool.peak);
    this.canvas.dataset.emissions = String(
      Number(this.canvas.dataset.emissions || 0) + 1,
    );
    if (!this.frame) {
      this.last = performance.now();
      this.canvas.dataset.running = "true";
      this.frame = requestAnimationFrame(this.draw);
    }
  }
  private draw = (now: number) => {
    const started = performance.now(),
      // Positions are analytic, so elapsed wall time safely catches up after a slow frame.
      dt = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    this.pool.step(dt, (target) => this.pulse(target));
    const ctx = this.ctx;
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    this.atlas.draw(ctx, dt);
    for (const p of this.pool.particles) {
      if (!p.active || p.age < 0) continue;
      const t = p.age / p.life,
        fade = Math.pow(1 - t, 0.65);
      let x = p.x + p.vx * p.age,
        y = p.y + p.vy * p.age + p.gravity * p.age * p.age * 0.5;
      if (p.type === "flight") {
        const q = t * t * (3 - 2 * t),
          a = 1 - q;
        x = a * a * p.x + 2 * a * q * p.cx + q * q * p.tx;
        y = a * a * p.y + 2 * a * q * p.cy + q * q * p.ty;
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        const prev = Math.max(0, q - 0.11),
          b = 1 - prev;
        ctx.beginPath();
        ctx.moveTo(
          b * b * p.x + 2 * b * prev * p.cx + prev * prev * p.tx,
          b * b * p.y + 2 * b * prev * p.cy + prev * prev * p.ty,
        );
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rotation + p.spin * p.age);
      ctx.globalAlpha = p.type === "flight" ? 0.9 : fade * 0.9;
      ctx.fillStyle = p.color;
      const size =
        p.size *
        (p.type === "ring"
          ? 0.2 + t * 2.5
          : p.type === "flight"
            ? 1
            : 1 - t * 0.4);
      if (p.type === "ring") {
        ctx.globalAlpha = fade * 0.5;
        ctx.lineWidth = 2;
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (
        (p.type === "chip" || p.type === "flight") &&
        p.sprite >= 0 &&
        this.images[p.sprite]?.complete &&
        this.images[p.sprite].naturalWidth
      ) {
        ctx.drawImage(this.images[p.sprite], -size, -size, size * 2, size * 2);
      } else if (p.type === "petal") {
        this.atlas.particle(
          ctx,
          p.sprite % 2 === 0 ? "leaf" : "petal",
          size * 1.25,
          fade * 0.95,
        );
      } else {
        this.atlas.particle(ctx, "spark", size, fade * 0.9);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    this.samples++;
    this.work += performance.now() - started;
    if (this.canvas.dataset.beams !== String(this.atlas.beamCount))
      this.canvas.dataset.beams = String(this.atlas.beamCount);
    if (this.canvas.dataset.clips !== String(this.atlas.clipCount))
      this.canvas.dataset.clips = String(this.atlas.clipCount);
    if (this.pool.count() || this.atlas.active)
      this.frame = requestAnimationFrame(this.draw);
    else {
      this.frame = 0;
      this.canvas.dataset.running = "false";
      this.canvas.dataset.renderMs = (this.work / this.samples).toFixed(3);
    }
  };
  private stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.pool.clear();
    this.atlas.clear();
    this.canvas.dataset.beams = "0";
    this.canvas.dataset.clips = "0";
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.dataset.running = "false";
  }
  dispose() {
    this.stop();
    this.observer.disconnect();
    document.removeEventListener("visibilitychange", this.visibility);
    for (const a of this.animations) a.cancel();
    this.animations.clear();
    this.targets.clear();
    this.images = [];
  }
}

export function useGameVfx(
  canvas: RefObject<HTMLCanvasElement | null>,
  screen: RefObject<HTMLElement | null>,
  grid: RefObject<HTMLDivElement | null>,
  stage: number,
  enabled: boolean,
) {
  const controller = useRef<BoardVfx | null>(null);
  useEffect(() => {
    if (
      !enabled ||
      !canvas.current ||
      !screen.current ||
      !grid.current ||
      !canvas.current.getContext("2d")
    )
      return;
    const instance = new BoardVfx(
      canvas.current,
      screen.current,
      grid.current,
      stage,
    );
    controller.current = instance;
    return () => {
      instance.dispose();
      controller.current = null;
    };
  }, [canvas, screen, grid, stage, enabled]);
  return controller;
}
