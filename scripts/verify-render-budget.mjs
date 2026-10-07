import assert from 'node:assert/strict';
import { Scene, PointLight, Vector3 } from 'three';
import { renderPixelRatio, ResolutionBudget, makeLocalLightPool } from '../app/renderBudget.ts';
import { detailedAsset, createTreeDetailController } from '../app/naturalAssets.ts';

for(const [w,h,dpr] of [[1920,1080,1],[3840,2160,2],[800,600,2]]){
  const ratio=renderPixelRatio(w,h,dpr);
  assert(ratio<=1.25&&w*h*ratio*ratio<=1_600_001,'Physical render pixels have a fixed upper budget');
}
const budget=new ResolutionBudget();
for(let i=0;i<80;i++)budget.sample(16.7,true);
budget.sample(110,true);assert.equal(budget.scale,1,'An isolated hitch retains the buffers');
for(let i=0;i<500;i++)budget.sample(40,true);
assert.equal(budget.scale,.6,'Sustained pressure reduces resolution to the lower bound');
for(let i=0;i<2000;i++)budget.sample(2000,false);
assert.equal(budget.scale,.6,'Hidden or inactive windows cannot influence adaptation');
for(let i=0;i<3500;i++)budget.sample(16.7,true);
assert.equal(budget.scale,1,'Resolution gradually recovers after sustained headroom');
const weak=new ResolutionBudget();for(let i=0;i<60;i++)weak.sample(200,true);
assert.equal(weak.scale,.6,'Adaptation also responds to sustained frames above 150 ms');

const scene=new Scene(),pool=makeLocalLightPool(scene),near=new PointLight(0xffccaa,30,20),remote=new PointLight(0x00ff00,500,10);
near.position.set(2,3,0);remote.position.set(100,3,0);
pool.update([near,remote],new Vector3());
assert.equal(pool.slots[0].intensity,near.intensity);
assert.equal(pool.slots.filter(l=>l.intensity>0).length,1,'Distant lights stay outside the fragment workload');
pool.update([],new Vector3());
assert(scene.children.length===4&&pool.slots.every(l=>l.visible&&l.intensity===0),'Zero intensity keeps the number of GPU lights stable');

for(const name of ['pine','suburban-tree-large']){
  const scene=new Scene(),tree=detailedAsset(name,67);scene.add(tree);
  const controller=createTreeDetailController(scene),triangles=()=>tree.children.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)/3,0);
  controller.update(0,0);const near=triangles();
  controller.update(40,0);const middle=triangles();
  controller.update(100,0);const far=triangles();
  assert(middle<near*.8&&far<near*.35,'Distance levels substantially reduce submitted tree geometry');
  assert(tree.children.every(m=>!m.castShadow),'Distant trees do not repeat foliage in the shadow pass');
  controller.update(130,0);assert(!tree.visible,'Out-of-range trees are culled');
  controller.update(0,0);assert(tree.visible&&triangles()===near,'Returning to a tree restores the full detailed crown');
}
console.log('PASS: bounded physical pixels, stable resolution adaptation, fixed local-light count, three vegetation levels and full near-detail recovery.');
