/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async (page) => {
  await page.goto('http://localhost:3000',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled,{},{timeout:90000});
  const errors=[],onError=e=>errors.push(e.message);page.on('pageerror',onError);
  await page.setViewportSize({width:1280,height:800});
  await page.evaluate(async()=>{
    const g=window.__nachtwache;g.start();const p=g.loot().find(p=>p.kind==='medkit'&&!p.taken),[x,y,z]=p.position;
    g.teleport(x,z+.85);g.aim(x,y+.07,z);g.resume();
    for(let i=0;i<12;i++)await new Promise(resolve=>requestAnimationFrame(resolve));g.pause();
  });
  await page.screenshot({path:'output/playwright/loot-ground.png'});
  const play=await page.evaluate(async()=>{
    const g=window.__nachtwache,frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    g.start();g.resume();for(let i=0;i<8;i++)await frame();
    const start=g.loot().find(p=>p.kind==='medkit'&&!p.taken),[x,,z]=start.position;
    g.teleport(x,z+.8);g.resume();for(let i=0;i<3;i++)await frame();
    const before=g.state().inventory.medkit,snapshot=g.loot().find(p=>p.position[0]===x&&p.position[2]===z);
    for(let i=0;i<12;i++)await frame();
    const stationary=g.loot().find(p=>p.position[0]===x&&p.position[2]===z);
    if(JSON.stringify(snapshot.position)!==JSON.stringify(stationary.position)||snapshot.rotation!==stationary.rotation)throw Error('Ground loot must remain stationary');
    g.interact();for(let i=0;i<3;i++)await frame();
    const taken=g.loot().find(p=>p.position[0]===x&&p.position[2]===z);
    if(g.state().inventory.medkit!==before+start.count||!taken.taken||taken.visible)throw Error('Recognizable model must still be collected with the real interaction');
    const far=g.loot().filter(p=>Math.hypot(p.position[0]-x,p.position[2]-z)>100&&!p.taken);
    if(!far.length||far.some(p=>p.visible))throw Error('Distant items must be culled');
    g.save();g.continue();
    const restored=g.loot().find(p=>p.position[0]===x&&p.position[2]===z);
    if(!restored.taken||restored.visible||g.state().inventory.medkit!==before+start.count)throw Error('Saved collection state must survive loading');
    g.pause();return {collected:'medkit',stationary:true,savedCollection:true,culled:far.length,batches:Math.max(...g.loot().map(p=>p.batches))};
  });
  await page.evaluate(async()=>{
    const g=window.__nachtwache,p=g.loot().find(p=>p.kind==='medkit'&&p.position[0]>130&&p.position[0]<140&&p.position[2]<-60),[x,y,z]=p.position;
    if(Math.abs(y-g.height(x,z)-.245)>.001)throw Error('Interior loot must rest on the open crate base');
    g.teleport(x-1.25,z+1.2);g.aim(x,y+.08,z);g.resume();
    for(let i=0;i<12;i++)await new Promise(resolve=>requestAnimationFrame(resolve));g.pause();
  });
  await page.screenshot({path:'output/playwright/loot-crate.png'});
  await page.setViewportSize({width:1440,height:1100});
  const gallery=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js'),{createLootVisualLibrary,LOOT_VISUAL_KINDS}=await import('/app/lootVisuals.ts');
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(340,270);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
    const scene=new THREE.Scene();scene.background=new THREE.Color(0xe2e5df);
    scene.add(new THREE.HemisphereLight(0xeaf2ff,0x9b8e78,2.4));
    const light=new THREE.DirectionalLight(0xffe9cb,3.5);light.position.set(-2,5,4);scene.add(light);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshStandardMaterial({color:0xc6cdc3,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;scene.add(floor);
    const camera=new THREE.PerspectiveCamera(32,340/270,.01,20),library=createLootVisualLibrary();
    const overlay=document.createElement('div');overlay.id='loot-preview';overlay.style.cssText='position:fixed;inset:0;z-index:99999;overflow:auto;background:#e2e5df;padding:20px;font:16px Arial;color:#28332d;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;align-content:start';document.body.append(overlay);
    for(const kind of LOOT_VISUAL_KINDS){
      const object=library.create(kind);scene.add(object);
      const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const radius=Math.max(size.x,size.z,size.y,.4),distance=radius*2.5;
      camera.position.set(center.x+distance*.62,center.y+distance*.9,center.z+distance*1.15);camera.lookAt(center);
      renderer.render(scene,camera);
      const card=document.createElement('div'),caption=document.createElement('strong'),canvas=document.createElement('canvas');canvas.width=340;canvas.height=270;canvas.style.cssText='width:100%;display:block';canvas.getContext('2d').drawImage(renderer.domElement,0,0);
      caption.textContent=kind;card.append(canvas,caption);overlay.append(card);scene.remove(object);
    }
    library.dispose();floor.geometry.dispose();floor.material.dispose();renderer.dispose();return LOOT_VISUAL_KINDS.length;
  });
  await page.screenshot({path:'output/playwright/loot-gallery.png',fullPage:true});
  // Capture the last row too, since the gallery scrolls inside its overlay.
  await page.evaluate(()=>{document.querySelector('#loot-preview').scrollTop=10000;});
  await page.screenshot({path:'output/playwright/loot-gallery-quest.png'});
  await page.evaluate(()=>document.querySelector('#loot-preview').remove());
  page.off('pageerror',onError);if(errors.length)throw Error(errors.join('\n'));
  return {passed:play,previewed:gallery,errors};
}
