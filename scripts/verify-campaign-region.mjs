import assert from 'node:assert/strict';
import { Scene, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import { CAMPAIGN } from '../app/campaign.ts';
import { REGIONAL_STORY } from '../app/regionalStory.ts';
import { START_POINTS, REGIONAL_SHELTERS } from '../app/shelterSites.ts';
import { SAFEHOUSES, HOUSE_LOOT } from '../app/safehouses.ts';
import { WORLD_ZONES, REGION_POIS, ROAD_LINES, inLegacy } from '../app/regionPlan.ts';
import { regionalCollision } from '../app/regionWorld.ts';
import { terrainHeight } from '../app/regionTerrain.ts';
import { buildCity } from '../app/city.ts';
import { REFUGES, refugeWalls } from '../app/environment.ts';
import { buildSafehouseEntrances } from '../app/safehouseScene.ts';
import { findPath } from '../app/survival.ts';

const centre=WORLD_ZONES.find(z=>z.id==='MAIN_CITY');
const villages=WORLD_ZONES.filter(z=>z.biome==='village').sort((a,b)=>Math.hypot(b.x-centre.x,b.z-centre.z)-Math.hypot(a.x-centre.x,a.z-centre.z));
assert.equal(villages[0].id,'VILLAGE_02');
assert(Math.abs(START_POINTS.player.x-villages[0].x)<villages[0].hx&&Math.abs(START_POINTS.player.z-villages[0].z)<villages[0].hz,'Start is inside the furthest village');
for(const zone of WORLD_ZONES){
  assert(REGIONAL_SHELTERS.some(h=>h.area===zone.id),`${zone.name} has a claimable shelter`);
  assert(CAMPAIGN.some(m=>m.area===zone.id),`${zone.name} belongs to the required story route`);
}
for(const poi of REGION_POIS)assert(REGIONAL_STORY.some(m=>m.id===poi.id||poi.id==='fuel'&&m.id==='fuelRoute'||poi.id==='power'&&m.id==='powerRoute'),`${poi.name} is visited through a connected story mission`);
assert.equal(new Set(CAMPAIGN.map(m=>m.id)).size,CAMPAIGN.length);
const regional=regionalCollision(),obstacles=[];
const city=buildCity(new Scene(),terrainHeight,obstacles,()=>new Mesh(new BoxGeometry(),new MeshBasicMaterial()));
obstacles.push(...REFUGES.flatMap(refugeWalls));
const gates=buildSafehouseEntrances(new Scene(),terrainHeight,obstacles);
const blocked=(x,z)=>regional.blocked(x,z)||obstacles.some(o=>Math.abs(x-o.x)<o.hx+.45&&Math.abs(z-o.z)<o.hz+.45);
city.openDoor('lab');city.openDoor('police');
for(const mission of CAMPAIGN)assert(!blocked(mission.x,mission.z),`${mission.id}: reachable story marker`);
for(const p of [...Object.values(START_POINTS),...HOUSE_LOOT])assert(!blocked(p.x,p.z),`Accessible supplies/training at ${p.x},${p.z}`);
for(const h of SAFEHOUSES){
  assert(!blocked(h.x,h.z+1),`${h.id}: enterable sleeping area`);
  assert(HOUSE_LOOT.filter(p=>p.kind==='planks'&&Math.hypot(p.x-h.x,p.z-h.z)<15).reduce((sum,p)=>sum+p.count,0)>=8,`${h.id}: local building materials`);
  if('area' in h){const y=terrainHeight(h.x,h.z);for(const dx of [-7,0,7])for(const dz of [-6,0,6])assert(Math.abs(terrainHeight(h.x+dx,h.z+dz)-y)<.02,`${h.id}: level floor and windows`);}
  gates.setGate(h.id,true);
  const a={x:h.x,z:h.z+13},b={x:h.x,z:h.z+1};
  assert(findPath(a,b,[...obstacles,...regional.near(a,b)]).length,`${h.id}: real path through gate and door`);
}
gates.setGate('fichtenau-camp',true);
const a=START_POINTS.player,b=START_POINTS.fuel;
assert(findPath(a,b,[...obstacles,...regional.near(a,b)]).length,'Can leave the opening camp and reach the fuel cell');
for(const road of ROAD_LINES)for(const p of road.samples)if(!inLegacy(p.x,p.z))assert(!blocked(p.x,p.z),`${road.id}: new houses do not block the road`);
console.log(`PASS: start in furthest village, ${CAMPAIGN.length} connected steps, all ${WORLD_ZONES.length} regional areas and ${REGION_POIS.length} POIs, ${SAFEHOUSES.length} buildable shelters, clear resources, level floors, working entrances and roads.`);
