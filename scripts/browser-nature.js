/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3000');
  await page.waitForFunction(()=>window.__nachtwache?.world().nature&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});
  await page.getByRole('button',{name:/NEUES SPIEL/}).click();
  const views=[['start-hills',-794,494,-900,375],['forest-ridge',-880,635,-920,735],['meadow-hills',-1030,75,-1080,-170],['field-slopes',-420,-275,-320,-350]];
  const results=[];
  for(const [name,x,z,tx,tz]of views){
    await page.evaluate(({x,z,tx,tz})=>{const g=window.__nachtwache;
      let p={x,z};if(g.blocked(x,z)){for(let i=1;i<50;i++){const q={x:x+Math.cos(i*2.4)*i*.5,z:z+Math.sin(i*2.4)*i*.5};if(!g.blocked(q.x,q.z)){p=q;break;}}}
      g.teleport(p.x,p.z);g.setTime(12);g.aim(tx,g.height(tx,tz)+1.5,tz);g.resume();
    },{x,z,tx,tz});
    await page.waitForTimeout(1800);
    results.push(await page.evaluate(name=>({name,position:window.__nachtwache.state().position,nature:window.__nachtwache.world().nature,render:window.__nachtwache.state().render,performance:window.__nachtwache.performance()}),name));
    await page.screenshot({path:`output/playwright/nature-${name}.png`});
  }
  // Actual WASD movement follows the hills' surface without sinking or jumping.
  const before=await page.evaluate(()=>window.__nachtwache.state().position);
  await page.keyboard.down('w');await page.waitForTimeout(1500);await page.keyboard.up('w');
  const movement=await page.evaluate(before=>{const g=window.__nachtwache,s=g.state();g.pause();return {grounded:Math.abs(s.position[1]-g.height(s.position[0],s.position[2])-1.72)<.1,distance:Math.hypot(s.position[0]-before[0],s.position[2]-before[2]),heightChange:Math.abs(s.position[1]-before[1])};},before);
  if(!movement.grounded||movement.distance<2||movement.heightChange<.05||errors.length)throw Error(JSON.stringify({movement,errors}));
  return {passed:['four daytime landscape views','grounded movement','nature loaded','no runtime errors'],results};
}
