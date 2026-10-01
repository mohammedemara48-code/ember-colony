import type { Cell } from './types';

/** Breadth-first search pathfinding on the grid. */
export function findPath(
  grid: Cell[][],
  sx: number,
  sy: number,
  gx: number,
  gy: number,
): { x: number; y: number }[] {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  if (sx === gx && sy === gy) return [];
  if (!inBounds(gx, gy, w, h) || !grid[gy][gx].walkable) return [];

  const key = (x: number, y: number) => y * w + x;
  const visited = new Uint8Array(w * h);
  const parent = new Int32Array(w * h).fill(-1);
  const qx: number[] = [sx];
  const qy: number[] = [sy];
  visited[key(sx, sy)] = 1;
  let qi = 0;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (qi < qx.length) {
    const cx = qx[qi];
    const cy = qy[qi];
    qi++;
    if (cx === gx && cy === gy) break;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inBounds(nx, ny, w, h)) continue;
      const k = key(nx, ny);
      if (visited[k]) continue;
      if (!grid[ny][nx].walkable && !(nx === gx && ny === gy)) continue;
      visited[k] = 1;
      parent[k] = key(cx, cy);
      qx.push(nx);
      qy.push(ny);
    }
  }

  const goalK = key(gx, gy);
  if (!visited[goalK]) return [];

  const path: { x: number; y: number }[] = [];
  let cur = goalK;
  while (cur !== key(sx, sy) && cur !== -1) {
    path.push({ x: cur % w, y: Math.floor(cur / w) });
    cur = parent[cur];
  }
  path.reverse();
  return path;
}

function inBounds(x: number, y: number, w: number, h: number) {
  return x >= 0 && y >= 0 && x < w && y < h;
}

/** Nearest walkable cell adjacent to a building footprint. */
export function nearestWalkable(
  grid: Cell[][],
  bx: number,
  by: number,
  bw: number,
  bh: number,
): { x: number; y: number } | null {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const candidates: { x: number; y: number; d: number }[] = [];
  for (let y = by - 1; y <= by + bh; y++) {
    for (let x = bx - 1; x <= bx + bw; x++) {
      if (!inBounds(x, y, w, h)) continue;
      const inside = x >= bx && x < bx + bw && y >= by && y < by + bh;
      if (inside) continue;
      if (!grid[y][x].walkable) continue;
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      candidates.push({ x, y, d: (x - cx) ** 2 + (y - cy) ** 2 });
    }
  }
  candidates.sort((a, b) => a.d - b.d);
  return candidates[0] ?? null;
}
