/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async(page)=>{
  await page.evaluate(()=>{
    const g=window.__nachtwache;g.start();g.teleport(-53,-37);g.interact();g.teleport(-19,-4);g.interact();g.teleport(-13,-5);g.interact();g.teleport(17,-2,Math.PI);
  });
  let secured=false;
  for(let i=0;i<110;i++){
    const state=await page.evaluate(()=>window.__nachtwache.state());
    if(state.health<=0)throw Error('Died during cemetery combat');
    if(!state.enemies.some(e=>e.alive&&Math.hypot(e.x-17,e.z-15)<8)){secured=true;break;}
    await page.evaluate(()=>{const g=window.__nachtwache,s=g.state();if(s.ammo<=0){g.reload();return;}const e=s.enemies.filter(e=>e.alive&&e.visible).sort((a,b)=>Math.hypot(a.x-s.position[0],a.z-s.position[2])-Math.hypot(b.x-s.position[0],b.z-s.position[2]))[0];if(e){g.aim(...e.head);g.shoot();}});
    await page.waitForTimeout(260);
  }
  if(!secured)throw Error('Cemetery not secured');
  await page.evaluate(()=>{const g=window.__nachtwache;g.teleport(17,15);g.interact();g.teleport(48,23);g.interact();g.teleport(57,20);g.interact();g.teleport(60,-25);g.interact();g.teleport(71,-24);g.interact();g.teleport(66,-25);});
  await page.keyboard.press('5');
  let state=await page.evaluate(()=>window.__nachtwache.state());
  if(state.stage!==4||!state.repaired)throw Error('Main story or tower repair failed: '+JSON.stringify({stage:state.stage,repaired:state.repaired}));
  // Noah follows the real navigation controller; wait while defending the route.
  for(let i=0;i<110;i++){
    state=await page.evaluate(()=>window.__nachtwache.state());
    if(Math.hypot(state.noah[0]-66,state.noah[2]+25)<12)break;
    await page.evaluate(()=>{const g=window.__nachtwache,s=g.state();if(s.ammo<=0){g.reload();return;}const e=s.enemies.find(e=>e.alive&&e.visible&&Math.hypot(e.x-66,e.z+25)<24);if(e){g.aim(...e.head);g.shoot();}});
    await page.waitForTimeout(260);
  }
  await page.evaluate(()=>window.__nachtwache.interact());state=await page.evaluate(()=>window.__nachtwache.state());
  if(state.stage!==5)throw Error('Noah did not reach the sender: '+JSON.stringify(state.noah));
  await page.evaluate(()=>window.__nachtwache.pause());
  return {stage:state.stage,timer:state.timer,kills:state.kills,noah:state.noah,health:state.health};
}
