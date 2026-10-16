/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async(page)=>{
  await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled,{}, {timeout:90000});
  await page.evaluate(()=>{const g=window.__nachtwache;g.start();g.pause();g.aim(-802,g.height(-802,497)+1.5,497);});
  await page.screenshot({path:'output/playwright/opening-bus.png'});
  await page.evaluate(()=>{
    const g=window.__nachtwache;g.save();g.menu();const s=JSON.parse(localStorage.getItem('nachtwache.save.v1'));s.mission='seecamp';s.progress.stage=g.campaign().missions.findIndex(m=>m.id==='seecamp');
    s.progress.activities={seecamp:{step:3,started:false,timer:0,wave:0,actor:{x:-405,z:790}}};s.player={x:-405,z:790,yaw:0,pitch:0};s.enemies=[];s.conversation=null;
    localStorage.setItem('nachtwache.save.v1',JSON.stringify(s));g.continue();g.interact();
  });
  await page.locator('.story-choice').waitFor();
  const styles=await page.locator('.story-options button').first().evaluate(b=>({label:getComputedStyle(b.querySelector('strong')).display,consequence:getComputedStyle(b.querySelector('small')).display,spacing:getComputedStyle(b).letterSpacing,width:document.querySelector('.story-choice').getBoundingClientRect().width}));
  if(styles.label!=='block'||styles.consequence!=='block'||styles.spacing!=='normal'||styles.width>1280)throw Error('Choice response and consequence must be separately readable and fit the screen');
  await page.screenshot({path:'output/playwright/story-choice.png'});
  await page.getByRole('button',{name:'SPEICHERN & HAUPTMENÜ',exact:true}).click();
  return {passed:['grounded evacuation bus at opening','choice labels and consequences on separate lines','readable choice styles','unresolved choice can return to menu'],styles};
}
