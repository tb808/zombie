import assert from 'node:assert/strict';
import { daylightAt, DAY_SECONDS, REFUGES, refugeAt, refugeWalls, footprintsOverlap } from '../app/environment.ts';
import { CITY_NPCS, CITY_LOOT, DISCOVERIES, buildCity } from '../app/city.ts';
import { findPath } from '../app/survival.ts';
import { Scene, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';

const atHour = hour => daylightAt(((hour - 9 + 24) % 24) * 60);
assert.equal(daylightAt(0).clock, '09:00');
assert.equal(daylightAt(DAY_SECONDS).day, 2);
assert.equal(daylightAt(DAY_SECONDS).clock, '09:00');
assert(atHour(12).sunIntensity > 3 && atHour(12).daylight === 1);
assert.equal(atHour(0).sunIntensity, 0);
assert(atHour(0).moonIntensity > .2 && atHour(0).skyIntensity > 0);
assert(atHour(0).fogDensity < .005);
for (const hour of [6,18,0]) {
  const before=atHour((hour-.001+24)%24), after=atHour(hour+.001);
  for (const key of ['daylight','twilight','sunIntensity','moonIntensity','skyIntensity','fogDensity'])
    assert(Math.abs(before[key]-after[key])<.005, `${key} transitions smoothly at ${hour}`);
}
const scene=new Scene(), obstacles=[];
buildCity(scene,()=>0,obstacles,()=>new Mesh(new BoxGeometry(),new MeshBasicMaterial()));
obstacles.push(...REFUGES.flatMap(refugeWalls));
for (const refuge of REFUGES) {
  assert.equal(refugeAt(refuge.x,refuge.z)?.id,refuge.id);
  assert(!refugeAt(refuge.x+refuge.hx+3,refuge.z));
  const entrance={x:refuge.x,z:refuge.z+refuge.hz+3};
  assert(findPath(entrance,{x:refuge.x,z:refuge.z+refuge.hz-2},obstacles).length,`${refuge.id} entrance is walkable`);
  for (const target of [...CITY_NPCS,...CITY_LOOT,...DISCOVERIES].filter(p=>refugeAt(p.x,p.z)?.id===refuge.id))
    assert(findPath(entrance,target,obstacles).length,`${refuge.id} target ${target.id??target.kind} is reachable`);
}
for (const npc of CITY_NPCS) assert(refugeAt(npc.x,npc.z),`${npc.id} belongs to a refuge`);
for (let i=0;i<CITY_NPCS.length;i++) for(let j=i+1;j<CITY_NPCS.length;j++)
  assert(Math.hypot(CITY_NPCS[i].x-CITY_NPCS[j].x,CITY_NPCS[i].z-CITY_NPCS[j].z)>2,'NPCs have room to stand');
assert(footprintsOverlap({x:0,z:0,hx:2,hz:2},{x:3,z:0,hx:2,hz:2}));
assert(!footprintsOverlap({x:0,z:0,hx:2,hz:2},{x:5,z:0,hx:2,hz:2}));
console.log('PASS: 24-minute day cycle, sunrise/sunset continuity, night visibility, refuge entrances and reachable residents/loot.');
