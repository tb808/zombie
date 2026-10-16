/* eslint-disable @typescript-eslint/no-unused-expressions -- Run with Playwright CLI's run-code --filename. */
async (page) => {
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const state = () => page.evaluate(() => window.__nachtwache.state());
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => window.__nachtwache && !document.querySelector('.start-actions .secondary')?.disabled, {}, { timeout: 90000 });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.evaluate(() => window.__nachtwache.menu());
  await page.screenshot({ path: 'output/playwright/ui-title.png' });
  await page.evaluate(() => { window.__nachtwache.start(); window.__nachtwache.resume(); });
  await page.locator('.hud').waitFor();
  await page.screenshot({ path: 'output/playwright/ui-hud.png' });
  check(await page.locator('.quickbelt>div').count() === 5, 'Five hotbar slots remain available');
  check(await page.locator('.story-goal,.mission-reason').count() === 0, 'Gameplay shows one concise objective');
  const hudFits = async () => page.evaluate(() => {
    const selectors = ['.fps-mission', '.field-status', '.vitals', '.quickbelt', '.fps-ammo'];
    const boxes = selectors.map(s => document.querySelector(s).getBoundingClientRect());
    return boxes.every(b => b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight)
      && boxes.every((a, i) => boxes.slice(i + 1).every(b => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top));
  });
  for (const width of [1440, 1280, 960, 720, 390]) {
    await page.setViewportSize({ width, height: 900 }); await frames();
    check(await hudFits(), `HUD fits without overlapping at ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.keyboard.press('m');
  await page.getByText('Die Karte hat Mara.', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const g = window.__nachtwache, p = g.campaign().start.mara;
    g.resume(); g.teleport(p.x, p.z); g.interact();
    for (let i = 0; i < 64 && g.state().dialogue; i++) g.nextDialogue();
  });
  check((await state()).hasMap, 'Mara still hands over the map through conversation');
  const beforeOpen = Date.now();
  await page.keyboard.press('m');
  const map = page.locator('.map-viewport svg'); await map.waitFor(); await frames();
  const firstOpenMs = Date.now() - beforeOpen;
  check(await map.getAttribute('viewBox') === '-1200 -1000 2400 2000', 'Overview covers the whole playable world');
  const roads = await page.evaluate(() => window.__nachtwache.world().roads.map(r => r.id));
  for (const id of roads) check(await map.locator(`[data-map-road="${id}"]`).count() === 1, `World road ${id} appears exactly once`);
  check(await map.locator('[data-map-contour]').count() === 11 && (await map.locator('[data-map-forest]').getAttribute('d')).length > 100, 'Survey has terrain contours and continuous woodland');
  check(await map.locator('[data-map-npc="mara"]').count() === 1 && await map.locator('[data-map-npc="weber"]').count() === 0, 'Map only reveals people already met');
  const labelsDoNotOverlap = () => page.evaluate(() => {
    const boxes = [...document.querySelectorAll('[data-map-label]')].map(n => n.getBoundingClientRect());
    return boxes.every((a, i) => boxes.slice(i + 1).every(b => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top));
  });
  check(await labelsDoNotOverlap(), 'Overview labels do not collide');
  const playerSize = (await map.locator('[data-map-player]').boundingBox()).width;
  await page.screenshot({ path: 'output/playwright/ui-map-overview.png' });
  check(await page.locator('.map-caption').evaluate(el => el.getBoundingClientRect().bottom < innerHeight), 'Map legend fits on the first desktop screen');
  await page.getByRole('button', { name: 'Karte vergrößern' }).click();
  check(await map.getAttribute('viewBox') !== '-1200 -1000 2400 2000', 'Zoom buttons change the view');
  check(Math.abs((await map.locator('[data-map-player]').boundingBox()).width - playerSize) < 1, 'Map symbols retain their readable size on zoom');
  await map.focus(); await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Home');
  check(await map.getAttribute('viewBox') === '-1200 -1000 2400 2000', 'Home restores the overview');
  await page.getByRole('button', { name: 'Mein Standort' }).click();
  const [x, z, w, h] = (await map.getAttribute('viewBox')).split(' ').map(Number), s = await state();
  check(s.position[0] >= x && s.position[0] <= x + w && s.position[2] >= z && s.position[2] <= z + h, 'Locate player centers on the real position');
  check(await labelsDoNotOverlap(), 'Detail labels do not collide');
  const box = await map.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const beforeWheel = await map.getAttribute('viewBox'); await page.mouse.wheel(0, -300); await frames();
  check(await map.getAttribute('viewBox') !== beforeWheel, 'Mouse wheel zooms the map');
  const beforeDrag = await map.getAttribute('viewBox');
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 30, { steps: 5 }); await page.mouse.up();
  check(await map.getAttribute('viewBox') !== beforeDrag, 'Dragging pans the map');
  await page.getByRole('button', { name: 'Mein Standort' }).click();
  await page.screenshot({ path: 'output/playwright/ui-map-detail.png' });
  await page.locator('.map-directory-details>summary').click();
  await page.getByRole('region', { name: 'Bekannte Gesprächspartner', exact: true }).getByRole('button', { name: /Mara/ }).click();
  await page.screenshot({ path: 'output/playwright/ui-map-contact.png' });
  const paused = (await state()).elapsed; await frames();
  check((await state()).elapsed === paused, 'Map keeps gameplay paused');
  await page.getByRole('button', { name: 'Ganze Karte', exact: true }).click();
  await page.locator('.map-directory-details>summary').click();
  for (const width of [720, 390]) {
    await page.setViewportSize({ width, height: 900 }); await frames();
    await page.locator('.field-journal').evaluate(el => el.scrollTo(0, 0));
    check(await page.locator('.field-journal').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `Journal fits at ${width}px without horizontal overflow`);
    check(await labelsDoNotOverlap(), `Labels remain separated at ${width}px`);
    await page.screenshot({ path: `output/playwright/ui-map-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.keyboard.press('Escape'); await page.keyboard.press('i');
  await page.getByRole('heading', { name: 'Inventar & Hotbar' }).waitFor();
  await page.screenshot({ path: 'output/playwright/ui-inventory.png' });
  await page.getByRole('button', { name: /^Fundstücke/ }).click();
  await page.screenshot({ path: 'output/playwright/ui-notes.png' });
  await page.keyboard.press('Escape'); await page.evaluate(() => window.__nachtwache.menu());
  return { firstOpenMs, passed: ['concise HUD', 'five viewport sizes', 'map handover', 'whole world', 'shared roads', 'terrain survey', 'known contacts', 'label collisions', 'constant symbol size', 'buttons, keyboard, wheel and drag', 'player position', 'contact selection', 'paused world', 'narrow journal', 'inventory'] };
}
