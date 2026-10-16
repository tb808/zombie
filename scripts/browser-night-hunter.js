/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async(page)=>{
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  const ready=()=>page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});
  const state=()=>page.evaluate(()=>window.__nachtwache.state());
  await ready();
  await page.evaluate(()=>{
    const g=window.__nachtwache;g.start();g.resume();
    g.teleport(g.campaign().start.mara.x,g.campaign().start.mara.z);g.interact();
  });
  check(!(await state()).dialogue.lines.join(' ').includes('Nachtjäger'),'No hunter warning in the introduction');
  await page.evaluate(()=>{
    const g=window.__nachtwache;while(g.state().dialogue)g.nextDialogue();g.pause();
    g.teleport(150,110);g.setTime(22);g.spawn(150,102,'nightHunter');g.save();
  });
  check(!(await state()).enemies.some(e=>e.kind==='nightHunter'),'Early chapter blocks hunters even in a later area');
  await page.evaluate(()=>{
    const g=window.__nachtwache,s=JSON.parse(localStorage.getItem('nachtwache.save.v1'));
    const stage=g.campaign().missions.findIndex(m=>m.id==='kornweiler'),mission=g.campaign().missions[stage],actor=mission.activity.actor;
    s.mission=mission.id;s.progress.stage=stage;s.progress.activities={kornweiler:{step:2,started:false,timer:0,wave:0,actor:{x:actor.x,z:actor.z}}};
    s.progress.elapsed=180;s.progress.learned=[];s.enemies=[];s.conversation=null;s.player={x:actor.x,z:actor.z+1,yaw:0,pitch:0};
    localStorage.setItem('nachtwache.save.v1',JSON.stringify(s));g.continue();g.pause();
  });
  await page.evaluate(()=>{const g=window.__nachtwache;g.resume();g.interact();});
  check((await state()).dialogue?.speaker==='HANNA','Later warning belongs to the survivor');
  check((await state()).dialogue.lines.join(' ').includes('Nachtjäger'),'Hanna warns before the northern route');
  await page.evaluate(()=>{const g=window.__nachtwache;while(g.state().dialogue)g.nextDialogue();g.pause();g.teleport(150,110);g.setTime(12);g.spawn(150,102,'nightHunter');});
  check(!(await state()).enemies.some(e=>e.kind==='nightHunter'),'No hunters at midday');
  await page.evaluate(()=>{const g=window.__nachtwache;g.setTime(18.99);g.spawn(150,102,'nightHunter');});
  check(!(await state()).enemies.some(e=>e.kind==='nightHunter'),'No hunters before 19:00');
  await page.evaluate(()=>{const g=window.__nachtwache;g.teleport(g.campaign().start.fuel.x,g.campaign().start.fuel.z);g.setTime(22);g.spawn(150,102,'nightHunter');});
  check(!(await state()).enemies.some(e=>e.kind==='nightHunter'),'Early areas remain protected after story progression');
  await page.evaluate(()=>{
    const g=window.__nachtwache;g.teleport(150,110);const random=Math.random;
    try{Math.random=()=>.05;g.spawn(150,102);}finally{Math.random=random;}
    g.spawn(152,102,'nightHunter');g.spawn(154,102,'nightHunter');
  });
  check((await state()).enemies.filter(e=>e.kind==='nightHunter'&&e.alive).length===2,'Natural spawning works and no more than two hunters are active');
  await page.evaluate(()=>{const g=window.__nachtwache;g.save();g.menu();});
  await page.reload();await ready();
  await page.evaluate(()=>{const g=window.__nachtwache;g.continue();g.pause();});
  check((await state()).enemies.filter(e=>e.kind==='nightHunter'&&e.alive).length===2,'Save and continue preserve night hunters');
  await page.evaluate(()=>{const g=window.__nachtwache;g.setTime(12);g.setTime(22);g.spawn(150,102,'nightHunter');g.resume();});
  await page.waitForFunction(()=>window.__nachtwache.state().enemies.some(e=>e.kind==='nightHunter'&&e.state==='chase'),{}, {timeout:15000});
  const before=await state();
  await page.waitForFunction(t=>window.__nachtwache.state().elapsed>t+.35,before.elapsed,{timeout:15000});
  const chased=await page.evaluate(()=>{const g=window.__nachtwache;g.pause();return g.state();});
  const speed=(chased.enemies[0].z-before.enemies[0].z)/(chased.elapsed-before.elapsed);
  check(Math.abs(speed-5.8*1.3)<.25,'Actual pursuit is faster than every regular zombie');
  await page.evaluate(()=>{const g=window.__nachtwache;g.setTime(12);g.setTime(22);g.spawn(150,111.2,'nightHunter');g.resume();});
  await page.waitForFunction(()=>window.__nachtwache.state().health<100,{}, {timeout:15000});
  const bitten=await page.evaluate(()=>{const g=window.__nachtwache;g.pause();return g.state();});
  check(Math.abs(100-bitten.health-38*1.45)<.01,'Actual hunter bite applies the stronger night damage');
  await page.evaluate(()=>{const g=window.__nachtwache;g.teleport(150,110);g.setTime(5.499);g.resume();});
  await page.waitForFunction(()=>!window.__nachtwache.state().enemies.some(e=>e.kind==='nightHunter'&&e.alive),{}, {timeout:15000});
  check((await state()).kills===bitten.kills,'Dawn removes hunters without granting kills');
  await page.evaluate(()=>{
    const g=window.__nachtwache;g.pause();g.setTime(22);g.teleport(150,110);g.spawn(150,104,'nightHunter');g.spawn(146,104,'walker');g.aim(150,g.height(150,104)+1.5,104);g.resume();
  });
  await page.keyboard.press('f');await page.waitForTimeout(350);
  await page.evaluate(()=>window.__nachtwache.pause());
  await page.waitForTimeout(500);
  await page.screenshot({path:'output/playwright/night-hunter.png'});
  return {speed,nightDamage:100-bitten.health,passed:['later NPC warning','early chapter and area gates','night boundaries','natural spawn and cap','save/continue','pursuit','bite damage','dawn cleanup'],screenshot:'output/playwright/night-hunter.png'};
}
