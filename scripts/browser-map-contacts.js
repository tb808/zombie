/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async (page) => {
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const ready = () => page.waitForFunction(() => window.__nachtwache && !document.querySelector('.start-actions .secondary')?.disabled, {}, { timeout: 90000 });
  const state = () => page.evaluate(() => window.__nachtwache.state());
  await ready();
  await page.evaluate(() => {
    const g = window.__nachtwache; g.start(); g.resume();
    const p = g.campaign().start;
    g.teleport(p.mara.x, p.mara.z); g.interact();
    for (let i = 0; i < 64 && g.state().dialogue; i++) g.nextDialogue();
    g.teleport(p.jonas.x, p.jonas.z); g.interact();
    for (let i = 0; i < 64 && g.state().dialogue; i++) g.nextDialogue();
  });
  check((await state()).talkedTo.includes('mara') && (await state()).talkedTo.includes('ranger-guard'), 'Direct conversations record both Mara and Jonas');
  await page.keyboard.press('m');
  const map = page.locator('.map-viewport svg'); await map.waitFor();
  check(await map.locator('[data-map-npc="mara"]').count() === 1, 'Mara is marked once');
  check(await map.locator('[data-map-npc="ranger-guard"]').count() === 1, 'Known guard is marked');
  check(await map.locator('[data-map-npc="weber"]').count() === 0, 'Unmet NPCs are not revealed');
  check(await map.locator('[data-map-refuge="fichtenau-camp"]').count() === 1, 'Guarded camp has a secured marker');
  await page.locator('.map-directory-details>summary').click();
  const contacts = page.getByRole('region', { name: 'Bekannte Gesprächspartner', exact: true });
  await contacts.getByRole('button', { name: /Mara/ }).click();
  const [vx, vz, vw, vh] = (await map.getAttribute('viewBox')).split(' ').map(Number);
  const mara = await page.evaluate(() => window.__nachtwache.campaign().start.mara);
  check(mara.x >= vx && mara.x <= vx + vw && mara.z >= vz && mara.z <= vz + vh, 'Contact list centers on the selected NPC');
  await page.screenshot({ path: 'output/playwright/map-known-contacts.png' });
  await page.keyboard.press('m');
  // Build and activate the first house through the real interaction system.
  const house = await page.evaluate(() => { const c = window.__nachtwache.campaign(); return c.houses.find(h => h.id === c.firstHouse); });
  await page.evaluate(h => {
    const g = window.__nachtwache; g.resume();
    for (const [x, z] of [[h.x - 4, h.z + 10], [h.x, h.z + 12]]) { g.teleport(x, z); g.interact(); }
    g.teleport(h.x, h.z + 1); g.interact();
    const points = [[-4.6, -5.7], [4.6, -5.7], [-4.6, 5.7], [4.6, 5.7], [0, -5.7], [0, 5.7]];
    for (let i = 0; i < points.length; i++) {
      g.teleport(h.x + points[i][0], h.z + points[i][1]);
      for (let retry = 0; retry < 8; retry++) {
        const s = g.state().houses[h.id];
        if (i < 4 ? s.windows[i] : s.reinforced[i - 4] && s.closed[i - 4]) break;
        g.interact();
      }
    }
    g.teleport(h.x, h.z + 1); g.interact();
  }, house);
  await page.getByRole('button', { name: 'UNTERSCHLUPF AKTIVIEREN', exact: true }).click();
  check((await state()).houses[house.id].claimed, 'House is secured through normal construction');
  await page.getByRole('button', { name: 'ZURÜCK INS SPIEL · ESC', exact: true }).click();
  await page.keyboard.press('m');
  const marker = map.locator(`[data-map-house="${house.id}"]`);
  check(await marker.getAttribute('data-secured') === 'true', 'Claimed safehouse is marked secured');
  check((await marker.getAttribute('aria-label')).includes('Respawnpunkt'), 'Respawn remains identifiable');
  await page.locator('.map-directory-details>summary').click();
  await page.getByRole('region', { name: 'Gesicherte Unterschlüpfe', exact: true }).getByRole('button', { name: new RegExp(house.name) }).click();
  await page.screenshot({ path: 'output/playwright/map-secured-safehouse.png' });
  await page.keyboard.press('m');
  await page.evaluate(h => { const g = window.__nachtwache; g.resume(); g.teleport(h.x, h.z + 5.7); g.interact(); }, house);
  check(!(await state()).houses[house.id].closed[1], 'Opening the door changes its real state');
  await page.keyboard.press('m');
  check(await marker.getAttribute('data-secured') === 'true' && (await marker.getAttribute('aria-label')).includes('Eingang offen'), 'Opening an entrance preserves the secured marker and shows the open entrance');
  await page.keyboard.press('m');
  await page.evaluate(() => window.__nachtwache.menu());
  await page.reload(); await ready();
  await page.getByRole('button', { name: /^WEITERSPIELEN/ }).click();
  check((await state()).talkedTo.includes('mara') && (await state()).talkedTo.includes('ranger-guard'), 'Contacts survive a page reload');
  await page.keyboard.press('m'); await map.waitFor();
  check(await map.locator('[data-map-npc]').count() === 2 && await marker.getAttribute('data-secured') === 'true', 'Known contacts and secured house restore on the map');
  await page.keyboard.press('m');
  await page.evaluate(() => { const g = window.__nachtwache; g.start(); g.pause(); });
  check((await state()).talkedTo.length === 0 && !(await state()).houses[house.id].claimed, 'New game resets contacts and houses');
  return { passed: ['spoken NPCs only', 'guarded refuges', 'contact selection', 'real house construction', 'secured house marker', 'respawn marker', 'open door status', 'saved contacts and shelters', 'new game reset'] };
}
