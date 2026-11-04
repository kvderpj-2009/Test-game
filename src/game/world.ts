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
    (terrain(x, y, state.seed) === 'water' && at(state, x, y)?.type !== 'bridge')
  )
    return false;
  const b = at(state, x, y);
  return !b || ['road', 'bridge', 'gate', 'fire', 'plaza', 'trap'].includes(b.type);
}
const navigation = new WeakMap<GameState, { signature: string; grid: Uint8Array }>();
function navGrid(state: GameState) {
  const signature =
    state.seed + ':' + state.buildings.map((b) => `${b.id},${b.type},${b.x},${b.y}`).join(';');
  const cached = navigation.get(state);
  if (cached?.signature === signature) return cached.grid;
  const grid = new Uint8Array(MAP_SIZE * MAP_SIZE);
  for (let y = 1; y < MAP_SIZE - 1; y++)
    for (let x = 1; x < MAP_SIZE - 1; x++)
      grid[x + y * MAP_SIZE] = terrain(x, y, state.seed) !== 'water' ? 1 : 0;
  for (const b of state.buildings) {
    const open = ['road', 'bridge', 'gate', 'fire', 'plaza', 'trap'].includes(b.type);
    for (let dx = 0; dx < BUILDING[b.type].size; dx++)
      for (let dy = 0; dy < BUILDING[b.type].size; dy++)
        grid[b.x + dx + (b.y + dy) * MAP_SIZE] = open ? 1 : 0;
  }
  navigation.set(state, { signature, grid });
  return grid;
}
export function pathfind(state: GameState, from: Point, to: Point): Point[] {
  const grid = navGrid(state);
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
      if (
        previous.has(k) ||
        !(next.x > 0 && next.y > 0 && next.x < MAP_SIZE - 1 && next.y < MAP_SIZE - 1 && grid[k])
      )
        continue;
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
  const grid = navGrid(state);
  const start = { x: Math.floor(from.x), y: Math.floor(from.y) },
    key = (p: Point) => p.x + p.y * MAP_SIZE;
  const queue = [start],
    previous = new Map<number, Point | null>([[key(start), null]]);
  let index = 0;
  while (index < queue.length && index < MAP_SIZE * MAP_SIZE) {
    const p = queue[index++];
    if (grid[key(p)] && predicate(p.x, p.y)) {
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
      if (
        !previous.has(key(next)) &&
        next.x > 0 &&
        next.y > 0 &&
        next.x < MAP_SIZE - 1 &&
        next.y < MAP_SIZE - 1 &&
        grid[key(next)]
      ) {
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
