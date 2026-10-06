/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async (page) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForFunction(() => window.__nachtwache && !document.querySelector('.title-card button')?.disabled);
  const views = [
    ['cafe-dining', 137, 36.8, 134.3, 1.1, 34.7],
    ['cafe-kitchen', 137, 31.8, 139.65, 1.25, 29.3],
    ['laundry-machines', 137, 87.6, 139.75, .9, 86.25],
    ['apartment-living', 198, 31.6, 200.65, .9, 30],
    ['apartment-bedroom', 198, 25.8, 195.35, .75, 24],
    ['practice-treatment', 198, -70.4, 195.35, .9, -72],
    ['pharmacy-stock', 137, -76.2, 139.75, 1.25, -78.3],
  ];
  for (const [name, x, z, tx, ty, tz] of views) {
    await page.evaluate(({ x, z, tx, ty, tz }) => { const g = window.__nachtwache; g.start(); g.teleport(x, z); g.aim(tx, ty + .15, tz); g.resume(); }, { x, z, tx, ty, tz });
    await page.waitForTimeout(350); await page.evaluate(() => window.__nachtwache.pause());
    await page.screenshot({ path: `output/playwright/detail-${name}.png` });
  }
  return { screenshots: views.map(v => v[0]) };
}
