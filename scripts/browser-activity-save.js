/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async(page)=>{
  const check=(v,m)=>{if(!v)throw Error(m);};
  const ready=()=>page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});
  const state=()=>page.evaluate(()=>window.__nachtwache.state());
  await ready();
  const cfg=await page.evaluate(()=>window.__nachtwache.campaign());
  const reload=async()=>{await page.reload();await ready();await page.evaluate(()=>{const g=window.__nachtwache;g.continue();g.pause();});};
  const install=async(id,progress,position)=>{
    await page.evaluate(({id,progress,position})=>{
      const g=window.__nachtwache;g.start();g.pause();g.save();g.menu();
      const s=JSON.parse(localStorage.getItem('nachtwache.save.v1'));
      s.mission=id;s.progress.stage=g.campaign().missions.findIndex(m=>m.id===id);
      s.progress.hasMap=true;s.progress.learned=['intro','map','noah'];s.progress.visited=g.world().zones.map(z=>z.id);
      s.progress.activities={[id]:progress};s.player={...position,yaw:0,pitch:0};s.noah={x:position.x+2,z:position.z};s.enemies=[];s.conversation=null;
      localStorage.setItem('nachtwache.save.v1',JSON.stringify(s));
    },{id,progress,position});
    await reload();
  };
  await install('radar',{step:1,started:true,timer:6.25,wave:2,actor:{x:-780,z:-850}},{x:-784,z:-850});
  await page.evaluate(()=>window.__nachtwache.resume());await page.waitForTimeout(400);
  await page.evaluate(()=>{const g=window.__nachtwache;g.aim(-780,g.height(-780,-850)+1.3,-850);});
  await page.screenshot({path:'output/playwright/worker-cooperation.png'});
  const running=await page.evaluate(()=>{const g=window.__nachtwache;g.menu();return g.state();});
  check(running.activities.radar.timer>6.25,'Work continues with player and worker at the station');
  await reload();const restored=await state();
  check(Math.abs(restored.activities.radar.timer-running.activities.radar.timer)<.15&&restored.activities.radar.wave===2,'Work time and completed waves persist without restarting');
  await page.evaluate(()=>{const g=window.__nachtwache;g.teleport(-810,-850);g.resume();});await page.waitForTimeout(300);
  const distant=await page.evaluate(()=>{const g=window.__nachtwache;g.pause();return g.state();});
  check(Math.abs(distant.activities.radar.timer-restored.activities.radar.timer)<.05,'Work pauses while the player leaves the station');
  await install('wiesenhof',{step:1,started:true,timer:0,wave:1,actor:{x:-260,z:440}},{x:-255,z:440});
  await page.evaluate(()=>window.__nachtwache.resume());await page.waitForTimeout(400);
  const escort=await page.evaluate(()=>{const g=window.__nachtwache;g.menu();return g.state();});
  check(escort.activities.wiesenhof.actor.x>-260,'Escort moves through the real navigation system');
  await reload();const followed=await state();
  check(Math.hypot(followed.activities.wiesenhof.actor.x-escort.activities.wiesenhof.actor.x,followed.activities.wiesenhof.actor.z-escort.activities.wiesenhof.actor.z)<.3,'Escort resumes from the saved position');
  check(followed.activities.wiesenhof.step===1&&followed.activities.wiesenhof.started,'Reload does not finish the escort');
  await install('seecamp',{step:0,started:false,timer:0,wave:0,actor:{x:-405,z:790}},{x:-405,z:790});
  await page.evaluate(()=>{const g=window.__nachtwache;g.resume();g.interact();g.nextDialogue();g.menu();});
  await reload();check((await state()).dialogue?.index===1&&(await state()).activities.seecamp.step===0,'Conversation and pending activity completion restore together');
  await page.evaluate(()=>{const g=window.__nachtwache;g.resume();while(g.state().dialogue)g.nextDialogue();g.interact();g.pause();});
  check((await state()).activities.seecamp.step===1,'Talking again cannot skip the building search');
  const item=cfg.missions.find(m=>m.id==='seecamp').activity.steps[1];
  const inventory=(await state()).inventory;
  await page.evaluate(p=>{const g=window.__nachtwache;g.resume();g.teleport(p.x,p.z);g.interact();g.pause();},item);
  check((await state()).activities.seecamp.step===2&&JSON.stringify((await state()).inventory)===JSON.stringify(inventory),'Dedicated medical case is carried in quest progress without ordinary inventory duplication');
  await install('jaeger',{step:0,started:false,timer:0,wave:0,actor:{x:-320,z:600}},{x:-320,z:600});
  const started=await page.evaluate(()=>{const g=window.__nachtwache;g.resume();g.interact();g.menu();return g.state();});
  const count=started.enemies.filter(e=>e.alive&&e.encounter==='jaeger:0').length;check(count>0,'Real encounter spawns once');
  await reload();check((await state()).enemies.filter(e=>e.alive&&e.encounter==='jaeger:0').length===count,'Reload preserves encounter enemies without duplicate waves');
  await page.evaluate(p=>{const g=window.__nachtwache;g.teleport(p.x,p.z);g.resume();},cfg.start.player);await page.waitForTimeout(300);
  const away=await page.evaluate(()=>{const g=window.__nachtwache;g.menu();return g.state();});
  check(away.enemies.filter(e=>e.alive&&e.encounter==='jaeger:0').length===count&&!away.learned.includes('jaeger'),'Leaving the region cannot despawn the objective encounter and complete it');
  await reload();check((await state()).enemies.filter(e=>e.alive&&e.encounter==='jaeger:0').length===count,'Distant encounter persists in the save');
  return {passed:['work resume','distance stops work','escort resume','deferred activity dialogue','no out-of-order completion','quest item persistence','no duplicate waves','no despawn shortcut']};
}
