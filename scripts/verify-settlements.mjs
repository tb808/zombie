import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { DRESSING_RESERVED, PROP_DEFS, SETTLEMENT_ROADS, dressingRoadClearance, planSettlementDetail } from '../app/settlementPlan.ts';
import { buildSettlementGeometry } from '../app/settlementDetail.ts';
import { BRIDGES, REGION_LOOT, ROAD_LINES, STRUCTURES, lineDistance, overlaps, waterClearance } from '../app/regionPlan.ts';
import { terrainHeight } from '../app/regionTerrain.ts';
import { findPath } from '../app/survival.ts';
import { regionalCollision } from '../app/regionWorld.ts';

const plan=planSettlementDetail(),scene=new Scene(),detail=buildSettlementGeometry(scene,plan);
assert(plan.props.length>1200&&plan.scenes.length>=23,'Substantial context-based settlement dressing');
assert.deepEqual(plan,planSettlementDetail(),'Stable placements and variants');
const counts=plan.props.reduce((a,p)=>(a[p.kind]=(a[p.kind]??0)+1,a),{});
for(const kind of ['lamp','villageLamp','bench','bin','hydrant','trafficLight','streetSign','mailbox','hedge','bicycle','shelter','busStop','car','ambulance','policeCar','fireTruck','truck','bus','tractor','trailer','forklift','container','pallet','crate','dumpster','cart','smallTree','table','fallenChair','wreck','brokenLamp'])assert(counts[kind]>0,`${kind} is actually placed`);
for(const [i,p]of plan.props.entries()){
  assert.equal(p.y,terrainHeight(p.x,p.z),'Props follow actor/terrain surface');
  assert(dressingRoadClearance(p.x,p.z)>=Math.hypot(p.hx,p.hz)+.39,`${p.kind} stays outside the carriageway`);
  assert(waterClearance(p.x,p.z)>=Math.hypot(p.hx,p.hz)+1.99,'Dry placements');
  assert(!DRESSING_RESERVED.some(q=>Math.abs(q.x-p.x)<p.hx+1.79&&Math.abs(q.z-p.z)<p.hz+1.79),'Loot and interaction clearance');
  for(const q of plan.props.slice(i+1))assert(!overlaps(p,q,.34),`${p.id}/${q.id} have distinct space`);
  const bounds=detail.bounds[`${p.kind}-${p.variant}`],d=PROP_DEFS[p.kind];
  assert(bounds.min[1]>=-.08,'No geometry buried below its intended roots/base');
  assert(Math.max(Math.abs(bounds.min[0]),Math.abs(bounds.max[0]))<=d.w/2+.02,`${p.kind} width matches placement envelope`);
  assert(Math.max(Math.abs(bounds.min[2]),Math.abs(bounds.max[2]))<=d.d/2+.02,`${p.kind} depth matches placement envelope`);
}
for(const village of ['VILLAGE_01','VILLAGE_02','VILLAGE_03','VILLAGE_04']){
  assert(plan.props.filter(p=>p.zone===village).length>=15,`${village} has a distinct detailed settlement`);
  assert(!plan.props.some(p=>p.zone===village&&['trafficLight','advert'].includes(p.kind)),'Rural contexts avoid urban signals/advertising');
}
const collision=regionalCollision();for(const p of plan.props)if(PROP_DEFS[p.kind].solid){const o=['lamp','villageLamp','smallTree'].includes(p.kind)?{x:p.x,z:p.z,hx:.15,hz:.15}:p;collision.index.add(o);}
for(const r of ROAD_LINES)for(const p of r.samples)assert(!collision.blocked(p.x,p.z),`${r.id} remains passable`);
for(const p of REGION_LOOT)assert(!collision.blocked(p.x,p.z),'Every regional loot location stays accessible');
for(const b of STRUCTURES.filter(b=>b.enterable))for(const side of [-1,1]){
  const start={x:b.x,z:b.z+side*(b.depth/2+2)},end={x:b.x,z:b.z};assert(findPath(start,end,collision.near(start,end)).length,'Ground-floor doors stay walkable');
}
for(const b of BRIDGES)assert(!collision.blocked(b.x,b.z),'Bridges stay open');
for(const stop of plan.scenes.filter(s=>s.kind==='busStop'))assert(SETTLEMENT_ROADS.some(r=>Math.hypot(stop.x-r.a.x,stop.z-r.a.z)<25||Math.hypot(stop.x-r.b.x,stop.z-r.b.z)<25),'Stops connect to actual roads');
for(const curb of plan.lines.filter(l=>l.kind==='curb')){const steps=Math.ceil(Math.hypot(curb.b.x-curb.a.x,curb.b.z-curb.a.z));for(let n=0;n<=steps;n++){const p={x:curb.a.x+(curb.b.x-curb.a.x)*n/steps,z:curb.a.z+(curb.b.z-curb.a.z)*n/steps};assert(SETTLEMENT_ROADS.every(r=>lineDistance(p,r)>=r.width/2+.11),'No curb crosses a carriageway, including a bend in the same street');}}
let instances=0;detail.root.traverse(o=>{if(o.isMesh){assert(o.isInstancedMesh,'No individual prop mesh per item');instances+=o.count;const data=o.geometry.getAttribute('position');for(const v of data.array)assert(Number.isFinite(v),'Finite geometry');}});
assert(instances>plan.props.length*5,'Assemblies use shared instanced components');
detail.update(5000,5000);assert(detail.root.children.every(c=>!c.visible),'All detail cells cull independently');
detail.update(370,4);assert(detail.stats().activeCells<detail.stats().cells*.35,'Only local detail is active');
assert(detail.lighting(1,true,new Vector3(370,2,4)).length<20,'Light candidates stay local');
assert(detail.lighting(1,false,new Vector3(370,2,4)).every(l=>l.intensity===0),'Existing power quest controls new lamps');
console.log('PASS: all prop families, deterministic district contexts, actual model envelopes, roads/doors/loot/bridges, grounding, instancing, culling and bounded local lighting.',{...detail.stats(),counts});
