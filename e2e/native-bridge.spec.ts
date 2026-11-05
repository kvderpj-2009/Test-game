import { test, expect } from '@playwright/test';
test('Android back callback cancels confirmation, closes menus, saves and returns to the launcher', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, {
      nativeExits: 0,
      nativeReady: false,
      PocketAndroid: {
        ready() {
          (window as any).nativeReady =
            !!document.querySelector('#world canvas') &&
            !!document.querySelector('[data-action="new"]');
        },
        importSave() {},
        exportSave() {},
        exitApp() {
          (window as any).nativeExits++;
        },
      },
    });
  });
  await page.goto('/?qa');
  await page.locator('[data-action="new"]').click();
  expect(await page.evaluate(() => (window as any).nativeReady)).toBe(true);
  await page.evaluate(() => {
    const { ui } = (window as any).pocket;
    ui.confirm('Test', () => {
      throw Error('must not confirm');
    });
  });
  await page.evaluate(() => (window as any).pocketNativeBack());
  await expect(page.locator('.confirm-dialog')).toHaveCount(0);
  await page.locator('#topbar [data-action="settings"]').click();
  await page.evaluate(() => (window as any).pocketNativeBack());
  await expect(page.locator('.modal')).toHaveCount(0);
  for (const panel of ['build', 'journey']) {
    await page.locator(`#dock [data-action="tab:${panel}"]`).click();
    await page.evaluate(() => (window as any).pocketNativeBack());
    expect(await page.evaluate(() => (window as any).pocket.ui.panel)).toBe(null);
  }
  await page.evaluate(() => {
    const { engine, scene } = (window as any).pocket;
    scene.onSelect(engine.state.buildings.find((b: any) => b.type === 'hall').id);
  });
  await expect(page.locator('#inspector')).toBeVisible();
  await page.evaluate(() => (window as any).pocketNativeBack());
  await expect(page.locator('#inspector')).toBeHidden();
  await expect(page.locator('#dock')).toBeVisible();
  await page.evaluate(() => (window as any).pocketNativeBack());
  await expect(page.locator('[data-action="continue"]')).toBeVisible();
  expect(await page.evaluate(() => (window as any).nativeExits)).toBe(0);
  await page.evaluate(() => (window as any).pocketNativeBack());
  expect(await page.evaluate(() => (window as any).nativeExits)).toBe(1);
});
