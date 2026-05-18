import PF from 'pathfinding';
const PFGrid = PF.Grid as any;
import type { TileCoord } from 'phaserquest-shared';

export class PathfindingSystem {
  private grid: number[][];
  private pfGrid: any;
  private finder: any;

  constructor(collisionGrid: number[][]) {
    this.grid = collisionGrid;
    this.pfGrid = new PFGrid(collisionGrid);
    this.finder = new PF.AStarFinder();
  }

  findPath(start: TileCoord, end: TileCoord): TileCoord[] {
    const gridClone = this.pfGrid.clone();
    const rawPath = this.finder.findPath(start.x, start.y, end.x, end.y, gridClone);
    return rawPath.map((p: number[]) => ({ x: p[0], y: p[1] }));
  }

  validatePath(
    path: TileCoord[],
    playerPos: TileCoord,
    maxLength = 60,
    maxDistance = 54
  ): boolean {
    if (path.length > maxLength) return false;

    const end = path[path.length - 1];
    const dist = Math.abs(path[0].x - end.x) + Math.abs(path[0].y - end.y);
    if (dist > maxDistance) return false;

    if (
      Math.abs(path[0].x - playerPos.x) > 1 ||
      Math.abs(path[0].y - playerPos.y) > 1
    ) {
      return false;
    }

    for (let p = 1; p < path.length; p++) {
      if (
        Math.abs(path[p].x - path[p - 1].x) > 1 ||
        Math.abs(path[p].y - path[p - 1].y) > 1
      ) {
        return false;
      }
      if (this.grid[path[p].y]?.[path[p].x]) {
        return false;
      }
    }

    return true;
  }

  isWalkable(x: number, y: number): boolean {
    return this.grid[y]?.[x] === 0;
  }

  getGrid(): number[][] {
    return this.grid;
  }
}
