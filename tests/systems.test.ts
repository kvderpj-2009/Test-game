import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Engine, newGame } from '../src/game/engine';
import { MISSION_IDS } from '../src/game/data';
import { UNITS } from '../src/game/campaign-data';
import { decode, encode, catchUp, save, load, SAVE_KEY } from '../src/game/save';
import { ground, pathfind } from '../src/game/world';
import { RESOURCES } from '../src/game/types';
const tick = (e: Engine, n: number) => {
  for (let i = 0; i < n * 4; i++) e.tick(0.25);
};
function empire() {
  const e = new Engine();
  e.state.missions = [...MISSION_IDS];
  e.state.age = 1;
  e.state.research = ['trade'];
  e.state.settings.difficulty = 'peaceful';
  e.state.regions[0].explored = true;
  expect(e.empire.found('woods')).toBe(null);
  return e;
}
function fighters() {
  const e = new Engine();
  e.state.age = 10;
  e.state.settings.difficulty = 'peaceful';
  e.state.soldiers = [0, 1, 2].map((i) => ({
    id: e.state.nextId++,
    type: i === 0 ? 'cannon' : 'sentinel',
    x: 25.5 + i,
    y: 25.5,
    hp: UNITS[i === 0 ? 'cannon' : 'sentinel'].hp,
    path: [],
    cooldown: 0,
    target: null,
    order: 'defend' as const,
  }));
  return e;
}
describe('settlements and shipping', () => {
  it('runs inactive labor and maintains independent inventories while switching cities', () => {
    const e = empire();
    e.state.resources.gold = 44;
    const colony = e.empire.city('woods')!;
    const starting = colony.resources.wood;
    tick(e, 90);
    expect(e.empire.city('woods')!.resources.wood).toBeGreaterThan(starting);
    expect(e.empire.switch('woods')).toBe(null);
    expect(e.state.activeCity).toBe('woods');
    expect(e.state.resources.gold).toBe(0);
    e.state.resources.gold = 12;
    expect(e.empire.switch('capital')).toBe(null);
    expect(e.state.resources.gold).toBe(44);
    expect(e.empire.city('woods')!.resources.gold).toBe(12);
    expect(decode(encode(e.state))).toEqual(e.state);
  });
  it('ships once without duplicating goods and retains cargo when the destination is full', () => {
    const e = empire();
    e.state.workers = [];
    e.state.resources.wood = 100;
    const c = e.empire.city('woods')!;
    c.workers = [];
    c.resources.wood = 300;
    expect(e.empire.route('capital', 'woods', 'wood', 25, false)).toBe(null);
    tick(e, 40);
    expect(e.state.resources.wood).toBe(75);
    expect(e.state.routes[0].cargo).toBe(25);
    expect(c.resources.wood).toBe(300);
    c.resources.wood = 280;
    tick(e, 1);
    expect(e.state.routes[0].cargo).toBe(5);
    expect(c.resources.wood).toBe(300);
    c.resources.wood = 295;
    tick(e, 1);
    expect(e.state.routes).toHaveLength(0);
    expect(c.resources.wood).toBe(300);
  });
  it('returns in-flight cargo on cancellation, and pauses repeated departures', () => {
    const e = empire();
    e.state.resources.gold = 100;
    e.empire.route('capital', 'woods', 'gold', 25, true);
    tick(e, 1);
    expect(e.state.resources.gold).toBe(75);
    expect(e.empire.cancelRoute(e.state.routes[0].id)).toBe(null);
    expect(e.state.resources.gold).toBe(100);
    e.empire.route('capital', 'woods', 'gold', 20, true);
    e.state.routes[0].paused = true;
    tick(e, 40);
    expect(e.state.resources.gold).toBe(100);
    e.state.routes[0].paused = false;
    tick(e, 70);
    expect(e.empire.city('woods')!.resources.gold).toBeGreaterThanOrEqual(40);
    expect(
      e.state.resources.gold + e.empire.city('woods')!.resources.gold + e.state.routes[0].cargo,
    ).toBe(100);
  });
  it('rejects invalid routes and duplicate settlements without charging resources', () => {
    const e = empire(),
      before = e.state.resources.wood;
    expect(e.empire.found('woods')).toBe('cityLimit');
    expect(e.empire.route('capital', 'capital', 'wood', 20, true)).toBe('invalid');
    expect(e.empire.route('capital', 'woods', 'wood', 0, true)).toBe('invalid');
    expect(e.empire.route('capital', 'woods', 'wood', 201, true)).toBe('invalid');
    expect(e.empire.route('capital', 'woods', 'wood', 1.5, true)).toBe('invalid');
    expect(e.state.resources.wood).toBe(before);
  });
});
describe('military orders and navigation', () => {
  it('moves only selected soldiers, holds position, retreats and heals', () => {
    const e = fighters(),
      id = e.state.soldiers[0].id;
    expect(e.command([id], 'move', { x: 26.5, y: 28.5 }, 'line')).toBe(null);
    tick(e, 15);
    expect(e.state.soldiers[0].order).toBe('hold');
    expect(e.state.soldiers[1].x).toBe(26.5);
    e.state.soldiers[0].hp = 50;
    expect(e.command([id], 'retreat')).toBe(null);
    tick(e, 30);
    expect(e.state.soldiers[0].order).toBe('defend');
    expect(e.state.soldiers[0].hp).toBeGreaterThan(50);
  });
  it('uses siege damage against a tiered camp and awards victory once', () => {
    const e = fighters(),
      r = e.state.regions.find((r) => r.id === 'region-2')!;
    r.explored = true;
    expect(e.attack(r.id)).toBe(null);
    tick(e, 100);
    expect(r.enemy).toBe(0);
    expect(e.state.stats.defeated).toBe(1);
    tick(e, 30);
    expect(e.state.stats.defeated).toBe(1);
    expect(e.attack(r.id)).toBe('invalid');
  });
  it('makes a river crossing traversable only after every bridge segment exists', () => {
    const e = new Engine();
    e.state.research = ['masonry'];
    e.state.regions.forEach((r) => (r.explored = true));
    const y = 24,
      water = [];
    for (let x = 27; x < 39; x++) if (ground(e.state, x, y) === 'water') water.push(x);
    const first = water[0],
      last = water.at(-1)!;
    expect(
      pathfind(e.state, { x: first - 0.5, y: y + 0.5 }, { x: last + 1.5, y: y + 0.5 }),
    ).toEqual([]);
    for (const x of water) expect(typeof e.build('bridge', x, y)).toBe('number');
    expect(
      pathfind(e.state, { x: first - 0.5, y: y + 0.5 }, { x: last + 1.5, y: y + 0.5 }).length,
    ).toBeGreaterThan(0);
    expect(e.build('hut', first, y)).toBe('occupied');
  });
});
describe('campaign persistence and absence', () => {
  it('migrates an actual 0.1.0 save and preserves its original bytes during upgrade', () => {
    const original = readFileSync(new URL('./fixtures/v2-save.json', import.meta.url), 'utf8'),
      values = new Map([[SAVE_KEY, original]]);
    const store = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
    };
    const s = load(store).state!;
    expect(s.version).toBe(3);
    expect(s.regions).toHaveLength(12);
    expect(s.resources.wood).toBe(160);
    expect(s.resources.iron).toBe(0);
    save(s, store);
    save(s, store);
    expect(store.getItem(SAVE_KEY + '.v2-original')).toBe(original);
    expect(load(store).state?.resources.wood).toBe(160);
  });
  it('resumes saved fleets and cities without losing cargo or reusing stale background state', () => {
    const e = empire();
    e.state.resources.gold = 100;
    e.empire.route('capital', 'woods', 'gold', 25, false);
    tick(e, 5);
    const restored = decode(encode(e.state));
    tick(e, 60);
    e.state = restored;
    tick(e, 35);
    expect(e.state.routes).toHaveLength(0);
    expect(e.empire.city('woods')!.resources.gold).toBe(25);
    expect(e.state.resources.gold).toBe(75);
  });
  it('validates colony entities and cargo instead of accepting damaged saves', () => {
    const e = empire();
    const s = structuredClone(e.state);
    s.colonies[0].data.workers[0].path = [{ x: -1, y: 0 }];
    expect(() => decode(encode(s))).toThrow();
    e.empire.route('capital', 'woods', 'gold', 25, false);
    e.state.routes[0].cargo = 900;
    expect(() => decode(encode(e.state))).toThrow();
  });
  it('makes catch-up opt-in, capped at two hours and idempotent at a fixed time', () => {
    const e = new Engine();
    e.state.lastActive = 1000;
    expect(catchUp(e, 61000)).toBe(0);
    e.state.settings.offline = true;
    e.state.lastActive = 1000;
    e.state.research = ['defense'];
    e.state.raidTimer = 1;
    const elapsed = catchUp(e, 10_001_000);
    expect(elapsed).toBe(7200);
    expect(e.state.time).toBeCloseTo(7200);
    expect(e.state.raid).toBe(null);
    expect(e.state.raidTimer).toBe(1);
    const stock = { ...e.state.resources };
    expect(catchUp(e, 10_001_000)).toBe(0);
    expect(e.state.resources).toEqual(stock);
    expect(RESOURCES.every((r) => Number.isFinite(e.state.resources[r]))).toBe(true);
  });
});

it('refunds reserved production input when a workplace moves or workers flee', () => {
  const e = new Engine();
  e.state.research = ['farming'];
  e.state.resources.grain = 30;
  const id = e.build('mill', 25, 20);
  expect(typeof id).toBe('number');
  tick(e, 45);
  expect(e.assign(id as number, 1)).toBe(null);
  const worker = e.state.workers.find((w) => w.assigned === id)!;
  worker.path = [];
  worker.task = 'idle';
  worker.cargo = {};
  worker.timer = 0;
  e.chooseTask(worker);
  expect(e.state.resources.grain).toBe(20);
  expect(e.move(id as number, 25, 22)).toBe(null);
  expect(e.state.resources.grain).toBe(30);
  e.chooseTask(worker);
  expect(e.state.resources.grain).toBe(20);
  e.state.raid = { hp: 100, x: worker.x, y: worker.y };
  e.tick(0.1);
  expect(e.state.resources.grain).toBe(30);
});
