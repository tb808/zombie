/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async(page)=>{
  const check=(v,m)=>{if(!v)throw Error(m);};
  await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});
  const base=await page.evaluate(()=>{const g=window.__nachtwache;g.menu();g.start();g.pause();g.save();g.menu();return JSON.parse(localStorage.getItem('nachtwache.save.v1'));});
  const install=async(id,step,choices)=>page.evaluate(({base,id,step,choices})=>{
    const g=window.__nachtwache;g.menu();const s=structuredClone(base),m=g.campaign().missions.find(m=>m.id===id);
    s.mission=id;s.progress.stage=g.campaign().missions.findIndex(m=>m.id===id);s.progress.narrative={version:1,choices,revealed:[],pending:null};
    s.progress.learned=['intro','noah'];s.progress.activities={[id]:{step,started:false,timer:0,wave:0,actor:m.activity.actor?{x:m.activity.actor.x,z:m.activity.actor.z}:null}};
    s.player={x:m.x,z:m.z,yaw:0,pitch:0};s.noah={x:m.x+2,z:m.z};s.enemies=[];s.fighters=[];s.conversation=null;s.progress.visited=g.world().zones.map(z=>z.id);
    localStorage.setItem('nachtwache.save.v1',JSON.stringify(s));g.continue();g.pause();
  },{base,id,step,choices});
  const act=()=>page.evaluate(()=>{const g=window.__nachtwache;g.resume();const p=g.activity().target;g.teleport(p.x,p.z);g.interact();while(g.state().dialogue)g.nextDialogue();g.pause();return {mission:g.state().mission,activities:g.state().activities};});
  for(const [id,step,choices,kind] of [
    ['kornweiler',3,{supplies:'medics'},'repair'],
    ['cityCentre',1,{front:'wardens',signal:'coded',truth:'private'},'switch'],
    ['suburbs',3,{truth:'private'},'repair'],
    ['rest',4,{care:'scouts',signal:'coded'},'treat'],
  ]){
    await install(id,step,choices);const def=await page.evaluate(()=>window.__nachtwache.activity().definition);
    check(def.steps[step].kind===kind,`${id}: selected choice creates the expected additional task`);
    const result=await act();check(result.activities[id].step===step+1,`${id}: new branch target is reachable and completes through actual interaction`);
  }
  await install('jaeger',0,{care:'scouts'});await act();
  check((await page.evaluate(()=>window.__nachtwache.state().enemies)).filter(e=>e.alive&&e.encounter==='jaeger:0').length===2,'Evas scouts actually reduce the rescue encounter');
  await page.evaluate(()=>window.__nachtwache.menu());
  return {passed:['medic supply choice adds a working kitchen repair','encrypted signal adds a working public channel','private diagnosis adds a working isolation station','scouts require actual patient treatment later','scout preparation changes actual enemy count']};
}
