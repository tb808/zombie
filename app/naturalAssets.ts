import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { surfaceMaterial } from './surfaces.ts';

export const foliageTime = { value: 0 };
function randomSource(seed: number) { return () => { seed = Math.imul(seed ^ seed >>> 15, 1 | seed); seed ^= seed + Math.imul(seed ^ seed >>> 7, 61 | seed); return ((seed ^ seed >>> 14) >>> 0) / 4294967296; }; }
const bark = surfaceMaterial('bark', 0xa7a093), stone = surfaceMaterial('stone', 0xb3b1a2);
const timber = surfaceMaterial('wood', 0xb7a17c), darkMetal = surfaceMaterial('metal', 0x737d7c, { metalness: .65 });
const drumMetal = surfaceMaterial('metal', 0x6f837c, { metalness: .55 });

function batch(group: THREE.Group) {
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const child of [...group.children]) {
    if (!(child instanceof THREE.Mesh)) continue;
    child.updateMatrix();
    const source = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    source.applyMatrix4(child.matrix); const mat = child.material as THREE.Material;
    if (!batches.has(mat)) batches.set(mat, []); batches.get(mat)!.push(source); group.remove(child);
  }
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries); geometries.forEach(g => g.dispose());
    if (merged) { const mesh = new THREE.Mesh(merged, material); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); }
  }
  return group;
}

// Each card contains a whole leafy twig, with foliage at its real scale. The
// silhouettes remain open between leaves instead of showing rectangular planes.
function leafTexture(needle: boolean) {
  const size = 512, pixels = new Uint8Array(size * size * 4), random = randomSource(needle ? 9407 : 3121);
  const ellipse = (cx: number, cy: number, length: number, width: number, angle: number, tint: number[], leaf = false) => {
    const c = Math.cos(angle), s = Math.sin(angle), radius = Math.ceil(length + width + 1);
    for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(size, cy + radius); y++) for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(size, cx + radius); x++) {
      const dx = x + .5 - cx, dy = y + .5 - cy, u = (dx * c + dy * s) / length, v = (-dx * s + dy * c) / width;
      const edge = u * u + v * v;
      if (edge >= 1) continue;
      const at = (y * size + x) * 4, alpha = Math.min(255, (1 - edge) * width * 255);
      if (alpha < pixels[at + 3]) continue;
      const vein = leaf && (Math.abs(v) < .045 || Math.abs((u * 4 + Math.abs(v) * 2.5) % 1) < .055);
      const light = .82 + (1 - v * v) * .18 + u * .09 + (vein ? .12 : 0);
      pixels[at] = tint[0] * light; pixels[at + 1] = tint[1] * light; pixels[at + 2] = tint[2] * light; pixels[at + 3] = alpha;
    }
  };
  const line = (x: number, y: number, ex: number, ey: number, width: number) => ellipse((x + ex) / 2, (y + ey) / 2, Math.hypot(ex - x, ey - y) / 2, width, Math.atan2(ey - y, ex - x), [79, 72, 43]);
  line(256, 470, 256, 53, needle ? 2 : 3);
  if (needle) {
    for (let twig = 0; twig < 11; twig++) for (const side of [-1, 1]) {
      const y = 425 - twig * 32, tipX = 256 + side * (165 - twig * 9), tipY = y - 60 - random() * 22;
      line(256, y, tipX, tipY, 1.4);
      const angle = Math.atan2(tipY - y, tipX - 256);
      for (let i = 0; i < 17; i++) for (const direction of [-1, 1]) {
        const t = .12 + i / 18 * .86, x = 256 + (tipX - 256) * t, py = y + (tipY - y) * t;
        const a = angle + direction * (.6 + random() * .25), length = 13 + random() * 9;
        ellipse(x + Math.cos(a) * length * .75, py + Math.sin(a) * length * .75, length, 1.8 + random(), a, [51 + random() * 23, 79 + random() * 29, 43 + random() * 16]);
      }
    }
  } else {
    for (let twig = 0; twig < 7; twig++) for (const side of [-1, 1]) {
      const y = 428 - twig * 53, tipX = 256 + side * (146 - twig * 10), tipY = y - 73;
      line(256, y, tipX, tipY, 1.8);
      for (let i = 0; i < 4; i++) for (const direction of [-1, 1]) {
        const t = .21 + i * .22, x = 256 + (tipX - 256) * t, py = y + (tipY - y) * t;
        const a = Math.atan2(tipY - y, tipX - 256) + direction * .7, length = 22 + random() * 10;
        ellipse(x + Math.cos(a) * length * .7, py + Math.sin(a) * length * .7, length, length * (.42 + random() * .09), a, [65 + random() * 32, 98 + random() * 33, 35 + random() * 18], true);
      }
    }
  }
  // Color dilation prevents dark borders after alpha-tested mip filtering.
  for (let i = 0; i < pixels.length; i += 4) if (!pixels[i + 3]) { pixels[i] = needle ? 60 : 78; pixels[i + 1] = needle ? 91 : 112; pixels[i + 2] = 43; }
  const texture = new THREE.DataTexture(pixels, size, size); texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.anisotropy = 4; texture.needsUpdate = true;
  return texture;
}
const foliageMaterials = [false, true].map(needle => {
  const mat = new THREE.MeshStandardMaterial({ color: needle ? 0xc2d0c9 : 0xe0e1cf, map: leafTexture(needle), alphaTest: .28, side: THREE.DoubleSide, roughness: .95, vertexColors: true });
  mat.onBeforeCompile = shader => {
    shader.uniforms.foliageTime = foliageTime;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float foliageTime;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += sin(position.y * .9 + position.z * .65 + foliageTime * .7) * .008 * max(position.y - 1.0, 0.0);');
    // Lighting follows the rounded crown, including the backs of the thin twigs.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
  };
  mat.customProgramCacheKey = () => `tannwald-twigs-${needle}`; return mat;
});

function tree(pine: boolean, seed: number) {
  const group = new THREE.Group(), random = randomSource(seed), positions: number[] = [], normals: number[] = [], uvs: number[] = [], colors: number[] = [];
  const branch = (from: THREE.Vector3, to: THREE.Vector3, radius: number) => {
    const direction = to.clone().sub(from), mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .4, radius, direction.length(), 12, 2), bark);
    mesh.position.copy(from).add(to).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); group.add(mesh);
  };
  const leaf = (point: THREE.Vector3, width: number, length: number, quaternion: THREE.Quaternion) => {
    const normal = new THREE.Vector3(point.x * .3, pine ? .65 : .55 + (point.y - 5.4) * .22, point.z * .3).normalize(), light = .78 + random() * .22;
    // Fold the twig around its midrib, so leaves occupy a volume rather than a flat billboard.
    const vertices = [[-.5, -.5, 0, 0], [0, -.5, .5, 0], [0, .5, .5, 1], [-.5, -.5, 0, 0], [0, .5, .5, 1], [-.5, .5, 0, 1], [0, -.5, .5, 0], [.5, -.5, 1, 0], [.5, .5, 1, 1], [0, -.5, .5, 0], [.5, .5, 1, 1], [0, .5, .5, 1]];
    for (const [x, y, u, v] of vertices) {
      const vertex = new THREE.Vector3(x * width, y * length, Math.abs(x) * width * .24).applyQuaternion(quaternion).add(point);
      positions.push(vertex.x, vertex.y, vertex.z); normals.push(normal.x, normal.y, normal.z); uvs.push(u, v); colors.push(light, light, light * (.96 + random() * .06));
    }
  };
  const height = pine ? 7.2 : 6.9, lean = (random() - .5) * .32, crownWidth = .88 + random() * .24;
  const trunkGeometry = new THREE.CylinderGeometry(pine ? .018 : .045, pine ? .14 : .19, height, 18, 10), trunkVertices = trunkGeometry.getAttribute('position');
  for (let i = 0; i < trunkVertices.count; i++) {
    const y = Math.max(0, trunkVertices.getY(i) + height / 2), flare = 1 + Math.exp(-y * 4) * .32;
    trunkVertices.setXYZ(i, trunkVertices.getX(i) * flare + lean * (y / height) ** 1.5, y, trunkVertices.getZ(i) * flare + Math.sin(y * .6) * .055);
  }
  trunkGeometry.computeVertexNormals(); group.add(new THREE.Mesh(trunkGeometry, bark));
  if (pine) {
    for (let level = 0; level < 12; level++) {
      const y = 1.25 + level * .48, radius = crownWidth * (2.18 * (1 - level / 12) ** .8) * (.93 + random() * .14), arms = 8;
      for (let arm = 0; arm < arms; arm++) {
        const angle = arm / arms * Math.PI * 2 + level * 1.71 + random() * .3, extent = radius * (.83 + random() * .24);
        const root = new THREE.Vector3(lean * y / height, y + (random() - .5) * .23, .02), end = new THREE.Vector3(Math.cos(angle) * extent, y - .22 - random() * .25, Math.sin(angle) * extent);
        branch(root, end, .027 * (1 - level / 15));
        for (let i = 0; i < 9; i++) {
          const t = .19 + i / 10 * .88, spread = (.42 + random() * .1) * (1 - t * .65);
          const center = root.clone().lerp(end, t);
          for (const side of [-1, 1]) {
            const twigAngle = angle + side * (.6 + random() * .18), point = center.clone().add(new THREE.Vector3(Math.cos(twigAngle) * spread * .45, -.08 + random() * .26, Math.sin(twigAngle) * spread * .45));
            const rotation = new THREE.Euler(-Math.PI / 2 + (random() - .5) * 2.4, (random() - .5) * .25, -twigAngle + Math.PI / 2, 'YXZ');
            const size = (.9 - t * .26) * (.7 + radius * .18);
            leaf(point, size * .9, size, new THREE.Quaternion().setFromEuler(rotation));
          }
        }
      }
    }
    for (let tip = 0; tip < 10; tip++) leaf(new THREE.Vector3(lean, 6.75 + tip * .04, 0), .2, .52, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, tip * 2.4, .2)));
  } else {
    for (let arm = 0; arm < 24; arm++) {
      const angle = arm * 2.399 + random() * .3, upper = arm / 24, radius = crownWidth * 2.15 * Math.sqrt(1 - (upper * 1.65 - .65) ** 2);
      const root = new THREE.Vector3(lean * .4, 2.25 + upper * 2.65, 0), end = new THREE.Vector3(Math.cos(angle) * radius, 4.15 + upper * 2.45, Math.sin(angle) * radius);
      const fork = root.clone().lerp(end, .65); fork.y += .12; branch(root, fork, .11 * (1 - upper * .5)); branch(fork, end, .05);
      for (let i = 0; i < 32; i++) {
        const azimuth = i * 2.399, vertical = 1 - 2 * (i + .5) / 32, radial = Math.sqrt(1 - vertical * vertical), spread = .75 + random() * .25;
        const point = end.clone().add(new THREE.Vector3(Math.cos(azimuth) * radial * spread, vertical * spread * .84, Math.sin(azimuth) * radial * spread));
        const rotation = new THREE.Euler(-Math.PI / 2 + (random() - .5) * 1.6, random() * Math.PI * 2, random() * Math.PI * 2);
        leaf(point, .9 + random() * .2, .94 + random() * .24, new THREE.Quaternion().setFromEuler(rotation));
      }
    }
  }
  batch(group);
  const canopy = new THREE.BufferGeometry();
  canopy.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); canopy.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  canopy.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); canopy.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const leaves = new THREE.Mesh(canopy, foliageMaterials[pine ? 1 : 0]); leaves.castShadow = leaves.receiveShadow = true; group.add(leaves);
  group.userData.treeSpecies = pine ? 'spruce' : 'broadleaf';
  return group;
}

export function detailedAsset(name: string, seed = 1): THREE.Group | null {
  if (name.includes('tree') || name.startsWith('pine')) return tree(name.startsWith('pine'), seed);
  const group = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); group.add(mesh); return mesh; };
  if (name.startsWith('rock') || name === 'rocks') {
    const geometry = new THREE.SphereGeometry(1, 24, 16), vertices = geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i), variation = 1 + Math.sin(x * 7.1 + z * 4.7 + seed) * .12 + Math.cos(y * 6.2 + x * 3.3) * .09;
      vertices.setXYZ(i, x * variation * 1.25, y * variation * .72, z * variation);
    }
    geometry.computeVertexNormals(); add(geometry, stone, 0, .65, 0);
  } else if (name === 'barrel') {
    add(new THREE.CylinderGeometry(.43, .43, 1.15, 32, 4), drumMetal, 0, .575, 0);
    for (const y of [.08, .34, .81, 1.07]) { const rim = add(new THREE.TorusGeometry(.434, .018, 6, 32), darkMetal, 0, y, 0); rim.rotation.x = Math.PI / 2; }
    add(new THREE.CylinderGeometry(.08, .08, .026, 20), darkMetal, .2, 1.16, .1);
  } else if (['box', 'box-open', 'chest'].includes(name)) {
    if (name === 'box-open') {
      add(new RoundedBoxGeometry(1.2, .12, .9, 2, .018), timber, 0, .06, 0);
      for (const side of [-1, 1]) { add(new RoundedBoxGeometry(.09, .65, .9, 2, .012), timber, side * .56, .37, 0); add(new RoundedBoxGeometry(1.2, .65, .09, 2, .012), timber, 0, .37, side * .41); }
    } else add(new RoundedBoxGeometry(1.2, .75, .9, 3, .025), timber, 0, .375, 0);
    for (const side of [-1, 1]) {
      add(new RoundedBoxGeometry(.04, .79, .94, 2, .009), darkMetal, side * .43, .38, 0);
      for (const z of [-.44, .44]) add(new THREE.SphereGeometry(.025, 8, 6), darkMetal, side * .43, .62, z);
    }
    if (name === 'chest') add(new RoundedBoxGeometry(.12, .14, .04, 2, .012), darkMetal, 0, .58, .48);
  } else return null;
  return batch(group);
}

const carBody = [0x6c7d81, 0x9b8d75, 0x836764].map(c => surfaceMaterial('metal', c, { metalness: .5, roughness: .46 }));
const carTrim = new THREE.MeshStandardMaterial({ color: 0x292d2e, roughness: .87 });
const carGlass = new THREE.MeshPhysicalMaterial({ color: 0x85999d, metalness: .2, roughness: .18, clearcoat: 1 });
const carLights = new THREE.MeshStandardMaterial({ color: 0xc7bea1, roughness: .3, metalness: .25 });
export function detailedCar(index: number) {
  const group = new THREE.Group(), body = carBody[index % 3];
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material, radius = .06) => { const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), mat); mesh.position.set(x, y, z); group.add(mesh); return mesh; };
  box(0, .64, 0, 1.98, .65, 4.4, body, .14); box(0, 1.14, -.22, 1.7, .66, 2.4, body, .15);
  box(0, 1.13, 1.01, 1.55, .48, .075, carGlass, .03).rotation.x = -.33;
  box(0, 1.13, -1.43, 1.55, .43, .075, carGlass, .03).rotation.x = .33;
  for (const side of [-1, 1]) {
    for (const z of [-.85, .34]) {
      box(side * .872, 1.18, z, .035, .36, .91, carGlass, .018);
      box(side * 1.007, .81, z, .03, .035, .2, carTrim, .01);
      box(side * 1.011, .6, z, .009, .48, 1.04, body, .004);
    }
    box(side * 1.07, 1.02, .86, .2, .12, .26, body, .04);
    for (const z of [-1.42, 1.4]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .24, 32), carTrim); wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 1.01, .36, z); group.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, .25, 20), darkMetal); hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); group.add(hub);
    }
    box(side * .66, .73, 2.2, .46, .2, .04, carLights, .018);
    box(side * .7, .74, -2.2, .38, .18, .04, body, .018);
  }
  box(0, .44, 2.22, 1.78, .13, .12, carTrim, .035); box(0, .44, -2.22, 1.78, .13, .12, carTrim, .035);
  box(0, .64, 2.27, .5, .13, .016, carLights, .01); box(0, .75, 2.23, .68, .18, .018, carTrim, .01);
  return batch(group);
}
