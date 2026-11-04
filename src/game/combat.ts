import type { Engine } from './engine';
import { UNITS } from './campaign-data';
import { BUILDING } from './data';
import { entrance, pathfind, reachable, walkable } from './world';
import type { Point, Soldier } from './types';
export type Formation = 'line' | 'wedge' | 'spread';
export function command(
  engine: Engine,
  ids: number[],
  order: NonNullable<Soldier['order']>,
  point?: Point,
  formation: Formation = 'line',
): string | null {
  const s = engine.state,
    units = s.soldiers.filter((u) => ids.includes(u.id));
  if (!units.length) return 'needsArmy';
  let sent = 0;
  units.forEach((u, i) => {
    if (order === 'hold' || order === 'defend') {
      u.order = order;
      u.target = null;
      u.path = [];
      sent++;
      return;
    }
    const base = order === 'retreat' ? entrance(s, s.buildings[0], u) : point;
    if (!base) return;
    const offset =
      formation === 'line'
        ? { x: i - (units.length - 1) / 2, y: 0 }
        : formation === 'wedge'
          ? { x: (i % 2 ? 1 : -1) * Math.ceil(i / 2), y: Math.ceil(i / 2) }
          : { x: (i % 4) * 2 - 3, y: Math.floor(i / 4) * 2 };
    const desired = {
      x: Math.floor(base.x + offset.x) + 0.5,
      y: Math.floor(base.y + offset.y) + 0.5,
    };
    const found = reachable(
      s,
      u,
      (x, y) => Math.hypot(x + 0.5 - desired.x, y + 0.5 - desired.y) < 1.5,
    );
    if (!found) return;
    u.target = null;
    u.path = found.path;
    u.order = order;
    sent++;
  });
  return sent ? null : 'unreachable';
}
export function attack(engine: Engine, id: string, ids?: number[]): string | null {
  const s = engine.state,
    r = s.regions.find((r) => r.id === id);
  if (!r?.explored || r.enemy <= 0) return 'invalid';
  const units = s.soldiers.filter((u) => !ids || ids.includes(u.id));
  if (!units.length) return 'needsArmy';
  let sent = 0;
  for (const u of units) {
    const range = UNITS[u.type].range;
    const found = reachable(s, u, (x, y) => Math.hypot(x + 0.5 - r.x, y + 0.5 - r.y) < range);
    if (found) {
      u.path = found.path;
      u.target = id;
      u.order = 'attack';
      sent++;
    }
  }
  return sent ? null : 'unreachable';
}
export class Combat {
  private raidPath: Point[] = [];
  private planIn = 0;
  private current: unknown = null;
  private city = '';
  constructor(private engine: Engine) {}
  tick(dt: number) {
    const e = this.engine,
      s = e.state;
    if (this.current !== s || this.city !== s.activeCity) {
      this.current = s;
      this.city = s.activeCity;
      this.raidPath = [];
      this.planIn = 0;
    }
    const factor = s.settings.difficulty === 'hard' ? 1.5 : 1;
    for (const u of s.soldiers) {
      const d = UNITS[u.type];
      u.cooldown = Math.max(0, u.cooldown - dt);
      const r = s.regions.find((r) => r.id === u.target);
      if (u.path.length && !walkable(s, Math.floor(u.path[0].x), Math.floor(u.path[0].y)))
        u.path = pathfind(s, u, u.path[u.path.length - 1]);
      e.moveUnit(u, dt, d.speed);
      if (!u.path.length && u.order === 'move') u.order = 'hold';
      if (
        r &&
        r.enemy > 0 &&
        Math.hypot(u.x - r.x, u.y - r.y) < d.range &&
        !u.cooldown &&
        u.order !== 'retreat'
      ) {
        r.enemy = Math.max(0, r.enemy - d.damage * (d.siege ? 1.5 : 1));
        u.cooldown = d.cooldown;
        u.hp -= Math.max(1, (d.range > 3 ? 3 : 7) * (1 + (r.tier ?? 0) * 0.65)) * factor;
        if (!r.enemy) {
          s.stats.defeated++;
          e.add(r.reward);
          e.changed++;
          e.onEvent('victory');
          for (const ally of s.soldiers)
            if (ally.target === idOf(r)) {
              ally.target = null;
              ally.order = 'retreat';
              ally.path = pathfind(s, ally, entrance(s, s.buildings[0], ally));
            }
        }
      }
      if (s.raid && u.order !== 'retreat' && u.order !== 'move' && !u.target) {
        const dist = Math.hypot(u.x - s.raid.x, u.y - s.raid.y);
        if (dist < d.range && !u.cooldown) {
          s.raid.hp -= d.damage;
          u.cooldown = d.cooldown;
          if (dist < 2.5) u.hp -= 4 * factor;
        } else if ((u.order ?? 'defend') === 'defend' && !u.path.length && dist < 12) {
          const raid = s.raid,
            found = reachable(
              s,
              u,
              (x, y) => Math.hypot(x + 0.5 - raid.x, y + 0.5 - raid.y) < d.range,
            );
          if (found) u.path = found.path;
        }
      } else if (!s.raid && !u.target && !u.path.length) {
        u.hp = Math.min(d.hp, u.hp + dt * (s.services.health >= 50 ? 2 : 1));
        if (u.order === 'retreat') u.order = 'defend';
      }
    }
    s.soldiers = s.soldiers.filter((u) => u.hp > 0);
    if (s.settings.difficulty === 'peaceful') {
      s.raid = null;
      return;
    }
    if (s.research.includes('defense')) {
      s.raidTimer = Math.max(0, s.raidTimer - dt);
      if (!s.raidTimer && !s.raid) {
        s.raidTimer = s.settings.difficulty === 'hard' ? 420 : 600;
        s.raid = { hp: (100 + s.age * 55 + s.stats.defeated * 30) * factor, x: 27.5, y: 30.5 };
        this.raidPath = [];
        this.planIn = 0;
        e.onEvent('raidWarning');
      }
    }
    const raid = s.raid;
    if (!raid) return;
    for (const b of s.buildings) {
      const d = BUILDING[b.type];
      if (!b.remaining && d.damage && Math.hypot(b.x - raid.x, b.y - raid.y) < (d.range ?? 0))
        raid.hp -= d.damage * b.level * dt;
    }
    if (raid.hp <= 0) {
      s.raid = null;
      e.add({ wood: 20, food: 20 });
      e.onEvent('raidWon');
      return;
    }
    // Walls obstruct the same grid used by workers and soldiers. Raiders must break
    // an adjacent wall/building instead of passing through it.
    const target = s.buildings
      .filter((b) => !['road', 'bridge', 'fire', 'plaza', 'trap', 'gate'].includes(b.type))
      .sort(
        (a, b) => Math.hypot(a.x - raid.x, a.y - raid.y) - Math.hypot(b.x - raid.x, b.y - raid.y),
      )[0];
    if (!target) return;
    const size = BUILDING[target.type].size;
    const distance = Math.hypot(
      Math.max(target.x - raid.x, 0, raid.x - target.x - size),
      Math.max(target.y - raid.y, 0, raid.y - target.y - size),
    );
    if (distance < 1.2) {
      target.hp -= dt * (5 + s.age * 1.5) * factor;
      this.raidPath = [];
      if (target.hp <= 0) {
        if (target.type === 'hall') {
          e.pay({ food: Math.min(30, s.resources.food), wood: Math.min(30, s.resources.wood) });
          target.hp = e.maxHP(target);
          s.raid = null;
          e.onEvent('raidLoss');
        } else {
          e.demolish(target.id, false);
          e.onEvent('buildingLost');
        }
      }
    } else {
      this.planIn -= dt;
      if (this.planIn <= 0) {
        this.planIn = 2;
        this.raidPath = pathfind(s, raid, entrance(s, target, raid));
      }
      if (
        this.raidPath.length &&
        walkable(s, Math.floor(this.raidPath[0].x), Math.floor(this.raidPath[0].y))
      )
        e.moveUnit(Object.assign(raid, { path: this.raidPath }), dt, 0.55);
    }
  }
}
function idOf(r: { id: string }) {
  return r.id;
}
