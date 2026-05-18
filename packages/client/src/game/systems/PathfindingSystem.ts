import EasyStar from 'easystarjs';
import type { TileCoord } from 'phaserquest-shared';

export class ClientPathfinder {
  private easystar: EasyStar.js;

  constructor(grid: number[][]) {
    this.easystar = new EasyStar.js();
    this.easystar.setGrid(grid);
    this.easystar.setAcceptableTiles([0]);
  }

  setGrid(grid: number[][]): void {
    this.easystar.setGrid(grid);
  }

  findPath(start: TileCoord, end: TileCoord): Promise<TileCoord[]> {
    return new Promise((resolve) => {
      this.easystar.findPath(start.x, start.y, end.x, end.y, (path) => {
        resolve(path ? path.map((p) => ({ x: p.x, y: p.y })) : []);
      });
      this.easystar.calculate();
    });
  }

  findPathSync(start: TileCoord, end: TileCoord, grid: number[][]): TileCoord[] {
    const pathfinder = new EasyStar.js();
    pathfinder.setGrid(grid);
    pathfinder.setAcceptableTiles([0]);

    let result: TileCoord[] = [];
    pathfinder.findPath(start.x, start.y, end.x, end.y, (path) => {
      result = path ? path.map((p) => ({ x: p.x, y: p.y })) : [];
    });
    pathfinder.calculate();

    const iterLimit = 1000;
    let iter = 0;
    while (result.length === 0 && iter < iterLimit) {
      pathfinder.calculate();
      iter++;
    }

    return result;
  }
}
