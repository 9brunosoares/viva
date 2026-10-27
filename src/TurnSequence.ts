/** A small cancellation scope for the existing sequential turn, not a new game engine. */
export class TurnSequence {
  private generation = 0;
  private pending = new Map<
    ReturnType<typeof setTimeout>,
    (valid: boolean) => void
  >();
  begin() {
    this.cancel();
    return this.generation;
  }
  cancel() {
    this.generation++;
    for (const [timer, resolve] of this.pending) {
      clearTimeout(timer);
      resolve(false);
    }
    this.pending.clear();
  }
  current(token: number) {
    return token === this.generation;
  }
  wait(ms: number, token: number) {
    if (!this.current(token)) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(timer);
        resolve(this.current(token));
      }, ms);
      this.pending.set(timer, resolve);
    });
  }
}
