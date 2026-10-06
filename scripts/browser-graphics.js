/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async (page) => {
  const errors = [], onConsole = msg => { if (msg.type() === 'error') errors.push(msg.text()); }, onError = e => errors.push(e.message);
  page.on('console', onConsole); page.on('pageerror', onError);
  await page.setViewportSize({ width: 1120, height: 700 });
  await page.goto('http://localhost:3000');
  await page.waitForFunction(() => window.__nachtwache && !document.querySelector('.title-card button')?.disabled, {}, { timeout: 60000 });
  const style = await page.addStyleTag({ content: '.location-card,.hud,.credit,.loot-notice{visibility:hidden!important}' });
  const views = [
    ['ranger', -61, -35, -54, 2, -35, 12],
    ['village', -42, -7, -25, 3, -18, 12],
    ['forest', -101, 40, -130, 3, 65, 12],
    ['cemetery', 0, 15, 20, 3, 24, 12],
    ['clinic', 33, 18, 50, 3, 28, 12],
    ['tower', 58, -19, 66, 8, -25, 18],
    ['city', 151, 4, 181, 3, -20, 12],
    ['vehicle',204.3,-86.3,207,1,-91,12],
    ['farm', -100, 78, -113, 2, 69, 12],
    ['camp', -120, 129, -125, 2, 119, 12],
    ['apartment', 198, 31.6, 200.65, 1, 30, 12],
    ['city-night', 151, 4, 181, 3, -20, 0],
    ['apartment-night', 198, 31.6, 200.65, 1, 30, 0],
  ];
  const rendered = [];
  try {
    for (const [name, x, z, tx, ty, tz, hour] of views) {
      await page.evaluate(({ x, z, tx, ty, tz, hour }) => { const g = window.__nachtwache; g.start(); g.teleport(x, z); g.aim(tx, ty, tz); g.setTime(hour); g.resume(); }, { x, z, tx, ty, tz, hour });
      await page.waitForTimeout(450); await page.evaluate(() => window.__nachtwache.pause());
      const env = await page.evaluate(() => window.__nachtwache.environment());
      if (!(env.detail?.tufts > 1000 && env.detail?.roadPieces > 100 && env.detail?.puddles > 20&&env.detail?.trees>20&&env.detail?.streetProps>10)) throw Error(`${name}: global world dressing missing`);
      await page.screenshot({ path: `output/playwright/graphics-${name}.png` });
      rendered.push({ name, render: (await page.evaluate(() => window.__nachtwache.state())).render });
    }
    if (errors.length) throw Error(errors.join('\n').slice(0, 5000));
  } finally { await style.evaluate(el => el.remove()); page.off('console', onConsole); page.off('pageerror', onError); }
  return { passed: ['all regions', 'PBR shader compilation', 'world dressing', 'day/dusk/night', 'interior lighting'], errors, rendered, detail: await page.evaluate(() => window.__nachtwache.environment().detail) };
}
