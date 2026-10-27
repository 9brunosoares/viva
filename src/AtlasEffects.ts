import { asset } from "./config";
import { COLS, ROWS, matches, type Board, type Wave } from "./engine";
import { vfxAtlas } from "./vfxAtlas";
import { powerHitDelay } from "./powerTimeline";

type Sequence = keyof typeof vfxAtlas.sequences;
type Point = { x: number; y: number };
type Clip = Point & {
  sequence: Sequence;
  size: number;
  age: number;
  life: number;
  rotation: number;
};
type Beam = {
  index: number;
  type: "row" | "column";
  age: number;
  life: number;
  size: number;
};
let sharedTexture: HTMLImageElement | undefined;
function texture() {
  if (!sharedTexture) {
    sharedTexture = new Image();
    sharedTexture.src = asset("vfx/sequences");
    // Decode before the first combo rather than paying the atlas cost in its RAF.
    void sharedTexture.decode().catch(() => {});
  }
  return sharedTexture;
}
/** Presentation only. One shared texture, bounded clips, no timers or gameplay writes. */
export class AtlasEffects {
  private readonly image = texture();
  private clips: Clip[] = [];
  private beams: Beam[] = [];
  private cells: readonly Point[] = [];
  private cellSize = 40;
  private bounds = { left: 0, top: 0, right: 0, bottom: 0 };
  peak = 0;
  wave(
    board: Board,
    wave: Wave,
    cells: readonly Point[],
    size: number,
    ms: number,
  ) {
    this.clear();
    this.cells = cells;
    this.cellSize = size;
    this.bounds = {
      left: Math.min(...cells.map((p) => p.x)) - size * 0.6,
      top: Math.min(...cells.map((p) => p.y)) - size * 0.6,
      right: Math.max(...cells.map((p) => p.x)) + size * 0.6,
      bottom: Math.max(...cells.map((p) => p.y)) + size * 0.6,
    };
    const add = (
      sequence: Sequence,
      index: number,
      scale: number,
      delay = 0,
      duration = ms + 80,
      rotation = 0,
    ) => {
      if (this.clips.length < 18)
        this.clips.push({
          ...cells[index],
          sequence,
          size: size * scale,
          age: -delay / 1000,
          life: duration / 1000,
          rotation,
        });
    };
    const types = new Set(wave.effects.map((e) => e.type));
    // Layer genuine growth sequences only when the corresponding powers fire.
    if (types.has("color") && types.has("area"))
      add("color", wave.effects[0].index, 6.3, 100, ms - 100);
    else if (types.has("color") && (types.has("row") || types.has("column")))
      add(
        "cross",
        wave.effects[0].index,
        5.8,
        100,
        ms - 100,
        types.has("column") && !types.has("row") ? Math.PI / 2 : 0,
      );
    else if (types.has("row") && types.has("column"))
      add("cross", wave.effects[0].index, 4.6, 0, ms);
    for (const group of matches(board)
      .filter((g) => !g.cells.some((i) => wave.created.includes(i)))
      .slice(0, 3))
      add("match3", group.cells[Math.floor(group.cells.length / 2)], 2.3);
    for (const i of wave.created.slice(0, 4))
      add(
        wave.board[i].special === "color"
          ? "colorBirth"
          : wave.board[i].special === "area"
            ? "areaBirth"
            : "match4",
        i,
        wave.board[i].special === "color" ? 3.6 : 3.1,
      );
    for (const e of wave.effects.slice(0, 6)) {
      if (e.type === "row" || e.type === "column") {
        this.beams.push({ ...e, type: e.type, age: 0, life: ms / 1000, size });
        add("match4", e.index, 3.1, 0, Math.min(ms, 660));
      } else
        add(
          e.type === "area" ? "area" : "color",
          e.index,
          e.type === "area" ? 4.1 : 6.2,
          0,
          ms,
        );
    }
    // Local floral impacts keep the sweep visibly attached to affected pieces.
    // They share the exact arrival clock with disappearance and the native head.
    if (wave.effects.length) {
      const origins = new Set(wave.effects.map((e) => e.index));
      const hits = wave.clear.filter((i) => !origins.has(i));
      const stride = Math.max(1, Math.ceil(hits.length / 8));
      for (let n = 0; n < hits.length; n += stride) {
        const index = hits[n];
        add(
          "match3",
          index,
          1.75,
          powerHitDelay(index, wave.effects),
          Math.min(380, ms - powerHitDelay(index, wave.effects)),
        );
      }
    }
    this.peak = Math.max(this.peak, this.clips.length + this.beams.length);
  }
  get active() {
    return this.clips.length + this.beams.length > 0;
  }
  get beamCount() {
    return this.beams.length;
  }
  get clipCount() {
    return this.clips.length;
  }
  clear() {
    this.clips = [];
    this.beams = [];
  }
  private sprite(
    ctx: CanvasRenderingContext2D,
    sequence: Sequence,
    t: number,
    p: Point,
    size: number,
    alpha = 1,
  ) {
    if (!this.image.complete || !this.image.naturalWidth) return;
    const s = vfxAtlas.sequences[sequence],
      total = s.durations.reduce((sum, n) => sum + n, 0);
    let elapsed = Math.max(0, Math.min(0.999, t)) * total,
      index = 0;
    while (index < s.durations.length - 1 && elapsed >= s.durations[index])
      elapsed -= s.durations[index++];
    const cell = vfxAtlas.cell,
      progress = elapsed / s.durations[index];
    const blend =
      index < s.frames.length - 1
        ? Math.max(0, Math.min(1, (progress - 0.75) / 0.25))
        : 0;
    const draw = (frame: number, weight: number) => {
      if (weight <= 0 || alpha <= 0) return;
      ctx.globalAlpha = alpha * weight;
      ctx.drawImage(
        this.image,
        (frame % vfxAtlas.columns) * cell,
        Math.floor(frame / vfxAtlas.columns) * cell,
        cell,
        cell,
        p.x - size / 2,
        p.y - size / 2,
        size,
        size,
      );
    };
    draw(s.frames[index], 1 - blend);
    if (blend) draw(s.frames[index + 1], blend);
  }
  draw(ctx: CanvasRenderingContext2D, dt: number) {
    if (!this.active) return;
    ctx.save();
    const { left, top, right, bottom } = this.bounds;
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();
    for (const clip of this.clips) {
      clip.age += dt;
      const t = clip.age / clip.life;
      if (t < 0 || t >= 1) continue;
      ctx.save();
      ctx.translate(clip.x, clip.y);
      ctx.rotate(clip.rotation);
      this.sprite(
        ctx,
        clip.sequence,
        t,
        { x: 0, y: 0 },
        clip.size * (0.92 + 0.12 * Math.sin(Math.PI * t)),
        Math.min(1, t * 12) * Math.min(1, (1 - t) * 5.5),
      );
      ctx.restore();
    }
    this.clips = this.clips.filter((c) => c.age < c.life);
    for (const beam of this.beams) {
      beam.age += dt;
      if (beam.age >= beam.life) continue;
      const origin = this.cells[beam.index];
      const axis = beam.type === "row" ? "x" : "y";
      const column = beam.index % COLS,
        row = Math.floor(beam.index / COLS);
      const endpoints =
        beam.type === "row"
          ? [row * COLS, row * COLS + COLS - 1]
          : [column, (ROWS - 1) * COLS + column];
      if (beam.age < 0.07) {
        ctx.globalAlpha = (beam.age / 0.07) * 0.5;
        ctx.strokeStyle = "#ffe2a0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          origin.x,
          origin.y,
          this.cellSize * (0.15 + beam.age * 2),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      for (const endIndex of endpoints) {
        const end = this.cells[endIndex],
          delta = end[axis] - origin[axis],
          steps =
            beam.type === "row"
              ? Math.abs((endIndex % COLS) - column)
              : Math.abs(Math.floor(endIndex / COLS) - row);
        const travel = Math.max(0.042, steps * 0.042),
          time = beam.age - 0.07;
        if (time < 0 || time > travel + 0.2) continue;
        const q = Math.min(1, time / travel),
          fade = Math.min(1, (travel + 0.2 - time) / 0.2),
          front = { x: origin.x, y: origin.y };
        front[axis] += delta * q;
        if (Math.abs(delta * q) > 1) {
          const gradient = ctx.createLinearGradient(
            origin.x,
            origin.y,
            front.x,
            front.y,
          );
          gradient.addColorStop(0, "#f9bc5a00");
          gradient.addColorStop(0.65, "#ffdb8a88");
          gradient.addColorStop(1, "#fff4c9");
          ctx.globalAlpha = fade * 0.82;
          ctx.lineCap = "round";
          ctx.strokeStyle = gradient;
          ctx.lineWidth = this.cellSize * 0.32;
          ctx.beginPath();
          ctx.moveTo(origin.x, origin.y);
          ctx.lineTo(front.x, front.y);
          ctx.stroke();
          ctx.lineWidth = Math.max(2, this.cellSize * 0.045);
          ctx.globalAlpha = fade * 0.9;
          ctx.stroke();
        }
        this.sprite(
          ctx,
          beam.type === "row" ? "horizontal" : "vertical",
          time / (travel + 0.2),
          front,
          this.cellSize * 2.8,
          fade,
        );
      }
    }
    this.beams = this.beams.filter((b) => b.age < b.life);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  particle(
    ctx: CanvasRenderingContext2D,
    kind: "petal" | "leaf" | "spark",
    size: number,
    alpha: number,
  ) {
    this.sprite(ctx, kind, 0, { x: 0, y: 0 }, size * 3, alpha);
  }
}
