import { expect, it } from 'vitest';
import { Engine } from '../src/game/engine';
import { BUILDING, RESEARCH } from '../src/game/data';
import { decode, encode } from '../src/game/save';

it('reaches the Bronze Age with starting resources only, including labor, trade and victory', () => {
  const e = new Engine();
  const log: string[] = [];
  const waitFor = (condition: () => boolean, label: string, limit = 900) => {
    let t = 0;
    while (!condition() && t < limit) {
      e.tick(0.1);
      t += 0.1;
    }
    if (!condition())
      throw Error(
        label +
          ' stalled: ' +
          JSON.stringify({
            resources: e.state.resources,
            pop: e.state.workers.length,
            jobs: e.state.workers.map((w) => [w.assigned, w.task, w.timer, w.path.length]),
            research: e.state.research,
            log,
          }),
      );
  };
  const build = (type: string) => {
    waitFor(() => e.canPay(BUILDING[type].cost), 'pay ' + type);
    let id: number | undefined;
    for (let y = 18; y <= 32 && id === undefined; y++)
      for (let x = 15; x <= 29 && id === undefined; x++)
        if (!e.placement(type, x, y)) {
          const result = e.build(type, x, y);
          if (typeof result === 'number') id = result;
        }
    if (id === undefined) throw Error('plot ' + type);
    waitFor(() => e.state.buildings.some((b) => b.id === id && !b.remaining), 'finish ' + type);
    log.push(type);
    return id;
  };
  const research = (id: string) => {
    const r = RESEARCH.find((r) => r.id === id)!;
    waitFor(() => e.canPay(r.cost), 'pay research ' + id);
    expect(e.research(id)).toBe(null);
    waitFor(() => e.state.research.includes(id), 'research ' + id);
  };
  build('hut');
  const lumber = build('lumber');
  expect(e.assign(lumber, 1)).toBe(null);
  const lab = build('research');
  expect(e.assign(lab, 1)).toBe(null);
  build('hut');
  const quarry = build('quarry');
  expect(e.assign(quarry, 1)).toBe(null);
  build('hut');
  const forager = build('gatherer');
  expect(e.assign(forager, 1)).toBe(null);
  research('masonry');
  research('farming');
  const farm = build('farm');
  expect(e.assign(farm, 1)).toBe(null);
  const mill = build('mill');
  expect(e.assign(mill, 1)).toBe(null);
  research('crafting');
  const workshop = build('workshop');
  expect(e.assign(workshop, 1)).toBe(null);
  const hunter = build('hunter');
  expect(e.assign(hunter, 1)).toBe(null);
  research('trade');
  build('market');
  expect(e.explore('traders')).toBe(null);
  waitFor(() => e.state.regions.find((r) => r.id === 'traders')!.explored, 'exploration');
  expect(e.trade('food', true)).toBe(null);
  expect(e.state.stats.traded).toBe(1);
  research('defense');
  build('barracks');
  build('tower');
  expect(e.explore('raiders')).toBe(null);
  waitFor(() => e.state.regions.find((r) => r.id === 'raiders')!.explored, 'raiders');
  for (let i = 0; i < 4; i++) {
    waitFor(() => e.canPay({ food: 25, wood: 15 }), 'soldier');
    expect(e.train('guard')).toBe(null);
  }
  expect(e.attack('raiders')).toBe(null);
  waitFor(() => e.state.stats.defeated === 1, 'victory');
  waitFor(() => e.state.workers.length >= 10, 'growth');
  research('bronze');
  expect(e.state.age).toBe(1);
  const mine = build('mine');
  expect(e.assign(mine, 1)).toBe(null);
  const smelter = build('smelter');
  expect(e.assign(smelter, 1)).toBe(null);
  waitFor(() => e.state.resources.bronze > 0, 'bronze production');
  expect(e.state.lifetime.grain).toBeGreaterThan(0);
  expect(e.state.lifetime.tools).toBeGreaterThan(0);
  expect(e.state.lifetime.knowledge).toBeGreaterThan(0);
  expect(decode(encode(e.state))).toEqual(e.state);
}, 20_000);
