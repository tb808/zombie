'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

type Screen = 'title' | 'playing' | 'paused' | 'dead' | 'won';
type Hud = {
  health: number; ammo: number; reserve: number; stamina: number; stage: number;
  kills: number; timer: number; prompt: string; reloading: boolean; distance: number;
};
type Enemy = {
  group: THREE.Group; hitbox: THREE.Mesh; health: number; speed: number;
  attack: number; alive: boolean; mixer?: THREE.AnimationMixer;
};

const MODEL = '/models/kenney/';
const SURVIVAL_MODELS = new Set(['tent', 'campfire-pit', 'chest', 'resource-planks', 'barrel', 'box', 'box-open', 'signpost', 'grass-large', 'grass', 'rock-a', 'rock-b', 'rock-c']);
const modelUrl = (name: string) => {
  if (name.startsWith('suburban-')) return `${MODEL}suburban/${name.replace('suburban-', '')}.glb`;
  if (name.startsWith('industrial-')) return `${MODEL}industrial/${name.replace('industrial-', '')}.glb`;
  if (SURVIVAL_MODELS.has(name)) return `${MODEL}survival/${name}.glb`;
  return `${MODEL}graveyard/${name}.glb`;
};

const rawTerrainHeight = (x: number, z: number) => {
  const rolling = Math.sin(x * 0.055) * Math.cos(z * 0.07) * 0.7 + Math.sin((x + z) * 0.035) * 0.38;
  const hill = (cx: number, cz: number, sx: number, sz: number, height: number) => height * Math.exp(-(((x - cx) ** 2) / sx + ((z - cz) ** 2) / sz));
  return rolling + hill(-48, 42, 480, 150, 5.2) + hill(8, 48, 850, 130, 3.8) + hill(72, 48, 350, 180, 5.6) + hill(-68, -52, 400, 120, 3.8) + hill(22, -50, 650, 135, 4.6) + hill(86, -47, 300, 120, 4.2);
};

const TERRAIN_PLATEAUS = [
  [-60, -31, 17], [-22, -4, 25], [18, 18, 18], [55, 22, 23], [66, -25, 17],
] as const;

const terrainHeight = (x: number, z: number) => {
  let height = rawTerrainHeight(x, z);
  for (const [cx, cz, radius] of TERRAIN_PLATEAUS) {
    const distance = Math.hypot(x - cx, z - cz);
    const t = Math.max(0, Math.min(1, 1 - distance / radius));
    const smooth = t * t * (3 - 2 * t);
    height = THREE.MathUtils.lerp(height, rawTerrainHeight(cx, cz), smooth * 0.92);
  }
  return height;
};

const horizontalDistance = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

const modelBaseHeight = (name: string) => {
  if (name.startsWith('suburban-building') || name.startsWith('industrial-building')) return 5.6;
  if (name.includes('tree') || name.startsWith('pine')) return 5.4;
  if (name.startsWith('gravestone')) return 1.25;
  if (name.includes('fence') || name.includes('wall')) return 1.35;
  if (name === 'crypt-large') return 3.7;
  if (name === 'tent') return 1.85;
  if (name.includes('lightpost')) return 3.6;
  if (name.includes('fire-basket')) return 1.2;
  if (name.includes('barrel')) return 0.9;
  if (name.includes('box') || name.includes('chest')) return 0.68;
  if (name.includes('grass')) return 0.55;
  if (name.startsWith('rock') || name === 'rocks') return 0.95;
  if (name === 'coffin') return 0.65;
  if (name.includes('chimney')) return 5;
  if (name.includes('tank')) return 2.8;
  return 1;
};
const START = new THREE.Vector3(-61, 1.68, -35);
const INITIAL_HUD: Hud = { health: 100, ammo: 12, reserve: 48, stamina: 100, stage: 0, kills: 0, timer: 40, prompt: '', reloading: false, distance: 8 };

const OBJECTIVES = [
  { place: 'RANGERSTATION', title: 'Sprich mit Mara', detail: 'Sie wartet am Feuer.', target: new THREE.Vector3(-53, 0, -33) },
  { place: 'DORF TANNWALD', title: 'Hole die Brennstoffzelle', detail: 'Durchsuche den verlassenen Markt.', target: new THREE.Vector3(-19, 0, -4) },
  { place: 'ALTER FRIEDHOF', title: 'Finde Noah', detail: 'Befreie den Überlebenden am Mausoleum.', target: new THREE.Vector3(17, 0, 19) },
  { place: 'KLINIKGELÄNDE', title: 'Sichere das Gegenmittel', detail: 'Dringe zum Laborcontainer vor.', target: new THREE.Vector3(48, 0, 23) },
  { place: 'FUNKTURM 07', title: 'Erreiche den Funkturm', detail: 'Bringe Noah und das Gegenmittel zum Sender.', target: new THREE.Vector3(66, 0, -25) },
  { place: 'LETZTE STELLUNG', title: 'Halte die Linie', detail: 'Der Konvoi ist unterwegs.', target: new THREE.Vector3(66, 0, -25) },
] as const;

const STORY = {
  intro: ['MARA · FUNK', 'Elias, hörst du mich? Ich bin an der Rangerstation. Beeil dich – die Infizierten folgen dem Signal.'],
  mara: ['MARA', 'Die Klinik hat ein Gegenmittel. Aber unser Generator ist leer. Im Markt liegt noch eine Brennstoffzelle. Ohne sie startet der Sender nicht.'],
  fuel: ['ELIAS', 'Zelle gesichert. Auf dem Notkanal ist eine Stimme – sie kommt vom alten Friedhof.'],
  noah: ['NOAH', 'Dr. Falk hat das Virus freigesetzt. Ich kenne den Weg ins Labor. Hol das Gegenmittel, dann treffen wir uns am Funkturm.'],
  serum: ['DR. FALK · AUFZEICHNUNG', 'Projekt Lazarus war kein Heilmittel. Es war ein Schlüssel. Wenn Sie das hören, bin ich bereits Teil der nächsten Stufe.'],
  tower: ['MARA · FUNK', 'Sender läuft. Der Konvoi braucht vierzig Sekunden – und jedes Ding in Tannwald kennt jetzt unsere Position.'],
} as const;

const LOCATIONS = [
  { name: 'RANGERSTATION', subtitle: 'WALDRAND · SEKTOR 01', test: (x: number, z: number) => Number.isFinite(z) && x < -42 },
  { name: 'DORF TANNWALD', subtitle: 'HAUPTSTRASSE · SEKTOR 02', test: (x: number, z: number) => x < 2 && z < 15 },
  { name: 'ALTER FRIEDHOF', subtitle: 'ST. MICHAEL · SEKTOR 03', test: (x: number, z: number) => x < 35 && z >= 8 },
  { name: 'KLINIKGELÄNDE', subtitle: 'SPERRZONE · SEKTOR 04', test: (x: number, z: number) => x >= 35 && z >= 0 },
  { name: 'FUNKTURM 07', subtitle: 'EVAKUIERUNG · SEKTOR 05', test: () => true },
];

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<{ start: () => void; resume: () => void } | null>(null);
  const [screen, setScreen] = useState<Screen>('title');
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [loaded, setLoaded] = useState(false);
  const [dialogue, setDialogue] = useState<{ speaker: string; text: string } | null>(null);
  const [location, setLocation] = useState<{ name: string; subtitle: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let frame = 0;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07100f);
    scene.fog = new THREE.FogExp2(0x152321, 0.0125);
    const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 180);
    camera.rotation.order = 'YXZ';
    camera.position.set(START.x, terrainHeight(START.x, START.z) + 1.72, START.z);
    scene.add(camera);

    scene.add(new THREE.HemisphereLight(0x8fb3ae, 0x172018, 1.55));
    const moonLight = new THREE.DirectionalLight(0xc8e2dc, 3.4);
    moonLight.position.set(-35, 50, 18);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(2048, 2048);
    moonLight.shadow.camera.left = -60; moonLight.shadow.camera.right = 60;
    moonLight.shadow.camera.top = 60; moonLight.shadow.camera.bottom = -60;
    scene.add(moonLight);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), new THREE.MeshBasicMaterial({ color: 0xd8e4dc }));
    moon.position.set(-55, 52, -80);
    scene.add(moon);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(145, 28, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: 'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'varying vec3 vP; void main(){float h=clamp(normalize(vP).y*.5+.5,0.,1.);vec3 low=vec3(.035,.075,.068);vec3 high=vec3(.008,.018,.026);gl_FragColor=vec4(mix(low,high,smoothstep(.15,.86,h)),1.);}',
      }),
    );
    scene.add(sky);
    const starPositions: number[] = [];
    for (let i = 0; i < 380; i += 1) {
      const angle = Math.random() * Math.PI * 2, elevation = 0.1 + Math.random() * 1.25, radius = 115;
      starPositions.push(Math.cos(angle) * Math.cos(elevation) * radius, Math.sin(elevation) * radius, Math.sin(angle) * Math.cos(elevation) * radius);
    }
    const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xc7d9d4, size: 0.16, transparent: true, opacity: 0.7, sizeAttenuation: true })));

    const terrainGeometry = new THREE.PlaneGeometry(190, 125, 76, 50);
    const terrainPosition = terrainGeometry.getAttribute('position') as THREE.BufferAttribute;
    const terrainColors: number[] = [];
    const lowColor = new THREE.Color(0x24372d), highColor = new THREE.Color(0x435344), tempColor = new THREE.Color();
    for (let i = 0; i < terrainPosition.count; i += 1) {
      const x = terrainPosition.getX(i), z = -terrainPosition.getY(i), height = terrainHeight(x, z);
      terrainPosition.setZ(i, height);
      tempColor.copy(lowColor).lerp(highColor, THREE.MathUtils.clamp((height + 1) / 7, 0, 1));
      const variation = Math.sin(x * 1.7 + z * 2.3) * 0.035; tempColor.offsetHSL(0, 0, variation);
      terrainColors.push(tempColor.r, tempColor.g, tempColor.b);
    }
    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(terrainColors, 3));
    terrainGeometry.computeVertexNormals();
    const ground = new THREE.Mesh(terrainGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0.02 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const mistCanvas = document.createElement('canvas'); mistCanvas.width = 128; mistCanvas.height = 128;
    const mistContext = mistCanvas.getContext('2d');
    if (mistContext) {
      const gradient = mistContext.createRadialGradient(64, 64, 3, 64, 64, 62);
      gradient.addColorStop(0, 'rgba(190,220,208,.6)'); gradient.addColorStop(0.45, 'rgba(160,190,180,.22)'); gradient.addColorStop(1, 'rgba(120,160,150,0)');
      mistContext.fillStyle = gradient; mistContext.fillRect(0, 0, 128, 128);
    }
    const mistTexture = new THREE.CanvasTexture(mistCanvas);
    for (let i = 0; i < 26; i += 1) {
      const x = -82 + (i * 29 % 166), z = -50 + (i * 43 % 104);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTexture, color: 0xb8d0c6, transparent: true, opacity: 0.1, depthWrite: false }));
      sprite.position.set(x, terrainHeight(x, z) + 1.35, z); sprite.scale.set(18 + i % 5 * 4, 5 + i % 3, 1); scene.add(sprite);
    }

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.36, 0.55, 0.82));
    composer.addPass(new OutputPass());

    const loader = new GLTFLoader();
    const fbxLoader = new FBXLoader();
    const textureLoader = new THREE.TextureLoader();
    const assets = new Map<string, Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }>>();
    const load = (name: string) => {
      if (!assets.has(name)) assets.set(name, new Promise((resolve, reject) => loader.load(modelUrl(name), (gltf) => resolve(gltf), undefined, reject)));
      return assets.get(name)!;
    };
    const fbxCache = new Map<string, Promise<THREE.Group>>();
    const loadFbx = (path: string) => {
      if (!fbxCache.has(path)) fbxCache.set(path, new Promise((resolve, reject) => fbxLoader.load(path, resolve, undefined, reject)));
      return fbxCache.get(path)!;
    };
    const textureCache = new Map<string, Promise<THREE.Texture>>();
    const loadSkin = (skin: string) => {
      if (!textureCache.has(skin)) textureCache.set(skin, new Promise((resolve, reject) => textureLoader.load(`${MODEL}characters/skins/${skin}.png`, (texture) => { texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = THREE.NearestFilter; resolve(texture); }, undefined, reject)));
      return textureCache.get(skin)!;
    };
    const loadCharacter = async (skin: string, animation: 'idle' | 'run') => {
      const [base, animationSource, texture] = await Promise.all([
        loadFbx(`${MODEL}characters/characterMedium.fbx`),
        loadFbx(`${MODEL}characters/animations/${animation}.fbx`),
        loadSkin(skin),
      ]);
      const model = cloneSkeleton(base) as THREE.Group;
      model.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh || child instanceof THREE.Mesh) {
          child.castShadow = true; child.receiveShadow = true;
          child.material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.82, metalness: 0.02, alphaTest: 0.02 });
        }
      });
      model.updateMatrixWorld(true);
      const sourceBounds = new THREE.Box3().setFromObject(model), sourceSize = sourceBounds.getSize(new THREE.Vector3());
      const factor = 1.82 / Math.max(sourceSize.y, 0.001); model.scale.setScalar(factor); model.updateMatrixWorld(true);
      const scaledBounds = new THREE.Box3().setFromObject(model); model.position.y -= scaledBounds.min.y;
      model.rotation.y = Math.PI;
      const mixer = new THREE.AnimationMixer(model);
      const clip = animationSource.animations[0] ?? base.animations[0];
      if (clip) mixer.clipAction(clip).play();
      return { model, mixer };
    };
    const prep = (object: THREE.Object3D) => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; }
      });
      return object;
    };
    const place = (name: string, x: number, z: number, scale = 1, rotation = 0, y = 0) => {
      const anchor = new THREE.Group();
      anchor.position.set(x, terrainHeight(x, z) + y, z); anchor.rotation.y = rotation;
      scene.add(anchor);
      load(name).then((asset) => {
        if (disposed) return;
        const model = prep(cloneSkeleton(asset.scene)); model.updateMatrixWorld(true);
        const initialBounds = new THREE.Box3().setFromObject(model), size = initialBounds.getSize(new THREE.Vector3());
        const desiredHeight = modelBaseHeight(name) * scale;
        model.scale.setScalar(desiredHeight / Math.max(size.y, 0.001)); model.updateMatrixWorld(true);
        const finalBounds = new THREE.Box3().setFromObject(model); model.position.y -= finalBounds.min.y;
        anchor.add(model);
      }).catch(() => undefined);
      return anchor;
    };

    const obstacles: { x: number; z: number; hx: number; hz: number }[] = [];
    const building = (name: string, x: number, z: number, scale: number, rotation: number, hx: number, hz: number) => {
      place(name, x, z, scale, rotation);
      obstacles.push({ x, z, hx: (rotation % Math.PI === 0 ? hx : hz) * 1.22, hz: (rotation % Math.PI === 0 ? hz : hx) * 1.22 });
    };
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333b38, roughness: 1 });
    const road = (x: number, z: number, w: number, h: number, rotation = 0) => {
      const xSegments = Math.max(2, Math.ceil(w / 3)), zSegments = Math.max(2, Math.ceil(h / 3));
      const vertices: number[] = [], indices: number[] = [], uvs: number[] = [];
      for (let iz = 0; iz <= zSegments; iz += 1) for (let ix = 0; ix <= xSegments; ix += 1) {
        const localX = (ix / xSegments - 0.5) * w, localZ = (iz / zSegments - 0.5) * h;
        const worldX = x + localX * Math.cos(rotation) - localZ * Math.sin(rotation);
        const worldZ = z + localX * Math.sin(rotation) + localZ * Math.cos(rotation);
        vertices.push(worldX, terrainHeight(worldX, worldZ) + 0.055, worldZ); uvs.push(ix / xSegments, iz / zSegments);
      }
      for (let iz = 0; iz < zSegments; iz += 1) for (let ix = 0; ix < xSegments; ix += 1) {
        const a = iz * (xSegments + 1) + ix, b = a + 1, c = a + xSegments + 1, d = c + 1; indices.push(a, c, b, b, c, d);
      }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, roadMaterial); mesh.receiveShadow = true; scene.add(mesh);
    };
    road(0, -7, 145, 9, 0.05);
    road(18, 10, 8, 48, -0.55);
    road(53, 0, 8, 58, 0.42);

    // Ranger station
    building('suburban-building-type-a', -58, -28, 1.65, Math.PI, 4.8, 4.2);
    building('suburban-building-type-h', -70, -24, 1.45, Math.PI / 2, 3.8, 3.2);
    place('tent', -60, -40, 1.45, 0.5); place('campfire-pit', -54, -35, 1.2);
    place('chest', -61, -34, 1.1, 0.4); place('resource-planks', -68, -31, 1.3, 0.2);
    for (let i = 0; i < 8; i += 1) place(i % 2 ? 'pine' : 'pine-crooked', -76 + i * 3.5, -45 + (i % 3) * 4, 1.3 + (i % 2) * 0.25, i);

    // Dense village street
    const villageBuildings = [
      ['suburban-building-type-c', -37, -17, 1.75, 0], ['suburban-building-type-f', -25, -18, 1.7, 0],
      ['suburban-building-type-k', -11, -17, 1.65, 0], ['suburban-building-type-n', -35, 7, 1.7, Math.PI],
      ['suburban-building-type-r', -22, 8, 1.75, Math.PI], ['suburban-building-type-t', -8, 8, 1.55, Math.PI],
    ] as const;
    villageBuildings.forEach(([name, x, z, scale, rot]) => building(name, x, z, scale, rot, 4.5, 4));
    for (let x = -41; x <= -4; x += 5.2) {
      place('suburban-fence-low', x, 13, 1.3, Math.PI / 2);
      if (x % 10 > -5) place('suburban-planter', x, -11, 1.1, x);
    }
    [-42, -31, -16, -3].forEach((x, i) => place('lightpost-single', x, i % 2 ? -11 : 3, 1.35, i));
    [['barrel', -28, -5], ['box', -24, -5], ['box-open', -20, -5], ['barrel', -5, 2], ['signpost', -43, -5]].forEach(([n, x, z], i) => place(n as string, x as number, z as number, 1.1, i));

    // Cemetery
    building('crypt-large', 20, 24, 1.65, Math.PI, 5.2, 4.2);
    for (let row = 0; row < 4; row += 1) for (let col = 0; col < 5; col += 1) {
      const graves = ['gravestone-bevel', 'gravestone-round', 'gravestone-cross', 'gravestone-broken'];
      place(graves[(row + col) % graves.length], 5 + col * 4.2 + (row % 2), 8 + row * 4.1, 1 + (col % 2) * 0.1, (col - row) * 0.15);
    }
    for (let i = 0; i < 8; i += 1) place('fence', 3 + i * 4.6, 29, 1.1, Math.PI / 2);
    place('fence-gate', 18, 4, 1.2, 0); place('coffin', 9, 25, 1.15, -0.4);
    place('fire-basket', 14, 18, 1.2); place('fire-basket', 21, 18, 1.2);

    // Clinic and industrial quarantine zone
    building('industrial-building-a', 44, 29, 1.8, Math.PI, 5.5, 4.5);
    building('industrial-building-f', 57, 28, 1.85, Math.PI, 5, 4.5);
    building('industrial-building-c', 50, 14, 1.75, 0, 5.3, 4.4);
    building('industrial-building-j', 66, 13, 1.7, 0, 4.4, 3.8);
    building('industrial-building-m', 74, 27, 1.65, Math.PI / 2, 4, 4.8);
    place('industrial-chimney-large', 60, 34, 2.2); place('industrial-detail-tank', 38, 20, 1.9, 0.4);
    for (let i = 0; i < 9; i += 1) place(i % 3 ? 'barrel' : 'box', 37 + i * 4.5, 7 + (i % 2) * 3, 1.05, i);
    [-1, 1].forEach((side) => { for (let i = 0; i < 7; i += 1) place('brick-wall', 37 + i * 6, side > 0 ? 36 : 5, 1.15, Math.PI / 2); });

    // Radio tower / evacuation site
    building('industrial-building-r', 70, -35, 1.7, Math.PI, 4.8, 4.2);
    const tower = new THREE.Group(); tower.position.set(66, terrainHeight(66, -25), -25); scene.add(tower);
    const steel = new THREE.MeshStandardMaterial({ color: 0x7f8983, metalness: 0.55, roughness: 0.45 });
    for (let i = 0; i < 4; i += 1) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 15, 6), steel);
      pole.position.set(i < 2 ? -1.3 : 1.3, 7.5, i % 2 ? -1.3 : 1.3); pole.rotation.z = (i < 2 ? -1 : 1) * 0.07; pole.castShadow = true; tower.add(pole);
    }
    for (let y = 2; y < 14; y += 2) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55 - y * 0.035, 0.07, 4, 4), steel); ring.position.y = y; ring.rotation.x = Math.PI / 2; tower.add(ring);
    }
    const redBeacon = new THREE.PointLight(0xff301f, 34, 36, 2); redBeacon.position.set(66, terrainHeight(66, -25) + 15, -25); scene.add(redBeacon);
    place('fire-basket', 60, -30, 1.3); place('fire-basket', 72, -30, 1.3);
    for (let i = 0; i < 10; i += 1) place(i % 2 ? 'box' : 'barrel', 56 + (i % 5) * 5, -40 + Math.floor(i / 5) * 4, 1.1, i);

    // Trees, rocks and roadside clutter keep the route dense.
    for (let i = 0; i < 92; i += 1) {
      const x = -88 + (i * 31 % 176); const z = -59 + (i * 47 % 118);
      if (Math.abs(z + 7) < 8 || (x > -45 && x < 78 && z > -22 && z < 38)) continue;
      place(i % 3 ? 'suburban-tree-large' : 'pine-crooked', x, z, i % 3 ? 1.75 + (i % 4) * 0.12 : 1.25, i * 1.7);
      if (i % 4 === 0) place(`rock-${(['a', 'b', 'c'] as const)[i % 3]}`, x + 2.2, z - 1.2, 1 + (i % 2) * 0.4, i);
    }
    for (let i = 0; i < 58; i += 1) {
      const x = -82 + (i * 23 % 164), z = -52 + (i * 37 % 104);
      if (Math.abs(z + 7) > 4) place(i % 3 ? 'grass-large' : 'grass', x, z, 1.1 + (i % 4) * 0.18, i * 0.7);
    }

    const warmLights: [number, number, number, number][] = [[-54,-35,0xff8a42,22],[-28,-6,0xf3b15b,12],[14,18,0xff7038,14],[21,18,0xff7038,14],[48,20,0x6fc7ff,18],[66,-25,0xd9ff43,20]];
    warmLights.forEach(([x,z,color,intensity]) => { const light = new THREE.PointLight(color, intensity * 1.15, 18, 2); light.position.set(x, terrainHeight(x, z) + 3, z); light.castShadow = intensity > 17; scene.add(light); });

    // First-person weapon
    const weapon = new THREE.Group(); weapon.position.set(0.38, -0.34, -0.66); camera.add(weapon);
    const gunDark = new THREE.MeshStandardMaterial({ color: 0x202724, metalness: 0.72, roughness: 0.3 });
    const gunGrip = new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.8 });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, 0.62), gunDark); slide.position.z = -0.12;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.62, 8), gunDark); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, -0.4);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.19), gunGrip); grip.position.set(0, -0.22, 0.03); grip.rotation.x = -0.2;
    weapon.add(slide, barrel, grip);
    const muzzle = new THREE.PointLight(0xffd267, 0, 5, 2); muzzle.position.set(0, 0, -0.76); weapon.add(muzzle);
    const muzzleMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), new THREE.MeshBasicMaterial({ color: 0xffd267 })); muzzleMesh.position.copy(muzzle.position); muzzleMesh.visible = false; weapon.add(muzzleMesh);
    const flashlight = new THREE.SpotLight(0xe8ffe0, 0, 32, Math.PI / 5.8, 0.45, 1.3); flashlight.position.set(0, 0, 0); flashlight.target.position.set(0, 0, -8); camera.add(flashlight, flashlight.target);

    const npcAnchors: { mara: THREE.Group; noah: THREE.Group } = {
      mara: new THREE.Group(), noah: new THREE.Group(),
    };
    npcAnchors.mara.position.set(-53, terrainHeight(-53, -33), -33); npcAnchors.noah.position.set(17, terrainHeight(17, 19), 19); npcAnchors.noah.visible = false;
    scene.add(npcAnchors.mara, npcAnchors.noah);
    const npcMixers: THREE.AnimationMixer[] = [];
    const makeNpc = (anchor: THREE.Group, skin: string, animation: 'idle' | 'run', accent: number) => {
      const fallback = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.8, 4, 7), new THREE.MeshStandardMaterial({ color: accent })); fallback.position.y = 0.9; anchor.add(fallback);
      loadCharacter(skin, animation).then(({ model, mixer }) => {
        if (disposed) return; fallback.visible = false;
        anchor.add(model); npcMixers.push(mixer);
        const badge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), new THREE.MeshBasicMaterial({ color: accent })); badge.position.set(0, 1.45, -0.26); anchor.add(badge);
      }).catch(() => undefined);
    };
    makeNpc(npcAnchors.mara, 'survivorFemaleA', 'idle', 0xff695c); makeNpc(npcAnchors.noah, 'survivorMaleB', 'run', 0x53c8ff);

    const objectiveMarker = new THREE.Group(); scene.add(objectiveMarker);
    const markerBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.25, 7, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.26, side: THREE.DoubleSide })); markerBeam.position.y = 3.5;
    const markerRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.05, 6, 28), new THREE.MeshBasicMaterial({ color: 0xd9ff43 })); markerRing.rotation.x = Math.PI / 2; markerRing.position.y = 0.05;
    objectiveMarker.add(markerBeam, markerRing);
    const moveObjectiveMarker = (stage: number) => { const target = OBJECTIVES[stage].target; objectiveMarker.position.set(target.x, terrainHeight(target.x, target.z), target.z); };

    const fuelBaseY = terrainHeight(-19, -4); const fuelCell = new THREE.Group(); fuelCell.position.set(-19, fuelBaseY, -4); scene.add(fuelCell);
    const fuelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.42), new THREE.MeshStandardMaterial({ color: 0xd9ff43, emissive: 0x6c7d1e, emissiveIntensity: 1.2 })); fuelMesh.position.y = 0.55; fuelCell.add(fuelMesh);
    const serumBaseY = terrainHeight(48, 23); const serum = new THREE.Group(); serum.position.set(48, serumBaseY, 23); scene.add(serum);
    const serumMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.65, 10), new THREE.MeshStandardMaterial({ color: 0x64d9ff, emissive: 0x238fb1, emissiveIntensity: 1.8, transparent: true, opacity: 0.85 })); serumMesh.position.y = 0.7; serum.add(serumMesh);

    const pickups: { object: THREE.Group; kind: 'ammo' | 'health'; taken: boolean; baseY: number }[] = [];
    const pickup = (kind: 'ammo' | 'health', x: number, z: number) => {
      const baseY = terrainHeight(x, z) + 0.28; const object = new THREE.Group(); object.position.set(x, baseY, z);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(kind === 'ammo' ? 0.6 : 0.5, 0.35, 0.45), new THREE.MeshStandardMaterial({ color: kind === 'ammo' ? 0xe6b95b : 0xe6524b, emissive: kind === 'ammo' ? 0x4d350a : 0x4d0808, emissiveIntensity: 0.8 })); object.add(mesh); scene.add(object); pickups.push({ object, kind, taken: false, baseY });
    };
    [[-45,-6],[-30,4],[-2,13],[27,7],[40,26],[61,5],[73,-31]].forEach(([x,z],i)=>pickup(i%3===0?'health':'ammo',x,z));

    const enemies: Enemy[] = [];
    const enemyHitboxes: THREE.Mesh[] = [];
    const keys = new Set<string>();
    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    let yaw = 0, pitch = 0, bob = 0, recoil = 0, muzzleTime = 0, locationTime = 0;
    let audio: AudioContext | null = null;
    let runtime = { ...INITIAL_HUD, active: false, spawn: 2, hudTick: 0, invulnerable: 0, reloadLeft: 0, dialogueTime: 0, locationName: '', zoneTriggered: new Set<number>() };

    const tone = (frequency: number, duration: number, type: OscillatorType = 'square', volume = 0.035) => {
      if (!audio) return;
      const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = type; osc.frequency.setValueAtTime(frequency, audio.currentTime); osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.45), audio.currentTime + duration); gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration); osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
    };
    const say = (entry: readonly [string, string]) => { setDialogue({ speaker: entry[0], text: entry[1] }); runtime.dialogueTime = 6; tone(180, 0.08, 'sine', 0.015); };

    const spawnEnemy = (x?: number, z?: number, tougher = false) => {
      if (enemies.filter((e) => e.alive).length >= 26) return;
      const angle = Math.random() * Math.PI * 2, distance = 15 + Math.random() * 12;
      const spawnX = THREE.MathUtils.clamp(x ?? camera.position.x + Math.cos(angle) * distance, -86, 83);
      const spawnZ = THREE.MathUtils.clamp(z ?? camera.position.z + Math.sin(angle) * distance, -57, 53);
      const group = new THREE.Group(); group.position.set(spawnX, terrainHeight(spawnX, spawnZ), spawnZ); scene.add(group);
      const hitbox = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 1.05, 3, 7), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hitbox.position.y = 1.05; group.add(hitbox); enemyHitboxes.push(hitbox);
      const fallback = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 3, 7), new THREE.MeshStandardMaterial({ color: tougher ? 0x8b6544 : 0x76934f, flatShading: true })); fallback.position.y = 0.95; fallback.castShadow = true; group.add(fallback);
      const enemy: Enemy = { group, hitbox, health: tougher ? 5 : 3, speed: 1.35 + Math.random() * 0.65 + runtime.stage * 0.08, attack: 0, alive: true }; hitbox.userData.enemy = enemy; enemies.push(enemy);
      loadCharacter(tougher ? 'zombieC' : Math.random() > 0.5 ? 'zombieA' : 'zombieC', 'run').then(({ model, mixer }) => {
        if (disposed || !enemy.alive) return; fallback.visible = false;
        const variation = tougher ? 1.13 : 0.98 + Math.random() * 0.07; model.scale.multiplyScalar(variation); group.add(model); enemy.mixer = mixer;
      }).catch(() => undefined);
    };
    const killEnemy = (enemy: Enemy) => { enemy.alive = false; scene.remove(enemy.group); const index = enemyHitboxes.indexOf(enemy.hitbox); if (index >= 0) enemyHitboxes.splice(index, 1); runtime.kills += 1; tone(75, 0.12, 'sawtooth', 0.018); };
    const spawnPack = (cx: number, cz: number, count: number) => { for (let i = 0; i < count; i += 1) spawnEnemy(cx + Math.cos(i * 2.1) * (5 + i % 3), cz + Math.sin(i * 2.1) * (5 + i % 3), i === count - 1 && count > 5); };

    const reloadWeapon = () => {
      if (!runtime.active || runtime.reloading || runtime.ammo >= 12 || runtime.reserve <= 0) return;
      runtime.reloading = true; runtime.reloadLeft = 1.35; tone(210, 0.08, 'square', 0.018);
    };
    const shoot = () => {
      if (!runtime.active || runtime.reloading) return;
      if (runtime.ammo <= 0) { reloadWeapon(); return; }
      runtime.ammo -= 1; recoil = Math.min(0.11, recoil + 0.052); muzzleTime = 0.045; muzzle.intensity = 55; muzzleMesh.visible = true; tone(105, 0.09, 'sawtooth', 0.045);
      raycaster.setFromCamera(center, camera); raycaster.far = 55;
      const hits = raycaster.intersectObjects(enemyHitboxes, false);
      if (hits[0]) {
        const enemy = hits[0].object.userData.enemy as Enemy; const headshot = hits[0].point.y - enemy.group.position.y > 1.45;
        enemy.health -= headshot ? 3 : 1; if (enemy.health <= 0) killEnemy(enemy);
      }
    };

    const nearEnemy = (position: THREE.Vector3, radius: number) => enemies.some((enemy) => enemy.alive && horizontalDistance(enemy.group.position, position) < radius);
    const advanceStory = () => {
      if (!runtime.active) return;
      const target = OBJECTIVES[runtime.stage].target;
      if (horizontalDistance(camera.position, target) > 3.2) return;
      if (runtime.stage === 2 && nearEnemy(target, 8)) { runtime.prompt = 'BEREICH SICHERN'; return; }
      if (runtime.stage === 0) { runtime.stage = 1; say(STORY.mara); spawnPack(-24, -2, 5); }
      else if (runtime.stage === 1) { runtime.stage = 2; fuelCell.visible = false; npcAnchors.noah.visible = true; say(STORY.fuel); spawnPack(15, 17, 7); }
      else if (runtime.stage === 2) { runtime.stage = 3; say(STORY.noah); spawnPack(48, 20, 8); }
      else if (runtime.stage === 3) { runtime.stage = 4; serum.visible = false; say(STORY.serum); spawnPack(62, -20, 7); }
      else if (runtime.stage === 4) { runtime.stage = 5; runtime.timer = 40; say(STORY.tower); spawnPack(66, -25, 10); }
      moveObjectiveMarker(runtime.stage);
    };

    const resetGame = () => {
      enemies.forEach((enemy) => scene.remove(enemy.group)); enemies.length = 0; enemyHitboxes.length = 0;
      camera.position.set(START.x, terrainHeight(START.x, START.z) + 1.72, START.z); yaw = 0.35; pitch = 0; camera.rotation.set(0, yaw, 0);
      fuelCell.visible = true; serum.visible = true; npcAnchors.noah.visible = false;
      pickups.forEach((item) => { item.taken = false; item.object.visible = true; });
      runtime = { ...INITIAL_HUD, active: true, spawn: 2.5, hudTick: 0, invulnerable: 0, reloadLeft: 0, dialogueTime: 0, locationName: '', zoneTriggered: new Set<number>() };
      moveObjectiveMarker(0); setHud(INITIAL_HUD); setScreen('playing'); setLocation(null); say(STORY.intro);
      audio ??= new AudioContext(); audio.resume(); canvas.requestPointerLock?.();
    };
    apiRef.current = { start: resetGame, resume: () => { runtime.active = true; setScreen('playing'); audio?.resume(); canvas.requestPointerLock?.(); } };

    const collides = (x: number, z: number) => obstacles.some((o) => Math.abs(x - o.x) < o.hx + 0.45 && Math.abs(z - o.z) < o.hz + 0.45);
    const onKeyDown = (event: KeyboardEvent) => {
      keys.add(event.code);
      if (event.code === 'KeyE' && !event.repeat) advanceStory();
      if (event.code === 'KeyR' && !event.repeat) reloadWeapon();
      if (event.code === 'KeyF' && !event.repeat) flashlight.intensity = flashlight.intensity > 0 ? 0 : 32;
      if (event.code === 'Escape' && !event.repeat && runtime.active) { runtime.active = false; setScreen('paused'); }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas || !runtime.active) return;
      yaw -= event.movementX * 0.0022; pitch -= event.movementY * 0.002; pitch = THREE.MathUtils.clamp(pitch, -1.25, 1.25);
    };
    const onMouseDown = (event: MouseEvent) => {
      if (!runtime.active) return;
      if (document.pointerLockElement !== canvas) { canvas.requestPointerLock?.(); return; }
      if (event.button === 0) shoot();
    };
    const onPointerLock = () => {
      if (document.pointerLockElement !== canvas && runtime.active) { runtime.active = false; setScreen('paused'); }
    };
    const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); };
    addEventListener('keydown', onKeyDown); addEventListener('keyup', onKeyUp); addEventListener('mousemove', onMouseMove); addEventListener('resize', resize); document.addEventListener('pointerlockchange', onPointerLock); canvas.addEventListener('mousedown', onMouseDown); resize();

    Promise.all([
      loadFbx(`${MODEL}characters/characterMedium.fbx`), loadFbx(`${MODEL}characters/animations/run.fbx`),
      loadFbx(`${MODEL}characters/animations/idle.fbx`), loadSkin('zombieA'),
      load('suburban-building-type-a'), load('industrial-building-a'),
    ]).then(() => { if (!disposed) setLoaded(true); }).catch(() => { if (!disposed) setLoaded(true); });

    const animate = () => {
      frame = requestAnimationFrame(animate); const dt = Math.min(clock.getDelta(), 0.045);
      npcMixers.forEach((mixer) => mixer.update(dt));
      redBeacon.intensity = 20 + Math.sin(performance.now() * 0.004) * 8;
      markerRing.rotation.z += dt * 0.8;
      if (markerBeam.material instanceof THREE.MeshBasicMaterial) markerBeam.material.opacity = 0.2 + Math.sin(performance.now() * 0.003) * 0.08;
      fuelCell.rotation.y += dt; fuelCell.position.y = fuelBaseY + Math.sin(performance.now() * 0.003) * 0.08;
      serum.rotation.y -= dt; serum.position.y = serumBaseY + Math.sin(performance.now() * 0.003 + 2) * 0.08;

      if (runtime.active) {
        camera.rotation.set(pitch + recoil, yaw, 0);
        recoil = THREE.MathUtils.lerp(recoil, 0, 1 - Math.pow(0.002, dt));
        muzzleTime -= dt; if (muzzleTime <= 0) { muzzle.intensity = 0; muzzleMesh.visible = false; }
        const inputX = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
        const inputZ = Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
        const moving = inputX !== 0 || inputZ !== 0;
        const sprint = keys.has('ShiftLeft') && runtime.stamina > 0 && inputZ < 0;
        if (moving) {
          const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
          const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
          const delta = forward.multiplyScalar(-inputZ).add(right.multiplyScalar(inputX)).normalize().multiplyScalar((sprint ? 7.6 : 4.6) * dt);
          const nx = THREE.MathUtils.clamp(camera.position.x + delta.x, -87, 84), nz = THREE.MathUtils.clamp(camera.position.z + delta.z, -58, 54);
          if (!collides(nx, camera.position.z)) camera.position.x = nx;
          if (!collides(camera.position.x, nz)) camera.position.z = nz;
          bob += dt * (sprint ? 13 : 8); weapon.position.y = -0.34 - Math.abs(Math.sin(bob)) * 0.025;
        }
        camera.position.y = terrainHeight(camera.position.x, camera.position.z) + 1.72 + (moving ? Math.sin(bob) * (sprint ? 0.055 : 0.032) : 0);
        runtime.stamina = THREE.MathUtils.clamp(runtime.stamina + (sprint ? -27 : 18) * dt, 0, 100);
        runtime.invulnerable = Math.max(0, runtime.invulnerable - dt);
        if (runtime.reloading) {
          runtime.reloadLeft -= dt; weapon.rotation.z = Math.sin(Math.min(1, runtime.reloadLeft) * Math.PI) * 0.55;
          if (runtime.reloadLeft <= 0) { const amount = Math.min(12 - runtime.ammo, runtime.reserve); runtime.ammo += amount; runtime.reserve -= amount; runtime.reloading = false; weapon.rotation.z = 0; tone(320, 0.06, 'square', 0.015); }
        }

        runtime.spawn -= dt;
        if (runtime.spawn <= 0) { spawnEnemy(undefined, undefined, Math.random() < 0.12); runtime.spawn = runtime.stage === 5 ? 0.7 + Math.random() * 0.7 : 2.8 + Math.random() * 2.3; }
        if (runtime.stage >= 3) {
          const followX = camera.position.x + Math.sin(yaw) * 2.4, followZ = camera.position.z + Math.cos(yaw) * 2.4;
          const followTarget = new THREE.Vector3(followX, terrainHeight(followX, followZ), followZ);
          const followDelta = followTarget.sub(npcAnchors.noah.position);
          if (followDelta.length() > 2.2) npcAnchors.noah.position.add(followDelta.normalize().multiplyScalar(3.1 * dt));
          npcAnchors.noah.position.y = terrainHeight(npcAnchors.noah.position.x, npcAnchors.noah.position.z);
          npcAnchors.noah.rotation.y = Math.atan2(followDelta.x, followDelta.z);
        }
        for (const enemy of enemies) {
          if (!enemy.alive) continue; enemy.mixer?.update(dt);
          const target = new THREE.Vector3(camera.position.x, terrainHeight(camera.position.x, camera.position.z), camera.position.z); const delta = target.sub(enemy.group.position); const distance = delta.length();
          if (distance > 1.15) enemy.group.position.add(delta.normalize().multiplyScalar(enemy.speed * dt));
          enemy.group.rotation.y = Math.atan2(delta.x, delta.z); enemy.group.position.y = terrainHeight(enemy.group.position.x, enemy.group.position.z);
          enemy.attack -= dt;
          if (distance < 1.45 && enemy.attack <= 0 && runtime.invulnerable <= 0) { runtime.health = Math.max(0, runtime.health - (enemy.health > 3 ? 18 : 11)); runtime.invulnerable = 0.45; enemy.attack = 0.9; tone(48, 0.2, 'sawtooth', 0.045); if (runtime.health <= 0) { runtime.active = false; document.exitPointerLock?.(); setDialogue(null); setScreen('dead'); } }
        }

        pickups.forEach((item, i) => {
          if (item.taken) return; item.object.rotation.y += dt; item.object.position.y = item.baseY + Math.sin(performance.now() * 0.003 + i) * 0.08;
          if (horizontalDistance(item.object.position, camera.position) < 1.4) { if (item.kind === 'health' && runtime.health < 100) runtime.health = Math.min(100, runtime.health + 35); else if (item.kind === 'ammo') runtime.reserve += 24; else return; item.taken = true; item.object.visible = false; tone(item.kind === 'health' ? 520 : 380, 0.12, 'sine', 0.025); }
        });

        if (runtime.stage === 5) { runtime.timer = Math.max(0, runtime.timer - dt); if (runtime.timer <= 0) { runtime.active = false; document.exitPointerLock?.(); setDialogue(null); setScreen('won'); } }
        const objective = OBJECTIVES[runtime.stage]; const distance = horizontalDistance(camera.position, objective.target); runtime.distance = Math.round(distance);
        runtime.prompt = distance < 3.2 ? (runtime.stage === 2 && nearEnemy(objective.target, 8) ? 'BEREICH SICHERN' : runtime.stage === 5 ? 'HALTE DIE STELLUNG' : '[E] INTERAGIEREN') : '';

        const currentLocation = LOCATIONS.find((item) => item.test(camera.position.x, camera.position.z))!;
        if (currentLocation.name !== runtime.locationName) { runtime.locationName = currentLocation.name; setLocation({ name: currentLocation.name, subtitle: currentLocation.subtitle }); locationTime = 3.2; }
        if (locationTime > 0) { locationTime -= dt; if (locationTime <= 0) setLocation(null); }
        if (runtime.dialogueTime > 0) { runtime.dialogueTime -= dt; if (runtime.dialogueTime <= 0) setDialogue(null); }
        runtime.hudTick -= dt;
        if (runtime.hudTick <= 0) { setHud({ health: Math.round(runtime.health), ammo: runtime.ammo, reserve: runtime.reserve, stamina: Math.round(runtime.stamina), stage: runtime.stage, kills: runtime.kills, timer: Math.ceil(runtime.timer), prompt: runtime.prompt, reloading: runtime.reloading, distance: runtime.distance }); runtime.hudTick = 0.08; }
      }
      composer.render();
    };
    animate();

    return () => {
      disposed = true; apiRef.current = null; cancelAnimationFrame(frame); document.exitPointerLock?.();
      removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp); removeEventListener('mousemove', onMouseMove); removeEventListener('resize', resize); document.removeEventListener('pointerlockchange', onPointerLock); canvas.removeEventListener('mousedown', onMouseDown);
      composer.dispose(); renderer.dispose(); scene.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry?.dispose(); const mats = Array.isArray(object.material) ? object.material : [object.material]; mats.forEach((mat) => mat?.dispose()); } });
    };
  }, []);

  const start = useCallback(() => apiRef.current?.start(), []);
  const resume = useCallback(() => apiRef.current?.resume(), []);
  const objective = OBJECTIVES[hud.stage];

  return (
    <main className="game-shell fps">
      <canvas ref={canvasRef} className="game-canvas" tabIndex={0} aria-label="Nachtwache First-Person-Spielfeld" />
      <div className="vignette" aria-hidden="true" /><div className="grain" aria-hidden="true" />

      {screen === 'playing' && <div className="hud" aria-live="polite">
        <header className="fps-mission">
          <div><small>{objective.place} · AUFTRAG {hud.stage + 1}/6</small><strong>{objective.title}</strong><span>{objective.detail}</span></div>
          <b>{hud.distance}<small>M</small></b>
        </header>
        <section className="vitals">
          <div className="health-number">{hud.health}</div><div><span>GESUNDHEIT</span><div className="bar"><i style={{ width: `${hud.health}%` }} /></div><span>AUSDAUER</span><div className="bar stamina"><i style={{ width: `${hud.stamina}%` }} /></div></div>
        </section>
        <section className="fps-ammo"><small>{hud.reloading ? 'NACHLADEN…' : 'VOSS P12 · 9MM'}</small><div><b>{String(hud.ammo).padStart(2, '0')}</b><span>/ {hud.reserve}</span></div><em>{hud.kills} INFIZIERTE</em></section>
        <div className="fps-crosshair"><i /><i /><span /></div>
        {hud.prompt && <div className={hud.prompt === 'BEREICH SICHERN' ? 'fps-prompt danger-prompt' : 'fps-prompt'}>{hud.prompt}</div>}
        {hud.stage === 5 && <div className="defense-timer"><small>KONVOI ANKUNFT</small><b>00:{String(hud.timer).padStart(2, '0')}</b></div>}
      </div>}

      {location && screen === 'playing' && <section className="location-card"><small>GEBIET BETRETEN</small><h2>{location.name}</h2><p>{location.subtitle}</p></section>}
      {dialogue && screen === 'playing' && <section className="radio-message fps-dialogue"><div className="speaker-mark">{dialogue.speaker.charAt(0)}</div><div><small>{dialogue.speaker}</small><p>{dialogue.text}</p></div></section>}

      {screen === 'title' && <section className="title-card fps-title">
        <p className="eyebrow">FIRST PERSON SURVIVAL · TANNWALD · 03:17 UHR</p>
        <h1>NACHT<span>WACHE</span></h1>
        <p className="tagline">Fünf Orte. Eine Nacht. Jede Kugel entscheidet, wer den Morgen erlebt.</p>
        <button type="button" onClick={start} disabled={!loaded}>{loaded ? 'MISSION STARTEN' : 'TANNWALD WIRD GELADEN…'} <span>→</span></button>
        <div className="controls"><b>WASD</b> Bewegen <b>MAUS</b> Umschauen / Schießen <b>E</b> Interagieren <b>R</b> Nachladen <b>F</b> Licht <b>SHIFT</b> Sprint</div>
        <p className="story-hook">Als Ranger Elias Voss durchquerst du die Rangerstation, das verlassene Dorf, den Friedhof, die Klinik und den Funkturm. Finde Mara und Noah, bevor Dr. Falks Experiment Tannwald verschlingt.</p>
        <div className="desktop-note">KLICKEN AKTIVIERT DIE MAUSSTEUERUNG · KOPFHÖRER EMPFOHLEN</div>
      </section>}
      {screen === 'paused' && <section className="overlay-card compact"><p className="eyebrow">MISSION PAUSIERT</p><h2>Bleib leise.</h2><p>Klicke auf Weiterspielen, um die Maus wieder zu erfassen.</p><button type="button" onClick={resume}>WEITERSPIELEN <span>→</span></button></section>}
      {screen === 'dead' && <section className="overlay-card"><p className="eyebrow danger">ELIAS · SIGNAL VERLOREN</p><h2>Tannwald behält dich.</h2><p>{hud.kills} Infizierte sind gefallen. Mara und Noah warten noch immer am Funkturm.</p><button type="button" onClick={start}>MISSION NEU STARTEN <span>→</span></button></section>}
      {screen === 'won' && <section className="overlay-card win"><p className="eyebrow">05:42 UHR · KONVOI EINGETROFFEN</p><h2>Der Morgen findet euch.</h2><p>Das Gegenmittel ist gesichert. Mara und Noah verlassen Tannwald – während Dr. Falks letzte Aufzeichnung im Rauschen verschwindet.</p><div className="result"><span>{hud.kills}<small>INFIZIERTE</small></span><span>{hud.health}<small>GESUNDHEIT</small></span></div><button type="button" onClick={start}>NOCH EINMAL <span>↻</span></button></section>}
      <footer className="credit">3D-ASSETS & ANIMATIONEN: KENNEY · CC0 · DESKTOP-SPIEL</footer>
    </main>
  );
}
