/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async(page)=>{
  await page.goto('about:blank');
  const errors=[],onError=e=>errors.push(e.message),onConsole=m=>{if(m.type()==='error')errors.push(m.text());};
  page.on('pageerror',onError);page.on('console',onConsole);
  await page.setViewportSize({width:1440,height:900});await page.goto('http://localhost:3000');
  await page.waitForFunction(()=>window.__nachtwache?.world().nature&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.setTime(12);g.resume();});
  const views=[['dense-forest',-960,590,-1010,670],['meadow',-1030,75,-1080,-170],['small-pond',-88,608,-70,580],['rocky-pond',941,-560,970,-590],['lake',-642,810,-590,790],['start',-794,494,-900,375]],results=[];
  for(const[name,x,z,tx,tz]of views){
    await page.evaluate(({x,z,tx,tz})=>{const g=window.__nachtwache;let p={x,z};
      if(g.blocked(x,z))for(let i=1;i<150;i++){const q={x:x+Math.cos(i*2.4)*Math.sqrt(i)*1.2,z:z+Math.sin(i*2.4)*Math.sqrt(i)*1.2};if(!g.blocked(q.x,q.z)){p=q;break;}}
      g.teleport(p.x,p.z);g.aim(tx,g.height(tx,tz)+1.3,tz);g.resume();
    },{x,z,tx,tz});
    await page.waitForTimeout(1800);
    results.push(await page.evaluate(async name=>{const g=window.__nachtwache,frame=()=>new Promise(r=>requestAnimationFrame(r)),samples=[];let previous=await frame();
      for(let i=0;i<90;i++){const now=await frame();samples.push(now-previous);previous=now;}samples.sort((a,b)=>a-b);
      return {name,medianMs:samples[45],p95Ms:samples[85],world:g.world(),performance:g.performance(),position:g.state().position};
    },name));
    await page.screenshot({path:`output/playwright/wilderness-${name}.png`});
  }
  const before=await page.evaluate(()=>window.__nachtwache.state().position);
  await page.keyboard.down('w');await page.waitForTimeout(1200);await page.keyboard.up('w');
  const movement=await page.evaluate(before=>{const g=window.__nachtwache,s=g.state();g.pause();return {grounded:Math.abs(s.position[1]-g.height(s.position[0],s.position[2])-1.72)<.1,distance:Math.hypot(s.position[0]-before[0],s.position[2]-before[2])};},before);
  page.off('pageerror',onError);page.off('console',onConsole);
  if(errors.length||!movement.grounded||movement.distance<2)throw Error(JSON.stringify({errors,movement}));
  const profile=await page.evaluate(()=>{const gl=document.querySelector('.game-canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {viewport:[innerWidth,innerHeight],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),samples:90,warmupMs:1800,userAgent:navigator.userAgent};});
  return {passed:['six landscape views','grounded movement','no runtime or asset errors'],profile,results:results.map(r=>({...r,world:{trees:r.world.trees,activeTrees:r.world.activeTrees,nature:r.world.nature,shoreline:r.world.shoreline,wildlife:r.world.wildlife}})),movement,errors};
}
