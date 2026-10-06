import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { surfaceMaterial } from './surfaces.ts';
import { WORLD, type Obstacle } from './survival.ts';
import { detailedAsset } from './naturalAssets.ts';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type Road = { x: number; z: number; w: number; h: number; rotation?: number };
type Point = { x: number; z: number };
export function roadDistance(x: number, z: number, road: Road) {
  const angle = road.rotation ?? 0, dx = x - road.x, dz = z - road.z;
  const lx = dx * Math.cos(angle) + dz * Math.sin(angle), lz = -dx * Math.sin(angle) + dz * Math.cos(angle);
  return Math.hypot(Math.max(0, Math.abs(lx) - road.w / 2), Math.max(0, Math.abs(lz) - road.h / 2));
}
export function detailAllowed(x: number, z: number, obstacles: readonly Obstacle[], reserved: readonly Point[], roads: readonly Road[], margin = .65) {
  return !obstacles.some(o => Math.abs(x - o.x) < o.hx + margin && Math.abs(z - o.z) < o.hz + margin)
    && !reserved.some(p => Math.hypot(x - p.x, z - p.z) < 1.65)
    && !roads.some(r => roadDistance(x, z, r) < .65);
}

export function buildWorldDetail(scene: THREE.Scene, height: (x: number, z: number) => number, obstacles: readonly Obstacle[], reserved: readonly Point[], roads: readonly Road[], collision?:Obstacle[]) {
  const chunks = new Map<string, { group: THREE.Group; x: number; z: number; geometry: Map<THREE.Material, THREE.BufferGeometry[]> }>();
  const groundConcrete = surfaceMaterial('concrete', 0xd4d0c3), stone = surfaceMaterial('stone', 0xb8b1a0);
  const metal = surfaceMaterial('metal', 0x939994, { metalness: .55 });
  const paint = surfaceMaterial('concrete', 0xd8d4bd);
  const benchWood=surfaceMaterial('wood',0xa59778),binPaint=surfaceMaterial('metal',0x728679,{metalness:.45});
  const puddle = new THREE.MeshPhysicalMaterial({ color: 0x526268, roughness: .12, metalness: .25, clearcoat: 1, clearcoatRoughness: .08 });
  const vegetation = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .98, side: THREE.DoubleSide });
  const grassVertices = new Map<string, { positions: number[]; colors: number[] }>();
  const random = (n: number) => { let v = Math.imul(n, 0x45d9f3b); v = Math.imul(v ^ v >>> 16, 0x45d9f3b); return ((v ^ v >>> 16) >>> 0) / 4294967296; };
  const chunkAt = (x: number, z: number) => {
    const key = `${Math.floor(x / 40)},${Math.floor(z / 40)}`;
    if (!chunks.has(key)) {
      const group = new THREE.Group(); group.name = `world-detail-${key}`; scene.add(group);
      chunks.set(key, { group, x: Math.floor(x / 40) * 40 + 20, z: Math.floor(z / 40) * 40 + 20, geometry: new Map() });
    }
    return { key, chunk: chunks.get(key)! };
  };
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, rotation = 0) => {
    const { chunk } = chunkAt(x, z), matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotation, 0)), new THREE.Vector3(1, 1, 1));
    const transformed = geometry.index ? geometry.toNonIndexed() : geometry.clone(); transformed.applyMatrix4(matrix);
    if (!chunk.geometry.has(material)) chunk.geometry.set(material, []); chunk.geometry.get(material)!.push(transformed); geometry.dispose();
  };
  let tufts = 0, roadPieces = 0, puddles = 0, trees=0,streetProps=0;
  const treePositions:Point[]=[];
  // Verges and unbuilt land across the complete play bounds. Clearances are
  // checked against real geometry after loaded model bounds have settled.
  let sample = 1;
  for (let z = WORLD.minZ + 2; z < WORLD.maxZ - 2; z += 3.4) for (let x = WORLD.minX + 2; x < WORLD.maxX - 2; x += 3.4, sample++) {
    const wx = x + (random(sample * 11) - .5) * 3, wz = z + (random(sample * 13) - .5) * 3;
    if (!detailAllowed(wx, wz, obstacles, reserved, roads, 1.05)) continue;
    if (wx > 84 && random(sample * 23) < .7) continue;
    const { key } = chunkAt(wx, wz);
    if (!grassVertices.has(key)) grassVertices.set(key, { positions: [], colors: [] });
    const data = grassVertices.get(key)!;
    const blades = 7 + Math.floor(random(sample * 5) * 7), tall = random(sample * 3) > .93;
    for (let i = 0; i < blades; i++) {
      const bx = wx + (random(sample * 101 + i * 31) - .5) * .9, bz = wz + (random(sample * 103 + i * 33) - .5) * .9;
      const by = height(bx, bz) + .02, length = (tall ? .62 : .18) + random(sample * 7 + i) * .3;
      const angle = random(sample * 17 + i) * Math.PI * 2, width = tall ? .035 : .017, dx = Math.cos(angle) * width, dz = Math.sin(angle) * width;
      const bendX = Math.sin(angle + 1) * length * .25, bendZ = Math.cos(angle + 1) * length * .25;
      const tint = new THREE.Color().setHSL(.2 + random(sample + i) * .05, .19, .22 + random(sample * 3 + i) * .12);
      for (const [vx, vy, vz, light] of [[bx - dx, by, bz - dz, .7], [bx + dx, by, bz + dz, .7], [bx + bendX, by + length, bz + bendZ, 1.2]]) {
        data.positions.push(vx, vy, vz); data.colors.push(tint.r * light, tint.g * light, tint.b * light);
      }
    }
    tufts++;
    if(wx<76&&sample%67===0&&detailAllowed(wx,wz,obstacles,reserved,roads,4)&&!treePositions.some(p=>Math.hypot(p.x-wx,p.z-wz)<13)){
      const tree=detailedAsset(random(sample)>.23?'pine':'suburban-tree-large',sample)!;
      const bounds=new THREE.Box3().setFromObject(tree),size=bounds.getSize(new THREE.Vector3()),scale=(8+random(sample*41)*5)/size.y;
      tree.scale.setScalar(scale);tree.position.set(wx,height(wx,wz)-bounds.min.y*scale,wz);
      chunks.get(key)!.group.add(tree);treePositions.push({x:wx,z:wz});trees++;
      collision?.push({x:wx,z:wz,hx:.22*scale,hz:.22*scale});
    }
    if (sample % 31 === 0) add(new THREE.SphereGeometry(.13 + random(sample) * .2, 12, 8).scale(1, .4, 1.2), stone, wx + .45, height(wx + .45, wz) + .03, wz);
  }
  // Sidewalk slabs and flush drainage along the city road grid. They are low
  // dressing, without adding barriers to doors, guarded access or mission paths.
  for (const road of roads.filter(r => r.x >= 84 && !r.rotation)) {
    const vertical = road.h > road.w, length = vertical ? road.h : road.w, halfWidth = (vertical ? road.w : road.h) / 2;
    for (let t = -length / 2 + 1.5; t < length / 2; t += 3) for (const side of [-1, 1]) {
      const x = road.x + (vertical ? side * (halfWidth + 1.1) : t), z = road.z + (vertical ? t : side * (halfWidth + 1.1));
      if (roads.some(r => r !== road && roadDistance(x, z, r) < .5) || obstacles.some(o => Math.abs(x - o.x) < o.hx + 1 && Math.abs(z - o.z) < o.hz + 1)) continue;
      add(new THREE.BoxGeometry(vertical ? 2.1 : 2.94, .075, vertical ? 2.94 : 2.1), groundConcrete, x, height(x, z) + .07, z); roadPieces++;
      const cx = road.x + (vertical ? side * (halfWidth + .1) : t), cz = road.z + (vertical ? t : side * (halfWidth + .1));
      add(new THREE.BoxGeometry(vertical ? .18 : 2.98, .12, vertical ? 2.98 : .18), groundConcrete, cx, height(cx, cz) + .07, cz);
    }
  }
  for (const x of [92, 151, 212]) for (const z of [-104, -46, 4, 54, 104]) {
    for (let i = -3; i <= 3; i++) add(new THREE.BoxGeometry(.48, .009, 3.7), paint, x + i * .8, height(x, z + 7) + .076, z + 7);
    add(new THREE.CylinderGeometry(.54, .54, .016, 32), metal, x + 2, height(x + 2, z - 8) + .076, z - 8);
    for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(.68, .008, .02), metal, x + 2, height(x + 2, z - 8) + .088, z - 8.23 + i * .09);
  }
  for(const x of [92,151,212])for(let i=0;i<7;i++)for(const side of [-1,1]){
    const wx=x+side*7.15,wz=-121+i*37,ground=height(wx,wz);
    if(!detailAllowed(wx,wz,obstacles,reserved,roads,1.5))continue;
    if(i%3===0){
      for(let slat=0;slat<5;slat++){
        add(new RoundedBoxGeometry(.095,.07,1.7,2,.01),benchWood,wx-.22+slat*.11,ground+.46,wz);
        add(new RoundedBoxGeometry(.07,.105,1.7,2,.01),benchWood,wx+side*.31,ground+.64+slat*.115,wz);
      }
      for(const dz of [-.65,.65])add(new THREE.BoxGeometry(.52,.43,.055),metal,wx,ground+.215,wz+dz);
      collision?.push({x:wx,z:wz,hx:.32,hz:.85});
    }else if(i%3===1){
      add(new THREE.CylinderGeometry(.25,.2,.78,24),binPaint,wx,ground+.39,wz);
      add(new THREE.CylinderGeometry(.27,.27,.06,24),metal,wx,ground+.81,wz);
      for(let rib=0;rib<12;rib++){const a=rib/12*Math.PI*2;add(new THREE.BoxGeometry(.025,.58,.025),metal,wx+Math.cos(a)*.231,ground+.41,wz+Math.sin(a)*.231);}
      collision?.push({x:wx,z:wz,hx:.25,hz:.25});
    }else{
      add(new RoundedBoxGeometry(.5,1.15,.42,3,.035),binPaint,wx,ground+.575,wz);
      add(new THREE.BoxGeometry(.31,.045,.022),metal,wx,ground+.78,wz+.221);
      for(let slot=0;slot<5;slot++)add(new THREE.BoxGeometry(.26,.014,.022),metal,wx,ground+.37+slot*.045,wz+.22);
      collision?.push({x:wx,z:wz,hx:.25,hz:.21});
    }
    streetProps++;
  }
  for (let i = 0; i < 60; i++) {
    const x = i % 2 ? 94 : 209, z = -145 + random(i * 37 + 1) * 270;
    if (obstacles.some(o => Math.abs(x - o.x) < o.hx + 1 && Math.abs(z - o.z) < o.hz + 1)) continue;
    const geometry = new THREE.CircleGeometry(.5 + random(i + 8) * .7, 32); geometry.rotateX(-Math.PI / 2); geometry.scale(1, 1, .5 + random(i + 6) * .8);
    add(geometry, puddle, x, height(x, z) + .078, z, i); puddles++;
  }
  for (const [key, data] of grassVertices) {
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3)); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, vegetation); mesh.receiveShadow = true; chunks.get(key)!.group.add(mesh);
  }
  for (const chunk of chunks.values()) for (const [material, geometries] of chunk.geometry) {
    const merged = mergeGeometries(geometries); geometries.forEach(g => g.dispose());
    if (merged) { const mesh = new THREE.Mesh(merged, material); mesh.receiveShadow = true; chunk.group.add(mesh); }
  }
  return {
    stats: { tufts, roadPieces, puddles, trees, streetProps, chunks: chunks.size },
    update(x: number, z: number) { for (const chunk of chunks.values()) chunk.group.visible = Math.hypot(chunk.x - x, chunk.z - z) < 105; },
  };
}
