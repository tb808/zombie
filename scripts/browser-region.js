/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async (page) => {
  const errors=[],onError=e=>errors.push(e.message),onConsole=m=>{if(m.type()==='error')errors.push(m.text());};
  page.on('pageerror',onError);page.on('console',onConsole);
  await page.goto('http://localhost:3000');
  await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.title-card button')?.disabled,{}, {timeout:90000});
  const check=(v,m)=>{if(!v)throw Error(m);};
  const world=await page.evaluate(()=>window.__nachtwache.world());
  const profile=await page.evaluate(()=>{const gl=document.querySelector('.game-canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {viewport:[innerWidth,innerHeight],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),userAgent:navigator.userAgent};});
  check(world.bounds.maxX-world.bounds.minX===2400&&world.bounds.maxZ-world.bounds.minZ===2000,'Full regional bounds');
  const blocked=await page.evaluate(()=>{const g=window.__nachtwache,w=g.world();return [...w.pois,...w.bridges].filter(p=>g.blocked(p.x,p.z)).map(p=>p.id);});
  check(blocked.length===0,`Blocked destinations ${blocked}`);
  const views=[['downtown',370,4,410,25,-60],['industry',475,-330,550,25,-365],['kornweiler',-650,-530,-570,6,-500],['fichtenau',-740,500,-680,7,440],['river',741.8,116.4,790,4,200],['ashenrode',650,-650,610,8,-690],['fort',-400,-742,-400,12,-858],['forest',-800,675,-750,15,700]];
  const results=[];
  for(const [name,x,z,tx,ty,tz]of views){
    await page.evaluate(({x,z,tx,ty,tz})=>{const g=window.__nachtwache;g.start();g.teleport(x,z);g.aim(tx,g.height(tx,tz)+ty,tz);g.setTime(12);g.resume();},{x,z,tx,ty,tz});
    await page.waitForTimeout(2200);
    results.push(await page.evaluate(async name=>{const g=window.__nachtwache,dt=[],calls=[],triangles=[];let last=performance.now();for(let i=0;i<45;i++){await new Promise(requestAnimationFrame);const now=performance.now();dt.push(now-last);last=now;const r=g.state().render;calls.push(r.calls);triangles.push(r.triangles);}dt.sort((a,b)=>a-b);g.pause();return {name,medianMs:dt[22],p95Ms:dt[42],calls:Math.round(calls.reduce((a,b)=>a+b)/45),triangles:Math.round(triangles.reduce((a,b)=>a+b)/45),activeChunks:g.world().activeChunks,activeTrees:g.world().activeTrees,enemies:g.state().enemies.filter(e=>e.alive).length,buffer:g.performance().buffer,scale:g.performance().resolutionScale};},name));
    await page.screenshot({path:`output/playwright/region-${name}.png`});
  }
  // Exercise real movement over a river bridge, then check blocked deep water.
  const b=world.bridges.find(b=>b.id==='east-aue');
  const sx=b.x-Math.sin(b.rotation)*6,sz=b.z-Math.cos(b.rotation)*6;
  await page.evaluate(({b,sx,sz})=>{const g=window.__nachtwache;g.start();g.teleport(sx,sz);g.aim(b.x+Math.sin(b.rotation)*20,g.height(b.x,b.z)+1.72,b.z+Math.cos(b.rotation)*20);g.resume();},{b,sx,sz});
  await page.keyboard.down('w');await page.waitForTimeout(2300);await page.keyboard.up('w');
  const position=await page.evaluate(()=>{window.__nachtwache.pause();return window.__nachtwache.state().position;});
  check(Math.hypot(position[0]-sx,position[2]-sz)>6,'Player actually walks across bridge');
  check(Math.abs(position[1]-b.level-1.72)<.2,'Bridge height matches feet');
  check(await page.evaluate(()=>window.__nachtwache.blocked(825,440)),'Deep water is impassable');
  // Earn Mara's map through the existing interaction and inspect all new layers.
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.teleport(-53,-37);g.interact();while(g.state().dialogue)g.nextDialogue();});
  await page.keyboard.press('m');const map=page.locator('.map-viewport svg');await map.waitFor();
  check(await map.getAttribute('viewBox')==='-1200 -1000 2400 2000','World map matches playable bounds');
  check(await map.locator('text').filter({hasText:'FORT EICHE'}).count()===1,'Military base labelled');
  await page.screenshot({path:'output/playwright/region-map-overview.png'});
  await page.getByRole('button',{name:'Mein Standort'}).click();check(Number((await map.getAttribute('viewBox')).split(' ')[2])<=240,'Local detail zoom');
  await page.screenshot({path:'output/playwright/region-map-local.png'});
  page.off('pageerror',onError);page.off('console',onConsole);check(errors.length===0,`Runtime errors ${errors}`);
  const result={passed:['world load','all POI/bridge destinations','eight region views','real bridge traversal','water blocking','campaign map handover','full map layers','detail zoom','no runtime errors'],profile,world:{structures:world.structures.length,trees:world.trees,bridges:world.bridges.length,loot:world.loot},results,errors};
  return result;
}
