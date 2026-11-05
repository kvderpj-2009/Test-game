import { test, expect } from '@playwright/test';

for (const renderer of ['webgl', 'canvas']) {
  test(`${renderer}: drawing, roof picking, terrain reuse and camera culling`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/?qa&renderer=${renderer}`);
    await page.getByRole('button', { name: 'Neue Siedlung', exact: true }).click();
    const result = await page.evaluate(() => {
      const { engine, scene } = (window as any).pocket;
      const hall = engine.state.buildings.find((b: any) => b.type === 'hall');
      const roof = scene.tileToScreen(hall.x + 1.5, hall.y + 1.5);
      const hit = scene.hitBuilding({ x: roof.x, y: roof.y - 65 * scene.camera.zoom });
      const before = scene.terrainLayer.children[0].texture;
      const sprite = scene.buildingSprites.get(hall.id);
      hall.level = 2;
      scene.redraw();
      const reused = before === scene.terrainLayer.children[0].texture;
      const sameSprite = sprite === scene.buildingSprites.get(hall.id);
      const textureSizes = scene.terrainLayer.children.map((s: any) =>
        Math.max(s.texture.width, s.texture.height),
      );
      scene.camera.x = 10000;
      scene.transform();
      const offscreen = [...scene.buildingSprites.values()].every((s: any) => !s.visible);
      scene.center();
      return {
        renderer: scene.app.renderer.name,
        hit,
        hall: hall.id,
        reused,
        sameSprite,
        offscreen,
        textureSizes,
      };
    });
    expect(result.renderer).toBe(renderer);
    expect(result.hit).toBe(result.hall);
    expect(result.reused).toBe(true);
    expect(result.sameSprite).toBe(true);
    expect(result.offscreen).toBe(true);
    expect(Math.max(...result.textureSizes)).toBeLessThanOrEqual(1024);
    await page.screenshot({ path: `test-results/pocket-${renderer}-0.3.0.png` });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Neue Siedlung', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('every building and unit illustration fits its texture page', async ({ page }) => {
  await page.goto('/?qa');
  await page.getByRole('button', { name: 'Neue Siedlung', exact: true }).click();
  const result = await page.evaluate(async () => {
    const { BUILDING } = await import('/src/game/data.ts');
    const { UNITS } = await import('/src/game/campaign-data.ts');
    const { buildingArt, treeArt } = await import('/src/render/art.ts');
    const { CharacterAtlas } = await import('/src/render/characters.ts');
    const clipped: string[] = [],
      empty: string[] = [];
    const inspect = (name: string, canvas: HTMLCanvasElement) => {
      const { width: w, height: h } = canvas;
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, w, h).data;
      let solid = 0,
        edge = false;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const alpha = pixels[(x + y * w) * 4 + 3];
          if (alpha > 100) {
            solid++;
            if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
          }
        }
      if (edge) clipped.push(name);
      if (solid < 10) empty.push(name);
    };
    for (const type of Object.keys(BUILDING))
      for (const level of [1, 2, 3]) inspect(type + level, buildingArt(type, level));
    for (let i = 0; i < 7; i++) inspect('tree' + i, treeArt(i));
    const atlas = new CharacterAtlas();
    for (const type of ['worker0', 'worker1', 'worker2', ...Object.keys(UNITS)]) {
      for (const activity of ['idle', 'walk', 'carry', 'work'] as const) {
        const sheet = atlas.texture(type, activity, 0).source.resource as HTMLCanvasElement;
        // Check each frame separately so lateral clipping cannot hide between frames.
        for (let frame = 0; frame < 8; frame++) {
          const c = document.createElement('canvas');
          c.width = 64;
          c.height = 80;
          c.getContext('2d')!.drawImage(sheet, frame * 64, 0, 64, 80, 0, 0, 64, 80);
          inspect(`${type}/${activity}/${frame}`, c);
        }
      }
    }
    return {
      clipped,
      empty,
      buildings: Object.keys(BUILDING).length,
      units: Object.keys(UNITS).length,
    };
  });
  expect(result.clipped).toEqual([]);
  expect(result.empty).toEqual([]);
  expect(result.buildings).toBe(65);
  expect(result.units).toBe(13);
});
