import assert from 'node:assert/strict';
import { Scene, Mesh, BoxGeometry, MeshBasicMaterial, Box3 } from 'three';
import { CITY_PLACES, CITY_LOOT, DISCOVERIES, buildCity } from '../app/city.ts';
import { INTERIOR_PLACES, INTERIOR_LOOT, INTERIOR_DISCOVERIES } from '../app/interiors.ts';
import { REFUGES, refugeWalls, footprintsOverlap } from '../app/environment.ts';
import { segmentBlocked } from '../app/world.ts';
import { findPath } from '../app/survival.ts';

const scene = new Scene(), obstacles = [];
const city = buildCity(scene, () => .15, obstacles, () => new Mesh(new BoxGeometry(), new MeshBasicMaterial()));
obstacles.push(...REFUGES.flatMap(refugeWalls));
assert.equal(INTERIOR_PLACES.length, 8);
assert.equal(CITY_PLACES.length, 21);
assert.equal(new Set(CITY_PLACES.map(p => p.id)).size, CITY_PLACES.length);
assert.equal(INTERIOR_LOOT.length, 24);
assert.equal(INTERIOR_DISCOVERIES.length, 8);
const blocked = (x, z) => obstacles.some(o => Math.abs(x - o.x) < o.hx + .48 && Math.abs(z - o.z) < o.hz + .48);

for (const p of INTERIOR_PLACES) {
  assert(CITY_PLACES.some(c => c.id === p.id));
  for (const other of CITY_PLACES.filter(c => c.id !== p.id))
    assert(!footprintsOverlap(p, { ...other, hx: other.hx ?? 7.5, hz: other.hz ?? 7 }, 0), `${p.id} overlaps ${other.id}`);
  for (const r of REFUGES) assert(!footprintsOverlap(p, r, 0), `${p.id} crosses a refuge perimeter`);
  const chunk = city.chunks.find(c => c.group.name === `interior-${p.id}`);
  assert(chunk, `${p.id} is rendered and participates in distance culling`);
  const bounds = new Box3().setFromObject(chunk.group);
  assert(bounds.min.y < .15 && bounds.max.y > 6, `${p.id} has a floor, ceiling and upper facade`);
  assert(chunk.group.children.length < chunk.group.userData.unbatchedPieces / 5, `${p.id} batching reduces draw objects by at least 80%`);
  assert(chunk.group.children.some(m => m.material?.userData.worldSurface), `${p.id} has textured PBR surfaces`);
  const front = { x: p.x, z: p.z + 11 }, rear = { x: p.x, z: p.z - 11 };
  assert(!segmentBlocked(front.x, front.z, rear.x, rear.z, obstacles), `${p.id} has a clear aisle through both exterior and interior doors`);
  assert(findPath(front, rear, obstacles).length, `${p.id} admits actors through the entire floor`);
  assert(segmentBlocked(p.x - 5, p.z, p.x, p.z, obstacles), `${p.id} side walls and window sills block movement`);
  const loot = INTERIOR_LOOT.filter(l => Math.abs(l.x - p.x) < 4 && Math.abs(l.z - p.z) < 9);
  const note = INTERIOR_DISCOVERIES.find(n => n.id === `${p.id}-letter`);
  for (const target of [...loot, note]) {
    assert(!blocked(target.x, target.z), `${p.id}: ${target.kind ?? target.id} blocked by furniture`);
    assert(findPath(front, target, obstacles).length, `${p.id}: ${target.kind ?? target.id} reachable from front door`);
    assert(findPath(rear, target, obstacles).length, `${p.id}: ${target.kind ?? target.id} reachable from rear door`);
    assert(!segmentBlocked(p.x, target.z, target.x, target.z, obstacles), `${p.id} interaction sightline stays clear`);
    assert(target.kind ? CITY_LOOT.includes(target) : DISCOVERIES.includes(target), `${p.id} target wired into gameplay`);
  }
}
city.update(137, -72);
assert(city.chunks.find(c => c.group.name === 'interior-pharmacy').group.visible);
city.update(-170, 150);
assert(!city.chunks.find(c => c.group.name === 'interior-pharmacy').group.visible);
console.log('PASS: eight distinct enterable buildings, 24 loot pickups, eight letters, furniture clearance, two entrances, room routes, collision, textures and batched distance culling.');
