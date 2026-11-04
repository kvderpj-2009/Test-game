import { it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Engine } from '../src/game/engine';
import { BUILDING, RESEARCH } from '../src/game/data';
import { ADVANCEMENTS } from '../src/game/campaign-data';
import { at, ground, visible } from '../src/game/world';
import { decode, encode } from '../src/game/save';
it('plays all eleven eras and launches an expedition with earned resources and real workers', () => {
  const e = new Engine();
  e.state.settings.difficulty = 'peaceful';
  const log: string[] = [];
  const wait = (ok: () => boolean, label: string, limit = 2400) => {
    let seconds = 0;
    while (!ok() && seconds < limit) {
      e.tick(0.25);
      seconds += 0.25;
    }
    if (!ok())
      throw Error(
        label +
          ' stalled ' +
          JSON.stringify({
            time: e.state.time,
            age: e.state.age,
            pop: e.state.workers.length,
            housing: e.housing,
            resources: e.state.resources,
            jobs: e.state.workers.map((w) => [w.assigned, w.task, w.path.length]),
            log,
          }),
      );
  };
  const build = (type: string, workers = 0) => {
    const d = BUILDING[type];
    wait(() => e.canPay(d.cost), 'afford ' + type);
    const locations = [];
    for (let y = 5; y < 44; y += 4) for (let x = 5; x < 29; x += 4) locations.push({ x, y });
    locations.sort((a, b) => Math.hypot(a.x - 22, a.y - 23) - Math.hypot(b.x - 22, b.y - 23));
    let id: number | undefined;
    for (const p of locations) {
      let usable = true;
      for (let dy = 0; dy < d.size; dy++)
        for (let dx = 0; dx < d.size; dx++)
          if (
            at(e.state, p.x + dx, p.y + dy) ||
            !visible(e.state, p.x + dx, p.y + dy) ||
            ground(e.state, p.x + dx, p.y + dy) === 'water'
          )
            usable = false;
      if (!usable) continue;
      for (let dy = 0; dy < d.size; dy++)
        for (let dx = 0; dx < d.size; dx++)
          if (['forest', 'rock'].includes(ground(e.state, p.x + dx, p.y + dy)))
            e.clear(p.x + dx, p.y + dy);
      if (e.placement(type, p.x, p.y)) continue;
      const result = e.build(type, p.x, p.y);
      if (typeof result === 'number') {
        id = result;
        break;
      }
    }
    if (id === undefined) throw Error('plot ' + type + ' ' + JSON.stringify(log));
    wait(() => e.state.buildings.some((b) => b.id === id && !b.remaining), 'finish ' + type);
    for (let i = 0; i < workers; i++) {
      wait(() => e.state.workers.some((w) => w.assigned === null), 'worker ' + type);
      expect(e.assign(id, 1)).toBe(null);
    }
    log.push(type);
    return id;
  };
  const research = (id: string) => {
    const r = RESEARCH.find((r) => r.id === id)!;
    wait(() => e.canPay(r.cost), 'research cost ' + id);
    wait(
      () => e.state.workers.length >= (r.population ?? (id === 'bronze' ? 10 : 0)),
      'population ' + id,
    );
    expect(e.research(id), id).toBe(null);
    wait(() => e.state.research.includes(id), 'research ' + id);
  };
  const explore = (id: string) => {
    wait(() => e.state.resources.food >= 25, 'expedition food');
    expect(e.explore(id)).toBe(null);
    wait(() => !!e.state.regions.find((r) => r.id === id)?.explored, 'explore ' + id);
  };
  build('hut');
  build('lumber', 1);
  build('research', 1);
  build('hut');
  build('gatherer', 1);
  build('quarry', 1);
  research('masonry');
  build('cottage');
  research('farming');
  build('farm', 1);
  build('mill', 1);
  research('crafting');
  build('workshop', 1);
  build('longhouse');
  build('hunter', 1);
  research('herbs');
  build('healer', 1);
  build('plaza');
  for (const id of [
    'woods',
    'ruins',
    'traders',
    'region-1',
    'region-3',
    'region-4',
    'region-6',
    'region-7',
  ])
    explore(id);
  research('trade');
  research('defense');
  build('market');
  build('warehouse');
  build('warehouse');
  build('warehouse');
  research('bronze');
  build('mine', 2);
  build('smelter', 1);
  build('longhouse');
  const startingTime = e.state.time;
  for (const r of ADVANCEMENTS) {
    research(r.id);
    const age = e.state.age;
    if (age === 2) {
      build('ironMine', 2);
      build('charcoal', 1);
      build('forge', 1);
      build('stoneHouse');
      build('farm', 1);
      build('mill', 2);
    }
    if (age === 3) {
      build('weaver', 1);
      build('paperMill', 1);
      build('library', 1);
      build('temple', 1);
    }
    if (age === 4) {
      build('manor');
      build('apothecary', 1);
      build('university', 1);
    }
    if (age === 5) {
      build('engineering', 1);
      build('bank', 1);
      build('observatory', 1);
      build('depot');
      build('townhouse');
    }
    if (age === 6) {
      build('oilWell', 1);
      build('steelworks', 1);
      build('powerplant', 1);
      build('alloyWorks', 1);
    }
    if (age === 7) {
      build('refinery', 1);
      build('electronicsFactory', 1);
      build('hospital', 1);
      build('apartments');
    }
    if (age === 8) {
      build('datacenter', 1);
      build('academy', 1);
      build('broadcast', 1);
    }
    if (age === 9) {
      build('crystalMine', 1);
      build('fusionReactor', 1);
      build('arcology');
    }
    if (age === 10) {
      build('orbitalWorks', 1);
      build('spaceLab', 1);
      build('launchpad');
    }
    expect(decode(encode(e.state))).toEqual(e.state);
  }
  wait(() => e.canPay({ food: 50, wood: 80, stone: 40 }), 'city resources');
  expect(e.empire.found('woods')).toBe(null);
  expect(e.empire.route('capital', 'woods', 'wood', 25, false)).toBe(null);
  wait(() => e.state.routes.length === 0, 'delivery');
  wait(() => e.canPay({ alloys: 150, fuel: 120, data: 180, energy: 400 }), 'launch resources');
  expect(e.launch()).toBe(null);
  wait(() => e.state.campaign.launched, 'launch');
  wait(() => e.state.workers.length >= 100, 'population stress', 3600);
  expect(e.state.age).toBe(10);
  expect(e.state.workers.length).toBeGreaterThanOrEqual(100);
  console.info(
    'Campaign:',
    Math.round(e.state.time),
    'simulated seconds,',
    e.state.workers.length,
    'citizens,',
    e.state.buildings.length,
    'buildings',
  );
  if (process.env.POCKET_CAMPAIGN_SNAPSHOT)
    writeFileSync(process.env.POCKET_CAMPAIGN_SNAPSHOT, encode(e.state));
  expect(e.state.lifetime.crystals).toBeGreaterThan(0);
  expect(e.state.lifetime.data).toBeGreaterThan(0);
  expect(e.state.time - startingTime).toBeLessThan(20_000);
  expect(decode(encode(e.state))).toEqual(e.state);
}, 60_000);
