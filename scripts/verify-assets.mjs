import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Box3, Vector3, Texture, AnimationMixer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { LOOT, NOTES, segmentBlocked, newInventory, ITEMS } from '../app/world.ts';
import { CITY_LOOT } from '../app/city.ts';
import { REFUGES, refugeWalls, footprintsOverlap } from '../app/environment.ts';

const root = new URL('../public/models/kenney/', import.meta.url);
const buffer = path => { const b = readFileSync(new URL(path, root)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const fbx = name => new FBXLoader().parse(buffer(`characters/${name}.fbx`), '');
const base = fbx('characterMedium');
const names = new Set(); base.traverse(child => names.add(child.name));
for (const name of ['Idle', 'Run']) {
  const clip = fbx(`animations/${name.toLowerCase()}`).animations.find(c => c.name.endsWith(`|${name}`));
  assert(clip && clip.duration > 0.5, `${name}: actual animation, not targeting pose`);
  for (const track of clip.tracks) assert(names.has(track.name.split('.')[0]), `Missing bone: ${track.name}`);
  const mixer = new AnimationMixer(base); mixer.clipAction(clip).play();
  const positions = [];
  for (const t of [0, 0.15, 0.3, 0.5]) {
    mixer.setTime(t); base.updateMatrixWorld(true);
    base.traverse(child => { if (child.isSkinnedMesh) child.computeBoundingBox(); });
    const size = new Box3().setFromObject(base).getSize(new Vector3());
    assert(size.y > 300 && size.y < 400 && size.x < 200, `${name}: invalid posed bounds`);
    positions.push(base.getObjectByName('LeftFoot').getWorldPosition(new Vector3()).toArray());
  }
  if (name === 'Run') assert(Math.abs(positions[0][2] - positions[1][2]) > 5, 'Run must move feet');
  console.log(`${name}: ${clip.tracks.length} bound tracks, ${clip.duration.toFixed(2)} s, posed bounds OK`);
  mixer.stopAllAction();
}

// Decode every shipped world model, without requiring a browser image decoder.
const loader = new GLTFLoader();
loader.register(() => ({ name: 'verify-textures', loadTexture: () => Promise.resolve(new Texture()) }));
const models = new Map();
for (const folder of ['suburban', 'industrial', 'graveyard', 'survival']) {
  for (const file of readdirSync(new URL(`${folder}/`, root)).filter(f => f.endsWith('.glb'))) {
    const asset = await loader.parseAsync(buffer(`${folder}/${file}`), '');
    const bounds = new Box3().setFromObject(asset.scene);
    assert(!bounds.isEmpty() && Number.isFinite(bounds.max.y), `${folder}/${file}: invalid bounds`);
    models.set(`${folder}/${file}`, asset.scene);
  }
}
const source = readFileSync(new URL('../app/Game.tsx', import.meta.url), 'utf8');
const buildings = [...source.matchAll(/(?:building\(|\[)'((?:suburban|industrial)-building[^']*|crypt-large)',\s*(-?[\d.]+),\s*(-?[\d.]+),\s*([\d.]+),\s*(Math.PI(?:\s*\/\s*2)?|0)/g)];
const obstacles = buildings.map(([, name, x, z, scale, rotation]) => {
  const path = name === 'crypt-large' ? `graveyard/${name}.glb` : name.replace(/^(suburban|industrial)-/, '$1/') + '.glb';
  const model = models.get(path).clone();
  const size = new Box3().setFromObject(model).getSize(new Vector3());
  model.scale.setScalar((name === 'crypt-large' ? 3.7 : 5.6) * Number(scale) / size.y);
  model.rotation.y = rotation === '0' ? 0 : rotation.includes('/') ? Math.PI / 2 : Math.PI;
  model.position.set(Number(x), 0, Number(z)); model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model), center = bounds.getCenter(new Vector3()), extent = bounds.getSize(new Vector3());
  return { name, x: center.x, z: center.z, hx: extent.x / 2, hz: extent.z / 2 };
});
assert.equal(obstacles.length, 15, 'All 15 world buildings audited');
for(let i=0;i<obstacles.length;i++)for(let j=i+1;j<obstacles.length;j++)
  assert(!footprintsOverlap(obstacles[i],obstacles[j],0),`${obstacles[i].name} overlaps ${obstacles[j].name}`);
const refugeObstacles=REFUGES.flatMap(refugeWalls);
for(const building of obstacles)for(const wall of refugeObstacles)
  assert(!footprintsOverlap(building,wall,0),`${building.name} overlaps refuge perimeter`);
obstacles.push(...refugeObstacles);
const targets = [...LOOT.map(p => ({ ...p, label: p.kind })), ...NOTES.map(p => ({ ...p, label: p.title })), ...[[-61,-35],[-53,-36],[-19,-4],[17,15],[48,23],[66,-25]].map(([x,z])=>({x,z,label:'mission'}))];
const collisions = targets.flatMap(point => obstacles.filter(o => Math.abs(point.x - o.x) < o.hx + 0.45 && Math.abs(point.z - o.z) < o.hz + 0.45).map(o => `${point.label} (${point.x},${point.z}) in ${o.name} (${o.x.toFixed(1)},${o.z.toFixed(1)}), extent ${o.hx.toFixed(1)}×${o.hz.toFixed(1)}`));
assert.deepEqual(collisions, [], 'All loot, notes, spawn and mission targets must be outside building collision boxes');
// Flood-fill the actual play bounds to catch disconnected courtyards and blocked routes.
const blocked = (x, z) => obstacles.some(o => Math.abs(x - o.x) < o.hx + 0.45 && Math.abs(z - o.z) < o.hz + 0.45);
const queue = [[-61, -35]], reachable = new Set(['-61,-35']);
for (let i = 0; i < queue.length; i++) {
  const [x, z] = queue[i];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, nz = z + dz, key = `${nx},${nz}`;
    if (nx < -87 || nx > 84 || nz < -58 || nz > 54 || reachable.has(key) || blocked(nx, nz)) continue;
    reachable.add(key); queue.push([nx, nz]);
  }
}
for (const point of targets) assert(reachable.has(`${point.x},${point.z}`), `${point.label}: no walkable path from spawn`);
const wall = [{ x: 0, z: 0, hx: 2, hz: 2 }];
assert(segmentBlocked(-5, 0, 5, 0, wall));
assert(segmentBlocked(0, -5, 0, 5, wall));
assert(!segmentBlocked(-5, 3, 5, 3, wall));
assert(!segmentBlocked(-5, 0, -3, 0, wall));
const a = newInventory(), b = newInventory(); a.medkit = 0; assert.equal(b.medkit, 1);
for (const kind of Object.keys(ITEMS)) assert([...LOOT,...CITY_LOOT].some(p => p.kind === kind));
console.log(`${models.size} GLB models valid; ${obstacles.length} collision boxes; ${targets.length} reachable targets; cover and inventory checks passed.`);

