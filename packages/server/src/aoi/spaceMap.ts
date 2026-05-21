export class SpaceMap<T extends { id: number }> {
  private data = new Map<string, T[]>();

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  add(x: number, y: number, entity: T): void {
    const k = this.key(x, y);
    const arr = this.data.get(k);
    if (arr) {
      arr.push(entity);
    } else {
      this.data.set(k, [entity]);
    }
  }

  getFirst(x: number, y: number): T | undefined {
    const arr = this.data.get(this.key(x, y));
    return arr ? arr[0] : undefined;
  }

  getFirstFiltered(
    x: number,
    y: number,
    mustHave: (keyof T)[],
    mustNotHave?: (keyof T)[]
  ): T | undefined {
    const arr = this.data.get(this.key(x, y));
    if (!arr) return undefined;
    for (const entity of arr) {
      let ok = true;
      for (const prop of mustHave) {
        if (!entity[prop]) { ok = false; break; }
      }
      if (ok && mustNotHave) {
        for (const prop of mustNotHave) {
          if (entity[prop]) { ok = false; break; }
        }
      }
      if (ok) return entity;
    }
    return undefined;
  }

  move(fromX: number, fromY: number, toX: number, toY: number, entity: T): void {
    this.delete(fromX, fromY, entity);
    this.add(toX, toY, entity);
  }

  delete(x: number, y: number, entity: T): void {
    const k = this.key(x, y);
    const arr = this.data.get(k);
    if (!arr) return;
    const idx = arr.indexOf(entity);
    if (idx >= 0) arr.splice(idx, 1);
    if (arr.length === 0) this.data.delete(k);
  }
}
