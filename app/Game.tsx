'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ITEMS, LOOT, NOTES, REGIONS, newInventory, segmentBlocked, type ItemKind, type LootKind, lootName } from './world';
import { WORLD, ZOMBIES, WEAPONS, freshArsenal, makeBrain, think, transition, findPath, type ZombieKind, type Brain, type Point, type Stimulus, type WeaponKind } from './survival';
import { ZombieAnimator } from './zombieAnimation';
import { CITY_PLACES, CITY_ROADS, CITY_LOOT, CITY_NPCS, DISCOVERIES, buildCity } from './city';
import WorldMap from './WorldMap';
import { MARA_INTRO, subtitleLines, type Dialogue } from './dialogue';
import { assetPath } from './assetPath';
import { daylightAt, REFUGES, refugeAt, refugeWalls, footprintsOverlap } from './environment';
import { CAMPAIGN, missionIndex } from './campaign';
import { SAFEHOUSES, HOUSE_LOOT, newHouses, houseReady, houseProtected, houseContains, canSleep, nextHour } from './safehouses';
import { detailMaterial, surfaceMaterial, releaseSurfaceTextures } from './surfaces';
import { detailedAsset, foliageTime, createTreeDetailController } from './naturalAssets';
import { buildWorldDetail } from './worldDetail';
import { compileScene, makeLocalLightPool, renderPixelRatio, ResolutionBudget } from './renderBudget';
import { buildRegionWorld, regionalCollision } from './regionWorld';
import { REGION_LOOT, REGION_POIS, REGION_SIGNS, ROAD_LINES, BRIDGES, STRUCTURES, WORLD_ZONES, inLegacy, riskAt, zoneAt } from './regionPlan';
import { terrainHeight } from './regionTerrain';
import { buildSettlementDetail } from './settlementDetail';
const WORLD_LOOT: {kind:LootKind;x:number;z:number;count:number;y?:number}[] = [...LOOT,...CITY_LOOT,...HOUSE_LOOT,...REGION_LOOT];
const EXPLORABLE_IDS = [...CITY_PLACES,...REGION_POIS,...WORLD_ZONES].map(p=>p.id);

type Screen = 'title' | 'playing' | 'paused' | 'dead' | 'won' | 'journal' | 'shelter';
type Hud = {
  health: number; ammo: number; reserve: number; stamina: number; stage: number;
  kills: number; timer: number; prompt: string; reloading: boolean; distance: number;
  battery: number; inventory: ReturnType<typeof newInventory>; discovered: number[]; boosted: number; repaired: boolean; x: number; z: number;
  thirst: number; infection: number; protection: number; powerQuest: number; benQuest: number; evidence: string[]; visited: string[]; keycard: boolean; elapsed: number; hasMap: boolean;
  weapon: WeaponKind; arsenal: ReturnType<typeof freshArsenal>; hit: number; damageFlash: number; aiming: boolean;
  houses: ReturnType<typeof newHouses>; respawn: string | null; learned: string[];
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
const INITIAL_HUD: Hud = { health: 100, ammo: 12, reserve: 48, stamina: 100, stage: 0, kills: 0, timer: 40, prompt: '', reloading: false, distance: 8, battery: 100, inventory: newInventory(), discovered: [], boosted: 0, repaired: false, x: START.x, z: START.z, weapon: 'pistol', arsenal: freshArsenal(), hit: 0, damageFlash: 0, aiming: false, thirst: 100, infection: 0, protection: 0, powerQuest: 0, benQuest: 0, evidence: [], visited: [], keycard: false, elapsed: 0, hasMap: false, houses: newHouses(), respawn: null, learned: [] };

const OBJECTIVES = CAMPAIGN.map(m => ({ ...m, target: new THREE.Vector3(m.x, 0, m.z) }));
const DEFENSE = missionIndex('defend'), RESCUE = missionIndex('noah'), TOWER = missionIndex('tower');

const STORY = {
  fuel: ['ELIAS', 'Zelle gesichert. Auf dem Notkanal ist eine Stimme – sie kommt vom alten Friedhof.'],
  noah: ['NOAH', 'Dr. Falk hat das Virus freigesetzt. Ich komme mit dir. Zuerst brauchen wir einen sicheren Platz für die Nacht. Das Forsthaus am Dorfrand hat vier offene Fenster und zwei Türen. Sammle Bretter und Ersatzteile. Danach suchen wir Dr. Weber in der Oststadt.'],
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
  const apiRef = useRef<{ start: () => void; resume: () => void; journal: () => void; nextDialogue: () => void; respawn: () => void; shelter: (action: 'claim' | 'respawn' | 'wait' | 'sleep') => void } | null>(null);
  const [mapBuildings, setMapBuildings] = useState<{ x: number; z: number; hx: number; hz: number }[]>([]);
  const [screen, setScreen] = useState<Screen>('title');
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [loaded, setLoaded] = useState(false);
  const [assetErrors, setAssetErrors] = useState<string[]>([]);
  const [journalTab, setJournalTab] = useState<'map' | 'inventory' | 'notes'>('map');
  const [selectedNote, setSelectedNote] = useState(0);
  const [notice, setNotice] = useState('');
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [location, setLocation] = useState<{ name: string; subtitle: string } | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let frame = 0;
    let generation = 0;
    const reportAssetError = (name: string) => { if (!disposed) setAssetErrors(old => old.includes(name) ? old : [...old, name]); console.warn('Asset konnte nicht geladen werden:', name); };

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.info.autoReset = false;
    const resolutionBudget = new ResolutionBudget();
    renderer.setPixelRatio(renderPixelRatio(canvas.clientWidth, canvas.clientHeight, devicePixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const reflectionGenerator = new THREE.PMREMGenerator(renderer), reflectionRoom = new RoomEnvironment();
    let reflections = reflectionGenerator.fromScene(reflectionRoom,.04);
    scene.environment=reflections.texture;scene.environmentIntensity=.35;
    reflectionRoom.dispose();reflectionGenerator.dispose();
    scene.background = new THREE.Color(0x91bbda);
    scene.fog = new THREE.FogExp2(0x91bbda, 0.0025);
    const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 650);
    camera.rotation.order = 'YXZ';
    camera.position.set(START.x, terrainHeight(START.x, START.z) + 1.72, START.z);
    scene.add(camera);

    const skyLight = new THREE.HemisphereLight(0xcce6ff, 0x827762, 1.9);
    scene.add(skyLight);
    const sunLight = new THREE.DirectionalLight(0xfff2da, 3.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    Object.assign(sunLight.shadow.camera, { left: -44, right: 44, top: 44, bottom: -44, near: 1, far: 180 });
    sunLight.shadow.bias = -.00025;
    sunLight.shadow.normalBias = .025;
    scene.add(sunLight, sunLight.target);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff2cf, toneMapped: false }));
    scene.add(sun);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), new THREE.MeshBasicMaterial({ color: 0xd8e4dc }));
    moon.position.set(-55, 52, -80);
    scene.add(moon);

    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { low: { value: new THREE.Color() }, high: { value: new THREE.Color() },cloudTime:{value:0} },
      vertexShader: 'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `varying vec3 vP; uniform vec3 low, high; uniform float cloudTime;
        float skyHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float skyNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(skyHash(i),skyHash(i+vec2(1,0)),f.x),mix(skyHash(i+vec2(0,1)),skyHash(i+vec2(1,1)),f.x),f.y);}
        void main(){vec3 direction=normalize(vP);float h=clamp(direction.y,0.,1.);vec3 color=mix(low,high,smoothstep(0.,.85,h));
          vec2 p=direction.xz/max(direction.y+.18,.08)*2.5+vec2(cloudTime*.004,0.);
          float cloud=skyNoise(p)*.55+skyNoise(p*2.1)*.28+skyNoise(p*4.3)*.12+skyNoise(p*8.7)*.05;
          float cover=smoothstep(.48,.72,cloud)*smoothstep(.05,.28,h)*.72;
          color=mix(color,mix(low,vec3(.86,.88,.87),.65),cover);gl_FragColor=vec4(color,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(640, 28, 16),
      skyMaterial,
    );
    scene.add(sky);
    const starPositions: number[] = [];
    for (let i = 0; i < 380; i += 1) {
      const angle = Math.random() * Math.PI * 2, elevation = 0.1 + Math.random() * 1.25, radius = 115;
      starPositions.push(Math.cos(angle) * Math.cos(elevation) * radius, Math.sin(elevation) * radius, Math.sin(angle) * Math.cos(elevation) * radius);
    }
    const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xc7d9ed, size: 0.16, transparent: true, opacity: 0, sizeAttenuation: true, depthWrite: false }));
    scene.add(stars);

    const regionWorld = buildRegionWorld(scene);
    const regionCollision = regionalCollision();

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
    composer.addPass(new OutputPass());
    const antialiasPass=new ShaderPass(FXAAShader);composer.addPass(antialiasPass);

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
    const characterGeometry = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
    const characterSize = new WeakMap<THREE.Object3D,{scale:number;offset:number}>();
    const loadSkin = (skin: string) => {
      if (!textureCache.has(skin)) textureCache.set(skin, new Promise((resolve, reject) => textureLoader.load(`${MODEL}characters/skins/${skin}.png`, (texture) => { texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = THREE.NearestFilter;texture.anisotropy=4; resolve(texture); }, undefined, reject)));
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
          const original=child.geometry;
          if(!characterGeometry.has(original)){const geometry=original.clone();geometry.deleteAttribute('normal');const smooth=mergeVertices(geometry);geometry.dispose();smooth.computeVertexNormals();characterGeometry.set(original,smooth);}
          child.geometry=characterGeometry.get(original)!;
          child.material = detailMaterial(new THREE.MeshStandardMaterial({ map: texture, roughness: 0.82, metalness: 0.02, alphaTest: 0.02 }),'fabric',.28);
        }
      });
      const normalization=characterSize.get(base);
      if(normalization){model.scale.setScalar(normalization.scale);model.position.y=normalization.offset;}
      else{
        model.updateMatrixWorld(true);
        const sourceBounds = new THREE.Box3().setFromObject(model), sourceSize = sourceBounds.getSize(new THREE.Vector3());
        const factor = 1.82 / Math.max(sourceSize.y, 0.001); model.scale.setScalar(factor); model.updateMatrixWorld(true);
        const scaledBounds = new THREE.Box3().setFromObject(model); model.position.y -= scaledBounds.min.y;
        characterSize.set(base,{scale:factor,offset:model.position.y});
      }
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
    const prep = (object: THREE.Object3D,name:string) => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true; child.receiveShadow = true;
          const surface=name.includes('tree')||name.startsWith('pine')?'bark':name.includes('box')||name==='coffin'||name==='chest'?'wood':name.includes('tent')?'fabric':name.includes('building')?'plaster':name.includes('grave')||name.includes('rock')||name.includes('crypt')||name.includes('wall')?'stone':'metal';
          const improve=(mat:THREE.Material)=>mat instanceof THREE.MeshStandardMaterial?detailMaterial(mat.clone(),surface,.65):mat.clone();
          child.material=Array.isArray(child.material)?child.material.map(improve):improve(child.material);
        }
      });
      return object;
    };
    const placements: { anchor: THREE.Group; required: boolean; ready: Promise<void> }[] = [];
    let worldDetail:ReturnType<typeof buildWorldDetail>|undefined;
    let settlementDetail:Awaited<ReturnType<typeof buildSettlementDetail>>;
    let treeDetail:ReturnType<typeof createTreeDetailController>|undefined;
    const place = (name: string, x: number, z: number, scale = 1, rotation = 0, y = 0, required = false) => {
      const anchor = new THREE.Group();
      anchor.position.set(x, terrainHeight(x, z) + y, z); anchor.rotation.y = rotation;
      scene.add(anchor);
      const natural=detailedAsset(name,Math.abs(Math.round(x*397+z*103))+1);
      const source=natural?Promise.resolve({scene:natural}):load(name);
      const ready = source.then((asset) => {
        if (disposed) return;
        const model = natural??prep(cloneSkeleton(asset.scene),name); model.updateMatrixWorld(true);
        const initialBounds = new THREE.Box3().setFromObject(model), size = initialBounds.getSize(new THREE.Vector3());
        const desiredHeight = modelBaseHeight(name) * scale;
        model.scale.setScalar(desiredHeight / Math.max(size.y, 0.001)); model.updateMatrixWorld(true);
        const finalBounds = new THREE.Box3().setFromObject(model); model.position.y -= finalBounds.min.y;
        anchor.add(model);
      }).catch(() => reportAssetError(name));
      placements.push({ anchor, required, ready });
      return anchor;
    };

    const obstacles: { x: number; z: number; hx: number; hz: number }[] = [];
    const mapFootprints: { x: number; z: number; hx: number; hz: number }[] = [];
    mapFootprints.push(...STRUCTURES.map(({x,z,hx,hz})=>({x,z,hx,hz})));
    const building = (name: string, x: number, z: number, scale: number, rotation: number, hx: number, hz: number) => {
      const anchor = place(name, x, z, scale, rotation, 0, true);
      const obstacle = { x, z, hx: (rotation % Math.PI === 0 ? hx : hz), hz: (rotation % Math.PI === 0 ? hz : hx) };
      obstacles.push(obstacle);
      mapFootprints.push(obstacle);
      load(name).then(() => {
        if (disposed) return;
        anchor.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(anchor);
        if (!bounds.isEmpty()) { const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3()); obstacle.x = center.x; obstacle.z = center.z; obstacle.hx = size.x / 2; obstacle.hz = size.z / 2; }
      }).catch(() => undefined);
    };
    const roadMaterial = surfaceMaterial('asphalt',0xb2b3af,{roughness:.9});
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
    building('suburban-building-type-h', -72, -26, 1.15, Math.PI / 2, 3.8, 3.2);
    place('tent', -60, -40, 1.45, 0.5); place('campfire-pit', -54, -35, 1.2);
    place('chest', -61, -34, 1.1, 0.4); place('resource-planks', -68, -31, 1.3, 0.2);
    for (let i = 0; i < 8; i += 1) place(i % 2 ? 'pine' : 'pine-crooked', -78 + i * 4.8, -49 - (i % 3) * 2, 1.05 + (i % 2) * 0.15, i);

    // Village homes flank a clear street and open courtyards.
    const villageBuildings = [
      ['suburban-building-type-c', -37, -17, 1.55, 0], ['suburban-building-type-f', -25, -18, 1.7, 0],
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
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < 4; col += 1) {
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
    building('industrial-building-j', 71, 5, 1.7, 0, 4.4, 3.8);
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

    // Trees and occasional roadside props leave space between landmarks.
    for (let i = 0; i < 60; i += 1) {
      const x = -88 + (i * 31 % 176); const z = -59 + (i * 47 % 118);
      if (Math.hypot(x + 60, z + 33) < 20 || Math.abs(z + 7) < 8 || (x > -45 && x < 78 && z > -22 && z < 38)) continue;
      place(i % 3 ? 'suburban-tree-large' : 'pine-crooked', x, z, i % 3 ? 1.75 + (i % 4) * 0.12 : 1.25, i * 1.7);
      if (i % 4 === 0) place(`rock-${(['a', 'b', 'c'] as const)[i % 3]}`, x + 2.2, z - 1.2, 1 + (i % 2) * 0.4, i);
    }
    for (let i = 0; i < 30; i += 1) {
      const x = -82 + (i * 23 % 164), z = -52 + (i * 37 % 104);
      if (Math.abs(z + 7) > 4) place(i % 3 ? 'grass-large' : 'grass', x, z, 1.1 + (i % 4) * 0.18, i * 0.7);
    }

    const warmLights: [number, number, number, number][] = [[-54,-35,0xff8a42,22],[-28,-6,0xf3b15b,12],[14,18,0xff7038,14],[21,18,0xff7038,14],[48,20,0x6fc7ff,18],[66,-25,0xd9ff43,20]];
    const flickerLights: THREE.PointLight[] = [];
    warmLights.forEach(([x,z,color,intensity]) => { const light = new THREE.PointLight(color, intensity * 1.15, 18, 2); light.position.set(x, terrainHeight(x, z) + 3, z); light.userData.base = intensity; scene.add(light); flickerLights.push(light); });

    // Diegetic signage: readable paint, abandoned belongings and paper at each story stop.
    const regionalSigns: {group:THREE.Group;x:number;z:number}[]=[];
    const paintedBoard = (text: string, x: number, z: number, color = '#e2d7b4', graffiti = false) => {
      const group=new THREE.Group();scene.add(group);
      if(!inLegacy(x,z))regionalSigns.push({group,x,z});
      const surface = document.createElement('canvas'); surface.width = 1024; surface.height = 384;
      const ctx = surface.getContext('2d')!;
      ctx.fillStyle = graffiti ? '#29332f' : '#142521'; ctx.fillRect(0, 0, 1024, 384);
      ctx.strokeStyle = '#697364'; ctx.lineWidth = 8; ctx.strokeRect(16, 16, 992, 352);
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = graffiti ? 'bold italic 66px monospace' : 'bold 62px Arial';
      text.split(' / ').forEach((line, i, lines) => ctx.fillText(line, 512, 192 + (i - (lines.length - 1) / 2) * 92, 930));
      const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.4, 0.12), new THREE.MeshStandardMaterial({ map: texture, roughness: 1, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.22 }));
      panel.position.set(x, terrainHeight(x, z) + 1.8, z); group.add(panel);
      for (const offset of [-1.5, 1.5]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), gunPostMaterial); post.position.set(x + offset, terrainHeight(x, z) + 0.75, z); group.add(post); }
      return panel;
    };
    const gunPostMaterial = new THREE.MeshStandardMaterial({ color: 0x504b3d, roughness: 1 });
    REGIONS.forEach((region, i) => paintedBoard(`${region.name.toUpperCase()} / SEKTOR 0${i + 1}`, region.x - 2, region.z - 8, '#d9ff83'));
    const city = buildCity(scene, terrainHeight, obstacles, paintedBoard);
    for(const p of REGION_SIGNS)paintedBoard(`${p.name} / GEFAHR ${p.risk+1} · VORRÄTE IM HOF`,p.x,p.z,p.risk>=2?'#edba83':'#d5dfb2');
    const interiorLight = new THREE.PointLight(0xb1c8ad,18,24,2); scene.add(interiorLight);
    const rearInteriorLight = new THREE.PointLight(0xffddb0,0,15,2); scene.add(rearInteriorLight);
    // Lamps stay attached to their poles rather than following the player.
    const streetLights: THREE.PointLight[] = [];
    for (const x of [92,151,212]) for (const z of [-104,-46,4,54,104]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,5,20),surfaceMaterial('metal',0x727d78,{metalness:.6}));
      pole.position.set(x+5.5,terrainHeight(x+5.5,z)+2.5,z); scene.add(pole);
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,1.1,16),pole.material);arm.rotation.z=Math.PI/2;arm.position.set(pole.position.x-.5,pole.position.y+2.3,z);scene.add(arm);
      const head=new THREE.Mesh(new RoundedBoxGeometry(.65,.13,.3,3,.045),pole.material);head.position.set(pole.position.x-1,pole.position.y+2.27,z);scene.add(head);
      const lamp = new THREE.PointLight(0xffdc9d,0,22,2); lamp.position.set(pole.position.x,pole.position.y+2.3,z); scene.add(lamp); streetLights.push(lamp);
    }
    const refugeLights: THREE.PointLight[] = [];
    const wirePixels=new Uint8Array(64*64*4);
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){const at=(y*64+x)*4,line=(x+y)%32<2||((x-y)%32+32)%32<2;wirePixels[at]=wirePixels[at+1]=wirePixels[at+2]=160;wirePixels[at+3]=line?255:0;}
    const wireTexture=new THREE.DataTexture(wirePixels,64,64);wireTexture.wrapS=wireTexture.wrapT=THREE.RepeatWrapping;wireTexture.magFilter=THREE.LinearFilter;wireTexture.needsUpdate=true;
    const wireMaterial=new THREE.MeshStandardMaterial({color:0xaab1ad,map:wireTexture,alphaTest:.35,side:THREE.DoubleSide,roughness:.58,metalness:.5});
    const fencePostMaterial=surfaceMaterial('metal',0x9baba3,{metalness:.65});
    for (const refuge of REFUGES) {
      const group = new THREE.Group(); scene.add(group);
      const fence = (x:number,z:number,w:number,d:number) => {
        const geometry=new THREE.BoxGeometry(w,1.7,d),uv=geometry.getAttribute('uv');
        for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Math.max(w,d)/.5,uv.getY(i)*1.7/.5);
        const mesh = new THREE.Mesh(geometry,wireMaterial);
        mesh.position.set(x,terrainHeight(x,z)+.85,z); mesh.castShadow=true; mesh.receiveShadow=true; group.add(mesh);
        obstacles.push({x,z,hx:w/2,hz:d/2});
        const length=Math.max(w,d),vertical=d>w;
        const postGeometry=new THREE.CylinderGeometry(.045,.055,1.9,16),railGeometry=new THREE.CylinderGeometry(.028,.028,length,12);
        const posts=new THREE.InstancedMesh(postGeometry,fencePostMaterial,Math.ceil(length/2.5)+1),transform=new THREE.Object3D();
        for(let i=0;i<posts.count;i++){const t=-length/2+i*length/(posts.count-1);transform.position.set(x+(vertical?0:t),terrainHeight(x+(vertical?0:t),z+(vertical?t:0))+.95,z+(vertical?t:0));transform.updateMatrix();posts.setMatrixAt(i,transform.matrix);}
        posts.castShadow=posts.receiveShadow=true;group.add(posts);
        for(const y of [.16,1.68]){const rail=new THREE.Mesh(railGeometry,fencePostMaterial);rail.position.set(x,terrainHeight(x,z)+y,z);rail.rotation[vertical?'x':'z']=Math.PI/2;rail.castShadow=true;group.add(rail);}
      };
      // A four-metre guarded entrance remains walkable for the player and escort.
      for (const wall of refugeWalls(refuge)) fence(wall.x,wall.z,wall.hx*2,wall.hz*2);
      paintedBoard(`${refuge.name.toUpperCase()} / GESICHERTER UNTERSCHLUPF`,refuge.x+4,refuge.z+refuge.hz+1,'#cde4c1');
      const light = new THREE.PointLight(0xffd8a1,0,22,2); light.position.set(refuge.x,terrainHeight(refuge.x,refuge.z+refuge.hz)+3.2,refuge.z+refuge.hz-2); scene.add(light); refugeLights.push(light);
    }
    const localLightSources=[redBeacon,...flickerLights,...streetLights,...refugeLights];
    localLightSources.forEach(light=>scene.remove(light));
    const localLightPool=makeLocalLightPool(scene);
    // Forest perimeter and an old road lead to the rural shelters.
    for(let i=0;i<42;i++){const x=-168+(i*19%65),z=8+(i*37%143);if(CITY_PLACES.some(p=>Math.hypot(p.x-x,p.z-z)<18)||Math.abs(x+113)<6)continue;place(i%2?'pine':'suburban-tree-large',x,z,1.35+(i%3)*.25,i);}
    for(const z of [-98,-42,8,58,108]) { paintedBoard('← ALTSTADT / ZENTRUM ↑',91,z,'#c8d7bc'); }
    paintedBoard('BIRKENRAIN ← / WALDCAMP 90 M',-81,31,'#ccd6b7');
    const noteObjects = NOTES.map((note) => {
      paintedBoard(note.graffiti, note.x, note.z - 3, '#ebc5a1', true);
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
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 24), new THREE.MeshBasicMaterial({ color: 0xffa24a, transparent: true, opacity: 0.85 }));
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
    const gunDark = surfaceMaterial('metal',0x535b5c,{metalness:.75,roughness:.43});
    const gunGrip = surfaceMaterial('fabric',0x3b3630,{roughness:.8});
    const slide = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.16, 0.62,3,.018), gunDark); slide.position.z = -0.12;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.62, 24), gunDark); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, -0.4);
    const grip = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.4, 0.19,3,.026), gunGrip); grip.position.set(0, -0.22, 0.03); grip.rotation.x = -0.2;
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
    const muzzle = new THREE.PointLight(0xffd267, 0, 5, 2); muzzle.position.set(.3, -.3, -1.1); camera.add(muzzle);
    const muzzleMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), new THREE.MeshBasicMaterial({ color: 0xffd267 })); muzzleMesh.position.set(0,0,-.76); muzzleMesh.visible = false; weapon.add(muzzleMesh);
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
      paper.position.set(note.x,terrainHeight(note.x,note.z)+(note.y??.8),note.z);scene.add(paper);if(note.y===undefined)place('box',note.x,note.z,.9);return paper;
    });
    const questProps = [
      {id:'fuse',x:181,z:-18,color:0xe2bb64}, {id:'generator',x:120,z:90,color:0x8a9d78},
      {id:'shotgun',x:181,z:-74,color:0xc4ad76}, {id:'rifle',x:181,z:-136,color:0x9fb58c},
      {id:'keycard',x:184,z:-136,color:0x82cfda},
    ].map(p=>{const object=new THREE.Mesh(new THREE.BoxGeometry(p.id==='generator'?1.6:.7,p.id==='generator'?1.2:.25,.65),new THREE.MeshStandardMaterial({color:p.color,roughness:.7,metalness:.25}));object.position.set(p.x,terrainHeight(p.x,p.z)+.6,p.z);scene.add(object);return {...p,object};});
    paintedBoard('STROMNETZ OST / LENZ · SCHULHOF',125,90,'#e5c183');
    const trainingTarget = new THREE.Mesh(new THREE.BoxGeometry(1.15,1.8,.25), new THREE.MeshStandardMaterial({color:0x9b5146,roughness:.8}));
    trainingTarget.position.set(-49,terrainHeight(-49,-34)+1.2,-34);scene.add(trainingTarget);
    const bullseye=new THREE.Mesh(new THREE.TorusGeometry(.33,.09,8,20),new THREE.MeshBasicMaterial({color:0xe9c997}));
    bullseye.position.z=.14;trainingTarget.add(bullseye);
    paintedBoard('ÜBUNG / RECHTS ZIELEN · R LADEN · Q AXT',-49,-32,'#e5c183');

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
    const pickup = (kind: LootKind, x: number, z: number, count: number, y = .28) => {
      const baseY = terrainHeight(x, z) + y; const object = new THREE.Group(); object.position.set(x, baseY, z);
      const color = kind in ITEMS ? ITEMS[kind as ItemKind].color : '#e6b95b';
      const geometry = kind === 'planks' ? new RoundedBoxGeometry(1.5,.22,.5,2,.015) : kind === 'battery' || kind === 'flare' ? new THREE.CylinderGeometry(0.12, 0.12, 0.55, 24) : new RoundedBoxGeometry(0.5, 0.28, 0.35,3,.025);
      const mesh = new THREE.Mesh(geometry,surfaceMaterial(kind==='planks'?'wood':kind==='medkit'||kind==='ration'||kind==='armor'?'fabric':'metal',color,{emissive:color,emissiveIntensity:.14})); object.add(mesh);
      if (kind === 'medkit') { for (const [w, h] of [[0.28, 0.065], [0.065, 0.2]]) { const cross = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff })); cross.position.z = 0.185; object.add(cross); } }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 4, 20), new THREE.MeshBasicMaterial({ color })); ring.rotation.x = Math.PI / 2; ring.position.y = -0.18; object.add(ring);
      scene.add(object); pickups.push({ object, kind, count, taken: false, baseY });
    };
    WORLD_LOOT.forEach(({ kind, x, z, count, y }) => pickup(kind, x, z, count, y));

    const enemies: Enemy[] = [];
    const releaseEnemy=(enemy:Enemy)=>{
      enemy.mixer?.stopAllAction();if(enemy.mixer)enemy.mixer.uncacheRoot(enemy.mixer.getRoot());
      const skeletons=new Set<THREE.Skeleton>();
      enemy.group.traverse(object=>{if(object instanceof THREE.SkinnedMesh)skeletons.add(object.skeleton);if(object instanceof THREE.Mesh){if(object===enemy.hitbox||object===enemy.head)object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose());}});
      skeletons.forEach(skeleton=>skeleton.dispose());
      scene.remove(enemy.group);
    };
    const enemyHitboxes: THREE.Mesh[] = [];
    const keys = new Set<string>();
    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    let yaw = 0, pitch = 0, bob = 0, recoil = 0, muzzleTime = 0, locationTime = 0;
    let audio: AudioContext | null = null;
    const freshRuntime = () => ({ ...INITIAL_HUD, houses:newHouses(),learned:[] as string[],inventory: newInventory(), arsenal: freshArsenal(), evidence: [] as string[], visited: [] as string[], discovered: [] as number[], active: false, spawn: 12, hudTick: 0, invulnerable: 0, reloadLeft: 0, locationName: '', noticeTime: 0, elapsed: 0, ambientTime: 8, shotCooldown: 0, eventTime: 42, eventNumber: 0 });
    let runtime = freshRuntime();
    let journalOpen = false;
    let conversation: (Dialogue & { onComplete?: () => void }) | null = null;
    let shelterId: string | null = null;
    const protectedHouseAt = (x:number,z:number,margin=0) => SAFEHOUSES.find(h => houseProtected(runtime.houses[h.id]) && houseContains(h,x,z,margin));
    const protectedAt = (x:number,z:number,margin=0) => refugeAt(x,z,margin) || protectedHouseAt(x,z,margin);
    const syncCampaign = () => {
      const completed = (id:string) => {
        if(id==='house')return runtime.houses.lodge.claimed;
        if(id==='lenz')return runtime.powerQuest>=1;
        if(id==='fuse')return runtime.powerQuest>=2 && (runtime.inventory.scrap>=2||runtime.powerQuest===3);
        if(id==='power')return runtime.powerQuest===3;
        if(id==='shotgun')return runtime.arsenal.shotgun.owned;
        if(id==='archive')return runtime.evidence.includes('archive');
        if(id==='repair')return runtime.repaired;
        return runtime.learned.includes(id);
      };
      const before=runtime.stage;
      while(runtime.stage<DEFENSE && completed(OBJECTIVES[runtime.stage].id))runtime.stage++;
      if(before!==runtime.stage){moveObjectiveMarker(runtime.stage);notify(`Neuer Auftrag · ${OBJECTIVES[runtime.stage].title}`);}
    };
    const learn = (id:string) => { if(!runtime.learned.includes(id))runtime.learned.push(id);syncCampaign(); };

    const noises: Stimulus[] = [];
    let triggerHeld = false;
    const emitNoise = (position: Point, radius: number, kind: Stimulus['kind'], life = 1.5) => { noises.push({ x: position.x, z: position.z, radius, kind, life }); if (noises.length > 24) noises.shift(); };
    const hurtPlayer = (damage: number) => {
      if (runtime.invulnerable > 0) return;
      const absorbed = Math.min(runtime.protection,damage*.55); runtime.protection -= absorbed; runtime.infection = Math.min(100,runtime.infection+3);
      runtime.health = Math.max(0, runtime.health - damage + absorbed); runtime.invulnerable = .28; runtime.damageFlash = .5;
      tone(48, .2, 'sawtooth', .045);
      if (runtime.health <= 0) { runtime.active = false; snapshotHud(); document.exitPointerLock?.(); setDialogue(null); conversation = null; setScreen('dead'); }
    };
    const flares: { object: THREE.Group; life: number }[] = [];
    const releaseFlare=(object:THREE.Group)=>{
      object.traverse(child=>{if(child instanceof THREE.Mesh){child.geometry.dispose();const materials=Array.isArray(child.material)?child.material:[child.material];materials.forEach(material=>material.dispose());}});scene.remove(object);
    };
    const notify = (text: string) => { setNotice(text); runtime.noticeTime = 3.5; };
    const actorObstacles = (a:Point,b:Point,margin=18,cover=false) => {
      const x=(a.x+b.x)/2,z=(a.z+b.z)/2,hx=Math.abs(a.x-b.x)/2+margin,hz=Math.abs(a.z-b.z)/2+margin;
      return [...obstacles.filter(o=>Math.abs(o.x-x)<o.hx+hx&&Math.abs(o.z-z)<o.hz+hz),...regionCollision.near(a,b,margin,cover)];
    };
    const pathBetween = (a:Point,b:Point,radius=.48) => findPath(a,b,actorObstacles(a,b),radius);
    const visibleFrom = (a: THREE.Vector3, b: THREE.Vector3) => !segmentBlocked(a.x, a.z, b.x, b.z, actorObstacles(a,b,0,true));
    const snapshotHud = () => setHud({ ...runtime, houses:structuredClone(runtime.houses),learned:[...runtime.learned],inventory: { ...runtime.inventory }, discovered: [...runtime.discovered], health: Math.ceil(runtime.health), stamina: Math.round(runtime.stamina), timer: Math.ceil(runtime.timer), x: camera.position.x, z: camera.position.z });
    const openJournal = (note?: number) => {
      if (conversation) return;
      if(runtime.hasMap)learn('map');
      setMapBuildings(mapFootprints.map(building => ({ ...building })));
      runtime.active = false; journalOpen = true; keys.clear(); triggerHeld = false; runtime.aiming = false; snapshotHud();
      if (note !== undefined) { setSelectedNote(note); setJournalTab('notes'); } else setJournalTab(runtime.hasMap ? 'map' : 'inventory');
      setScreen('journal'); document.exitPointerLock?.();
    };
    const resumeGame = () => { journalOpen = false; shelterId=null;setSelectedHouse(null);runtime.active = true; triggerHeld=false;runtime.aiming=false; keys.clear(); setScreen('playing'); audio?.resume(); canvas.requestPointerLock?.()?.catch(() => undefined); };

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
    const say = (entry: readonly [string, string | readonly string[]], onComplete?: () => void) => {
      conversation = { speaker: entry[0], lines: subtitleLines(entry[1]), index: 0, onComplete };
      keys.clear(); triggerHeld = false; runtime.aiming = false; setLocation(null);
      const speaker = entry[0] === 'MARA' ? npcAnchors.mara : entry[0] === 'NOAH' ? npcAnchors.noah : cityNpcs.find(npc => npc.name === entry[0])?.anchor;
      if (speaker) {
        const dx = speaker.position.x - camera.position.x, dz = speaker.position.z - camera.position.z;
        yaw = Math.atan2(-dx, -dz);
        pitch = Math.atan2(speaker.position.y + 1.5 - camera.position.y, Math.hypot(dx, dz));
        camera.rotation.set(pitch, yaw, 0);
        speaker.rotation.y = Math.atan2(camera.position.x - speaker.position.x, camera.position.z - speaker.position.z);
      }
      setDialogue({ speaker: conversation.speaker, lines: conversation.lines, index: 0 });
      tone(180, 0.08, 'sine', 0.015);
    };
    const nextDialogue = () => {
      if (!conversation || !runtime.active || journalOpen) return;
      if (conversation.index + 1 < conversation.lines.length) {
        conversation.index++;
        setDialogue({ speaker: conversation.speaker, lines: conversation.lines, index: conversation.index });
      } else {
        const onComplete = conversation.onComplete;
        conversation = null; setDialogue(null); keys.clear(); triggerHeld = false;
        onComplete?.(); snapshotHud();
      }
    };

    const spawnEnemy = (x?: number, z?: number, tougher = false, requestedKind?: ZombieKind) => {
      const risk=riskAt(camera.position.x,camera.position.z);
      const cap=x!==undefined||runtime.stage===DEFENSE?40:[12,22,32,40][risk];
      if (enemies.filter(e => e.alive).length >= cap) return;
      const angle = Math.random() * Math.PI * 2, distance = 30 + Math.random() * 16;
      const spawnX = THREE.MathUtils.clamp(x ?? camera.position.x + Math.cos(angle) * distance, WORLD.minX + 2, WORLD.maxX - 2);
      const spawnZ = THREE.MathUtils.clamp(z ?? camera.position.z + Math.sin(angle) * distance, WORLD.minZ + 2, WORLD.maxZ - 2);
      if (collides(spawnX, spawnZ) || protectedAt(spawnX,spawnZ,2) || (x === undefined && visibleFrom(camera.position, new THREE.Vector3(spawnX, 0, spawnZ)))) return;
      const roll = Math.random();
      const kind: ZombieKind = requestedKind ?? (tougher || risk===3&&roll>.7 ? 'tank' : roll < (risk>=2?.23:.12) ? 'runner' : roll < .27 ? 'crawler' : roll < .4 ? 'infected' : 'walker');
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
      if (!runtime.active || conversation) return;
      const owned = (Object.keys(WEAPONS) as WeaponKind[]).filter(k => runtime.arsenal[k].owned);
      runtime.weapon = owned[(owned.indexOf(runtime.weapon) + 1) % owned.length];
      runtime.reloading = false; runtime.reloadLeft = 0; runtime.shotCooldown = .3; weapon.rotation.set(0,0,0);
      syncAmmo(); updateWeaponModel(); notify(WEAPONS[runtime.weapon].name);
    };
    const reloadWeapon = () => {
      const spec = WEAPONS[runtime.weapon];
      if (!runtime.active || conversation || runtime.reloading || runtime.ammo >= spec.magazine || runtime.reserve <= 0 || runtime.weapon === 'axe') return;
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
      if (!runtime.active || conversation || runtime.reloading || runtime.shotCooldown > 0) return;
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
        const targetDirection=new THREE.Vector3(trainingTarget.position.x-camera.position.x,0,trainingTarget.position.z-camera.position.z);
        if(targetDirection.length()<spec.range&&targetDirection.normalize().dot(direction)>.72&&visibleFrom(camera.position,trainingTarget.position)){
          runtime.hit=.22;learn('axe');tone(350,.08,'triangle');
        }
        const candidate = enemies.filter(e => e.alive && horizontalDistance(e.group.position,camera.position) < spec.range && visibleFrom(camera.position,e.group.position))
          .filter(e => new THREE.Vector3(e.group.position.x-camera.position.x,0,e.group.position.z-camera.position.z).normalize().dot(direction) > .72)
          .sort((a,b)=>horizontalDistance(a.group.position,camera.position)-horizontalDistance(b.group.position,camera.position))[0];
        if (candidate) damageEnemy(candidate,spec.damage,false,true);
      } else for (let pellet = 0; pellet < spec.pellets; pellet++) {
        const spread = spec.spread * (runtime.aiming ? .38 : 1);
        center.set((Math.random()-.5)*spread,(Math.random()-.5)*spread);
        raycaster.setFromCamera(center, camera); raycaster.far = spec.range;
        const practiceHit=raycaster.intersectObject(trainingTarget,false)[0];
        const hit = raycaster.intersectObjects(enemyHitboxes, false)[0];
        if(practiceHit&&(!hit||practiceHit.distance<hit.distance)&&visibleFrom(camera.position,practiceHit.point)){
          runtime.hit=.22;if(runtime.aiming)learn('aim');continue;
        }
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
      const {target,id} = OBJECTIVES[runtime.stage];
      if (horizontalDistance(camera.position, target) > 3.2) return;
      if (id === 'noah' && nearEnemy(target, 8)) { notify('Sichere zuerst den Bereich um Noah'); return; }
      if (id === 'tower' && horizontalDistance(npcAnchors.noah.position,target)>12) { notify('Noah muss den Sender erreichen · sichere seinen Weg');return; }
      if (id === 'intro') {
        say(['MARA', MARA_INTRO], () => {
          runtime.hasMap = true; learn('intro');
          notify('Karte erhalten · [M] Tannwald & Umgebung');
          spawnPack(-24, -2, 5);
        });
      }
      else if (id === 'fuel') { fuelCell.visible = false; npcAnchors.noah.visible = true; learn('fuel');say(STORY.fuel); spawnPack(15, 17, 7); }
      else if (id === 'noah') { learn('noah');say(STORY.noah); }
      else if (id === 'serum') { serum.visible = false;learn('serum');say(STORY.serum);spawnPack(62, -20, 7); }
      else if (id === 'tower') { runtime.timer = runtime.repaired ? 30 : 40;learn('tower');say(runtime.repaired ? ['MARA · FUNK', 'Das verstärkte Signal kommt durch! Der Konvoi braucht nur dreißig Sekunden. Bleibt am Sender!'] : STORY.tower); spawnPack(66, -25, 10); }
      else notify(OBJECTIVES[runtime.stage].detail);
    };

    const nearestPickup = () => pickups.filter(p => !p.taken && horizontalDistance(p.object.position, camera.position) < 2.5 && visibleFrom(camera.position, p.object.position)).sort((a, b) => horizontalDistance(a.object.position, camera.position) - horizontalDistance(b.object.position, camera.position))[0];
    const nearestNote = () => NOTES.findIndex((note) => Math.hypot(note.x - camera.position.x, note.z - camera.position.z) < 2.7 && visibleFrom(camera.position, new THREE.Vector3(note.x, 0, note.z)));
    const houseHasEnemies = (id:string) => {
      const h=SAFEHOUSES.find(h=>h.id===id)!;
      return enemies.some(e=>e.alive&&houseContains(h,e.group.position.x,e.group.position.z,.3));
    };
    const openShelter = (id:string) => {
      shelterId=id;setSelectedHouse(id);runtime.active=false;keys.clear();triggerHeld=false;runtime.aiming=false;snapshotHud();setScreen('shelter');document.exitPointerLock?.();
    };
    const shelterAction = (action:'claim'|'respawn'|'wait'|'sleep') => {
      const h=SAFEHOUSES.find(h=>h.id===shelterId);if(!h||horizontalDistance(camera.position,new THREE.Vector3(h.x,0,h.z+1))>3.5)return;
      const state=runtime.houses[h.id];
      if(!houseReady(state)){notify('Vier Fenster, beide Türen und das Bett müssen gesichert sein.');snapshotHud();return;}
      if(houseHasEnemies(h.id)){notify('Im Haus sind noch Infizierte · zuerst räumen.');return;}
      if(action==='claim'){
        state.claimed=true;runtime.respawn=h.id;syncCampaign();notify(`${h.name} gesichert · Respawnpunkt aktiviert`);
      }else if(!state.claimed){notify('Aktiviere zuerst den Unterschlupf.');return;}
      else if(action==='respawn'){runtime.respawn=h.id;notify(`${h.name} ist dein Respawnpunkt`);}
      else if(action==='wait'){
        if(canSleep(runtime.elapsed)){notify('Es ist bereits Nacht · du kannst schlafen.');return;}
        runtime.elapsed=nextHour(runtime.elapsed,19);notify('19:00 Uhr · die Nacht beginnt. F schaltet deine Lampe ein.');
      }else if(action==='sleep'){
        if(!canSleep(runtime.elapsed)){notify('Schlafen ist von 19 bis 06 Uhr möglich.');return;}
        runtime.elapsed=nextHour(runtime.elapsed,6);runtime.health=Math.min(100,runtime.health+35);runtime.stamina=100;runtime.thirst=Math.max(35,runtime.thirst-20);
        runtime.boosted=0;runtime.damageFlash=0;noises.length=0;
        flares.forEach(f=>releaseFlare(f.object));flares.length=0;
        if(h.id==='lodge'&&runtime.respawn==='lodge')learn('sleep');
        notify('06:00 Uhr · ausgeruht. Vor dem Aufbruch trinken und Türen öffnen.');
      }
      snapshotHud();
    };
    type Interaction = { x:number;z:number;label:string;run:()=>void; touch?:boolean };
    const nearestCityInteraction = (): Interaction | undefined => {
      const candidates: Interaction[] = [];
      for(const f of city.fortifications){
        const h=runtime.houses[f.house];
        if(f.kind==='window'&&h.windows[f.index])continue;
        const label=f.kind==='window'?'FENSTER VERNAGELN · 2 BRETTER':f.kind==='door'?(h.reinforced[f.index]?(h.closed[f.index]?'TÜR ÖFFNEN':'TÜR SCHLIESSEN'):'TÜR VERSTÄRKEN · 1 ERSATZTEIL'):(h.bed?'SCHLAFPLATZ · UNTERSCHLUPF VERWALTEN':'BETT HERRICHTEN · 1 RATION');
        candidates.push({x:f.x,z:f.z,label,touch:f.kind!=='bed',run:()=>{
          if(houseHasEnemies(f.house)&&!(f.kind==='door'&&h.reinforced[f.index]&&h.closed[f.index])){notify('Räume zuerst die Infizierten im Haus.');return;}
          if(f.kind==='window'){
            if(runtime.inventory.planks<2){notify('Zwei Bretter fehlen · Baumaterial vor dem Haus sammeln.');return;}
            if(Math.abs(camera.position.z-f.z)<.65&&Math.abs(camera.position.x-f.x)<1.9){notify('Tritt vom Fenster zurück, bevor du es vernagelst.');return;}
            runtime.inventory.planks-=2;h.windows[f.index]=true;city.setFortification(f.house,'window',f.index,true);emitNoise(f,24,'alarm',2);soundBurst(.16,900,.08);notify('Fenster vernagelt · Sicht und Zugang versperrt');
          }else if(f.kind==='door'){
            if(!h.closed[f.index]&&Math.abs(camera.position.z-f.z)<.7&&Math.abs(camera.position.x-f.x)<2.2){notify('Tritt vom Türrahmen zurück, um die Tür zu schließen.');return;}
            if(!h.reinforced[f.index]){
              if(!runtime.inventory.scrap){notify('Ein Ersatzteil für Riegel und Türverstärkung fehlt.');return;}
              runtime.inventory.scrap--;h.reinforced[f.index]=true;emitNoise(f,24,'alarm',2);
            }
            h.closed[f.index]=!h.closed[f.index];city.setFortification(f.house,'door',f.index,h.closed[f.index]);
            enemies.forEach(e=>{e.path=[];e.pathTime=0;});noahPath=[];noahPathTime=0;
            notify(h.closed[f.index]?'Verstärkte Tür geschlossen':'Tür offen · Unterschlupf ist ungeschützt');
          }else if(!h.bed){
            if(!runtime.inventory.ration){notify('Eine Ration für den Schlafplatz fehlt.');return;}
            runtime.inventory.ration--;h.bed=true;city.setFortification(f.house,'bed',0,true);notify('Bett vorbereitet · E öffnet die Unterschlupfverwaltung');
          }else openShelter(f.house);
          snapshotHud();
        }});
      }
      for(const npc of cityNpcs)candidates.push({x:npc.x,z:npc.z,label:`MIT ${npc.name} SPRECHEN`,run:()=>{
        if(npc.id==='lenz') {
          if(runtime.powerQuest===0){runtime.powerQuest=1;say([npc.name,'Die Oststadt ist ohne Strom. In meiner Werkstatt liegt eine Sicherung. Bring sie und zwei Ersatzteile zum Generator hier. Dann öffne ich dir die Waffenkammer.']);}
          else if(runtime.powerQuest<3)say([npc.name,runtime.powerQuest===1?'Die Werkstatt steht südlich der Polizei, an der Ringstraße. Eine Sicherung und zwei Ersatzteile reichen.':'Die Sicherung passt. Setz sie am Generator neben mir ein. Zwei Ersatzteile für die Verkabelung fehlen noch.']);
          else say([npc.name,'Die Notbeleuchtung läuft. Der Polizeischlüssel gehört dir. In der Waffenkammer liegt eine Jagdflinte. Verlass dich nicht auf das Licht: Der Generator ist laut.']);
        } else if(npc.id==='weber') {
          if(!runtime.learned.includes('weber')){
            say([npc.name,['Das Gegenmittel liegt in der alten Klinik. Sichere zuerst den Abbruchbefehl im Lazarus-Archiv: Lenz muss den Strom herstellen; die Keycard liegt am Kontrollpunkt Nord.','Mit 1 behandelst du Wunden, mit 7 eine Infektion und mit 8 ziehst du eine Schutzweste an. Medizin findest du in der Notaufnahme.','Ich suche außerdem Ben Voss. Die Patientenliste im Behandlungsraum zeigt seinen letzten Weg.']],()=>learn('weber'));return;
          }
          if(runtime.benQuest>=3 && runtime.benQuest<4){runtime.benQuest=4;runtime.health=100;runtime.infection=0;runtime.inventory.medkit=Math.min(ITEMS.medkit.limit,runtime.inventory.medkit+2);say([npc.name,'Ben lebt? Dann war es nicht umsonst. Ich versorge deine Wunden. Diese Verbände sind für euch. Im Lazarus-Archiv liegt noch der Beweis gegen Falk.']);}
          else if(runtime.evidence.includes('archive'))say([npc.name,'Falk hat den Abbruchbefehl unterschrieben. Mit diesem Original kann er die Wahrheit nicht länger verschweigen. Bring es mit dem Gegenmittel zum Konvoi.']);
          else {runtime.benQuest=Math.max(runtime.benQuest,1);say([npc.name,runtime.evidence.includes('ambulance')?'Waldcamp am Birkenrain. Geh zu Ben. Sag ihm, dass die Kinder mit Lea im Konvoi sind.':runtime.evidence.includes('triage')?'Wagen 12 fuhr zum Bahnhof im Süden. Vielleicht findest du dort sein Funkprotokoll.':'Ich suche Ben Voss. Er lag hier in der Notaufnahme. Auf der Kiste im Behandlungsraum liegt die Patientenliste. Bitte finde heraus, wohin sie ihn gebracht haben.']);}
        } else if(npc.id==='ben') {
          runtime.benQuest=Math.max(runtime.benQuest,3);say([npc.name,'Ich habe es geschafft. Die Kinder sind mit Lea im Konvoi. Mara muss es erfahren. Sag Dr. Weber, dass ich lebe. Nimm Leas Foto mit.']);
          if(!runtime.evidence.includes('ben'))runtime.evidence.push('ben');
        } else say([npc.name,npc.id==='school-resident'?'Wir bleiben hier zusammen. Lenz kümmert sich um den Strom, Anja hält den Eingang frei.':'Der Hof ist gesichert. Komm durch den bewachten Eingang; draußen bist du auf dich gestellt.']);
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
          runtime.inventory.scrap-=2;runtime.powerQuest=3;emitNoise(p,72,'alarm',12);spawnPack(141,100,5);notify('Strom wiederhergestellt · Polizeischlüssel erhalten');say(['LENZ','Gut gemacht! Die Beleuchtung läuft. Nimm meinen Polizeischlüssel. Die Wachen halten den Eingang, aber draußen haben sie uns gehört.']);
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
      return candidates.filter(p=>Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<2.6&&(p.touch||visibleFrom(camera.position,new THREE.Vector3(p.x,0,p.z)))).sort((a,b)=>Math.hypot(a.x-camera.position.x,a.z-camera.position.z)-Math.hypot(b.x-camera.position.x,b.z-camera.position.z))[0];
    };
    const interact = () => {
      if (!runtime.active) return;
      if (conversation) { nextDialogue(); return; }
      const item = nearestPickup();
      if (item) {
        const name = lootName(item.kind);
        if (item.kind === 'ammo' || item.kind === 'shells' || item.kind === 'rifleAmmo') { runtime.arsenal[item.kind==='ammo'?'pistol':item.kind==='shells'?'shotgun':'rifle'].reserve += item.count; syncAmmo(); }
        else { const room = ITEMS[item.kind].limit - runtime.inventory[item.kind]; if (room <= 0) { notify(`${name}: Inventar voll`); return; } const amount = Math.min(room, item.count); runtime.inventory[item.kind] += amount; item.count -= amount;learn('supplies');if(item.kind==='planks')learn('planks'); if (item.count > 0) { notify(`${name} +${amount} · Rest bleibt liegen`);snapshotHud();return; } }
        item.taken = true; item.object.visible = false;syncCampaign();snapshotHud();notify(`${name} eingesammelt`); tone(420, 0.12, 'sine'); return;
      }
      const note = nearestNote();
      if (note >= 0) { if (!runtime.discovered.includes(note)) runtime.discovered.push(note); openJournal(note); return; }
      const cityInteraction=nearestCityInteraction();if(cityInteraction){cityInteraction.run();syncCampaign();snapshotHud();return;}
      advanceStory();
    };
    const consumeItem = (kind: ItemKind) => {
      if (!runtime.active || conversation) return;
      if(kind==='planks'){notify('Bretter mit E direkt am Fenster einsetzen.');return;}
      if (!runtime.inventory[kind]) { notify(`Keine ${ITEMS[kind].name} vorhanden`); return; }
      if (kind === 'medkit') { if (runtime.health >= 100) { notify('Gesundheit bereits voll'); return; } runtime.health = Math.min(100, runtime.health + 40); }
      if (kind === 'ration') { if (runtime.boosted > 0) { notify('Ration wirkt noch'); return; } runtime.stamina = 100; runtime.boosted = 20; }
      if (kind === 'water') { if(runtime.thirst>=95&&OBJECTIVES[runtime.stage].id!=='water'){notify('Kein Durst');return;} runtime.thirst=100; }
      if (kind === 'antibiotic') { if(runtime.infection<=0){notify('Keine Infektion');return;} runtime.infection=0; }
      if (kind === 'armor') { if(runtime.protection>=95){notify('Weste intakt');return;} runtime.protection=100; }
      if (kind === 'battery') { if (runtime.battery >= 99) { notify('Lampe bereits geladen'); return; } runtime.battery = 100; }
      if (kind === 'scrap') {
        if (runtime.repaired) { notify('Sender bereits verstärkt'); return; }
        if (horizontalDistance(camera.position, OBJECTIVES[TOWER].target) > 6) { notify('Ersatzteile am Funkturm einsetzen'); return; }
        if (runtime.inventory.scrap < 3) { notify('Du brauchst 3 Ersatzteile'); return; }
        runtime.inventory.scrap -= 2; runtime.repaired = true; if (runtime.stage === DEFENSE) runtime.timer = Math.max(0, runtime.timer - 10);
      }
      if (kind === 'flare') {
        const object = new THREE.Group(); const direction = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)); object.position.copy(camera.position);
        for (let step = 0; step < 20; step++) { const next = object.position.clone().addScaledVector(direction, 0.5); if (collides(next.x, next.z)) break; object.position.copy(next); }
        object.position.y = terrainHeight(object.position.x, object.position.z) + 0.3;
        object.userData.sourceLight=new THREE.PointLight(0xff582c,35,20,2);
        object.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0xffb75c }))); scene.add(object); flares.push({ object, life: 12 });
      }
      runtime.inventory[kind]--;if(kind==='water')learn('water');if(kind==='flare'&&horizontalDistance(camera.position,OBJECTIVES[RESCUE].target)<25)learn('flare');syncCampaign();notify(kind === 'scrap' ? 'Sender verstärkt · Konvoi 10 s früher' : `${ITEMS[kind].name} verwendet`); tone(520, 0.12, 'sine'); snapshotHud();
    };

    const resetGame = () => {
      conversation = null; setDialogue(null);
      generation++; keys.clear(); city.reset(); noises.length = 0; triggerHeld = false; journalOpen = false; noahMoving = false;
      shelterId=null;setSelectedHouse(null);city.fortifications.forEach(f=>city.setFortification(f.house,f.kind,f.index,false));
      noahAnimation?.actions.run.stop(); noahAnimation?.actions.idle.reset().play();
      npcAnchors.noah.position.set(17, terrainHeight(17, 15), 15);
      noahPath=[];noahPathTime=0;
      flares.forEach(f => releaseFlare(f.object)); flares.length = 0;
      flashlight.intensity = 0; recoil = 0; muzzleTime = 0; muzzle.intensity = 0; muzzleMesh.visible = false; weapon.rotation.set(0, 0, 0); setNotice('');
      enemies.forEach(releaseEnemy); enemies.length = 0; enemyHitboxes.length = 0;
      camera.position.set(START.x, terrainHeight(START.x, START.z) + 1.72, START.z); yaw = -1.45; pitch = -0.06; camera.rotation.set(pitch, yaw, 0);
      fuelCell.visible = true; serum.visible = true; npcAnchors.noah.visible = false;
      pickups.forEach((item, i) => { item.taken = false; item.object.visible = true; item.count = WORLD_LOOT[i].count; });
      runtime = freshRuntime(); runtime.active = true; updateWeaponModel();
      questProps.forEach(p=>p.object.visible=true);cityNpcs.forEach(n=>n.anchor.position.set(n.x,terrainHeight(n.x,n.z),n.z));
      moveObjectiveMarker(0); setHud(INITIAL_HUD); setScreen('playing'); setLocation(null); notify('Mara wartet am Feuer · [E] mit ihr sprechen');
      audio ??= new AudioContext(); audio.resume(); canvas.requestPointerLock?.()?.catch(() => undefined);
    };
    const respawnPlayer = () => {
      if(runtime.health>0||!runtime.respawn)return;
      const h=SAFEHOUSES.find(h=>h.id===runtime.respawn);if(!h||!runtime.houses[h.id].claimed)return;
      // Keep world/quest/loot state, rebuilding neither consumed loot nor ammo.
      enemies.filter(e=>e.alive&&houseContains(h,e.group.position.x,e.group.position.z,1)).forEach(e=>killEnemy(e,false));
      for(let i=0;i<2;i++){runtime.houses[h.id].closed[i]=true;city.setFortification(h.id,'door',i,true);}
      camera.position.set(h.x,terrainHeight(h.x,h.z+1)+1.72,h.z+1);yaw=0;pitch=0;camera.rotation.set(0,0,0);
      if(runtime.learned.includes('noah'))npcAnchors.noah.position.set(h.x+2,terrainHeight(h.x+2,h.z),h.z);
      runtime.health=100;runtime.stamina=100;runtime.thirst=75;runtime.infection=0;runtime.damageFlash=0;runtime.invulnerable=3;runtime.reloading=false;runtime.reloadLeft=0;runtime.shotCooldown=0;runtime.hit=0;runtime.aiming=false;
      if(runtime.stage===DEFENSE)runtime.timer=runtime.repaired?30:40;
      noahPath=[];noahPathTime=0;noises.length=0;flashlight.intensity=0;resumeGame();snapshotHud();notify(`${h.name} · zurück am Respawnpunkt. Quest und Ausrüstung bleiben erhalten.`);
    };
    apiRef.current = { start: resetGame, resume: resumeGame, journal: () => openJournal(), nextDialogue,respawn:respawnPlayer,shelter:shelterAction };

    // Development-only QA surface: exercise actual interaction/combat functions
    // and inspect live renderer counters without shipping cheats in production.
    if (process.env.NODE_ENV !== 'production') Object.assign(window, { __nachtwache: {
      state: () => ({ ...runtime,mission:OBJECTIVES[runtime.stage].id,protectedHouse:protectedHouseAt(camera.position.x,camera.position.z)?.id,trainingTarget:trainingTarget.position.toArray(),dialogue: conversation ? { speaker: conversation.speaker, lines: [...conversation.lines], index: conversation.index } : null, inventory:{...runtime.inventory},arsenal:structuredClone(runtime.arsenal),position:camera.position.toArray(),noah:npcAnchors.noah.position.toArray(),enemies:enemies.map(e=>({kind:e.kind,state:e.brain.state,health:e.health,x:e.group.position.x,z:e.group.position.z,y:e.group.position.y,head:e.head.getWorldPosition(new THREE.Vector3()).toArray(),visible:visibleFrom(camera.position,e.group.position),alive:e.alive})),render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},doors:city.doors.map(d=>({id:d.id,open:d.open})) }),
      teleport: (x:number,z:number,direction=0) => {if(collides(x,z))throw Error('QA destination is blocked');camera.position.set(x,terrainHeight(x,z)+1.72,z);yaw=direction;pitch=0;camera.rotation.set(pitch,yaw,0);},
      interact, shoot, reload:reloadWeapon, switchWeapon, start:resetGame, nextDialogue,consume:consumeItem,respawn:respawnPlayer,shelter:shelterAction,
      setAiming:(aiming:boolean)=>{runtime.aiming=aiming;},hurt:hurtPlayer,
      spawn: (x:number,z:number,kind:ZombieKind) => { const before=enemies.length;spawnEnemy(x,z,false,kind);if(enemies.length>before)transition(enemies[enemies.length-1].brain,'idle',2); },
      aim: (x:number,y:number,z:number) => {const dx=x-camera.position.x,dz=z-camera.position.z; yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(y-camera.position.y,Math.hypot(dx,dz));camera.rotation.set(pitch,yaw,0);},
      pause:()=>{runtime.active=false;triggerHeld=false;}, resume:()=>{runtime.active=true;},
      setTime: (hours:number) => { runtime.elapsed=((hours-9+24)%24)*60; snapshotHud(); },
      environment: () => ({ ...daylightAt(runtime.elapsed), refuge:refugeAt(camera.position.x,camera.position.z)?.id, sun:daylightAt(runtime.elapsed).sunIntensity, moon:daylightAt(runtime.elapsed).moonIntensity, fog:scene.fog instanceof THREE.FogExp2?scene.fog.density:0, npcs:cityNpcs.map(n=>({id:n.id,x:n.x,z:n.z})), placements:placements.filter(p=>p.anchor.parent).length,detail:worldDetail?.stats }),
      performance: () => ({frameAverageMs:resolutionBudget.averageMs,resolutionScale:resolutionBudget.scale,pixelRatio:renderer.getPixelRatio(),buffer:[canvas.width,canvas.height],trees:treeDetail?.levels(),localLights:localLightPool.slots.length,programs:renderer.info.programs?.length,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,contextLosses,contextLost,frames:renderedFrames}),
      world: () => ({bounds:WORLD,...regionWorld.stats(),zones:WORLD_ZONES,pois:REGION_POIS,bridges:BRIDGES,structures:STRUCTURES,roads:ROAD_LINES,risk:riskAt(camera.position.x,camera.position.z),dressing:settlementDetail?.stats(),dressingScenes:settlementDetail?.plan.scenes,dressingProps:settlementDetail?.plan.props,dressingBounds:settlementDetail?.bounds}),
      blocked: (x:number,z:number) => collides(x,z), height:terrainHeight,
    }});

    const collides = (x: number, z: number) => regionCollision.blocked(x,z)||obstacles.some((o) => Math.abs(x - o.x) < o.hx + 0.45 && Math.abs(z - o.z) < o.hz + 0.45);
    const moveActor = (position: THREE.Vector3, target: THREE.Vector3, speed: number, dt: number, hostile = false) => {
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
          const blocker = actorObstacles(position,position,2).find(o => Math.abs(position.x + delta.x - o.x) < o.hx + 0.5 && Math.abs(position.z + delta.z - o.z) < o.hz + 0.5);
          if (blocker) {
            const sideX = Math.abs(position.x - blocker.x) / blocker.hx > Math.abs(position.z - blocker.z) / blocker.hz;
            const sx = sideX ? 0 : (target.x >= blocker.x ? 1 : -1) * speed * dt;
            const sz = sideX ? (target.z >= blocker.z ? 1 : -1) * speed * dt : 0;
            if (!collides(position.x + sx, position.z + sz)) { position.x += sx; position.z += sz; }
          }
        }
      }
      if (hostile && protectedAt(position.x,position.z,1)) { position.x=beforeX; position.z=beforeZ; }
      position.y = terrainHeight(position.x, position.z);
      return Math.hypot(position.x - beforeX, position.z - beforeZ) > 0.0001;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (conversation && runtime.active && ['KeyE', 'Space', 'Enter'].includes(event.code)) {
        event.preventDefault(); if (!event.repeat) nextDialogue(); return;
      }
      if (conversation && event.code !== 'Escape') return;
      if (event.code === 'KeyJ' || event.code === 'KeyM' || event.code === 'Tab') {
        if (journalOpen && event.code === 'Tab') return;
        if (!event.repeat) {
          if (journalOpen) resumeGame();
          else if (runtime.active) { openJournal(); if (event.code === 'KeyM') setJournalTab('map'); }
        }
        return;
      }
      if ((journalOpen||shelterId) && event.code === 'Escape') { resumeGame(); return; }
      if (!runtime.active) return;
      keys.add(event.code);
      if (event.code === 'KeyE' && !event.repeat) interact();
      if (event.code === 'KeyR' && !event.repeat) reloadWeapon();
      if (event.code === 'KeyQ' && !event.repeat) switchWeapon();
      if (event.code === 'KeyF' && !event.repeat) {flashlight.intensity = flashlight.intensity > 0 ? 0 : runtime.battery > 0 ? 32 : 0;if(flashlight.intensity>0)learn('lamp');}
      const slot = Number(event.code.replace('Digit', '')) - 1; const kind = (Object.keys(ITEMS) as ItemKind[])[slot]; if (kind && !event.repeat) consumeItem(kind);
      if (event.code === 'Escape' && !event.repeat && runtime.active) { runtime.active = false; keys.clear(); document.exitPointerLock?.(); setScreen('paused'); }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas || !runtime.active || conversation) return;
      yaw -= event.movementX * 0.0022; pitch -= event.movementY * 0.002; pitch = THREE.MathUtils.clamp(pitch, -1.25, 1.25);
    };
    const onMouseDown = (event: MouseEvent) => {
      if (!runtime.active || conversation) return;
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
    let pendingResize=true,contextLost=false,contextLosses=0,renderedFrames=0,shadowElapsed=1;
    const shadowPosition=new THREE.Vector3(Infinity,0,Infinity);
    const queueResize=()=>{pendingResize=true;};
    const resize = () => {
      const w=canvas.clientWidth,h=canvas.clientHeight;
      if(w<2||h<2)return;
      const ratio=renderPixelRatio(w,h,devicePixelRatio,resolutionBudget.scale);
      if(canvas.width!==Math.floor(w*ratio)||canvas.height!==Math.floor(h*ratio)||renderer.getPixelRatio()!==ratio){
        renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);composer.setPixelRatio(ratio);composer.setSize(w,h);
        antialiasPass.uniforms.resolution.value.set(1/(w*ratio),1/(h*ratio));
        camera.aspect=w/h;camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
      }
      pendingResize=false;
    };
    const releaseGpuResources=()=>{
      composer.passes.forEach(pass=>pass.dispose());composer.dispose();reflections.dispose();sunLight.shadow.map?.dispose();treeDetail?.dispose();
      sunLight.shadow.map=null;
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>(),skeletons=new Set<THREE.Skeleton>();
      scene.traverse((object) => {
        if(object instanceof THREE.SkinnedMesh)skeletons.add(object.skeleton);
        if(object instanceof THREE.InstancedMesh)object.dispose();
        if(object instanceof THREE.Mesh||object instanceof THREE.Sprite||object instanceof THREE.Points){
          if('geometry'in object)geometries.add(object.geometry);
          const mats=Array.isArray(object.material)?object.material:[object.material];
          for(const material of mats){materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);}
        }
      });
      skeletons.forEach(skeleton=>skeleton.dispose());geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());releaseSurfaceTextures();
      textureCache.forEach(texture=>{void texture.then(value=>value.dispose(),()=>undefined);});
    };
    const onContextLost=(event:Event)=>{
      event.preventDefault();contextLost=true;contextLosses++;keys.clear();triggerHeld=false;
      // Remove old-context disposal hooks before restoration creates new GPU
      // handles. Deleting those old handles afterwards causes INVALID_OPERATION.
      releaseGpuResources();
    };
    const onContextRestored=()=>{
      const room=new RoomEnvironment(),generator=new THREE.PMREMGenerator(renderer),restored=generator.fromScene(room,.04);
      reflections=restored;scene.environment=restored.texture;room.dispose();generator.dispose();
      renderer.setRenderTarget(composer.renderTarget1);
      const warming=compileScene(renderer,scene,camera,()=>disposed);renderer.setRenderTarget(null);
      void warming.then(()=>{if(!disposed){contextLost=false;queueResize();shadowElapsed=1;renderer.shadowMap.needsUpdate=true;}});
    };
    const sizeObserver=new ResizeObserver(queueResize);sizeObserver.observe(canvas);
    canvas.addEventListener('webglcontextlost',onContextLost);canvas.addEventListener('webglcontextrestored',onContextRestored);
    addEventListener('keydown', onKeyDown); addEventListener('keyup', onKeyUp); addEventListener('mousemove', onMouseMove); addEventListener('resize', queueResize); document.addEventListener('pointerlockchange', onPointerLock); canvas.addEventListener('mousedown', onMouseDown); resize();

    // Resolve all real model bounds before removing overlaps in a stable order.
    const clearLayout = Promise.all(placements.map(p=>p.ready)).then(async () => {
      if (disposed) return;
      const occupied = [...obstacles];
      const reserved = [...WORLD_LOOT,...NOTES,...CITY_NPCS,...DISCOVERIES,...questProps,
        ...OBJECTIVES.map(o=>o.target),{x:START.x,z:START.z}].map(p=>({x:p.x,z:p.z,hx:.75,hz:.75}));
      for (const {anchor,required} of placements) {
        if (required) continue;
        anchor.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(anchor);
        if (bounds.isEmpty()) continue;
        const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
        const footprint = {x:center.x,z:center.z,hx:size.x/2,hz:size.z/2};
        if ([...occupied,...reserved].some(o=>footprintsOverlap(footprint,o))) scene.remove(anchor);
        else occupied.push(footprint);
      }
      const detailFootprints=[...occupied,...CITY_PLACES.map(p=>({x:p.x,z:p.z,hx:p.hx??7.5,hz:p.hz??7})),...REFUGES];
      worldDetail=buildWorldDetail(scene,terrainHeight,detailFootprints,reserved,[...CITY_ROADS,
        {x:0,z:-7,w:145,h:9,rotation:.05},{x:18,z:10,w:8,h:48,rotation:-.55},{x:53,z:0,w:8,h:58,rotation:.42}],obstacles);
      worldDetail.update(camera.position.x,camera.position.z);
      treeDetail=createTreeDetailController(scene);treeDetail.update(camera.position.x,camera.position.z);
      settlementDetail=await buildSettlementDetail(scene,[...detailFootprints,...obstacles],reserved,regionCollision,load,()=>disposed);
      settlementDetail?.update(camera.position.x,camera.position.z);
    });
    Promise.all([
      clearLayout,
      loadFbx(`${MODEL}characters/characterMedium.fbx`), loadFbx(`${MODEL}characters/animations/run.fbx`),
      loadFbx(`${MODEL}characters/animations/idle.fbx`), loadSkin('zombieA'),
      load('suburban-building-type-a'), load('industrial-building-a'),
    ]).then(async () => {
      if(disposed)return;
      // Match the linear offscreen RenderPass. Compiling against the default
      // sRGB framebuffer would warm a different set of shader programs.
      renderer.setRenderTarget(composer.renderTarget1);
      let compiling:Promise<unknown>;
      try{compiling=compileScene(renderer,scene,camera,()=>disposed);}finally{renderer.setRenderTarget(null);}
      await compiling;
      if(!disposed){renderer.shadowMap.needsUpdate=true;setLoaded(true);}
    }).catch(() => { reportAssetError('Startpaket'); if (!disposed) setLoaded(true); });

    const horizon = new THREE.Color(), zenith = new THREE.Color();
    let cullTime=0;
    const dayHorizon = new THREE.Color(0xbad5e6), duskHorizon = new THREE.Color(0xf0b68b);
    const dayZenith = new THREE.Color(0x4b9cdb), daySky = new THREE.Color(0xcce6ff), dayGround = new THREE.Color(0x827762), daySun = new THREE.Color(0xfff2da);
    const sunDirection = new THREE.Vector3();
    const updateEnvironment = () => {
      const light = daylightAt(runtime.elapsed);
      skyMaterial.uniforms.cloudTime.value=runtime.elapsed;foliageTime.value=runtime.elapsed;
      horizon.setHex(0x18253e).lerp(dayHorizon,light.daylight).lerp(duskHorizon,light.twilight*.7);
      zenith.setHex(0x050b1c).lerp(dayZenith,light.daylight);
      skyMaterial.uniforms.low.value.copy(horizon); skyMaterial.uniforms.high.value.copy(zenith);
      scene.background = horizon;
      if(scene.fog instanceof THREE.FogExp2){scene.fog.color.copy(horizon);scene.fog.density=light.fogDensity;}
      skyLight.intensity=light.skyIntensity;
      skyLight.color.setHex(0x8ba8d5).lerp(daySky,light.daylight);
      skyLight.groundColor.setHex(0x333e49).lerp(dayGround,light.daylight);
      scene.environmentIntensity=.12+light.daylight*.3;
      sunLight.intensity=light.sunIntensity+light.moonIntensity;
      sunLight.color.setHex(light.elevation<0?0xb4cafa:0xffb778);
      if(light.elevation>=0)sunLight.color.lerp(daySun,THREE.MathUtils.smoothstep(light.elevation,0,.5));
      const direction = sunDirection.set(Math.cos(light.angle),light.elevation,-.35).normalize();
      sunLight.position.copy(camera.position).addScaledVector(direction,light.elevation<0?-85:85);
      sunLight.target.position.set(camera.position.x,terrainHeight(camera.position.x,camera.position.z),camera.position.z);sunLight.target.updateMatrixWorld();
      sun.position.copy(camera.position).addScaledVector(direction,160); sun.visible=light.elevation>-.02;
      moon.position.copy(camera.position).addScaledVector(direction,-160); moon.visible=light.elevation<.02;
      sky.position.copy(camera.position); stars.position.copy(camera.position); stars.material.opacity=light.night*.7;
      mist.forEach(sprite=>{sprite.material.opacity=.015+light.night*.035;});
      refugeLights.forEach(lamp=>{lamp.intensity=light.night*24;});
      streetLights.forEach(lamp=>{lamp.intensity=runtime.powerQuest===3?light.night*24:0;});
      const sources=[...localLightSources,...(settlementDetail?.lighting(light.night,runtime.powerQuest===3,camera.position)??[])];
      for(const flare of flares){const source=flare.object.userData.sourceLight as THREE.PointLight;source.position.copy(flare.object.position);sources.push(source);}
      localLightPool.update(sources,camera.position);
      renderer.toneMappingExposure=1.05+light.night*.08;
    };
    const animate = () => {
      if(disposed)return;
      frame = requestAnimationFrame(animate); const elapsed=clock.getDelta(),dt = Math.min(elapsed, 0.045);
      if(disposed||contextLost||document.hidden)return;
      if(resolutionBudget.sample(elapsed*1000,runtime.active))pendingResize=true;
      if(pendingResize)resize();
      if (runtime.active && !conversation) npcMixers.forEach((mixer) => mixer.update(dt));
      const time = performance.now() * 0.001;
      cullTime-=dt;
      if(cullTime<=0){
        cullTime=.16;regionWorld.update(camera.position.x,camera.position.z);city.update(camera.position.x,camera.position.z);worldDetail?.update(camera.position.x,camera.position.z);treeDetail?.update(camera.position.x,camera.position.z);settlementDetail?.update(camera.position.x,camera.position.z);
        for(const p of placements)p.anchor.visible=Math.hypot(p.anchor.position.x-camera.position.x,p.anchor.position.z-camera.position.z)<180;
        for(const s of regionalSigns)s.group.visible=Math.hypot(s.x-camera.position.x,s.z-camera.position.z)<180;
      }
      mist.forEach((sprite, i) => { sprite.position.x += Math.sin(time * 0.12 + i) * dt * 0.22; });
      flames.forEach((flame, i) => { flame.scale.set(1 + Math.sin(time * 9 + i) * 0.13, 1 + Math.sin(time * 13 + i) * 0.22, 1); flame.rotation.y += dt; });
      flickerLights.forEach((light, i) => { light.intensity = light.userData.base * (1 + Math.sin(time * (i === 4 ? 16 : 8) + i) * 0.14); });
      motes.position.y = Math.sin(time * 0.25) * 0.5;
      redBeacon.intensity = 20 + Math.sin(performance.now() * 0.004) * 8;
      markerRing.rotation.z += dt * 0.8;
      if (markerBeam.material instanceof THREE.MeshBasicMaterial) markerBeam.material.opacity = 0.08 + Math.sin(performance.now() * 0.003) * 0.03;
      fuelCell.rotation.y += dt; fuelCell.position.y = fuelBaseY + Math.sin(performance.now() * 0.003) * 0.08;
      serum.rotation.y -= dt; serum.position.y = serumBaseY + Math.sin(performance.now() * 0.003 + 2) * 0.08;

      if (runtime.active && !conversation) {
        runtime.elapsed += dt;
        sky.position.copy(camera.position);
        const nearestInterior=CITY_PLACES.find(p=>Math.abs(camera.position.x-p.x)<(p.hx??7.5)&&Math.abs(camera.position.z-p.z)<(p.hz??7));
        interiorLight.intensity=0;rearInteriorLight.intensity=0;
        if(nearestInterior){
          const narrow=nearestInterior.hx===4, y=terrainHeight(nearestInterior.x,nearestInterior.z)+2.95;
          interiorLight.position.set(nearestInterior.x,y,nearestInterior.z+(narrow?4.8:0));
          interiorLight.color.set(narrow?0xffddb0:0xb1c8ad);
          interiorLight.intensity=(runtime.powerQuest===3?36:narrow?22:12)*(1+Math.sin(runtime.elapsed*12)*.025);
          rearInteriorLight.position.set(nearestInterior.x,y,nearestInterior.z-4.8);rearInteriorLight.intensity=nearestInterior.hx?interiorLight.intensity:0;
        }
        runtime.thirst=Math.max(0,runtime.thirst-dt*.07);
        if(runtime.infection>=75)runtime.health=Math.max(1,runtime.health-dt*.3);
        for(const p of CITY_PLACES)if(Math.abs(p.x-camera.position.x)<(p.hx??7.5)&&Math.abs(p.z-camera.position.z)<(p.hz??7)&&!runtime.visited.includes(p.id)){
          runtime.visited.push(p.id);notify(`${p.name} · Im Journal entdeckt`);
          if(!REFUGES.some(r=>r.id===p.id))spawnPack(p.x+11,p.z-9,p.kind==='military'?5:2);
          if(p.kind==='lab')spawnEnemy(p.x+10,p.z-2,true);
        }
        runtime.eventTime-=dt;
        if(runtime.eventTime<=0&&runtime.stage>0){
          runtime.eventTime=55+Math.random()*30;runtime.eventNumber++;
          const nearby=CITY_PLACES.find(p=>Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<40);
          if(nearby && runtime.eventNumber%2){const event={x:nearby.x+12,z:nearby.z+10};emitNoise(event,65,'alarm',13);spawnPack(event.x,event.z,4);notify('Ein Fahrzeugalarm lockt Infizierte an.');}
          else {const ex=camera.position.x+Math.cos(yaw)*29,ez=camera.position.z-Math.sin(yaw)*29;spawnPack(ex,ez,4);emitNoise({x:ex+8,z:ez+5},45,'shot',4);notify('Schüsse in der Ferne · Infizierte ziehen durch die Straßen.');}
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
        for (let i = flares.length - 1; i >= 0; i--) { flares[i].life -= dt; if (flares[i].life <= 0) { releaseFlare(flares[i].object); flares.splice(i, 1); } }
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
          if (runtime.reloadLeft <= 0) { const amount = Math.min(WEAPONS[runtime.weapon].magazine - runtime.ammo, runtime.reserve); runtime.arsenal[runtime.weapon].ammo += amount; runtime.arsenal[runtime.weapon].reserve -= amount; syncAmmo(); runtime.reloading = false; weapon.rotation.z = 0;if(amount>0&&runtime.weapon==='pistol')learn('reload');tone(320, 0.06, 'square', 0.015); }
        }

        if (runtime.stage > 0) runtime.spawn -= dt;
        if (runtime.spawn <= 0) {const risk=riskAt(camera.position.x,camera.position.z);spawnEnemy(undefined, undefined, Math.random() < [0,.06,.12,.3][risk]); runtime.spawn = runtime.stage === DEFENSE ? 1.4 + Math.random() : [30,15,8,3.5][risk]+Math.random()*5; }
        if (runtime.learned.includes('noah')) {
          const followX = camera.position.x + Math.sin(yaw) * 2.4, followZ = camera.position.z + Math.cos(yaw) * 2.4;
          const followTarget = new THREE.Vector3(followX, terrainHeight(followX, followZ), followZ);
          const followDelta = followTarget.clone().sub(npcAnchors.noah.position);
          noahPathTime-=dt;
          if(noahPathTime<=0){noahPath=pathBetween(npcAnchors.noah.position,followTarget);if(!noahPath.length)noahPath=pathBetween(npcAnchors.noah.position,camera.position);noahPathTime=.8;}
          while(noahPath.length&&Math.hypot(noahPath[0].x-npcAnchors.noah.position.x,noahPath[0].z-npcAnchors.noah.position.z)<.6)noahPath.shift();
          const waypoint=noahPath[0];const before=npcAnchors.noah.position.clone();
          const walking = followDelta.length() > 2.2 && !!waypoint && moveActor(npcAnchors.noah.position,new THREE.Vector3(waypoint.x,0,waypoint.z),5.2,dt);
          if(noahAnimation)noahAnimation.actions.run.timeScale=horizontalDistance(before,npcAnchors.noah.position)/Math.max(.001,dt)/3.2;
          if (walking) npcAnchors.noah.rotation.y = Math.atan2(followDelta.x, followDelta.z);
          if (walking !== noahMoving && noahAnimation) { noahAnimation.actions[walking ? 'idle' : 'run'].fadeOut(0.25); noahAnimation.actions[walking ? 'run' : 'idle'].reset().fadeIn(0.25).play(); noahMoving = walking; }
        }
        npcAnchors.mara.rotation.y = Math.atan2(camera.position.x - npcAnchors.mara.position.x, camera.position.z - npcAnchors.mara.position.z);
        let pathBudget=2;
        for (let i=enemies.length-1;i>=0;i--) {
          const enemy=enemies[i], distance=horizontalDistance(camera.position,enemy.group.position);
          if (!enemy.alive) {
            enemy.deathTime -= dt; enemy.animator?.update(dt,enemy.brain,0,runtime.elapsed);
            if(enemy.deathTime<=0) { releaseEnemy(enemy);enemies.splice(i,1); }
            continue;
          }
          enemy.group.visible = distance < 105;
          if(distance>110){enemy.alive=false;enemy.deathTime=0;for(const box of [enemy.hitbox,enemy.head]){const n=enemyHitboxes.indexOf(box);if(n>=0)enemyHitboxes.splice(n,1);}continue;}
          if(distance>95)continue;
          const lureNoises: Stimulus[] = flares.map(f=>({x:f.object.position.x,z:f.object.position.z,radius:23,life:f.life,kind:'flare'}));
          const result = think(enemy.brain,enemy.kind,enemy.group.position,camera.position,enemy.group.rotation.y,actorObstacles(enemy.group.position,camera.position,2,true),[...noises,...lureNoises],dt);
          if(result.strike&&!protectedAt(camera.position.x,camera.position.z))hurtPlayer(ZOMBIES[enemy.kind].damage);
          const beforeX=enemy.group.position.x,beforeZ=enemy.group.position.z;
          enemy.pathTime-=dt;
          if(result.speed>0) {
            const target=enemy.brain.target;
            if(pathBudget>0&&(enemy.pathTime<=0 || Math.hypot(target.x-enemy.lastPathTarget.x,target.z-enemy.lastPathTarget.z)>4)) {
              pathBudget--;
              enemy.path=pathBetween(enemy.group.position,target,.5);enemy.lastPathTarget={...target};enemy.pathTime=.85+enemy.phase*.12;
            }
            while(enemy.path.length && Math.hypot(enemy.path[0].x-beforeX,enemy.path[0].z-beforeZ)<.45)enemy.path.shift();
            const waypoint=enemy.path[0];
            if(waypoint) {
              const targetPoint=new THREE.Vector3(waypoint.x,0,waypoint.z);
              if(enemy.kind==='infected'&&enemy.brain.state==='chase'){targetPoint.x+=Math.sin(runtime.elapsed*4+enemy.phase)*.7;}
              moveActor(enemy.group.position,targetPoint,result.speed,dt,true);
              // Local separation is applied through the same collision controller.
              const separation=new THREE.Vector3();
              for(const other of enemies){if(other===enemy||!other.alive)continue;const dx=enemy.group.position.x-other.group.position.x,dz=enemy.group.position.z-other.group.position.z,d=Math.hypot(dx,dz);if(d<1.05&&d>.001){separation.x+=dx/d*(1.05-d);separation.z+=dz/d*(1.05-d);}}
              if(separation.lengthSq()>.001)moveActor(enemy.group.position,enemy.group.position.clone().add(separation),Math.min(1.5,separation.length()*2),dt,true);
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

        syncCampaign();
        if (runtime.active && runtime.stage === DEFENSE && horizontalDistance(camera.position, OBJECTIVES[DEFENSE].target) < 18) { runtime.timer = Math.max(0, runtime.timer - dt); if (runtime.timer <= 0) { runtime.active = false; snapshotHud(); document.exitPointerLock?.(); setDialogue(null); conversation = null; setScreen('won'); } }
        const objective = OBJECTIVES[runtime.stage]; const distance = horizontalDistance(camera.position, objective.target); runtime.distance = Math.round(distance);
        runtime.prompt = distance < 3.2 ? (runtime.stage === RESCUE && nearEnemy(objective.target, 8) ? 'BEREICH SICHERN' : runtime.stage === DEFENSE ? 'HALTE DIE STELLUNG' : ['intro','fuel','noah','serum','tower'].includes(objective.id)?'[E] INTERAGIEREN':objective.detail) : '';
        if(runtime.stage===TOWER&&distance<3.2&&horizontalDistance(npcAnchors.noah.position,objective.target)>12)runtime.prompt='NOAH ZUM SENDER BEGLEITEN';
        if (runtime.stage === DEFENSE && distance >= 18) runtime.prompt = 'ZUM SENDER ZURÜCKKEHREN · KONVOI WARTET';
        const nearItem = nearestPickup(), nearNote = nearestNote();
        if (nearNote >= 0) runtime.prompt = `[E] BRIEF LESEN · ${NOTES[nearNote].title}`;
        if (nearItem) runtime.prompt = `[E] ${lootName(nearItem.kind).toUpperCase()} ×${nearItem.count}`;
        const cityInteraction=nearestCityInteraction();if(cityInteraction&&!nearItem&&nearNote<0)runtime.prompt=`[E] ${cityInteraction.label}`;
        cityClues.forEach((paper,i)=>{(paper.material as THREE.MeshStandardMaterial).emissiveIntensity=runtime.evidence.includes(DISCOVERIES[i].id)?.05:.4;});
        noteObjects.forEach((paper, i) => { (paper.material as THREE.MeshStandardMaterial).emissiveIntensity = runtime.discovered.includes(i) ? 0.05 : 0.4 + Math.sin(time * 2) * 0.15; });

        const cityLocation=CITY_PLACES.filter(p=>Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<27).sort((a,b)=>Math.hypot(a.x-camera.position.x,a.z-camera.position.z)-Math.hypot(b.x-camera.position.x,b.z-camera.position.z))[0];
        const poi=REGION_POIS.find(p=>Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<55),zone=zoneAt(camera.position.x,camera.position.z);
        const regionPlace=poi??zone;
        if(regionPlace&&!inLegacy(camera.position.x,camera.position.z)&&!runtime.visited.includes(regionPlace.id)){
          runtime.visited.push(regionPlace.id);
          if(regionPlace.risk>0)spawnPack(regionPlace.x+15,regionPlace.z-15,[0,3,6,9][regionPlace.risk]);
        }
        const currentLocation = cityLocation ? {name:cityLocation.name,subtitle:cityLocation.story} : !inLegacy(camera.position.x,camera.position.z)?{name:regionPlace?.name??'TANNWALD · FREIE LANDSCHAFT',subtitle:`${regionPlace?.detail??'Weiden und Waldsäume zwischen den Orten.'} · RISIKO ${riskAt(camera.position.x,camera.position.z)+1}/4`}:camera.position.x>85?{name:'TANNWALD · OSTSTADT',subtitle:'RINGSTRASSE · EVAKUIERUNGSSEKTOR'}:camera.position.x<-95?{name:'BIRKENRAIN',subtitle:'WALDWEG · AUSSENGEBIET'}:LOCATIONS.find((item) => item.test(camera.position.x, camera.position.z))!;
        if (currentLocation.name !== runtime.locationName) { runtime.locationName = currentLocation.name; setLocation({ name: currentLocation.name, subtitle: currentLocation.subtitle }); locationTime = 3.2; }
        if (locationTime > 0) { locationTime -= dt; if (locationTime <= 0) setLocation(null); }
        runtime.hudTick -= dt;
        if (runtime.hudTick <= 0) { snapshotHud(); runtime.hudTick = 0.12; }
      }
      weapon.visible = !conversation;
      if(muzzle.intensity>0){muzzleMesh.getWorldPosition(muzzle.position);camera.worldToLocal(muzzle.position);if(conversation)muzzle.intensity=0;}
      updateEnvironment();shadowElapsed+=dt;
      if(shadowElapsed>=.06||shadowPosition.distanceToSquared(camera.position)>1){renderer.shadowMap.needsUpdate=true;shadowElapsed=0;shadowPosition.copy(camera.position);}
      renderer.info.reset();composer.render();renderedFrames++;
    };
    animate();

    return () => {
      disposed = true; apiRef.current = null; cancelAnimationFrame(frame); document.exitPointerLock?.();
      if(process.env.NODE_ENV !== 'production')Reflect.deleteProperty(window,'__nachtwache');
      removeEventListener('blur', onBlur); removeEventListener('mouseup',onMouseUp); canvas.removeEventListener('contextmenu',onContext); audio?.close();
      removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp); removeEventListener('mousemove', onMouseMove); removeEventListener('resize', queueResize); document.removeEventListener('pointerlockchange', onPointerLock); canvas.removeEventListener('mousedown', onMouseDown);
      sizeObserver.disconnect();canvas.removeEventListener('webglcontextlost',onContextLost);canvas.removeEventListener('webglcontextrestored',onContextRestored);
      releaseGpuResources();renderer.dispose();
    };
  }, []);

  const start = useCallback(() => apiRef.current?.start(), []);
  const resume = useCallback(() => apiRef.current?.resume(), []);
  const objective = OBJECTIVES[hud.stage];
  const currentHouse=SAFEHOUSES.find(h=>houseContains(h,hud.x,hud.z));
  const shelter=SAFEHOUSES.find(h=>h.id===selectedHouse);
  const shelterState=shelter?hud.houses[shelter.id]:null;

  return (
    <main className="game-shell fps">
      <canvas ref={canvasRef} className="game-canvas" tabIndex={0} aria-label="Nachtwache First-Person-Spielfeld" />
      <div className="vignette" aria-hidden="true" /><div className="grain" aria-hidden="true" />

      {screen === 'playing' && !dialogue && <div className="hud">
        <div className="field-status"><span>TANNWALD · TAG {daylightAt(hud.elapsed).day} · {daylightAt(hud.elapsed).clock} · {daylightAt(hud.elapsed).period}</span>{refugeAt(hud.x,hud.z)&&<b>GESICHERTER UNTERSCHLUPF</b>}<b>{hud.battery < 20 ? 'LAMPE FAST LEER' : 'TASCHENLAMPE'} {Math.ceil(hud.battery)}%</b><span>{hud.hasMap ? '[M] Karte · [J] Journal' : '[J] Ausrüstung · Karte bei Mara'} · {hud.visited.filter(id=>EXPLORABLE_IDS.includes(id)).length}/{EXPLORABLE_IDS.length} Orte</span><span>WASSER {Math.ceil(hud.thirst)}% · SCHUTZ {Math.ceil(hud.protection)}</span>{hud.infection>0 && <span className={hud.infection>70?'infected':''}>INFEKTION {Math.ceil(hud.infection)}% · [7] behandeln</span>}</div>
        <header className="fps-mission">
          <div><small>{objective.place} · AUFTRAG {hud.stage + 1}/{OBJECTIVES.length}</small><strong>{objective.title}</strong><span>{objective.detail}</span></div>
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
        {hud.stage === DEFENSE && <div className="defense-timer"><small>KONVOI ANKUNFT</small><b>00:{String(hud.timer).padStart(2, '0')}</b></div>}
        {currentHouse&&<section className="house-status"><b>{currentHouse.name}</b><span>Fenster {hud.houses[currentHouse.id].windows.filter(Boolean).length}/4 · Türen {hud.houses[currentHouse.id].reinforced.filter(Boolean).length}/2 · Bett {hud.houses[currentHouse.id].bed?'✓':'offen'}</span><span>{houseProtected(hud.houses[currentHouse.id])?'GESICHERT':hud.houses[currentHouse.id].claimed?'TÜREN OFFEN · UNGESCHÜTZT':'E an Fenstern, Türen und Bett'}</span></section>}
      </div>}

      {screen === 'journal' && <section className="field-journal" role="dialog" aria-modal="true" aria-label="Feldjournal">
        <header><div><p className="eyebrow">ELIAS VOSS · FELDJOURNAL</p><h2>Spuren einer Nacht.</h2></div><button type="button" onClick={resume} autoFocus>Zurück ins Spiel <kbd>J</kbd></button></header>
        <nav aria-label="Journalansicht"><button type="button" aria-pressed={journalTab === 'map'} onClick={() => setJournalTab('map')}>Karte & Aufgaben</button><button type="button" aria-pressed={journalTab === 'inventory'} onClick={() => setJournalTab('inventory')}>Ausrüstung</button><button type="button" aria-pressed={journalTab === 'notes'} onClick={() => setJournalTab('notes')}>Fundstücke <span>{hud.discovered.length}/5</span></button><span>Spiel pausiert</span></nav>
        {journalTab === 'map' ? <div className="journal-layout">
          <div className="map-panel">{hud.hasMap ? <WorldMap player={{ x: hud.x, z: hud.z }} target={objective.target} visited={hud.visited} buildings={mapBuildings} houses={hud.houses} respawn={hud.respawn} /> : <div className="map-missing"><h3>Die Karte hat Mara.</h3><p>Sprich mit ihr am Feuer der Rangerstation. Sie erklärt dir die Lage und gibt dir ihre Karte.</p></div>}
          <section className="quest-log"><h3>Hauptquest · {hud.stage+1}/{OBJECTIVES.length}</h3><article><b>{objective.title}</b><p>{objective.detail}</p></article><details><summary>Alle Aufträge</summary>{OBJECTIVES.map((m,i)=><p key={m.id}>{i<hud.stage?'✓':i===hud.stage?'→':'○'} {i+1}. {m.title}</p>)}</details></section>
          <section className="quest-log"><h3>Eigene Unterschlüpfe</h3><p>Vier Fenster × 2 Bretter, zwei Türen × 1 Ersatzteil und ein Bett × 1 Ration. E am Bett aktiviert den Ort. Türen zum Schutz schließen; nachts von 19 bis 06 Uhr schlafen.</p>{SAFEHOUSES.map(h=><article key={h.id}><b>{h.name}{hud.respawn===h.id?' · RESPAWNPUNKT':''}</b><p>Fenster {hud.houses[h.id].windows.filter(Boolean).length}/4 · Türen {hud.houses[h.id].reinforced.filter(Boolean).length}/2 · Bett {hud.houses[h.id].bed?'bereit':'offen'} · {houseProtected(hud.houses[h.id])?'gesichert':hud.houses[h.id].claimed?'Türen offen':'noch nicht aktiviert'}</p></article>)}</section>
          <section className="quest-log"><h3>Offene Spuren</h3><article><b>Das Licht der Oststadt</b><p>{hud.powerQuest===0?'Lenz wartet im gesicherten Schulhof der Oststadt.':hud.powerQuest===1?'Durchsuche die Werkstatt an der Ringstraße nach einer Sicherung.':hud.powerQuest===2?'Bring die Sicherung und zwei Ersatzteile zum Generator bei Lenz.':'✓ Strom wiederhergestellt. Der Polizeischlüssel öffnet die Waffenkammer.'}</p></article><article><b>Ein Name auf der Liste</b><p>{hud.benQuest===0?'In der Notaufnahme der Oststadt sucht Dr. Weber einen Vermissten.':hud.benQuest>=4?'✓ Ben lebt. Dr. Weber hat deine Wunden versorgt.':hud.benQuest===3?'Melde Dr. Weber im Krankenhaus, dass Ben im Waldcamp lebt.':hud.evidence.includes('ambulance')?'Folge dem Waldweg zum Camp am Birkenrain, südwestlich der Stadt.':hud.evidence.includes('triage')?'Suche das Funkprotokoll im Bahnhof im Süden.':'Suche die Patientenliste im Krankenhaus.'}</p></article><article><b>Was Falk verschwieg</b><p>{hud.evidence.includes('archive')?'✓ Original des Abbruchbefehls gesichert.':hud.keycard?'Keycard gefunden. Das Lazarus-Archiv braucht außerdem Strom.':'Am Kontrollpunkt Nord liegt der Zugang zum Lazarus-Archiv.'}</p></article></section>
          <div className="region-list">{CITY_PLACES.filter(p=>hud.visited.includes(p.id)).map(p=><div key={p.id}><b>{p.name}</b><p>{p.story}</p></div>)}</div>
          <div className="region-list">{REGIONS.map((region, i) => <div key={region.name}><b>0{i + 1} · {region.name}</b><span>{region.loot}</span><p>{region.detail}</p></div>)}{WORLD_ZONES.map(region=><div key={region.id}><b>{region.name}</b><span>RISIKO {region.risk+1}/4 · {hud.visited.includes(region.id)?'ERKUNDET':'UNERKUNDET'}</span><p>{region.detail}</p></div>)}</div></div>
        </div> : journalTab === 'inventory' ? <div className="equipment-layout"><aside className="inventory-panel"><h3>Waffen & Ausrüstung</h3><p className="ammo-stock">Reserve: 9 mm {hud.arsenal.pistol.reserve} · 12/70 {hud.arsenal.shotgun.reserve} · 5.56 mm {hud.arsenal.rifle.reserve}</p>{(Object.keys(WEAPONS) as WeaponKind[]).filter(k=>hud.arsenal[k].owned).map(k=><div key={k}><section><b>{hud.weapon===k?'● ':''}{WEAPONS[k].name}</b><p>{k==='axe'?'Nahkampf · 20 Ausdauer · 2,6 m':WEAPONS[k].ammo + ' · ' + hud.arsenal[k].ammo + ' / ' + hud.arsenal[k].reserve + ' Patronen'}</p></section></div>)}<p className="journal-tip">[Q] Waffe wechseln · [R] Nachladen · Rechte Maus: zielen. Nachladen wird beim Waffenwechsel abgebrochen.</p>{(Object.entries(ITEMS) as [ItemKind, typeof ITEMS[ItemKind]][]).map(([kind, item]) => <div key={kind}><kbd>{item.key}</kbd><section><b>{item.name} <em>×{hud.inventory[kind]}</em></b><p>{item.purpose}</p></section></div>)}<p className="journal-tip">Mit E sammeln und Briefe lesen. Gehen ist leise; Sprinten und Schüsse locken Infizierte an. Fackeln geben dir Zeit zum Durchbrechen.</p><p className="journal-tip">{hud.repaired ? '✓ Sender verstärkt.' : 'Am Funkturm: [5] mit drei Ersatzteilen.'}</p></aside>
        </div> : <div className="notes-layout"><aside>{NOTES.map((note, i) => <button type="button" key={note.title} disabled={!hud.discovered.includes(i)} aria-pressed={selectedNote === i} onClick={() => setSelectedNote(i)}><small>SEKTOR 0{i + 1}</small>{hud.discovered.includes(i) ? note.title : 'Noch nicht gefunden'}</button>)}</aside><article className="letter">{hud.discovered.includes(selectedNote) ? <><p className="eyebrow">{NOTES[selectedNote].author}</p><h3>{NOTES[selectedNote].title}</h3><p>{NOTES[selectedNote].text}</p><footer>Am Fundort: „{NOTES[selectedNote].graffiti.replaceAll(' / ', ' · ')}“</footer></> : <><h3>Jeder Ort hat eine Stimme.</h3><p>Suche nach hellen Briefen auf Kisten und bemalten Tafeln. Gesammelte Briefe kannst du hier jederzeit wieder lesen.</p></>}</article></div>}
        {journalTab==='notes'&&hud.evidence.length>0&&<div className="evidence-list"><h3>Spuren aus der Oststadt</h3>{DISCOVERIES.filter(n=>hud.evidence.includes(n.id)).map(n=><article key={n.id}><h4>{n.title}</h4><p>{n.text}</p></article>)}{hud.evidence.includes('ben')&&<article><h4>Leas Foto · Ben lebt</h4><p>Ben hat das Waldcamp erreicht. Lea und die Kinder sind mit dem Konvoi in Sicherheit.</p></article>}</div>}
      </section>}

      {location && !dialogue && screen === 'playing' && <section className="location-card"><small>GEBIET BETRETEN</small><h2>{location.name}</h2><p>{location.subtitle}</p></section>}
      {dialogue && screen === 'playing' && <section className="dialogue-subtitles" aria-label="Gespräch" aria-live="polite" aria-atomic="true"><small>{dialogue.speaker}</small><p key={dialogue.index}>{dialogue.lines[dialogue.index]}</p><button type="button" onClick={() => apiRef.current?.nextDialogue()}><kbd>E</kbd> / Leertaste / Enter · {dialogue.index + 1 === dialogue.lines.length ? 'Gespräch beenden' : 'Weiter'} <span>{dialogue.index + 1} / {dialogue.lines.length}</span></button></section>}

      {screen === 'title' && <section className="title-card fps-title">
        <p className="eyebrow">OPEN WORLD SURVIVAL · TANNWALD · 09:00 UHR</p>
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
      {screen === 'shelter' && shelter && shelterState && <section className="overlay-card shelter-card" role="dialog" aria-modal="true" aria-label="Unterschlupf verwalten">
        <p className="eyebrow">UNTERSCHLUPF · TAG {daylightAt(hud.elapsed).day} · {daylightAt(hud.elapsed).clock}</p><h2>{shelter.name}</h2>
        <ul><li>Fenster vernagelt: {shelterState.windows.filter(Boolean).length}/4</li><li>Türen verstärkt: {shelterState.reinforced.filter(Boolean).length}/2 · geschlossen: {shelterState.closed.filter(Boolean).length}/2</li><li>Schlafplatz: {shelterState.bed?'vorbereitet':'1 Ration benötigt'}</li></ul>
        <p>Schließe beide Türen und räume das Haus. Danach kannst du den Ort aktivieren, als Respawnpunkt setzen und nachts bis 06 Uhr schlafen. Quest, Ausrüstung und gesammelte Vorräte bleiben beim Respawn erhalten.</p>
        {notice&&<p className="shelter-notice" role="status">{notice}</p>}
        <div className="shelter-actions">
          {!shelterState.claimed&&<button type="button" disabled={!houseReady(shelterState)} onClick={()=>apiRef.current?.shelter('claim')}>UNTERSCHLUPF AKTIVIEREN</button>}
          {shelterState.claimed&&<button type="button" disabled={!houseReady(shelterState)||hud.respawn===shelter.id} onClick={()=>apiRef.current?.shelter('respawn')}>{hud.respawn===shelter.id?'RESPAWNPUNKT AKTIV':'ALS RESPAWNPUNKT SETZEN'}</button>}
          <button type="button" disabled={!houseProtected(shelterState)||canSleep(hud.elapsed)} onClick={()=>apiRef.current?.shelter('wait')}>BIS 19 UHR WARTEN</button>
          <button type="button" disabled={!houseProtected(shelterState)||!canSleep(hud.elapsed)} onClick={()=>apiRef.current?.shelter('sleep')}>BIS 06 UHR SCHLAFEN</button>
          <button type="button" className="secondary" onClick={resume} autoFocus>ZURÜCK INS SPIEL · ESC</button>
        </div>
      </section>}
      {screen === 'dead' && <section className="overlay-card"><p className="eyebrow danger">ELIAS · SIGNAL VERLOREN</p><h2>Tannwald behält dich.</h2><p>{hud.kills} Infizierte sind gefallen. {hud.respawn?`Dein Unterschlupf: ${SAFEHOUSES.find(h=>h.id===hud.respawn)?.name}. Quest und Ausrüstung bleiben erhalten.`:'Aktiviere einen gesicherten Schlafplatz, um dort wieder aufzuwachen.'}</p>{hud.respawn&&<button type="button" onClick={()=>apiRef.current?.respawn()}>IM UNTERSCHLUPF AUFWACHEN <span>→</span></button>}<button type="button" onClick={start}>MISSION NEU STARTEN <span>↻</span></button></section>}
      {screen === 'won' && <section className="overlay-card win"><p className="eyebrow">{daylightAt(hud.elapsed).clock} UHR · KONVOI EINGETROFFEN</p><h2>Ihr habt es geschafft.</h2><p>Das Gegenmittel ist gesichert. Mara und Noah verlassen Tannwald. {(hud.discovered.includes(4)||hud.evidence.includes('ben')) ? 'Du zeigst Mara den Funkspruch: Lea lebt. Zum ersten Mal seit der Evakuierung lächelt sie.' : 'Mara sucht in jedem Fenster des Konvois nach einer roten Jacke.'} {hud.evidence.includes('archive')?'Auch Falks unterschriebener Abbruchbefehl verlässt mit euch die Stadt.':''}</p><div className="result"><span>{hud.kills}<small>INFIZIERTE</small></span><span>{hud.health}<small>GESUNDHEIT</small></span><span>{hud.discovered.length}/5<small>FUNDSTÜCKE</small></span></div><button type="button" onClick={start}>NOCH EINMAL <span>↻</span></button></section>}
      <footer className="credit">3D-ASSETS & ANIMATIONEN: KENNEY · CC0 · DESKTOP-SPIEL</footer>
    </main>
  );
}
