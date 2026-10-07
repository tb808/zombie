/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI supplies page. */
async (page) => {
  await page.goto('about:blank');
  const errors=[],onError=e=>errors.push(e.message),onConsole=msg=>{if(msg.type()==='error')errors.push(msg.text());};
  page.on('pageerror',onError);page.on('console',onConsole);
  await page.setViewportSize({width:1920,height:1080});await page.goto('http://localhost:3000');
  await page.waitForFunction(()=>window.__nachtwache&&!document.querySelector('.start-actions .secondary')?.disabled,{},{timeout:60000});
  const result=await page.evaluate(async()=>{
    const check=(ok,message)=>{if(!ok)throw Error(message);},g=window.__nachtwache,canvas=document.querySelector('.game-canvas'),gl=canvas.getContext('webgl2');
    const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    const pixel=()=>{const bytes=new Uint8Array(24*24*4);gl.readPixels(gl.drawingBufferWidth/2-12,gl.drawingBufferHeight/2-12,24,24,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes.some((v,i)=>i%4!==3&&v>3);};
    g.start();g.teleport(137,-61);g.setTime(12);g.aim(137,1,-72);g.resume();
    for(let i=0;i<10;i++)await frame();
    const programStart=g.performance().programs;let black=0;
    for(let cycle=0;cycle<3;cycle++)for(const z of [-61,-64.2,-72,-78,-82]){
      g.teleport(137,z);g.setTime(cycle===1?0:12);g.resume();
      for(let i=0;i<4;i++){await frame();if(!pixel())black++;}
    }
    const programEnd=g.performance().programs;
    check(programEnd<=programStart+3,'Room transitions must reuse the shader configuration');
    const buffer=g.performance().buffer;
    canvas.style.width='0px';canvas.style.height='0px';
    for(let i=0;i<3;i++)await frame();
    check(JSON.stringify(g.performance().buffer)===JSON.stringify(buffer),'A temporary zero-sized layout must preserve the last valid buffers');
    canvas.style.width='';canvas.style.height='';
    for(let i=0;i<3;i++)await frame();check(pixel(),'The canvas returns after a hidden layout');
    g.start();g.teleport(-62,-35);g.aim(-104,2,-35);g.resume();
    for(let i=0;i<100&&g.state().enemies.length<30;i++){const angle=i*2.399;g.spawn(-104+Math.cos(angle)*(10+i%5),-35+Math.sin(angle)*(15+i%7),i%5===0?'runner':'walker');}
    check(g.state().enemies.length>=25,'Stress scenario must exercise at least 25 real enemies');
    for(let i=0;i<120;i++)await frame();
    const intervals=[];let previous=await frame();
    for(let i=0;i<180;i++){const now=await frame();intervals.push(now-previous);previous=now;}
    intervals.sort((a,b)=>a-b);
    const stress={enemies:g.state().enemies.length,medianMs:intervals[90],p95Ms:intervals[171],maxMs:intervals[179],telemetry:g.performance()};
    g.consume('flare');await frame();check(pixel(),'Flare lighting still renders');
    const texturesBeforeRestart=g.performance().textures;
    g.start();const texturesAfterRestart=g.performance().textures;
    for(let i=0;i<8;i++)await frame();
    check(g.state().enemies.length===0,'Restart releases enemies');check(pixel(),'Restart preserves a valid render');
    check(texturesBeforeRestart-texturesAfterRestart>=20,`Restart must release enemy animation textures: ${texturesBeforeRestart} -> ${texturesAfterRestart}`);
    check(black===0,'Room and day/night transitions must not produce black frame samples');
    check(g.performance().contextLosses===0&&gl.getError()===gl.NO_ERROR,'No spontaneous context loss or GL errors');
    return {passed:['room/day/night transitions','shader reuse','zero-size layouts','30-enemy workload','flare','restart','enemy texture release'],blackSamples:black,programStart,programEnd,texturesBeforeRestart,texturesAfterRestart,stress};
  });
  for(const [width,height] of [[1280,720],[1920,1080],[960,640],[1600,900]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(120);
    const ok=await page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(resolve));const canvas=document.querySelector('.game-canvas'),gl=canvas.getContext('webgl2'),bytes=new Uint8Array(16*16*4);gl.readPixels(gl.drawingBufferWidth/2-8,gl.drawingBufferHeight/2-8,16,16,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes.some((v,i)=>i%4!==3&&v>3);});
    if(!ok)throw Error(`Black canvas after resize to ${width}x${height}`);
  }
  result.passed.push('window resizing');
  const recovery=await page.evaluate(async()=>{
    const canvas=document.querySelector('.game-canvas'),gl=canvas.getContext('webgl2'),extension=gl.getExtension('WEBGL_lose_context');
    if(!extension)return {supported:false};
    const lost=new Promise(resolve=>canvas.addEventListener('webglcontextlost',resolve,{once:true}));
    extension.loseContext();await lost;
    await new Promise(resolve=>setTimeout(resolve,150));
    const restored=new Promise(resolve=>canvas.addEventListener('webglcontextrestored',resolve,{once:true}));
    extension.restoreContext();await restored;
    const deadline=performance.now()+10000;
    while(window.__nachtwache.performance().contextLost&&performance.now()<deadline)await new Promise(resolve=>requestAnimationFrame(resolve));
    for(let i=0;i<6;i++)await new Promise(resolve=>requestAnimationFrame(resolve));
    const telemetry=window.__nachtwache.performance(),bytes=new Uint8Array(16*16*4);
    gl.readPixels(gl.drawingBufferWidth/2-8,gl.drawingBufferHeight/2-8,16,16,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
    if(telemetry.contextLost||!bytes.some((v,i)=>i%4!==3&&v>3)||gl.getError()!==gl.NO_ERROR)throw Error('Rendering did not recover from the simulated WebGL context loss');
    return {supported:true,losses:telemetry.contextLosses,recovered:true};
  });
  result.recovery=recovery;if(recovery.recovered)result.passed.push('context restoration');
  result.errors=errors;page.off('pageerror',onError);page.off('console',onConsole);
  if(errors.length)throw Error(errors.join('\n').slice(0,3000));
  return result;
}
