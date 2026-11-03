import { BUILDING, CENTER, MAP_SIZE } from './data';
import type { GameState, Point, Terrain } from './types';
export function random(x: number, y: number, seed = 73) {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 12.7) * 43758.5453;
  return v - Math.floor(v);
}
export function terrain(x: number, y: number, seed = 73): Terrain {
  if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return 'water';
  const river = 32 + Math.sin(y * 0.18) * 3;
  if (Math.abs(x - river) < 1.6 || x + y > 83 || x + y < 7) return 'water';
  if (Math.abs(x - river) < 2.4 || x + y > 81) return 'sand';
  if (Math.hypot(x - CENTER.x, y - CENTER.y) < 6) return 'grass';
  const n = random(Math.floor(x / 3), Math.floor(y / 3), seed);
  if ((x < 18 || y < 19 || y > 29) && n > 0.27 && random(x, y, seed) > 0.19) return 'forest';
  if ((x < 20 || y > 27) && n < 0.22 && random(x, y, seed) > 0.3) return 'rock';
  return 'grass';
}
export function visible(state: GameState, x: number, y: number) {
  return (
    Math.hypot(x - CENTER.x, y - CENTER.y) < 13 ||
    state.regions.some((r) => r.explored && Math.hypot(x - r.x, y - r.y) < 12)
  );
}
export function ground(state: GameState, x: number, y: number): Terrain {
  return state.cleared.includes(x + y * MAP_SIZE) ? 'grass' : terrain(x, y, state.seed);
}
export function at(state: GameState, x: number, y: number, ignore?: number) {
  return state.buildings.find(
    (b) =>
      b.id !== ignore &&
      x >= b.x &&
      y >= b.y &&
      x < b.x + BUILDING[b.type].size &&
      y < b.y + BUILDING[b.type].size,
  );
}
export function walkable(state: GameState, x: number, y: number) {
  if (
    x < 1 ||
    y < 1 ||
    x >= MAP_SIZE - 1 ||
    y >= MAP_SIZE - 1 ||
    terrain(x, y, state.seed) === 'water'
  )
    return false;
  const b = at(state, x, y);
  return !b || ['road', 'gate', 'fire', 'plaza', 'trap'].includes(b.type);
}
export function pathfind(state: GameState, from: Point, to: Point): Point[] {
  const start = { x: Math.floor(from.x), y: Math.floor(from.y) };
  const goal = { x: Math.floor(to.x), y: Math.floor(to.y) };
  if (start.x === goal.x && start.y === goal.y) return [];
  const key = (p: Point) => p.x + p.y * MAP_SIZE;
  const queue: Point[] = [start],
    previous = new Map<number, Point | null>([[key(start), null]]);
  let index = 0;
  while (index < queue.length && index < MAP_SIZE * MAP_SIZE) {
    const p = queue[index++];
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const next = { x: p.x + dx, y: p.y + dy },
        k = key(next);
      if (previous.has(k) || !walkable(state, next.x, next.y)) continue;
      previous.set(k, p);
      if (next.x === goal.x && next.y === goal.y) {
        const route: Point[] = [next];
        let cur: Point | null | undefined = p;
        while (cur && key(cur) !== key(start)) {
          route.unshift(cur);
          cur = previous.get(key(cur));
        }
        return route.map((n) => ({ x: n.x + 0.5, y: n.y + 0.5 }));
      }
      queue.push(next);
    }
  }
  return [];
}
export function reachable(
  state: GameState,
  from: Point,
  predicate: (x: number, y: number) => boolean,
): { point: Point; path: Point[] } | null {
  const start = { x: Math.floor(from.x), y: Math.floor(from.y) },
    key = (p: Point) => p.x + p.y * MAP_SIZE;
  const queue = [start],
    previous = new Map<number, Point | null>([[key(start), null]]);
  let index = 0;
  while (index < queue.length && index < MAP_SIZE * MAP_SIZE) {
    const p = queue[index++];
    if (walkable(state, p.x, p.y) && predicate(p.x, p.y)) {
      const route: Point[] = [];
      let cur: Point | null | undefined = p;
      while (cur && key(cur) !== key(start)) {
        route.unshift({ x: cur.x + 0.5, y: cur.y + 0.5 });
        cur = previous.get(key(cur));
      }
      return { point: { x: p.x + 0.5, y: p.y + 0.5 }, path: route };
    }
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const next = { x: p.x + dx, y: p.y + dy };
      if (!previous.has(key(next)) && walkable(state, next.x, next.y)) {
        previous.set(key(next), p);
        queue.push(next);
      }
    }
  }
  return null;
}
export function nearest(
  state: GameState,
  from: Point,
  predicate: (x: number, y: number) => boolean,
  maxRadius = 15,
): Point | null {
  for (let r = 0; r <= maxRadius; r++)
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = Math.floor(from.x) + dx,
          y = Math.floor(from.y) + dy;
        if (walkable(state, x, y) && predicate(x, y)) return { x: x + 0.5, y: y + 0.5 };
      }
  return null;
}
export function entrance(state: GameState, b: Point & { type: string }, from?: Point): Point {
  const n = BUILDING[b.type].size;
  if (from) {
    const found = reachable(
      state,
      from,
      (x, y) => x >= b.x - 1 && x <= b.x + n && y >= b.y - 1 && y <= b.y + n,
    );
    if (found) return found.point;
  }
  return (
    nearest(state, { x: b.x + n, y: b.y + n - 1 }, () => true, 5) ?? {
      x: b.x + n + 0.5,
      y: b.y + n + 0.5,
    }
  );
}
