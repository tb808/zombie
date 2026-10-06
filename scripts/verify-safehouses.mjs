import assert from 'node:assert/strict';
import { Scene, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import { buildCity } from '../app/city.ts';
import { SAFEHOUSES, HOUSE_LOOT, newHouses, houseReady, houseProtected, houseContains, canSleep, nextHour } from '../app/safehouses.ts';
import { daylightAt } from '../app/environment.ts';
import { segmentBlocked } from '../app/world.ts';
import { findPath } from '../app/survival.ts';
import { CAMPAIGN, missionIndex } from '../app/campaign.ts';

const states=newHouses(), other=newHouses(), obstacles=[];
const city=buildCity(new Scene(),()=>0,obstacles,()=>new Mesh(new BoxGeometry(),new MeshBasicMaterial()));
assert.equal(CAMPAIGN.length,24);assert.equal(new Set(CAMPAIGN.map(m=>m.id)).size,24);
assert(missionIndex('house')<missionIndex('sleep')&&missionIndex('sleep')<missionIndex('serum'));
for(const h of SAFEHOUSES){
  const state=states[h.id], parts=city.fortifications.filter(f=>f.house===h.id);
  assert.equal(parts.filter(f=>f.kind==='window').length,4);
  assert.equal(parts.filter(f=>f.kind==='door').length,2);
  assert(!houseReady(state)&&!houseProtected(state));
  for(const f of parts.filter(f=>f.kind!=='bed')){
    const outside={x:f.x,z:f.z+Math.sign(f.z-h.z)*2};
    const inside={x:f.x,z:f.z-Math.sign(f.z-h.z)*2};
    assert(!segmentBlocked(outside.x,outside.z,inside.x,inside.z,obstacles),`${h.id} ${f.kind} starts as a real opening`);
    city.setFortification(h.id,f.kind,f.index,true);
    assert(segmentBlocked(outside.x,outside.z,inside.x,inside.z,obstacles),'Barricades block sight and movement');
    city.setFortification(h.id,f.kind,f.index,true);
    assert.equal(obstacles.filter(o=>o===f.obstacle).length,1,'No duplicate collision after repeated update');
    if(f.kind==='window')state.windows[f.index]=true;else {state.reinforced[f.index]=true;state.closed[f.index]=true;}
  }
  state.bed=true;assert(houseReady(state));assert(!houseProtected(state),'Needs activation');
  state.claimed=true;assert(houseProtected(state));state.closed[1]=false;assert(!houseProtected(state),'Opening a door suspends safety');
  city.setFortification(h.id,'door',1,false);
  assert(findPath({x:h.x,z:h.z+10},{x:h.x,z:h.z+1},obstacles).length,'Can enter a boarded house through its open front door');
  assert(!other[h.id].bed,'New runs own independent state');
  assert(houseContains(h,h.x,h.z)&&!houseContains(h,h.x+9,h.z));
  assert(HOUSE_LOOT.filter(p=>p.kind==='planks'&&Math.abs(p.x-h.x)<6&&Math.abs(p.z-h.z)<14).reduce((n,p)=>n+p.count,0)>=8);
  for(const p of HOUSE_LOOT.filter(p=>Math.abs(p.x-h.x)<6&&Math.abs(p.z-h.z)<14))
    assert(!obstacles.some(o=>Math.abs(p.x-o.x)<o.hx+.45&&Math.abs(p.z-o.z)<o.hz+.45),'Supplies stay reachable');
}
for(const hour of [19,23,0,5.99])assert(canSleep(((hour-9+24)%24)*60));
for(const hour of [6,9,18.99])assert(!canSleep(((hour-9+24)%24)*60));
for(const elapsed of [600,900,1140,3*1440+1000]){
  const morning=nextHour(elapsed,6);assert(morning>elapsed);assert.equal(daylightAt(morning).clock,'06:00');
  assert(morning-elapsed<=1440);
}
for(const f of city.fortifications)city.setFortification(f.house,f.kind,f.index,false);
assert(city.fortifications.every(f=>!f.obstacle||!obstacles.includes(f.obstacle)),'New run removes all fortification collision');
console.log('PASS: 24 campaign steps, four enterable/fortifiable houses, real windows, door access, resources, independent state, night-only sleep and next-day morning.');
