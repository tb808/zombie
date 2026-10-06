/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async (page) => {
  const check=(condition,message)=>{if(!condition)throw new Error(message);};
  await page.waitForFunction(()=>window.__nachtwache && !document.querySelector('.title-card button')?.disabled);
  await page.evaluate(()=>{window.__nachtwache.start();window.__nachtwache.pause();});
  for (const [hour,name] of [[12,'day'],[18,'dusk'],[0,'night'],[6,'dawn']]) {
    await page.evaluate(hour=>window.__nachtwache.setTime(hour),hour);
    await page.waitForTimeout(250);
    const light=await page.evaluate(()=>window.__nachtwache.environment());
    check(hour===12?light.sun>3:hour===0?light.sun===0&&light.moon>.2:true,`${name}: celestial lighting`);
    await page.screenshot({path:`output/playwright/world-${name}.png`});
  }
  const elapsed=await page.evaluate(()=>window.__nachtwache.state().elapsed);
  await page.waitForTimeout(300);
  check(await page.evaluate(()=>window.__nachtwache.state().elapsed)===elapsed,'Paused world time must stay fixed');
  await page.evaluate(()=>{const g=window.__nachtwache;g.teleport(120,92,Math.PI);g.setTime(12);g.spawn(120,85,'tank');});
  check(await page.evaluate(()=>window.__nachtwache.state().enemies.length)===0,'No enemy may spawn inside a refuge');
  await page.evaluate(()=>{const g=window.__nachtwache;g.spawn(120,98,'tank');g.resume();});
  for(let i=0;i<25;i++) {
    await page.waitForTimeout(150);
    const s=await page.evaluate(()=>window.__nachtwache.state());
    check(s.health===100,'Guarded refuge protects player');
    check(s.enemies.every(e=>!e.alive||Math.abs(e.x-120)>=13||Math.abs(e.z-80)>=14),'Enemy cannot cross the guarded entrance');
  }
  await page.evaluate(()=>{const g=window.__nachtwache;g.pause();g.teleport(120,91,0);g.setTime(12);});
  await page.waitForTimeout(250);await page.screenshot({path:'output/playwright/school-refuge.png'});
  await page.evaluate(()=>{window.__nachtwache.start();window.__nachtwache.pause();});
  check(await page.evaluate(()=>window.__nachtwache.environment().clock)==='09:00','Restart resets world time');
  return {passed:['day/dusk/night/dawn','pause','refuge spawn exclusion','guarded entrance','restart'],environment:await page.evaluate(()=>window.__nachtwache.environment())};
}
