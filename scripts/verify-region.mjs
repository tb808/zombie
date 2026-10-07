import assert from 'node:assert/strict';
import { Scene } from 'three';
import { BRIDGES, REGION_BOUNDS, REGION_LOOT, REGION_POIS, ROAD_LINES, WATER_LINES, WATER_SEGMENTS, STRUCTURES, TREES, WORLD_ZONES, inLegacy, overlaps, roadClearance, waterClearance, waterBlocked, seeded, SpatialIndex, lineDistance } from '../app/regionPlan.ts';
import { groundHeight, originalHeight, terrainHeight } from '../app/regionTerrain.ts';
import { buildRegionWorld, regionalCollision } from '../app/regionWorld.ts';
import { WORLD, findPath } from '../app/survival.ts';

assert.deepEqual(WORLD, REGION_BOUNDS);
assert.equal((WORLD.maxX-WORLD.minX)*(WORLD.maxZ-WORLD.minZ),4_800_000);
assert(STRUCTURES.length>=110&&TREES.length>2000&&BRIDGES.length>=5);
assert(STRUCTURES.filter(b=>b.kind==='tower').length>=6,'Recognisable skyline');
const collision=regionalCollision();
for(const [i,a]of STRUCTURES.entries()){
  assert(!inLegacy(a.x,a.z,18),'Campaign buildings remain preserved');
  assert(waterClearance(a.x,a.z)>Math.hypot(a.hx,a.hz)+8,`${a.id} above water`);
  for(const b of STRUCTURES.slice(i+1))assert(!overlaps(a,b,3.9),`${a.id}/${b.id} overlapping parcels`);
  assert(Math.abs(terrainHeight(a.x,a.z)-terrainHeight(a.x+a.hx*.8,a.z))<.2,`${a.id} level foundation`);
  if(a.enterable){
    assert(!collision.blocked(a.x,a.z),`${a.id} searchable interior`);
    for(const side of [-1,1]){const outside={x:a.x,z:a.z+side*(a.depth/2+2)},inside={x:a.x,z:a.z};assert(findPath(outside,inside,collision.near(outside,inside)).length,`${a.id} doorway`);}
  }
}
for(const tree of TREES){
  assert(roadClearance(tree.x,tree.z)>=7,'No tree on a road');
  assert(waterClearance(tree.x,tree.z)>=8,'No tree in water');
  assert(!collision.blocked(tree.x+1.5,tree.z),'Trees retain space around the trunk');
}
for(const p of REGION_LOOT)assert(!collision.blocked(p.x,p.z),`Blocked ${p.kind} at ${p.x},${p.z}`);
for(const road of ROAD_LINES)for(const p of road.samples)if(!inLegacy(p.x,p.z))assert(!collision.blocked(p.x,p.z),`${road.id} blocked at ${p.x},${p.z}`);
// Graph connectivity includes crossings inside a road, not only endpoints.
const connected=new Set(ROAD_LINES.filter(r=>r.samples.some(p=>inLegacy(p.x,p.z))).map(r=>r.id));
let changed=true;
while(changed){changed=false;for(const a of ROAD_LINES)if(!connected.has(a.id)){
  const touches=ROAD_LINES.some(b=>connected.has(b.id)&&a.samples.some(p=>b.samples.slice(1).some((q,i)=>lineDistance(p,{a:b.samples[i],b:q,width:0,id:b.id,kind:b.kind})<b.width/2+a.width/2)));
  if(touches){connected.add(a.id);changed=true;}
}}
assert.equal(connected.size,ROAD_LINES.length,'Every route joins the campaign road network');
for(const p of REGION_POIS)assert(ROAD_LINES.some(r=>connected.has(r.id)&&r.samples.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<12)),`${p.id} has a connected access road`);
for(const z of WORLD_ZONES.filter(z=>z.biome==='village'))assert(STRUCTURES.filter(b=>b.zone===z.id).length>=5,`${z.id} has a real settlement`);
for(const b of BRIDGES){
  for(let t=-b.length/2;t<=b.length/2;t+=1){const x=b.x+Math.sin(b.rotation)*t,z=b.z+Math.cos(b.rotation)*t;assert(!collision.blocked(x,z),`${b.id} deck passable`);assert(Math.abs(terrainHeight(x,z)-b.level)<.001,'Actor remains on the deck');}
  assert(groundHeight(b.x,b.z)<0,'Riverbed stays beneath bridge');
  const a={x:b.x-Math.sin(b.rotation)*6,z:b.z-Math.cos(b.rotation)*6},goal={x:b.x+Math.sin(b.rotation)*6,z:b.z+Math.cos(b.rotation)*6};
  assert(findPath(a,goal,collision.near(a,goal)).length,`${b.id} escorts and zombies can cross`);
}
assert(waterBlocked(825,440),'Deep river blocks walking');
for(const [branch,parent]of [['birkenbach','aue'],['hochbach','birkenbach']]){
  const end=WATER_LINES.find(w=>w.id===branch).samples.at(-1);
  assert(WATER_SEGMENTS.filter(w=>w.id===parent).some(s=>lineDistance(end,s)<s.width/2),`${branch} visibly joins ${parent}`);
}
for(const p of [{x:-61,z:-35},{x:120,z:-70},{x:-113,z:69},{x:66,z:-25}])assert.equal(terrainHeight(p.x,p.z),originalHeight(p.x,p.z),'Original mission ground unchanged');
// Index must match exhaustive queries, including negative coordinates/borders.
const index=new SpatialIndex();const fixtures=Array.from({length:150},(_,i)=>({x:seeded(i+1)*2400-1200,z:seeded(i*7+5)*2000-1000,hx:1+seeded(i*9)*30,hz:1+seeded(i*11)*30}));fixtures.forEach(o=>index.add(o));
for(let i=0;i<100;i++){const x=seeded(i*31+2)*2400-1200,z=seeded(i*37+8)*2000-1000;assert.deepEqual(new Set(index.query(x,z,50)),new Set(fixtures.filter(o=>Math.abs(x-o.x)<=o.hx+50&&Math.abs(z-o.z)<=o.hz+50)));}
const scene=new Scene(),begin=performance.now(),world=buildRegionWorld(scene);let instanceCount=0,vertices=0;
world.root.traverse(o=>{if(!o.isMesh)return;if(o.isInstancedMesh)instanceCount+=o.count;const p=o.geometry.getAttribute('position');vertices+=p.count;for(const value of p.array)assert(Number.isFinite(value),'Finite regional geometry');});
assert(instanceCount>=TREES.length*6,'Shared tree assets use all three instanced levels');
world.update(-740,500);assert(world.stats().activeChunks<30&&world.stats().activeTrees<TREES.length*.25,'Bounded visible population');
world.update(5000,5000);assert.equal(world.stats().activeChunks,0,'Remote chunks culled');assert(world.root.children.every(c=>!c.visible),'All regional surfaces are culled outside range');
console.log('PASS: connected roads, POI access, shoreline exclusion, distinct villages, building foundations/interiors, all loot, walkable bridge decks, escort navigation, spatial queries, campaign preservation and instanced/cullable finite geometry.',{...world.stats(),vertices,buildMs:Math.round(performance.now()-begin)});
