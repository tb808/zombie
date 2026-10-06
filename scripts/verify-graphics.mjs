import assert from 'node:assert/strict';
import { Scene, Box3, Vector3, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import { surfacePixels, surfaceMaterial, SURFACE_SCALE } from '../app/surfaces.ts';
import { detailedAsset, detailedCar } from '../app/naturalAssets.ts';
import { buildWorldDetail, detailAllowed, roadDistance } from '../app/worldDetail.ts';
import { CITY_PLACES, CITY_ROADS, CITY_LOOT, CITY_NPCS, DISCOVERIES, buildCity } from '../app/city.ts';
import { REFUGES, refugeWalls } from '../app/environment.ts';
import { LOOT, NOTES } from '../app/world.ts';
import { HOUSE_LOOT } from '../app/safehouses.ts';
import { CAMPAIGN } from '../app/campaign.ts';

for(const kind of Object.keys(SURFACE_SCALE)){
  const a=surfacePixels(kind,64),b=surfacePixels(kind,64);
  assert.deepEqual(a.color,b.color,`${kind} deterministic across restarts`);
  assert(a.color.length===64*64*4&&a.relief.length===a.color.length&&a.roughness.length===a.color.length);
  assert(new Set(a.relief).size>4&&new Set(a.color).size>8,`${kind} has actual surface variation`);
  const material=surfaceMaterial(kind);assert.equal(material.userData.worldSurface,kind);
}
for(const name of ['pine','suburban-tree-large','rock-a','barrel','box','box-open','chest']){
  const object=detailedAsset(name,67),bounds=new Box3().setFromObject(object),size=bounds.getSize(new Vector3());
  assert(!bounds.isEmpty()&&size.y>0&&Number.isFinite(size.x),`${name} valid real bounds`);
  assert(object.children.length<=3,`${name} uses at most three material batches`);
  object.traverse(child=>{if(child.isMesh){const positions=child.geometry.getAttribute('position');assert(positions.count>100,`${name} includes detailed geometry`);for(const value of positions.array)assert(Number.isFinite(value));}});
}
const car=detailedCar(1),carSize=new Box3().setFromObject(car).getSize(new Vector3());
for(const name of ['pine','suburban-tree-large'])for(const seed of [1,67,9927]){
  const tree=detailedAsset(name,seed),copy=detailedAsset(name,seed),leaves=tree.children.find(c=>c.material.map);
  assert.equal(tree.children.length,2,'Trees keep a single bark and foliage batch');
  const bounds=new Box3().setFromObject(tree),size=bounds.getSize(new Vector3());
  assert(Math.abs(bounds.min.y)<.01&&size.y>7&&size.y<8.5&&size.x>3&&size.x<8&&size.z<8,'Tree scale and grounded trunk remain valid across seeds');
  const texture=leaves.material.map,alpha=Array.from(texture.image.data).filter((_,i)=>i%4===3);
  assert(texture.image.width===512&&alpha.filter(a=>a>128).length>alpha.length*.12&&alpha.filter(a=>a===0).length>alpha.length*.2,'Fine foliage has density and real silhouette gaps');
  let triangles=0;
  tree.children.forEach((mesh,i)=>{
    const p=mesh.geometry.getAttribute('position');triangles+=p.count/3;
    assert.deepEqual(p.array,copy.children[i].geometry.getAttribute('position').array,'Seeded trees remain stable across restarts');
    for(const value of p.array)assert(Number.isFinite(value),'Every trunk and twig vertex is finite');
  });
  assert(triangles<15000,'Detailed trees remain inside the triangle budget');
}
assert(carSize.x>2&&carSize.x<2.5&&carSize.z>4.3&&carSize.z<4.7&&carSize.y<1.7,'Vehicle remains human-scaled and fits the parking bays');
assert(car.children.length<7,'Detailed car is batched');
const scene=new Scene(),obstacles=[];
buildCity(scene,()=>.15,obstacles,()=>new Mesh(new BoxGeometry(),new MeshBasicMaterial()));
obstacles.push(...REFUGES.flatMap(refugeWalls));
const reserved=[...LOOT,...NOTES,...CITY_LOOT,...CITY_NPCS,...DISCOVERIES,...HOUSE_LOOT,...CAMPAIGN,{x:-61,z:-35}];
const footprints=[...obstacles,...CITY_PLACES.map(p=>({...p,hx:p.hx??7.5,hz:p.hz??7})),...REFUGES];
const roads=[...CITY_ROADS,{x:0,z:-7,w:145,h:9,rotation:.05},{x:18,z:10,w:8,h:48,rotation:-.55},{x:53,z:0,w:8,h:58,rotation:.42}];
const addedCollision=[];
const detail=buildWorldDetail(scene,()=>.15,footprints,reserved,roads,addedCollision);
assert(detail.stats.tufts>1000&&detail.stats.trees>20&&detail.stats.roadPieces>100&&detail.stats.puddles>20&&detail.stats.streetProps>10);
for(const p of reserved)assert(!addedCollision.some(o=>Math.abs(p.x-o.x)<o.hx+.48&&Math.abs(p.z-o.z)<o.hz+.48),`New dressing blocks ${p.id??p.kind??'mission'} at ${p.x},${p.z}`);
for(const p of CITY_PLACES)assert(!detailAllowed(p.x,p.z,footprints,reserved,roads),'Building floors exclude vegetation');
assert.equal(roadDistance(0,0,{x:0,z:0,w:10,h:20}),0);
assert.equal(roadDistance(8,0,{x:0,z:0,w:10,h:20}),3);
detail.update(-61,-35);assert(scene.children.some(g=>g.name.startsWith('world-detail')&&g.visible));
detail.update(1000,1000);assert(scene.children.filter(g=>g.name.startsWith('world-detail')).every(g=>!g.visible),'Distance culling hides far dressing');
console.log('PASS: 11 deterministic PBR surfaces, organic assets, rounded vehicles, world bounds, indoor/road exclusions, reachable missions and collision-safe dressing:',detail.stats);
