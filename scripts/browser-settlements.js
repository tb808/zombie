/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async(page)=>{
  await page.goto('about:blank');const errors=[],onError=e=>errors.push(e.message),onConsole=m=>{if(m.type()==='error')errors.push(m.text());};page.on('pageerror',onError);page.on('console',onConsole);
  await page.setViewportSize({width:1920,height:1080});await page.goto('http://localhost:3000');
  await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.title-card button')?.disabled,{},{timeout:90000});
  const check=(v,m)=>{if(!v)throw Error(m);},world=await page.evaluate(()=>window.__nachtwache.world());
  check(world.dressing.props>1200&&world.dressing.scenes>=23,'Substantial dressing loaded');
  check(world.bounds.minX===-1200&&world.bounds.maxX===1200&&world.structures.length===122,'Regional layout preserved');
  const families=world.dressingProps.reduce((a,p)=>(a[p.kind]=(a[p.kind]??0)+1,a),{});
  for(const kind of ['lamp','villageLamp','trafficLight','shelter','busStop','pallet','tractor','car','ambulance','policeCar','fireTruck','bus','wreck','table','cart','smallTree'])check(families[kind]>0,`${kind} loads in actual layout`);
  const badBounds=await page.evaluate(()=>{const g=window.__nachtwache,w=g.world();return w.dressingProps.filter(p=>{const b=w.dressingBounds[`${p.kind}-${p.variant}`],c=Math.abs(Math.cos(p.rotation)),s=Math.abs(Math.sin(p.rotation)),hx=Math.max(Math.abs(b.min[0]),Math.abs(b.max[0])),hz=Math.max(Math.abs(b.min[2]),Math.abs(b.max[2]));return hx*c+hz*s>p.hx+.03||hx*s+hz*c>p.hz+.03||Math.abs(p.y-g.height(p.x,p.z))>.01||b.min[1]<-.08;}).map(p=>p.kind);});
  check(!badBounds.length,`Actual loaded model footprints and ground ${badBounds}`);
  const routesBlocked=await page.evaluate(()=>{const g=window.__nachtwache,w=g.world();return w.roads.flatMap(r=>r.samples.filter(p=>g.blocked(p.x,p.z)).map(p=>[r.id,p.x,p.z]));});check(!routesBlocked.length,`Carriageways stay open ${JSON.stringify(routesBlocked).slice(0,600)}`);
  const views=[['downtown',370,4,406,3,-40],['industry',475,-330,545,5,-330],['kornweiler',-650,-530,-686,2,-552],['fichtenau',-740,500,-770,2,551],['brueckenfeld',690,420,670,2,450],['aschenrode',650,-650,659,2,-695],['cafe',370,-80,402,2,-84],['park',580,190,556,2,194],['hospital',151,-88,130,2,-89],['fuel',590,340,586,2,354]];
  const results=[];
  for(const[name,x,z,tx,ty,tz]of views){
    await page.evaluate(({x,z,tx,ty,tz})=>{const g=window.__nachtwache;g.start();g.teleport(x,z);g.aim(tx,g.height(tx,tz)+ty,tz);g.setTime(12);g.resume();},{x,z,tx,ty,tz});await page.waitForTimeout(3000);
    results.push(await page.evaluate(async name=>{const g=window.__nachtwache,dt=[],calls=[],tri=[];let previous=performance.now();for(let i=0;i<60;i++){await new Promise(requestAnimationFrame);const now=performance.now();dt.push(now-previous);previous=now;calls.push(g.state().render.calls);tri.push(g.state().render.triangles);}dt.sort((a,b)=>a-b);g.pause();return {name,medianMs:dt[30],p95Ms:dt[57],calls:Math.round(calls.reduce((a,b)=>a+b)/60),triangles:Math.round(tri.reduce((a,b)=>a+b)/60),scale:g.performance().resolutionScale,buffer:g.performance().buffer};},name));
    await page.screenshot({path:`output/playwright/settlement-${name}.png`});
  }
  // Camera positions for every designed micro-scene, including old public POIs.
  for(const s of world.dressingScenes){const position=await page.evaluate(s=>{const g=window.__nachtwache;for(const[dx,dz]of [[12,12],[-12,12],[12,-12],[-12,-12],[0,15],[15,0]])if(!g.blocked(s.x+dx,s.z+dz)){g.teleport(s.x+dx,s.z+dz);g.aim(s.x,g.height(s.x,s.z)+1.1,s.z);return true;}return false;},s);check(position,`Camera access to ${s.id}`);await page.waitForTimeout(240);await page.screenshot({path:`output/playwright/settlement-scene-${s.id}.png`});}
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.teleport(370,24);g.aim(370,g.height(370,90)+1.72,90);g.resume();});await page.keyboard.down('w');await page.waitForTimeout(2400);await page.keyboard.up('w');
  const travelled=await page.evaluate(()=>{window.__nachtwache.pause();return window.__nachtwache.state().position;});check(travelled[2]>31,'Real movement passes dressed streets');
  const collisions=await page.evaluate(()=>{const g=window.__nachtwache,w=g.world();return w.dressingProps.filter(p=>['car','truck','tractor','dumpster','shed'].includes(p.kind)&&!g.blocked(p.x,p.z)).map(p=>p.id);});check(!collisions.length,'Large props have real collision');
  check((await page.evaluate(()=>window.__nachtwache.performance())).localLights===4,'Fixed GPU light budget');
  page.off('pageerror',onError);page.off('console',onConsole);check(!errors.length,`Browser errors ${errors.join('\n')}`);
  return {passed:['unchanged regional layout','all prop families','actual GLB bounds','clear roads','ten district views','all micro-scenes','real street movement','large prop collision','four GPU lights','no runtime/asset errors'],dressing:world.dressing,families,results,errors};
}
