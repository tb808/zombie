/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async(page)=>{
  const errors=[],onError=e=>errors.push(e.message),onConsole=m=>{if(m.type()==='error')errors.push(m.text());};page.on('pageerror',onError);page.on('console',onConsole);
  await page.goto('http://localhost:3000');
  await page.waitForFunction(()=>window.__nachtwache?.world().wildlife&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.setTime(12);g.resume();});
  const inspected=[];
  for(const kind of ['deer','hare','duck']){
    await page.evaluate(kind=>{const g=window.__nachtwache,list=g.world().wildlifePositions.filter(a=>a.kind===kind),a=kind==='duck'?list.at(-1):list[0];let spot;
      for(let i=0;i<180;i++){const angle=i*2.399,r=kind==='duck'?8+Math.sqrt(i)*2:5+Math.sqrt(i)*.4,p={x:a.x+Math.sin(angle)*r,z:a.z+Math.cos(angle)*r};if(!g.blocked(p.x,p.z)){spot=p;break;}}
      if(!spot)throw Error('No viewing location');g.teleport(spot.x,spot.z);g.aim(a.x,a.y+(kind==='deer'?1:kind==='hare'?.35:.3),a.z);g.resume();
    },kind);
    await page.waitForTimeout(650);await page.evaluate(()=>window.__nachtwache.pause());
    await page.screenshot({path:`output/playwright/wilderness-animal-${kind}.png`});
    const before=await page.evaluate(kind=>window.__nachtwache.world().wildlifePositions.filter(a=>a.kind===kind),kind);
    await page.waitForTimeout(400);
    const paused=await page.evaluate(kind=>window.__nachtwache.world().wildlifePositions.filter(a=>a.kind===kind),kind);
    if(JSON.stringify(before)!==JSON.stringify(paused))throw Error('Paused animals moved');
    await page.evaluate(()=>window.__nachtwache.resume());await page.waitForTimeout(2400);
    const after=await page.evaluate(kind=>window.__nachtwache.world().wildlifePositions.filter(a=>a.kind===kind),kind);
    if(!after.some((a,i)=>Math.hypot(a.x-before[i].x,a.z-before[i].z)>.2))throw Error(`${kind} never moves`);
    inspected.push({kind,animals:after.length});
  }
  const world=await page.evaluate(()=>{const g=window.__nachtwache;g.pause();return g.world();});
  if(world.trees<6500||world.shoreline.reed<500||world.wildlife.total<45)throw Error('Nature population missing');
  for(const [x,z]of [[-1000,405],[-70,580],[970,-590]])if(!await page.evaluate(({x,z})=>window.__nachtwache.blocked(x,z),{x,z}))throw Error('Pond not blocking land movement');
  page.off('pageerror',onError);page.off('console',onConsole);if(errors.length)throw Error(errors.join('\n'));
  return {passed:['three animal species rendered and moving','pause freezes animals','five dressed lakes and ponds','dense woods loaded','pond collision','no runtime or asset errors'],inspected,trees:world.trees,nature:world.nature,shoreline:world.shoreline,wildlife:world.wildlife};
}
