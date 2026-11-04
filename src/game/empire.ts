import { RESOURCES } from './types';
import type { Engine } from './engine';
import type { CityData, GameState, Resource, Region, TradeRoute } from './types';
import { CITY_COST } from './campaign-data';
export const CITY_KEYS = [
  'seed',
  'resources',
  'cleared',
  'buildings',
  'workers',
  'soldiers',
  'nextId',
  'populationTimer',
  'happiness',
  'raidTimer',
  'raid',
  'services',
] as const;
export function cityData(state: GameState): CityData {
  return Object.fromEntries(CITY_KEYS.map((k) => [k, state[k]])) as unknown as CityData;
}
export function extraRegions(seed: number): Region[] {
  const locations = [
    [9, 10],
    [19, 7],
    [9, 34],
    [19, 40],
    [24, 38],
    [38, 18],
    [40, 31],
    [39, 8],
  ];
  return locations.map(([x, y], i) => {
    const kind = (
      ['ruins', 'raiders', 'woods', 'traders', 'raiders', 'ruins', 'woods', 'raiders'] as const
    )[i];
    const tier = 1 + Math.floor(i / 2);
    const enemy = kind === 'raiders' ? 250 + tier * 180 : 0;
    return {
      id: 'region-' + (i + 1),
      x,
      y,
      kind,
      tier,
      seed: Math.abs((seed * 1664525 + i * 1013904223) | 0),
      discovered: true,
      explored: false,
      enemy,
      maxEnemy: enemy,
      reward:
        kind === 'raiders'
          ? { gold: 80 + tier * 35, tools: 25 }
          : { wood: 40 + tier * 20, knowledge: 35 + tier * 25 },
      progress: 0,
    };
  });
}
export class Empire {
  private engines = new Map<string, Engine>();
  private current: GameState | null = null;
  constructor(
    private owner: Engine,
    private create: (state: GameState) => Engine,
    private fresh: () => GameState,
  ) {}
  cities() {
    const s = this.owner.state;
    return [{ id: s.activeCity, data: cityData(s) }, ...s.colonies];
  }
  city(id: string) {
    return this.cities().find((c) => c.id === id)?.data;
  }
  found(id: string): string | null {
    const s = this.owner.state,
      r = s.regions.find((r) => r.id === id);
    if (s.age < 1) return 'needsResearch';
    if (!r?.explored || r.enemy > 0) return 'unexplored';
    if (this.city(id) || this.cities().length >= 4) return 'cityLimit';
    if (!this.owner.pay(CITY_COST)) return 'notEnough';
    const fresh = this.fresh();
    fresh.seed = r.seed ?? s.seed + 31 + s.colonies.length * 17;
    fresh.resources.food = 80;
    fresh.resources.wood = 90;
    fresh.resources.stone = 50;
    fresh.resources.knowledge = 0;
    s.colonies.push({ id, data: cityData(fresh) });
    this.owner.changed++;
    this.owner.onEvent('cityFounded');
    return null;
  }
  switch(id: string): string | null {
    const s = this.owner.state,
      index = s.colonies.findIndex((c) => c.id === id);
    if (index < 0) return 'invalid';
    const incoming = s.colonies.splice(index, 1)[0];
    s.colonies.push({ id: s.activeCity, data: cityData(s) });
    for (const key of CITY_KEYS)
      (s as unknown as Record<string, unknown>)[key] = incoming.data[key];
    s.activeCity = id;
    this.engines.clear();
    this.owner.changed++;
    return null;
  }
  route(
    from: string,
    to: string,
    resource: Resource,
    amount: number,
    repeat: boolean,
  ): string | null {
    const s = this.owner.state;
    if (
      !RESOURCES.includes(resource) ||
      from === to ||
      !this.city(from) ||
      !this.city(to) ||
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > 200
    )
      return 'invalid';
    if (!s.research.includes('trade')) return 'needsResearch';
    if (s.routes.length >= 12) return 'routeLimit';
    s.routes.push({
      id: Math.max(0, ...s.routes.map((r) => r.id)) + 1,
      from,
      to,
      resource,
      amount,
      cargo: 0,
      remaining: 0,
      repeat,
      paused: false,
    });
    return null;
  }
  cancelRoute(id: number) {
    const s = this.owner.state,
      r = s.routes.find((r) => r.id === id);
    if (!r) return 'invalid';
    if (r.cargo) {
      const from = this.city(r.from);
      if (from) from.resources[r.resource] += r.cargo;
    }
    s.routes = s.routes.filter((v) => v.id !== id);
    return null;
  }
  tick(dt: number, offline: boolean) {
    const s = this.owner.state;
    if (this.current !== s) {
      this.engines.clear();
      this.current = s;
    }
    for (const c of s.colonies) {
      let engine = this.engines.get(c.id);
      if (!engine) {
        engine = this.create({ ...s, ...c.data, activeCity: c.id, colonies: [], routes: [] });
        engine.onEvent = (key) => {
          this.owner.onEvent(key, { city: c.id });
        };
        this.engines.set(c.id, engine);
      }
      Object.assign(engine.state, c.data, {
        age: s.age,
        research: s.research,
        regions: s.regions,
        lifetime: s.lifetime,
        stats: s.stats,
        settings: s.settings,
      });
      engine.tick(dt, true, offline);
      c.data = cityData(engine.state);
    }
    const completed: TradeRoute[] = [];
    for (const r of s.routes) {
      if (r.cargo) {
        r.remaining = Math.max(0, r.remaining - dt);
        if (!r.remaining) {
          const to = this.city(r.to);
          if (!to) continue;
          const engine = r.to === s.activeCity ? this.owner : this.engines.get(r.to);
          const room = Math.max(
            0,
            (engine?.capacityFor(r.resource) ?? 300) - to.resources[r.resource],
          );
          const amount = Math.min(room, r.cargo);
          to.resources[r.resource] += amount;
          r.cargo -= amount;
          if (r.cargo === 0) {
            s.stats.traded++;
            if (!r.repeat) completed.push(r);
          }
        }
      } else if (!r.paused) {
        const from = this.city(r.from);
        if (from && from.resources[r.resource] >= r.amount) {
          from.resources[r.resource] -= r.amount;
          r.cargo = r.amount;
          r.remaining = Math.max(12, 35 - s.age * 2);
        }
      }
    }
    if (completed.length) s.routes = s.routes.filter((r) => !completed.includes(r));
  }
}
