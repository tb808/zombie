/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async(page)=>{
  const check=(value,message)=>{if(!value)throw Error(message);};
  const state=()=>page.evaluate(()=>window.__nachtwache.state());
  const at=async(x,z)=>page.evaluate(({x,z})=>{const g=window.__nachtwache;g.resume();g.teleport(x,z);g.interact();while(g.state().dialogue)g.nextDialogue();}, {x,z});
  const mission=async(id)=>check((await state()).mission===id,`Expected mission ${id}, got ${(await state()).mission}`);
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.resume();});
  await at(-53,-37);await mission('map');
  await page.keyboard.press('m');await page.locator('.map-viewport svg').waitFor();
  await page.keyboard.press('m');await mission('supplies');
  await at(-60,-36);await mission('water');
  await page.evaluate(()=>window.__nachtwache.consume('water'));await mission('aim');
  await page.evaluate(()=>{const g=window.__nachtwache;g.teleport(-49,-37);g.aim(...g.state().trainingTarget);g.setAiming(true);g.shoot();});
  await mission('reload');await page.evaluate(()=>window.__nachtwache.reload());
  await page.waitForFunction(()=>!window.__nachtwache.state().reloading);await mission('axe');
  await page.evaluate(()=>{const g=window.__nachtwache;g.switchWeapon();g.teleport(-49,-36);g.aim(...g.state().trainingTarget);});
  await page.waitForFunction(()=>window.__nachtwache.state().shotCooldown<=0);
  await page.evaluate(()=>{const g=window.__nachtwache;g.shoot();g.switchWeapon();});await mission('fuel');
  await at(-19,-4);await mission('flare');await at(8,5);
  await page.evaluate(()=>window.__nachtwache.consume('flare'));await mission('noah');
  await page.evaluate(()=>window.__nachtwache.teleport(17,-2));
  for(let i=0;i<150;i++){
    const s=await state();check(s.health>0,'Died in cemetery');
    if(!s.enemies.some(e=>e.alive&&Math.hypot(e.x-17,e.z-15)<8))break;
    await page.evaluate(i=>{
      const g=window.__nachtwache;g.resume();const s=g.state();
      if(s.health<65&&s.inventory.medkit)g.consume('medkit');
      try{g.teleport(17+Math.sin(i*.5)*3,-2);}catch{/* Keep valid combat position. */}
      if(s.ammo<=0){g.reload();return;}
      const e=s.enemies.filter(e=>e.alive&&e.visible).sort((a,b)=>Math.hypot(a.x-17,a.z-15)-Math.hypot(b.x-17,b.z-15))[0];
      if(e){g.aim(...e.head);g.shoot();}
    },i);await page.waitForTimeout(250);
  }
  await at(17,15);await mission('planks');
  await at(-81,15);await mission('house');await at(-77,17);await at(-74,7);
  for(const [x,z] of [[-81.6,-.7],[-72.4,-.7],[-81.6,10.7],[-72.4,10.7],[-77,-.7],[-77,10.7]])await at(x,z);
  await at(-77,6);await at(-77,6);
  await page.getByRole('button',{name:'UNTERSCHLUPF AKTIVIEREN',exact:true}).click();await mission('lamp');
  await page.getByRole('button',{name:'BIS 19 UHR WARTEN',exact:true}).click();
  await page.getByRole('button',{name:'ZURÜCK INS SPIEL · ESC',exact:true}).click();
  await page.keyboard.press('f');await mission('sleep');await at(-77,6);
  await page.getByRole('button',{name:'BIS 06 UHR SCHLAFEN',exact:true}).click();await mission('weber');
  await page.getByRole('button',{name:'ZURÜCK INS SPIEL · ESC',exact:true}).click();
  await at(-77,10.7); // Open the front door so Noah can follow.
  await at(114,-62);await mission('lenz');await at(120,85);await mission('fuse');
  await at(178,-23);await at(181,-18);await mission('power');await at(120,90);await mission('shotgun');
  await at(181,-70);await at(181,-74);await mission('archive');
  await at(184,-136);await at(120,-132);await at(120,-136);await mission('serum');
  await at(48,23);await mission('repair');await at(57,20);await at(60,-25);await at(71,-24);
  await page.evaluate(()=>{const g=window.__nachtwache;g.teleport(66,-25);g.consume('scrap');});await mission('tower');
  for(let i=0;i<180;i++){
    const s=await state();check(s.health>0,'Died during escort');
    if(Math.hypot(s.noah[0]-66,s.noah[2]+25)<12)break;
    await page.evaluate(()=>{
      const g=window.__nachtwache;g.resume();const s=g.state();if(s.health<70&&s.inventory.medkit)g.consume('medkit');
      if(s.ammo<=0){g.reload();return;}const e=s.enemies.find(e=>e.alive&&e.visible&&Math.hypot(e.x-66,e.z+25)<24);if(e){g.aim(...e.head);g.shoot();}
    });await page.waitForTimeout(260);
  }
  await at(66,-25);await mission('defend');
  const result=await state();await page.evaluate(()=>window.__nachtwache.pause());
  check(result.repaired&&result.houses.lodge.claimed&&result.respawn==='lodge','Tutorial state survives the complete route');
  await page.screenshot({path:'output/playwright/campaign-final-defense.png'});
  return {stage:result.stage,mission:result.mission,timer:result.timer,noah:result.noah,health:result.health,passed:['all 24 campaign steps','aimed target','reload completion','axe practice','flare tutorial','Noah rescue','first shelter','lamp','first night','Weber','power','armory','archive','serum','tower repair','escort']};
}
