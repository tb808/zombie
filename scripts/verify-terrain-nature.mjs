import assert from 'node:assert/strict';
import { Scene, Vector3, Matrix4 } from 'three';
import { STRUCTURES, REGION_LOOT, ROAD_LINES, REGION_POIS, inLegacy, seeded, roadClearance, waterClearance, overlaps, SpatialIndex } from '../app/regionPlan.ts';
import { groundHeight, terrainHeight, terrainSurfaceHeight } from '../app/regionTerrain.ts';
import { SITE_RESERVATIONS } from '../app/shelterSites.ts';
import { planSettlementDetail } from '../app/settlementPlan.ts';
import { buildRegionWorld, regionalCollision } from '../app/regionWorld.ts';
import { buildRegionNature, planRegionNature, natureSupport } from '../app/regionNature.ts';

for(const [cx,cz]of [[-1000,80],[-880,330],[-370,450],[10,-500]]){
  const samples=[];for(let z=cz-100;z<=cz+100;z+=20)for(let x=cx-100;x<=cx+100;x+=20)samples.push(terrainHeight(x,z));
  assert(Math.max(...samples)-Math.min(...samples)>7,`Visible rolling relief around ${cx},${cz}`);
}
assert(Math.abs(groundHeight(-1062,-232)-groundHeight(-1060,-232))<2,'Road-to-bank transition does not form a sudden cliff');
for(const b of STRUCTURES){const y=terrainHeight(b.x,b.z);
  for(const dx of [-b.hx,0,b.hx])for(const dz of [-b.hz,0,b.hz])assert(Math.abs(terrainHeight(b.x+dx,b.z+dz)-y)<.12,`${b.id} whole foundation stays level`);
}
for(const s of SITE_RESERVATIONS){const y=terrainHeight(s.x,s.z);
  for(const dx of [-s.hx+1,0,s.hx-1])for(const dz of [-s.hz+1,0,s.hz-1])assert(Math.abs(terrainHeight(s.x+dx,s.z+dz)-y)<.12,'Safehouse/camp footprint remains level');
}
const collision=regionalCollision(),dressing=planSettlementDetail();
const footprints=[...collision.obstacles,...dressing.props],plan=planRegionNature(footprints);
assert.deepEqual(plan,planRegionNature(footprints),'Deterministic nature distribution');
for(const kind of ['rock','shrub','fern','grass'])assert(plan.filter(p=>p.kind===kind).length>500,`${kind} distributed in the region`);
const occupied=new SpatialIndex();footprints.forEach(p=>occupied.add(p));
for(const p of plan){
  assert(roadClearance(p.x,p.z)>p.radius+3&&waterClearance(p.x,p.z)>p.radius+3,'Roads and shores stay clear');
  assert(!occupied.query(p.x,p.z,p.hx+.59).some(q=>overlaps(p,q,.59)),'No stacked objects');occupied.add(p);
  const support=natureSupport(p.x,p.z,p.radius);assert(support.slope<=.46&&support.error<=.09,'Entire support footprint is suitable');
  if(p.kind==='rock'){const o={x:p.x,z:p.z,hx:p.radius*.8,hz:p.radius*.8};collision.index.add(o);}
}
for(const p of [...REGION_LOOT,...REGION_POIS,...ROAD_LINES.flatMap(r=>r.samples)])assert(!collision.blocked(p.x,p.z),'Loot, landmarks and routes stay accessible');
const scene=new Scene(),world=buildRegionWorld(scene),nature=buildRegionNature(scene,plan);
// Compare objects' ground height to actual rendered triangles, not the raw
// mathematical height field. Every chunk includes arbitrary triangle interiors.
let triangles=0;
for(const group of world.root.children){if(group.children.length!==1||!group.children[0].isMesh)continue;
  const mesh=group.children[0],g=mesh.geometry,index=g.index;if(!index)continue;
  const vertices=g.getAttribute('position');
  if(vertices.count!==2601)continue;
  for(let n=0;n<8;n++){
    const triangle=Math.floor(seeded(n*71+vertices.getX(0))*index.count/3),i=triangle*3;
    const a=new Vector3().fromBufferAttribute(vertices,index.getX(i)),b=new Vector3().fromBufferAttribute(vertices,index.getX(i+1)),c=new Vector3().fromBufferAttribute(vertices,index.getX(i+2));
    const p=a.multiplyScalar(.23).addScaledVector(b,.38).addScaledVector(c,.39);
    assert(Math.abs(terrainSurfaceHeight(p.x,p.z)-p.y)<.0001,`Object bases match rendered ground triangles at ${p.toArray()}`);triangles++;
    if(!inLegacy(p.x,p.z)&&waterClearance(p.x,p.z)>40)assert(Math.abs(terrainHeight(p.x,p.z)-p.y)<.001,'Actor feet match rendered ground');
  }
}
assert(triangles>3000,'Check terrain chunks throughout the region');
// Check the transformed, rendered asset vertices against real terrain heights.
let checked=0;
nature.root.traverse(mesh=>{if(!mesh.isInstancedMesh)return;const matrix=new Matrix4(),p=new Vector3(),v=mesh.geometry.getAttribute('position');
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);let top=-Infinity,bottom=Infinity;
    for(let j=0;j<v.count;j++){p.fromBufferAttribute(v,j).applyMatrix4(matrix);const clearance=p.y-terrainHeight(p.x,p.z);bottom=Math.min(bottom,clearance);top=Math.max(top,clearance);}
    assert(bottom>-.16,`Nature asset not buried (${bottom})`);assert(top>.12,'Nature remains visibly above ground');checked++;
  }
});
nature.update(5000,5000);assert.equal(nature.stats().activeCells,0,'Nature culls outside range');
nature.update(-794,494);assert(nature.stats().activeCells<nature.stats().cells*.15,'Local nature draw budget');
console.log('PASS: varied hills, full foundations and shelters, deterministic spaced nature, clear roads/loot, terrain triangle agreement, transformed asset grounding and culling.',{...nature.stats(),checked,triangles});
