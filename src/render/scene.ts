import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { UNITS } from '../game/campaign-data';
import type { Engine } from '../game/engine';
import { BUILDING, CENTER, MAP_SIZE } from '../game/data';
import { at, ground, random, visible } from '../game/world';
import type { Point } from '../game/types';
import {
  buildingAppearance,
  buildingArt,
  ellipse,
  iso,
  line,
  polygon,
  rock,
  treeArt,
  uniso,
} from './art';
import { CharacterAtlas, type Activity } from './characters';
export class Scene {
  app = new Application();
  world = new Container();
  objects = new Container();
  terrainLayer = new Container();
  naturalSprites: Sprite[] = [];
  buildingSprites = new Map<number, Sprite>();
  campSprites = new Map<string, Sprite>();
  wallJoins = new Graphics();
  private terrainKey = '';
  private atlas = new CharacterAtlas();
  private units = new Map<
    number,
    { sprite: Sprite; x: number; y: number; distance: number; facing: number }
  >();
  selection = new Graphics();
  effects = new Graphics();
  people = new Graphics();
  ghost = new Container();
  camera = { x: 0, y: 0, zoom: 1 };
  selected: number | null = null;
  placing: string | null = null;
  moving: number | null = null;
  clearing = false;
  commanding = false;
  selectedUnits = new Set<number>();
  onSoldier: (id: number, multi: boolean) => void = () => {};
  hover: Point | null = null;
  pinned: Point | null = null;
  onSelect: (id: number | null) => void = () => {};
  onPlot: (p: Point) => void = () => {};
  onCamera: () => void = () => {};
  onFrame: (dt: number) => void = () => {};
  textures = new Map<string, Texture>();
  revision = -1;
  elapsed = 0;
  pointers = new Map<number, Point>();
  private previous: Point | null = null;
  private down: Point | null = null;
  private pinchDistance = 0;
  private pinchCenter: Point | null = null;
  private dragged = false;
  constructor(public engine: Engine) {}
  async init(host: HTMLElement) {
    await this.app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(devicePixelRatio, 2),
      autoDensity: true,
      preference:
        new URLSearchParams(location.search).get('renderer') === 'canvas'
          ? ['canvas']
          : ['webgl', 'canvas'],
      powerPreference: 'low-power',
    });
    host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute('aria-label', 'Isometric game world');
    this.app.canvas.setAttribute('role', 'application');
    this.app.stage.addChild(this.world);
    this.world.addChild(
      this.terrainLayer,
      this.objects,
      this.selection,
      this.ghost,
      this.people,
      this.effects,
    );
    this.objects.addChild(this.wallJoins);
    this.objects.sortableChildren = true;
    this.center();
    this.bind(host);
    this.redraw();
    this.app.ticker.maxFPS = 60;
    this.app.ticker.add((t) => {
      const dt = Math.min(t.deltaMS / 1000, 0.1);
      this.elapsed += dt;
      this.onFrame(dt);
      if (this.revision !== this.engine.changed) {
        this.redraw();
        this.revision = this.engine.changed;
      }
      this.animate();
    });
    new ResizeObserver(() => this.transform()).observe(host);
  }
  texture(type: string, level = 1) {
    const key = `${type}:${level}:${buildingAppearance(type, this.engine.state.age)}`;
    if (!this.textures.has(key))
      this.textures.set(key, Texture.from(buildingArt(type, level, this.engine.state.age)));
    return this.textures.get(key)!;
  }
  focus(x: number, y: number) {
    const p = iso(x, y);
    // Keep the selected building in the open space beside its inspector.
    this.camera.x = -p.x * this.camera.zoom - Math.min(175, this.app.screen.width * 0.15);
    this.camera.y =
      -p.y * this.camera.zoom + (innerWidth < 600 ? this.app.screen.height * 0.34 : 40);
    this.transform();
  }
  center() {
    const p = iso(CENTER.x + 1, CENTER.y + 1);
    this.camera.zoom = innerWidth < 600 ? 0.66 : 1;
    this.camera.x = -p.x * this.camera.zoom;
    this.camera.y = -p.y * this.camera.zoom - 20;
    this.transform();
  }
  transform() {
    this.world.scale.set(this.camera.zoom);
    this.world.position.set(
      this.app.screen.width / 2 + this.camera.x,
      this.app.screen.height * 0.46 + this.camera.y,
    );
    this.cull();
    this.onCamera();
  }
  zoom(factor: number, screen?: Point) {
    const old = this.camera.zoom,
      next = Math.max(0.38, Math.min(2, old * factor));
    const p = screen ?? { x: this.app.screen.width / 2, y: this.app.screen.height * 0.46 };
    const wx = (p.x - this.world.x) / old,
      wy = (p.y - this.world.y) / old;
    this.camera.x -= wx * (next - old);
    this.camera.y -= wy * (next - old);
    this.camera.zoom = next;
    this.transform();
  }
  screenToTile(p: Point) {
    const world = {
      x: (p.x - this.world.x) / this.camera.zoom,
      y: (p.y - this.world.y) / this.camera.zoom,
    };
    const tile = uniso(world.x, world.y);
    return { x: Math.floor(tile.x), y: Math.floor(tile.y) };
  }
  tileToScreen(x: number, y: number) {
    const p = iso(x, y);
    return { x: p.x * this.camera.zoom + this.world.x, y: p.y * this.camera.zoom + this.world.y };
  }
  hitBuilding(screen: Point) {
    const wx = (screen.x - this.world.x) / this.camera.zoom,
      wy = (screen.y - this.world.y) / this.camera.zoom;
    const sorted = [...this.engine.state.buildings].sort(
      (a, b) => b.x + b.y + BUILDING[b.type].size - (a.x + a.y + BUILDING[a.type].size),
    );
    for (const b of sorted) {
      if (b.type === 'road') continue;
      const d = BUILDING[b.type],
        p = iso(b.x + d.size / 2, b.y + d.size / 2),
        px = Math.floor((wx - p.x) * (b.rotation % 2 ? -1 : 1) + 144),
        py = Math.floor(wy - p.y + 180);
      if (px < 0 || py < 0 || px >= 288 || py >= 260) continue;
      const canvas = this.texture(b.type, b.level).source.resource as HTMLCanvasElement;
      if (canvas.getContext('2d')!.getImageData(px, py, 1, 1).data[3] > 100) return b.id;
    }
    const tile = this.screenToTile(screen);
    return at(this.engine.state, tile.x, tile.y)?.id ?? null;
  }
  bind(host: HTMLElement) {
    host.addEventListener('contextmenu', (e) => e.preventDefault());
    host.addEventListener('pointerdown', (e) => {
      host.setPointerCapture(e.pointerId);
      const p = { x: e.clientX, y: e.clientY };
      this.pointers.set(e.pointerId, p);
      this.previous = p;
      this.down = p;
      this.dragged = false;
      if (this.pointers.size === 2) {
        const a = [...this.pointers.values()];
        this.pinchDistance = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        this.pinchCenter = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
        this.dragged = true;
      }
    });
    host.addEventListener('pointermove', (e) => {
      const p = { x: e.clientX, y: e.clientY };
      this.hover = this.screenToTile(p);
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);
      if (this.pointers.size === 2) {
        const a = [...this.pointers.values()],
          distance = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y),
          center = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
        if (this.pinchDistance) this.zoom(distance / this.pinchDistance, center);
        if (this.pinchCenter) {
          this.camera.x += center.x - this.pinchCenter.x;
          this.camera.y += center.y - this.pinchCenter.y;
          this.transform();
        }
        this.pinchDistance = distance;
        this.pinchCenter = center;
        this.dragged = true;
      } else if (this.previous && this.down) {
        if (Math.hypot(p.x - this.down.x, p.y - this.down.y) > 5) this.dragged = true;
        if (this.dragged) {
          this.camera.x += p.x - this.previous.x;
          this.camera.y += p.y - this.previous.y;
          this.transform();
        }
        this.previous = p;
      }
      if (this.placing && !this.pinned) this.drawGhost(this.hover);
    });
    const release = (e: PointerEvent) => {
      const wasMulti = this.pointers.size > 1;
      this.pointers.delete(e.pointerId);
      if (!this.dragged && !wasMulti && e.type !== 'pointercancel') {
        const p = this.screenToTile({ x: e.clientX, y: e.clientY });
        if (this.placing || this.clearing || this.commanding) {
          this.pinned = p;
          this.drawGhost(p);
          this.onPlot(p);
        } else {
          const soldier = this.engine.state.soldiers.find((u) => {
            const p = this.tileToScreen(u.x, u.y);
            return Math.hypot(p.x - e.clientX, p.y - 10 * this.camera.zoom - e.clientY) < 15;
          });
          if (soldier) this.onSoldier(soldier.id, e.shiftKey);
          else this.onSelect(this.hitBuilding({ x: e.clientX, y: e.clientY }));
        }
      }
      this.previous = null;
      this.down = null;
      this.pinchDistance = 0;
      this.pinchCenter = null;
    };
    host.addEventListener('pointerup', release);
    host.addEventListener('pointercancel', release);
    host.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoom(Math.exp(-e.deltaY * 0.001), { x: e.clientX, y: e.clientY });
      },
      { passive: false },
    );
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).matches('input,select,textarea')) return;
      const d: Record<string, number[]> = {
        ArrowLeft: [40, 0],
        ArrowRight: [-40, 0],
        ArrowUp: [0, 40],
        ArrowDown: [0, -40],
        a: [40, 0],
        d: [-40, 0],
        w: [0, 40],
        s: [0, -40],
      };
      if (d[e.key]) {
        e.preventDefault();
        this.camera.x += d[e.key][0];
        this.camera.y += d[e.key][1];
        this.transform();
      }
      if (e.key === '+' || e.key === '=') this.zoom(1.15);
      if (e.key === '-') this.zoom(1 / 1.15);
      if (e.key === 'Home') this.center();
    });
  }
  private inView(x: number, y: number, margin = 180) {
    const zoom = this.camera.zoom,
      sx = x * zoom + this.world.x,
      sy = y * zoom + this.world.y;
    return (
      sx > -margin * zoom &&
      sx < this.app.screen.width + margin * zoom &&
      sy > -margin * zoom &&
      sy < this.app.screen.height + margin * zoom
    );
  }
  private cull() {
    for (const s of [
      ...this.naturalSprites,
      ...this.buildingSprites.values(),
      ...this.campSprites.values(),
    ])
      s.visible = this.inView(s.x, s.y);
    for (const s of this.terrainLayer.children) s.visible = this.inView(s.x + 512, s.y + 512, 740);
  }
  private terrain() {
    const state = this.engine.state;
    const key =
      state.seed +
      ':' +
      state.cleared.join(',') +
      ':' +
      state.regions
        .filter((r) => r.explored)
        .map((r) => r.id)
        .join(',');
    if (this.terrainKey === key) return;
    this.terrainKey = key;
    for (const s of this.terrainLayer.removeChildren() as Sprite[]) {
      s.texture.destroy(true);
      s.destroy();
    }
    for (const s of this.naturalSprites) s.destroy();
    this.naturalSprites = [];
    const canvas = document.createElement('canvas');
    canvas.width = 3200;
    canvas.height = 1664;
    const c = canvas.getContext('2d')!;
    c.translate(1600, 48);
    for (let y = 0; y < MAP_SIZE; y++)
      for (let x = 0; x < MAP_SIZE; x++) {
        const p = iso(x, y),
          t = ground(state, x, y),
          known = visible(state, x, y),
          v = random(x, y, state.seed);
        let color =
          t === 'water'
            ? ['#55b9c2', '#58bcc5', '#5abdc7'][Math.floor(v * 3)]
            : t === 'sand'
              ? '#dcc888'
              : t === 'forest'
                ? ['#78b15a', '#7bb45c', '#7db55e'][Math.floor(v * 3)]
                : ['#89be62', '#8abf63', '#8dc166', '#88bd61'][Math.floor(v * 4)];
        if (!known)
          color = t === 'water' ? '#609b9c' : ['#759d7b', '#779f7d', '#749c7a'][Math.floor(v * 3)];
        const corners = [
          [p.x, p.y],
          [p.x + 32, p.y + 16],
          [p.x, p.y + 32],
          [p.x - 32, p.y + 16],
        ];
        polygon(c, corners, color, color);
        if (t === 'water') {
          if (v > 0.7)
            line(
              c,
              [
                [p.x - 12, p.y + 18],
                [p.x - 4, p.y + 20],
                [p.x + 9, p.y + 18],
              ],
              known ? '#d4f4d886' : '#d4e5cd28',
              1.5,
            );
          const neighbors = [
            [x, y - 1],
            [x + 1, y],
            [x, y + 1],
            [x - 1, y],
          ];
          for (let i = 0; i < 4; i++)
            if (ground(state, ...(neighbors[i] as [number, number])) !== 'water') {
              line(c, [corners[i], corners[(i + 1) % 4]], known ? '#bde3a6' : '#8cad8b', 4);
              line(c, [corners[i], corners[(i + 1) % 4]], known ? '#f6ecc0' : '#a9c29a', 1);
            }
        }
        if (known && t === 'grass' && v > 0.55) {
          for (let i = 0; i < 3; i++) {
            const gx = p.x + (random(x + i, y) - 0.5) * 32,
              gy = p.y + 14 + random(y + i, x) * 10;
            line(
              c,
              [
                [gx - 2, gy - 2],
                [gx, gy + 1],
                [gx + 1, gy - 4],
              ],
              '#588a473a',
              1,
            );
          }
          if (v > 0.94)
            for (let i = 0; i < 3; i++)
              ellipse(
                c,
                p.x - 7 + i * 6,
                p.y + 18 + (i % 2) * 3,
                1.6,
                1.1,
                i % 2 ? '#fff0a8' : '#e7eccc',
              );
        }
        if (t === 'forest' && v > 0.21) {
          const variant = Math.floor(v * 7),
            key = 'tree' + variant;
          if (!this.textures.has(key)) this.textures.set(key, Texture.from(treeArt(variant)));
          const tree = new Sprite(this.textures.get(key)!);
          tree.anchor.set(0.5, 120 / 140);
          tree.position.set(p.x, p.y + 16);
          tree.zIndex = (x + y + 1) * 10;
          tree.scale.set(0.66 + v * 0.17);
          if (!known) {
            tree.tint = 0x779b8c;
            tree.alpha = 0.48;
          }
          this.objects.addChild(tree);
          this.naturalSprites.push(tree);
        }
        if (t === 'rock') {
          if (!this.textures.has('rock')) {
            const art = document.createElement('canvas');
            art.width = 80;
            art.height = 70;
            const a = art.getContext('2d')!;
            ellipse(a, 40, 54, 25, 9, '#355a3a30');
            rock(a, 35, 50, 22, '#9faeaa');
            rock(a, 54, 57, 13, '#b3c0ac');
            this.textures.set('rock', Texture.from(art));
          }
          const r = new Sprite(this.textures.get('rock')!);
          r.anchor.set(0.5, 54 / 70);
          r.position.set(p.x, p.y + 16);
          r.zIndex = (x + y + 1) * 10;
          if (!known) r.alpha = 0.3;
          this.objects.addChild(r);
          this.naturalSprites.push(r);
        }
      }
    // Small texture pages also fit devices with a 2048-pixel GPU texture limit.
    for (let y = 0; y < canvas.height; y += 1024)
      for (let x = 0; x < canvas.width; x += 1024) {
        const chunk = document.createElement('canvas');
        chunk.width = Math.min(1024, canvas.width - x);
        chunk.height = Math.min(1024, canvas.height - y);
        chunk
          .getContext('2d')!
          .drawImage(canvas, x, y, chunk.width, chunk.height, 0, 0, chunk.width, chunk.height);
        const sprite = new Sprite(Texture.from(chunk));
        sprite.position.set(x - 1600, y - 48);
        this.terrainLayer.addChild(sprite);
      }
    canvas.width = canvas.height = 1;
  }
  redraw() {
    this.terrain();
    const state = this.engine.state,
      ids = new Set(state.buildings.map((b) => b.id));
    for (const [id, sprite] of this.buildingSprites)
      if (!ids.has(id)) {
        sprite.destroy();
        this.buildingSprites.delete(id);
      }
    for (const b of state.buildings) {
      const def = BUILDING[b.type],
        p = iso(b.x + def.size / 2, b.y + def.size / 2);
      let sprite = this.buildingSprites.get(b.id);
      if (!sprite) {
        sprite = new Sprite();
        sprite.anchor.set(0.5, 180 / 260);
        this.objects.addChild(sprite);
        this.buildingSprites.set(b.id, sprite);
      }
      sprite.texture = this.texture(b.type, b.level);
      sprite.position.set(p.x, p.y);
      sprite.zIndex =
        (b.x + b.y + def.size) * 10 + (['road', 'bridge'].includes(b.type) ? -10000 : 0);
      sprite.alpha = b.remaining ? 0.6 : 1;
      sprite.scale.x = b.rotation % 2 ? -1 : 1;
    }
    const joins = this.wallJoins;
    joins.clear();
    for (const b of state.buildings.filter((b) => b.type === 'wall' || b.type === 'gate')) {
      const p = iso(b.x + 0.5, b.y + 0.5);
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ]) {
        const n = at(state, b.x + dx, b.y + dy);
        if (n && ['wall', 'gate'].includes(n.type)) {
          const q = iso(n.x + 0.5, n.y + 0.5);
          for (const h of [9, 22])
            joins
              .moveTo(p.x, p.y - h)
              .lineTo(q.x, q.y - h)
              .stroke({ color: 0x967044, width: 4 });
        }
      }
    }
    joins.zIndex = 10000;
    const camps = state.regions.filter((r) => r.explored && r.enemy > 0),
      campIds = new Set(camps.map((r) => r.id));
    for (const [id, sprite] of this.campSprites)
      if (!campIds.has(id)) {
        sprite.destroy();
        this.campSprites.delete(id);
      }
    for (const r of camps) {
      let camp = this.campSprites.get(r.id);
      if (!camp) {
        camp = new Sprite(this.texture('barracks'));
        camp.anchor.set(0.5, 180 / 260);
        camp.tint = 0xe0a189;
        this.objects.addChild(camp);
        this.campSprites.set(r.id, camp);
      }
      const p = iso(r.x, r.y);
      camp.position.set(p.x, p.y);
      camp.zIndex = (r.x + r.y) * 10;
    }
    this.cull();
    this.drawSelected();
    if (this.pinned) this.drawGhost(this.pinned);
  }
  drawSelected() {
    this.selection.clear();
    const b = this.engine.state.buildings.find((b) => b.id === this.selected);
    if (b) this.diamond(this.selection, b.x, b.y, BUILDING[b.type].size, 0xf8e8b0, 0.22);
  }
  diamond(g: Graphics, x: number, y: number, size: number, color: number, alpha = 0.3) {
    const points = [iso(x, y), iso(x + size, y), iso(x + size, y + size), iso(x, y + size)];
    g.poly(points.flatMap((p) => [p.x, p.y]))
      .fill({ color, alpha })
      .stroke({ color, width: 2 });
  }
  setPlacement(type: string | null, moving: number | null = null) {
    this.placing = type;
    this.moving = moving;
    this.pinned = null;
    this.ghost.removeChildren().forEach((c) => c.destroy());
  }
  drawGhost(p: Point | null) {
    this.ghost.removeChildren().forEach((c) => c.destroy());
    if (!p || !this.placing) return;
    const type = this.placing,
      def = BUILDING[type],
      valid = !this.engine.placement(type, p.x, p.y, this.moving ?? undefined);
    const grid = new Graphics();
    for (let dy = -2; dy < def.size + 2; dy++)
      for (let dx = -2; dx < def.size + 2; dx++)
        this.diamond(grid, p.x + dx, p.y + dy, 1, 0xfaf3d1, 0.035);
    this.diamond(grid, p.x, p.y, def.size, valid ? 0xcee79b : 0xd79077, 0.34);
    const s = new Sprite(this.texture(type));
    s.anchor.set(0.5, 180 / 260);
    const pos = iso(p.x + def.size / 2, p.y + def.size / 2);
    s.position.set(pos.x, pos.y);
    s.alpha = 0.65;
    this.ghost.addChild(grid, s);
  }
  animate() {
    const time = this.elapsed;
    const all = [...this.engine.state.workers, ...this.engine.state.soldiers],
      ids = new Set(all.map((u) => u.id));
    this.people.clear();
    for (const [id, entry] of this.units)
      if (!ids.has(id)) {
        entry.sprite.destroy();
        this.units.delete(id);
      }
    for (const unit of all) {
      const p = iso(unit.x, unit.y);
      let entry = this.units.get(unit.id);
      if (!entry) {
        const sprite = new Sprite();
        sprite.anchor.set(0.5, 66 / 80);
        this.objects.addChild(sprite);
        entry = { sprite, x: p.x, y: p.y, distance: 0, facing: 1 };
        this.units.set(unit.id, entry);
      }
      const dx = p.x - entry.x,
        dy = p.y - entry.y,
        travel = Math.hypot(dx, dy);
      if (travel > 0.05) {
        entry.distance += travel;
        if (Math.abs(dx) > 0.02) entry.facing = dx < 0 ? -1 : 1;
      }
      entry.x = p.x;
      entry.y = p.y;
      const sprite = entry.sprite;
      sprite.position.set(p.x, p.y);
      sprite.zIndex = (unit.x + unit.y) * 10;
      sprite.visible = this.inView(p.x, p.y, 70);
      if (!sprite.visible) continue;
      const soldier = 'type' in unit,
        walking = unit.path.length > 0,
        carry = !soldier && Object.keys(unit.cargo).length > 0;
      const activity: Activity = carry
        ? 'carry'
        : walking
          ? 'walk'
          : (!soldier && ['build', 'gather'].includes(unit.task)) || (soldier && unit.cooldown > 0)
            ? 'work'
            : 'idle';
      const frame =
        Math.floor(
          walking
            ? entry.distance / 3.5
            : this.engine.state.time * (activity === 'work' ? 8 : 3) + unit.id,
        ) % 8;
      sprite.texture = this.atlas.texture(
        soldier ? unit.type : 'worker' + (unit.id % 3),
        activity,
        frame,
        this.engine.state.age,
      );
      sprite.scale.x = entry.facing;
      if (soldier && this.selectedUnits.has(unit.id))
        this.people.ellipse(p.x, p.y + 1, 12, 5).stroke({ color: 0xffe6a0, width: 2 });
    }
    const e = this.effects;
    e.clear();
    for (const b of this.engine.state.buildings) {
      const d = BUILDING[b.type],
        p = iso(b.x + d.size / 2, b.y + d.size / 2);
      if (!this.inView(p.x, p.y)) continue;
      if (b.remaining) {
        const duration = b.level > 1 ? 12 : d.time;
        const progress = Math.max(0, Math.min(1, 1 - b.remaining / duration));
        e.roundRect(p.x - 20, p.y - 75, 40, 4, 2).fill({ color: 0x314e3e, alpha: 0.4 });
        if (progress > 0) e.roundRect(p.x - 20, p.y - 75, 40 * progress, 4, 2).fill(0xe6d69d);
      }
      if (
        (b.type === 'hall' || b.type === 'smelter' || b.type === 'fire') &&
        !b.remaining &&
        this.engine.state.settings.quality === 'high'
      )
        for (let i = 0; i < 4; i++) {
          const phase = (time * 0.25 + i * 0.25) % 1;
          e.circle(
            p.x - 15 + phase * 10 + Math.sin(time + i) * 2,
            p.y - (b.type === 'fire' ? 20 : 78) - phase * 30,
            2 + phase * 5,
          ).fill({ color: 0xf4eedc, alpha: (1 - phase) * 0.28 });
        }
    }
    const raid = this.engine.state.raid;
    if (raid) {
      const p = iso(raid.x, raid.y);
      e.circle(p.x, p.y - 10, 7).fill(0xa5624d);
      e.rect(p.x - 12, p.y - 30, 24 * Math.max(0, raid.hp / 130), 3).fill(0xc77b59);
    }
    for (const r of this.engine.state.regions.filter((r) => r.explored && r.enemy > 0)) {
      const p = iso(r.x, r.y);
      e.roundRect(p.x - 30, p.y - 110, 60, 5, 2).fill(0x5b5546);
      e.roundRect(p.x - 30, p.y - 110, (60 * r.enemy) / r.maxEnemy, 5, 2).fill(0xc48b69);
      for (const u of this.engine.state.soldiers.filter(
        (u) => u.target === r.id && u.cooldown > UNITS[u.type].cooldown - 0.3,
      )) {
        const from = iso(u.x, u.y),
          v = Math.max(0, Math.min(1, (UNITS[u.type].cooldown - u.cooldown) / 0.3)),
          px = from.x + (p.x - from.x) * v,
          py = from.y + (p.y - from.y) * v - 20 - Math.sin(v * Math.PI) * 20;
        e.moveTo(px - 3, py - 2)
          .lineTo(px + 3, py + 2)
          .stroke({ color: 0xf4ddb2, width: 2 });
      }
    }
    if (this.engine.state.settings.quality === 'high')
      for (let i = 0; i < 3; i++) {
        const x = 18 + Math.sin(time * 0.18 + i * 3) * 6,
          y = 19 + Math.cos(time * 0.2 + i) * 5,
          p = iso(x, y),
          flap = Math.sin(time * 5 + i) * 3;
        e.moveTo(p.x - 5, p.y - 140 + flap)
          .lineTo(p.x, p.y - 138)
          .lineTo(p.x + 5, p.y - 140 + flap)
          .stroke({ color: 0x49634c, alpha: 0.6, width: 1.2 });
      }
  }
  minimap(canvas: HTMLCanvasElement) {
    const c = canvas.getContext('2d')!;
    const scale = canvas.width / MAP_SIZE;
    c.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < MAP_SIZE; y++)
      for (let x = 0; x < MAP_SIZE; x++) {
        const t = ground(this.engine.state, x, y);
        c.fillStyle = !visible(this.engine.state, x, y)
          ? '#465c50'
          : t === 'water'
            ? '#58bcc5'
            : t === 'forest'
              ? '#60984e'
              : t === 'rock'
                ? '#b6b7a1'
                : '#8fbe6c';
        c.fillRect(x * scale, y * scale, scale + 0.3, scale + 0.3);
      }
    for (const b of this.engine.state.buildings) {
      c.fillStyle = '#f4dfb3';
      c.fillRect(
        b.x * scale,
        b.y * scale,
        BUILDING[b.type].size * scale,
        BUILDING[b.type].size * scale,
      );
    }
    const p = this.screenToTile({ x: this.app.screen.width / 2, y: this.app.screen.height * 0.46 });
    c.strokeStyle = '#f7eed0';
    c.lineWidth = 1;
    c.strokeRect((p.x - 7) * scale, (p.y - 6) * scale, 14 * scale, 12 * scale);
  }
}
