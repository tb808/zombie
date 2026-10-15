import assert from 'node:assert/strict';
import { Scene, Matrix4, Vector3 } from 'three';
import { TREES, LAKES, REGION_LOOT, REGION_POIS, ROAD_LINES, STRUCTURES, roadClearance, waterClearance, overlaps, SpatialIndex } from '../app/regionPlan.ts';
import { terrainHeight } from '../app/regionTerrain.ts';
import { regionalCollision } from '../app/regionWorld.ts';
import { compactTreeParts } from '../app/compactTrees.ts';
import { instancedTreeParts } from '../app/naturalAssets.ts';
import { buildShoreline, planShoreline } from '../app/shoreline.ts';
import { buildWildlife, planWildlife, wildlifeLandClear } from '../app/wildlife.ts';

assert(TREES.length>6500,'Substantially denser regional forest');
assert(TREES.filter(t=>Math.hypot(t.x+1010,t.z-650)<100).length>180,'Dense stands remain distinct from open meadows');
assert(LAKES.length===5&&LAKES.filter(l=>l.rx<25).length===3,'Three small ponds supplement the two existing lakes');
for(const pine of [true,false]){
  const compact=compactTreeParts(pine),original=instancedTreeParts(pine,0);
  const triangles=g=>(g.index?.count??g.getAttribute('position').count)/3;
  assert(triangles(compact.foliage[0])<triangles(original.foliage[1])*.35,'Dense trees use far fewer triangles');
  assert(triangles(compact.foliage[2])<triangles(compact.foliage[0]),'Distant crowns have lower detail');
}
const collision=regionalCollision(),plan=planShoreline();
assert.deepEqual(plan,planShoreline(),'Deterministic shore dressing');
for(const kind of ['reed','shoreRock','lily','driftwood'])assert(plan.some(p=>p.kind===kind),`${kind} present`);
for(const lake of LAKES){
  assert(plan.filter(p=>p.water===lake.id).length>15,'Each pond has a dressed shoreline');
  assert(collision.blocked(lake.x,lake.z),'Pond water blocks land actors');
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const x=lake.x+Math.cos(angle)*lake.rx,z=lake.z+Math.sin(angle)*lake.rz;
    assert(Math.abs(terrainHeight(x,z)-.22)<.08,'Water edges meet the terrain');
  }
}
const occupied=new SpatialIndex();STRUCTURES.forEach(p=>occupied.add(p));
for(const p of plan){assert(roadClearance(p.x,p.z)>p.hx+3,'Shore details leave routes clear');assert(!occupied.query(p.x,p.z,p.hx+.19).some(q=>overlaps(p,q,.19)),'Shore assemblies do not overlap');occupied.add(p);
  if(p.kind==='lily')assert(waterClearance(p.x,p.z)<-.8&&p.y>.22,'Floating plants lie on water');else assert(waterClearance(p.x,p.z)>.8&&p.y>=.22,'Reeds and driftwood stand on banks');
}
const scene=new Scene(),shore=buildShoreline(scene,plan);let checked=0;
shore.root.traverse(mesh=>{if(!mesh.isInstancedMesh)return;const m=new Matrix4(),v=new Vector3(),points=mesh.geometry.getAttribute('position');
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);let bottom=Infinity;for(let j=0;j<points.count;j++){v.fromBufferAttribute(points,j).applyMatrix4(m);const water=waterClearance(v.x,v.z)<0&&v.y<.32;bottom=Math.min(bottom,v.y-(water?.22:terrainHeight(v.x,v.z)));}assert(bottom>-.2,`Shore asset grounding ${bottom}`);checked++;}
});
shore.update(5000,5000);assert.equal(shore.stats().activeCells,0,'Distant shores culled');
const homes=planWildlife(collision.blocked);assert.deepEqual(homes,planWildlife(collision.blocked),'Deterministic wildlife habitats');
for(const kind of ['deer','hare','duck'])assert(homes.filter(p=>p.kind===kind).length>=12,`${kind} inhabits suitable areas`);
for(const h of homes)assert(h.kind==='duck'?waterClearance(h.x,h.z)<-1:wildlifeLandClear(h.x,h.z,collision.blocked),'Valid habitat');
const wildlife=buildWildlife(scene,homes,collision.blocked),first=homes.find(h=>h.kind==='deer'),before=wildlife.positions();
for(let frame=0;frame<900;frame++)wildlife.update(1/30,frame/30,{x:first.x-5,z:first.z});
assert(wildlife.positions().some((p,i)=>Math.hypot(p.x-before[i].x,p.z-before[i].z)>2),'Animals really move');
for(const p of wildlife.positions())assert(p.kind==='duck'?waterClearance(p.x,p.z)<-1:wildlifeLandClear(p.x,p.z,collision.blocked),'Animals remain on navigable ground or water');
const paused=wildlife.positions();wildlife.update(0,50,first);assert.deepEqual(wildlife.positions(),paused,'Pause freezes wildlife simulation');
wildlife.update(0,50,{x:5000,z:5000});assert.equal(wildlife.stats().active,0,'Far wildlife culled');assert(wildlife.stats().meshes<=6,'Instanced animals share six batches');
for(const p of [...REGION_LOOT,...REGION_POIS,...ROAD_LINES.flatMap(r=>r.samples)])assert(!collision.blocked(p.x,p.z),'Added ponds and trees preserve missions and routes');
console.log('PASS: dense compact trees, pond terrain and shores, actual asset grounding, animal habitats, movement/pause, culling and clear routes.',{trees:TREES.length,shore:shore.stats(),animals:wildlife.stats(),checked});
