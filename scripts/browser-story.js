/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async(page)=>{
  const check=(v,m)=>{if(!v)throw Error(m);};
  await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});
  const cfg=await page.evaluate(()=>window.__nachtwache.campaign());
  const state=()=>page.evaluate(()=>window.__nachtwache.state());
  const mission=async id=>check((await state()).mission===id,`Expected ${id}, got ${(await state()).mission}`);
  const at=async(x,z,follow=true)=>page.evaluate(({x,z,follow})=>{const g=window.__nachtwache;g.resume();g.teleport(x,z,0,follow);g.interact();while(g.state().dialogue)g.nextDialogue();}, {x,z,follow});
  const combat=()=>page.evaluate(()=>{
    const g=window.__nachtwache;g.resume();const s=g.state();
    if(s.health<=0)throw Error(`Died during ${s.mission}`);
    if(s.health<75&&s.inventory.medkit)g.consume('medkit');
    if(s.thirst<35&&s.inventory.water)g.consume('water');
    if(s.ammo<=0){g.reload();return;}
    const e=s.enemies.filter(e=>e.alive&&e.visible&&Math.hypot(e.x-s.position[0],e.z-s.position[2])<40).sort((a,b)=>Math.hypot(a.x-s.position[0],a.z-s.position[2])-Math.hypot(b.x-s.position[0],b.z-s.position[2]))[0];
    const soldier=g.factions().find(f=>f.alive&&f.side==='hostile'&&f.visible&&Math.hypot(f.position[0]-s.position[0],f.position[2]-s.position[2])<40);if(soldier){g.aim(...soldier.head);g.setAiming(true);g.shoot();}else if(e){g.aim(...e.head);g.setAiming(true);g.shoot();}
  });
  const activity=async m=>{
    await mission(m.id);
    for(let phase=0;phase<12;phase++){
      if((await state()).learned.includes(m.id))break;
      const step=await page.evaluate(phase=>window.__nachtwache.activity().definition?.steps[phase],phase);if(!step)break;
      check((await state()).activities[m.id]?.step===phase||phase===0,`${m.id}: ordered sub-objectives`);
      if(step.kind==='choice'){
        const target=await page.evaluate(()=>window.__nachtwache.activity().target);await at(target.x,target.z);
        const choices={care:'Eva zur mobilen Krankenstation schicken',supplies:'Die Dorfküchen versorgen',signal:'Den Hilferuf offen senden',truth:'Noah überzeugen, den Helfern die Wahrheit zu sagen',front:'Die zivile Notaufnahme unabhängig versorgen',pact:'Ein gemeinsames Schutzabkommen aushandeln'};
        await page.getByRole('button',{name:choices[step.choice]}).click();
        await page.evaluate(()=>{const g=window.__nachtwache;while(g.state().dialogue)g.nextDialogue();});continue;
      }
      if(step.kind==='shelter'){
        const h=cfg.houses.find(h=>h.id===step.house);
        await at(h.x-4,h.z+10);await at(h.x,h.z+12);await at(h.x+3,h.z+2);await at(h.x+4,h.z+10.5);
        for(const [i,[dx,dz]] of [[-4.6,-5.7],[4.6,-5.7],[-4.6,5.7],[4.6,5.7],[0,-5.7],[0,5.7]].entries()){
          for(let retry=0;retry<12;retry++){
            const s=await state(),built=i<4?s.houses[h.id].windows[i]:s.houses[h.id].reinforced[i-4]&&s.houses[h.id].closed[i-4];if(built)break;
            await combat();await at(h.x+dx,h.z+dz);await page.waitForTimeout(100);
          }
        }
        await at(h.x,h.z+1);await at(h.x,h.z+1);
        await page.getByRole('button',{name:'UNTERSCHLUPF AKTIVIEREN',exact:true}).click();
        await page.getByRole('button',{name:'ZURÜCK INS SPIEL · ESC',exact:true}).click();
        await page.waitForFunction(({id,phase})=>window.__nachtwache.state().activities[id].step>phase,{id:m.id,phase});
        continue;
      }
      const target=await page.evaluate(()=>window.__nachtwache.activity().target);
      await at(target.x,target.z);
      if(step.kind==='escort'){
        const from=await page.evaluate(id=>window.__nachtwache.activity().actors.find(a=>a.mission===id).position,m.id);
        const path=await page.evaluate(({from,to})=>window.__nachtwache.route(from,to),{from,to:step});
        check(path.length>0,`${m.id}: escort has a real route`);
        const walking=[];let previous=from;
        for(const point of path){const n=Math.ceil(Math.hypot(point.x-previous.x,point.z-previous.z)/4);for(let i=1;i<=n;i++)walking.push({x:previous.x+(point.x-previous.x)*i/n,z:previous.z+(point.z-previous.z)*i/n});previous=point;}
        for(const point of walking){
          if((await state()).activities[m.id].step>phase)break;
          await page.evaluate(p=>window.__nachtwache.teleport(p.x,p.z,0,true),point);
          for(let i=0;i<90;i++){
            if((await state()).activities[m.id].step>phase)break;
            const actor=await page.evaluate(id=>window.__nachtwache.activity().actors.find(a=>a.mission===id).position,m.id);
            if(Math.hypot(actor.x-point.x,actor.z-point.z)<3.8)break;
            await combat();await page.waitForTimeout(160);
          }
        }
      }
      if(['clear','defend','escort','war'].includes(step.kind)){
        check(step.kind==='escort'||(await state()).activities[m.id].step===phase,`${m.id}: interaction cannot skip ${step.kind}`);
        for(let i=0;i<600;i++){
          if((await state()).activities[m.id].step>phase)break;
          await combat();await page.waitForTimeout(160);
        }
        check((await state()).activities[m.id].step>phase,`${m.id}: ${step.kind} completes in actual gameplay`);
      }
      check((await state()).activities[m.id].step>phase,`${m.id}: completed ${step.label}`);
    }
    check((await state()).learned.includes(m.id),`${m.id}: mission completes only after all actions`);
    await page.evaluate(()=>window.__nachtwache.pause());
    console.log(`Activity complete: ${m.id}`);
  };
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.pause();});
  const start=await state();check(start.position[0]===cfg.start.player.x&&start.position[2]===cfg.start.player.z,'New game actually spawns in Fichtenau');
  await page.screenshot({path:'output/playwright/fichtenau-start.png'});
  await at(cfg.start.mara.x,cfg.start.mara.z);await mission('map');
  await page.keyboard.press('m');await page.locator('.map-viewport svg').waitFor();await page.keyboard.press('m');await mission('supplies');
  await at(cfg.start.supplies.x,cfg.start.supplies.z);await mission('supplies');
  await at(cfg.start.jonas.x,cfg.start.jonas.z);await mission('water');
  check((await state()).learned.includes('jonas-treated'),'Player helps a person in the starting village');
  await page.evaluate(()=>window.__nachtwache.consume('water'));await mission('aim');
  await page.evaluate(p=>{const g=window.__nachtwache;g.resume();g.teleport(p.x,p.z+3);g.aim(...g.state().trainingTarget);g.setAiming(true);g.shoot();},cfg.start.target);await mission('reload');
  await page.evaluate(()=>window.__nachtwache.reload());await page.waitForFunction(()=>!window.__nachtwache.state().reloading);await mission('axe');
  await page.evaluate(p=>{const g=window.__nachtwache;g.switchWeapon();g.teleport(p.x,p.z+2);g.aim(...g.state().trainingTarget);},cfg.start.target);
  await page.waitForFunction(()=>window.__nachtwache.state().shotCooldown<=0);
  await page.evaluate(()=>{const g=window.__nachtwache;g.shoot();g.switchWeapon();});await mission('fuel');
  await at(cfg.camp.x+4,cfg.camp.z+cfg.camp.hz+1.5);
  check((await page.evaluate(()=>window.__nachtwache.environment())).gates.find(g=>g.id==='fichtenau-camp').open,'Opening camp gate works');
  await at(cfg.start.fuel.x,cfg.start.fuel.z);await mission('returnFuel');await at(cfg.start.mara.x,cfg.start.mara.z);await mission('planks');
  const h=cfg.houses.find(h=>h.id===cfg.firstHouse);
  await at(h.x-4,h.z+10);await at(h.x,h.z+12);await mission('house');
  await at(h.x+4,h.z+10.5);check((await page.evaluate(()=>window.__nachtwache.environment())).gates.find(g=>g.id===h.id).open,'Player can enter the claimable house through its gate');
  for(const [dx,dz] of [[-4.6,-5.7],[4.6,-5.7],[-4.6,5.7],[4.6,5.7],[0,-5.7],[0,5.7]])await at(h.x+dx,h.z+dz);
  await at(h.x,h.z+1);await at(h.x,h.z+1);
  await page.getByRole('button',{name:'UNTERSCHLUPF AKTIVIEREN',exact:true}).click();await mission('lamp');
  await page.getByRole('button',{name:'BIS 19 UHR WARTEN',exact:true}).click();await page.getByRole('button',{name:'ZURÜCK INS SPIEL · ESC',exact:true}).click();
  await page.keyboard.press('f');await mission('sleep');await at(h.x,h.z+1);
  await page.getByRole('button',{name:'BIS 06 UHR SCHLAFEN',exact:true}).click();await mission('seecamp');
  const saved=await state();await page.evaluate(()=>window.__nachtwache.menu());await page.reload();
  await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});await page.getByRole('button',{name:/^WEITERSPIELEN/}).click();
  await mission('seecamp');const restored=await state();check(restored.respawn===h.id&&JSON.stringify(restored.houses)===JSON.stringify(saved.houses),'Fichtenau barricades and respawn persist across reload');
  check(JSON.stringify(restored.inventory)===JSON.stringify(saved.inventory),'Building costs survive reload');
  await at(h.x,h.z+5.7);
  for(const m of cfg.missions.filter(m=>m.kind==='activity'&&m.chapter===1))await activity(m);
  await mission('flare');await at(8,5);await page.evaluate(()=>window.__nachtwache.consume('flare'));await mission('noah');
  await page.evaluate(()=>window.__nachtwache.teleport(17,-2));
  for(let i=0;i<160;i++){
    const s=await state();check(s.health>0,'Died during Noah rescue');if(!s.enemies.some(e=>e.alive&&Math.hypot(e.x-17,e.z-15)<8))break;
    await page.evaluate(i=>{const g=window.__nachtwache;g.resume();const s=g.state();if(s.health<65&&s.inventory.medkit)g.consume('medkit');
      try{g.teleport(17+Math.sin(i*.5)*3,-2);}catch{/* Keep valid combat position. */}
      if(s.ammo<=0){g.reload();return;}const e=s.enemies.filter(e=>e.alive&&e.visible).sort((a,b)=>Math.hypot(a.x-17,a.z-15)-Math.hypot(b.x-17,b.z-15))[0];if(e){g.aim(...e.head);g.shoot();}
    },i);await page.waitForTimeout(250);
  }
  await at(17,15);await mission('westMeadows');
  for(const m of cfg.missions.filter(m=>m.kind==='activity'&&m.chapter===2))await activity(m);
  await at(114,-62);await mission('lenz');await at(120,85);await mission('fuse');await at(178,-23);await at(181,-18);await mission('power');await at(120,90);await mission('shotgun');
  await at(181,-70);await at(181,-74);await mission('keycard');await at(184,-136);await mission('archive');await at(120,-132);await at(120,-136);await mission('suburbs');
  for(const m of cfg.missions.filter(m=>m.kind==='activity'&&m.chapter===3))await activity(m);
  await mission('serum');await at(48,23);await page.getByRole('button',{name:'Noah jetzt stabilisieren'}).click();await page.evaluate(()=>{const g=window.__nachtwache;while(g.state().dialogue)g.nextDialogue();});await mission('repair');await at(57,20);await at(60,-25,false);await at(71,-24,false);
  await page.evaluate(()=>{const g=window.__nachtwache;g.teleport(66,-25);g.consume('scrap');});await mission('tower');
  for(let i=0;i<180;i++){
    const s=await state();check(s.health>0,'Died during escort');if(Math.hypot(s.noah[0]-66,s.noah[2]+25)<12)break;
    await page.evaluate(()=>{const g=window.__nachtwache;g.resume();const s=g.state();if(s.health<70&&s.inventory.medkit)g.consume('medkit');if(s.ammo<=0){g.reload();return;}const e=s.enemies.find(e=>e.alive&&e.visible&&Math.hypot(e.x-66,e.z+25)<24);if(e){g.aim(...e.head);g.shoot();}});await page.waitForTimeout(260);
  }
  await at(66,-25,false);await mission('defend');
  const result=await state();await page.evaluate(()=>window.__nachtwache.pause());
  const world=await page.evaluate(()=>window.__nachtwache.world());check(world.zones.every(z=>result.visited.includes(z.id)),'Every regional area is visited through the story');
  check(world.pois.every(p=>result.visited.includes(p.id)),'Every named remote location is visited through the story');
  check(cfg.missions.filter(m=>m.kind==='activity').every(m=>result.learned.includes(m.id)),'All varied activities complete through their gameplay conditions');
  await page.screenshot({path:'output/playwright/campaign-final-defense.png'});
  return {steps:cfg.missions.length,areas:world.zones.length,pois:world.pois.length,houses:cfg.houses.length,health:result.health,passed:['actual Fichtenau spawn','local tutorial','camp gate','claim house gate','first shelter','first night','save/reload','all villages and city districts','all remote POIs','Noah rescue','power/armory/archive','cooling switch/container','serum','escort','final defense']};
}
