/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async (page) => {
  const errors = [], onConsole = msg => { if (msg.type() === 'error') errors.push(msg.text()); }, onError = e => errors.push(e.message);
  page.on('console', onConsole); page.on('pageerror', onError);
  await page.setViewportSize({ width: 1120, height: 700 });
  await page.goto('http://localhost:3000');
  await page.waitForFunction(() => window.__nachtwache && !document.querySelector('.title-card button')?.disabled, {}, { timeout: 60000 });
  const style = await page.addStyleTag({ content: '.location-card,.hud,.credit,.loot-notice{visibility:hidden!important}' });
  const views = [
    ['forest', -101, 40, -130, 4, 65, 12],
    ['ranger', -61, -35, -76, 4, -49, 12],
    ['woodland', -143, 72, -150, 4, 90, 12],
    ['broadleaf', 54, 63, 67, 5, 58, 12],
    ['spruce', -82, -62, -78, 3, -49, 12],
    ['dusk', -101, 40, -130, 4, 65, 18],
  ];
  const rendered = [];
  try {
    for (const [name, x, z, tx, ty, tz, hour] of views) {
      await page.evaluate(({ x, z, tx, ty, tz, hour }) => { const g = window.__nachtwache; g.start(); g.teleport(x, z); g.aim(tx, ty, tz); g.setTime(hour); g.resume(); }, { x, z, tx, ty, tz, hour });
      await page.waitForTimeout(600); await page.evaluate(() => window.__nachtwache.pause());
      await page.screenshot({ path: `output/playwright/trees-${name}.png` });
      rendered.push({ name, render: (await page.evaluate(() => window.__nachtwache.state())).render });
    }
    if (errors.length) throw Error(errors.join('\n').slice(0, 5000));
  } finally { await style.evaluate(el => el.remove()); page.off('console', onConsole); page.off('pageerror', onError); }
  return { passed: ['spruce and broadleaf rendering', 'foliage shaders', 'day and dusk'], errors, rendered };
}
