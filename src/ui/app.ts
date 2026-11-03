import { BUILDING, BUILDINGS, AGES, MISSION_IDS, MISSION_REWARDS, RESEARCH } from '../game/data';
import { Engine, newGame } from '../game/engine';
import { decode, encode, load, MANUAL_KEY, save, SAVE_KEY } from '../game/save';
import {
  RESOURCES,
  type Category,
  type Cost,
  type Language,
  type Point,
  type Resource,
} from '../game/types';
import { Scene } from '../render/scene';
import { thumbnail } from '../render/art';
import { description, getLanguage, setLanguage, t, techName } from './i18n';
import { icon } from './icons';
type Panel =
  'researchTab' | 'world' | 'army' | 'quests' | 'settings' | 'saves' | 'economy' | 'credits' | null;
const button = (action: string, label: string, cls = '', glyph?: string) =>
  `<button class="${cls}" data-action="${action}">${glyph ? icon(glyph) : ''}${label}</button>`;
const cost = (values: Cost) =>
  `<span class="cost">${Object.entries(values)
    .map(([r, n]) => `<span title="${t(r)}">${icon(r)}${Math.ceil(n)}</span>`)
    .join('')}</span>`;
export class GameUI {
  scene: Scene;
  started = false;
  paused = false;
  speed = 1;
  tab = 'build';
  category: Category = 'housing';
  panel: Panel = null;
  selected: number | null = null;
  rotation = 0;
  confirmAction: (() => void) | null = null;
  root: HTMLElement;
  private tick = 0;
  private saveTimer = 0;
  private uiTimer = 0;
  private lastChanged = -1;
  private audio: AudioContext | null = null;
  private ambient: GainNode | null = null;
  constructor(
    public engine: Engine,
    scene: Scene,
    private hasSave: boolean,
  ) {
    this.scene = scene;
    this.root = document.querySelector('#ui')!;
    setLanguage(engine.state.settings.language);
  }
  init() {
    this.root.innerHTML = `<header id="topbar"></header><aside id="journey"></aside><div id="world-caption"></div><div id="build-panel"></div><aside id="inspector"></aside><div id="placement"></div><aside id="map-panel"></aside><nav id="dock"></nav><div id="welcome"></div><div id="overlay"></div><div id="toast" role="status" aria-live="polite"></div><div id="dialog-root"></div>`;
    this.root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (el && !el.hasAttribute('disabled')) this.action(el.dataset.action!);
    });
    this.root.addEventListener('change', (e) => {
      const el = e.target as HTMLSelectElement;
      if (el.id === 'language') {
        this.engine.state.settings.language = el.value as Language;
        setLanguage(el.value as Language);
        this.render();
      }
      if (el.id === 'quality') {
        this.engine.state.settings.quality = el.value as 'high' | 'low';
        this.scene.app.ticker.maxFPS = el.value === 'low' ? 30 : 60;
      }
      if (el.id === 'import-file') {
        const file = (el as unknown as HTMLInputElement).files?.[0];
        if (file) void this.import(file);
      }
    });
    window.addEventListener('keydown', (e) => {
      const dialog =
        document.querySelector<HTMLElement>('.confirm-dialog') ??
        document.querySelector<HTMLElement>('.modal');
      if (e.key === 'Tab' && dialog) {
        const controls = [
          ...dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), select, input:not([hidden])',
          ),
        ].filter((el) => el.offsetParent !== null);
        const first = controls[0],
          last = controls[controls.length - 1];
        if (!dialog.contains(document.activeElement)) {
          e.preventDefault();
          first?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
        return;
      }
      if ((e.target as HTMLElement).matches('input,select,textarea')) return;
      if (e.key === 'Escape') {
        if (this.confirmAction) {
          this.confirmAction = null;
          this.el('dialog-root').innerHTML = '';
        } else if (this.panel) {
          this.panel = null;
          this.renderModal();
        } else {
          this.cancelPlacement();
          this.selected = null;
          this.renderInspector();
        }
      }
      if (e.code === 'Space' && this.started && !this.panel && !this.confirmAction) {
        e.preventDefault();
        this.paused = !this.paused;
        this.renderHeader();
      }
      if (e.key === 'b' && this.started) this.action('tab:build');
      if (e.key === 'r' && this.scene.placing) this.action('rotate');
    });
    this.scene.onSelect = (id) => {
      if (!this.started) return;
      this.selected = id;
      this.scene.selected = id;
      this.scene.drawSelected();
      this.renderInspector();
    };
    this.scene.onPlot = (p) => this.plot(p);
    this.scene.onFrame = (dt) => this.frame(dt);
    this.scene.onCamera = () => {
      const map = document.querySelector<HTMLCanvasElement>('#minimap');
      if (map) this.scene.minimap(map);
    };
    this.engine.onEvent = (key) => {
      this.toast(t(key));
      this.chime();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.started) this.persist();
    });
    window.addEventListener('pagehide', () => {
      if (this.started) this.persist();
    });
    this.render();
  }
  el(id: string) {
    return document.getElementById(id)!;
  }
  frame(dt: number) {
    if (this.started && !this.paused && !document.hidden) {
      this.tick += dt * this.speed;
      while (this.tick >= 0.1) {
        this.engine.tick(0.1);
        this.tick -= 0.1;
      }
      this.saveTimer += dt;
      if (this.saveTimer >= 30) {
        this.saveTimer = 0;
        this.persist();
      }
    }
    this.uiTimer += dt;
    if (this.uiTimer > 0.5) {
      this.uiTimer = 0;
      this.live();
      if (this.lastChanged !== this.engine.changed) {
        this.lastChanged = this.engine.changed;
        this.renderHeader();
        this.renderJourney();
        this.renderInspector();
        const map = document.querySelector<HTMLCanvasElement>('#minimap');
        if (map) this.scene.minimap(map);
      }
      if (this.panel && ['world', 'researchTab', 'army', 'economy'].includes(this.panel))
        this.renderModal();
    }
  }
  render() {
    this.scene.app.ticker.maxFPS = this.engine.state.settings.quality === 'low' ? 30 : 60;
    this.scene.app.canvas.setAttribute('aria-label', t('worldCanvas'));
    if (this.ambient && this.audio)
      this.ambient.gain.setTargetAtTime(
        this.engine.state.settings.sound ? 0.012 : 0,
        this.audio.currentTime,
        0.5,
      );
    this.renderHeader();
    this.renderJourney();
    this.renderDock();
    this.renderBuild();
    this.renderInspector();
    this.renderMap();
    this.renderWelcome();
    this.renderModal();
    this.live();
    this.el('world-caption').innerHTML =
      `<span>${icon('leaf')}${t('peaceful')}</span><small>${t(matchMedia('(pointer:coarse)').matches ? 'touchControls' : 'controls')}</small>`;
  }
  renderHeader() {
    this.el('topbar').innerHTML =
      `<div class="brand"><img src="/icon.svg" alt=""/><span>POCKET<span>CIVILIZATION</span></span></div><button class="settlement" data-action="economy"><span class="eyebrow">${t(AGES[this.engine.state.age])} <b>I${this.engine.state.age ? 'I' : ''}</b></span><strong>${t('village')}</strong></button><div class="resources">${(['food', 'wood', 'stone', 'knowledge'] as Resource[]).map((r) => `<button class="resource ${r}" data-action="economy" title="${t(r)}">${icon(r)}<span><strong data-stock="${r}"></strong><small>${t(r)}</small></span></button>`).join('')}</div><button class="population resource" data-action="economy">${icon('population')}<span><strong id="population-count"></strong><small>${t('population')}</small></span></button><div class="time-controls"><span id="day-count"></span>${button('pause', '', `icon-button ${this.paused ? 'active' : ''}`, this.paused ? 'play' : 'pause')}${button('speed', `${this.speed}×`, 'speed-button')}${button('settings', '', 'icon-button', 'settings')}</div>`;
    const pause = this.el('topbar').querySelector('[data-action="pause"]');
    pause?.setAttribute('aria-label', t(this.paused ? 'play' : 'pause'));
    this.el('topbar')
      .querySelector('[data-action="settings"]')
      ?.setAttribute('aria-label', t('settings'));
    this.live();
  }
  live() {
    const s = this.engine.state;
    this.root
      .querySelectorAll<HTMLElement>('[data-stock]')
      .forEach(
        (el) =>
          (el.textContent = Math.floor(s.resources[el.dataset.stock as Resource]).toLocaleString(
            getLanguage(),
          )),
      );
    const pop = document.querySelector('#population-count');
    if (pop) pop.textContent = `${s.workers.length} / ${this.engine.housing}`;
    const day = document.querySelector('#day-count');
    if (day)
      day.textContent = this.paused ? t('paused') : t('day', { n: 1 + Math.floor(s.time / 180) });
    const happy = document.querySelector('#happiness-value');
    if (happy) happy.textContent = `${s.happiness}%`;
    if (this.selected && this.engine.state.buildings.find((b) => b.id === this.selected)?.remaining)
      this.renderInspector();
  }
  renderJourney() {
    this.el('journey').hidden = !this.started;
    const s = this.engine.state;
    const first = MISSION_IDS.findIndex((id) => !s.missions.includes(id));
    const shown = MISSION_IDS.slice(Math.max(0, first - 1), Math.max(0, first - 1) + 3);
    this.el('journey').innerHTML =
      `<div class="eyebrow">${icon('flag')}${t('journey')}<span>${s.missions.length} / ${MISSION_IDS.length}</span></div><h2>${t('firstSteps')}</h2><p class="muted journey-intro">${t('questHint')}</p><div class="quest-list">${shown.map((id) => `<button data-action="quest:${id}" class="quest ${s.missions.includes(id) ? 'done' : ''}"><span class="quest-check">${s.missions.includes(id) ? icon('check') : ''}</span><span>${t(id)}</span>${icon('chevron')}</button>`).join('')}</div><button data-action="quests" class="text-button">${t('allQuests')}${icon('arrow')}</button><div class="settler-advice"><span class="eyebrow">${t('tutorial')}</span><p>${t(!this.engine.has('hut') ? 'tutorial1' : !this.engine.has('lumber') ? 'tutorial2' : !s.research.includes('farming') ? 'tutorial3' : 'tutorial4')}</p></div>`;
  }
  renderDock() {
    this.el('dock').hidden = !this.started;
    this.el('dock').innerHTML =
      `<div class="dock-tabs">${['build', 'researchTab', 'world', 'army', 'quests'].map((tab) => button('tab:' + tab, t(tab), this.tab === tab ? 'active' : '', tab)).join('')}</div><span class="dock-status">${icon('leaf')}<span id="happiness-value">${this.engine.state.happiness}%</span> ${t('happiness')}</span>`;
  }
  renderBuild() {
    const el = this.el('build-panel');
    el.hidden = !this.started || this.tab !== 'build' || !!this.scene.placing || !!this.selected;
    el.innerHTML = `<div class="build-heading"><div><span class="eyebrow">${t('build')}</span><h2>${t('catalog')}</h2></div>${button('clear', '', 'icon-button', 'clear')}</div><div class="categories">${(['housing', 'production', 'community', 'defense', 'paths'] as Category[]).map((cat) => button('category:' + cat, t(cat), this.category === cat ? 'active' : '', cat)).join('')}</div><div class="building-cards">${BUILDINGS.filter(
      (b) => b.category === this.category && b.id !== 'hall',
    )
      .map((b) => {
        const locked = b.research && !this.engine.state.research.includes(b.research);
        return `<button class="building-card ${locked ? 'locked' : ''}" data-action="build:${b.id}" title="${locked ? t('requires') + ': ' + techName(b.research!) : description(b.id, b.category, b.storage)}"><span class="card-art"><img src="${thumbnail(b.id)}" alt="" loading="lazy"/>${locked ? icon('lock') : ''}</span><strong>${t(b.id)}</strong>${cost(b.cost)}<span class="card-time">${icon('clock')}${b.time}s</span></button>`;
      })
      .join('')}</div>`;
    el.querySelector('[data-action="clear"]')?.setAttribute('aria-label', t('clear'));
  }
  renderMap() {
    const el = this.el('map-panel');
    el.hidden = !this.started;
    el.innerHTML = `<div class="map-head"><span>${t('village')}</span><span class="compass">N ↑</span></div><button class="minimap-button" data-action="tab:world" aria-label="${t('world')}"><canvas id="minimap" width="144" height="144"></canvas></button><div class="map-tools">${button('zoomout', '', 'icon-button', 'minus')}${button('center', '', 'icon-button', 'center')}${button('zoomin', '', 'icon-button', 'plus')}</div>`;
    this.scene.minimap(el.querySelector('canvas')!);
    for (const [a, k] of [
      ['zoomout', 'zoomOut'],
      ['center', 'center'],
      ['zoomin', 'zoomIn'],
    ])
      el.querySelector(`[data-action="${a}"]`)?.setAttribute('aria-label', t(k));
  }
  renderWelcome() {
    const el = this.el('welcome');
    el.hidden = this.started;
    el.innerHTML = `<div class="welcome-card"><span class="eyebrow"><span class="small-rule"></span>${t('chapter')}</span><h1>${t('yourStory')}</h1><p>${t('welcomeText')}</p><div class="welcome-buttons">${this.hasSave ? button('continue', t('continue'), 'primary', 'play') : ''}${button('new', t('newGame'), this.hasSave ? 'secondary' : 'primary', 'arrow')}</div><div class="welcome-links">${button('saves', t('saves'))}${button('settings', t('settings'))}${button('credits', t('credits'))}</div><span class="welcome-foot">${icon('leaf')}${t('subtitle')}</span></div><div class="world-label"><span>48 × 48</span>${t('village')}<small>${t('stoneAge')}</small></div>`;
  }
  renderInspector() {
    const el = this.el('inspector');
    const b = this.engine.state.buildings.find((b) => b.id === this.selected);
    el.hidden = !b || !!this.scene.placing;
    if (!b) {
      this.scene.selected = null;
      this.scene.drawSelected();
      this.renderBuild();
      return;
    }
    const d = BUILDING[b.type],
      count = this.engine.state.workers.filter((w) => w.assigned === b.id).length;
    el.innerHTML = `<div class="inspector-top"><span class="eyebrow">${t(d.category)} · ${t('level', { n: b.level })}</span>${button('deselect', '', 'icon-button', 'close')}</div><div class="inspect-art"><img src="${thumbnail(b.type)}" alt=""/></div><h2>${t(b.type)}</h2><p class="muted">${description(b.type, d.category, d.storage)}</p>${b.remaining ? `<div class="construction"><span>${t('construction')}</span><b>${Math.ceil(b.remaining)}s</b><progress value="${Math.max(0, (b.level > 1 ? 12 : d.time) - b.remaining)}" max="${b.level > 1 ? 12 : d.time}"></progress></div>` : ''}<div class="building-stats">${d.housing ? `<div>${t('homes')}<b>${d.housing * b.level}</b></div>` : ''}${d.storage ? `<div>${t('capacity')}<b>+${d.storage * b.level}${d.stores ? ' · ' + d.stores.map((r) => t(r)).join(', ') : ''}</b></div>` : ''}<div>${t('health')}<b>${Math.ceil(b.hp)} / ${this.engine.maxHP(b)}</b></div></div>${d.output ? `<div class="production-line"><small>${t('output')}</small>${cost(Object.fromEntries(Object.entries(d.output).map(([r, n]) => [r, n * (1 + (b.level - 1) * 0.4)])))}</div>${d.input ? `<div class="production-line"><small>${t('input')}</small>${cost(d.input)}</div>` : ''}<div class="worker-control"><span>${t('workers')}<small>${t('freeWorkers', { n: this.engine.state.workers.filter((w) => w.assigned === null).length })}</small></span><div>${button('unassign', '', 'icon-button', 'minus')}<b>${count} / ${d.workers}</b>${button('assign', '', 'icon-button', 'plus')}</div></div>` : ''}<div class="inspector-actions">${b.level < 3 && !['road', 'wall', 'gate', 'trap', 'fire', 'plaza'].includes(b.type) ? button('upgrade', `${t('upgrade')}${cost(b.type === 'hall' ? { wood: 80 * b.level, stone: 50 * b.level, knowledge: 30 } : this.engine.upgradeCost(b))}`, 'primary', 'plus') : ''}${b.type !== 'hall' ? `<div class="split">${button('move', t('move'), 'secondary', 'move')}${button('remove', t('remove'), 'quiet danger', 'trash')}</div>` : ''}${b.type === 'market' ? button('economy', t('trade'), 'secondary', 'gold') : ''}</div>`;
    for (const [a, k] of [
      ['assign', 'assign'],
      ['unassign', 'unassign'],
      ['deselect', 'close'],
    ])
      el.querySelector(`[data-action="${a}"]`)?.setAttribute('aria-label', t(k));
    this.renderBuild();
  }
  begin(type: string, moving: number | null = null) {
    this.selected = null;
    this.scene.selected = null;
    this.scene.drawSelected();
    this.scene.setPlacement(type, moving);
    this.scene.clearing = false;
    this.rotation = 0;
    this.renderInspector();
    this.renderBuild();
    this.el('placement').innerHTML =
      `<div class="placement-card"><img src="${thumbnail(type)}" alt=""/><div><span class="eyebrow">${moving ? t('move') : t('build')}</span><strong>${t(type)}</strong><small>${t('hintBuild')}</small></div>${button('cancel', t('cancel'), 'secondary', 'close')}</div>`;
  }
  plot(p: Point) {
    if (!this.started) return;
    if (this.scene.clearing) {
      this.result(this.engine.clear(p.x, p.y));
      return;
    }
    const type = this.scene.placing;
    if (!type) return;
    const error = this.engine.placement(type, p.x, p.y, this.scene.moving ?? undefined);
    this.el('placement').innerHTML =
      `<div class="placement-card"><img src="${thumbnail(type)}" alt=""/><div><span class="eyebrow">${this.scene.moving ? t('move') : t('build')}</span><strong>${t(type)}</strong><small class="${error ? 'error' : ''}">${error ? t(error) : `${p.x}, ${p.y}`}</small>${this.scene.moving ? '' : cost(BUILDING[type].cost)}</div><div class="placement-actions"><button class="primary" data-action="place" ${error ? 'disabled' : ''}>${icon('check')}${t(this.scene.moving ? 'confirm' : 'place')}</button>${button('rotate', '', 'icon-button', 'rotate')}${button('cancel', '', 'icon-button', 'close')}</div></div>`;
    this.el('placement')
      .querySelector('[data-action="rotate"]')
      ?.setAttribute('aria-label', t('rotate'));
    this.el('placement')
      .querySelector('[data-action="cancel"]')
      ?.setAttribute('aria-label', t('cancel'));
  }
  cancelPlacement() {
    this.scene.setPlacement(null);
    this.scene.clearing = false;
    this.el('placement').innerHTML = '';
    this.renderBuild();
  }
  toast(message: string) {
    const el = this.el('toast');
    el.innerHTML = `${icon('leaf')}<span></span>`;
    el.querySelector('span')!.textContent = message;
    el.classList.add('visible');
    clearTimeout(Number(el.dataset.timeout));
    el.dataset.timeout = String(setTimeout(() => el.classList.remove('visible'), 4200));
  }
  result(error: string | null | number) {
    if (typeof error === 'string') {
      this.toast(t(error));
      return false;
    }
    this.renderInspector();
    this.renderJourney();
    this.renderModal();
    this.live();
    return true;
  }
  persist(key = SAVE_KEY, announce = false) {
    try {
      save(this.engine.state, localStorage, key);
      this.hasSave = true;
      if (announce) this.toast(t('saved'));
      return true;
    } catch {
      this.toast(t('saveError'));
      return false;
    }
  }
  restore(key = SAVE_KEY) {
    try {
      const r = load(localStorage, key);
      if (r.state) {
        this.engine.state = r.state;
        this.engine.changed++;
        setLanguage(r.state.settings.language);
        this.started = true;
        this.selected = null;
        this.panel = null;
        this.paused = false;
        this.scene.center();
        this.render();
        if (r.recovered) this.toast(t('recovered'));
      } else this.toast(t(r.error ? 'corrupt' : 'emptySlot'));
    } catch {
      this.toast(t('corrupt'));
    }
  }
  confirm(message: string, callback: () => void) {
    this.confirmAction = callback;
    this.el('dialog-root').innerHTML =
      `<div class="dialog-backdrop"><section class="confirm-dialog" role="alertdialog" aria-modal="true"><h2>${message}</h2><div class="split">${button('confirmCancel', t('cancel'), 'secondary')}${button('confirmOK', t('confirm'), 'primary')}</div></section></div>`;
    this.el('dialog-root').querySelector<HTMLButtonElement>('button')?.focus();
  }
  startNew() {
    if (this.hasSave || this.started)
      this.confirm(t('restartConfirm'), () => {
        if (!this.persist(MANUAL_KEY)) return;
        this.doNew();
      });
    else this.doNew();
  }
  doNew() {
    this.engine.state = newGame(getLanguage());
    this.engine.changed++;
    this.started = true;
    this.paused = false;
    this.panel = null;
    this.selected = null;
    this.tab = 'build';
    this.category = 'housing';
    this.cancelPlacement();
    this.scene.center();
    this.render();
    this.persist();
  }
  action(action: string) {
    const [verb, arg] = action.split(':');
    if (verb === 'new') {
      this.startNew();
      return;
    }
    if (verb === 'continue') {
      this.restore();
      return;
    }
    if (verb === 'tab') {
      this.cancelPlacement();
      this.selected = null;
      this.renderInspector();
      if (arg === 'build') {
        this.panel = null;
        this.tab = this.tab === 'build' ? '' : arg;
      } else {
        this.tab = arg;
        this.panel = arg as Panel;
      }
      this.renderDock();
      this.renderBuild();
      this.renderModal();
      return;
    }
    if (verb === 'category') {
      this.category = arg as Category;
      this.renderBuild();
      return;
    }
    if (verb === 'build') {
      const d = BUILDING[arg];
      if (d.research && !this.engine.state.research.includes(d.research)) {
        this.toast(`${t('requires')}: ${techName(d.research)}`);
        return;
      }
      this.begin(arg);
      return;
    }
    if (verb === 'place' && this.scene.pinned && this.scene.placing) {
      const p = this.scene.pinned,
        type = this.scene.placing;
      const result = this.scene.moving
        ? this.engine.move(this.scene.moving, p.x, p.y)
        : this.engine.build(type, p.x, p.y, this.rotation);
      if (this.result(result)) {
        this.chime();
        if (['road', 'wall'].includes(type)) {
          this.scene.pinned = null;
          this.scene.drawGhost(null);
        } else this.cancelPlacement();
      }
      return;
    }
    if (verb === 'cancel') {
      this.cancelPlacement();
      return;
    }
    if (verb === 'rotate') {
      this.rotation = (this.rotation + 1) % 4;
      const sprite = this.scene.ghost.children[1];
      if (sprite) sprite.scale.x = this.rotation % 2 ? -1 : 1;
      return;
    }
    if (verb === 'clear') {
      this.cancelPlacement();
      this.scene.clearing = true;
      this.el('placement').innerHTML =
        `<div class="placement-card">${icon('clear')}<strong>${t('clearing')}</strong>${button('cancel', t('cancel'), 'secondary')}</div>`;
      return;
    }
    if (verb === 'deselect') {
      this.selected = null;
      this.renderInspector();
      return;
    }
    if (verb === 'assign' || verb === 'unassign') {
      this.result(this.engine.assign(this.selected!, verb === 'assign' ? 1 : -1));
      return;
    }
    if (verb === 'upgrade') {
      this.result(this.engine.upgrade(this.selected!));
      return;
    }
    if (verb === 'move') {
      const b = this.engine.state.buildings.find((b) => b.id === this.selected)!;
      this.begin(b.type, b.id);
      return;
    }
    if (verb === 'remove') {
      const id = this.selected!;
      this.confirm(t('removeConfirm'), () => {
        this.result(this.engine.demolish(id));
        this.selected = null;
        this.renderInspector();
      });
      return;
    }
    if (verb === 'research') {
      this.result(this.engine.research(arg));
      return;
    }
    if (verb === 'explore') {
      this.result(this.engine.explore(arg));
      return;
    }
    if (verb === 'attack') {
      this.result(this.engine.attack(arg));
      return;
    }
    if (verb === 'train') {
      this.result(this.engine.train(arg as 'guard' | 'archer'));
      return;
    }
    if (verb === 'buy' || verb === 'sell') {
      this.result(this.engine.trade(arg as Resource, verb === 'buy'));
      return;
    }
    if (['settings', 'saves', 'credits', 'economy', 'quests'].includes(verb)) {
      this.panel = verb as Panel;
      this.renderModal();
      return;
    }
    if (verb === 'closePanel') {
      this.panel = null;
      this.renderModal();
      return;
    }
    if (verb === 'pause') {
      this.paused = !this.paused;
      this.renderHeader();
      return;
    }
    if (verb === 'speed') {
      this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
      this.renderHeader();
      return;
    }
    if (verb === 'zoomin') {
      this.scene.zoom(1.2);
      return;
    }
    if (verb === 'zoomout') {
      this.scene.zoom(1 / 1.2);
      return;
    }
    if (verb === 'center') {
      this.scene.center();
      return;
    }
    if (verb === 'save') {
      if (this.persist(arg === 'manual' ? MANUAL_KEY : SAVE_KEY, true)) this.renderModal();
      return;
    }
    if (verb === 'load') {
      this.confirm(t('load') + '?', () => this.restore(arg === 'manual' ? MANUAL_KEY : SAVE_KEY));
      return;
    }
    if (verb === 'export') {
      const url = URL.createObjectURL(
          new Blob([encode(this.engine.state)], { type: 'application/json' }),
        ),
        a = document.createElement('a');
      a.href = url;
      a.download = 'pocket-civilization.json';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (verb === 'import') {
      (document.querySelector('#import-file') as HTMLInputElement)?.click();
      return;
    }
    if (verb === 'sound') {
      this.engine.state.settings.sound = !this.engine.state.settings.sound;
      this.audioToggle();
      this.renderModal();
      return;
    }
    if (verb === 'menu') {
      if (this.persist()) {
        this.started = false;
        this.panel = null;
        this.render();
      }
      return;
    }
    if (verb === 'quest') {
      if (arg === 'firstHut') {
        this.tab = 'build';
        this.category = 'housing';
        this.begin('hut');
      } else if (arg === 'firstLumber') {
        this.tab = 'build';
        this.category = 'production';
        this.begin('lumber');
      } else {
        this.panel = 'quests';
        this.renderModal();
      }
      return;
    }
    if (verb === 'confirmOK') {
      const fn = this.confirmAction;
      this.confirmAction = null;
      this.el('dialog-root').innerHTML = '';
      fn?.();
      return;
    }
    if (verb === 'confirmCancel') {
      this.confirmAction = null;
      this.el('dialog-root').innerHTML = '';
      return;
    }
  }
  renderModal() {
    const el = this.el('overlay');
    const focused = document.activeElement as HTMLElement | null;
    const focusedAction = el.contains(focused) ? focused?.dataset.action : undefined;
    const focusedId = el.contains(focused) ? focused?.id : undefined;
    if (!this.panel) {
      el.innerHTML = '';
      return;
    }
    const old = el.querySelector('.modal-content')?.scrollTop ?? 0;
    const p = this.panel,
      s = this.engine.state;
    let body = '',
      title = t(p),
      hint = '';
    if (p === 'researchTab') {
      title = t('researchTitle');
      hint = t('researchHint');
      body = `<div class="era-banner"><span>${icon('researchTab')}${t(AGES[s.age])}</span><div class="era-track"><span class="active">I</span><i></i><span class="${s.age > 0 ? 'active' : ''}">II</span><i></i><span>III</span></div><span>${t('bronzeAge')}</span></div><div class="research-grid">${RESEARCH.map(
        (r) => {
          const done = s.research.includes(r.id),
            active = s.researching?.id === r.id,
            locked = !r.requires.every((v) => s.research.includes(v));
          return `<article class="research-card ${done ? 'done' : ''}"><div class="research-symbol">${icon(done ? 'check' : r.id === 'farming' ? 'food' : r.id === 'masonry' ? 'stone' : r.id === 'defense' ? 'defense' : r.id === 'trade' ? 'gold' : r.id === 'bronze' ? 'bronze' : 'tools')}</div><div><h3>${techName(r.id)}</h3><p>${t(r.id + 'Desc')}</p>${r.requires.length ? `<small class="muted">${t('requires')}: ${r.requires.map(techName).join(', ')}</small>` : ''}${cost(r.cost)}<button data-action="research:${r.id}" class="${done ? 'quiet' : 'secondary'}" ${done || locked || s.researching ? 'disabled' : ''}>${done ? t('complete') : active ? `${t('inProgress')} · ${Math.ceil(s.researching!.remaining)}s` : locked ? t('locked') : t('unlock') + ` · ${r.time}s`}</button></div></article>`;
        },
      ).join('')}</div><p class="muted fine-print">${t('futureAges')}</p>`;
    }
    if (p === 'world') {
      title = t('worldTitle');
      hint = t('worldHint');
      body = `<div class="region-map"><svg viewBox="0 0 700 225" aria-hidden="true"><path d="M0 28Q90 5 145 33T290 25 410 36 525 20 700 22V225H0" fill="#aab68a"/><path d="M0 170Q115 110 180 161T365 120 530 165 700 132V225H0" fill="#98a77c"/><path d="M560-20Q500 50 560 103T535 240" fill="none" stroke="#7eaaa5" stroke-width="33"/><path d="M90 65 335 125 300 35M335 125 150 185M335 125 490 184" fill="none" stroke="#e3d6ae" stroke-width="3" stroke-dasharray="6 7"/><g fill="#54745a"><path d="m65 75 15-37 15 37zm30-10 20-45 20 45zm45 22 16-37 16 37zm225-30 16-37 16 37zm245 119 17-40 17 40zm-24 13 17-35 17 35z"/></g></svg><span class="home-marker">${icon('build')}${t('village')}</span>${s.regions.map((r, i) => `<span class="region-marker marker-${i} ${r.explored ? 'explored' : ''}">${icon(r.enemy ? 'army' : i === 1 ? 'stone' : i === 2 ? 'gold' : 'leaf')}<b>${t(r.id)}</b></span>`).join('')}</div><div class="region-grid">${s.regions.map((r) => `<article class="region-card"><div class="region-title">${icon(r.enemy ? 'army' : r.id === 'traders' ? 'gold' : 'world')}<h3>${t(r.id)}</h3><span class="tag">${r.explored ? t('explored') : '?'}</span></div>${r.enemy ? `<div class="enemy-hp">${icon('defense')} ${Math.ceil(r.enemy)} / ${r.maxEnemy}<progress max="${r.maxEnemy}" value="${r.enemy}"></progress></div>` : `<small class="muted">${t('regionReward')}</small>`}${cost(r.reward)}${!r.explored ? `<button class="secondary" data-action="explore:${r.id}" ${r.progress ? 'disabled' : ''}>${r.progress ? `${t('inProgress')} · ${Math.ceil(r.progress)}s` : `${t('explore')} ${cost({ food: 25 })} · 20s`}</button>` : r.enemy ? button('attack:' + r.id, t('attack'), 'primary', 'army') : `<span class="completed">${icon('check')}${t(r.maxEnemy ? 'defeated' : 'complete')}</span>`}</article>`).join('')}</div>`;
    }
    if (p === 'army') {
      title = t('armyTitle');
      hint = t('armyHint');
      body = `<div class="army-summary">${icon('defense')}<div><strong>${s.soldiers.length} / 12 ${t('units')}</strong><p>${s.raid ? t('raidWarning') : t('safe')}</p></div>${s.research.includes('defense') ? `<span>${t('raidIn', { n: Math.ceil(s.raidTimer) })}</span>` : ''}</div><div class="unit-grid">${(['guard', 'archer'] as const).map((type) => `<article class="unit-card"><div class="unit-emblem">${icon(type === 'guard' ? 'army' : 'defense')}</div><h3>${t(type)}</h3><p>${t('health')}: ${type === 'guard' ? 100 : 65}</p>${cost(type === 'guard' ? { food: 25, wood: 15 } : { food: 20, wood: 25, leather: 3 })}${button('train:' + type, t('train'), 'primary', 'plus')}</article>`).join('')}</div>${!this.engine.has('barracks') ? `<p class="notice">${t('needsBarracks')}</p>` : ''}<div class="unit-roster">${s.soldiers.map((u) => `<span>${icon('army')}${t(u.type)}<progress max="${u.type === 'guard' ? 100 : 65}" value="${u.hp}"></progress></span>`).join('')}</div>${button('tab:world', t('world'), 'secondary', 'world')}`;
    }
    if (p === 'quests') {
      title = t('firstSteps');
      hint = t('questHint');
      body = `<div class="missions">${MISSION_IDS.map((id, i) => `<article class="mission ${s.missions.includes(id) ? 'done' : ''}"><span class="mission-number">${s.missions.includes(id) ? icon('check') : String(i + 1).padStart(2, '0')}</span><div><h3>${t(id)}</h3><small>${s.missions.includes(id) ? t('complete') : t('reward')}</small>${cost(MISSION_REWARDS[i])}</div></article>`).join('')}</div>`;
    }
    if (p === 'economy') {
      title = t('economy');
      hint = t('economyHint');
      body = `<div class="economy-summary"><span>${icon('population')} ${s.workers.length} / ${this.engine.housing}</span><span>${icon('happiness')} ${s.happiness}%</span><span>${icon('community')} ${t('capacity')}: ${this.engine.capacity}</span></div><div class="resource-table">${RESOURCES.map((r) => `<div>${icon(r)}<strong>${t(r)}</strong><b>${Math.floor(s.resources[r])}</b><progress title="${Math.floor(s.resources[r])} / ${this.engine.capacityFor(r)}" value="${s.resources[r]}" max="${this.engine.capacityFor(r)}"></progress>${['food', 'wood', 'stone', 'leather', 'tools'].includes(r) ? `<button class="quiet trade-button" data-action="sell:${r}" title="30 → 8 ${t('gold')}">${t('sell')} 30 → 8 ${icon('gold')}</button><button class="quiet trade-button" data-action="buy:${r}" title="10 ${t('gold')} → 25">${t('buy')} 10 → 25</button>` : '<span></span><span></span>'}</div>`).join('')}</div><h3>${t('workers')}</h3><div class="worker-list">${s.workers.map((w) => `<span>${icon('population')} #${w.id} · ${t(w.task)} <small>${w.assigned ? t(s.buildings.find((b) => b.id === w.assigned)?.type ?? 'idle') : t(w.resource)}</small></span>`).join('')}</div>`;
    }
    if (p === 'settings') {
      body = `<div class="setting"><label for="language">${t('language')}</label><select id="language">${(['de', 'en', 'es', 'fr'] as Language[]).map((l, i) => `<option value="${l}" ${l === getLanguage() ? 'selected' : ''}>${['Deutsch', 'English', 'Español', 'Français'][i]}</option>`).join('')}</select></div><div class="setting"><span>${t('sound')}</span>${button('sound', t(s.settings.sound ? 'on' : 'off'), s.settings.sound ? 'primary' : 'secondary')}</div><div class="setting"><label for="quality">${t('quality')}</label><select id="quality"><option value="high" ${s.settings.quality === 'high' ? 'selected' : ''}>${t('high')}</option><option value="low" ${s.settings.quality === 'low' ? 'selected' : ''}>${t('low')}</option></select></div><p class="muted">${t('controls')}</p><div class="settings-links">${button('saves', t('saves'), 'secondary', 'save')}${button('credits', t('credits'), 'quiet')}${this.started ? button('menu', t('mainMenu'), 'quiet') : ''}</div>`;
    }
    if (p === 'saves') {
      body = `<div class="save-slots">${['auto', 'manual']
        .map((slot) => {
          let r;
          try {
            r = load(localStorage, slot === 'auto' ? SAVE_KEY : MANUAL_KEY);
          } catch {
            r = { state: null };
          }
          return `<article class="save-slot">${icon('save')}<div><h3>${t(slot === 'auto' ? 'autosave' : 'manualSlot')}</h3><p>${r.state ? `${t(AGES[r.state.age])} · ${t('day', { n: 1 + Math.floor(r.state.time / 180) })} · ${r.state.workers.length} ${t('population')}` : t('emptySlot')}</p></div>${this.started ? button('save:' + slot, t('save'), 'secondary') : ''}${r.state ? button('load:' + slot, t('load'), 'primary') : ''}</article>`;
        })
        .join(
          '',
        )}</div><div class="split">${button('export', t('export'), 'secondary')}${button('import', t('import'), 'secondary')}<input type="file" id="import-file" accept="application/json,.json" hidden/></div>`;
    }
    if (p === 'credits') {
      body = `<div class="credits-art"><img src="/icon.svg" alt=""/><h2>Pocket Civilization</h2><span>0.1.0</span><p>${t('creditText')}</p></div>`;
    }
    el.innerHTML = `<div class="modal-backdrop"><section class="modal modal-${p}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><div><span class="eyebrow">POCKET CIVILIZATION</span><h2 id="modal-title">${title}</h2>${hint ? `<p>${hint}</p>` : ''}</div><button data-action="closePanel" class="icon-button" aria-label="${t('close')}">${icon('close')}</button></header><div class="modal-content">${body}</div></section></div>`;
    el.querySelector('.modal-content')!.scrollTop = old;
    if (focusedAction)
      el.querySelector<HTMLElement>(`[data-action="${CSS.escape(focusedAction)}"]`)?.focus({
        preventScroll: true,
      });
    else if (focusedId)
      el.querySelector<HTMLElement>(`#${CSS.escape(focusedId)}`)?.focus({ preventScroll: true });
  }
  async import(file: File) {
    if (file.size > 5_000_000) {
      this.toast(t('corrupt'));
      return;
    }
    try {
      const state = decode(await file.text());
      this.confirm(t('load') + '?', () => {
        if (this.started && !this.persist(MANUAL_KEY)) return;
        this.engine.state = state;
        this.engine.changed++;
        setLanguage(state.settings.language);
        this.started = true;
        this.panel = null;
        this.selected = null;
        this.render();
        this.persist();
      });
    } catch {
      this.toast(t('corrupt'));
    }
  }
  audioToggle() {
    if (!this.audio) this.audio = new AudioContext();
    void this.audio.resume();
    if (!this.ambient) {
      const gain = this.audio.createGain();
      gain.gain.value = 0;
      gain.connect(this.audio.destination);
      this.ambient = gain;
      for (const hz of [130.81, 196, 261.63]) {
        const oscillator = this.audio.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = hz;
        oscillator.connect(gain);
        oscillator.start();
      }
    }
    this.ambient.gain.setTargetAtTime(
      this.engine.state.settings.sound ? 0.012 : 0,
      this.audio.currentTime,
      0.5,
    );
  }
  chime() {
    if (!this.engine.state.settings.sound) return;
    if (!this.audio) this.audioToggle();
    const a = this.audio!,
      gain = a.createGain(),
      o = a.createOscillator();
    o.frequency.value = 523.25;
    gain.gain.setValueAtTime(0.035, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.4);
    o.connect(gain);
    gain.connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.4);
  }
}
