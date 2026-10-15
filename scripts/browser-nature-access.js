/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async(page)=>{
  await page.waitForFunction(()=>window.__nachtwache?.world().wildlife,{}, {timeout:90000});
  const result=await page.evaluate(()=>{
    const g=window.__nachtwache,w=g.world(),campaign=g.campaign();g.start();g.pause();
    const targets=[...w.roads.flatMap(r=>r.samples.map(p=>({...p,id:r.id}))),...w.pois,...Object.entries(campaign.start).map(([id,p])=>({...p,id})),...campaign.missions.flatMap(m=>m.activity?m.activity.steps.map(p=>({...p,id:`${m.id}: ${p.label}`})):[])];
    const blocked=targets.filter(p=>g.blocked(p.x,p.z)).map(p=>({id:p.id,x:p.x,z:p.z}));
    return {checked:targets.length,blocked,structures:w.structures.length,bridges:w.bridges.length};
  });
  if(result.blocked.length)throw Error(JSON.stringify(result));return {passed:['all road centres','all POIs','opening camp','all regional activity steps'],...result};
}
