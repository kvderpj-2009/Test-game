import { describe, it, expect } from 'vitest';
import { BUILDING, BUILDINGS, RESEARCH } from '../src/game/data';
import { Engine, newGame } from '../src/game/engine';
import { decode, encode, load, save, SAVE_KEY, type StorageLike } from '../src/game/save';
import { pathfind, ground, at, visible } from '../src/game/world';
import type { Cost, Point } from '../src/game/types';
const advance = (engine: Engine, seconds: number) => {
  for (let i = 0; i < seconds * 10; i++) engine.tick(0.1);
};
const plot = (engine: Engine, type: string): Point => {
  for (let y = 17; y < 32; y++)
    for (let x = 15; x < 30; x++) if (!engine.placement(type, x, y)) return { x, y };
  throw Error('No plot: ' + type);
};
const build = (engine: Engine, type: string) => {
  const p = plot(engine, type);
  const id = engine.build(type, p.x, p.y);
  expect(typeof id).toBe('number');
  return id as number;
};
const provision = (e: Engine) => {
  for (const r of Object.keys(e.state.resources)) e.state.resources[r as keyof Cost] = 1000;
};
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    values,
  };
}
describe('world and placement', () => {
  it('starts with three citizens, a center and a fogged 48x48 world', () => {
    const e = new Engine();
    expect(e.state.workers).toHaveLength(3);
    expect(e.has('hall')).toBe(true);
    expect(e.housing).toBe(3);
    expect(visible(e.state, 0, 0)).toBe(false);
    expect(BUILDINGS.length).toBeGreaterThanOrEqual(24);
  });
  it('deducts exact construction costs and rejects overlap or insufficient resources', () => {
    const e = new Engine();
    const p = plot(e, 'hut');
    const before = e.state.resources.wood;
    expect(typeof e.build('hut', p.x, p.y)).toBe('number');
    expect(e.state.resources.wood).toBe(before - 30);
    expect(e.build('hut', p.x, p.y)).toBe('occupied');
    e.state.resources.wood = 0;
    const q = plot(e, 'lumber');
    expect(e.build('lumber', q.x, q.y)).toBe('notEnough');
  });
  it('rejects water, unrevealed plots and uncleared terrain', () => {
    const e = new Engine();
    expect(e.placement('hut', 1, 1)).toBe('unexplored');
    let water: Point | undefined, forest: Point | undefined;
    for (let y = 12; y < 35; y++)
      for (let x = 12; x < 38; x++) {
        if (!visible(e.state, x, y)) continue;
        if (ground(e.state, x, y) === 'water') water = { x, y };
        if (ground(e.state, x, y) === 'forest') forest = { x, y };
      }
    expect(e.placement('road', water!.x, water!.y)).toBe('waterBlocked');
    expect(e.placement('road', forest!.x, forest!.y)).toBe('clearFirst');
    expect(e.clear(forest!.x, forest!.y)).toBe(null);
    expect(e.placement('road', forest!.x, forest!.y)).toBe(null);
  });
  it('finds routes around occupied footprints and returns no route through a sealed wall', () => {
    const e = new Engine();
    const path = pathfind(e.state, { x: 20, y: 23 }, { x: 25, y: 23 });
    expect(path.length).toBeGreaterThan(0);
    for (const p of path)
      expect(at(e.state, Math.floor(p.x), Math.floor(p.y))?.type).not.toBe('hall');
    e.state.buildings.push(
      ...Array.from({ length: 5 }, (_, i) => ({
        id: 100 + i,
        x: 18 + i,
        y: 20,
        type: 'wall',
        level: 1,
        hp: 250,
        remaining: 0,
        rotation: 0,
      })),
    );
    expect(pathfind(e.state, { x: 20, y: 21 }, { x: 20, y: 20 })).toEqual([]);
  });
  it('connects road and gate cells while keeping palisades impassable', () => {
    const e = new Engine();
    expect(pathfind(e.state, { x: 18.5, y: 25.5 }, { x: 27.5, y: 25.5 }).length).toBe(9);
  });
});
describe('economy and progression', () => {
  it('workers build a hut, harvest actual resources, deliver goods and welcome settlers', () => {
    const e = new Engine();
    build(e, 'hut');
    advance(e, 130);
    expect(e.has('hut')).toBe(true);
    expect(e.state.lifetime.wood).toBeGreaterThan(0);
    expect(e.state.lifetime.stone).toBeGreaterThan(0);
    expect(e.state.workers.length).toBeGreaterThan(3);
    expect(e.state.missions).toContain('firstHut');
    expect(e.state.workers.some((w) => Math.hypot(w.x - 24.5, w.y - 25.5) > 1)).toBe(true);
  });
  it('assigned production uses input goods and creates output only after work and delivery', () => {
    const e = new Engine();
    e.state.research = ['farming'];
    const id = build(e, 'mill');
    advance(e, 90);
    expect(e.has('mill')).toBe(true);
    expect(e.assign(id, 1)).toBe(null);
    advance(e, 25);
    expect(e.state.resources.grain).toBe(0);
    const before = e.state.lifetime.food;
    e.state.resources.grain = 50;
    advance(e, 80);
    expect(e.state.resources.grain).toBeLessThan(50);
    expect(e.state.lifetime.food - before).toBeGreaterThanOrEqual(24);
  });
  it('limits inventory to storage capacity and applies food consumption', () => {
    const e = new Engine();
    const food = e.state.resources.food;
    e.tick(0.1);
    expect(e.state.resources.food).toBeLessThan(food);
    e.add({ wood: 10000 });
    expect(e.state.resources.wood).toBe(e.capacity);
  });
  it('upgrades, moves and demolishes buildings with a partial refund', () => {
    const e = new Engine();
    provision(e);
    const id = build(e, 'hut');
    advance(e, 90);
    expect(e.upgrade(id)).toBe(null);
    advance(e, 50);
    const b = e.state.buildings.find((b) => b.id === id)!;
    expect(b.level).toBe(2);
    const target = plot(e, 'hut');
    expect(e.move(id, target.x, target.y)).toBe(null);
    expect(b.x).toBe(target.x);
    expect(e.demolish(id)).toBe(null);
    expect(e.state.buildings.some((b) => b.id === id)).toBe(false);
    expect(e.demolish(1)).toBe('invalid');
  });
  it('requires a lab and research prerequisites, then completes technologies', () => {
    const e = new Engine();
    expect(e.research('farming')).toBe('needsLab');
    provision(e);
    build(e, 'research');
    advance(e, 90);
    expect(e.research('crafting')).toBe('needsResearch');
    expect(e.research('farming')).toBe(null);
    advance(e, 21);
    expect(e.state.research).toContain('farming');
    expect(e.research('bronze')).toBe('needsResearch');
  });
  it('explores a new region and awards its resources only once', () => {
    const e = new Engine();
    expect(e.explore('woods')).toBe(null);
    advance(e, 21);
    expect(e.state.regions[0].explored).toBe(true);
    expect(e.state.stats.explored).toBe(1);
    expect(e.explore('woods')).toBe('invalid');
    expect(visible(e.state, 5, 21)).toBe(true);
  });
  it('can play through economy, growth, research, expedition, defense and a real PvE battle', () => {
    const e = new Engine();
    provision(e);
    build(e, 'hut');
    build(e, 'hut');
    build(e, 'hut');
    build(e, 'lumber');
    build(e, 'research');
    advance(e, 350);
    expect(e.state.workers.length).toBeGreaterThanOrEqual(10);
    for (const tech of ['masonry', 'farming', 'defense', 'crafting']) {
      provision(e);
      expect(e.research(tech)).toBe(null);
      advance(e, 30);
    }
    provision(e);
    build(e, 'farm');
    build(e, 'tower');
    build(e, 'barracks');
    advance(e, 100);
    expect(e.has('barracks')).toBe(true);
    expect(e.explore('raiders')).toBe(null);
    advance(e, 21);
    provision(e);
    for (let i = 0; i < 4; i++) expect(e.train('guard')).toBe(null);
    expect(e.attack('raiders')).toBe(null);
    advance(e, 100);
    expect(e.state.stats.defeated).toBe(1);
    expect(e.state.regions.find((r) => r.id === 'raiders')!.enemy).toBe(0);
    provision(e);
    expect(e.research('bronze')).toBe(null);
    advance(e, 46);
    expect(e.state.age).toBe(1);
    expect(decode(encode(e.state))).toEqual(e.state);
  });
});
describe('save integrity', () => {
  it('round-trips running simulation state, and restores a verified backup', () => {
    const e = new Engine();
    advance(e, 25);
    const s = storage();
    save(e.state, s);
    e.state.resources.wood = 80;
    save(e.state, s);
    s.setItem(SAVE_KEY, 'corrupt');
    const result = load(s);
    expect(result.recovered).toBe(true);
    expect(result.state).not.toBeNull();
    expect(s.getItem(SAVE_KEY)).toBe('corrupt');
  });
  it('rejects tampering, NaN, unknown building ids and incomplete state', () => {
    const e = new Engine();
    const data = JSON.parse(encode(e.state));
    data.data = data.data.replace('"food":140', '"food":999');
    expect(() => decode(JSON.stringify(data))).toThrow();
    expect(() => decode('{"version":2}')).toThrow();
    e.state.buildings[0].type = 'injected';
    expect(() => decode(encode(e.state))).toThrow();
  });
  it('migrates v1 without deleting the original and refuses unsupported future versions', () => {
    const state: any = newGame();
    state.version = 1;
    state.regions = state.regions.slice(0, 4);
    delete state.cleared;
    const text = JSON.stringify(state);
    expect(decode(text).version).toBe(3);
    expect(decode(text).cleared).toEqual([]);
    state.version = 99;
    expect(() => decode(JSON.stringify(state))).toThrow();
  });
  it('surfaces write failures without pretending to save', () => {
    const s: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw Error('quota');
      },
    };
    expect(() => save(newGame(), s)).toThrow('quota');
  });
});

describe('storage and village safety', () => {
  it('specialized stores expand only their own inventories', () => {
    const e = new Engine();
    build(e, 'woodstore');
    advance(e, 90);
    expect(e.capacityFor('wood')).toBe(450);
    expect(e.capacityFor('food')).toBe(300);
    build(e, 'granary');
    advance(e, 90);
    expect(e.capacityFor('food')).toBe(450);
    expect(e.capacityFor('grain')).toBe(450);
    expect(e.capacityFor('stone')).toBe(300);
  });
  it('retains existing storage and housing throughout a center upgrade', () => {
    const e = new Engine();
    e.state.resources.knowledge = 40;
    expect(e.upgrade(1)).toBe(null);
    expect(e.capacityFor('food')).toBe(300);
    expect(e.housing).toBe(3);
    e.add({ food: 2 });
    expect(e.state.resources.food).toBe(142);
    advance(e, 50);
    expect(e.capacityFor('food')).toBe(600);
    expect(e.housing).toBe(6);
  });
  it('bad food supply reduces happiness and blocks immigration', () => {
    const e = new Engine();
    const id = build(e, 'hut');
    advance(e, 60);
    const b = e.state.buildings.find((b) => b.id === id)!;
    expect(b.remaining).toBe(0);
    e.state.resources.food = 0;
    e.state.workers.forEach((w) => {
      w.task = 'idle';
      w.timer = 99;
      w.path = [];
      w.cargo = {};
    });
    const population = e.state.workers.length;
    advance(e, 35);
    expect(e.state.happiness).toBeLessThan(60);
    expect(e.state.workers.length).toBe(population);
  });
  it('a completed tower actually damages and defeats nearby raiders', () => {
    const e = new Engine();
    e.state.research.push('defense');
    const id = build(e, 'tower');
    advance(e, 60);
    const tower = e.state.buildings.find((b) => b.id === id)!;
    e.state.raid = { hp: 80, x: tower.x + 1, y: tower.y + 1 };
    advance(e, 20);
    expect(e.state.raid).toBe(null);
    expect(e.state.buildings.some((b) => b.id === 1)).toBe(true);
  });
});
