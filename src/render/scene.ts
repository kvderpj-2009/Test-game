import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { UNITS } from '../game/campaign-data';
import type { Engine } from '../game/engine';
import { BUILDING, CENTER, MAP_SIZE } from '../game/data';
import { at, ground, random, visible } from '../game/world';
import type { Point } from '../game/types';
import { buildingArt, ellipse, iso, line, polygon, rock, treeArt, uniso } from './art';
export class Scene {
  app = new Application();
  world = new Container();
  objects = new Container();
  terrainSprite: Sprite | null = null;
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
  unitGraphics = new Map<number, Graphics>();
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
      preference: 'webgl',
      powerPreference: 'low-power',
    });
    host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute('aria-label', 'Isometric game world');
    this.app.canvas.setAttribute('role', 'application');
    this.app.stage.addChild(this.world);
    this.world.addChild(this.objects, this.selection, this.ghost, this.people, this.effects);
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
    const key = type + level;
    if (!this.textures.has(key)) this.textures.set(key, Texture.from(buildingArt(type, level)));
    return this.textures.get(key)!;
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
  redraw() {
    for (const child of this.objects.removeChildren()) child.destroy();
    this.unitGraphics.clear();
    if (this.terrainSprite) {
      this.terrainSprite.texture.destroy(true);
      this.terrainSprite.destroy();
    }
    const canvas = document.createElement('canvas');
    canvas.width = 3264;
    canvas.height = 1760;
    const c = canvas.getContext('2d')!;
    c.translate(1632, 65);
    const state = this.engine.state;
    for (let y = 0; y < MAP_SIZE; y++)
      for (let x = 0; x < MAP_SIZE; x++) {
        const p = iso(x, y),
          t = ground(state, x, y),
          known = visible(state, x, y),
          v = random(x, y, state.seed);
        let color =
          t === 'water'
            ? ['#83b5b0', '#80b2ad', '#87b7b1'][Math.floor(v * 3)]
            : t === 'sand'
              ? '#d2c6a4'
              : t === 'forest'
                ? ['#93a777', '#99ad7e', '#8fa574'][Math.floor(v * 3)]
                : ['#a8b885', '#aabb8b', '#b0bd8d', '#a6b782'][Math.floor(v * 4)];
        if (!known)
          color = t === 'water' ? '#77958c' : ['#879882', '#8b9c84', '#889980'][Math.floor(v * 3)];
        polygon(
          c,
          [
            [p.x, p.y],
            [p.x + 32, p.y + 16],
            [p.x, p.y + 32],
            [p.x - 32, p.y + 16],
          ],
          color,
        );
        if (t === 'water' && v > 0.8) {
          line(
            c,
            [
              [p.x - 10, p.y + 13],
              [p.x + 8, p.y + 13],
            ],
            known ? '#c4ded355' : '#b3c8b533',
            1,
          );
        }
        if (known && t === 'grass' && v > 0.45) {
          for (let i = 0; i < 3; i++) {
            const gx = p.x + (random(x + i, y) - 0.5) * 33,
              gy = p.y + 12 + random(y + i, x) * 12;
            line(
              c,
              [
                [gx, gy],
                [gx - 1, gy - 3],
              ],
              '#69875645',
              1,
            );
          }
          if (v > 0.96) {
            ellipse(c, p.x + 4, p.y + 17, 1.7, 1, '#eadbb0');
            ellipse(c, p.x - 4, p.y + 21, 1.2, 1, '#e7d2a5');
          }
        }
        if (t === 'forest' && v > 0.14) {
          const key = 'tree' + Math.floor(v * 7);
          if (!this.textures.has(key))
            this.textures.set(key, Texture.from(treeArt(Math.floor(v * 7))));
          const tree = new Sprite(this.textures.get(key)!);
          tree.anchor.set(0.5, 120 / 140);
          tree.position.set(p.x, p.y + 16);
          tree.zIndex = (x + y + 1) * 10;
          tree.scale.set(0.72 + v * 0.23);
          if (!known) {
            tree.tint = 0x687a69;
            tree.alpha = 0.5;
          }
          this.objects.addChild(tree);
        }
        if (t === 'rock') {
          const art = document.createElement('canvas');
          art.width = 80;
          art.height = 70;
          const a = art.getContext('2d')!;
          ellipse(a, 40, 54, 25, 9, '#54684b30');
          rock(a, 35, 50, 22, '#a4afa3');
          rock(a, 54, 57, 13, '#b7bca8');
          const key = 'rock';
          if (!this.textures.has(key)) this.textures.set(key, Texture.from(art));
          const r = new Sprite(this.textures.get(key)!);
          r.anchor.set(0.5, 54 / 70);
          r.position.set(p.x, p.y + 16);
          r.zIndex = (x + y + 1) * 10;
          if (!known) r.alpha = 0.3;
          this.objects.addChild(r);
        }
      }
    this.terrainSprite = new Sprite(Texture.from(canvas));
    this.terrainSprite.position.set(-1632, -65);
    this.world.addChildAt(this.terrainSprite, 0);
    for (const b of state.buildings) {
      const def = BUILDING[b.type],
        p = iso(b.x + def.size / 2, b.y + def.size / 2);
      const sprite = new Sprite(this.texture(b.type, b.level));
      sprite.anchor.set(0.5, 180 / 260);
      sprite.position.set(p.x, p.y);
      sprite.zIndex = (b.x + b.y + def.size) * 10 + (b.type === 'road' ? -10000 : 0);
      sprite.alpha = b.remaining ? 0.55 : 1;
      if (b.rotation % 2) sprite.scale.x = -1;
      this.objects.addChild(sprite);
    }
    // Joined palisades follow every occupied orthogonal neighbor.
    const joins = new Graphics();
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
              .stroke({ color: 0x8c704b, width: 4 });
        }
      }
    }
    joins.zIndex = 10000;
    this.objects.addChild(joins);
    for (const r of state.regions.filter((r) => r.explored && r.enemy > 0)) {
      const p = iso(r.x, r.y);
      const camp = new Sprite(this.texture('barracks'));
      camp.anchor.set(0.5, 180 / 260);
      camp.position.set(p.x, p.y);
      camp.tint = 0xb98e7e;
      camp.zIndex = (r.x + r.y) * 10;
      this.objects.addChild(camp);
    }
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
    const all = [...this.engine.state.workers, ...this.engine.state.soldiers];
    for (const [id, graphic] of this.unitGraphics)
      if (!all.some((u) => u.id === id)) {
        graphic.destroy();
        this.unitGraphics.delete(id);
      }
    for (const unit of all) {
      let g = this.unitGraphics.get(unit.id);
      if (!g) {
        g = new Graphics();
        this.unitGraphics.set(unit.id, g);
        this.objects.addChild(g);
      }
      g.clear();
      g.zIndex = (unit.x + unit.y) * 10;
      const p = iso(unit.x, unit.y),
        walking = unit.path.length > 0,
        wave = walking
          ? Math.sin(this.engine.state.time * 9 + unit.id) * 3
          : Math.sin(time * 2 + unit.id) * 0.3;
      const soldier = 'type' in unit;
      const facing = unit.path.length && unit.path[0].x - unit.x < 0 ? -1 : 1;
      g.ellipse(p.x, p.y + 1, 5, 2).fill({ color: 0x304432, alpha: 0.2 });
      g.moveTo(p.x - 1, p.y - 5)
        .lineTo(p.x - 2 + wave, p.y + 1)
        .stroke({ color: 0x695b42, width: 2 });
      g.moveTo(p.x + 2, p.y - 5)
        .lineTo(p.x + 2 - wave, p.y + 1)
        .stroke({ color: 0x695b42, width: 2 });
      g.roundRect(p.x - 3, p.y - 14, 7, 10, 2).fill(
        soldier ? 0x6a8884 : unit.id % 3 === 0 ? 0xc6a774 : unit.id % 3 === 1 ? 0x7b9490 : 0xc78f6f,
      );
      g.moveTo(p.x - 3, p.y - 12)
        .lineTo(p.x - 5 - wave * 0.7, p.y - 7)
        .stroke({ color: 0xc7ac82, width: 2 });
      g.moveTo(p.x + 3, p.y - 12)
        .lineTo(p.x + 5 + wave * 0.7, p.y - 7)
        .stroke({ color: 0xc7ac82, width: 2 });
      g.circle(p.x + 0.5, p.y - 17, 3.5).fill(0xe0c095);
      g.ellipse(p.x, p.y - 19, 4, 1.7).fill(soldier ? 0x9aa79a : 0xb59a64);
      if (soldier && this.selectedUnits.has(unit.id))
        g.ellipse(p.x, p.y + 1, 9, 4).stroke({ color: 0xe8d47f, width: 2 });
      if (soldier) {
        g.moveTo(p.x + 7 * facing, p.y - 2)
          .lineTo(p.x + 7 * facing, p.y - 24)
          .stroke({ color: 0x725e3c, width: 1.5 });
        g.poly([
          p.x + 7 * facing,
          p.y - 28,
          p.x + 5 * facing,
          p.y - 22,
          p.x + 9 * facing,
          p.y - 22,
        ]).fill(0xc4c9ae);
      } else if (Object.keys(unit.cargo).length)
        g.rect(p.x - 5, p.y - 11, 8, 6)
          .fill(0xa68854)
          .stroke({ color: 0xe1c591, width: 1 });
      if ('task' in unit && unit.task === 'build' && !walking) {
        g.moveTo(p.x + 5, p.y - 12)
          .lineTo(p.x + 8, p.y - 20 + Math.sin(time * 5) * 4)
          .stroke({ color: 0x7d6849, width: 2 });
      }
    }
    const e = this.effects;
    e.clear();
    for (const b of this.engine.state.buildings) {
      const d = BUILDING[b.type],
        p = iso(b.x + d.size / 2, b.y + d.size / 2);
      if (b.remaining) {
        e.roundRect(p.x - 20, p.y - 75, 40, 4, 2).fill({ color: 0x314e3e, alpha: 0.4 });
        e.roundRect(
          p.x - 20,
          p.y - 75,
          Math.max(1, 40 * (1 - b.remaining / Math.max(d.time, 12))),
          4,
          2,
        ).fill(0xe6d69d);
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
            ? '#8cafad'
            : t === 'forest'
              ? '#7f986d'
              : t === 'rock'
                ? '#b6b7a1'
                : '#b9c296';
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
