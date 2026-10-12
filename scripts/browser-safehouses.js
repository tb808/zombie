/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async(page)=>{
  const check=(value,message)=>{if(!value)throw Error(message);};
  await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled);
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.resume();});
  const houses=await page.evaluate(()=>window.__nachtwache.campaign().houses.map(h=>[h.id,h.x,h.z]));
  for(const [id,x,z] of houses){
    const clearInterior=async()=>{
      for(let i=0;i<30;i++){
        const s=await page.evaluate(()=>window.__nachtwache.state());
        check(s.health>0,`${id}: player survived construction`);
        if(!s.enemies.some(e=>e.alive&&Math.abs(e.x-x)<7.4&&Math.abs(e.z-z)<6.9))return;
        await page.evaluate(({x,z})=>{
          const g=window.__nachtwache;g.resume();g.teleport(x,z+1);
          const s=g.state();if(s.health<70&&s.inventory.medkit)g.consume('medkit');
          if(s.ammo<=0){g.reload();return;}
          const e=s.enemies.find(e=>e.alive&&Math.abs(e.x-x)<7.4&&Math.abs(e.z-z)<6.9);if(e){g.aim(...e.head);g.setAiming(true);g.shoot();}
        },{x,z});
        await page.waitForTimeout(250);
      }
      throw Error(`${id}: interior remains occupied`);
    };
    await page.evaluate(({x,z})=>{
      const g=window.__nachtwache;g.resume();
      for(const [px,pz] of [[x-4,z+10],[x,z+12],[x+3,z+2]]){g.teleport(px,pz);g.interact();}
      g.teleport(x,z+1);g.interact(); // Provision the bed.
      g.interact(); // Open management before any barricades are built.
    },{x,z});
    check(await page.getByRole('button',{name:'UNTERSCHLUPF AKTIVIEREN',exact:true}).isDisabled(),'Incomplete houses cannot be activated');
    await page.getByRole('button',{name:'ZURÜCK INS SPIEL · ESC',exact:true}).click();
    await clearInterior();
    await page.evaluate(({id,x,z})=>{
      const g=window.__nachtwache;g.resume();
      const points=[[-4.6,-5.7],[4.6,-5.7],[-4.6,5.7],[4.6,5.7],[0,-5.7],[0,5.7]];
      for(let i=0;i<points.length;i++){
        g.teleport(x+points[i][0],z+points[i][1]);
        for(let retry=0;retry<8;retry++){
          const h=g.state().houses[id];if(i<4?h.windows[i]:h.reinforced[i-4]&&h.closed[i-4])break;
          g.interact(); // Nearby supplies can be collected before the window action.
        }
      }
      g.teleport(x,z+1);g.interact();
    },{id,x,z});
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
    {
      await page.getByRole('button',{name:'BIS 19 UHR WARTEN',exact:true}).click();
      check(await page.getByRole('button',{name:'BIS 06 UHR SCHLAFEN',exact:true}).isEnabled(),'Waiting reaches night');
      if(id==='lodge')await page.screenshot({path:'output/playwright/safehouse-night.png'});
      const night=await page.evaluate(()=>window.__nachtwache.environment());
      check(night.gates.find(g=>g.id===id).uv,`${id}: claimed shelter has UV at night`);
      await page.getByRole('button',{name:'BIS 06 UHR SCHLAFEN',exact:true}).click();
      state=await page.evaluate(()=>window.__nachtwache.state());
      check(Math.abs((await page.evaluate(()=>window.__nachtwache.environment())).hours-6)<.001,`${id}: sleep reaches next morning`);
    }
    await page.getByRole('button',{name:'ZURÜCK INS SPIEL · ESC',exact:true}).click();
    await page.waitForFunction(()=>window.__nachtwache.state().invulnerable<=0);
    const before=await page.evaluate(({x,z})=>{
      const g=window.__nachtwache;g.resume();g.teleport(x,z+5.7);g.interact(); // Open front door.
      const s=g.state();g.teleport(x,z+1);g.hurt(200);return s;
    },{x,z});
    check(!before.houses[id].closed[1]&&!before.protectedHouse,'Opening a reinforced door suspends shelter safety');
    if(id==='lodge'){
      await page.evaluate(()=>window.__nachtwache.menu());await page.reload();
      await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});
      await page.getByRole('button',{name:/^WEITERSPIELEN/}).click();
      check((await page.evaluate(()=>window.__nachtwache.state())).health===0,'Death restores without silently reviving the player');
    }
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
  return {houses:houses.length,passed:['all buildable houses','incomplete activation blocked','clear interior required','construction costs','daytime sleep blocked','wait until night','next-day morning','door safety','all respawn locations','quest preservation','no supply or ammo duplication','clean reset']};
}
