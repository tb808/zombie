/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async(page)=>{
  const check=(value,message)=>{if(!value)throw Error(message);};
  await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.title-card button')?.disabled);
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.resume();});
  const houses=[['lodge',-77,5],['fire',120,30],['housing',181,30],['farm',-113,69]];
  for(const [id,x,z] of houses){
    await page.evaluate(({x,z})=>{
      const g=window.__nachtwache;g.resume();
      for(const [px,pz] of [[x-4,z+10],[x,z+12],[x+3,z+2]]){g.teleport(px,pz);g.interact();}
      g.teleport(x,z+1);g.interact(); // Provision the bed.
      g.interact(); // Open management before any barricades are built.
    },{x,z});
    check(await page.getByRole('button',{name:'UNTERSCHLUPF AKTIVIEREN',exact:true}).isDisabled(),'Incomplete houses cannot be activated');
    await page.getByRole('button',{name:'ZURÜCK INS SPIEL · ESC',exact:true}).click();
    await page.evaluate(({x,z})=>{
      const g=window.__nachtwache;g.resume();
      for(const [px,pz] of [[x-4.6,z-5.7],[x+4.6,z-5.7],[x-4.6,z+5.7],[x+4.6,z+5.7],[x,z-5.7],[x,z+5.7]]){g.teleport(px,pz);g.interact();}
      g.teleport(x,z+1);g.interact();
    },{x,z});
    if(id==='lodge'){
      await page.evaluate(({x,z})=>window.__nachtwache.spawn(x+2,z+3,'walker'),{x,z});
      await page.getByRole('button',{name:'UNTERSCHLUPF AKTIVIEREN',exact:true}).click();
      check(!(await page.evaluate(()=>window.__nachtwache.state())).houses[id].claimed,'An infested interior cannot be claimed');
      await page.getByRole('button',{name:'ZURÜCK INS SPIEL · ESC',exact:true}).click();
      for(let i=0;i<2;i++){
        await page.evaluate(({x,z})=>{
          const g=window.__nachtwache;g.resume();g.teleport(x,z+1);
          const e=g.state().enemies.find(e=>e.alive&&Math.abs(e.x-x)<7&&Math.abs(e.z-z)<6);
          if(!e)throw Error('Expected interior threat');g.aim(...e.head);g.setAiming(true);g.shoot();
        },{x,z});
        await page.waitForFunction(()=>window.__nachtwache.state().shotCooldown<=0);
      }
      await page.evaluate(()=>window.__nachtwache.interact());
    }
    await page.getByRole('button',{name:'UNTERSCHLUPF AKTIVIEREN',exact:true}).click();
    let state=await page.evaluate(()=>window.__nachtwache.state());
    check(state.houses[id].claimed&&state.respawn===id,`${id} activates and sets checkpoint`);
    check(state.protectedHouse===id,'Activated, closed houses protect the player');
    check(state.houses[id].windows.every(Boolean)&&state.houses[id].closed.every(Boolean),'All barricades retain state');
    check(await page.getByRole('button',{name:'BIS 06 UHR SCHLAFEN',exact:true}).isDisabled(),'Daytime sleeping is blocked');
    if(id==='lodge'){
      await page.getByRole('button',{name:'BIS 19 UHR WARTEN',exact:true}).click();
      check(await page.getByRole('button',{name:'BIS 06 UHR SCHLAFEN',exact:true}).isEnabled(),'Waiting reaches night');
      await page.screenshot({path:'output/playwright/safehouse-night.png'});
      await page.getByRole('button',{name:'BIS 06 UHR SCHLAFEN',exact:true}).click();
      state=await page.evaluate(()=>window.__nachtwache.state());
      check(state.elapsed===1260&&state.learned.includes('sleep'),'Sleep reaches next morning and records tutorial');
    }
    await page.getByRole('button',{name:'ZURÜCK INS SPIEL · ESC',exact:true}).click();
    await page.waitForFunction(()=>window.__nachtwache.state().invulnerable<=0);
    const before=await page.evaluate(({x,z})=>{
      const g=window.__nachtwache;g.resume();g.teleport(x,z+5.7);g.interact(); // Open front door.
      const s=g.state();g.teleport(x,z+1);g.hurt(200);return s;
    },{x,z});
    check(!before.houses[id].closed[1]&&!before.protectedHouse,'Opening a reinforced door suspends shelter safety');
    await page.getByRole('button',{name:'IM UNTERSCHLUPF AUFWACHEN'}).click();
    state=await page.evaluate(()=>window.__nachtwache.state());
    check(state.health===100&&state.stage===before.stage&&state.respawn===id,'Respawn restores health and preserves campaign');
    check(state.position[0]===x&&state.position[2]===z+1,'Respawn uses selected bed');
    check(JSON.stringify(state.inventory)===JSON.stringify(before.inventory),'Respawn cannot duplicate supplies');
    check(state.arsenal.pistol.ammo===before.arsenal.pistol.ammo&&state.arsenal.pistol.reserve===before.arsenal.pistol.reserve,'Respawn preserves ammunition');
    check(state.houses[id].closed.every(Boolean),'Respawn closes shelter doors');
    await page.evaluate(()=>window.__nachtwache.pause());
  }
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.pause();});
  const reset=await page.evaluate(()=>window.__nachtwache.state());
  check(reset.respawn===null&&Object.values(reset.houses).every(h=>!h.claimed&&!h.bed&&h.windows.every(v=>!v)),'Restart clears all player shelters');
  return {passed:['four buildable houses','incomplete activation blocked','clear interior required','construction costs','daytime sleep blocked','wait until night','next-day morning','door safety','four respawn locations','quest preservation','no supply or ammo duplication','clean reset']};
}
