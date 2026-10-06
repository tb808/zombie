/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async (page) => {
  const check=(condition,message)=>{if(!condition)throw new Error(message);};
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.teleport(150,110,Math.PI);g.spawn(150,120,'walker');});
  await page.waitForTimeout(650);
  await page.evaluate(()=>window.__nachtwache.resume());
  for(let i=0;i<2;i++){
    await page.evaluate(()=>{const g=window.__nachtwache,e=g.state().enemies.find(e=>e.alive);g.aim(...e.head);g.shoot();});
    await page.waitForFunction(()=>window.__nachtwache.state().shotCooldown<=0,{},{timeout:10000});
  }
  check(await page.evaluate(()=>window.__nachtwache.state().kills)===1,'Headshots must kill the walker');
  await page.evaluate(()=>{const g=window.__nachtwache;g.reload();g.switchWeapon();});
  await page.waitForTimeout(1450);
  await page.evaluate(()=>window.__nachtwache.switchWeapon());
  let state=await page.evaluate(()=>window.__nachtwache.state());
  check(state.ammo===10&&state.reserve===48,'Cancelled reload cannot create ammunition');
  await page.evaluate(()=>window.__nachtwache.reload());await page.waitForFunction(()=>!window.__nachtwache.state().reloading,{},{timeout:10000});
  state=await page.evaluate(()=>window.__nachtwache.state());check(state.ammo===12&&state.reserve===46,'Reload transfers precisely the missing rounds');
  await page.evaluate(()=>{const g=window.__nachtwache;g.switchWeapon();g.spawn(150,108.4,'crawler');});await page.waitForFunction(()=>window.__nachtwache.state().shotCooldown<=0,{},{timeout:10000});
  state=await page.evaluate(()=>{const g=window.__nachtwache,e=g.state().enemies.find(e=>e.alive&&e.kind==='crawler');g.aim(...e.head);g.shoot();return g.state();});
  check(state.kills===2&&state.stamina<=81,'Melee hits low enemies while looking down and consumes stamina');
  await page.evaluate(()=>{
    const g=window.__nachtwache;
    g.teleport(120,85);g.interact();while(g.state().dialogue)g.nextDialogue();g.teleport(178,-23);g.interact();while(g.state().dialogue)g.nextDialogue();g.teleport(181,-18);g.interact();while(g.state().dialogue)g.nextDialogue();
    g.teleport(120,90);g.interact();while(g.state().dialogue)g.nextDialogue();g.teleport(181,-70);g.interact();while(g.state().dialogue)g.nextDialogue();g.teleport(181,-74);g.interact();while(g.state().dialogue)g.nextDialogue();
    g.teleport(114,-61);g.interact();while(g.state().dialogue)g.nextDialogue();g.teleport(120,-71);g.interact();while(g.state().dialogue)g.nextDialogue();g.teleport(181,87);g.interact();while(g.state().dialogue)g.nextDialogue();
    g.teleport(-120,124);g.interact();while(g.state().dialogue)g.nextDialogue();g.teleport(114,-61);g.interact();while(g.state().dialogue)g.nextDialogue();
    g.teleport(184,-136);g.interact();while(g.state().dialogue)g.nextDialogue();g.teleport(181,-136);g.interact();while(g.state().dialogue)g.nextDialogue();g.teleport(120,-132);g.interact();while(g.state().dialogue)g.nextDialogue();g.teleport(120,-136);g.interact();while(g.state().dialogue)g.nextDialogue();
  });
  state=await page.evaluate(()=>window.__nachtwache.state());
  check(state.powerQuest===3&&state.inventory.scrap===1,'Generator consumes two parts and completes Lenz quest');
  check(state.benQuest===4&&state.evidence.includes('ben'),'Find Ben and return to Weber');
  check(state.keycard&&state.evidence.includes('archive')&&state.doors.every(d=>d.open),'Keycard and power open archive');
  check(state.arsenal.shotgun.owned&&state.arsenal.rifle.owned,'Both rare weapons can be acquired');
  await page.keyboard.press('j');await page.screenshot({path:'output/playwright/journal-quests.png'});
  const paused=await page.evaluate(()=>window.__nachtwache.state().elapsed);await page.waitForTimeout(400);
  check(await page.evaluate(()=>window.__nachtwache.state().elapsed)===paused,'Journal pauses gameplay');
  await page.keyboard.press('j');
  await page.evaluate(()=>window.__nachtwache.start());state=await page.evaluate(()=>window.__nachtwache.state());
  check(state.stage===0&&state.powerQuest===0&&state.benQuest===0&&state.evidence.length===0&&state.doors.every(d=>!d.open),'New run resets quest and door state');
  check(!state.arsenal.rifle.owned&&!state.arsenal.shotgun.owned&&state.ammo===12,'New run resets equipment');
  return {passed:['headshots','reload cancellation','ammo conservation','melee low targets','generator','armory','Ben','archive','weapon unlocks','journal pause','clean restart']};
}
