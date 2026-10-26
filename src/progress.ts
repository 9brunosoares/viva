export type Progress = {
  version: 1;
  order: number[];
  completed: number[];
  sound: boolean;
  motion: boolean;
  revealed?: Milestone[];
  pendingCelebration?: {
    kind: Milestone;
    bookId: number;
    step: "book" | "reveal";
  };
};
export type Milestone = "blade" | "family";
export const milestoneStage = (kind: Milestone) => (kind === "blade" ? 5 : 10);
export function isRevealed(p: Progress, kind: Milestone) {
  return p.revealed
    ? p.revealed.includes(kind)
    : p.completed.length >= milestoneStage(kind);
}
export function acceptMilestoneBook(p: Progress): Progress {
  return p.pendingCelebration
    ? { ...p, pendingCelebration: { ...p.pendingCelebration, step: "reveal" } }
    : p;
}
export function finishMilestone(p: Progress): Progress {
  if (!p.pendingCelebration) return p;
  const { pendingCelebration, ...rest } = p;
  const revealed = (["blade", "family"] as Milestone[]).filter(
    (k) => isRevealed(p, k) || k === pendingCelebration.kind,
  );
  return { ...rest, revealed };
}
export const KEY = "viva-progress-v1";
export function fresh(rng = Math.random): Progress {
  const order = Array.from({ length: 10 }, (_, i) => i + 1);
  for (let i = 9; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    version: 1,
    order,
    completed: [],
    sound: true,
    motion: true,
    revealed: [],
  };
}
export function validate(value: unknown): value is Progress {
  if (!value || typeof value !== "object") return false;
  const p = value as Progress;
  return (
    p.version === 1 &&
    Array.isArray(p.order) &&
    p.order.length === 10 &&
    new Set(p.order).size === 10 &&
    p.order.every((n) => Number.isInteger(n) && n >= 1 && n <= 10) &&
    Array.isArray(p.completed) &&
    new Set(p.completed).size === p.completed.length &&
    p.completed.every((n, i) => n === i + 1) &&
    typeof p.sound === "boolean" &&
    typeof p.motion === "boolean" &&
    (p.revealed === undefined ||
      (Array.isArray(p.revealed) &&
        new Set(p.revealed).size === p.revealed.length &&
        p.revealed.every(
          (k) =>
            (k === "blade" || k === "family") &&
            p.completed.length >= milestoneStage(k),
        ))) &&
    (p.pendingCelebration === undefined ||
      (!!p.pendingCelebration &&
        typeof p.pendingCelebration === "object" &&
        (p.pendingCelebration.kind === "blade" ||
          p.pendingCelebration.kind === "family") &&
        (p.pendingCelebration.step === "book" ||
          p.pendingCelebration.step === "reveal") &&
        p.completed.length === milestoneStage(p.pendingCelebration.kind) &&
        p.pendingCelebration.bookId ===
          p.order[milestoneStage(p.pendingCelebration.kind) - 1] &&
        !p.revealed?.includes(p.pendingCelebration.kind)))
  );
}
export function load(storage: Pick<Storage, "getItem">): {
  progress: Progress;
  warning: string;
} {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { progress: fresh(), warning: "" };
    const p = JSON.parse(raw);
    if (validate(p)) return { progress: p, warning: "" };
    return {
      progress: fresh(),
      warning:
        "O progresso salvo não pôde ser lido. Uma nova campanha está disponível.",
    };
  } catch {
    return {
      progress: fresh(),
      warning: "Não foi possível acessar o progresso neste navegador.",
    };
  }
}
export function save(p: Progress, storage: Pick<Storage, "setItem">) {
  try {
    storage.setItem(KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
export function complete(p: Progress, id: number): Progress {
  return p.pendingCelebration ||
    p.completed.includes(id) ||
    id !== p.completed.length + 1
    ? p
    : {
        ...p,
        completed: [...p.completed, id],
        ...(id === 5 || id === 10
          ? {
              revealed: (["blade", "family"] as Milestone[]).filter((k) =>
                isRevealed(p, k),
              ),
              pendingCelebration: {
                kind: id === 5 ? ("blade" as const) : ("family" as const),
                bookId: p.order[id - 1],
                step: "book" as const,
              },
            }
          : {}),
      };
}
export const libraryState = (n: number) =>
  n < 2 ? 0 : n < 5 ? 1 : n < 8 ? 2 : 3;
