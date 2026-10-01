/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async(page)=>{
  await page.evaluate(()=>window.__nachtwache.resume());
  await page.keyboard.press('4');
  for(let i=0;i<230;i++){
    const state=await page.evaluate(()=>window.__nachtwache.state());
    if(state.health<=0)throw Error('Defense failed: player died');
    if(state.timer<=0){await page.screenshot({path:'output/playwright/story-complete.png'});return {won:true,kills:state.kills,health:state.health,timer:state.timer};}
    if(state.health<70&&state.inventory.medkit>0)await page.keyboard.press('1');
    await page.evaluate(i=>{
      const g=window.__nachtwache;
      // A small movement around the sender keeps attack windups dodgeable.
      try{g.teleport(66+Math.sin(i*.2)*4,-25+Math.cos(i*.2)*4);}catch{/* Keep the current valid position beside cover. */}
      const s=g.state();if(s.ammo<=0){g.reload();return;}
      const target=s.enemies.filter(e=>e.alive&&e.visible).sort((a,b)=>Math.hypot(a.x-s.position[0],a.z-s.position[2])-Math.hypot(b.x-s.position[0],b.z-s.position[2]))[0];
      if(target){g.aim(...target.head);g.shoot();}
    },i);
    await page.waitForTimeout(240);
  }
  throw Error('Defense timer did not finish within the test window');
}
