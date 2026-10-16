/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async(page)=>{
  const check=(v,m)=>{if(!v)throw Error(m);},ready=()=>page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});
  await ready();
  const cfg=await page.evaluate(()=>{const g=window.__nachtwache;g.menu();g.start();g.pause();g.save();g.menu();return g.campaign();});
  const base=await page.evaluate(()=>JSON.parse(localStorage.getItem('nachtwache.save.v1')));
  const state=()=>page.evaluate(()=>window.__nachtwache.state());
  const install=async(id,step,choices={})=>{
    const m=cfg.missions.find(m=>m.id===id);
    await page.evaluate(({base,m,step,choices})=>{
      const g=window.__nachtwache;g.menu();const s=structuredClone(base);
      s.mission=m.id;s.progress.stage=g.campaign().missions.findIndex(c=>c.id===m.id);s.progress.hasMap=true;s.progress.learned=['intro','noah'];s.progress.visited=[...g.world().zones.map(z=>z.id),...g.world().pois.map(p=>p.id)];
      s.progress.narrative={version:1,choices, pending:null,revealed:['convoy','noah','war','orders']};s.progress.activities={};
      if(m.activity)s.progress.activities[m.id]={step,started:false,timer:0,wave:0,actor:m.activity.actor?{x:m.activity.actor.x,z:m.activity.actor.z}:null};
      s.progress.arsenal.pistol.reserve=300;s.progress.elapsed=0;s.progress.timer=2;s.progress.health=100;s.progress.thirst=100;
      s.player={x:m.x,z:m.z,yaw:0,pitch:0};s.noah=choices.dose==='culture'?{x:48,z:21.5}:{x:m.x+2,z:m.z};s.enemies=[];s.fighters=[];s.conversation=null;s.flares=[];s.noises=[];s.phase='playing';
      localStorage.setItem('nachtwache.save.v1',JSON.stringify(s));g.continue();g.pause();
    },{base,m,step,choices});
    check((await state()).mission===id,`${id}: fixture loads through the real save parser`);
  };
  const interact=()=>page.evaluate(()=>{const g=window.__nachtwache;g.resume();const p=g.activity().target;g.teleport(p.x,p.z,0,g.state().narrative.choices.dose!=='culture');g.interact();while(g.state().dialogue)g.nextDialogue();});
  const choices=[
    ['care','seecamp',3,['clinic','scouts']],['supplies','birkenhof',4,['share','medics']],['signal','radar',3,['open','coded']],['truth','research',4,['open','private']],['front','industrial',1,['union','wardens','hospital']],['pact','brueckenfeld',1,['union','wardens','truce']],['dose','serum',0,['noah','culture']],
  ];
  const labels={clinic:'Eva zur mobilen Krankenstation schicken',scouts:'Eva bei den Suchtrupps lassen',share:'Die Dorfküchen versorgen',medics:'Das Lazarett der Eichenwache versorgen',open:{signal:'Den Hilferuf offen senden',truth:'Noah überzeugen, den Helfern die Wahrheit zu sagen'},coded:'Die verschlüsselte Verbindung nutzen',private:'Noahs Zustand vorerst zwischen euch behalten',union:{front:'Die Unterkünfte des Bürgerbunds anschließen',pact:'Dem Bürgerbund die Bergung anvertrauen'},wardens:{front:'Den Sanitätsweg der Eichenwache anschließen',pact:'Mit der Eichenwache ausrücken'},hospital:'Die zivile Notaufnahme unabhängig versorgen',truce:'Ein gemeinsames Schutzabkommen aushandeln',noah:'Noah jetzt stabilisieren',culture:'Noahs Zustimmung annehmen und die Kultur bewahren'};
  for(const [id,mission,step,options] of choices)for(const value of options){
    await install(mission,step);
    await interact();await page.locator('.story-choice').waitFor();
    check((await state()).narrative.pending===id,`${id}: explicit decision pauses gameplay`);
    if(id==='care'&&value==='clinic'){
      await page.screenshot({path:'output/playwright/story-choice.png'});
      await page.evaluate(()=>window.__nachtwache.menu());await page.reload();await ready();await page.getByRole('button',{name:/^WEITERSPIELEN/}).click();
      check((await state()).narrative.pending===id, 'Unresolved decision reopens after a real reload');
    }
    const label=typeof labels[value]==='string'?labels[value]:labels[value][id];
    await page.getByRole('button',{name:label}).click();await page.evaluate(()=>{const g=window.__nachtwache;while(g.state().dialogue)g.nextDialogue();g.pause();});
    const selected=await state();check(selected.narrative.choices[id]===value&&!selected.narrative.pending,`${id}/${value}: UI commits one choice`);
    if(id==='dose')check(selected.mission==='repair',`${value}: medicine completes without requiring an absent companion`);
    await page.evaluate(()=>{const g=window.__nachtwache;g.save();g.menu();g.continue();g.pause();});
    check((await state()).narrative.choices[id]===value,`${id}/${value}: persists on continue`);
  }
  const shoot=()=>page.evaluate(()=>{
    const g=window.__nachtwache;g.resume();const s=g.state();if(s.health<70&&s.inventory.medkit)g.consume('medkit');if(s.ammo<=0){g.reload();return;}
    const fighters=g.factions().filter(f=>f.alive&&f.side==='hostile'),f=fighters.find(f=>f.visible),e=s.enemies.find(e=>e.alive&&e.visible);
    if(!f&&fighters.length){const target=fighters[0].position,path=g.route({x:s.position[0],z:s.position[2]},{x:target[0],z:target[2]});const p=path.find(p=>Math.hypot(p.x-s.position[0],p.z-s.position[2])>.3);if(p){const d=Math.hypot(p.x-s.position[0],p.z-s.position[2]),a=Math.min(1,3/d),x=s.position[0]+(p.x-s.position[0])*a,z=s.position[2]+(p.z-s.position[2])*a;if(!g.blocked(x,z))g.teleport(x,z);}}
    if(!fighters.length&&s.mission==='industrial'){const p=g.activity().target;g.teleport(p.x,p.z);}
    if(f){g.aim(...f.head);g.shoot();}else if(e){g.aim(...e.head);g.shoot();}
  });
  for(const front of ['union','wardens','hospital']){
    await install('industrial',4,{front});await interact();
    let units=await page.evaluate(()=>window.__nachtwache.factions());
    const opponent=front==='hospital'?'cinder':front==='union'?'wardens':'union';
    check(units.some(f=>f.side==='hostile'&&f.faction===opponent),`${front}: real opposing faction spawns`);
    check(units.some(f=>f.side==='ally'&&f.faction===(front==='hospital'?'union':front)),`${front}: physical allied support spawns`);
    await page.waitForTimeout(2800);await page.evaluate(()=>window.__nachtwache.pause());
    units=await page.evaluate(()=>window.__nachtwache.factions());check(units.some(f=>f.alive&&f.health<100)||units.some(f=>!f.alive),`${front}: live humans exchange rifle damage`);
    if(front==='union'){
      const before=await page.evaluate(()=>{const g=window.__nachtwache;g.menu();return JSON.parse(localStorage.getItem('nachtwache.save.v1'));});
      await page.reload();await ready();await page.evaluate(()=>{const g=window.__nachtwache;g.continue();g.pause();});
      const after=await page.evaluate(()=>{const g=window.__nachtwache;g.save();return JSON.parse(localStorage.getItem('nachtwache.save.v1'));});
      check(JSON.stringify(after.fighters)===JSON.stringify(before.fighters),'Active faction fight restores positions, health and allegiance without a new wave');
      check(after.progress.activities.industrial.wave===before.progress.activities.industrial.wave,'Wave state restores with its soldiers');
    }
    for(let i=0;i<400;i++){
      if((await state()).learned.includes('industrial'))break;await shoot();await page.waitForTimeout(150);
    }
    check((await state()).learned.includes('industrial'),`${front}: worker defense completes through gameplay`);
  }
  await install('brueckenfeld',2,{pact:'truce'});
  check((await page.evaluate(()=>window.__nachtwache.activity().definition)).steps.filter(s=>s.speaker?.includes('FUNK')).length===2,'Truce adds two actual parley tasks');
  await interact();check((await state()).activities.brueckenfeld.step===3,'Hanna must confirm her side of the agreement');await interact();check((await state()).activities.brueckenfeld.step===4,'Seidel must confirm his side of the agreement');
  for(const dose of ['noah','culture']){
    await install('serum',0,{pact:'truce'});await interact();await page.getByRole('button',{name:labels[dose]}).click();await page.evaluate(()=>{const g=window.__nachtwache;while(g.state().dialogue)g.nextDialogue();g.pause();});
    const fate=(await state()).narrative;check(fate.choices.dose===dose,'Medical choice committed by the actual clinic scene');
    await install('tower',0,fate.choices);
    await interact();check((await state()).mission==='defend',`${dose}: tower does not demand an unavailable Noah`);
    for(let i=0;i<400;i++){if((await state()).timer<=0)break;await shoot();await page.waitForTimeout(150);}
    await page.locator('.story-ending').waitFor();const ending=await page.locator('.story-ending').innerText();check(ending.includes(dose==='noah'?'Noah steigt selbst':'Noahs blauer Anhänger'),`${dose}: ending matches the medical outcome`);
    await page.screenshot({path:`output/playwright/story-ending-${dose}.png`});
    await page.evaluate(()=>window.__nachtwache.menu());await page.reload();await ready();await page.getByRole('button',{name:/^WEITERSPIELEN/}).click();check((await page.locator('.story-ending').innerText())===ending,'Ending and decisions survive a real reload');
  }
  return {passed:['all 16 UI options across seven decisions','pending choice reload','saved consequences','three playable faction allegiances','actual reciprocal rifle damage','active battle reload','worker defense','two truce negotiations','both medical endings and victory reload']};
}
