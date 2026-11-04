import { BUILDING, RESEARCH, MAP_SIZE } from './data';
import { Engine, newGame, stock } from './engine';
import { UNITS } from './campaign-data';
import { extraRegions } from './empire';
import { RESOURCES, type GameState } from './types';
export const SAVE_KEY = 'pocket-civilization.v2';
export const MANUAL_KEY = 'pocket-civilization.manual';
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
function checksum(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
export function encode(state: GameState) {
  const data = JSON.stringify(state);
  return JSON.stringify({
    format: 'pocket-civilization',
    checksum: checksum(data),
    savedAt: new Date().toISOString(),
    data,
  });
}
export function decode(text: string): GameState {
  const raw = JSON.parse(text);
  let data = raw;
  if (raw.format === 'pocket-civilization') {
    if (typeof raw.data !== 'string' || checksum(raw.data) !== raw.checksum)
      throw Error('checksum');
    data = JSON.parse(raw.data);
  }
  if (![1, 2, 3].includes(data.version)) throw Error('unsupported version');
  // v1 is the documented early format: only the fields added in v2 are defaulted.
  if (data.version === 1)
    data = {
      ...newGame(),
      ...data,
      version: 2,
      cleared: data.cleared ?? [],
      stats: { ...newGame().stats, ...data.stats },
      settings: { ...newGame().settings, ...data.settings },
    };
  if (data.version < 3) {
    const fresh = newGame();
    data = {
      ...fresh,
      ...data,
      version: 3,
      resources: stock(data.resources),
      lifetime: stock(data.lifetime),
      settings: { ...fresh.settings, ...data.settings },
      regions: [...data.regions, ...extraRegions(data.seed)],
      services: { ...fresh.services },
      activeCity: 'capital',
      colonies: [],
      routes: [],
      campaign: { launched: false, launchRemaining: 0 },
      lastActive: 0,
    };
  }
  if (
    !finite(data.time) ||
    !finite(data.seed) ||
    !Number.isInteger(data.age) ||
    data.age < 0 ||
    data.age > 10 ||
    !finite(data.nextId) ||
    !finite(data.populationTimer) ||
    !finite(data.happiness) ||
    !finite(data.raidTimer)
  )
    throw Error('state');
  if (!RESOURCES.every((r) => finite(data.resources?.[r]) && finite(data.lifetime?.[r])))
    throw Error('resources');
  if (
    !Array.isArray(data.buildings) ||
    !data.buildings.length ||
    data.buildings.length > 2304 ||
    data.buildings[0]?.type !== 'hall' ||
    data.buildings.filter((b: Record<string, unknown>) => b.type === 'hall').length !== 1
  )
    throw Error('buildings');
  const position = (p: { x: number; y: number }) =>
    finite(p?.x) && finite(p?.y) && p.x < MAP_SIZE && p.y < MAP_SIZE;
  const validCost = (v: unknown) =>
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.entries(v).every(
      ([k, n]) => RESOURCES.includes(k as (typeof RESOURCES)[number]) && finite(n),
    );
  for (const b of data.buildings)
    if (
      !Object.prototype.hasOwnProperty.call(BUILDING, b.type) ||
      !position(b) ||
      !Number.isInteger(b.x) ||
      !Number.isInteger(b.y) ||
      !finite(b.id) ||
      !Number.isInteger(b.level) ||
      b.level < 1 ||
      b.level > 3 ||
      !finite(b.remaining) ||
      !finite(b.hp) ||
      !finite(b.rotation)
    )
      throw Error('building');
  if (!Array.isArray(data.workers) || data.workers.length > 1000) throw Error('workers');
  for (const w of data.workers)
    if (
      !position(w) ||
      !finite(w.id) ||
      !finite(w.home) ||
      (w.assigned !== null && !data.buildings.some((b: { id: number }) => b.id === w.assigned)) ||
      (w.target !== null && !finite(w.target)) ||
      !Array.isArray(w.path) ||
      !w.path.every(position) ||
      !finite(w.timer) ||
      !['idle', 'gather', 'build', 'deliver', 'flee'].includes(w.task) ||
      !RESOURCES.includes(w.resource) ||
      !validCost(w.cargo) ||
      (w.serviceCargo &&
        (!['health', 'education', 'culture'].includes(w.serviceCargo.kind) ||
          !finite(w.serviceCargo.amount)))
    )
      throw Error('worker');
  if (
    !Array.isArray(data.soldiers) ||
    data.soldiers.some(
      (u: GameState['soldiers'][number]) =>
        !position(u) ||
        !finite(u.hp) ||
        !Object.prototype.hasOwnProperty.call(UNITS, u.type) ||
        !finite(u.id) ||
        (u.order !== undefined &&
          !['defend', 'hold', 'move', 'attack', 'retreat'].includes(u.order)) ||
        !Array.isArray(u.path) ||
        !u.path.every(position) ||
        !finite(u.cooldown),
    )
  )
    throw Error('soldiers');
  if (
    !Array.isArray(data.research) ||
    !data.research.every((id: string) => RESEARCH.some((r) => r.id === id)) ||
    !Array.isArray(data.missions) ||
    !data.missions.every((m: unknown) => typeof m === 'string')
  )
    throw Error('progress');
  if (
    data.researching &&
    (!RESEARCH.some((r) => r.id === data.researching.id) || !finite(data.researching.remaining))
  )
    throw Error('research');
  if (
    !Array.isArray(data.regions) ||
    data.regions.length !== 12 ||
    new Set(data.regions.map((r: { id: string }) => r.id)).size !== 12 ||
    data.regions.some(
      (r: GameState['regions'][number]) =>
        !position(r) ||
        !finite(r.progress) ||
        !finite(r.enemy) ||
        !finite(r.maxEnemy) ||
        !validCost(r.reward) ||
        typeof r.explored !== 'boolean' ||
        typeof r.discovered !== 'boolean' ||
        !newGame().regions.some((v) => v.id === r.id),
    )
  )
    throw Error('regions');
  if (
    !Array.isArray(data.cleared) ||
    !data.cleared.every((n: number) => Number.isInteger(n) && n >= 0 && n < MAP_SIZE * MAP_SIZE)
  )
    throw Error('terrain');
  if (
    !data.settings ||
    !['de', 'en', 'es', 'fr'].includes(data.settings.language) ||
    !['high', 'low'].includes(data.settings.quality) ||
    typeof data.settings.sound !== 'boolean' ||
    typeof data.settings.offline !== 'boolean' ||
    !['peaceful', 'normal', 'hard'].includes(data.settings.difficulty)
  )
    throw Error('settings');
  if (
    !data.stats ||
    !['built', 'upgraded', 'explored', 'defeated', 'traded'].every((k) => finite(data.stats[k]))
  )
    throw Error('stats');
  const ids = [...data.buildings, ...data.workers, ...data.soldiers].map((e) => e.id);
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !Number.isInteger(id) || id >= data.nextId)
  )
    throw Error('entity ids');
  if (data.raid && (!position(data.raid) || !finite(data.raid.hp))) throw Error('raid');
  if (
    !data.services ||
    !['health', 'education', 'culture'].every(
      (k) => finite(data.services[k]) && data.services[k] <= 100,
    ) ||
    !finite(data.lastActive) ||
    !data.campaign ||
    typeof data.campaign.launched !== 'boolean' ||
    !finite(data.campaign.launchRemaining)
  )
    throw Error('campaign');
  const cityIds = ['capital', ...data.regions.map((r: { id: string }) => r.id)];
  if (
    !cityIds.includes(data.activeCity) ||
    !Array.isArray(data.colonies) ||
    data.colonies.length > 3
  )
    throw Error('cities');
  const present = [data.activeCity, ...data.colonies.map((c: { id: string }) => c.id)];
  if (new Set(present).size !== present.length || !present.includes('capital'))
    throw Error('city ids');
  for (const c of data.colonies) {
    if (!cityIds.includes(c.id) || !c.data || typeof c.data !== 'object') throw Error('city');
    // Validate each isolated city through the same full entity validation.
    decode(JSON.stringify({ ...data, ...c.data, activeCity: 'capital', colonies: [], routes: [] }));
  }
  if (
    !Array.isArray(data.routes) ||
    data.routes.length > 12 ||
    new Set(data.routes.map((r: { id: number }) => r.id)).size !== data.routes.length
  )
    throw Error('routes');
  for (const r of data.routes)
    if (
      !Number.isInteger(r.id) ||
      r.id < 1 ||
      !present.includes(r.from) ||
      !present.includes(r.to) ||
      r.from === r.to ||
      !RESOURCES.includes(r.resource) ||
      !Number.isInteger(r.amount) ||
      r.amount < 1 ||
      r.amount > 200 ||
      !finite(r.cargo) ||
      r.cargo > r.amount ||
      !finite(r.remaining) ||
      typeof r.repeat !== 'boolean' ||
      typeof r.paused !== 'boolean'
    )
      throw Error('route');
  return data as GameState;
}
export function save(state: GameState, storage: StorageLike = localStorage, key = SAVE_KEY) {
  state.lastActive = Date.now();
  const encoded = encode(state);
  decode(encoded);
  const old = storage.getItem(key);
  if (old) {
    try {
      decode(old);
      // Retain the first pre-migration save independently of rotating backups.
      const original = JSON.parse(old);
      const previous = original.data ? JSON.parse(original.data) : original;
      if (previous.version < 3 && !storage.getItem(key + '.v2-original'))
        storage.setItem(key + '.v2-original', old);
    } catch {
      storage.setItem(key + '.damaged', old);
    }
    // Only validated saves can replace the recovery copy.
    let valid = false;
    try {
      decode(old);
      valid = true;
    } catch {
      /* retained above */
    }
    if (valid) storage.setItem(key + '.backup', old);
  }
  storage.setItem(key, encoded);
}
export function load(
  storage: StorageLike = localStorage,
  key = SAVE_KEY,
): { state: GameState | null; recovered: boolean; error: boolean } {
  const raw = storage.getItem(key);
  if (!raw) return { state: null, recovered: false, error: false };
  try {
    return { state: decode(raw), recovered: false, error: false };
  } catch {
    const backup = storage.getItem(key + '.backup');
    if (backup) {
      try {
        return { state: decode(backup), recovered: true, error: false };
      } catch {
        /* Original values are never deleted. */
      }
    }
    return { state: null, recovered: false, error: true };
  }
}

/** Opt-in bounded catch-up uses the real simulation; raids wait for the player. */
export function catchUp(engine: Engine, now = Date.now()): number {
  const s = engine.state,
    elapsed = s.lastActive ? Math.min(7200, Math.max(0, (now - s.lastActive) / 1000)) : 0;
  s.lastActive = now;
  if (!s.settings.offline || elapsed < 5) return 0;
  const previous = engine.onEvent;
  engine.onEvent = () => {};
  try {
    for (let t = 0; t < elapsed; t += 0.5) engine.tick(Math.min(0.5, elapsed - t), false, true);
  } finally {
    engine.onEvent = previous;
  }
  engine.changed++;
  return elapsed;
}
