/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async(page)=>{
  const check=(value,message)=>{if(!value)throw Error(message);};
  await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled);
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.pause();g.setTime(12);});
  await page.waitForTimeout(200);
  let env=await page.evaluate(()=>window.__nachtwache.environment());
  check(env.gates.length===8&&env.gates.every(g=>!g.open&&!g.uv),'Eight closed gates, daytime UV off');
  check(env.gates.filter(g=>['lodge','fire','housing','farm'].includes(g.id)).every(g=>!g.lamps),'No UV installed in unsecured houses');
  await page.evaluate(()=>{const g=window.__nachtwache;g.resume();g.teleport(122.4,91.4);g.interact();g.pause();});
  check(await page.evaluate(()=>!window.__nachtwache.blocked(120,93)),'Opening the school gate clears player collision');
  await page.evaluate(()=>{const g=window.__nachtwache;g.resume();g.teleport(120,93);g.interact();g.pause();});
  check((await page.evaluate(()=>window.__nachtwache.environment())).gates.find(g=>g.id==='shelter').open,'Cannot close the gate onto the player');
  await page.evaluate(()=>{const g=window.__nachtwache;g.resume();g.teleport(122.4,91.4);g.interact();g.pause();});
  check(await page.evaluate(()=>window.__nachtwache.blocked(120,93)),'Closing the gate restores collision');
  await page.evaluate(()=>{const g=window.__nachtwache;g.resume();g.interact();g.setTime(21);g.teleport(120,92);g.pause();});
  await page.waitForTimeout(200);
  env=await page.evaluate(()=>window.__nachtwache.environment());
  check(env.gates.find(g=>g.id==='shelter').open&&env.uvProtected==='shelter','UV protects an open gate after dusk');
  check(env.threat.speed===1.3&&env.threat.damage===1.45,'Night applies greater speed and damage');
  await page.evaluate(()=>{const g=window.__nachtwache;g.spawn(120,85,'tank');g.spawn(120,98,'tank');g.resume();});
  for(let i=0;i<24;i++){
    await page.waitForTimeout(150);
    const state=await page.evaluate(()=>window.__nachtwache.state());
    check(state.health===100,'UV shields the player');
    check(state.enemies.every(e=>!e.alive||Math.abs(e.x-120)>=13||Math.abs(e.z-80)>=14),'Zombies stay outside the open UV-protected gate');
  }
  await page.evaluate(()=>{const g=window.__nachtwache;g.pause();g.teleport(120,96);});
  await page.screenshot({path:'output/playwright/safehouse-uv-gate.png'});
  await page.evaluate(()=>{const g=window.__nachtwache;g.teleport(120,31);g.spawn(120,34,'walker');g.pause();});
  env=await page.evaluate(()=>window.__nachtwache.environment());
  check(!env.uvProtected&&!env.gates.find(g=>g.id==='fire').uv,'An unsecured fire station has no UV protection at night');
  check((await page.evaluate(()=>window.__nachtwache.state())).enemies.some(e=>e.alive&&Math.abs(e.x-120)<1&&Math.abs(e.z-34)<1),'Enemies can occupy the unsecured house');
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.resume();
    for(const [x,z] of [[-81,15],[-77,17],[-74,7]]){g.teleport(x,z);g.interact();}
    g.teleport(-77,6);g.interact();
    for(const [x,z] of [[-81.6,-.7],[-72.4,-.7],[-81.6,10.7],[-72.4,10.7],[-77,-.7],[-77,10.7]]){g.teleport(x,z);g.interact();}
    g.teleport(-77,6);g.interact();});
  await page.getByRole('button',{name:'UNTERSCHLUPF AKTIVIEREN',exact:true}).click();
  await page.evaluate(()=>{window.__nachtwache.setTime(21);});await page.waitForTimeout(200);
  check((await page.evaluate(()=>window.__nachtwache.environment())).gates.find(g=>g.id==='lodge').uv,'Securing and activating a house installs automatic UV');
  await page.getByRole('button',{name:'ZURÜCK INS SPIEL · ESC',exact:true}).click();
  await page.evaluate(()=>{const g=window.__nachtwache;g.resume();g.teleport(-77,10.7);g.interact();g.teleport(-74.6,12.6);g.interact();g.pause();});
  env=await page.evaluate(()=>window.__nachtwache.environment());
  check(env.gates.find(g=>g.id==='lodge').open&&env.uvProtected==='lodge','Claimed house keeps UV protection with open gate and door');
  await page.evaluate(()=>window.__nachtwache.setTime(6.5));await page.waitForTimeout(200);
  check((await page.evaluate(()=>window.__nachtwache.environment())).gates.every(g=>!g.uv),'UV switches off at 06:30');
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.pause();});
  env=await page.evaluate(()=>window.__nachtwache.environment());
  check(env.gates.every(g=>!g.open&&!g.uv)&&!env.gates.find(g=>g.id==='lodge').lamps,'Restart resets gates and player-built UV');
  return {passed:['eight gates','player collision','gate occupancy','night strength','UV with open gates','unsecured house vulnerability','claim installs UV','morning shutdown','reset']};
}
