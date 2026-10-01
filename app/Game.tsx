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
import { ITEMS, LOOT, NOTES, REGIONS, newInventory, segmentBlocked, type ItemKind, type LootKind, lootName } from './world';
import { WORLD, ZOMBIES, WEAPONS, freshArsenal, makeBrain, think, transition, findPath, type ZombieKind, type Brain, type Point, type Stimulus, type WeaponKind } from './survival';
import { ZombieAnimator } from './zombieAnimation';
import { CITY_PLACES, CITY_ROADS, CITY_LOOT, CITY_NPCS, DISCOVERIES, buildCity } from './city';
import { assetPath } from './assetPath';
const WORLD_LOOT: {kind:LootKind;x:number;z:number;count:number}[] = [...LOOT,...CITY_LOOT];

type Screen = 'title' | 'playing' | 'paused' | 'dead' | 'won' | 'journal';
type Hud = {
  health: number; ammo: number; reserve: number; stamina: number; stage: number;
  kills: number; timer: number; prompt: string; reloading: boolean; distance: number;
  battery: number; inventory: ReturnType<typeof newInventory>; discovered: number[]; boosted: number; repaired: boolean; x: number; z: number;
  thirst: number; infection: number; protection: number; powerQuest: number; benQuest: number; evidence: string[]; visited: string[]; keycard: boolean; elapsed: number;
  weapon: WeaponKind; arsenal: ReturnType<typeof freshArsenal>; hit: number; damageFlash: number; aiming: boolean;
};
type Enemy = {
  group: THREE.Group; hitbox: THREE.Mesh; health: number;
  alive: boolean; mixer?: THREE.AnimationMixer; phase: number; deathTime: number;
  kind: ZombieKind; brain: Brain; animator?: ZombieAnimator; path: Point[]; pathTime: number; lastPathTarget: Point; visual: THREE.Group; head: THREE.Mesh;
};

const MODEL = assetPath('/models/kenney/');
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
  const cityBlend = THREE.MathUtils.smoothstep(x,78,98);
  height = THREE.MathUtils.lerp(height, .15, cityBlend);
  for (const place of CITY_PLACES.filter(p=>p.x<0)) { const t=1-THREE.MathUtils.smoothstep(Math.max(Math.abs(x-place.x),Math.abs(z-place.z)),8,18);height=THREE.MathUtils.lerp(height,rawTerrainHeight(place.x,place.z),t); }
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
const INITIAL_HUD: Hud = { health: 100, ammo: 12, reserve: 48, stamina: 100, stage: 0, kills: 0, timer: 40, prompt: '', reloading: false, distance: 8, battery: 100, inventory: newInventory(), discovered: [], boosted: 0, repaired: false, x: START.x, z: START.z, weapon: 'pistol', arsenal: freshArsenal(), hit: 0, damageFlash: 0, aiming: false, thirst: 100, infection: 0, protection: 0, powerQuest: 0, benQuest: 0, evidence: [], visited: [], keycard: false, elapsed: 0 };

const OBJECTIVES = [
  { place: 'RANGERSTATION', title: 'Sprich mit Mara', detail: 'Sie wartet am Feuer.', target: new THREE.Vector3(-53, 0, -36) },
  { place: 'DORF TANNWALD', title: 'Hole die Brennstoffzelle', detail: 'Durchsuche den verlassenen Markt.', target: new THREE.Vector3(-19, 0, -4) },
  { place: 'ALTER FRIEDHOF', title: 'Finde Noah', detail: 'Befreie den Überlebenden am Mausoleum.', target: new THREE.Vector3(17, 0, 15) },
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
  const apiRef = useRef<{ start: () => void; resume: () => void; journal: () => void } | null>(null);
  const [screen, setScreen] = useState<Screen>('title');
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [loaded, setLoaded] = useState(false);
  const [assetErrors, setAssetErrors] = useState<string[]>([]);
  const [journalTab, setJournalTab] = useState<'map' | 'notes'>('map');
  const [selectedNote, setSelectedNote] = useState(0);
  const [notice, setNotice] = useState('');
  const [dialogue, setDialogue] = useState<{ speaker: string; text: string } | null>(null);
  const [location, setLocation] = useState<{ name: string; subtitle: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let frame = 0;
    let generation = 0;
    const reportAssetError = (name: string) => { if (!disposed) setAssetErrors(old => old.includes(name) ? old : [...old, name]); console.warn('Asset konnte nicht geladen werden:', name); };

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.info.autoReset = false;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07100f);
    scene.fog = new THREE.FogExp2(0x152321, 0.0125);
    const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 220);
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
      new THREE.SphereGeometry(210, 28, 16),
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

    const terrainGeometry = new THREE.PlaneGeometry(460, 390, 153, 130);
    const terrainPosition = terrainGeometry.getAttribute('position') as THREE.BufferAttribute;
    const terrainColors: number[] = [];
    const lowColor = new THREE.Color(0x24372d), highColor = new THREE.Color(0x435344), tempColor = new THREE.Color();
    for (let i = 0; i < terrainPosition.count; i += 1) {
      const x = terrainPosition.getX(i) + 30, z = -terrainPosition.getY(i) - 12, height = terrainHeight(x, z); terrainPosition.setX(i,x); terrainPosition.setY(i,-z);
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
    const mist: THREE.Sprite[] = [];
    for (let i = 0; i < 26; i += 1) {
      const x = -82 + (i * 29 % 166), z = -50 + (i * 43 % 104);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTexture, color: 0xb8d0c6, transparent: true, opacity: 0.1, depthWrite: false }));
      sprite.position.set(x, terrainHeight(x, z) + 1.35, z); sprite.scale.set(18 + i % 5 * 4, 5 + i % 3, 1); scene.add(sprite);
      mist.push(sprite);
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
      const [base, idleSource, runSource, texture] = await Promise.all([
        loadFbx(`${MODEL}characters/characterMedium.fbx`),
        loadFbx(`${MODEL}characters/animations/idle.fbx`),
        loadFbx(`${MODEL}characters/animations/run.fbx`),
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
      const mixer = new THREE.AnimationMixer(model);
      const action = (source: THREE.Group, name: 'Idle' | 'Run') => {
        const clip = source.animations.find(clip => clip.name.endsWith(`|${name}`))?.clone();
        if (!clip) throw new Error('Animationsclip fehlt');
        // Locomotion belongs to the character controller, never to an imported root track.
        clip.tracks = clip.tracks.filter(track => !/^(root|armature|rootjoint)\.position$/i.test(track.name));
        return mixer.clipAction(clip);
      };
      const actions = { idle: action(idleSource, 'Idle'), run: action(runSource, 'Run') };
      actions[animation].play();
      return { model, mixer, actions };
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
      }).catch(() => reportAssetError(name));
      return anchor;
    };

    const obstacles: { x: number; z: number; hx: number; hz: number }[] = [];
    const building = (name: string, x: number, z: number, scale: number, rotation: number, hx: number, hz: number) => {
      const anchor = place(name, x, z, scale, rotation);
      const obstacle = { x, z, hx: (rotation % Math.PI === 0 ? hx : hz), hz: (rotation % Math.PI === 0 ? hz : hx) };
      obstacles.push(obstacle);
      load(name).then(() => {
        if (disposed) return;
        anchor.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(anchor);
        if (!bounds.isEmpty()) { const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3()); obstacle.x = center.x; obstacle.z = center.z; obstacle.hx = size.x / 2; obstacle.hz = size.z / 2; }
      }).catch(() => undefined);
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
    CITY_ROADS.forEach(r=>road(r.x,r.z,r.w,r.h));
    road(0, -7, 145, 9, 0.05);
    road(18, 10, 8, 48, -0.55);
    road(53, 0, 8, 58, 0.42);
    const roadMarks = new THREE.InstancedMesh(new THREE.BoxGeometry(.13,.018,2.1),new THREE.MeshStandardMaterial({color:0xa29f7a,roughness:1}),135);
    const markTransform=new THREE.Object3D();let markIndex=0;
    for(const x of [92,151,212])for(let z=-144;z<121;z+=6){markTransform.position.set(x,terrainHeight(x,z)+.075,z);markTransform.updateMatrix();roadMarks.setMatrixAt(markIndex++,markTransform.matrix);}
    roadMarks.count=markIndex;scene.add(roadMarks);

    // Ranger station
    building('suburban-building-type-a', -58, -28, 1.65, Math.PI, 4.8, 4.2);
    building('suburban-building-type-h', -70, -24, 1.45, Math.PI / 2, 3.8, 3.2);
    place('tent', -60, -40, 1.45, 0.5); place('campfire-pit', -54, -35, 1.2);
    place('chest', -61, -34, 1.1, 0.4); place('resource-planks', -68, -31, 1.3, 0.2);
    for (let i = 0; i < 8; i += 1) place(i % 2 ? 'pine' : 'pine-crooked', -78 + i * 4.8, -49 - (i % 3) * 2, 1.05 + (i % 2) * 0.15, i);

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
    building('industrial-building-c', 50, 6, 1.75, 0, 5.3, 4.4);
    building('industrial-building-j', 66, 5, 1.7, 0, 4.4, 3.8);
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
      if (Math.hypot(x + 60, z + 33) < 20 || Math.abs(z + 7) < 8 || (x > -45 && x < 78 && z > -22 && z < 38)) continue;
      place(i % 3 ? 'suburban-tree-large' : 'pine-crooked', x, z, i % 3 ? 1.75 + (i % 4) * 0.12 : 1.25, i * 1.7);
      if (i % 4 === 0) place(`rock-${(['a', 'b', 'c'] as const)[i % 3]}`, x + 2.2, z - 1.2, 1 + (i % 2) * 0.4, i);
    }
    for (let i = 0; i < 58; i += 1) {
      const x = -82 + (i * 23 % 164), z = -52 + (i * 37 % 104);
      if (Math.abs(z + 7) > 4) place(i % 3 ? 'grass-large' : 'grass', x, z, 1.1 + (i % 4) * 0.18, i * 0.7);
    }

    const warmLights: [number, number, number, number][] = [[-54,-35,0xff8a42,22],[-28,-6,0xf3b15b,12],[14,18,0xff7038,14],[21,18,0xff7038,14],[48,20,0x6fc7ff,18],[66,-25,0xd9ff43,20]];
    const flickerLights: THREE.PointLight[] = [];
    warmLights.forEach(([x,z,color,intensity]) => { const light = new THREE.PointLight(color, intensity * 1.15, 18, 2); light.position.set(x, terrainHeight(x, z) + 3, z); light.userData.base = intensity; scene.add(light); flickerLights.push(light); });

    // Diegetic signage: readable paint, abandoned belongings and paper at each story stop.
    const paintedBoard = (text: string, x: number, z: number, color = '#e2d7b4', graffiti = false) => {
      const surface = document.createElement('canvas'); surface.width = 1024; surface.height = 384;
      const ctx = surface.getContext('2d')!;
      ctx.fillStyle = graffiti ? '#29332f' : '#142521'; ctx.fillRect(0, 0, 1024, 384);
      ctx.strokeStyle = '#697364'; ctx.lineWidth = 8; ctx.strokeRect(16, 16, 992, 352);
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = graffiti ? 'bold italic 66px monospace' : 'bold 62px Arial';
      text.split(' / ').forEach((line, i, lines) => ctx.fillText(line, 512, 192 + (i - (lines.length - 1) / 2) * 92, 930));
      const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.4, 0.12), new THREE.MeshStandardMaterial({ map: texture, roughness: 1, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.22 }));
      panel.position.set(x, terrainHeight(x, z) + 1.8, z); scene.add(panel);
      for (const offset of [-1.5, 1.5]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), gunPostMaterial); post.position.set(x + offset, terrainHeight(x, z) + 0.75, z); scene.add(post); }
      return panel;
    };
    const gunPostMaterial = new THREE.MeshStandardMaterial({ color: 0x504b3d, roughness: 1 });
    REGIONS.forEach((region, i) => paintedBoard(`${region.name.toUpperCase()} / SEKTOR 0${i + 1}`, region.x - 2, region.z - 8, '#d9ff83'));
    const city = buildCity(scene, terrainHeight, obstacles, paintedBoard);
    const interiorLight = new THREE.PointLight(0xb1c8ad,18,24,2); scene.add(interiorLight);
    const streetLight = new THREE.PointLight(0xe1bc78,0,27,2); scene.add(streetLight);
    // Forest perimeter and an old road lead to the rural shelters.
    for(let i=0;i<70;i++){const x=-168+(i*19%65),z=8+(i*37%143);if(CITY_PLACES.some(p=>Math.hypot(p.x-x,p.z-z)<18)||Math.abs(x+113)<6)continue;place(i%2?'pine':'suburban-tree-large',x,z,1.35+(i%3)*.25,i);}
    for(const z of [-98,-42,8,58,108]) { paintedBoard('← ALTSTADT / ZENTRUM ↑',91,z,'#c8d7bc'); }
    paintedBoard('BIRKENRAIN ← / WALDCAMP 90 M',-81,31,'#ccd6b7');
    const noteObjects = NOTES.map((note) => {
      paintedBoard(note.graffiti, note.x, note.z + 1, '#ebc5a1', true);
      const paper = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.7), new THREE.MeshStandardMaterial({ color: 0xf2dfae, emissive: 0xd3ac58, emissiveIntensity: 0.35 }));
      paper.position.set(note.x, terrainHeight(note.x, note.z) + 0.6, note.z); paper.rotation.set(0.15, -0.3, 0.1); scene.add(paper);
      place('box', note.x, note.z, 0.8);
      return paper;
    });
    // A deserted market, improvised aid station and vigil make the route inhabited.
    place('tent', -29, -3, 1.2); place('box-open', -31, -3); place('box', -27, -3);
    place('tent', 35, 23, 1.35, Math.PI / 2); place('box-open', 37, 25);
    place('resource-planks', 60, -27, 1.1); place('barrel', 61, -27);
    const flames: THREE.Mesh[] = [];
    [[-54, -35], [14, 18], [21, 18], [60, -30], [72, -30]].forEach(([x, z]) => {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 5), new THREE.MeshBasicMaterial({ color: 0xffa24a, transparent: true, opacity: 0.85 }));
      flame.position.set(x, terrainHeight(x, z) + 0.9, z); scene.add(flame); flames.push(flame);
    });
    const moteGeometry = new THREE.BufferGeometry();
    const motePositions = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) { motePositions[i * 3] = -83 + Math.random() * 164; motePositions[i * 3 + 1] = 1 + Math.random() * 6; motePositions[i * 3 + 2] = -48 + Math.random() * 95; }
    moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    const motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: 0xe3c890, size: 0.06, transparent: true, opacity: 0.55, depthWrite: false })); scene.add(motes);

    // First-person weapon
    const weapon = new THREE.Group(); weapon.position.set(0.38, -0.34, -0.66); camera.add(weapon);
    const weaponLight=new THREE.PointLight(0xa5b9ae,1.4,1.6,2);weaponLight.position.set(-.3,.1,-.25);camera.add(weaponLight);
    const gunDark = new THREE.MeshStandardMaterial({ color: 0x39443d, metalness: 0.35, roughness: 0.48 });
    const gunGrip = new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.8 });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, 0.62), gunDark); slide.position.z = -0.12;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.62, 8), gunDark); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, -0.4);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.19), gunGrip); grip.position.set(0, -0.22, 0.03); grip.rotation.x = -0.2;
    weapon.add(slide, barrel, grip);
    const gloveMaterial=new THREE.MeshStandardMaterial({color:0x62644b,roughness:.9});
    const hand=new THREE.Mesh(new THREE.BoxGeometry(.18,.16,.21),gloveMaterial);hand.position.set(.015,-.18,.055);weapon.add(hand);
    const sight=new THREE.Mesh(new THREE.BoxGeometry(.025,.025,.03),new THREE.MeshBasicMaterial({color:0xd2d9a2}));sight.position.set(0,.09,-.38);weapon.add(sight);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(.14,.19,.36),gunGrip); stock.position.set(0,-.06,.24); weapon.add(stock);
    const axeHandle = new THREE.Mesh(new THREE.CylinderGeometry(.035,.04,.85,6),gunGrip); axeHandle.rotation.x=.35; axeHandle.position.set(0,-.05,-.12); weapon.add(axeHandle);
    const axeHead = new THREE.Mesh(new THREE.BoxGeometry(.38,.22,.09),gunDark); axeHead.position.set(.09,.32,0); weapon.add(axeHead);
    const updateWeaponModel = () => {
      const kind=runtime.weapon; const melee=kind==='axe';
      slide.visible=barrel.visible=grip.visible=!melee; axeHandle.visible=axeHead.visible=melee; stock.visible=kind==='shotgun'||kind==='rifle';
      barrel.scale.y=kind==='shotgun'?1.8:kind==='rifle'?1.5:1; slide.scale.z=kind==='rifle'?1.5:1; barrel.position.z=kind==='pistol'?-.4:-.63;
    };
    stock.visible=false;axeHandle.visible=false;axeHead.visible=false;
    const muzzle = new THREE.PointLight(0xffd267, 0, 5, 2); muzzle.position.set(0, 0, -0.76); weapon.add(muzzle);
    const muzzleMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), new THREE.MeshBasicMaterial({ color: 0xffd267 })); muzzleMesh.position.copy(muzzle.position); muzzleMesh.visible = false; weapon.add(muzzleMesh);
    const flashlight = new THREE.SpotLight(0xe8ffe0, 0, 32, Math.PI / 5.8, 0.45, 1.3); flashlight.position.set(0, 0, 0); flashlight.target.position.set(0, 0, -8); camera.add(flashlight, flashlight.target);

    const npcAnchors: { mara: THREE.Group; noah: THREE.Group } = {
      mara: new THREE.Group(), noah: new THREE.Group(),
    };
    npcAnchors.mara.position.set(-53, terrainHeight(-53, -36), -36); npcAnchors.noah.position.set(17, terrainHeight(17, 15), 15); npcAnchors.noah.visible = false;
    scene.add(npcAnchors.mara, npcAnchors.noah);
    const npcMixers: THREE.AnimationMixer[] = [];
    let noahAnimation: Awaited<ReturnType<typeof loadCharacter>> | undefined;
    let noahMoving = false;
    let noahPath: Point[] = [], noahPathTime = 0;
    const makeNpc = (anchor: THREE.Group, skin: string, animation: 'idle' | 'run', accent: number) => {
      const fallback = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.8, 4, 7), new THREE.MeshStandardMaterial({ color: accent })); fallback.position.y = 0.9; anchor.add(fallback);
      loadCharacter(skin, animation).then((character) => {
        const { model, mixer } = character;
        if (disposed) return; fallback.visible = false;
        anchor.add(model); npcMixers.push(mixer);
        if (anchor === npcAnchors.noah) noahAnimation = character;
        const badge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), new THREE.MeshBasicMaterial({ color: accent })); badge.position.set(0, 1.45, -0.26); anchor.add(badge);
      }).catch(() => reportAssetError(skin));
    };
    makeNpc(npcAnchors.mara, 'survivorFemaleA', 'idle', 0xff695c); makeNpc(npcAnchors.noah, 'survivorMaleB', 'idle', 0x53c8ff);
    const cityNpcs = CITY_NPCS.map(npc => {
      const anchor = new THREE.Group(); anchor.position.set(npc.x,terrainHeight(npc.x,npc.z),npc.z); scene.add(anchor);
      makeNpc(anchor,npc.skin,'idle',npc.color); return { ...npc, anchor, cooldown: 0 };
    });
    const cityClues = DISCOVERIES.map(note => {
      const paper = new THREE.Mesh(new THREE.BoxGeometry(.45,.03,.6),new THREE.MeshStandardMaterial({color:0xe5ddba,emissive:0x6a6042,emissiveIntensity:.3}));
      paper.position.set(note.x,terrainHeight(note.x,note.z)+.8,note.z);scene.add(paper);place('box',note.x,note.z,.9);return paper;
    });
    const questProps = [
      {id:'fuse',x:181,z:-18,color:0xe2bb64}, {id:'generator',x:87,z:-33,color:0x8a9d78},
      {id:'shotgun',x:181,z:-74,color:0xc4ad76}, {id:'rifle',x:181,z:-136,color:0x9fb58c},
      {id:'keycard',x:184,z:-136,color:0x82cfda},
    ].map(p=>{const object=new THREE.Mesh(new THREE.BoxGeometry(p.id==='generator'?1.6:.7,p.id==='generator'?1.2:.25,.65),new THREE.MeshStandardMaterial({color:p.color,roughness:.7,metalness:.25}));object.position.set(p.x,terrainHeight(p.x,p.z)+.6,p.z);scene.add(object);return {...p,object};});
    paintedBoard('STROMNETZ OST / LENZ HÄLT DIE STELLUNG',87,-34,'#e5c183');

    const objectiveMarker = new THREE.Group(); scene.add(objectiveMarker);
    const markerBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.16, 5, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide })); markerBeam.position.y = 4;
    const markerRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.05, 6, 28), new THREE.MeshBasicMaterial({ color: 0xd9ff43 })); markerRing.rotation.x = Math.PI / 2; markerRing.position.y = 0.05;
    objectiveMarker.add(markerBeam, markerRing);
    const moveObjectiveMarker = (stage: number) => { const target = OBJECTIVES[stage].target; objectiveMarker.position.set(target.x, terrainHeight(target.x, target.z), target.z); };

    const fuelBaseY = terrainHeight(-19, -4); const fuelCell = new THREE.Group(); fuelCell.position.set(-19, fuelBaseY, -4); scene.add(fuelCell);
    const fuelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.42), new THREE.MeshStandardMaterial({ color: 0xd9ff43, emissive: 0x6c7d1e, emissiveIntensity: 1.2 })); fuelMesh.position.y = 0.55; fuelCell.add(fuelMesh);
    const serumBaseY = terrainHeight(48, 23); const serum = new THREE.Group(); serum.position.set(48, serumBaseY, 23); scene.add(serum);
    const serumMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.65, 10), new THREE.MeshStandardMaterial({ color: 0x64d9ff, emissive: 0x238fb1, emissiveIntensity: 1.8, transparent: true, opacity: 0.85 })); serumMesh.position.y = 0.7; serum.add(serumMesh);

    const pickups: { object: THREE.Group; kind: LootKind; count: number; taken: boolean; baseY: number }[] = [];
    const pickup = (kind: LootKind, x: number, z: number, count: number) => {
      const baseY = terrainHeight(x, z) + 0.28; const object = new THREE.Group(); object.position.set(x, baseY, z);
      const color = kind in ITEMS ? ITEMS[kind as ItemKind].color : '#e6b95b';
      const geometry = kind === 'battery' || kind === 'flare' ? new THREE.CylinderGeometry(0.12, 0.12, 0.55, 8) : new THREE.BoxGeometry(0.5, 0.28, 0.35);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 })); object.add(mesh);
      if (kind === 'medkit') { for (const [w, h] of [[0.28, 0.065], [0.065, 0.2]]) { const cross = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff })); cross.position.z = 0.185; object.add(cross); } }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 4, 20), new THREE.MeshBasicMaterial({ color })); ring.rotation.x = Math.PI / 2; ring.position.y = -0.18; object.add(ring);
      scene.add(object); pickups.push({ object, kind, count, taken: false, baseY });
    };
    WORLD_LOOT.forEach(({ kind, x, z, count }) => pickup(kind, x, z, count));

    const enemies: Enemy[] = [];
    const enemyHitboxes: THREE.Mesh[] = [];
    const keys = new Set<string>();
    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    let yaw = 0, pitch = 0, bob = 0, recoil = 0, muzzleTime = 0, locationTime = 0;
    let audio: AudioContext | null = null;
    const freshRuntime = () => ({ ...INITIAL_HUD, inventory: newInventory(), arsenal: freshArsenal(), evidence: [] as string[], visited: [] as string[], discovered: [] as number[], active: false, spawn: 12, hudTick: 0, invulnerable: 0, reloadLeft: 0, dialogueTime: 0, locationName: '', noticeTime: 0, elapsed: 0, ambientTime: 8, shotCooldown: 0, eventTime: 42, eventNumber: 0 });
    let runtime = freshRuntime();
    let journalOpen = false;

    const noises: Stimulus[] = [];
    let triggerHeld = false;
    const emitNoise = (position: Point, radius: number, kind: Stimulus['kind'], life = 1.5) => { noises.push({ x: position.x, z: position.z, radius, kind, life }); if (noises.length > 24) noises.shift(); };
    const hurtPlayer = (damage: number) => {
      if (runtime.invulnerable > 0) return;
      const absorbed = Math.min(runtime.protection,damage*.55); runtime.protection -= absorbed; runtime.infection = Math.min(100,runtime.infection+3);
      runtime.health = Math.max(0, runtime.health - damage + absorbed); runtime.invulnerable = .28; runtime.damageFlash = .5;
      tone(48, .2, 'sawtooth', .045);
      if (runtime.health <= 0) { runtime.active = false; snapshotHud(); document.exitPointerLock?.(); setDialogue(null); setScreen('dead'); }
    };
    const flares: { object: THREE.Group; life: number }[] = [];
    const notify = (text: string) => { setNotice(text); runtime.noticeTime = 3.5; };
    const visibleFrom = (a: THREE.Vector3, b: THREE.Vector3) => !segmentBlocked(a.x, a.z, b.x, b.z, obstacles);
    const snapshotHud = () => setHud({ ...runtime, inventory: { ...runtime.inventory }, discovered: [...runtime.discovered], health: Math.ceil(runtime.health), stamina: Math.round(runtime.stamina), timer: Math.ceil(runtime.timer), x: camera.position.x, z: camera.position.z });
    const openJournal = (note?: number) => {
      runtime.active = false; journalOpen = true; keys.clear(); triggerHeld = false; runtime.aiming = false; snapshotHud();
      if (note !== undefined) { setSelectedNote(note); setJournalTab('notes'); } else setJournalTab('map');
      setScreen('journal'); document.exitPointerLock?.();
    };
    const resumeGame = () => { journalOpen = false; runtime.active = true; triggerHeld=false;runtime.aiming=false; keys.clear(); setScreen('playing'); audio?.resume(); canvas.requestPointerLock?.()?.catch(() => undefined); };

    const tone = (frequency: number, duration: number, type: OscillatorType = 'square', volume = 0.035) => {
      if (!audio) return;
      const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = type; osc.frequency.setValueAtTime(frequency, audio.currentTime); osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.45), audio.currentTime + duration); gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration); osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
    };
    let noiseBuffer: AudioBuffer | undefined;
    const soundBurst = (duration:number,cutoff:number,volume:number,position?:THREE.Vector3) => {
      if(!audio)return;
      if(!noiseBuffer){noiseBuffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);}
      const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain(),pan=audio.createStereoPanner();source.buffer=noiseBuffer;filter.type='lowpass';filter.frequency.value=cutoff;
      const distance=position?horizontalDistance(position,camera.position):0;
      pan.pan.value=position?THREE.MathUtils.clamp(((position.x-camera.position.x)*Math.cos(yaw)-(position.z-camera.position.z)*Math.sin(yaw))/Math.max(4,distance),-1,1):0;
      gain.gain.setValueAtTime(volume/(1+distance*.12),audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
      source.connect(filter).connect(gain).connect(pan).connect(audio.destination);source.start(0,Math.random());source.stop(audio.currentTime+duration);
    };
    const say = (entry: readonly [string, string]) => { setDialogue({ speaker: entry[0], text: entry[1] }); runtime.dialogueTime = 6; tone(180, 0.08, 'sine', 0.015); };

    const spawnEnemy = (x?: number, z?: number, tougher = false, requestedKind?: ZombieKind) => {
      if (enemies.filter(e => e.alive).length >= 40) return;
      const angle = Math.random() * Math.PI * 2, distance = 30 + Math.random() * 16;
      const spawnX = THREE.MathUtils.clamp(x ?? camera.position.x + Math.cos(angle) * distance, WORLD.minX + 2, WORLD.maxX - 2);
      const spawnZ = THREE.MathUtils.clamp(z ?? camera.position.z + Math.sin(angle) * distance, WORLD.minZ + 2, WORLD.maxZ - 2);
      if (collides(spawnX, spawnZ) || (x === undefined && visibleFrom(camera.position, new THREE.Vector3(spawnX, 0, spawnZ)))) return;
      const roll = Math.random();
      const kind: ZombieKind = requestedKind ?? (tougher ? 'tank' : roll < .15 ? 'runner' : roll < .27 ? 'crawler' : roll < .4 ? 'infected' : 'walker');
      const spec = ZOMBIES[kind], scale = spec.scale;
      const group = new THREE.Group(); group.position.set(spawnX, terrainHeight(spawnX, spawnZ), spawnZ); scene.add(group);
      const visual = new THREE.Group(); group.add(visual);
      const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
      const hitbox = new THREE.Mesh(new THREE.CapsuleGeometry(.35 * scale, .65 * scale, 3, 7), hitMaterial);
      hitbox.position.set(0, kind === 'crawler' ? .36 : .87 * scale, kind === 'crawler' ? .5 : 0);
      if (kind === 'crawler') hitbox.rotation.x = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.SphereGeometry(.24 * scale, 8, 6), hitMaterial);
      head.position.set(0, kind === 'crawler' ? .48 : 1.58 * scale, kind === 'crawler' ? 1.1 : 0);
      group.add(hitbox, head); enemyHitboxes.push(hitbox, head);
      const phase = Math.random() * Math.PI * 2;
      const enemy: Enemy = { group, visual, head, hitbox, kind, brain: makeBrain(group.position, phase, kind !== 'crawler' && roll < .18), path: [], pathTime: phase % 1, lastPathTarget: {x:spawnX,z:spawnZ}, health: spec.health, alive: true, phase, deathTime: 0 };
      hitbox.userData.enemy = enemy; head.userData.enemy = enemy; head.userData.head = true; enemies.push(enemy);
      const born = generation;
      loadCharacter(kind === 'tank' || kind === 'infected' ? 'zombieC' : 'zombieA', 'idle').then(({ model, mixer, actions }) => {
        if (disposed || born !== generation || !enemy.alive) { model.traverse(o => { if(o instanceof THREE.Mesh) (o.material as THREE.Material).dispose(); }); return; }
        model.scale.multiplyScalar(scale); visual.add(model); enemy.mixer = mixer;
        enemy.animator = new ZombieAnimator(model, mixer, actions, kind, phase);
      }).catch(() => reportAssetError('Infizierten-Animation'));
    };
    const killEnemy = (enemy: Enemy, credit = true) => {
      if (!enemy.alive) return;
      enemy.alive = false; enemy.deathTime = 22; transition(enemy.brain, 'dead');
      for (const box of [enemy.hitbox, enemy.head]) { const index = enemyHitboxes.indexOf(box); if (index >= 0) enemyHitboxes.splice(index, 1); }
      if(credit)runtime.kills++; tone(75, .12, 'sawtooth', .018);
    };
    const spawnPack = (cx: number, cz: number, count: number) => { for (let i = 0; i < count; i++) spawnEnemy(cx + Math.cos(i * 2.1) * (5 + i % 3), cz + Math.sin(i * 2.1) * (5 + i % 3), i === count - 1 && count > 5); };
    const syncAmmo = () => { runtime.ammo = runtime.arsenal[runtime.weapon].ammo; runtime.reserve = runtime.arsenal[runtime.weapon].reserve; };
    const switchWeapon = () => {
      const owned = (Object.keys(WEAPONS) as WeaponKind[]).filter(k => runtime.arsenal[k].owned);
      runtime.weapon = owned[(owned.indexOf(runtime.weapon) + 1) % owned.length];
      runtime.reloading = false; runtime.reloadLeft = 0; runtime.shotCooldown = .3; weapon.rotation.set(0,0,0);
      syncAmmo(); updateWeaponModel(); notify(WEAPONS[runtime.weapon].name);
    };
    const reloadWeapon = () => {
      const spec = WEAPONS[runtime.weapon];
      if (!runtime.active || runtime.reloading || runtime.ammo >= spec.magazine || runtime.reserve <= 0 || runtime.weapon === 'axe') return;
      runtime.reloading = true; runtime.reloadLeft = spec.reload; tone(210, .08, 'square', .018);
    };
    const damageEnemy = (enemy: Enemy, damage: number, headshot = false, heavy = false, source: Point = camera.position) => {
      enemy.health -= damage; enemy.brain.lastKnown = {x:source.x,z:source.z}; enemy.brain.memory = 8;
      if(source===camera.position)runtime.hit = headshot ? .26 : .18;
      if (enemy.health <= 0) killEnemy(enemy,source===camera.position);
      else if (enemy.kind !== 'tank' && (heavy || headshot)) transition(enemy.brain, heavy ? 'fall' : 'hit', heavy ? .9 : .45);
      else if (enemy.kind !== 'tank' && enemy.brain.state !== 'hit') transition(enemy.brain, 'hit', .24);
      tone(headshot ? 850 : 560, .035, 'triangle', .025);
    };
    const shoot = () => {
      if (!runtime.active || runtime.reloading || runtime.shotCooldown > 0) return;
      const spec = WEAPONS[runtime.weapon], melee = runtime.weapon === 'axe';
      if (melee && runtime.stamina < 20) { notify('Zu erschöpft · Abstand gewinnen'); return; }
      if (!melee && runtime.ammo <= 0) { reloadWeapon(); return; }
      if (melee) runtime.stamina -= 20; else runtime.arsenal[runtime.weapon].ammo--;
      syncAmmo(); recoil = Math.min(.16, recoil + spec.recoil); runtime.shotCooldown = spec.interval;
      if (!melee) { muzzleTime = .055; muzzle.intensity = 55; muzzleMesh.visible = true; }
      tone(melee ? 180 : runtime.weapon === 'shotgun' ? 60 : 105, melee ? .14 : .09, 'sawtooth', .045);
      soundBurst(melee?.17:runtime.weapon==='shotgun'?.26:.12,melee?650:runtime.weapon==='rifle'?2600:1700,melee?.09:.2);
      emitNoise(camera.position, spec.noise, 'shot');
      scene.updateMatrixWorld(true);
      if (melee) {
        const direction = new THREE.Vector3(); camera.getWorldDirection(direction);
        direction.y=0;direction.normalize();
        const candidate = enemies.filter(e => e.alive && horizontalDistance(e.group.position,camera.position) < spec.range && visibleFrom(camera.position,e.group.position))
          .filter(e => new THREE.Vector3(e.group.position.x-camera.position.x,0,e.group.position.z-camera.position.z).normalize().dot(direction) > .72)
          .sort((a,b)=>horizontalDistance(a.group.position,camera.position)-horizontalDistance(b.group.position,camera.position))[0];
        if (candidate) damageEnemy(candidate,spec.damage,false,true);
      } else for (let pellet = 0; pellet < spec.pellets; pellet++) {
        const spread = spec.spread * (runtime.aiming ? .38 : 1);
        center.set((Math.random()-.5)*spread,(Math.random()-.5)*spread);
        raycaster.setFromCamera(center, camera); raycaster.far = spec.range;
        const hit = raycaster.intersectObjects(enemyHitboxes, false)[0];
        if (hit && visibleFrom(camera.position, hit.point)) {
          const enemy = hit.object.userData.enemy as Enemy, headshot = !!hit.object.userData.head;
          const falloff = THREE.MathUtils.clamp(1-hit.distance/spec.range*.45,.55,1);
          damageEnemy(enemy,spec.damage*(headshot?2.5:1)*falloff,headshot,runtime.weapon==='shotgun' && hit.distance<9 && pellet===0);
        }
      }
    };

    const nearEnemy = (position: THREE.Vector3, radius: number) => enemies.some((enemy) => enemy.alive && horizontalDistance(enemy.group.position, position) < radius);
    const advanceStory = () => {
      if (!runtime.active) return;
      const target = OBJECTIVES[runtime.stage].target;
      if (horizontalDistance(camera.position, target) > 3.2) return;
      if (runtime.stage === 2 && nearEnemy(target, 8)) { runtime.prompt = 'BEREICH SICHERN'; return; }
      if (runtime.stage === 4 && horizontalDistance(npcAnchors.noah.position,target)>12) { notify('Noah muss den Sender erreichen · sichere seinen Weg');return; }
      if (runtime.stage === 0) { runtime.stage = 1; say(STORY.mara); spawnPack(-24, -2, 5); }
      else if (runtime.stage === 1) { runtime.stage = 2; fuelCell.visible = false; npcAnchors.noah.visible = true; say(STORY.fuel); spawnPack(15, 17, 7); }
      else if (runtime.stage === 2) { runtime.stage = 3; say(STORY.noah); spawnPack(48, 20, 8); }
      else if (runtime.stage === 3) { runtime.stage = 4; serum.visible = false; say(STORY.serum); spawnPack(62, -20, 7); }
      else if (runtime.stage === 4) { runtime.stage = 5; runtime.timer = runtime.repaired ? 30 : 40; say(runtime.repaired ? ['MARA · FUNK', 'Das verstärkte Signal kommt durch! Der Konvoi braucht nur dreißig Sekunden. Bleibt am Sender!'] : STORY.tower); spawnPack(66, -25, 10); }
      moveObjectiveMarker(runtime.stage);
    };

    const nearestPickup = () => pickups.filter(p => !p.taken && horizontalDistance(p.object.position, camera.position) < 2.5 && visibleFrom(camera.position, p.object.position)).sort((a, b) => horizontalDistance(a.object.position, camera.position) - horizontalDistance(b.object.position, camera.position))[0];
    const nearestNote = () => NOTES.findIndex((note) => Math.hypot(note.x - camera.position.x, note.z - camera.position.z) < 2.7 && visibleFrom(camera.position, new THREE.Vector3(note.x, 0, note.z)));
    type Interaction = { x:number;z:number;label:string;run:()=>void };
    const nearestCityInteraction = (): Interaction | undefined => {
      const candidates: Interaction[] = [];
      for(const npc of cityNpcs)candidates.push({x:npc.x,z:npc.z,label:`MIT ${npc.name} SPRECHEN`,run:()=>{
        if(npc.id==='lenz') {
          if(runtime.powerQuest===0){runtime.powerQuest=1;say([npc.name,'Die Oststadt ist ohne Strom. In meiner Werkstatt liegt eine Sicherung. Bring sie und zwei Ersatzteile zum Generator hier. Dann öffne ich dir die Waffenkammer.']);}
          else if(runtime.powerQuest<3)say([npc.name,runtime.powerQuest===1?'Die Werkstatt steht südlich der Polizei, an der Ringstraße. Eine Sicherung und zwei Ersatzteile reichen.':'Die Sicherung passt. Setz sie am Generator neben mir ein. Zwei Ersatzteile für die Verkabelung fehlen noch.']);
          else say([npc.name,'Die Notbeleuchtung läuft. Der Polizeischlüssel gehört dir. In der Waffenkammer liegt eine Jagdflinte. Verlass dich nicht auf das Licht: Der Generator ist laut.']);
        } else if(npc.id==='weber') {
          if(runtime.benQuest>=3 && runtime.benQuest<4){runtime.benQuest=4;runtime.health=100;runtime.infection=0;runtime.inventory.medkit=Math.min(ITEMS.medkit.limit,runtime.inventory.medkit+2);say([npc.name,'Ben lebt? Dann war es nicht umsonst. Ich versorge deine Wunden. Diese Verbände sind für euch. Im Lazarus-Archiv liegt noch der Beweis gegen Falk.']);}
          else if(runtime.evidence.includes('archive'))say([npc.name,'Falk hat den Abbruchbefehl unterschrieben. Mit diesem Original kann er die Wahrheit nicht länger verschweigen. Bring es mit dem Gegenmittel zum Konvoi.']);
          else {runtime.benQuest=Math.max(runtime.benQuest,1);say([npc.name,runtime.evidence.includes('ambulance')?'Waldcamp am Birkenrain. Geh zu Ben. Sag ihm, dass die Kinder mit Lea im Konvoi sind.':runtime.evidence.includes('triage')?'Wagen 12 fuhr zum Bahnhof im Süden. Vielleicht findest du dort sein Funkprotokoll.':'Ich suche Ben Voss. Er lag hier in der Notaufnahme. Auf der Kiste im Behandlungsraum liegt die Patientenliste. Bitte finde heraus, wohin sie ihn gebracht haben.']);}
        } else {
          runtime.benQuest=Math.max(runtime.benQuest,3);say([npc.name,'Ich habe es geschafft. Die Kinder sind mit Lea im Konvoi. Mara muss es erfahren. Sag Dr. Weber, dass ich lebe. Nimm Leas Foto mit.']);
          if(!runtime.evidence.includes('ben'))runtime.evidence.push('ben');
        }
      }});
      for(const note of DISCOVERIES)candidates.push({x:note.x,z:note.z,label:`LESEN · ${note.title}`,run:()=>{
        if(!runtime.evidence.includes(note.id))runtime.evidence.push(note.id);
        if(note.id==='ambulance')runtime.benQuest=Math.max(runtime.benQuest,2);
        say([note.title,note.text]);notify('Im Journal gespeichert');
      }});
      for(const p of questProps){
        if(p.id==='fuse'&&runtime.powerQuest<2)candidates.push({x:p.x,z:p.z,label:'GENERATORSICHERUNG MITNEHMEN',run:()=>{runtime.powerQuest=2;p.object.visible=false;notify('Sicherung gesichert · Generator bei Lenz');}});
        if(p.id==='generator')candidates.push({x:p.x,z:p.z,label:runtime.powerQuest===3?'GENERATOR LÄUFT':'GENERATOR REPARIEREN · SICHERUNG + 2 TEILE',run:()=>{
          if(runtime.powerQuest===3){say(['LENZ','Das Licht bleibt an. Der Schlüssel passt zur Polizei.']);return;}
          if(runtime.powerQuest<2){notify('Sicherung aus der Werkstatt benötigt');return;}
          if(runtime.inventory.scrap<2){notify('Zwei Ersatzteile fehlen · Werkstatt durchsuchen');return;}
          runtime.inventory.scrap-=2;runtime.powerQuest=3;emitNoise(p,72,'alarm',12);spawnPack(96,-39,5);notify('Strom wiederhergestellt · Polizeischlüssel erhalten');say(['LENZ','Gut gemacht! Die Beleuchtung läuft. Nimm meinen Polizeischlüssel. Aber Vorsicht — sie haben uns gehört.']);
        }});
        if((p.id==='shotgun'||p.id==='rifle')&&!runtime.arsenal[p.id].owned)candidates.push({x:p.x,z:p.z,label:`${WEAPONS[p.id].name.toUpperCase()} MITNEHMEN`,run:()=>{const kind=p.id as 'shotgun'|'rifle';runtime.arsenal[kind].owned=true;runtime.arsenal[kind].ammo=WEAPONS[kind].magazine;runtime.arsenal[kind].reserve+=kind==='shotgun'?12:30;p.object.visible=false;notify(`${WEAPONS[kind].name} gefunden · [Q] wechseln`);}});
        if(p.id==='keycard'&&!runtime.keycard)candidates.push({x:p.x,z:p.z,label:'LAZARUS-KEYCARD MITNEHMEN',run:()=>{runtime.keycard=true;p.object.visible=false;notify('Lazarus-Keycard gesichert');}});
      }
      for(const door of city.doors)if(!door.open)candidates.push({x:door.obstacle.x,z:door.obstacle.z+1.6,label:door.id==='police'?'WAFFENKAMMER · POLIZEISCHLÜSSEL':'ARCHIV · STROM + KEYCARD',run:()=>{
        if(runtime.powerQuest<3){notify(door.id==='police'?'Lenz hat den Schlüssel · Generator reparieren':'Sicherheitstür ohne Strom · Lenz helfen');return;}
        if(door.id==='lab'&&!runtime.keycard){notify('Keycard fehlt · Kontrollpunkt Nord');return;}
        city.openDoor(door.id);tone(380,.25,'triangle');notify('Zugang entriegelt');
      }});
      if(runtime.stage>0)candidates.push({x:-53,z:-36,label:'MIT MARA SPRECHEN',run:()=>say(['MARA',runtime.evidence.includes('ben')||runtime.discovered.includes(4)?'Lea lebt? Und Ben hat es geschafft? Danke. Ich halte die Station, bis ihr den Sender erreicht.':'Ich halte das Feuer am Leben. Wenn du in die Oststadt gehst: Dr. Weber sucht dort nach Ben.'])});
      return candidates.filter(p=>Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<2.6&&visibleFrom(camera.position,new THREE.Vector3(p.x,0,p.z))).sort((a,b)=>Math.hypot(a.x-camera.position.x,a.z-camera.position.z)-Math.hypot(b.x-camera.position.x,b.z-camera.position.z))[0];
    };
    const interact = () => {
      if (!runtime.active) return;
      const item = nearestPickup();
      if (item) {
        const name = lootName(item.kind);
        if (item.kind === 'ammo' || item.kind === 'shells' || item.kind === 'rifleAmmo') { runtime.arsenal[item.kind==='ammo'?'pistol':item.kind==='shells'?'shotgun':'rifle'].reserve += item.count; syncAmmo(); }
        else { const room = ITEMS[item.kind].limit - runtime.inventory[item.kind]; if (room <= 0) { notify(`${name}: Inventar voll`); return; } const amount = Math.min(room, item.count); runtime.inventory[item.kind] += amount; item.count -= amount; if (item.count > 0) { notify(`${name} +${amount} · Rest bleibt liegen`); return; } }
        item.taken = true; item.object.visible = false; notify(`${name} eingesammelt`); tone(420, 0.12, 'sine'); return;
      }
      const note = nearestNote();
      if (note >= 0) { if (!runtime.discovered.includes(note)) runtime.discovered.push(note); openJournal(note); return; }
      const cityInteraction=nearestCityInteraction();if(cityInteraction){cityInteraction.run();snapshotHud();return;}
      advanceStory();
    };
    const consumeItem = (kind: ItemKind) => {
      if (!runtime.active) return;
      if (!runtime.inventory[kind]) { notify(`Keine ${ITEMS[kind].name} vorhanden`); return; }
      if (kind === 'medkit') { if (runtime.health >= 100) { notify('Gesundheit bereits voll'); return; } runtime.health = Math.min(100, runtime.health + 40); }
      if (kind === 'ration') { if (runtime.boosted > 0) { notify('Ration wirkt noch'); return; } runtime.stamina = 100; runtime.boosted = 20; }
      if (kind === 'water') { if(runtime.thirst>=95){notify('Kein Durst');return;} runtime.thirst=100; }
      if (kind === 'antibiotic') { if(runtime.infection<=0){notify('Keine Infektion');return;} runtime.infection=0; }
      if (kind === 'armor') { if(runtime.protection>=95){notify('Weste intakt');return;} runtime.protection=100; }
      if (kind === 'battery') { if (runtime.battery >= 99) { notify('Lampe bereits geladen'); return; } runtime.battery = 100; }
      if (kind === 'scrap') {
        if (runtime.repaired) { notify('Sender bereits verstärkt'); return; }
        if (horizontalDistance(camera.position, OBJECTIVES[4].target) > 6) { notify('Ersatzteile am Funkturm einsetzen'); return; }
        if (runtime.inventory.scrap < 3) { notify('Du brauchst 3 Ersatzteile'); return; }
        runtime.inventory.scrap -= 2; runtime.repaired = true; if (runtime.stage === 5) runtime.timer = Math.max(0, runtime.timer - 10);
      }
      if (kind === 'flare') {
        const object = new THREE.Group(); const direction = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)); object.position.copy(camera.position);
        for (let step = 0; step < 20; step++) { const next = object.position.clone().addScaledVector(direction, 0.5); if (collides(next.x, next.z)) break; object.position.copy(next); }
        object.position.y = terrainHeight(object.position.x, object.position.z) + 0.3;
        object.add(new THREE.PointLight(0xff582c, 35, 20, 2), new THREE.Mesh(new THREE.IcosahedronGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0xffb75c }))); scene.add(object); flares.push({ object, life: 12 });
      }
      runtime.inventory[kind]--; notify(kind === 'scrap' ? 'Sender verstärkt · Konvoi 10 s früher' : `${ITEMS[kind].name} verwendet`); tone(520, 0.12, 'sine'); snapshotHud();
    };

    const resetGame = () => {
      generation++; keys.clear(); city.reset(); noises.length = 0; triggerHeld = false; journalOpen = false; noahMoving = false;
      noahAnimation?.actions.run.stop(); noahAnimation?.actions.idle.reset().play();
      npcAnchors.noah.position.set(17, terrainHeight(17, 15), 15);
      noahPath=[];noahPathTime=0;
      flares.forEach(f => scene.remove(f.object)); flares.length = 0;
      flashlight.intensity = 0; recoil = 0; muzzleTime = 0; muzzle.intensity = 0; muzzleMesh.visible = false; weapon.rotation.set(0, 0, 0); setNotice('');
      enemies.forEach((enemy) => scene.remove(enemy.group)); enemies.length = 0; enemyHitboxes.length = 0;
      camera.position.set(START.x, terrainHeight(START.x, START.z) + 1.72, START.z); yaw = -1.45; pitch = -0.06; camera.rotation.set(pitch, yaw, 0);
      fuelCell.visible = true; serum.visible = true; npcAnchors.noah.visible = false;
      pickups.forEach((item, i) => { item.taken = false; item.object.visible = true; item.count = WORLD_LOOT[i].count; });
      runtime = freshRuntime(); runtime.active = true; updateWeaponModel();
      questProps.forEach(p=>p.object.visible=true);cityNpcs.forEach(n=>n.anchor.position.set(n.x,terrainHeight(n.x,n.z),n.z));
      moveObjectiveMarker(0); setHud(INITIAL_HUD); setScreen('playing'); setLocation(null); say(STORY.intro);
      audio ??= new AudioContext(); audio.resume(); canvas.requestPointerLock?.()?.catch(() => undefined);
    };
    apiRef.current = { start: resetGame, resume: resumeGame, journal: () => openJournal() };

    // Development-only QA surface: exercise actual interaction/combat functions
    // and inspect live renderer counters without shipping cheats in production.
    if (process.env.NODE_ENV !== 'production') Object.assign(window, { __nachtwache: {
      state: () => ({ ...runtime, inventory:{...runtime.inventory},arsenal:structuredClone(runtime.arsenal),position:camera.position.toArray(),noah:npcAnchors.noah.position.toArray(),enemies:enemies.map(e=>({kind:e.kind,state:e.brain.state,health:e.health,x:e.group.position.x,z:e.group.position.z,y:e.group.position.y,head:e.head.getWorldPosition(new THREE.Vector3()).toArray(),visible:visibleFrom(camera.position,e.group.position),alive:e.alive})),render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},doors:city.doors.map(d=>({id:d.id,open:d.open})) }),
      teleport: (x:number,z:number,direction=0) => {if(collides(x,z))throw Error('QA destination is blocked');camera.position.set(x,terrainHeight(x,z)+1.72,z);yaw=direction;pitch=0;camera.rotation.set(pitch,yaw,0);},
      interact, shoot, reload:reloadWeapon, switchWeapon, start:resetGame,
      spawn: (x:number,z:number,kind:ZombieKind) => { const before=enemies.length;spawnEnemy(x,z,false,kind);if(enemies.length>before)transition(enemies[enemies.length-1].brain,'idle',2); },
      aim: (x:number,y:number,z:number) => {const dx=x-camera.position.x,dz=z-camera.position.z; yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(y-camera.position.y,Math.hypot(dx,dz));camera.rotation.set(pitch,yaw,0);},
      pause:()=>{runtime.active=false;triggerHeld=false;}, resume:()=>{runtime.active=true;},
    }});

    const collides = (x: number, z: number) => obstacles.some((o) => Math.abs(x - o.x) < o.hx + 0.45 && Math.abs(z - o.z) < o.hz + 0.45);
    const moveActor = (position: THREE.Vector3, target: THREE.Vector3, speed: number, dt: number) => {
      const delta = new THREE.Vector3(target.x - position.x, 0, target.z - position.z);
      if (delta.length() < 0.15) return false;
      delta.normalize().multiplyScalar(speed * dt);
      const beforeX = position.x, beforeZ = position.z;
      if (!collides(position.x + delta.x, position.z + delta.z)) position.add(delta);
      else {
        if (!collides(position.x + delta.x, position.z)) position.x += delta.x;
        if (!collides(position.x, position.z + delta.z)) position.z += delta.z;
        // Walk along the nearest obstructing wall instead of walking through it.
        if (position.x === beforeX && position.z === beforeZ) {
          const blocker = obstacles.find(o => Math.abs(position.x + delta.x - o.x) < o.hx + 0.5 && Math.abs(position.z + delta.z - o.z) < o.hz + 0.5);
          if (blocker) {
            const sideX = Math.abs(position.x - blocker.x) / blocker.hx > Math.abs(position.z - blocker.z) / blocker.hz;
            const sx = sideX ? 0 : (target.x >= blocker.x ? 1 : -1) * speed * dt;
            const sz = sideX ? (target.z >= blocker.z ? 1 : -1) * speed * dt : 0;
            if (!collides(position.x + sx, position.z + sz)) { position.x += sx; position.z += sz; }
          }
        }
      }
      position.y = terrainHeight(position.x, position.z);
      return Math.hypot(position.x - beforeX, position.z - beforeZ) > 0.0001;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.code)) event.preventDefault();
      if (event.code === 'KeyJ' || event.code === 'KeyM' || event.code === 'Tab') { if (!event.repeat) { if (journalOpen) resumeGame(); else if (runtime.active) openJournal(); } return; }
      if (journalOpen && event.code === 'Escape') { resumeGame(); return; }
      if (!runtime.active) return;
      keys.add(event.code);
      if (event.code === 'KeyE' && !event.repeat) interact();
      if (event.code === 'KeyR' && !event.repeat) reloadWeapon();
      if (event.code === 'KeyQ' && !event.repeat) switchWeapon();
      if (event.code === 'KeyF' && !event.repeat) flashlight.intensity = flashlight.intensity > 0 ? 0 : runtime.battery > 0 ? 32 : 0;
      const slot = Number(event.code.replace('Digit', '')) - 1; const kind = (Object.keys(ITEMS) as ItemKind[])[slot]; if (kind && !event.repeat) consumeItem(kind);
      if (event.code === 'Escape' && !event.repeat && runtime.active) { runtime.active = false; keys.clear(); document.exitPointerLock?.(); setScreen('paused'); }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas || !runtime.active) return;
      yaw -= event.movementX * 0.0022; pitch -= event.movementY * 0.002; pitch = THREE.MathUtils.clamp(pitch, -1.25, 1.25);
    };
    const onMouseDown = (event: MouseEvent) => {
      if (!runtime.active) return;
      if (document.pointerLockElement !== canvas) { canvas.requestPointerLock?.(); return; }
      if (event.button === 0) { triggerHeld = true; shoot(); }
      if (event.button === 2) runtime.aiming = true;
    };
    const onMouseUp = (event: MouseEvent) => { if(event.button===0) triggerHeld=false; if(event.button===2)runtime.aiming=false; };
    const onContext = (event: Event) => event.preventDefault();
    addEventListener('mouseup', onMouseUp); canvas.addEventListener('contextmenu', onContext);
    const onPointerLock = () => {
      if (document.pointerLockElement !== canvas && runtime.active) { runtime.active = false; keys.clear(); setScreen('paused'); }
    };
    const onBlur = () => { keys.clear(); triggerHeld = false; runtime.aiming = false; if (runtime.active) { runtime.active = false; setScreen('paused'); document.exitPointerLock?.(); } };
    addEventListener('blur', onBlur);
    const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); };
    addEventListener('keydown', onKeyDown); addEventListener('keyup', onKeyUp); addEventListener('mousemove', onMouseMove); addEventListener('resize', resize); document.addEventListener('pointerlockchange', onPointerLock); canvas.addEventListener('mousedown', onMouseDown); resize();

    Promise.all([
      loadFbx(`${MODEL}characters/characterMedium.fbx`), loadFbx(`${MODEL}characters/animations/run.fbx`),
      loadFbx(`${MODEL}characters/animations/idle.fbx`), loadSkin('zombieA'),
      load('suburban-building-type-a'), load('industrial-building-a'),
    ]).then(() => { if (!disposed) setLoaded(true); }).catch(() => { reportAssetError('Startpaket'); if (!disposed) setLoaded(true); });

    const animate = () => {
      frame = requestAnimationFrame(animate); const dt = Math.min(clock.getDelta(), 0.045);
      if (runtime.active) npcMixers.forEach((mixer) => mixer.update(dt));
      const time = performance.now() * 0.001;
      mist.forEach((sprite, i) => { sprite.position.x += Math.sin(time * 0.12 + i) * dt * 0.22; });
      flames.forEach((flame, i) => { flame.scale.set(1 + Math.sin(time * 9 + i) * 0.13, 1 + Math.sin(time * 13 + i) * 0.22, 1); flame.rotation.y += dt; });
      flickerLights.forEach((light, i) => { light.intensity = light.userData.base * (1 + Math.sin(time * (i === 4 ? 16 : 8) + i) * 0.14); });
      motes.position.y = Math.sin(time * 0.25) * 0.5;
      redBeacon.intensity = 20 + Math.sin(performance.now() * 0.004) * 8;
      markerRing.rotation.z += dt * 0.8;
      if (markerBeam.material instanceof THREE.MeshBasicMaterial) markerBeam.material.opacity = 0.08 + Math.sin(performance.now() * 0.003) * 0.03;
      fuelCell.rotation.y += dt; fuelCell.position.y = fuelBaseY + Math.sin(performance.now() * 0.003) * 0.08;
      serum.rotation.y -= dt; serum.position.y = serumBaseY + Math.sin(performance.now() * 0.003 + 2) * 0.08;

      if (runtime.active) {
        runtime.elapsed += dt;
        city.update(camera.position.x,camera.position.z); sky.position.copy(camera.position);
        const nearestInterior=CITY_PLACES.find(p=>Math.abs(camera.position.x-p.x)<14&&Math.abs(camera.position.z-p.z)<14);
        interiorLight.visible=!!nearestInterior;
        if(nearestInterior){interiorLight.position.set(nearestInterior.x,terrainHeight(nearestInterior.x,nearestInterior.z)+2.9,nearestInterior.z);interiorLight.intensity=(runtime.powerQuest===3?36:12)*(1+Math.sin(runtime.elapsed*12)*.025);}
        streetLight.intensity=runtime.powerQuest===3&&camera.position.x>80?24:0;streetLight.position.set(camera.position.x+6,terrainHeight(camera.position.x,camera.position.z)+5,camera.position.z-5);
        moonLight.position.set(camera.position.x-35,45,camera.position.z+18);moonLight.target.position.set(camera.position.x,0,camera.position.z);moonLight.target.updateMatrixWorld();
        runtime.thirst=Math.max(0,runtime.thirst-dt*.07);
        if(runtime.infection>=75)runtime.health=Math.max(1,runtime.health-dt*.3);
        for(const p of CITY_PLACES)if(Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<28&&!runtime.visited.includes(p.id)){
          runtime.visited.push(p.id);notify(`${p.name} · Im Journal entdeckt`);
          if(p.kind!=='camp')spawnPack(p.x+11,p.z-9,p.kind==='military'?7:p.kind==='hospital'?5:3);
          if(p.kind==='lab')spawnEnemy(p.x+10,p.z-2,true);
        }
        runtime.eventTime-=dt;
        if(runtime.eventTime<=0&&runtime.stage>0){
          runtime.eventTime=55+Math.random()*30;runtime.eventNumber++;
          const nearby=CITY_PLACES.find(p=>Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<40);
          if(nearby && runtime.eventNumber%2){const event={x:nearby.x+12,z:nearby.z+10};emitNoise(event,65,'alarm',13);spawnPack(event.x,event.z,4);say(['FERNER FAHRZEUGALARM','Ein Alarm durchbricht die Stille. Zwischen den Häusern antworten Schreie.']);}
          else {const ex=camera.position.x+Math.cos(yaw)*29,ez=camera.position.z-Math.sin(yaw)*29;spawnPack(ex,ez,4);emitNoise({x:ex+8,z:ez+5},45,'shot',4);say(['NOTKANAL 07','Schüsse in der Ferne. Eine Gruppe Infizierter zieht durch die Straßen.']);}
        }
        for(const npc of cityNpcs){
          const d=horizontalDistance(camera.position,npc.anchor.position);npc.anchor.visible=d<100;if(d>75)continue;
          npc.cooldown-=dt;
          const threat=enemies.find(e=>e.alive&&horizontalDistance(e.group.position,npc.anchor.position)<12&&visibleFrom(npc.anchor.position,e.group.position));
          const target=threat?.group.position??camera.position;npc.anchor.rotation.y=Math.atan2(target.x-npc.anchor.position.x,target.z-npc.anchor.position.z);
          if(threat&&npc.cooldown<=0){damageEnemy(threat,npc.id==='lenz'?30:18,false,false,npc.anchor.position);emitNoise(npc.anchor.position,28,'shot');soundBurst(.09,1300,.15,npc.anchor.position);npc.cooldown=1.5;}
        }
        runtime.hit = Math.max(0,runtime.hit-dt); runtime.damageFlash = Math.max(0,runtime.damageFlash-dt);
        for (let n=noises.length-1;n>=0;n--) { noises[n].life-=dt; if(noises[n].life<=0)noises.splice(n,1); }
        if(triggerHeld && runtime.weapon==='rifle')shoot();
        camera.fov = THREE.MathUtils.damp(camera.fov,runtime.aiming?49:70,12,dt); camera.updateProjectionMatrix();
        weapon.position.x = THREE.MathUtils.damp(weapon.position.x,runtime.aiming?.04:.38,14,dt);
        weapon.position.z = -.66 + recoil * 1.5;
        if(!runtime.reloading)weapon.rotation.z = runtime.weapon==='axe' ? Math.sin(Math.max(0,runtime.shotCooldown)/.8*Math.PI)*-1.4 : 0; runtime.shotCooldown = Math.max(0, runtime.shotCooldown - dt); runtime.boosted = Math.max(0, runtime.boosted - dt);
        if (runtime.noticeTime > 0) { runtime.noticeTime -= dt; if (runtime.noticeTime <= 0) setNotice(''); }
        runtime.ambientTime -= dt;
        if (runtime.ambientTime <= 0) { tone(65 + Math.random() * 35, 1.4, 'sine', 0.009); soundBurst(1.8,350,.028);const close=enemies.find(e=>e.alive&&horizontalDistance(e.group.position,camera.position)<22);if(close){soundBurst(.65,180,.13,close.group.position);tone(54,.7,'sawtooth',.012);}runtime.ambientTime = 5 + Math.random() * 7; }
        if (flashlight.intensity > 0) { runtime.battery = Math.max(0, runtime.battery - dt * 0.65); if (runtime.battery <= 0) { flashlight.intensity = 0; notify('Batterie leer · [3] wechseln'); } }
        for (let i = flares.length - 1; i >= 0; i--) { flares[i].life -= dt; if (flares[i].life <= 0) { scene.remove(flares[i].object); flares.splice(i, 1); } }
        camera.rotation.set(pitch + recoil, yaw, 0);
        recoil = THREE.MathUtils.lerp(recoil, 0, 1 - Math.pow(0.002, dt));
        muzzleTime -= dt; if (muzzleTime <= 0) { muzzle.intensity = 0; muzzleMesh.visible = false; }
        const inputX = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
        const inputZ = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
        const moving = inputX !== 0 || inputZ !== 0;
        const sprint = !runtime.aiming && (keys.has('ShiftLeft') || keys.has('ShiftRight')) && runtime.stamina > 2 && inputZ < 0;
        if (moving) {
          const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
          const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
          const delta = forward.multiplyScalar(-inputZ).add(right.multiplyScalar(inputX)).normalize().multiplyScalar((sprint ? 7.6 : runtime.aiming ? 2.4 : 4.6) / WEAPONS[runtime.weapon].weight * dt);
          const nx = THREE.MathUtils.clamp(camera.position.x + delta.x, WORLD.minX, WORLD.maxX), nz = THREE.MathUtils.clamp(camera.position.z + delta.z, WORLD.minZ, WORLD.maxZ);
          if (!collides(nx, camera.position.z)) camera.position.x = nx;
          if (!collides(camera.position.x, nz)) camera.position.z = nz;
          bob += dt * (sprint ? 13 : 8); weapon.position.y = -0.34 - Math.abs(Math.sin(bob)) * 0.025;
          if (sprint && Math.floor(runtime.elapsed*3)!==Math.floor((runtime.elapsed-dt)*3)) emitNoise(camera.position,10,'step',.4);
        }
        camera.position.y = terrainHeight(camera.position.x, camera.position.z) + 1.72 + (moving ? Math.sin(bob) * (sprint ? 0.055 : 0.032) : 0);
        runtime.stamina = THREE.MathUtils.clamp(runtime.stamina + (sprint ? runtime.boosted > 0 ? -10 : -27 : runtime.thirst<15?5:18) * dt, 0, 100);
        runtime.invulnerable = Math.max(0, runtime.invulnerable - dt);
        if (runtime.reloading) {
          runtime.reloadLeft -= dt; weapon.rotation.z = Math.sin(Math.min(1, runtime.reloadLeft) * Math.PI) * 0.55;
          if (runtime.reloadLeft <= 0) { const amount = Math.min(WEAPONS[runtime.weapon].magazine - runtime.ammo, runtime.reserve); runtime.arsenal[runtime.weapon].ammo += amount; runtime.arsenal[runtime.weapon].reserve -= amount; syncAmmo(); runtime.reloading = false; weapon.rotation.z = 0; tone(320, 0.06, 'square', 0.015); }
        }

        if (runtime.stage > 0) runtime.spawn -= dt;
        if (runtime.spawn <= 0) { spawnEnemy(undefined, undefined, Math.random() < 0.12); runtime.spawn = runtime.stage === 5 ? 1.4 + Math.random() : 10 + Math.random() * 6; }
        if (runtime.stage >= 3) {
          const followX = camera.position.x + Math.sin(yaw) * 2.4, followZ = camera.position.z + Math.cos(yaw) * 2.4;
          const followTarget = new THREE.Vector3(followX, terrainHeight(followX, followZ), followZ);
          const followDelta = followTarget.clone().sub(npcAnchors.noah.position);
          noahPathTime-=dt;
          if(noahPathTime<=0){noahPath=findPath(npcAnchors.noah.position,followTarget,obstacles);if(!noahPath.length)noahPath=findPath(npcAnchors.noah.position,camera.position,obstacles);noahPathTime=.8;}
          while(noahPath.length&&Math.hypot(noahPath[0].x-npcAnchors.noah.position.x,noahPath[0].z-npcAnchors.noah.position.z)<.6)noahPath.shift();
          const waypoint=noahPath[0];const before=npcAnchors.noah.position.clone();
          const walking = followDelta.length() > 2.2 && !!waypoint && moveActor(npcAnchors.noah.position,new THREE.Vector3(waypoint.x,0,waypoint.z),5.2,dt);
          if(noahAnimation)noahAnimation.actions.run.timeScale=horizontalDistance(before,npcAnchors.noah.position)/Math.max(.001,dt)/3.2;
          if (walking) npcAnchors.noah.rotation.y = Math.atan2(followDelta.x, followDelta.z);
          if (walking !== noahMoving && noahAnimation) { noahAnimation.actions[walking ? 'idle' : 'run'].fadeOut(0.25); noahAnimation.actions[walking ? 'run' : 'idle'].reset().fadeIn(0.25).play(); noahMoving = walking; }
        }
        npcAnchors.mara.rotation.y = Math.atan2(camera.position.x - npcAnchors.mara.position.x, camera.position.z - npcAnchors.mara.position.z);
        for (let i=enemies.length-1;i>=0;i--) {
          const enemy=enemies[i], distance=horizontalDistance(camera.position,enemy.group.position);
          if (!enemy.alive) {
            enemy.deathTime -= dt; enemy.animator?.update(dt,enemy.brain,0,runtime.elapsed);
            if(enemy.deathTime<=0) { scene.remove(enemy.group); enemy.mixer?.stopAllAction(); enemy.group.traverse(o=>{if(o instanceof THREE.Mesh){if(o===enemy.hitbox||o===enemy.head)o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}}); enemies.splice(i,1); }
            continue;
          }
          enemy.group.visible = distance < 105;
          if(distance>110){enemy.alive=false;enemy.deathTime=0;for(const box of [enemy.hitbox,enemy.head]){const n=enemyHitboxes.indexOf(box);if(n>=0)enemyHitboxes.splice(n,1);}continue;}
          if(distance>95)continue;
          const lureNoises: Stimulus[] = flares.map(f=>({x:f.object.position.x,z:f.object.position.z,radius:23,life:f.life,kind:'flare'}));
          const result = think(enemy.brain,enemy.kind,enemy.group.position,camera.position,enemy.group.rotation.y,obstacles,[...noises,...lureNoises],dt);
          if(result.strike)hurtPlayer(ZOMBIES[enemy.kind].damage);
          const beforeX=enemy.group.position.x,beforeZ=enemy.group.position.z;
          enemy.pathTime-=dt;
          if(result.speed>0) {
            const target=enemy.brain.target;
            if(enemy.pathTime<=0 || Math.hypot(target.x-enemy.lastPathTarget.x,target.z-enemy.lastPathTarget.z)>4) {
              enemy.path=findPath(enemy.group.position,target,obstacles,.5);enemy.lastPathTarget={...target};enemy.pathTime=.85+enemy.phase*.12;
            }
            while(enemy.path.length && Math.hypot(enemy.path[0].x-beforeX,enemy.path[0].z-beforeZ)<.45)enemy.path.shift();
            const waypoint=enemy.path[0];
            if(waypoint) {
              const targetPoint=new THREE.Vector3(waypoint.x,0,waypoint.z);
              if(enemy.kind==='infected'&&enemy.brain.state==='chase'){targetPoint.x+=Math.sin(runtime.elapsed*4+enemy.phase)*.7;}
              moveActor(enemy.group.position,targetPoint,result.speed,dt);
              // Local separation is applied through the same collision controller.
              const separation=new THREE.Vector3();
              for(const other of enemies){if(other===enemy||!other.alive)continue;const dx=enemy.group.position.x-other.group.position.x,dz=enemy.group.position.z-other.group.position.z,d=Math.hypot(dx,dz);if(d<1.05&&d>.001){separation.x+=dx/d*(1.05-d);separation.z+=dz/d*(1.05-d);}}
              if(separation.lengthSq()>.001)moveActor(enemy.group.position,enemy.group.position.clone().add(separation),Math.min(1.5,separation.length()*2),dt);
            }
          }
          const traveled=Math.hypot(enemy.group.position.x-beforeX,enemy.group.position.z-beforeZ);
          if(traveled>.001 || ['notice','attack'].includes(enemy.brain.state)) {
            const aim=traveled>.001?Math.atan2(enemy.group.position.x-beforeX,enemy.group.position.z-beforeZ):Math.atan2(camera.position.x-beforeX,camera.position.z-beforeZ);
            const difference=Math.atan2(Math.sin(aim-enemy.group.rotation.y),Math.cos(aim-enemy.group.rotation.y));enemy.group.rotation.y+=difference*Math.min(1,dt*7);
          }
          const prone=enemy.kind==='crawler'||['feed','fall'].includes(enemy.brain.state)?1:enemy.brain.state==='rise'?Math.min(1,Math.max(0,enemy.brain.time/1.5)):0;
          const scale=ZOMBIES[enemy.kind].scale;
          enemy.hitbox.position.set(0,THREE.MathUtils.lerp(.87,.4,prone)*scale,.75*prone*scale);enemy.hitbox.rotation.x=prone*Math.PI/2;
          enemy.head.position.set(0,THREE.MathUtils.lerp(1.58,.62,prone)*scale,1.5*prone*scale);
          enemy.animator?.update(dt,enemy.brain,traveled,runtime.elapsed);
          if(!runtime.active)break;
        }

        pickups.forEach((item, i) => {
          if (item.taken) return; item.object.rotation.y += dt; item.object.position.y = item.baseY + Math.sin(performance.now() * 0.003 + i) * 0.08;
        });

        if (runtime.active && runtime.stage === 5 && horizontalDistance(camera.position, OBJECTIVES[5].target) < 18) { runtime.timer = Math.max(0, runtime.timer - dt); if (runtime.timer <= 0) { runtime.active = false; snapshotHud(); document.exitPointerLock?.(); setDialogue(null); setScreen('won'); } }
        const objective = OBJECTIVES[runtime.stage]; const distance = horizontalDistance(camera.position, objective.target); runtime.distance = Math.round(distance);
        runtime.prompt = distance < 3.2 ? (runtime.stage === 2 && nearEnemy(objective.target, 8) ? 'BEREICH SICHERN' : runtime.stage === 5 ? 'HALTE DIE STELLUNG' : '[E] INTERAGIEREN') : '';
        if(runtime.stage===4&&distance<3.2&&horizontalDistance(npcAnchors.noah.position,objective.target)>12)runtime.prompt='NOAH ZUM SENDER BEGLEITEN';
        if (runtime.stage === 5 && distance >= 18) runtime.prompt = 'ZUM SENDER ZURÜCKKEHREN · KONVOI WARTET';
        const nearItem = nearestPickup(), nearNote = nearestNote();
        if (nearNote >= 0) runtime.prompt = `[E] BRIEF LESEN · ${NOTES[nearNote].title}`;
        if (nearItem) runtime.prompt = `[E] ${lootName(nearItem.kind).toUpperCase()} ×${nearItem.count}`;
        const cityInteraction=nearestCityInteraction();if(cityInteraction&&!nearItem&&nearNote<0)runtime.prompt=`[E] ${cityInteraction.label}`;
        cityClues.forEach((paper,i)=>{(paper.material as THREE.MeshStandardMaterial).emissiveIntensity=runtime.evidence.includes(DISCOVERIES[i].id)?.05:.4;});
        noteObjects.forEach((paper, i) => { (paper.material as THREE.MeshStandardMaterial).emissiveIntensity = runtime.discovered.includes(i) ? 0.05 : 0.4 + Math.sin(time * 2) * 0.15; });

        const cityLocation=CITY_PLACES.find(p=>Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<27);
        const currentLocation = cityLocation ? {name:cityLocation.name,subtitle:cityLocation.story} : camera.position.x>85?{name:'TANNWALD · OSTSTADT',subtitle:'RINGSTRASSE · EVAKUIERUNGSSEKTOR'}:camera.position.x<-95?{name:'BIRKENRAIN',subtitle:'WALDWEG · AUSSENGEBIET'}:LOCATIONS.find((item) => item.test(camera.position.x, camera.position.z))!;
        if (currentLocation.name !== runtime.locationName) { runtime.locationName = currentLocation.name; setLocation({ name: currentLocation.name, subtitle: currentLocation.subtitle }); locationTime = 3.2; }
        if (locationTime > 0) { locationTime -= dt; if (locationTime <= 0) setLocation(null); }
        if (runtime.dialogueTime > 0) { runtime.dialogueTime -= dt; if (runtime.dialogueTime <= 0) setDialogue(null); }
        runtime.hudTick -= dt;
        if (runtime.hudTick <= 0) { snapshotHud(); runtime.hudTick = 0.12; }
      }
      renderer.info.reset(); composer.render();
    };
    animate();

    return () => {
      disposed = true; apiRef.current = null; cancelAnimationFrame(frame); document.exitPointerLock?.();
      if(process.env.NODE_ENV !== 'production')Reflect.deleteProperty(window,'__nachtwache');
      removeEventListener('blur', onBlur); removeEventListener('mouseup',onMouseUp); canvas.removeEventListener('contextmenu',onContext); audio?.close();
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

      {screen === 'playing' && <div className="hud">
        <div className="field-status"><span>TANNWALD · NACHT 01</span><b>{hud.battery < 20 ? 'LAMPE FAST LEER' : 'TASCHENLAMPE'} {Math.ceil(hud.battery)}%</b><span>[J / M] Karte & Fundstücke · {hud.visited.length}/{CITY_PLACES.length} Orte</span><span>WASSER {Math.ceil(hud.thirst)}% · SCHUTZ {Math.ceil(hud.protection)}</span>{hud.infection>0 && <span className={hud.infection>70?'infected':''}>INFEKTION {Math.ceil(hud.infection)}% · [7] behandeln</span>}</div>
        <header className="fps-mission">
          <div><small>{objective.place} · AUFTRAG {hud.stage + 1}/6</small><strong>{objective.title}</strong><span>{objective.detail}</span></div>
          <b>{hud.distance}<small>M</small></b>
        </header>
        <section className="vitals">
          <div className="health-number">{hud.health}</div><div><span>GESUNDHEIT</span><div className="bar"><i style={{ width: `${hud.health}%` }} /></div><span>AUSDAUER</span><div className="bar stamina"><i style={{ width: `${hud.stamina}%` }} /></div></div>
        </section>
        <section className="fps-ammo"><small>{hud.reloading ? 'NACHLADEN…' : `${WEAPONS[hud.weapon].name} · ${WEAPONS[hud.weapon].ammo}`}</small><div><b>{hud.weapon==='axe'?Math.floor(hud.stamina):String(hud.ammo).padStart(2, '0')}</b><span>/ {hud.weapon==='axe'?100:hud.reserve}</span></div><em>{hud.kills} INFIZIERTE</em></section>
        <div className={`fps-crosshair ${hud.hit > 0 ? 'confirmed-hit' : ''}`}><i /><i /><span /></div><div className="damage-feedback" style={{opacity:hud.damageFlash * 1.5}} /><div className="weapon-hint">[Q] Waffe wechseln · Rechte Maus: Zielen</div>
        <div className="quickbelt">{(Object.entries(ITEMS) as [ItemKind, typeof ITEMS[ItemKind]][]).map(([kind, item]) => <div key={kind} className={hud.inventory[kind] ? '' : 'empty'} style={{ '--item-color': item.color } as React.CSSProperties}><kbd>{item.key}</kbd><span>{item.name}</span><b>{hud.inventory[kind]}</b></div>)}</div>
        {hud.boosted > 0 && <div className="buff">GESTÄRKT · {Math.ceil(hud.boosted)} s</div>}
        {notice && <div className="loot-notice" role="status">{notice}</div>}
        {hud.prompt && <div className={hud.prompt === 'BEREICH SICHERN' ? 'fps-prompt danger-prompt' : 'fps-prompt'}>{hud.prompt}</div>}
        {hud.stage === 5 && <div className="defense-timer"><small>KONVOI ANKUNFT</small><b>00:{String(hud.timer).padStart(2, '0')}</b></div>}
      </div>}

      {screen === 'journal' && <section className="field-journal" role="dialog" aria-modal="true" aria-label="Feldjournal">
        <header><div><p className="eyebrow">ELIAS VOSS · FELDJOURNAL</p><h2>Spuren einer Nacht.</h2></div><button type="button" onClick={resume} autoFocus>Zurück ins Spiel <kbd>J</kbd></button></header>
        <nav aria-label="Journalansicht"><button type="button" aria-pressed={journalTab === 'map'} onClick={() => setJournalTab('map')}>Gebiete & Ausrüstung</button><button type="button" aria-pressed={journalTab === 'notes'} onClick={() => setJournalTab('notes')}>Fundstücke <span>{hud.discovered.length}/5</span></button><span>Spiel pausiert</span></nav>
        {journalTab === 'map' ? <div className="journal-layout">
          <div className="map-panel"><svg viewBox="-185 -190 435 360" role="img" aria-label="Tannwald: Altstadt, Oststadt, Waldcamp und entdeckte Orte">
            <defs><pattern id="map-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#8da78e" strokeWidth="0.15" opacity="0.2" /></pattern></defs>
            <rect x="-185" y="-190" width="435" height="360" fill="#101f1a" /><rect x="-185" y="-190" width="435" height="360" fill="url(#map-grid)" />
            {CITY_ROADS.map((r,i)=><rect key={i} x={r.x-r.w/2} y={r.z-r.h/2} width={r.w} height={r.h} fill="#30483b"/>)}
            {CITY_PLACES.map(p=><g key={p.id}><rect x={p.x-7} y={p.z-7} width="14" height="14" fill={hud.visited.includes(p.id)?'#a6bd86':'#3a5345'}/><text x={p.x} y={p.z+15} fontSize="4.5" textAnchor="middle" fill="#b9ceb8">{hud.visited.includes(p.id)?p.name.split(' · ')[0]:'?'}</text></g>)}
            <text x="125" y="-178" fontSize="8" fill="#9aad9b">OSTSTADT</text><text x="-165" y="40" fontSize="7" fill="#799478">BIRKENRAIN</text>
            <path d="M -60 -33 L -44 -7 L -22 -4 L 17 19 L 48 23 L 66 -25" fill="none" stroke="#789078" strokeWidth="1" strokeDasharray="2 2" />
            {REGIONS.map((region, i) => <g key={region.name}><circle cx={region.x} cy={region.z} r="5.5" fill={i === Math.min(hud.stage, 4) ? '#d9ff43' : '#31473b'} /><text x={region.x} y={region.z + 1.5} textAnchor="middle" fontSize="4" fill={i === Math.min(hud.stage, 4) ? '#142019' : '#eef1dd'}>{i + 1}</text><text x={region.x} y={region.z + 11} textAnchor="middle" fill="#b5c6ba" fontSize="3.3">{region.name.toUpperCase()}</text></g>)}
            <circle cx={hud.x} cy={hud.z} r="2.5" fill="#fff" stroke="#0d1813" strokeWidth="0.8" />
            <text x="-87" y="-54" fontSize="4" fill="#9cae9f">N ↑</text>
          </svg><p>● Weiß: dein Standort · Gelb: aktuelles Ziel · ? Noch nicht erkundet</p>
          <section className="quest-log"><h3>Offene Spuren</h3><article><b>Das Licht der Oststadt</b><p>{hud.powerQuest===0?'Lenz wartet am Übergang zur Oststadt, östlich des Funkturms.':hud.powerQuest===1?'Durchsuche die Werkstatt an der Ringstraße nach einer Sicherung.':hud.powerQuest===2?'Bring die Sicherung und zwei Ersatzteile zum Generator bei Lenz.':'✓ Strom wiederhergestellt. Der Polizeischlüssel öffnet die Waffenkammer.'}</p></article><article><b>Ein Name auf der Liste</b><p>{hud.benQuest===0?'In der Notaufnahme der Oststadt sucht Dr. Weber einen Vermissten.':hud.benQuest>=4?'✓ Ben lebt. Dr. Weber hat deine Wunden versorgt.':hud.benQuest===3?'Melde Dr. Weber im Krankenhaus, dass Ben im Waldcamp lebt.':hud.evidence.includes('ambulance')?'Folge dem Waldweg zum Camp am Birkenrain, südwestlich der Stadt.':hud.evidence.includes('triage')?'Suche das Funkprotokoll im Bahnhof im Süden.':'Suche die Patientenliste im Krankenhaus.'}</p></article><article><b>Was Falk verschwieg</b><p>{hud.evidence.includes('archive')?'✓ Original des Abbruchbefehls gesichert.':hud.keycard?'Keycard gefunden. Das Lazarus-Archiv braucht außerdem Strom.':'Am Kontrollpunkt Nord liegt der Zugang zum Lazarus-Archiv.'}</p></article></section>
          <div className="region-list">{CITY_PLACES.filter(p=>hud.visited.includes(p.id)).map(p=><div key={p.id}><b>{p.name}</b><p>{p.story}</p></div>)}</div>
          <div className="region-list">{REGIONS.map((region, i) => <div key={region.name}><b>0{i + 1} · {region.name}</b><span>{region.loot}</span><p>{region.detail}</p></div>)}</div></div>
          <aside className="inventory-panel"><h3>Waffen & Ausrüstung</h3><p className="ammo-stock">Reserve: 9 mm {hud.arsenal.pistol.reserve} · 12/70 {hud.arsenal.shotgun.reserve} · 5.56 mm {hud.arsenal.rifle.reserve}</p>{(Object.keys(WEAPONS) as WeaponKind[]).filter(k=>hud.arsenal[k].owned).map(k=><div key={k}><section><b>{hud.weapon===k?'● ':''}{WEAPONS[k].name}</b><p>{k==='axe'?'Nahkampf · 20 Ausdauer · 2,6 m':WEAPONS[k].ammo + ' · ' + hud.arsenal[k].ammo + ' / ' + hud.arsenal[k].reserve + ' Patronen'}</p></section></div>)}<p className="journal-tip">[Q] Waffe wechseln · [R] Nachladen · Rechte Maus: zielen. Nachladen wird beim Waffenwechsel abgebrochen.</p>{(Object.entries(ITEMS) as [ItemKind, typeof ITEMS[ItemKind]][]).map(([kind, item]) => <div key={kind}><kbd>{item.key}</kbd><section><b>{item.name} <em>×{hud.inventory[kind]}</em></b><p>{item.purpose}</p></section></div>)}<p className="journal-tip">Mit E sammeln und Briefe lesen. Gehen ist leise; Sprinten und Schüsse locken Infizierte an. Fackeln geben dir Zeit zum Durchbrechen.</p><p className="journal-tip">{hud.repaired ? '✓ Sender verstärkt.' : 'Am Funkturm: [5] mit drei Ersatzteilen.'}</p></aside>
        </div> : <div className="notes-layout"><aside>{NOTES.map((note, i) => <button type="button" key={note.title} disabled={!hud.discovered.includes(i)} aria-pressed={selectedNote === i} onClick={() => setSelectedNote(i)}><small>SEKTOR 0{i + 1}</small>{hud.discovered.includes(i) ? note.title : 'Noch nicht gefunden'}</button>)}</aside><article className="letter">{hud.discovered.includes(selectedNote) ? <><p className="eyebrow">{NOTES[selectedNote].author}</p><h3>{NOTES[selectedNote].title}</h3><p>{NOTES[selectedNote].text}</p><footer>Am Fundort: „{NOTES[selectedNote].graffiti.replaceAll(' / ', ' · ')}“</footer></> : <><h3>Jeder Ort hat eine Stimme.</h3><p>Suche nach hellen Briefen auf Kisten und bemalten Tafeln. Gesammelte Briefe kannst du hier jederzeit wieder lesen.</p></>}</article></div>}
        {journalTab==='notes'&&hud.evidence.length>0&&<div className="evidence-list"><h3>Spuren aus der Oststadt</h3>{DISCOVERIES.filter(n=>hud.evidence.includes(n.id)).map(n=><article key={n.id}><h4>{n.title}</h4><p>{n.text}</p></article>)}{hud.evidence.includes('ben')&&<article><h4>Leas Foto · Ben lebt</h4><p>Ben hat das Waldcamp erreicht. Lea und die Kinder sind mit dem Konvoi in Sicherheit.</p></article>}</div>}
      </section>}

      {location && screen === 'playing' && <section className="location-card"><small>GEBIET BETRETEN</small><h2>{location.name}</h2><p>{location.subtitle}</p></section>}
      {dialogue && screen === 'playing' && <section className="radio-message fps-dialogue"><div className="speaker-mark">{dialogue.speaker.charAt(0)}</div><div><small>{dialogue.speaker}</small><p>{dialogue.text}</p></div></section>}

      {screen === 'title' && <section className="title-card fps-title">
        <p className="eyebrow">OPEN WORLD SURVIVAL · TANNWALD · 03:17 UHR</p>
        <h1>NACHT<span>WACHE</span></h1>
        <p className="tagline">Eine Stadt voller Spuren. Verlassene Straßen, letzte Überlebende — und etwas, das dich gehört hat.</p>
        <button type="button" onClick={start} disabled={!loaded}>{loaded ? 'MISSION STARTEN' : 'TANNWALD WIRD GELADEN…'} <span>→</span></button>
        <div className="controls"><b>WASD</b> Bewegen <b>MAUS</b> Umschauen / Schießen <b>E</b> Interagieren <b>R</b> Nachladen <b>F</b> Licht <b>SHIFT</b> Sprint</div>
        <div className="controls"><b>1–8</b> Items benutzen <b>Q</b> Waffe wechseln <b>J / M</b> Karte, Inventar & Briefe</div>
        {assetErrors.length > 0 && <p role="status" className="asset-warning">{assetErrors.length} Assets fehlen. Ersatzdarstellungen sind aktiv.</p>}
        <p className="story-hook">Als Ranger Elias Voss durchquerst du die Rangerstation, das verlassene Dorf, den Friedhof, die Klinik und den Funkturm. Finde Mara und Noah, bevor Dr. Falks Experiment Tannwald verschlingt.</p>
        <div className="desktop-note">KLICKEN AKTIVIERT DIE MAUSSTEUERUNG · KOPFHÖRER EMPFOHLEN</div>
      </section>}
      {screen === 'paused' && <section className="overlay-card compact"><p className="eyebrow">MISSION PAUSIERT</p><h2>Bleib leise.</h2><p>1 Verband · 2 Ration · 3 Batterie · 4 Fackel · 5 Sender reparieren<br />6 Wasser · 7 Antibiotika · 8 Weste · Q Waffenwechsel<br />E sammeln / lesen · J Karte & Fundstücke · F Taschenlampe</p><button type="button" onClick={resume}>WEITERSPIELEN <span>→</span></button><button type="button" onClick={() => apiRef.current?.journal()}>FELDJOURNAL <span>→</span></button></section>}
      {screen === 'dead' && <section className="overlay-card"><p className="eyebrow danger">ELIAS · SIGNAL VERLOREN</p><h2>Tannwald behält dich.</h2><p>{hud.kills} Infizierte sind gefallen. Mara und Noah warten noch immer am Funkturm.</p><button type="button" onClick={start}>MISSION NEU STARTEN <span>→</span></button></section>}
      {screen === 'won' && <section className="overlay-card win"><p className="eyebrow">05:42 UHR · KONVOI EINGETROFFEN</p><h2>Der Morgen findet euch.</h2><p>Das Gegenmittel ist gesichert. Mara und Noah verlassen Tannwald. {(hud.discovered.includes(4)||hud.evidence.includes('ben')) ? 'Du zeigst Mara den Funkspruch: Lea lebt. Zum ersten Mal in dieser Nacht lächelt sie.' : 'Mara sucht in jedem Fenster des Konvois nach einer roten Jacke.'} {hud.evidence.includes('archive')?'Auch Falks unterschriebener Abbruchbefehl verlässt mit euch die Stadt.':''}</p><div className="result"><span>{hud.kills}<small>INFIZIERTE</small></span><span>{hud.health}<small>GESUNDHEIT</small></span><span>{hud.discovered.length}/5<small>FUNDSTÜCKE</small></span></div><button type="button" onClick={start}>NOCH EINMAL <span>↻</span></button></section>}
      <footer className="credit">3D-ASSETS & ANIMATIONEN: KENNEY · CC0 · DESKTOP-SPIEL</footer>
    </main>
  );
}
