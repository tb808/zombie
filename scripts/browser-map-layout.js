/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async(page)=>{
  const errors=[],check=(ok,message)=>{if(!ok)throw Error(message);};
  const onError=e=>errors.push(e.message),onConsole=m=>{if(m.type()==='error')errors.push(m.text());};
  page.on('pageerror',onError);page.on('console',onConsole);
  await page.goto('http://127.0.0.1:3000');
  await page.waitForFunction(()=>window.__nachtwache?.world().nature&&!document.querySelector('.start-actions .secondary')?.disabled,{},{timeout:240000});
  const world=await page.evaluate(()=>window.__nachtwache.world());
  check(world.layoutObjects.filter(p=>p.required).length===15,'All original GLBs loaded');
  check(world.layoutObjects.every(p=>p.streetClearance>=.3),'Actual loaded GLBs clear roads and pavements');
  check(world.layoutObjects.filter(p=>p.required).every(p=>Math.abs(p.minY-p.groundY)<.03),'Original buildings sit on their foundations');
  check(world.dressing.scenes===24&&world.dressing.props>1200,'All designed settlement scenes loaded');
  for(const s of world.dressingScenes.filter(s=>s.kind==='busStop'))for(const kind of ['shelter','busStop'])check(world.dressingProps.some(p=>p.scene===s.id&&p.kind===kind),`${s.id}: complete shelter and stop`);
  check(world.dressingScenes.filter(s=>s.kind==='busStop').length===6,'Six complete stops in actual runtime layout');
  const blocked=await page.evaluate(()=>{const g=window.__nachtwache,w=g.world(),bad=[];
    for(const r of w.roads)for(let i=1;i<r.samples.length;i++){const a=r.samples[i-1],b=r.samples[i],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length);
      for(let n=0;n<=steps;n++)for(const side of [-1,0,1]){const d=side*(r.width/2-.85),x=a.x+(b.x-a.x)*n/steps+(b.z-a.z)/length*d,z=a.z+(b.z-a.z)*n/steps-(b.x-a.x)/length*d;if(g.blocked(x,z))bad.push({road:r.id,x,z});}
    }return bad;
  });check(!blocked.length,`Actual full-width roads blocked: ${JSON.stringify(blocked.slice(0,5))}`);
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.setTime(12);});
  const views=[{id:'old-village',x:-24,z:-7,tx:-24,tz:-23},{id:'cemetery',x:22,z:7,tx:20,tz:24},{id:'old-clinic',x:82,z:0,tx:51,tz:11},{id:'legacy-crossing',x:92,z:-58,tx:106,tz:-46},
    ...world.zones.map(s=>({id:s.id.toLowerCase(),x:s.x,z:s.z,zone:s.id,exterior:s.biome==='city'||s.biome==='village'})),...world.pois.map(s=>({id:s.id,x:s.x,z:s.z,zone:s.id}))];
  const frames=[];
  for(const view of views){
    const position=await page.evaluate(v=>{const g=window.__nachtwache,w=g.world();let p={x:v.x,z:v.z};
      if(v.exterior){const nearest=w.roads.flatMap(r=>r.samples).filter(p=>!g.blocked(p.x,p.z)).sort((a,b)=>Math.hypot(a.x-v.x,a.z-v.z)-Math.hypot(b.x-v.x,b.z-v.z))[0];if(nearest)p={x:nearest.x,z:nearest.z};}
      if(g.blocked(p.x,p.z)){for(let i=1;i<120;i++){const q={x:v.x+Math.cos(i*2.4)*Math.sqrt(i)*2,z:v.z+Math.sin(i*2.4)*Math.sqrt(i)*2};if(!g.blocked(q.x,q.z)){p=q;break;}}}
      const b=w.structures.filter(b=>b.zone===v.zone).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0],tx=v.tx??b?.x??v.x+25,tz=v.tz??b?.z??v.z+25;
      g.teleport(p.x,p.z);g.aim(tx,g.height(tx,tz)+2,tz);g.resume();return p;
    },view);
    // Wait for actual rendered frames: fixed wall time can capture a previous
    // region before distance culling has updated on slower/software renderers.
    await page.evaluate(async()=>{for(let i=0;i<10;i++)await new Promise(requestAnimationFrame);window.__nachtwache.pause();});
    frames.push({id:view.id,position,...await page.evaluate(()=>({render:window.__nachtwache.state().render,activeChunks:window.__nachtwache.world().activeChunks}))});
    await page.screenshot({path:`output/playwright/layout-${view.id}.png`,timeout:120000});
  }
  await page.evaluate(()=>{const g=window.__nachtwache;g.teleport(157.6,20);g.aim(157.6,g.height(157.6,60)+1.72,60);g.resume();});
  const before=await page.evaluate(()=>window.__nachtwache.state().position);
  await page.keyboard.down('w');await page.evaluate(async()=>{for(let i=0;i<60;i++)await new Promise(requestAnimationFrame);});await page.keyboard.up('w');
  const after=await page.evaluate(()=>{const g=window.__nachtwache;g.pause();const p=g.state().position;return {position:p,grounded:Math.abs(p[1]-g.height(p[0],p[2])-1.72)<.06};});
  check(after.position[2]>before[2]+3&&after.grounded,'Actual grounded keyboard movement along a pavement');
  const recovery=await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.save();const saved=JSON.parse(localStorage.getItem('nachtwache.save.v1'));saved.player.x=-24;saved.player.z=-26;localStorage.setItem('nachtwache.save.v1',JSON.stringify(saved));g.continue();g.pause();const p=g.state().position;return {position:p,blocked:g.blocked(p[0],p[2]),mission:g.state().mission};});
  check(!recovery.blocked&&Math.hypot(recovery.position[0]+24,recovery.position[2]+26)<32&&recovery.mission==='intro','Old saves covered by a shifted building recover nearby with their progress');
  page.off('pageerror',onError);page.off('console',onConsole);check(!errors.length,`Runtime errors: ${errors.join('\n')}`);
  return {passed:['all original model envelopes and foundations','six complete runtime stops','full carriageway widths','all 13 regions and 12 POIs','four original enclave views','grounded pavement movement','old save position recovery','no browser errors'],props:world.dressing.props,scenes:world.dressing.scenes,frames,movement:after,recovery,errors};
}
