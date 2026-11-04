import type { Engine } from '../game/engine';
import { AGES } from '../game/data';
import { UNITS, CITY_COST, LAUNCH_COST } from '../game/campaign-data';
import type { Cost, Resource } from '../game/types';
import { RESOURCES } from '../game/types';
import { icon } from './icons';
import { t } from './i18n';
export const costs = (v: Cost) =>
  `<span class="cost">${Object.entries(v)
    .map(
      ([r, n]) => `<span title="${t(r)}">${icon(r)}${Math.ceil(n)} <small>${t(r)}</small></span>`,
    )
    .join('')}</span>`;
const btn = (action: string, label: string, cls = 'secondary') =>
  `<button class="${cls}" data-action="${action}">${label}</button>`;
export function regionName(engine: Engine, id: string): string {
  if (id === 'capital') return t('capital');
  const r = engine.state.regions.find((r) => r.id === id);
  return r?.kind ? t('regionName', { kind: t(r.kind), n: id.split('-')[1] }) : t(id);
}
export function cityName(engine: Engine, id: string) {
  return id === 'capital' ? t('capital') : t('cityName', { name: regionName(engine, id) });
}
export function worldView(e: Engine) {
  const s = e.state,
    cities = e.empire.cities();
  return `<div class="city-grid">${cities.map((c) => `<article class="region-card"><h3>${cityName(e, c.id)}</h3><p>${icon('population')} ${c.data.workers.length} · ${t('food')} ${Math.floor(c.data.resources.food)} · ${t('wood')} ${Math.floor(c.data.resources.wood)}</p>${c.id === s.activeCity ? `<span class="tag">${t('complete')}</span>` : btn('visit:' + c.id, t('visit'))}</article>`).join('')}</div>
 <h3>${t('routes')}</h3><p class="muted">${t('routeHint')}</p>${cities.length > 1 ? `<div class="route-form"><label>${t('fromCity')}<select id="route-from">${cities.map((c) => `<option value="${c.id}">${cityName(e, c.id)}</option>`).join('')}</select></label><label>${t('toCity')}<select id="route-to">${cities.map((c, i) => `<option value="${c.id}" ${i === 1 ? 'selected' : ''}>${cityName(e, c.id)}</option>`).join('')}</select></label><label>${t('resources')}<select id="route-resource">${RESOURCES.map((r) => `<option value="${r}">${t(r)}</option>`).join('')}</select></label><label>${t('amount')}<input id="route-amount" type="number" min="1" max="200" value="25"/></label><label>${t('repeatRoute')}<select id="route-repeat"><option value="yes">${t('repeatRoute')}</option><option value="no">${t('onceRoute')}</option></select></label>${btn('createRoute', t('createRoute'), 'primary')}</div>` : ''}
 <div class="route-list">${s.routes.map((r) => `<article class="route-card"><strong>${cityName(e, r.from)} → ${cityName(e, r.to)}</strong><p>${r.amount} ${t(r.resource)} · ${r.cargo ? `${r.cargo} ${t(r.remaining ? 'inTransit' : 'waitingSpace')} · ${Math.ceil(r.remaining)}s` : t(r.paused ? 'paused' : 'waitingGoods')}</p><div class="split">${btn('pauseRoute:' + r.id, t(r.paused ? 'play' : 'pause'))}${btn('cancelRoute:' + r.id, t('cancelRoute'), 'quiet')}</div></article>`).join('')}</div>
 <h3>${t('worldTitle')}</h3><div class="region-grid">${s.regions.map((r) => `<article class="region-card"><div class="region-title">${icon(r.enemy ? 'army' : 'world')}<h3>${regionName(e, r.id)}</h3><span class="tag">${r.explored ? t('explored') : '?'}</span></div>${r.enemy ? `<p>${t('health')}: ${Math.ceil(r.enemy)} / ${r.maxEnemy}</p><progress value="${r.enemy}" max="${r.maxEnemy}"></progress>` : ''}${costs(r.reward)}${!r.explored ? `<button class="secondary" data-action="explore:${r.id}" ${r.progress ? 'disabled' : ''}>${r.progress ? `${t('inProgress')} · ${Math.ceil(r.progress)}s` : t('explore') + ' · 25 ' + t('food')}</button>` : r.enemy ? btn('attack:' + r.id, t('attack'), 'primary') : cities.some((c) => c.id === r.id) ? `<span class="completed">${t('colonies')}</span>` : `${s.age >= 1 && cities.length < 4 ? btn('foundCity:' + r.id, t('foundCity') + costs(CITY_COST)) : `<span class="completed">${t('complete')}</span>`}`}</article>`).join('')}</div>`;
}
export function armyView(e: Engine, selected: Set<number>, formation: string) {
  const s = e.state;
  return `<div class="army-summary">${icon('army')}<div><strong>${s.soldiers.length} / 24 ${t('units')}</strong><p>${s.raid ? t('raidWarning') : t('safe')}</p></div><span>${s.settings.difficulty === 'peaceful' ? t('peacefulMode') : t('raidIn', { n: Math.ceil(s.raidTimer) })}</span></div><div class="army-controls">${btn('selectAll', t('selectAll'))}${btn('clearSelection', t('clearSelection'), 'quiet')}<strong>${t('selectedUnits', { n: s.soldiers.filter((u) => selected.has(u.id)).length })}</strong><label>${t('formation')}<select id="formation">${['line', 'wedge', 'spread'].map((f) => `<option value="${f}" ${f === formation ? 'selected' : ''}>${t(f)}</option>`).join('')}</select></label></div><div class="unit-roster selectable">${s.soldiers.map((u) => `<button class="${selected.has(u.id) ? 'selected' : ''}" data-action="selectUnit:${u.id}" aria-pressed="${selected.has(u.id)}">${icon(UNITS[u.type].siege ? 'tools' : 'army')}<span>${t(u.type)} #${u.id}<small>${t(u.order === 'attack' ? 'orderAttack' : u.order === 'move' ? 'orderMove' : (u.order ?? 'defend'))}</small></span><progress max="${UNITS[u.type].hp}" value="${u.hp}"></progress></button>`).join('')}</div><div class="army-controls">${btn('moveTroops', t('moveTroops'), 'primary')}${['hold', 'defend', 'retreat'].map((o) => btn('order:' + o, t(o))).join('')}${btn('tab:world', t('attack'))}</div><div class="unit-grid">${Object.values(
    UNITS,
  )
    .filter((u) => u.age <= s.age)
    .reverse()
    .map(
      (u) =>
        `<article class="unit-card"><h3>${t(u.id)}</h3><p>${t('health')}: ${u.hp} · ${t('attack')}: ${u.damage}</p>${costs(u.cost)}${btn('train:' + u.id, t('train'), 'primary')}</article>`,
    )
    .join('')}</div>${!e.has('barracks') ? `<p class="notice">${t('needsBarracks')}</p>` : ''}`;
}
export function campaignView(e: Engine) {
  const s = e.state;
  return `<section class="campaign-goal"><h3>${t(s.campaign.launched ? 'campaignWon' : 'campaignGoal')}</h3><p>${t(s.campaign.launched ? 'continueEmpire' : 'campaignNeeds')}</p><div class="campaign-eras">${AGES.map((a, i) => `<span class="${s.age >= i ? 'done' : ''}">${s.age >= i ? '✓ ' : ''}${t(a)}</span>`).join('')}</div><p>${t('colonies')}: ${e.empire.cities().length} / 2 · ${t('explored')}: ${s.stats.explored} / 6</p>${s.campaign.launched ? '' : s.campaign.launchRemaining ? `<strong>${t('launching', { n: Math.ceil(s.campaign.launchRemaining) })}</strong>` : `${costs(LAUNCH_COST)}${btn('launch', t('launch'), 'primary')}`}</section>`;
}
export function servicesView(e: Engine) {
  return `<div class="needs-grid">${Object.entries(e.state.services)
    .map(
      ([k, v]) =>
        `<div><strong>${t(k === 'health' ? 'healthNeed' : k)}</strong><b>${Math.floor(v)}%</b><progress value="${v}" max="100"></progress></div>`,
    )
    .join('')}</div><p class="muted">${t('needsHint')}</p>`;
}
