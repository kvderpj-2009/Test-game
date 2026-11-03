import { BUILDING, CENTER, MAP_SIZE, MISSION_IDS, MISSION_REWARDS, RESEARCH } from './data';
import { at, entrance, ground, nearest, pathfind, reachable, visible, walkable } from './world';
import {
  RESOURCES,
  type Building,
  type Cost,
  type GameState,
  type Point,
  type Resource,
  type Stock,
  type Worker,
} from './types';
export const stock = (values: Cost = {}): Stock =>
  Object.fromEntries(RESOURCES.map((r) => [r, values[r] ?? 0])) as Stock;
export function newGame(language: GameState['settings']['language'] = 'de'): GameState {
  return {
    version: 2,
    seed: 73,
    time: 0,
    age: 0,
    resources: stock({ food: 140, wood: 160, stone: 90, knowledge: 25 }),
    cleared: [],
    buildings: [
      { id: 1, type: 'hall', x: 21, y: 22, level: 1, remaining: 0, hp: 600, rotation: 0 },
      { id: 2, type: 'fire', x: 20, y: 24, level: 1, remaining: 0, hp: 180, rotation: 0 },
      ...Array.from({ length: 10 }, (_, i) => ({
        id: i + 3,
        type: 'road',
        x: 18 + i,
        y: 25,
        level: 1,
        remaining: 0,
        hp: 180,
        rotation: 0,
      })),
    ],
    workers: [0, 1, 2].map((i) => ({
      id: 13 + i,
      x: 24.5 + i * 0.6,
      y: 25.5,
      home: 1,
      assigned: null,
      task: 'idle',
      target: null,
      path: [],
      timer: 0,
      cargo: {},
      resource: (['food', 'wood', 'stone'] as Resource[])[i],
    })),
    soldiers: [],
    regions: [
      {
        id: 'woods',
        x: 12,
        y: 21,
        discovered: true,
        explored: false,
        enemy: 0,
        maxEnemy: 0,
        reward: { wood: 55, food: 30 },
        progress: 0,
      },
      {
        id: 'ruins',
        x: 22,
        y: 11,
        discovered: true,
        explored: false,
        enemy: 0,
        maxEnemy: 0,
        reward: { knowledge: 60, stone: 35 },
        progress: 0,
      },
      {
        id: 'traders',
        x: 12,
        y: 32,
        discovered: true,
        explored: false,
        enemy: 0,
        maxEnemy: 0,
        reward: { gold: 40, tools: 10 },
        progress: 0,
      },
      {
        id: 'raiders',
        x: 23,
        y: 34,
        discovered: true,
        explored: false,
        enemy: 180,
        maxEnemy: 180,
        reward: { gold: 70, leather: 25, tools: 20 },
        progress: 0,
      },
    ],
    research: [],
    researching: null,
    missions: [],
    lifetime: stock(),
    nextId: 16,
    populationTimer: 0,
    happiness: 85,
    raidTimer: 600,
    raid: null,
    stats: { built: 0, upgraded: 0, explored: 0, defeated: 0, traded: 0 },
    settings: { language, sound: false, quality: 'high' },
  };
}
export class Engine {
  state: GameState;
  changed = 0;
  onEvent: (key: string, params?: Record<string, string | number>) => void = () => {};
  constructor(state = newGame()) {
    this.state = state;
  }
  get capacity() {
    return this.state.buildings
      .filter((b) => !b.remaining || b.level > 1)
      .reduce(
        (n, b) => n + (BUILDING[b.type].storage ?? 0) * (b.remaining ? b.level - 1 : b.level),
        0,
      );
  }
  capacityFor(resource: Resource) {
    return this.state.buildings
      .filter((b) => !b.remaining || b.level > 1)
      .reduce((n, b) => {
        const d = BUILDING[b.type];
        return (
          n +
          (!d.stores || d.stores.includes(resource)
            ? (d.storage ?? 0) * (b.remaining ? b.level - 1 : b.level)
            : 0)
        );
      }, 0);
  }
  get housing() {
    return this.state.buildings
      .filter((b) => !b.remaining || b.level > 1)
      .reduce(
        (n, b) => n + (BUILDING[b.type].housing ?? 0) * (b.remaining ? b.level - 1 : b.level),
        0,
      );
  }
  has(type: string) {
    return this.state.buildings.some((b) => b.type === type && b.remaining <= 0);
  }
  canPay(cost: Cost) {
    return Object.entries(cost).every(([r, n]) => this.state.resources[r as Resource] >= n);
  }
  pay(cost: Cost) {
    if (!this.canPay(cost)) return false;
    for (const [r, n] of Object.entries(cost)) this.state.resources[r as Resource] -= n;
    return true;
  }
  add(cost: Cost) {
    for (const [r, n] of Object.entries(cost)) {
      const current = this.state.resources[r as Resource];
      this.state.resources[r as Resource] = Math.max(
        current,
        Math.min(this.capacityFor(r as Resource), current + n),
      );
      this.state.lifetime[r as Resource] += n;
    }
  }
  maxHP(b: Building) {
    return (BUILDING[b.type].hp ?? 180) * b.level;
  }
  placement(type: string, x: number, y: number, ignore?: number): string | null {
    const def = BUILDING[type];
    if (!def) return 'invalid';
    if (def.research && !this.state.research.includes(def.research)) return 'needsResearch';
    for (let dx = 0; dx < def.size; dx++)
      for (let dy = 0; dy < def.size; dy++) {
        const px = x + dx,
          py = y + dy;
        if (px < 1 || py < 1 || px >= MAP_SIZE - 1 || py >= MAP_SIZE - 1) return 'invalid';
        if (!visible(this.state, px, py)) return 'unexplored';
        if (at(this.state, px, py, ignore)) return 'occupied';
        if (ground(this.state, px, py) === 'water') return 'waterBlocked';
        if (['forest', 'rock'].includes(ground(this.state, px, py))) return 'clearFirst';
      }
    if (
      def.near &&
      !Array.from({ length: 19 }, (_, i) => i - 9).some((dx) =>
        Array.from({ length: 19 }, (_, i) => i - 9).some(
          (dy) => ground(this.state, x + dx, y + dy) === def.near,
        ),
      )
    )
      return 'needsTerrain';
    return null;
  }
  build(type: string, x: number, y: number, rotation = 0): string | number {
    const error = this.placement(type, x, y);
    if (error) return error;
    const def = BUILDING[type];
    if (type === 'hall') return 'invalid';
    if (!this.pay(def.cost)) return 'notEnough';
    const b: Building = {
      id: this.state.nextId++,
      type,
      x,
      y,
      level: 1,
      remaining: def.time,
      hp: def.hp ?? 180,
      rotation,
    };
    this.state.buildings.push(b);
    this.evacuate(b);
    this.state.stats.built++;
    this.changed++;
    this.onEvent('buildingStarted');
    return b.id;
  }
  move(id: number, x: number, y: number): string | null {
    const b = this.state.buildings.find((b) => b.id === id);
    if (!b || b.type === 'hall') return 'invalid';
    const error = this.placement(b.type, x, y, id);
    if (error) return error;
    b.x = x;
    b.y = y;
    this.evacuate(b);
    this.resetWorkers(id);
    this.changed++;
    return null;
  }
  evacuate(b: Building) {
    const size = BUILDING[b.type].size;
    for (const u of [...this.state.workers, ...this.state.soldiers])
      if (u.x >= b.x && u.x < b.x + size && u.y >= b.y && u.y < b.y + size) {
        const p = nearest(this.state, u, () => true);
        if (p) {
          u.x = p.x;
          u.y = p.y;
          u.path = [];
        }
      }
  }
  clear(x: number, y: number): string | null {
    if (!visible(this.state, x, y)) return 'unexplored';
    const t = ground(this.state, x, y);
    if (!['forest', 'rock'].includes(t)) return 'invalid';
    this.state.cleared.push(x + y * MAP_SIZE);
    this.add(t === 'forest' ? { wood: 5 } : { stone: 4 });
    this.changed++;
    return null;
  }
  upgradeCost(b: Building): Cost {
    return Object.fromEntries(
      Object.entries(BUILDING[b.type].cost).map(([r, n]) => [r, Math.ceil(n * (b.level + 0.5))]),
    );
  }
  upgrade(id: number): string | null {
    const b = this.state.buildings.find((b) => b.id === id);
    if (
      !b ||
      b.remaining ||
      b.level >= 3 ||
      ['road', 'wall', 'gate', 'fire', 'plaza', 'trap'].includes(b.type)
    )
      return 'invalid';
    if (
      !this.pay(
        b.type === 'hall'
          ? { wood: 80 * b.level, stone: 50 * b.level, knowledge: 30 }
          : this.upgradeCost(b),
      )
    )
      return 'notEnough';
    b.level++;
    b.remaining = 12;
    b.hp = this.maxHP(b);
    this.state.stats.upgraded++;
    this.changed++;
    return null;
  }
  demolish(id: number): string | null {
    const b = this.state.buildings.find((b) => b.id === id);
    if (!b || b.type === 'hall') return 'invalid';
    this.state.buildings = this.state.buildings.filter((v) => v.id !== id);
    this.resetWorkers(id);
    this.add(
      Object.fromEntries(
        Object.entries(BUILDING[b.type].cost).map(([r, n]) => [r, Math.floor(n * 0.5)]),
      ),
    );
    this.changed++;
    return null;
  }
  resetWorkers(id: number) {
    for (const w of this.state.workers) {
      if (w.assigned === id && !this.state.buildings.some((b) => b.id === id)) w.assigned = null;
      if (w.target === id || w.assigned === id) {
        w.task = 'idle';
        w.path = [];
        w.timer = 0;
        w.target = null;
      }
    }
  }
  assign(id: number, delta: number): string | null {
    const b = this.state.buildings.find((b) => b.id === id);
    if (!b || b.remaining) return 'invalid';
    const count = this.state.workers.filter((w) => w.assigned === id).length;
    if (delta > 0) {
      if (count >= (BUILDING[b.type].workers ?? 0)) return 'invalid';
      const w = this.state.workers.find((w) => w.assigned === null);
      if (!w) return 'noWorker';
      w.assigned = id;
    } else {
      const w = this.state.workers.find((w) => w.assigned === id);
      if (w) w.assigned = null;
    }
    return null;
  }
  research(id: string): string | null {
    const r = RESEARCH.find((r) => r.id === id);
    if (!r || this.state.research.includes(id) || this.state.researching) return 'invalid';
    if (!this.has('research')) return 'needsLab';
    if (!r.requires.every((r) => this.state.research.includes(r))) return 'needsResearch';
    if (id === 'bronze' && (this.state.workers.length < 10 || this.state.stats.explored < 1))
      return 'bronzeRequirement';
    if (!this.pay(r.cost)) return 'notEnough';
    this.state.researching = { id, remaining: r.time };
    return null;
  }
  explore(id: string): string | null {
    const r = this.state.regions.find((r) => r.id === id);
    if (!r || r.explored || r.progress) return 'invalid';
    if (!this.pay({ food: 25 })) return 'notEnough';
    r.progress = 20;
    return null;
  }
  train(type: 'guard' | 'archer'): string | null {
    if (!this.has('barracks')) return 'needsBarracks';
    if (this.state.soldiers.length >= 12) return 'armyLimit';
    if (!this.pay(type === 'guard' ? { food: 25, wood: 15 } : { food: 20, wood: 25, leather: 3 }))
      return 'notEnough';
    const b = this.state.buildings.find((b) => b.type === 'barracks')!;
    const p = entrance(this.state, b);
    this.state.soldiers.push({
      id: this.state.nextId++,
      type,
      hp: type === 'guard' ? 100 : 65,
      ...p,
      path: [],
      cooldown: 0,
      target: null,
    });
    return null;
  }
  attack(id: string): string | null {
    const r = this.state.regions.find((r) => r.id === id);
    if (!r || !r.explored || r.enemy <= 0) return 'invalid';
    if (!this.state.soldiers.length) return 'needsArmy';
    const target = nearest(this.state, r, () => true);
    if (!target) return 'unreachable';
    let sent = 0;
    for (const u of this.state.soldiers) {
      const path = pathfind(this.state, u, target);
      if (path.length || Math.hypot(u.x - target.x, u.y - target.y) < 1) {
        u.path = path;
        u.target = id;
        sent++;
      }
    }
    return sent ? null : 'unreachable';
  }
  trade(resource: Resource, buy: boolean): string | null {
    if (!this.has('market') || !this.state.regions.find((r) => r.id === 'traders')?.explored)
      return 'needsMarket';
    if (!this.pay(buy ? { gold: 10 } : { [resource]: 30 })) return 'notEnough';
    this.add(buy ? { [resource]: 25 } : { gold: 8 });
    this.state.stats.traded++;
    return null;
  }
  route(w: Worker, p: Point, task: Worker['task']) {
    w.path = pathfind(this.state, w, p);
    w.task = task;
    if (!w.path.length && Math.hypot(w.x - p.x, w.y - p.y) > 1) {
      w.task = 'idle';
      w.timer = 2;
      return false;
    }
    return true;
  }
  chooseTask(w: Worker) {
    if (Object.keys(w.cargo).length) {
      const b = this.state.buildings.find((b) => b.id === w.assigned) ?? this.state.buildings[0];
      this.route(w, entrance(this.state, b, w), 'deliver');
      return;
    }
    const construction = this.state.buildings.find(
      (b) =>
        b.remaining > 0 &&
        !this.state.workers.some((v) => v.id !== w.id && v.task === 'build' && v.target === b.id),
    );
    if (construction) {
      w.target = construction.id;
      this.route(w, entrance(this.state, construction, w), 'build');
      return;
    }
    const job = this.state.buildings.find((b) => b.id === w.assigned && !b.remaining);
    const def = job ? BUILDING[job.type] : null;
    if (def?.input && !this.pay(def.input)) {
      w.timer = 2;
      return;
    }
    const near = def?.near ?? (job ? null : w.resource === 'stone' ? 'rock' : 'forest');
    // Search reachable resource cells, not just the closest tree behind a building.
    // Fishermen use a reachable shoreline tile rather than walking into water.
    const site = near
      ? reachable(this.state, w, (x, y) =>
          near === 'water'
            ? [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
              ].some(([dx, dy]) => ground(this.state, x + dx, y + dy) === 'water')
            : ground(this.state, x, y) === near,
        )
      : null;
    if (near && !site) {
      w.timer = 2;
      return;
    }
    const dest = site?.point ?? entrance(this.state, job ?? this.state.buildings[0], w);
    if (!this.route(w, dest, 'gather')) {
      if (def?.input) this.add(def.input);
      return;
    }
    w.target = job?.id ?? null;
    w.timer = job ? 5 : 4;
  }
  moveUnit(unit: Point & { path: Point[] }, dt: number, speed = 1.15) {
    const next = unit.path[0];
    if (!next) return;
    if (!walkable(this.state, Math.floor(next.x), Math.floor(next.y))) {
      const route = pathfind(this.state, unit, unit.path[unit.path.length - 1]);
      if (route.length) unit.path = route;
      return;
    }
    const dx = next.x - unit.x,
      dy = next.y - unit.y,
      d = Math.hypot(dx, dy),
      step = dt * speed;
    if (d <= step) {
      unit.x = next.x;
      unit.y = next.y;
      unit.path.shift();
    } else {
      unit.x += (dx / d) * step;
      unit.y += (dy / d) * step;
    }
  }
  tick(dt: number) {
    const s = this.state;
    s.time += dt;
    const foodNeed = s.workers.length * 0.035 * dt;
    s.resources.food = Math.max(0, s.resources.food - foodNeed);
    const safety = this.has('tower') ? 10 : 0;
    const amenities =
      (this.has('fire') ? 5 : 0) + (this.has('plaza') ? 5 : 0) + (this.has('healer') ? 8 : 0);
    s.happiness = Math.min(
      100,
      Math.max(
        15,
        65 +
          amenities +
          safety +
          (s.resources.food > 20 ? 15 : -35) +
          (this.housing >= s.workers.length ? 0 : -25) -
          (s.raid ? 25 : 0),
      ),
    );
    const productivity = s.happiness < 40 ? 0.55 : 1;
    for (const w of s.workers) {
      if (s.raid && Math.hypot(w.x - s.raid.x, w.y - s.raid.y) < 5 && w.task !== 'flee') {
        w.path = pathfind(s, w, entrance(s, s.buildings[0]));
        w.task = 'flee';
        w.timer = 5;
      }
      if (w.path.length) {
        const next = w.path[0];
        if (!walkable(s, Math.floor(next.x), Math.floor(next.y))) {
          const replacement = pathfind(s, w, w.path[w.path.length - 1]);
          if (replacement.length) w.path = replacement;
          else {
            // A newly placed building may cover a previously valid entrance.
            // Keep carried goods and choose the building's new entrance next tick.
            if (w.task === 'gather' && w.target) {
              const job = s.buildings.find((b) => b.id === w.target),
                input = job ? BUILDING[job.type].input : null;
              if (input)
                for (const [r, n] of Object.entries(input))
                  s.resources[r as Resource] = Math.min(
                    this.capacityFor(r as Resource),
                    s.resources[r as Resource] + n,
                  );
            }
            w.path = [];
            w.task = 'idle';
            w.target = null;
            w.timer = 0.5;
          }
        } else this.moveUnit(w, dt);
        continue;
      }
      if (w.task === 'build') {
        const b = s.buildings.find((b) => b.id === w.target);
        if (b && b.remaining > 0) {
          b.remaining = Math.max(0, b.remaining - dt * productivity);
          if (!b.remaining) {
            this.changed++;
            this.onEvent('buildingReady');
          }
        } else {
          w.task = 'idle';
          w.target = null;
        }
        continue;
      }
      if (w.task === 'deliver') {
        this.add(w.cargo);
        w.cargo = {};
        w.task = 'idle';
        w.target = null;
        continue;
      }
      if (w.timer > 0) {
        w.timer = Math.max(0, w.timer - dt * productivity);
        continue;
      }
      if (w.task === 'gather') {
        const b = s.buildings.find((b) => b.id === w.target);
        const def = b ? BUILDING[b.type] : null;
        w.cargo = def?.output
          ? Object.fromEntries(
              Object.entries(def.output).map(([r, n]) => [
                r,
                n * (1 + ((b?.level ?? 1) - 1) * 0.4),
              ]),
            )
          : { [w.resource]: 6 };
        w.task = 'idle';
      }
      if (w.task === 'flee') w.task = 'idle';
      this.chooseTask(w);
    }
    if (s.resources.food > 25 && this.housing > s.workers.length && s.happiness >= 60) {
      s.populationTimer += dt;
      if (s.populationTimer >= 28) {
        s.populationTimer = 0;
        const p = entrance(s, s.buildings[0]);
        const id = s.nextId++;
        s.workers.push({
          id,
          ...p,
          home: 1,
          assigned: null,
          task: 'idle',
          target: null,
          path: [],
          timer: 0,
          cargo: {},
          resource: (['food', 'wood', 'stone'] as Resource[])[id % 3],
        });
        this.pay({ food: 8 });
        this.onEvent('newCitizen');
      }
    } else s.populationTimer = 0;
    if (s.researching) {
      s.researching.remaining -= dt;
      if (s.researching.remaining <= 0) {
        const id = s.researching.id;
        s.research.push(id);
        s.researching = null;
        if (id === 'bronze') s.age = 1;
        this.changed++;
        this.onEvent('researchComplete');
      }
    }
    for (const r of s.regions)
      if (r.progress > 0) {
        r.progress = Math.max(0, r.progress - dt);
        if (!r.progress) {
          r.explored = true;
          s.stats.explored++;
          if (!r.enemy) this.add(r.reward);
          this.changed++;
          this.onEvent('regionFound');
        }
      }
    this.combat(dt);
    const done = [
      this.has('hut'),
      this.has('lumber'),
      s.lifetime.wood >= 100,
      this.has('research'),
      s.research.includes('farming') && this.has('farm'),
      s.workers.length >= 10,
      this.has('tower'),
      s.stats.explored >= 1,
      s.stats.defeated >= 1,
      s.age >= 1,
    ];
    done.forEach((ok, i) => {
      if (ok && !s.missions.includes(MISSION_IDS[i])) {
        s.missions.push(MISSION_IDS[i]);
        this.add(MISSION_REWARDS[i]);
        this.onEvent('missionComplete');
      }
    });
  }
  combat(dt: number) {
    const s = this.state;
    for (const u of s.soldiers) {
      this.moveUnit(u, dt, 1.5);
      u.cooldown = Math.max(0, u.cooldown - dt);
      const r = s.regions.find((r) => r.id === u.target);
      if (
        r &&
        r.enemy > 0 &&
        Math.hypot(u.x - r.x, u.y - r.y) < (u.type === 'archer' ? 5 : 2.4) &&
        !u.cooldown
      ) {
        r.enemy = Math.max(0, r.enemy - (u.type === 'archer' ? 14 : 11));
        u.cooldown = 1.3;
        u.hp -= u.type === 'archer' ? 3 : 7;
        if (!r.enemy) {
          s.stats.defeated++;
          this.add(r.reward);
          this.changed++;
          this.onEvent('victory');
          for (const ally of s.soldiers)
            if (ally.target === r.id) {
              ally.target = null;
              ally.path = pathfind(s, ally, entrance(s, s.buildings[0]));
            }
        }
      }
    }
    s.soldiers = s.soldiers.filter((u) => u.hp > 0);
    if (s.research.includes('defense')) {
      s.raidTimer -= dt;
      if (s.raidTimer <= 0 && !s.raid) {
        s.raidTimer = 600;
        s.raid = { hp: 100 + s.stats.defeated * 30, x: 27, y: 30 };
        this.onEvent('raidWarning');
      }
    }
    if (s.raid) {
      const raid = s.raid;
      const target = s.buildings
        .filter((b) => !['road', 'fire', 'plaza'].includes(b.type))
        .sort(
          (a, b) => Math.hypot(a.x - raid.x, a.y - raid.y) - Math.hypot(b.x - raid.x, b.y - raid.y),
        )[0];
      for (const b of s.buildings) {
        const d = BUILDING[b.type];
        if (!b.remaining && d.damage && Math.hypot(b.x - raid.x, b.y - raid.y) < (d.range ?? 0))
          raid.hp -= d.damage * b.level * dt;
      }
      for (const u of s.soldiers) if (Math.hypot(u.x - raid.x, u.y - raid.y) < 6) raid.hp -= 6 * dt;
      if (target) {
        const d = Math.hypot(target.x - raid.x, target.y - raid.y);
        if (d > 2) {
          raid.x += ((target.x - raid.x) / d) * dt * 0.45;
          raid.y += ((target.y - raid.y) / d) * dt * 0.45;
        } else {
          target.hp -= 5 * dt;
          if (target.hp <= 0) {
            if (target.type === 'hall') {
              this.pay({
                food: Math.min(30, s.resources.food),
                wood: Math.min(30, s.resources.wood),
              });
              target.hp = this.maxHP(target);
              s.raid = null;
              this.onEvent('raidLoss');
            } else {
              this.demolish(target.id);
              this.onEvent('buildingLost');
            }
          }
        }
      }
      if (raid.hp <= 0) {
        s.raid = null;
        this.add({ wood: 20, food: 20 });
        this.onEvent('raidWon');
      }
    }
  }
}
