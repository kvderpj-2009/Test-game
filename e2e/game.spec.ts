import { test, expect } from '@playwright/test';
test('desktop: start, place, assign, upgrade, save/reload, research, explore and switch languages', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?qa');
  await expect(page.getByRole('button', { name: 'Neue Siedlung', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/pocket-menu.png' });
  await page.getByRole('button', { name: 'Neue Siedlung', exact: true }).click();
  await expect(page.locator('#journey')).toBeHidden();
  await page.locator('#dock [data-action="tab:build"]').click();
  await page.locator('[data-action="build:hut"]').click();
  const point = await page.evaluate(() => {
    const { engine, scene } = (window as any).pocket;
    for (let y = 21; y < 30; y++)
      for (let x = 18; x < 29; x++) {
        if (!engine.placement('hut', x, y)) {
          return scene.tileToScreen(x + 0.5, y + 0.5);
        }
      }
    throw Error('plot');
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.getByRole('button', { name: 'Hier bauen' })).toBeEnabled();
  await page.getByRole('button', { name: 'Hier bauen' }).click();
  await page.evaluate(() => {
    const { engine } = (window as any).pocket;
    for (let i = 0; i < 900; i++) engine.tick(0.1);
  });
  const built = await page.evaluate(() => {
    const { engine } = (window as any).pocket;
    return engine.state.buildings.find((b: any) => b.type === 'hut');
  });
  expect(built.remaining).toBe(0);
  await page.evaluate(() => {
    const { ui, scene } = (window as any).pocket;
    ui.category = 'production';
    ui.showPanel('build');
    scene.center();
  });
  await page.locator('[data-action="build:lumber"]').click();
  const woodPoint = await page.evaluate(() => {
    const { engine, scene } = (window as any).pocket;
    for (let y = 19; y < 31; y++)
      for (let x = 17; x < 29; x++)
        if (!engine.placement('lumber', x, y)) return scene.tileToScreen(x + 0.5, y + 0.5);
    throw Error('plot');
  });
  await page.mouse.click(woodPoint.x, woodPoint.y);
  await page.locator('[data-action="place"]').click();
  await page.evaluate(() => {
    const { engine, ui, scene } = (window as any).pocket;
    for (let i = 0; i < 900; i++) engine.tick(0.1);
    const b = engine.state.buildings.find((b: any) => b.type === 'lumber');
    ui.selected = null;
    ui.renderInspector();
  });
  const roof = await page.evaluate(() => {
    const { engine, scene } = (window as any).pocket;
    const b = engine.state.buildings.find((b: any) => b.type === 'lumber');
    const p = scene.tileToScreen(b.x + 1, b.y + 1);
    return { x: p.x, y: p.y - 42 * scene.camera.zoom };
  });
  await page.mouse.click(roof.x, roof.y);
  await page.getByRole('button', { name: 'Arbeiter zuweisen', exact: true }).click();
  expect(
    await page.evaluate(() =>
      (window as any).pocket.engine.state.workers.some((w: any) => w.assigned !== null),
    ),
  ).toBe(true);
  await page.evaluate(() => {
    const { engine } = (window as any).pocket;
    engine.add({ wood: 80, stone: 80 });
  });
  await page.locator('[data-action="upgrade"]').click();
  await page.evaluate(() => {
    const { engine, ui } = (window as any).pocket;
    for (let i = 0; i < 600; i++) engine.tick(0.1);
    ui.selected = null;
    ui.renderInspector();
  });
  await page.screenshot({ path: 'test-results/pocket-game.png' });
  await page.locator('#topbar [data-action="settings"]').click();
  await page.locator('#overlay [data-action="saves"]').click();
  await page.locator('[data-action="save:manual"]').click();
  await expect(page.locator('#toast')).toContainText('Spiel gespeichert');
  await page.locator('[data-action="save:auto"]').click();
  await page.reload();
  await page.getByRole('button', { name: 'Spiel fortsetzen', exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        (window as any).pocket.engine.state.buildings.filter((b: any) => b.type === 'lumber')[0]
          .level,
    ),
  ).toBe(2);
  await page.locator('[data-action="tab:researchTab"]').click();
  await expect(page.getByRole('heading', { name: 'Ideen verändern die Welt' })).toBeVisible();
  await page.screenshot({ path: 'test-results/pocket-research.png' });
  await page.locator('[data-action="closePanel"]:visible').click();
  await page.locator('#dock [data-action="tab:world"]').click();
  await page.locator('[data-action="explore:woods"]').click();
  await page.evaluate(() => {
    const { engine, ui } = (window as any).pocket;
    for (let i = 0; i < 220; i++) engine.tick(0.1);
    ui.renderModal();
  });
  await expect(page.locator('.region-grid .region-card').first()).toContainText('Erkundet');
  await page.locator('[data-action="closePanel"]:visible').click();
  await page.locator('#topbar [data-action="settings"]').click();
  for (const [language, label] of [
    ['en', 'Settings'],
    ['es', 'Ajustes'],
    ['fr', 'Paramètres'],
    ['de', 'Einstellungen'],
  ]) {
    await page.locator('#language').selectOption(language);
    await expect(page.locator('#modal-title')).toHaveText(label);
  }
  expect(errors).toEqual([]);
});
test('mobile: touch placement, drag, pinch, cancel, menus and no horizontal overflow', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?qa');
  await page.getByRole('button', { name: 'Neue Siedlung', exact: true }).tap();
  await page.screenshot({ path: 'test-results/pocket-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#dock [data-action="tab:build"]').tap();
  await page.locator('#build-category').selectOption('production');
  const client = await context.newCDPSession(page);
  const catalog = page.locator('.building-cards');
  const bounds = (await catalog.boundingBox())!;
  const x = Math.round(bounds.x + bounds.width / 2);
  const startY = Math.round(bounds.y + bounds.height - 30);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: startY, id: 1 }],
  });
  // Sample an actual finger swipe over time; Chromium's synthesized gesture is inert here.
  for (let distance = 20; distance <= 220; distance += 20) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: startY - distance, id: 1 }],
    });
    await page.waitForTimeout(35);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => catalog.evaluate((el) => el.scrollTop)).toBeGreaterThan(20);
  await page.locator('#build-category').selectOption('housing');
  await page.locator('[data-action="build:hut"]').tap();
  const point = await page.evaluate(() => {
    const { engine, scene } = (window as any).pocket;
    for (let y = 21; y < 29; y++)
      for (let x = 20; x < 29; x++) {
        if (!engine.placement('hut', x, y)) {
          const p = scene.tileToScreen(x + 0.5, y + 0.5);
          if (p.y > 290 && p.y < 600 && p.x > 20 && p.x < 370) return p;
        }
      }
    throw Error('plot');
  });
  await page.touchscreen.tap(point.x, point.y);
  await page.getByRole('button', { name: 'Hier bauen' }).tap();
  expect(
    await page.evaluate(() =>
      (window as any).pocket.engine.state.buildings.some((b: any) => b.type === 'hut'),
    ),
  ).toBe(true);
  const zoom = await page.evaluate(() => (window as any).pocket.scene.camera.zoom);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: 140, y: 380, id: 1 },
      { x: 240, y: 380, id: 2 },
    ],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: 90, y: 380, id: 1 },
      { x: 290, y: 380, id: 2 },
    ],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.evaluate(() => (window as any).pocket.scene.camera.zoom)).toBeGreaterThan(zoom);
  await page.locator('#dock [data-action="tab:world"]').tap();
  await expect(page.locator('.modal-world')).toBeVisible();
  await page.screenshot({ path: 'test-results/pocket-mobile-world.png' });
  await page.locator('[data-action="closePanel"]:visible').tap();
  await page.locator('#topbar [data-action="settings"]').tap();
  await page.locator('#language').selectOption('en');
  await expect(page.locator('#modal-title')).toHaveText('Settings');
  expect(errors).toEqual([]);
  await context.close();
});
