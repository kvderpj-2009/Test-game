import { test, expect } from '@playwright/test';
test('campaign controls: cities, persistent route forms, selected army commands and victory', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?qa');
  await page.locator('[data-action="new"]').click();
  await page.evaluate(() => {
    const { engine, ui } = (window as any).pocket;
    ui.paused = true;
    engine.state.age = 1;
    engine.state.research = ['trade', 'defense'];
    engine.state.regions[0].explored = true;
    engine.state.resources.wood = 200;
    engine.state.resources.food = 200;
    engine.state.resources.stone = 150;
  });
  await page.locator('#dock [data-action="tab:world"]').click();
  await page.locator('[data-action="foundCity:woods"]').click();
  await expect(page.locator('.city-grid article')).toHaveCount(2);
  await page.locator('#route-amount').fill('40');
  await page.locator('#route-resource').selectOption('wood');
  await page.waitForTimeout(1100);
  await expect(page.locator('#route-amount')).toHaveValue('40');
  await page.locator('[data-action="createRoute"]').click();
  await expect(page.locator('.route-card')).toContainText('40 Holz');
  await page.locator('[data-action="visit:woods"]').click();
  await expect(page.locator('#topbar .settlement')).toContainText('Siedlung');
  await page.locator('[data-action="visit:capital"]').click();
  await expect(page.locator('#topbar .settlement')).toContainText('Hauptstadt');
  await page.locator('[data-action="closePanel"]').click();
  await page.evaluate(() => {
    const { engine } = (window as any).pocket;
    engine.state.buildings.push({
      id: engine.state.nextId++,
      type: 'barracks',
      x: 25,
      y: 20,
      level: 1,
      remaining: 0,
      hp: 180,
      rotation: 0,
    });
    engine.state.resources.food = 200;
    engine.state.resources.wood = 200;
    engine.changed++;
  });
  await page.locator('#dock [data-action="tab:army"]').click();
  await page.locator('[data-action="train:guard"]').click();
  await page.locator('[data-action="train:guard"]').click();
  await page.locator('[data-action="selectAll"]').click();
  await expect(page.locator('.unit-roster .selected')).toHaveCount(2);
  await page.locator('#formation').selectOption('wedge');
  await page.locator('[data-action="order:hold"]').click();
  await expect(page.locator('.unit-roster')).toContainText('Stellung halten');
  await page.locator('[data-action="moveTroops"]').click();
  await expect(page.locator('#placement')).toContainText('Tippe auf die Karte');
  const target = await page.evaluate(() => {
    const { scene } = (window as any).pocket;
    return scene.tileToScreen(27.5, 27.5);
  });
  await page.mouse.click(target.x, target.y);
  expect(
    await page.evaluate(() =>
      (window as any).pocket.engine.state.soldiers.every(
        (u: any) => u.order === 'move' && u.path.length > 0,
      ),
    ),
  ).toBe(true);
  await page.evaluate(() => {
    const { engine, ui } = (window as any).pocket;
    engine.state.age = 10;
    engine.state.stats.explored = 6;
    engine.state.buildings.push({
      id: engine.state.nextId++,
      type: 'launchpad',
      x: 16,
      y: 17,
      level: 1,
      remaining: 0,
      hp: 1200,
      rotation: 0,
    });
    Object.assign(engine.state.resources, { alloys: 200, fuel: 200, data: 200, energy: 500 });
    ui.render();
  });
  await page.locator('#dock [data-action="tab:quests"]').click();
  await page.locator('[data-action="launch"]').click();
  await expect(page.locator('.campaign-goal')).toContainText('Startvorbereitung');
  await page.evaluate(() => {
    const { engine, ui } = (window as any).pocket;
    for (let i = 0; i < 245; i++) engine.tick(0.25);
    ui.renderModal();
    ui.persist();
  });
  await expect(page.locator('.campaign-goal')).toContainText('Kampagne gewonnen');
  await page.screenshot({ path: 'test-results/pocket-campaign-complete.png' });
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  expect(await page.evaluate(() => (window as any).pocket.engine.state.campaign.launched)).toBe(
    true,
  );
  expect(await page.evaluate(() => (window as any).pocket.engine.state.colonies.length)).toBe(1);
  expect(errors).toEqual([]);
});
test('mobile expansion and troop menus fit at 390px in all four locales', async ({ browser }) => {
  test.setTimeout(240_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/?qa');
  await page.locator('[data-action="new"]').tap();
  await page.evaluate(() => {
    const { engine, ui } = (window as any).pocket;
    ui.paused = true;
    engine.state.age = 10;
    engine.state.research = ['trade'];
    engine.state.regions[0].explored = true;
    engine.empire.found('woods');
  });
  for (const lang of ['de', 'en', 'es', 'fr']) {
    await page.locator('#topbar [data-action="settings"]').tap();
    await page.locator('#language').selectOption(lang);
    await page.locator('[data-action="closePanel"]').tap();
    for (const panel of ['world', 'army', 'quests', 'researchTab']) {
      await page.locator(`#dock [data-action="tab:${panel}"]`).tap();
      await expect(page.locator('.modal')).toBeVisible();
      const overflow = await page
        .locator('.modal-content')
        .evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow, lang + ' ' + panel).toBeLessThanOrEqual(2);
      await page.locator('[data-action="closePanel"]').tap();
    }
  }
  await page.screenshot({ path: 'test-results/pocket-mobile-expansion.png' });
  await context.close();
});
