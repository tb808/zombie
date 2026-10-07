import assert from 'node:assert/strict';
import { Scene, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import { nightThreat, roamingZombie, uvScheduled, uvProtectedAt } from '../app/nightSurvival.ts';
import { SAFEHOUSES, newHouses, houseSecured, houseProtected } from '../app/safehouses.ts';
import { REFUGES, refugeWalls } from '../app/environment.ts';
import { buildSafehouseEntrances } from '../app/safehouseScene.ts';
import { buildCity } from '../app/city.ts';
import { segmentBlocked } from '../app/world.ts';
import { makeBrain, think, findPath } from '../app/survival.ts';

const time=hour=>((hour-9+24)%24)*60, day=nightThreat(time(12)), evening=nightThreat(time(18)), night=nightThreat(time(22));
assert.equal(day.strength,0);assert(evening.strength>0&&evening.strength<night.strength);
assert.equal(night.speed,1.3);assert.equal(night.damage,1.45);assert(night.spawnInterval<day.spawnInterval);
assert.equal(nightThreat(time(7)).strength,0);
for(const hour of [17,20,5,7,0])assert(Math.abs(nightThreat(time((hour-.001+24)%24)).strength-nightThreat(time(hour+.001)).strength)<.002);
for(const hour of [17.5,19,0,6.49])assert(uvScheduled(time(hour)));
for(const hour of [6.5,12,17.49])assert(!uvScheduled(time(hour)));
for(const risk of [0,1,2,3]){
  const dangerous=elapsed=>Array.from({length:1000},(_,i)=>roamingZombie(elapsed,risk,i/1000)).filter(k=>['runner','infected','tank'].includes(k)).length;
  assert(dangerous(time(22))>dangerous(time(12))+350,'Night has substantially more dangerous variants');
}
const dayBrain=makeBrain({x:0,z:0}),nightBrain=makeBrain({x:0,z:0});
think(dayBrain,'walker',{x:0,z:0},{x:0,z:19},0,[],[],.1,day.sight);
think(nightBrain,'walker',{x:0,z:0},{x:0,z:19},0,[],[],.1,night.sight);
assert.equal(dayBrain.state,'idle');assert.equal(nightBrain.state,'notice','Night zombies detect prey further away');
const houses=newHouses(),scene=new Scene(),obstacles=[];
buildCity(scene,()=>0,obstacles,()=>new Mesh(new BoxGeometry(),new MeshBasicMaterial()));
obstacles.push(...REFUGES.flatMap(refugeWalls));
const entrances=buildSafehouseEntrances(scene,()=>0,obstacles);
entrances.update(time(22),houses,.016);
for(const gate of entrances.gates){
  const a={x:gate.x,z:gate.z+2},b={x:gate.x,z:gate.z-2};
  assert(segmentBlocked(a.x,a.z,b.x,b.z,obstacles),`${gate.id}: closed gate blocks the entrance`);
  entrances.setGate(gate.id,true);
  assert(!segmentBlocked(a.x,a.z,b.x,b.z,obstacles),`${gate.id}: opening the gate clears the entrance`);
  assert(findPath(a,b,obstacles).length,`${gate.id}: open gate is navigable`);
  assert.equal(gate.uv,gate.prebuilt);
  assert.equal(gate.tubes.some(t=>t.visible),gate.prebuilt,'Unsecured buildings have no UV fixtures');
}
for(const h of SAFEHOUSES)assert(!uvProtectedAt(time(22),houses,h.x,h.z),'An unfinished house provides no invisible shield');
const state=houses.lodge;
state.windows.fill(true);state.reinforced.fill(true);state.closed.fill(true);state.bed=true;
assert(!houseSecured(state));state.claimed=true;assert(houseSecured(state));
entrances.update(time(22),houses,.016);
assert(entrances.gates.find(g=>g.id==='lodge').uv);
assert.equal(uvProtectedAt(time(22),houses,-77,13)?.id,'lodge','UV also covers the entrance court');
state.closed[1]=false;assert(!houseProtected(state));assert(houseSecured(state));
assert.equal(uvProtectedAt(time(22),houses,-77,5)?.id,'lodge','Night UV still protects an open entrance');
assert(!uvProtectedAt(time(12),houses,-77,5),'Daytime protection comes from real barricades, not UV');
entrances.update(time(12),houses,.016);assert(entrances.gates.every(g=>!g.uv&&g.light.intensity===0));
entrances.reset();assert(entrances.gates.every(g=>!g.open));
entrances.update(time(22),newHouses(),.016);assert(!entrances.gates.find(g=>g.id==='lodge').uv,'Restart clears installed UV');
console.log('PASS: dusk/night difficulty, zombie variants, perception, eight working gates, physical collisions, conditional UV and clean reset.');
