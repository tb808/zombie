import assert from 'node:assert/strict';
import { BoxGeometry, Mesh, MeshBasicMaterial, Scene } from 'three';
import { LEGACY_FOUNDATIONS } from '../app/legacyLayout.ts';
import { LEGACY_PARKING, STREET_SEGMENTS, footprintStreetClearance, segmentBoxDistance, sidewalkWidth, streetClearance } from '../app/streetPlan.ts';
import { planStreetSurfaces } from '../app/streetGeometry.ts';
import { SITE_FIXTURES, STRUCTURES, TREES, SpatialIndex, overlaps, lineDistance, waterBlocked } from '../app/regionPlan.ts';
import { planSettlementDetail, PROP_DEFS } from '../app/settlementPlan.ts';
import { terrainHeight } from '../app/regionTerrain.ts';
import { buildCity } from '../app/city.ts';
import { regionalCollision } from '../app/regionWorld.ts';
import { groundSurfaceTriangles } from '../app/groundSurface.ts';
import { terrainSurfaceHeight } from '../app/regionTerrain.ts';
import { recoverSavedPosition } from '../app/saveGame.ts';

// This checks complete road widths and actual envelopes, not just centrelines.
const plan=planSettlementDetail(),patches=planStreetSurfaces();
for(const [x,z]of [[-400,-730],[-1030,85],[-24,-7]]){
  const points=[[-6,-2],[6,-2],[6,2],[-6,2]].map(([dx,dz])=>({x:x+dx*.8-dz*.6,z:z+dx*.6+dz*.8})),vertices=groundSurfaceTriangles(points,.07);
  assert(vertices.length>18,'Ground surfaces are split across actual terrain triangles');
  for(let i=0;i<vertices.length;i+=9){const x=(vertices[i]+vertices[i+3]+vertices[i+6])/3,y=(vertices[i+1]+vertices[i+4]+vertices[i+7])/3,z=(vertices[i+2]+vertices[i+5]+vertices[i+8])/3;assert(Math.abs(y-terrainSurfaceHeight(x,z)-.07)<.0001,'No soil cuts through rotated asphalt or paving');}
}
const clear={x:100,z:100};assert.equal(recoverSavedPosition(clear,()=>false),clear,'Valid old saves keep their exact position');
const recovered=recoverSavedPosition({x:0,z:0},(x,z)=>Math.abs(x)<4&&Math.abs(z)<4);assert(recovered&&(Math.abs(recovered.x)>=4||Math.abs(recovered.z)>=4),'Recover an old save covered by a moved building');
const lamps=plan.props.filter(p=>p.kind==='lamp'||p.kind==='villageLamp');
for(const [i,p]of lamps.entries())for(const q of lamps.slice(i+1))assert(Math.hypot(p.x-q.x,p.z-q.z)>=18,'No lamp clusters after a long rural approach or at a junction');
for(const b of [...LEGACY_FOUNDATIONS,...LEGACY_PARKING.map(p=>({...p,hx:1.2,hz:2.4})),...plan.props])assert(footprintStreetClearance(b,true)>=.3,`${b.name??b.kind??'parking'} obstructs a street or pavement`);
for(const b of LEGACY_FOUNDATIONS)for(const dx of [-b.hx,0,b.hx])for(const dz of [-b.hz,0,b.hz])assert(Math.abs(terrainHeight(b.x+dx,b.z+dz)-terrainHeight(b.x,b.z))<.02,`${b.name}: full level foundation`);
for(const p of SITE_FIXTURES){
  assert(footprintStreetClearance(p)>.1,'Fixed working-yard objects stay clear of roads');
  assert(!STRUCTURES.some(b=>overlaps(p,b,0)),'Landmark assembly overlaps a building');
  assert(!TREES.some(t=>overlaps({...t,hx:.4,hz:.4},p,0)),'Tree in a landmark assembly');
}
for(const b of STRUCTURES)assert(plan.lines.filter(l=>l.scene===`yard-${b.id}`).length>=(b.enterable?3:2),`${b.id}: front path must connect to a road`);
for(const l of plan.lines.filter(l=>l.kind==='walk'))for(const p of plan.props)assert(segmentBoxDistance({...l,id:'access'},p)>l.width/2+.3,`${p.kind} obstructs a planned access path`);
assert.equal(plan.scenes.filter(s=>s.kind==='busStop').length,6,'Complete bus stops in all four villages and both urban districts');
for(const s of plan.scenes.filter(s=>s.kind==='busStop'))for(const kind of ['shelter','busStop'])assert(plan.props.some(p=>p.scene===s.id&&p.kind===kind),`${s.id}: missing ${kind}`);

const pavement=new SpatialIndex(32);
for(const patch of patches.filter(p=>p.kind!=='marking')){
  const minX=Math.min(...patch.points.map(p=>p.x)),maxX=Math.max(...patch.points.map(p=>p.x)),minZ=Math.min(...patch.points.map(p=>p.z)),maxZ=Math.max(...patch.points.map(p=>p.z));
  pavement.add({x:(minX+maxX)/2,z:(minZ+maxZ)/2,hx:(maxX-minX)/2,hz:(maxZ-minZ)/2,patch});
  for(const [i,p]of patch.points.entries()){
    const q=patch.points[(i+1)%patch.points.length];
    for(const v of [p,{x:(p.x+q.x)/2,z:(p.z+q.z)/2}])assert(streetClearance(v.x,v.z)>=-.001,`${patch.road}: ${patch.kind} cuts across a carriageway`);
  }
}
const contains=(p,poly)=>{const signs=poly.map((a,i)=>{const b=poly[(i+1)%poly.length];return (b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);});return signs.every(n=>n>=-.001)||signs.every(n=>n<=.001);};
let coverage=0;
for(const r of STREET_SEGMENTS){
  const p={x:(r.a.x+r.b.x)/2,z:(r.a.z+r.b.z)/2},walk=sidewalkWidth(r,p),length=Math.hypot(r.b.x-r.a.x,r.b.z-r.a.z);
  if(!walk||STREET_SEGMENTS.some(other=>other.id!==r.id&&lineDistance(p,other)<other.width/2+r.width/2+walk+7))continue;
  for(const side of [-1,1]){const d=r.width/2+walk*.65,q={x:p.x+(r.b.z-r.a.z)/length*d*side,z:p.z-(r.b.x-r.a.x)/length*d*side};
    if(streetClearance(q.x,q.z)<.2)continue; // Inside the other arm of the same bend.
    assert(pavement.query(q.x,q.z,.01).some(v=>v.patch.kind==='sidewalk'&&contains(q,v.patch.points)),`${r.id}: missing continuous pavement`);coverage++;
  }
}
assert(coverage>200,'Coverage checked across the complete street network');
const collision=regionalCollision(),cityObstacles=[];
buildCity(new Scene(),terrainHeight,cityObstacles,()=>new Mesh(new BoxGeometry(),new MeshBasicMaterial()));
const solid=new SpatialIndex(32);[...collision.obstacles.filter(p=>!p.navigationOnly),...cityObstacles,...LEGACY_FOUNDATIONS,...plan.props.filter(p=>PROP_DEFS[p.kind].solid)].forEach(p=>solid.add(p));
let roadChecks=0;
for(const r of STREET_SEGMENTS){const length=Math.hypot(r.b.x-r.a.x,r.b.z-r.a.z),steps=Math.ceil(length);
  for(let n=0;n<=steps;n++)for(const side of [-1,0,1]){const offset=side*(r.width/2-.8),p={x:r.a.x+(r.b.x-r.a.x)*n/steps+(r.b.z-r.a.z)/length*offset,z:r.a.z+(r.b.z-r.a.z)*n/steps-(r.b.x-r.a.x)/length*offset};
    assert(!waterBlocked(p.x,p.z)&&!solid.query(p.x,p.z,.3).some(o=>Math.abs(p.x-o.x)<o.hx+.25&&Math.abs(p.z-o.z)<o.hz+.25),`${r.id}: blocked road width at ${p.x},${p.z}`);roadChecks++;
  }
}
console.log('PASS: whole-width roads, complete pavement/kerb polygons, connected house paths, six complete stops, original GLB envelopes/foundations, fixed yards and separated furniture.',{roadChecks,pavementSamples:coverage,streetPatches:patches.length,props:plan.props.length,scenes:plan.scenes.length});
