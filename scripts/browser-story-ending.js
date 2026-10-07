/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async(page)=>{
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  await page.screenshot({path:'output/playwright/story-defense-hud.png'});
  for(let i=0;i<320;i++){
    const s=await page.evaluate(()=>window.__nachtwache.state());
    check(s.health>0,'Died during final defense');
    if(s.timer<=0)break;
    await page.evaluate(i=>{
      const g=window.__nachtwache;g.resume();const s=g.state();
      if(s.health<65&&s.inventory.medkit)g.consume('medkit');
      if(s.infection>40&&s.inventory.antibiotic)g.consume('antibiotic');
      try{g.teleport(66+Math.cos(i*.15)*6,-25+Math.sin(i*.15)*6);}catch{/* Dodge along the remaining clear path. */}
      if(s.ammo<=0){g.reload();return;}
      const e=g.state().enemies.filter(e=>e.alive&&e.visible).sort((a,b)=>Math.hypot(a.x-s.position[0],a.z-s.position[2])-Math.hypot(b.x-s.position[0],b.z-s.position[2]))[0];
      if(e){g.aim(...e.head);g.shoot();}
    },i);await page.waitForTimeout(250);
  }
  await page.getByRole('heading',{name:'Ihr habt es geschafft.',exact:true}).waitFor();
  const won=await page.evaluate(()=>{const g=window.__nachtwache;const s=g.state();g.menu();return s;});
  await page.reload();await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});
  await page.getByRole('button',{name:/^WEITERSPIELEN/}).click();
  await page.getByRole('heading',{name:'Ihr habt es geschafft.',exact:true}).waitFor();
  await page.screenshot({path:'output/playwright/story-ending.png'});
  check((await page.evaluate(()=>window.__nachtwache.state())).timer===0,'Victory survives reload without replaying the final wave');
  return {health:won.health,kills:won.kills,passed:['live final defense','connected story ending','victory save across page reload']};
}
