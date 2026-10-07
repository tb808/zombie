/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI invokes this function with its page argument. */
async(page)=>{
  const check=(value,message)=>{if(!value)throw Error(message);};
  const damage=async hour=>{
    await page.evaluate(hour=>{const g=window.__nachtwache;g.start();g.teleport(150,110);g.setTime(hour);g.spawn(150,111.2,'walker');g.resume();},hour);
    await page.waitForFunction(()=>window.__nachtwache.state().health<100,{},{timeout:15000});
    return page.evaluate(()=>{const g=window.__nachtwache;g.pause();return 100-g.state().health;});
  };
  const dayDamage=await damage(12),nightDamage=await damage(21);
  check(Math.abs(dayDamage-12)<.01&&Math.abs(nightDamage-17.4)<.01,'Actual bites deal 45% more damage at night');
  const speed=async hour=>{
    await page.evaluate(hour=>{const g=window.__nachtwache;g.start();g.teleport(150,110);g.setTime(hour);g.spawn(150,102,'walker');g.resume();},hour);
    await page.waitForFunction(()=>window.__nachtwache.state().enemies[0]?.state==='chase',{},{timeout:15000});
    await page.waitForTimeout(150);
    const before=await page.evaluate(()=>{const s=window.__nachtwache.state();return {elapsed:s.elapsed,z:s.enemies[0].z};});
    await page.waitForFunction(t=>window.__nachtwache.state().elapsed>=t+.75,before.elapsed,{timeout:15000});
    return page.evaluate(before=>{const g=window.__nachtwache;g.pause();const s=g.state();return (s.enemies[0].z-before.z)/(s.elapsed-before.elapsed);},before);
  };
  const daySpeed=await speed(12),nightSpeed=await speed(21);
  check(Math.abs(daySpeed-1.45)<.1&&Math.abs(nightSpeed/daySpeed-1.3)<.08,'Actual pursuit runs 30% faster at night');
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.resume();g.teleport(122.4,91.4);g.interact();g.setTime(21);g.teleport(125,97);g.aim(120,g.height(120,93)+1.4,93);g.pause();});
  await page.waitForTimeout(500);await page.screenshot({path:'output/playwright/safehouse-uv-gate.png'});
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.pause();});
  return {dayDamage,nightDamage,daySpeed,nightSpeed};
}
