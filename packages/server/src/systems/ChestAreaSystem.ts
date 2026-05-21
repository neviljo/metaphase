export function chestarea(
  properties: any,
  callback: (props: any) => void
): ChestArea {
  return new ChestArea(properties, callback);
}

export class ChestArea {
  actualN = 0;
  maxN = 0;
  properties: any;
  active = true;
  callback: (props: any) => void;

  constructor(properties: any, callback: (props: any) => void) {
    this.properties = properties;
    this.callback = callback;
  }

  incrementAll(): void {
    this.actualN++;
    this.maxN++;
  }

  increment(): void {
    this.actualN++;
    if (this.actualN === this.maxN) this.active = true;
  }

  decrement(): void {
    this.actualN--;
    if (this.active && this.actualN === 0) {
      this.callback(this.properties);
      this.active = false;
    }
  }
}
