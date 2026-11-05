import { BUILDING, BUILDINGS, AGES, MISSION_IDS, MISSION_REWARDS, RESEARCH } from '../game/data';
import { worldView, armyView, campaignView, servicesView, cityName } from './campaign-views';
import type { Formation } from '../game/combat';
import { catchUp } from '../game/save';
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
import { version } from '../../package.json';
type Panel =
  | 'build'
  | 'journey'
  | 'researchTab'
  | 'world'
  | 'army'
  | 'quests'
  | 'settings'
  | 'saves'
  | 'economy'
  | 'credits'
  | null;
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
  buildSearch = '';
  showFuture = false;
  category: Category = 'housing';
  panel: Panel = null;
  selected: number | null = null;
  selectedUnits = new Set<number>();
  formation: Formation = 'line';
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
    this.root.classList.add('compact-ui');
    this.root.innerHTML = `<header id="topbar"></header><aside id="journey"></aside><div id="world-caption"></div><div id="build-panel"></div><aside id="inspector"></aside><div id="placement"></div><aside id="map-panel"></aside><nav id="dock"></nav><div id="welcome"></div><div id="overlay"></div><div id="toast" role="status" aria-live="polite"></div><div id="dialog-root"></div>`;
    this.root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (el && !el.hasAttribute('disabled')) this.action(el.dataset.action!);
    });
    this.root.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.id === 'build-search') {
        this.buildSearch = el.value;
        this.renderBuild();
      }
    });
    this.root.addEventListener('change', (e) => {
      const el = e.target as HTMLSelectElement;
      if (el.id === 'build-category') {
        this.category = el.value as Category;
        this.buildSearch = '';
        this.renderBuild();
      }
      if (el.id === 'build-future') {
        this.showFuture = (el as unknown as HTMLInputElement).checked;
        this.renderBuild();
      }
      if (el.id === 'language') {
        this.engine.state.settings.language = el.value as Language;
        setLanguage(el.value as Language);
        this.render();
      }
      if (el.id === 'quality') {
        this.engine.state.settings.quality = el.value as 'high' | 'low';
        this.scene.app.ticker.maxFPS = el.value === 'low' ? 30 : 60;
      }
      if (el.id === 'difficulty')
        this.engine.state.settings.difficulty = el.value as 'peaceful' | 'normal' | 'hard';
      if (el.id === 'formation') this.formation = el.value as Formation;
      if (el.id === 'import-file') {
        const file = (el as unknown as HTMLInputElement).files?.[0];
        if (file) void this.import(file);
      }
    });
    window.addEventListener('keydown', (e) => {
      const dialog = document.querySelector<HTMLElement>('.confirm-dialog');
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
      if (e.key !== 'Escape' && (e.target as HTMLElement).matches('input,select,textarea')) return;
      if (e.key === 'Escape') {
        if (this.confirmAction) {
          this.confirmAction = null;
          this.el('dialog-root').innerHTML = '';
        } else if (this.panel) {
          this.showPanel(null);
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
      this.panel = null;
      this.renderModal();
      this.selected = id;
      this.scene.selected = id;
      this.scene.drawSelected();
      this.renderInspector();
    };
    this.scene.onPlot = (p) => this.plot(p);
    this.scene.onSoldier = (id, multi) => {
      if (!this.started) return;
      if (!multi) this.selectedUnits.clear();
      this.selectedUnits.add(id);
      this.scene.selectedUnits = this.selectedUnits;
      this.showPanel('army');
    };
    this.scene.onFrame = (dt) => this.frame(dt);
    this.scene.onCamera = () => {
      const map = document.querySelector<HTMLCanvasElement>('#minimap');
      if (map) this.scene.minimap(map);
    };
    this.engine.onEvent = (key, params) => {
      this.toast((params?.city ? cityName(this.engine, String(params.city)) + ': ' : '') + t(key));
      this.chime();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.started) this.persist();
      else if (this.started) {
        const elapsed = catchUp(this.engine);
        if (elapsed) this.toast(t('offlineReport', { n: Math.floor(elapsed / 60) }));
        this.persist();
      }
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
      if (this.panel && ['world', 'researchTab', 'army', 'economy', 'quests'].includes(this.panel))
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
      `<div class="brand"><img src="/icon.svg" alt=""/><span>POCKET<span>CIVILIZATION</span></span></div><button class="settlement" data-action="economy"><span class="eyebrow">${t(AGES[this.engine.state.age])} <b>${this.engine.state.age + 1} / 11</b></span><strong>${cityName(this.engine, this.engine.state.activeCity)}</strong></button><div class="resources">${(['food', 'wood', 'stone', 'knowledge'] as Resource[]).map((r) => `<button class="resource ${r}" data-action="economy" aria-label="${t(r)}" title="${t(r)}">${icon(r)}<span><strong data-stock="${r}"></strong><small>${t(r)}</small></span></button>`).join('')}</div><button class="population resource" data-action="economy" aria-label="${t('population')}">${icon('population')}<span><strong id="population-count"></strong><small>${t('population')}</small></span></button><div class="time-controls"><span id="day-count"></span>${button('pause', '', `icon-button ${this.paused ? 'active' : ''}`, this.paused ? 'play' : 'pause')}${button('speed', `${this.speed}×`, 'speed-button')}${button('settings', '', 'icon-button', 'settings')}</div>`;
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
    this.el('journey').hidden = !this.started || this.panel !== 'journey';
    const s = this.engine.state;
    const first = MISSION_IDS.findIndex((id) => !s.missions.includes(id));
    const start = first < 0 ? MISSION_IDS.length - 3 : Math.max(0, first - 1);
    const shown = MISSION_IDS.slice(start, start + 3);
    this.el('journey').innerHTML =
      `<button class="icon-button window-close" data-action="closePanel" aria-label="${t('close')}">${icon('close')}</button><div class="eyebrow">${icon('flag')}${t('journey')}<span>${s.missions.length} / ${MISSION_IDS.length}</span></div><h2>${t(s.age > 0 ? 'campaign' : 'firstSteps')}</h2><p class="muted journey-intro">${t('questHint')}</p><div class="quest-list">${shown.map((id) => `<button data-action="quest:${id}" class="quest ${s.missions.includes(id) ? 'done' : ''}"><span class="quest-check">${s.missions.includes(id) ? icon('check') : ''}</span><span>${t(id)}</span>${icon('chevron')}</button>`).join('')}</div><button data-action="quests" class="text-button">${t('allQuests')}${icon('arrow')}</button><div class="settler-advice"><span class="eyebrow">${t('tutorial')}</span><p>${t(!this.engine.has('hut') ? 'tutorial1' : !this.engine.has('lumber') ? 'tutorial2' : !s.research.includes('farming') ? 'tutorial3' : 'tutorial4')}</p></div>`;
  }
  renderDock() {
    this.el('dock').hidden = !this.started;
    this.el('dock').setAttribute('aria-label', t('gameMenus'));
    this.el('dock').innerHTML =
      `<div class="dock-tabs">${(['build', 'researchTab', 'world', 'army', 'quests', 'journey'] as const).map((tab) => `<button data-action="tab:${tab}" class="${this.panel === tab ? 'active' : ''}" aria-label="${t(tab)}" aria-expanded="${this.panel === tab}" aria-controls="${tab === 'build' ? 'build-panel' : tab === 'journey' ? 'journey' : 'overlay'}">${icon(tab === 'journey' ? 'flag' : tab)}<span class="dock-label">${t(tab)}</span></button>`).join('')}</div>`;
  }
  /** One window at a time; the world remains interactive beside it. */
  showPanel(panel: Panel) {
    this.panel = panel;
    this.selected = null;
    this.cancelPlacement();
    this.renderInspector();
    this.renderJourney();
    this.renderBuild();
    this.renderModal();
  }
  renderBuild() {
    const el = this.el('build-panel');
    el.hidden =
      !this.started ||
      this.panel !== 'build' ||
      !!this.scene.placing ||
      this.scene.clearing ||
      !!this.selected;
    if (el.hidden) return;
    const input = el.querySelector<HTMLInputElement>('#build-search');
    const focused = document.activeElement === input;
    const cursor = input?.selectionStart ?? this.buildSearch.length;
    const scroll = el.querySelector('.building-cards')?.scrollTop ?? 0;
    const query = this.buildSearch.trim().toLocaleLowerCase(getLanguage());
    const buildings = BUILDINGS.filter(
      (b) =>
        b.id !== 'hall' &&
        (query
          ? t(b.id).toLocaleLowerCase(getLanguage()).includes(query)
          : b.category === this.category) &&
        (this.showFuture || (b.age ?? 0) <= this.engine.state.age),
    );
    el.innerHTML = `<div class="build-heading"><h2>${t('build')}</h2><div><button data-action="clear" class="icon-button" title="${t('clear')}" aria-label="${t('clear')}">${icon('clear')}</button><button data-action="closePanel" class="icon-button" aria-label="${t('close')}">${icon('close')}</button></div></div><input id="build-search" type="search" placeholder="${t('searchBuildings')}" aria-label="${t('searchBuildings')}"/><div class="catalog-filters"><select id="build-category" aria-label="${t('buildingCategory')}">${(['housing', 'production', 'community', 'defense', 'paths'] as Category[]).map((cat) => `<option value="${cat}" ${this.category === cat ? 'selected' : ''}>${t(cat)}</option>`).join('')}</select><label><input id="build-future" type="checkbox" ${this.showFuture ? 'checked' : ''}/>${t('laterAges')}</label></div><div class="building-cards">${
      buildings
        .map((b) => {
          const locked =
            (b.age ?? 0) > this.engine.state.age ||
            (b.research && !this.engine.state.research.includes(b.research));
          return `<button class="building-card ${locked ? 'locked' : ''}" data-action="build:${b.id}" title="${locked ? t('requires') + ': ' + ((b.age ?? 0) > this.engine.state.age ? t(AGES[b.age!]) : techName(b.research!)) : description(b.id, b.category, b.storage)}"><span class="card-art"><img src="${thumbnail(b.id, this.engine.state.age)}" alt="" loading="lazy"/>${locked ? icon('lock') : ''}</span><span class="card-details"><strong>${t(b.id)}</strong>${cost(b.cost)}<span class="card-time">${icon('clock')}${b.time}s</span></span></button>`;
        })
        .join('') || `<p class="muted">${t('noBuildings')}</p>`
    }</div>`;
    const search = el.querySelector<HTMLInputElement>('#build-search')!;
    search.value = this.buildSearch;
    el.querySelector('.building-cards')!.scrollTop = scroll;
    if (focused) {
      search.focus({ preventScroll: true });
      search.setSelectionRange(cursor, cursor);
    }
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
    el.innerHTML = `<div class="welcome-card"><span class="eyebrow"><span class="small-rule"></span>${t('chapter')}</span><h1>${t('yourStory')}</h1><p>${t('welcomeText')}</p><div class="welcome-buttons">${this.hasSave ? button('continue', t('continue'), 'primary', 'play') : ''}${button('new', t('newGame'), this.hasSave ? 'secondary' : 'primary', 'arrow')}</div><label class="world-seed">${t('worldSeed')}<input id="world-seed" type="number" min="1" max="2147483647" value="73"/></label><div class="welcome-links">${button('saves', t('saves'))}${button('settings', t('settings'))}${button('credits', t('credits'))}</div><span class="welcome-foot">${icon('leaf')}${t('subtitle')}</span></div><div class="world-label"><span>48 × 48</span>${t('village')}<small>${t('stoneAge')}</small></div>`;
  }
  renderInspector() {
    const el = this.el('inspector');
    const b = this.engine.state.buildings.find((b) => b.id === this.selected);
    el.hidden = !this.started || !b || !!this.scene.placing || !!this.panel;
    if (!b) {
      this.scene.selected = null;
      this.scene.drawSelected();
      this.renderBuild();
      return;
    }
    const d = BUILDING[b.type],
      count = this.engine.state.workers.filter((w) => w.assigned === b.id).length;
    el.innerHTML = `<div class="inspector-top"><span class="eyebrow">${t(d.category)} · ${t('level', { n: b.level })}</span>${button('deselect', '', 'icon-button', 'close')}</div><div class="inspect-art"><img src="${thumbnail(b.type, this.engine.state.age, b.level)}" alt=""/></div><h2>${t(b.type)}</h2><p class="muted">${description(b.type, d.category, d.storage)}</p>${b.remaining ? `<div class="construction"><span>${t('construction')}</span><b>${Math.ceil(b.remaining)}s</b><progress value="${Math.max(0, (b.level > 1 ? 12 : d.time) - b.remaining)}" max="${b.level > 1 ? 12 : d.time}"></progress></div>` : ''}<div class="building-stats">${d.housing ? `<div>${t('homes')}<b>${d.housing * b.level}</b></div>` : ''}${d.storage ? `<div>${t('capacity')}<b>+${d.storage * b.level}${d.stores ? ' · ' + d.stores.map((r) => t(r)).join(', ') : ''}</b></div>` : ''}<div>${t('health')}<b>${Math.ceil(b.hp)} / ${this.engine.maxHP(b)}</b></div></div>${d.output ? `<div class="production-line"><small>${t('output')}</small>${cost(Object.fromEntries(Object.entries(d.output).map(([r, n]) => [r, n * (1 + (b.level - 1) * 0.4)])))}</div>${d.input ? `<div class="production-line"><small>${t('input')}</small>${cost(d.input)}</div>` : ''}<div class="worker-control"><span>${t('workers')}<small>${t('freeWorkers', { n: this.engine.state.workers.filter((w) => w.assigned === null).length })}</small></span><div>${button('unassign', '', 'icon-button', 'minus')}<b>${count} / ${d.workers}</b>${button('assign', '', 'icon-button', 'plus')}</div></div>` : ''}${d.service ? `<p>${t('serviceSupply')}: ${t(d.service === 'health' ? 'healthNeed' : d.service)} +${d.serviceValue}</p>` : ''}<div class="inspector-actions">${b.hp < this.engine.maxHP(b) ? button('repair', t('repair'), 'secondary') : ''}${d.workers ? button('productionPause', t(b.paused ? 'productionResume' : 'productionPause'), 'secondary') : ''}${b.level < 3 && !['road', 'bridge', 'wall', 'gate', 'trap', 'fire', 'plaza'].includes(b.type) ? button('upgrade', `${t('upgrade')}${cost(b.type === 'hall' ? { wood: 80 * b.level, stone: 50 * b.level, knowledge: 30 } : this.engine.upgradeCost(b))}`, 'primary', 'plus') : ''}${b.type !== 'hall' ? `<div class="split">${button('move', t('move'), 'secondary', 'move')}${button('remove', t('remove'), 'quiet danger', 'trash')}</div>` : ''}${b.type === 'market' ? button('economy', t('trade'), 'secondary', 'gold') : ''}</div>`;
    for (const [a, k] of [
      ['assign', 'assign'],
      ['unassign', 'unassign'],
      ['deselect', 'close'],
    ])
      el.querySelector(`[data-action="${a}"]`)?.setAttribute('aria-label', t(k));
    this.renderBuild();
  }
  begin(type: string, moving: number | null = null) {
    this.panel = null;
    this.renderModal();
    this.selected = null;
    this.scene.selected = null;
    this.scene.drawSelected();
    this.scene.setPlacement(type, moving);
    this.scene.clearing = false;
    this.rotation = 0;
    this.renderInspector();
    this.renderBuild();
    this.el('placement').innerHTML =
      `<div class="placement-card"><img src="${thumbnail(type, this.engine.state.age)}" alt=""/><div><span class="eyebrow">${moving ? t('move') : t('build')}</span><strong>${t(type)}</strong><small>${t('hintBuild')}</small></div>${button('cancel', t('cancel'), 'secondary', 'close')}</div>`;
  }
  plot(p: Point) {
    if (!this.started) return;
    if (this.scene.commanding) {
      if (
        this.result(
          this.engine.command(
            [...this.selectedUnits],
            'move',
            { x: p.x + 0.5, y: p.y + 0.5 },
            this.formation,
          ),
        )
      ) {
        this.cancelPlacement();
      }
      return;
    }
    if (this.scene.clearing) {
      this.result(this.engine.clear(p.x, p.y));
      return;
    }
    const type = this.scene.placing;
    if (!type) return;
    const error = this.engine.placement(type, p.x, p.y, this.scene.moving ?? undefined);
    this.el('placement').innerHTML =
      `<div class="placement-card"><img src="${thumbnail(type, this.engine.state.age)}" alt=""/><div><span class="eyebrow">${this.scene.moving ? t('move') : t('build')}</span><strong>${t(type)}</strong><small class="${error ? 'error' : ''}">${error ? t(error) : `${p.x}, ${p.y}`}</small>${this.scene.moving ? '' : cost(BUILDING[type].cost)}</div><div class="placement-actions"><button class="primary" data-action="place" ${error ? 'disabled' : ''}>${icon('check')}${t(this.scene.moving ? 'confirm' : 'place')}</button>${button('rotate', '', 'icon-button', 'rotate')}${button('cancel', '', 'icon-button', 'close')}</div></div>`;
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
    this.scene.commanding = false;
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
        const elapsed = key === SAVE_KEY ? catchUp(this.engine) : 0;
        this.resetInteraction();
        setLanguage(r.state.settings.language);
        this.started = true;
        this.selected = null;
        this.panel = null;
        this.paused = false;
        this.scene.center();
        this.render();
        if (r.recovered) this.toast(t('recovered'));
        else if (elapsed) this.toast(t('offlineReport', { n: Math.floor(elapsed / 60) }));
        this.persist();
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
    const value = Number(
      (document.querySelector('#world-seed') as HTMLInputElement | null)?.value ?? 73,
    );
    const settings = { ...this.engine.state.settings };
    this.engine.state = newGame(
      getLanguage(),
      Number.isInteger(value) && value > 0 && value <= 2147483647 ? value : 73,
    );
    this.engine.state.settings = settings;
    this.resetInteraction();
    this.engine.changed++;
    this.started = true;
    this.paused = false;
    this.panel = null;
    this.selected = null;
    this.category = 'housing';
    this.buildSearch = '';
    this.showFuture = false;
    this.cancelPlacement();
    this.scene.center();
    this.render();
    this.persist();
  }
  action(action: string) {
    const [verb, arg] = action.split(':');
    if (this.campaignAction(verb, arg)) return;
    if (verb === 'new') {
      this.startNew();
      return;
    }
    if (verb === 'continue') {
      this.restore();
      return;
    }
    if (verb === 'tab') {
      this.showPanel(this.panel === arg ? null : (arg as Panel));
      return;
    }
    if (verb === 'findResearch') {
      const b = this.engine.state.buildings.find((b) => b.type === 'research');
      if (b) {
        this.showPanel(null);
        this.selected = b.id;
        this.scene.selected = b.id;
        this.scene.focus(b.x + BUILDING[b.type].size / 2, b.y + BUILDING[b.type].size / 2);
        this.scene.drawSelected();
        this.renderInspector();
      }
      return;
    }
    if (verb === 'category') {
      this.category = arg as Category;
      this.renderBuild();
      return;
    }
    if (verb === 'build') {
      const d = BUILDING[arg];
      if ((d.age ?? 0) > this.engine.state.age) {
        this.toast(t('requires') + ': ' + t(AGES[d.age!]));
        return;
      }
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
        if (['road', 'bridge', 'wall'].includes(type)) {
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
      this.showPanel(null);
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
      this.result(
        this.engine.attack(arg, this.selectedUnits.size ? [...this.selectedUnits] : undefined),
      );
      return;
    }
    if (verb === 'train') {
      this.result(this.engine.train(arg));
      return;
    }
    if (verb === 'buy' || verb === 'sell') {
      this.result(this.engine.trade(arg as Resource, verb === 'buy'));
      return;
    }
    if (['settings', 'saves', 'credits', 'economy', 'quests'].includes(verb)) {
      this.showPanel(this.panel === verb ? null : (verb as Panel));
      return;
    }
    if (verb === 'closePanel') {
      const panel = this.panel;
      this.showPanel(null);
      this.el('dock')
        .querySelector<HTMLElement>(`[data-action="tab:${panel}"]`)
        ?.focus({ preventScroll: true });
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
      if (window.PocketAndroid) {
        window.PocketAndroid.exportSave(encode(this.engine.state));
        return;
      }
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
      if (window.PocketAndroid) {
        window.PocketAndroid.importSave();
        return;
      }
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
        this.category = 'housing';
        this.begin('hut');
      } else if (arg === 'firstLumber') {
        this.category = 'production';
        this.begin('lumber');
      } else {
        this.showPanel('quests');
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
    this.el('journey').hidden = !this.started || this.panel !== 'journey';
    this.el('build-panel').hidden =
      !this.started || this.panel !== 'build' || !!this.scene.placing || this.scene.clearing;
    this.el('inspector').hidden =
      !this.started || !!this.panel || this.selected === null || !!this.scene.placing;
    this.el('dock')
      .querySelectorAll<HTMLElement>('[data-action]')
      .forEach((button) => {
        const active = button.dataset.action === 'tab:' + this.panel;
        button.classList.toggle('active', active);
        button.setAttribute('aria-expanded', String(active));
      });
    if (!this.panel || this.panel === 'build' || this.panel === 'journey') {
      el.innerHTML = '';
      return;
    }
    const samePanel = el.dataset.panel === this.panel;
    const old = samePanel ? (el.querySelector('.modal-content')?.scrollTop ?? 0) : 0;
    el.dataset.panel = this.panel;
    const values = [
      ...el.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[id],select[id]'),
    ].map((el) => [el.id, el.value]);
    const p = this.panel,
      s = this.engine.state;
    let body = '',
      title = t(p),
      hint = '';
    if (p === 'researchTab') {
      title = t('researchTitle');
      hint = t('researchHint');
      const hut = s.buildings.find((b) => b.type === 'research');
      body = `<div class="research-hut"><img src="${thumbnail('research', s.age)}" alt=""/><div><strong>${t('research')}</strong><p>${t(hut ? 'researchWorkers' : 'researchLocation')}</p>${button(hut ? 'findResearch' : 'build:research', t(hut ? 'showBuilding' : 'buildResearch'), 'secondary', hut ? 'center' : 'build')}</div></div><div class="era-banner"><span>${icon('researchTab')}${t(AGES[s.age])}</span><strong>${s.age + 1} / ${AGES.length}</strong><span>${t(AGES[10])}</span></div><div class="research-grid">${RESEARCH.map(
        (r) => {
          const done = s.research.includes(r.id),
            active = s.researching?.id === r.id,
            locked = !r.requires.every((v) => s.research.includes(v));
          return `<article class="research-card ${done ? 'done' : ''}"><div class="research-symbol">${icon(done ? 'check' : r.id === 'farming' ? 'food' : r.id === 'masonry' ? 'stone' : r.id === 'defense' ? 'defense' : r.id === 'trade' ? 'gold' : r.id === 'bronze' ? 'bronze' : 'tools')}</div><div><h3>${techName(r.id)}</h3><p>${r.age !== undefined && r.age > 1 ? t(AGES[r.age]) : t(r.id + 'Desc')}</p>${r.population ? `<small>${t('requires')}: ${r.population} ${t('population')} · ${t(r.building!)}</small>` : ''}${r.requires.length ? `<small class="muted">${t('requires')}: ${r.requires.map(techName).join(', ')}</small>` : ''}${cost(r.cost)}<button data-action="research:${r.id}" class="${done ? 'quiet' : 'secondary'}" ${done || locked || s.researching ? 'disabled' : ''}>${done ? t('complete') : active ? `${t('inProgress')} · ${Math.ceil(s.researching!.remaining)}s` : locked ? t('locked') : t('unlock') + ` · ${r.time}s`}</button></div></article>`;
        },
      ).join('')}</div><p class="muted fine-print">${t('futureAges')}</p>`;
    }
    if (p === 'world') {
      title = t('worldTitle');
      hint = t('worldHint');
      body = worldView(this.engine);
    }
    if (p === 'army') {
      title = t('armyTitle');
      hint = t('armyHint');
      body = armyView(this.engine, this.selectedUnits, this.formation);
    }
    if (p === 'quests') {
      title = t('campaign');
      hint = t('questHint');
      body =
        campaignView(this.engine) +
        `<div class="missions">${MISSION_IDS.map((id, i) => `<article class="mission ${s.missions.includes(id) ? 'done' : ''}"><span class="mission-number">${s.missions.includes(id) ? icon('check') : String(i + 1).padStart(2, '0')}</span><div><h3>${t(id)}</h3><small>${s.missions.includes(id) ? t('complete') : t('reward')}</small>${cost(MISSION_REWARDS[i])}</div></article>`).join('')}</div>`;
    }
    if (p === 'economy') {
      title = t('economy');
      hint = t('economyHint');
      body =
        servicesView(this.engine) +
        `<div class="economy-summary"><span>${icon('population')} ${s.workers.length} / ${this.engine.housing}</span><span>${icon('happiness')} ${s.happiness}%</span><span>${icon('community')} ${t('capacity')}: ${this.engine.capacity}</span></div><div class="resource-table">${RESOURCES.map((r) => `<div>${icon(r)}<strong>${t(r)}</strong><b>${Math.floor(s.resources[r])}</b><progress title="${Math.floor(s.resources[r])} / ${this.engine.capacityFor(r)}" value="${s.resources[r]}" max="${this.engine.capacityFor(r)}"></progress>${['food', 'wood', 'stone', 'leather', 'tools'].includes(r) ? `<button class="quiet trade-button" data-action="sell:${r}" title="30 → 8 ${t('gold')}">${t('sell')} 30 → 8 ${icon('gold')}</button><button class="quiet trade-button" data-action="buy:${r}" title="10 ${t('gold')} → 25">${t('buy')} 10 → 25</button>` : '<span></span><span></span>'}</div>`).join('')}</div><h3>${t('workers')}</h3><div class="worker-list">${s.workers.map((w) => `<span>${icon('population')} #${w.id} · ${t(w.task)} <small>${w.assigned ? t(s.buildings.find((b) => b.id === w.assigned)?.type ?? 'idle') : t(w.resource)}</small></span>`).join('')}</div>`;
    }
    if (p === 'settings') {
      body = `<div class="setting"><label for="language">${t('language')}</label><select id="language">${(['de', 'en', 'es', 'fr'] as Language[]).map((l, i) => `<option value="${l}" ${l === getLanguage() ? 'selected' : ''}>${['Deutsch', 'English', 'Español', 'Français'][i]}</option>`).join('')}</select></div><div class="setting"><span>${t('sound')}</span>${button('sound', t(s.settings.sound ? 'on' : 'off'), s.settings.sound ? 'primary' : 'secondary')}</div><div class="setting"><label for="quality">${t('quality')}</label><select id="quality"><option value="high" ${s.settings.quality === 'high' ? 'selected' : ''}>${t('high')}</option><option value="low" ${s.settings.quality === 'low' ? 'selected' : ''}>${t('low')}</option></select></div><p class="muted">${t('controls')}</p><div class="setting"><label for="difficulty">${t('difficulty')}</label><select id="difficulty">${['peaceful', 'normal', 'hard'].map((v) => `<option value="${v}" ${s.settings.difficulty === v ? 'selected' : ''}>${t(v === 'peaceful' ? 'peacefulMode' : v)}</option>`).join('')}</select></div><div class="setting"><span>${t('offlineProgress')}</span>${button('offline', t(s.settings.offline ? 'on' : 'off'), 'secondary')}</div><p class="muted">${t('offlineHint')}</p><div class="settings-links">${button('saves', t('saves'), 'secondary', 'save')}${button('credits', t('credits'), 'quiet')}${this.started ? button('menu', t('mainMenu'), 'quiet') : ''}</div>`;
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
      body = `<div class="credits-art"><img src="/icon.svg" alt=""/><h2>Pocket Civilization</h2><span>${version}</span><p>${t('creditText')}</p></div>`;
    }
    el.innerHTML = `<div class="modal-backdrop"><section class="modal modal-${p}" role="dialog" aria-modal="false" aria-labelledby="modal-title"><header class="modal-header"><div><span class="eyebrow">POCKET CIVILIZATION</span><h2 id="modal-title">${title}</h2>${hint ? `<p>${hint}</p>` : ''}</div><button data-action="closePanel" class="icon-button" aria-label="${t('close')}">${icon('close')}</button></header><div class="modal-content">${body}</div></section></div>`;
    el.querySelector('.modal-content')!.scrollTop = old;
    for (const [id, value] of values) {
      const input = el.querySelector<HTMLInputElement | HTMLSelectElement>('#' + CSS.escape(id));
      if (input) input.value = value;
    }
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
        this.resetInteraction();
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
  resetInteraction() {
    this.selectedUnits.clear();
    this.scene.selectedUnits = this.selectedUnits;
    this.scene.commanding = false;
    this.cancelPlacement();
    this.scene.selected = null;
    this.selected = null;
    this.tick = 0;
  }
  campaignAction(verb: string, arg: string) {
    const e = this.engine,
      s = e.state;
    if (verb === 'foundCity') {
      this.result(e.empire.found(arg));
      return true;
    }
    if (verb === 'visit') {
      if (this.result(e.empire.switch(arg))) {
        this.resetInteraction();
        this.scene.center();
        this.render();
      }
      return true;
    }
    if (verb === 'createRoute') {
      const value = (id: string) => (this.el(id) as HTMLInputElement).value;
      this.result(
        e.empire.route(
          value('route-from'),
          value('route-to'),
          value('route-resource') as Resource,
          Number(value('route-amount')),
          value('route-repeat') === 'yes',
        ),
      );
      return true;
    }
    if (verb === 'cancelRoute') {
      this.result(e.empire.cancelRoute(Number(arg)));
      return true;
    }
    if (verb === 'pauseRoute') {
      const r = s.routes.find((r) => r.id === Number(arg));
      if (r) r.paused = !r.paused;
      this.renderModal();
      return true;
    }
    if (verb === 'selectUnit') {
      const id = Number(arg);
      if (this.selectedUnits.has(id)) this.selectedUnits.delete(id);
      else this.selectedUnits.add(id);
      this.scene.selectedUnits = this.selectedUnits;
      this.renderModal();
      return true;
    }
    if (verb === 'selectAll' || verb === 'clearSelection') {
      this.selectedUnits = new Set(verb === 'selectAll' ? s.soldiers.map((u) => u.id) : []);
      this.scene.selectedUnits = this.selectedUnits;
      this.renderModal();
      return true;
    }
    if (verb === 'moveTroops') {
      if (!this.selectedUnits.size) this.toast(t('needsArmy'));
      else {
        this.cancelPlacement();
        this.panel = null;
        this.selected = null;
        this.scene.commanding = true;
        this.render();
        this.el('placement').innerHTML =
          `<div class="placement-card"><strong>${t('moveHint')}</strong>${button('cancel', t('cancel'), 'secondary')}</div>`;
      }
      return true;
    }
    if (verb === 'order') {
      this.result(e.command([...this.selectedUnits], arg as 'hold' | 'defend' | 'retreat'));
      return true;
    }
    if (verb === 'launch') {
      this.result(e.launch());
      return true;
    }
    if (verb === 'repair') {
      this.result(e.repair(this.selected!));
      return true;
    }
    if (verb === 'productionPause') {
      this.result(e.pauseBuilding(this.selected!));
      return true;
    }
    if (verb === 'offline') {
      s.settings.offline = !s.settings.offline;
      s.lastActive = Date.now();
      this.renderModal();
      return true;
    }
    return false;
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
