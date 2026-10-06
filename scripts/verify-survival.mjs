import assert from 'node:assert/strict';
import { Scene, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import { makeBrain, think, transition, findPath, freshArsenal, WEAPONS, ZOMBIES } from '../app/survival.ts';
import { segmentBlocked } from '../app/world.ts';
import { CITY_LOOT, CITY_PLACES, CITY_NPCS, DISCOVERIES, buildCity } from '../app/city.ts';
import { refugeAt } from '../app/environment.ts';

const origin={x:0,z:0}, player={x:0,z:6}, wall=[{x:0,z:3,hx:3,hz:.3}];
const brain=makeBrain(origin);
think(brain,'walker',origin,player,0,wall,[{x:6,z:0,radius:30,life:1,kind:'shot'}],.1);
assert.equal(brain.state,'investigate');assert.deepEqual(brain.target,{x:6,z:0},'Hearing targets the sound, not the hidden player');
const visual=makeBrain(origin);think(visual,'walker',origin,player,0,[],[],.1);assert.equal(visual.state,'notice');
think(visual,'walker',origin,player,0,[],[],.6);think(visual,'walker',origin,player,0,[],[],.1);assert.equal(visual.state,'chase');
think(visual,'walker',origin,{x:20,z:9},0,wall,[],.1);assert.deepEqual(visual.target,player,'Lost sight keeps last known position');
const attack=makeBrain(origin);transition(attack,'attack',.72);
assert.equal(think(attack,'walker',origin,{x:0,z:1},0,[],[],.2).strike,false,'Windup cannot damage');
assert.equal(think(attack,'walker',origin,{x:0,z:4},0,[],[],.4).strike,false,'Player can dodge before impact');
transition(attack,'attack',.72);assert(think(attack,'walker',origin,{x:0,z:1},0,[],[],.6).strike);assert(!think(attack,'walker',origin,{x:0,z:1},0,[],[],.02).strike,'Only one hit per swing');
const behind=makeBrain(origin);think(behind,'walker',origin,{x:0,z:-10},0,[],[],.1);assert.equal(behind.state,'idle','No omnidirectional long-range sight');
const path=findPath(origin,{x:0,z:8},wall);assert(path.length>1,'Routes around wall');
let previous=origin;for(const p of path){assert(!segmentBlocked(previous.x,previous.z,p.x,p.z,wall.map(o=>({...o,hx:o.hx+.48,hz:o.hz+.48}))),'Path avoids inflated wall');previous=p;}
assert.equal(findPath(origin,{x:0,z:0},[{x:0,z:0,hx:2,hz:2}]).length,0,'No path from sealed obstacle');
const arsenal=freshArsenal(),other=freshArsenal();arsenal.pistol.ammo=0;assert.equal(other.pistol.ammo,12);assert(!arsenal.shotgun.owned);assert(WEAPONS.shotgun.pellets>1);assert(ZOMBIES.runner.speed>ZOMBIES.walker.speed);assert(ZOMBIES.tank.damage>ZOMBIES.walker.damage);

const obstacles=[],scene=new Scene();const city=buildCity(scene,()=>0,obstacles,()=>new Mesh(new BoxGeometry(),new MeshBasicMaterial()));
for(const p of CITY_PLACES){const route=findPath({x:p.x,z:p.z+12},{x:p.x,z:p.z+1},obstacles);assert(route.length,`${p.id} front entrance is walkable`);}
for(const id of ['police','lab']){const p=CITY_PLACES.find(p=>p.id===id);assert(!findPath({x:p.x,z:p.z},{x:p.x,z:p.z-5},obstacles).length,`${id} access is gated`);city.openDoor(id);assert(findPath({x:p.x,z:p.z},{x:p.x,z:p.z-5},obstacles).length,`${id} unlocked route opens`);}
for(const p of [...CITY_LOOT,...CITY_NPCS,...DISCOVERIES]){
  assert(!obstacles.some(o=>Math.abs(p.x-o.x)<o.hx+.4&&Math.abs(p.z-o.z)<o.hz+.4),`Target ${JSON.stringify(p)} inside collision`);
  const closest=[...CITY_PLACES].sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0];
  const refuge=refugeAt(p.x,p.z);
  assert(findPath(refuge?{x:refuge.x,z:refuge.z+refuge.hz+3}:{x:closest.x,z:closest.z+12},p,obstacles).length,`Target at ${p.x},${p.z} reachable`);
}
city.reset();assert(city.doors.every(d=>obstacles.includes(d.obstacle)&&d.mesh.visible),'Reset restores locked doors');
let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});assert(meshes<400,`City meshes batched: ${meshes}`);
console.log(`PASS: perception, sound memory, telegraphed attacks, dodge, navigation, weapons, ${CITY_PLACES.length} enterable locations, ${CITY_LOOT.length} loot positions, doors/reset; ${meshes} batched city meshes.`);
