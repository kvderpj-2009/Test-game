import { test, expect } from '@playwright/test';
test('production build starts offline and preserves local saves without exposing test controls', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?qa');
  await expect(page.getByRole('button', { name: 'Neue Siedlung', exact: true })).toBeVisible();
  expect(await page.evaluate(() => typeof (window as any).pocket)).toBe('undefined');
  await page.getByRole('button', { name: 'Neue Siedlung', exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.locator('#topbar [data-action="settings"]').click();
  await page.locator('#overlay [data-action="saves"]').click();
  await page.locator('[data-action="save:auto"]').click();
  await expect(page.locator('#toast')).toContainText('Spiel gespeichert');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Spiel fortsetzen', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Spiel fortsetzen', exact: true }).click();
  await expect(page.locator('#journey')).toBeVisible();
  await expect(page.locator('#world canvas')).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(JSON.parse(localStorage.getItem('pocket-civilization.v2')!).data).workers.length,
    ),
  ).toBe(3);
  expect(errors).toEqual([]);
});
