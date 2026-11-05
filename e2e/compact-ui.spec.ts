import { test, expect } from '@playwright/test';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`compact UI ${viewport.width}: closed start, right icons, map, toggles and research access`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize(viewport);
    await page.goto('/?qa');
    await page.locator('[data-action="new"]').click();
    for (const id of ['journey', 'build-panel', 'inspector'])
      await expect(page.locator('#' + id)).toBeHidden();
    await expect(page.locator('.modal')).toHaveCount(0);
    const layout = await page.evaluate(() => {
      const rect = (id: string) => document.querySelector(id)!.getBoundingClientRect();
      const bar = rect('#topbar'),
        dock = rect('#dock'),
        map = rect('#map-panel');
      return {
        bar: bar.height,
        dockX: dock.x,
        mapX: map.x,
        mapBottom: map.bottom,
        covered:
          (bar.width * bar.height + dock.width * dock.height + map.width * map.height) /
          (innerWidth * innerHeight),
      };
    });
    expect(layout.bar).toBeLessThanOrEqual(viewport.width <= 760 ? 66 : 44);
    expect(layout.dockX).toBeGreaterThan(viewport.width - 70);
    expect(layout.mapX).toBeLessThan(15);
    expect(layout.mapBottom).toBeGreaterThan(viewport.height - 15);
    expect(layout.covered).toBeLessThan(0.2);
    const header = await page.evaluate(() => {
      const ids = ['.resources', '.population', '.time-controls'];
      const rects = ids.map((id) => document.querySelector(id)!.getBoundingClientRect());
      return rects.every(
        (r, i) =>
          r.bottom <= document.querySelector('#topbar')!.getBoundingClientRect().bottom &&
          rects
            .slice(i + 1)
            .every(
              (q) =>
                r.right <= q.left || q.right <= r.left || r.bottom <= q.top || q.bottom <= r.top,
            ),
      );
    });
    expect(header).toBe(true);
    await page.screenshot({ path: `test-results/compact-${viewport.width}.png` });
    for (const panel of ['build', 'researchTab', 'world', 'army', 'quests', 'journey']) {
      const icon = page.locator(`#dock [data-action="tab:${panel}"]`);
      await icon.click();
      await expect(icon).toHaveAttribute('aria-expanded', 'true');
      const window = page.locator(
        panel === 'build' ? '#build-panel' : panel === 'journey' ? '#journey' : '.modal',
      );
      await expect(window).toBeVisible();
      if (panel === 'build') {
        const card = await page.locator('.building-card').first().boundingBox();
        const list = await page.locator('.building-cards').boundingBox();
        expect(card!.width).toBeGreaterThan(list!.width * 0.95);
        expect(
          await page
            .locator('.building-card strong')
            .first()
            .evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
      }
      const bounds = await window.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThan(viewport.width - 55);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(await window.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await icon.click();
      await expect(window).not.toBeVisible();
      await icon.click();
      await window.locator('[data-action="closePanel"]').click();
      await expect(icon).toHaveAttribute('aria-expanded', 'false');
    }
    await page.locator('#dock [data-action="tab:journey"]').click();
    await page.locator('#dock [data-action="tab:build"]').click();
    await expect(page.locator('#journey')).toBeHidden();
    await expect(page.locator('[data-action="build:stoneHouse"]')).toHaveCount(0);
    await page.locator('#build-search').fill('Forschung');
    await expect(page.locator('.building-card')).toHaveCount(1);
    await expect(page.locator('[data-action="build:research"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#build-panel')).toBeHidden();
    await page.locator('#dock [data-action="tab:researchTab"]').click();
    await page.locator('#overlay [data-action="build:research"]').click();
    await expect(page.locator('.modal')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).pocket.scene.placing)).toBe('research');
    await page.locator('[data-action="cancel"]').click();
    await expect(page.locator('#build-panel')).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('open windows leave the map interactive; research location and era graphics survive reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?qa');
  await page.locator('[data-action="new"]').click();
  await page.locator('#dock [data-action="tab:world"]').click();
  // A real canvas drag beside the window must pan the world.
  const before = await page.evaluate(() => (window as any).pocket.scene.camera.x);
  await page.mouse.move(320, 450);
  await page.mouse.down();
  await page.mouse.move(400, 480, { steps: 5 });
  await page.mouse.up();
  expect(await page.evaluate(() => (window as any).pocket.scene.camera.x)).not.toBe(before);
  await expect(page.locator('.modal-world')).toBeVisible();
  await page.locator('[data-action="center"]').click();
  const roof = await page.evaluate(() => {
    const { engine, scene } = (window as any).pocket;
    const b = engine.state.buildings.find((b: any) => b.type === 'hall');
    const p = scene.tileToScreen(b.x + 1.5, b.y + 1.5);
    return { x: p.x, y: p.y - 65 * scene.camera.zoom };
  });
  await page.mouse.click(roof.x, roof.y);
  await expect(page.locator('.modal')).toHaveCount(0);
  await expect(page.locator('#inspector')).toBeVisible();
  await page.locator('#dock [data-action="tab:researchTab"]').click();
  await expect(page.locator('#inspector')).toBeHidden();
  const id = await page.evaluate(() => {
    const { engine } = (window as any).pocket;
    for (let y = 20; y < 30; y++)
      for (let x = 18; x < 29; x++)
        if (!engine.placement('research', x, y)) {
          const id = engine.build('research', x, y, 0);
          engine.state.buildings.find((b: any) => b.id === id).remaining = 0;
          return id;
        }
    throw Error('research plot');
  });
  await expect(page.locator('[data-action="findResearch"]')).toBeVisible();
  await page.locator('[data-action="findResearch"]').click();
  await expect(page.locator('#inspector h2')).toHaveText('Forschungshütte');
  expect(await page.evaluate(() => (window as any).pocket.ui.selected)).toBe(id);
  await page.locator('[data-action="assign"]').click();
  const textures = await page.evaluate(async () => {
    const { engine, scene, ui } = (window as any).pocket;
    const { thumbnail } = await import('/src/render/art.ts');
    const initial = scene.texture('hall');
    const stone = thumbnail('hall', 0);
    engine.state.age = 1;
    scene.redraw();
    const bronze = scene.texture('hall');
    engine.state.age = 2;
    scene.redraw();
    const iron = scene.texture('hall');
    engine.state.age = 4;
    scene.redraw();
    const medieval = scene.texture('hall');
    engine.state.age = 0;
    scene.redraw();
    ui.persist();
    return {
      different: initial !== bronze && bronze !== medieval,
      reused: bronze === iron && scene.texture('hall') === initial,
      thumbnail: stone !== thumbnail('hall', 4),
    };
  });
  expect(textures).toEqual({ different: true, reused: true, thumbnail: true });
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  expect(await page.evaluate(() => (window as any).pocket.engine.state.age)).toBe(0);
  expect(
    await page.evaluate(() =>
      (window as any).pocket.engine.state.workers.some((w: any) => w.assigned !== null),
    ),
  ).toBe(true);
  await expect(page.locator('#build-panel')).toBeHidden();
  await expect(page.locator('#journey')).toBeHidden();
});
