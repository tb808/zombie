/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async (page) => {
  const check = (ok, message) => { if (!ok) throw Error(message); };
  await page.setViewportSize({ width: 960, height: 640 });
  await page.waitForFunction(() => window.__nachtwache && !document.querySelector('.start-actions .secondary')?.disabled);
  const places = [
    ['pharmacy', 137, -72, ['medkit', 'antibiotic', 'water']],
    ['practice', 198, -72, ['medkit', 'antibiotic', 'battery']],
    ['bakery', 137, -20, ['ration', 'water', 'planks']],
    ['electronics', 198, -20, ['battery', 'scrap', 'flare']],
    ['cafe', 137, 30, ['water', 'ration', 'medkit']],
    ['apartment', 198, 30, ['ration', 'battery', 'ammo']],
    ['laundry', 137, 80, ['water', 'scrap', 'planks']],
    ['office', 198, 84, ['battery', 'scrap', 'ammo']],
  ];
  const results = [];
  for (const [id, x, z, kinds] of places) {
    await page.evaluate(({ x, z }) => { const g = window.__nachtwache; g.start(); g.teleport(x, z + 11); g.resume(); }, { x, z });
    await page.keyboard.down('w');
    try { await page.waitForFunction(z => window.__nachtwache.state().position[2] < z + 8.3, z, { timeout: 20000 }); }
    finally { await page.keyboard.up('w'); }
    let state = await page.evaluate(() => window.__nachtwache.state());
    check(state.position[2] < z + 8.5 && state.position[2] > z + 3.6, `${id}: WASD enters through front door`);
    check(state.visited.includes(id), `${id}: entering records this building`);
    // Check each threshold with real movement; predicates also work on slow GPUs.
    for (const door of [3.1, -3.1, -8.86]) {
      await page.evaluate(({ x, z, door }) => { const g = window.__nachtwache; g.teleport(x, z + door + 1.2); g.resume(); }, { x, z, door });
      await page.keyboard.down('w');
      try { await page.waitForFunction(target => window.__nachtwache.state().position[2] < target, z + door - 1.2, { timeout: 20000 }); }
      finally { await page.keyboard.up('w'); }
    }
    state = await page.evaluate(() => window.__nachtwache.state());
    check(state.position[2] < z - 9.4, `${id}: interior doors and rear exit stay walkable`);
    for (let i = 0; i < 3; i++) {
      const result = await page.evaluate(({ x, z, i, kind }) => {
        const g = window.__nachtwache; g.teleport(x, z + [6, 0, -6][i]); g.resume();
        const before = g.state(); g.interact(); const after = g.state();
        return { before: kind === 'ammo' ? before.arsenal.pistol.reserve : before.inventory[kind], after: kind === 'ammo' ? after.arsenal.pistol.reserve : after.inventory[kind] };
      }, { x, z, i, kind: kinds[i] });
      check(result.after > result.before, `${id}: ${kinds[i]} can be picked up with E`);
    }
    await page.evaluate(({ x, z }) => { const g = window.__nachtwache; g.teleport(x, z - 6.8); g.interact(); }, { x, z });
    state = await page.evaluate(() => window.__nachtwache.state());
    check(state.evidence.includes(`${id}-letter`) && state.dialogue, `${id}: letter is readable and saved`);
    await page.evaluate(() => { const g = window.__nachtwache; while (g.state().dialogue) g.nextDialogue(); });
    await page.evaluate(({ x, z }) => { const g = window.__nachtwache; g.teleport(x, z + 7.8); g.resume(); }, { x, z });
    await page.waitForTimeout(120);
    await page.evaluate(() => window.__nachtwache.pause());
    await page.screenshot({ path: `output/playwright/interior-${id}.png` });
    results.push({ id, visited: true, loot: kinds, letter: true, render: (await page.evaluate(() => window.__nachtwache.state())).render });
  }
  await page.evaluate(() => { const g = window.__nachtwache; g.start(); g.teleport(137, -64.2); g.setTime(0); g.resume(); });
  await page.waitForTimeout(120); await page.evaluate(() => window.__nachtwache.pause());
  await page.screenshot({ path: 'output/playwright/interior-pharmacy-night.png' });
  await page.evaluate(() => window.__nachtwache.start());
  check((await page.evaluate(() => window.__nachtwache.state())).evidence.length === 0, 'Restart clears exploration letters');
  return { passed: ['eight front entrances', 'sixteen internal doorways', 'eight rear exits', '24 loot pickups', 'eight readable letters', 'visited buildings', 'day/night rendering', 'restart'], results };
}
