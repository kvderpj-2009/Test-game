import './style.css';
import { Engine } from './game/engine';
import { catchUp, load } from './game/save';
import { Scene } from './render/scene';
import { GameUI } from './ui/app';
import { t } from './ui/i18n';
async function main() {
  let saved: ReturnType<typeof load> = { state: null, recovered: false, error: false };
  try {
    saved = load();
  } catch {
    /* Browser storage can be disabled. The game still runs. */
  }
  const engine = new Engine(saved.state ?? undefined),
    scene = new Scene(engine);
  await scene.init(document.querySelector('#world')!);
  const ui = new GameUI(engine, scene, !!saved.state);
  ui.init();
  Object.assign(window, {
    pocketNativeMessage: (key: string) => ui.toast(t(key)),
    pocketNativeImport: (text: string) =>
      ui.import(new File([text], 'pocket-civilization.json', { type: 'application/json' })),
    pocketNativePause: () => {
      if (ui.started) ui.persist();
    },
    pocketNativeResume: () => {
      if (ui.started) {
        const elapsed = catchUp(engine);
        if (elapsed) ui.toast(t('offlineReport', { n: Math.floor(elapsed / 60) }));
      }
    },
    pocketNativeBack: () => {
      if (ui.panel) ui.action('closePanel');
      else if (scene.commanding || scene.placing || scene.clearing) ui.action('cancel');
      else if (ui.started) ui.action('menu');
    },
  });
  scene.app.canvas.setAttribute('aria-label', t('worldCanvas'));
  if (import.meta.env.PROD && !window.PocketAndroid && 'serviceWorker' in navigator)
    void navigator.serviceWorker
      .register('./sw.js')
      .catch((error) => console.warn('Offline cache:', error));
  if (saved.error) ui.toast(t('corrupt'));
  if (saved.recovered) ui.toast(t('recovered'));
  // Explicit opt-in for automated QA; no test controls in normal play.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa'))
    Object.assign(window, { pocket: { engine, scene, ui } });
}
void main().catch((error) => {
  console.error(error);
  document.querySelector('#ui')!.innerHTML =
    `<div class="startup-error">Pocket Civilization<br>${t('startupError')}</div>`;
});
