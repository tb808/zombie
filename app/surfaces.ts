import * as THREE from 'three';

export type SurfaceKind = 'soil' | 'asphalt' | 'concrete' | 'plaster' | 'brick' | 'wood' | 'bark' | 'stone' | 'metal' | 'fabric' | 'tile';
export const SURFACE_SCALE: Record<SurfaceKind, number> = { soil: 2.8, asphalt: 3, concrete: 2.5, plaster: 2, brick: 1.6, wood: 1.6, bark: 1.2, stone: 2, metal: 1.8, fabric: .7, tile: 2 };
const reliefStrength:Record<SurfaceKind,number>={soil:.032,asphalt:.014,concrete:.024,plaster:.008,brick:.045,wood:.016,bark:.055,stone:.055,metal:.007,fabric:.003,tile:.016};

function hash(x: number, y: number) {
  let n = Math.imul(x + Math.imul(y, 15731), 0x45d9f3b);
  n = Math.imul(n ^ n >>> 16, 0x45d9f3b);
  return ((n ^ n >>> 16) >>> 0) / 4294967295;
}
function noise(x: number, y: number, frequency: number) {
  x *= frequency; y *= frequency;
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const sample = (dx: number, dy: number) => hash(((ix + dx) % frequency + frequency) % frequency, ((iy + dy) % frequency + frequency) % frequency);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(sample(0, 0), sample(1, 0), sx), THREE.MathUtils.lerp(sample(0, 1), sample(1, 1), sx), sy);
}

/** Authored locally, deterministic and tileable. Color, height and roughness
 * remain separate so raking sunlight reveals real material relief. */
export function surfacePixels(kind: SurfaceKind, size = 256) {
  const color = new Uint8Array(size * size * 4), relief = new Uint8Array(color.length), roughness = new Uint8Array(color.length);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const x = px / size, y = py / size, grain = hash(px, py), broad = noise(x, y, 8), mid = noise(x, y, 32), fine = noise(x, y, 64);
    let r = .72, g = .72, b = .7, h = .5, rough = .88;
    if (kind === 'soil') {
      const moss = noise(x, y, 4), grit = grain > .95 ? .14 : 0;
      r = .33 + broad * .17 + grit; g = .34 + moss * .16 + grit; b = .24 + broad * .11 + grit;
      h = mid * .4 + fine * .3 + grain * .2; rough = .92 - grit;
    } else if (kind === 'asphalt') {
      const aggregate = grain > .83 ? .09 : 0, crack = Math.abs(noise(x, y, 8) - .49) < .007 && mid < .52;
      r = g = b = .23 + grain * .07 + aggregate + broad * .025 - (crack ? .15 : 0);
      h = grain * .35 + mid * .14 - (crack ? .25 : 0); rough = .78 + fine * .15;
    } else if (kind === 'brick') {
      const row = Math.floor(y * 10), bx = (x * 4 + (row % 2) * .5) % 1, by = y * 10 % 1;
      const mortar = bx < .025 || by < .1;
      const variation = hash(Math.floor(x * 4 + (row % 2) * .5), row);
      r = mortar ? .68 : .54 + variation * .15 + grain * .06;
      g = mortar ? .65 : .4 + variation * .1 + grain * .04;
      b = mortar ? .58 : .3 + variation * .08 + grain * .03;
      h = mortar ? .2 : .64 + mid * .13; rough = .87 + grain * .1;
    } else if (kind === 'wood' || kind === 'bark') {
      const waves = Math.sin((x * 60 + noise(x, y, 8) * 3) * Math.PI * 2) * .035;
      const knot = Math.pow(Math.abs(Math.sin(x * Math.PI * 4 + noise(x, y, 4) * 2)), 10);
      const seam = kind === 'wood' && x * 8 % 1 < .023;
      const v = .58 + broad * .15 + waves - knot * .08 - (seam ? .25 : 0);
      r = v; g = v * .83; b = v * .62;
      h = kind === 'bark' ? mid * .65 + waves * 3 + fine * .16 : .55 + waves * 2 - (seam ? .3 : 0);
      rough = kind === 'bark' ? .96 : .66 + fine * .18;
    } else if (kind === 'tile') {
      const joint = x * 4 % 1 < .02 || y * 4 % 1 < .02;
      r = g = .84 + broad * .04 - (joint ? .35 : 0); b = r * .96;
      h = joint ? .22 : .62 + grain * .015; rough = joint ? .95 : .38 + broad * .17;
    } else if (kind === 'fabric') {
      const weave = (px % 4 < 2) === (py % 4 < 2) ? .08 : 0;
      r = g = b = .73 + weave + broad * .1; h = .4 + weave * 3 + grain * .09; rough = .95;
    } else if (kind === 'metal') {
      const rust = broad > .67 && mid > .45;
      r = rust ? .56 : .77 + grain * .035; g = rust ? .37 : r; b = rust ? .22 : r;
      h = rust ? .57 + fine * .14 : .48 + grain * .03; rough = rust ? .92 : .43 + broad * .2;
    } else {
      const stain = noise(x, y, 4), pores = grain < .04 ? .12 : 0;
      const v = .72 + mid * .09 + grain * .055 - stain * .09 - pores;
      r = v; g = v * .98; b = v * .92;
      h = kind === 'stone' ? broad * .45 + mid * .24 + fine * .19 : .45 + fine * .13 + grain * .1 - pores;
      rough = kind === 'plaster' ? .94 : .78 + grain * .16;
    }
    const at = (py * size + px) * 4;
    color[at] = Math.max(0, Math.min(255, r * 255)); color[at + 1] = Math.max(0, Math.min(255, g * 255)); color[at + 2] = Math.max(0, Math.min(255, b * 255)); color[at + 3] = 255;
    for (let i = 0; i < 3; i++) { relief[at + i] = Math.max(0, Math.min(255, h * 255)); roughness[at + i] = rough * 255; }
    relief[at + 3] = roughness[at + 3] = 255;
  }
  return { color, relief, roughness, size };
}

type DetailTextures = { color: THREE.DataTexture; relief: THREE.DataTexture; roughness: THREE.DataTexture };
const sharedTextures = new Map<SurfaceKind, DetailTextures>();
export function releaseSurfaceTextures() {
  for(const detail of sharedTextures.values())Object.values(detail).forEach(texture=>texture.dispose());
}
function textures(kind: SurfaceKind) {
  if (!sharedTextures.has(kind)) {
    const pixels = surfacePixels(kind);
    const make = (data: Uint8Array, color = false) => {
      const texture = new THREE.DataTexture(data, pixels.size, pixels.size);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true;
      if (color) texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4; texture.needsUpdate = true; return texture;
    };
    sharedTextures.set(kind, { color: make(pixels.color, true), relief: make(pixels.relief), roughness: make(pixels.roughness) });
  }
  return sharedTextures.get(kind)!;
}

export function detailMaterial(material: THREE.MeshStandardMaterial, kind: SurfaceKind, strength = .65) {
  if (material.userData.worldSurface) return material;
  const detail = textures(kind);
  material.userData.worldSurface = kind;
  material.flatShading = false;
  material.onBeforeCompile = shader => {
    shader.uniforms.surfaceColor = { value: detail.color }; shader.uniforms.surfaceRelief = { value: detail.relief };
    shader.uniforms.surfaceRoughness = { value: detail.roughness }; shader.uniforms.surfaceScale = { value: SURFACE_SCALE[kind] };
    shader.uniforms.surfaceStrength = { value: strength };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSurfacePosition;');
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
      vec4 surfacePosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        surfacePosition = instanceMatrix * surfacePosition;
      #endif
      vSurfacePosition = (modelMatrix * surfacePosition).xyz;
      #include <project_vertex>`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vSurfacePosition;
      uniform sampler2D surfaceColor, surfaceRelief, surfaceRoughness;
      uniform float surfaceScale, surfaceStrength;
      vec4 sampleSurface(sampler2D source) {
        vec3 axis = normalize(cross(dFdx(vSurfacePosition), dFdy(vSurfacePosition)));
        vec3 weights = pow(abs(axis), vec3(6.0)); weights /= max(dot(weights, vec3(1.0)), .00001);
        vec3 p = vSurfacePosition / surfaceScale;
        return texture2D(source, p.yz) * weights.x + texture2D(source, p.xz) * weights.y + texture2D(source, p.xy) * weights.z;
      }`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      vec3 surfaceTint = sampleSurface(surfaceColor).rgb;
      diffuseColor.rgb *= mix(vec3(1.0), surfaceTint, surfaceStrength);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = clamp(mix(roughnessFactor, sampleSurface(surfaceRoughness).r, surfaceStrength), .22, 1.0);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      float surfaceHeight = sampleSurface(surfaceRelief).r;
      vec3 sigmaX = dFdx(-vViewPosition), sigmaY = dFdy(-vViewPosition);
      vec3 r1 = cross(sigmaY, normal), r2 = cross(normal, sigmaX);
      float determinant = dot(sigmaX, r1);
      vec3 gradient = sign(determinant) * (dFdx(surfaceHeight) * r1 + dFdy(surfaceHeight) * r2);
      normal = normalize(abs(determinant) * normal - gradient * ${reliefStrength[kind].toFixed(3)});`);
  };
  material.customProgramCacheKey = () => `tannwald-surface-${kind}-${strength}`;
  return material;
}

export function surfaceMaterial(kind: SurfaceKind, color: THREE.ColorRepresentation = 0xffffff, options: THREE.MeshStandardMaterialParameters = {}) {
  return detailMaterial(new THREE.MeshStandardMaterial({ color, roughness: .85, ...options }), kind, .78);
}

export function tintGeometry(geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation) {
  const result = geometry.clone(), tint = new THREE.Color(color), values = new Float32Array(result.getAttribute('position').count * 3);
  for (let i = 0; i < values.length; i += 3) { values[i] = tint.r; values[i + 1] = tint.g; values[i + 2] = tint.b; }
  result.setAttribute('color', new THREE.BufferAttribute(values, 3)); return result;
}

export function surfaceForColor(color: number): SurfaceKind {
  if([0x965f54,0x8b6a4d,0x95785d].includes(color))return 'brick';
  if ([0x846744, 0x665742, 0x62533b, 0xb09968, 0x6e563a, 0xa78052, 0x8c6945, 0xc5b896].includes(color)) return 'wood';
  if ([0x606e6b, 0xb4c1b4, 0x7b826c, 0xbebfa4, 0x758170, 0x8f9c71, 0xc6bb98].includes(color)) return 'fabric';
  if ([0x536467, 0x686d5d, 0x3b4540, 0x5b6663].includes(color)) return 'metal';
  if ([0x3b413e, 0x303b3a, 0x38443d,0x555f5b].includes(color)) return 'concrete';
  return 'plaster';
}
