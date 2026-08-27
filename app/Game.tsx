'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

type Screen = 'title' | 'playing' | 'paused' | 'dead' | 'won';
type Hud = {
  health: number;
  ammo: number;
  reserve: number;
  stamina: number;
  stage: number;
  fuses: number;
  kills: number;
  timer: number;
  prompt: string;
  reloading: boolean;
};

const INITIAL_HUD: Hud = {
  health: 100,
  ammo: 8,
  reserve: 40,
  stamina: 100,
  stage: 0,
  fuses: 0,
  kills: 0,
  timer: 35,
  prompt: '',
  reloading: false,
};

const MISSIONS = [
  ['AKT I · DAS LETZTE SIGNAL', 'Finde 3 Sicherungen für den Funkmast.'],
  ['AKT II · EINE STIMME IM NEBEL', 'Finde Noah beim alten Mausoleum.'],
  ['AKT III · KEIN WEG ZURÜCK', 'Erreiche den Evakuierungspunkt.'],
  ['FINALE · HALTE DIE LINIE', 'Verteidige den Funkmast bis zur Rettung.'],
];

const DIALOGUE = {
  start: ['MARA · FUNK', 'Elias? Wenn du mich hörst: Der Mast ist tot. Drei Sicherungen liegen noch im alten Friedhof. Ohne Signal findet uns niemand.'],
  fuses: ['MARA · FUNK', 'Das Signal steht! Ich höre noch jemanden – beim Mausoleum. Elias, du bist nicht allein da draußen.'],
  survivor: ['NOAH', 'Ich dachte, du wärst einer von ihnen. Die Rettung kommt zum Südtor, aber der Mast muss senden. Bring mich hin.'],
  defend: ['MARA · FUNK', 'Signal gesendet. Etwas hat es ebenfalls gehört. Halte die Stellung – 35 Sekunden!'],
} as const;

const MODEL = '/models/kenney/';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<{ start: () => void; resume: () => void } | null>(null);
  const [screen, setScreen] = useState<Screen>('title');
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [dialogue, setDialogue] = useState<{ speaker: string; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.86;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1110);
    scene.fog = new THREE.FogExp2(0x101816, 0.023);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    camera.position.set(0, 17, 15);

    scene.add(new THREE.HemisphereLight(0xa9c6b2, 0x10140f, 1.7));
    const moon = new THREE.DirectionalLight(0xcde6d5, 3.2);
    moon.position.set(-12, 24, 8);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.left = -25;
    moon.shadow.camera.right = 25;
    moon.shadow.camera.top = 25;
    moon.shadow.camera.bottom = -25;
    scene.add(moon);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(64, 64, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x27332c, roughness: 1, flatShading: true }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3c413d, roughness: 1 });
    const roadA = new THREE.Mesh(new THREE.PlaneGeometry(7, 58), roadMat);
    roadA.rotation.x = -Math.PI / 2;
    roadA.position.y = 0.015;
    roadA.rotation.z = -0.18;
    roadA.receiveShadow = true;
    scene.add(roadA);
    const roadB = roadA.clone();
    roadB.geometry = new THREE.PlaneGeometry(6, 42);
    roadB.rotation.z = Math.PI / 2.55;
    roadB.position.set(-4, 0.02, 3);
    scene.add(roadB);

    const loader = new GLTFLoader();
    const cache = new Map<string, Promise<THREE.Object3D>>();
    const loadModel = (name: string) => {
      if (!cache.has(name)) {
        cache.set(name, new Promise((resolve, reject) => {
          loader.load(`${MODEL}${name}.glb`, (gltf) => resolve(gltf.scene), undefined, reject);
        }));
      }
      return cache.get(name)!;
    };
    const prepare = (object: THREE.Object3D) => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      return object;
    };
    const place = (name: string, x: number, z: number, scale = 1, rotation = 0) => {
      const anchor = new THREE.Group();
      anchor.position.set(x, 0, z);
      anchor.rotation.y = rotation;
      anchor.scale.setScalar(scale);
      scene.add(anchor);
      loadModel(name).then((source) => {
        if (!disposed) anchor.add(prepare(cloneSkeleton(source)));
      }).catch(() => undefined);
      return anchor;
    };

    const player = new THREE.Group();
    player.position.set(-21, 0, -18);
    scene.add(player);
    const playerFallback = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 0.8, 4, 7),
      new THREE.MeshStandardMaterial({ color: 0xd9ff43, flatShading: true }),
    );
    playerFallback.position.y = 0.85;
    playerFallback.castShadow = true;
    player.add(playerFallback);
    loadModel('character-keeper').then((source) => {
      if (disposed) return;
      playerFallback.visible = false;
      const model = prepare(cloneSkeleton(source));
      model.scale.setScalar(1.15);
      player.add(model);
    }).catch(() => undefined);

    const flashlight = new THREE.SpotLight(0xe9ffd0, 0, 18, Math.PI / 5, 0.6, 1.2);
    flashlight.position.set(0, 1.5, 0);
    flashlight.target.position.set(0, 0, 6);
    player.add(flashlight, flashlight.target);

    const npc = place('character-skeleton', -18, 18, 1.05, Math.PI);
    npc.visible = false;

    const extraction = new THREE.Group();
    extraction.position.set(20, 0.08, -20);
    const extractionRing = new THREE.Mesh(
      new THREE.RingGeometry(2.3, 2.65, 32),
      new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    extractionRing.rotation.x = -Math.PI / 2;
    extraction.add(extractionRing);
    const beacon = new THREE.PointLight(0xd9ff43, 0, 14, 2);
    beacon.position.y = 2;
    extraction.add(beacon);
    extraction.visible = false;
    scene.add(extraction);

    const mast = new THREE.Group();
    mast.position.copy(extraction.position);
    const mastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 6, 6), new THREE.MeshStandardMaterial({ color: 0x7c8580 }));
    mastPole.position.y = 3;
    mastPole.castShadow = true;
    mast.add(mastPole);
    for (let i = 0; i < 3; i += 1) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4 - i * 0.5, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0x9ba39e }));
      arm.position.y = 4.6 + i * 0.45;
      arm.rotation.y = i * 1.1;
      mast.add(arm);
    }
    scene.add(mast);

    const fusePositions = [new THREE.Vector3(-17, 0, -4), new THREE.Vector3(7, 0, 16), new THREE.Vector3(18, 0, 4)];
    const fuses = fusePositions.map((position, index) => {
      const group = new THREE.Group();
      group.position.copy(position);
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.32), new THREE.MeshStandardMaterial({ color: 0xd9ff43, emissive: 0x617519, emissiveIntensity: 1.4 }));
      core.position.y = 0.75;
      core.rotation.z = 0.12;
      core.castShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.035, 6, 24), new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.55 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1;
      group.add(core, ring);
      place(index === 1 ? 'box-open' : 'box', position.x, position.z, 1.1, index);
      scene.add(group);
      return { group, collected: false };
    });

    const pickups: { group: THREE.Group; kind: 'ammo' | 'health'; taken: boolean }[] = [];
    const makePickup = (kind: 'ammo' | 'health', x: number, z: number) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      const mesh = new THREE.Mesh(
        kind === 'health' ? new THREE.BoxGeometry(0.65, 0.35, 0.5) : new THREE.BoxGeometry(0.45, 0.28, 0.65),
        new THREE.MeshStandardMaterial({ color: kind === 'health' ? 0xe85757 : 0xe7c268, emissive: kind === 'health' ? 0x601010 : 0x4c3510, emissiveIntensity: 0.6 }),
      );
      mesh.position.y = 0.35;
      mesh.castShadow = true;
      group.add(mesh);
      scene.add(group);
      pickups.push({ group, kind, taken: false });
    };
    makePickup('health', -5, -14);
    makePickup('ammo', 3, 8);
    makePickup('health', 14, 13);
    makePickup('ammo', -13, 11);

    [
      ['crypt-large', -20, 21, 1.35, 0.2], ['tent', -22, -13, 1.4, 0.7],
      ['campfire-pit', -20, -10, 1.15, 0], ['chest', -16, -14, 1.1, 0.4],
      ['signpost', -11, -1, 1.25, -0.4], ['coffin', 11, 12, 1.1, 0.7],
      ['fire-basket', 19, -18, 1.15, 0], ['fire-basket', 22, -18, 1.15, 0],
      ['barrel', 17, -22, 1, 0], ['resource-planks', 23, -22, 1.2, 0.3],
    ].forEach(([name, x, z, scale, rotation]) => place(name as string, x as number, z as number, scale as number, rotation as number));

    const decor = [
      ['pine', -27, -22, 1.5], ['pine-crooked', -25, -5, 1.25], ['pine', -27, 14, 1.45],
      ['pine-crooked', -11, 27, 1.3], ['pine', 5, 27, 1.5], ['pine', 25, 21, 1.4],
      ['pine-crooked', 27, 4, 1.25], ['pine', 27, -13, 1.5], ['pine', 7, -27, 1.5],
      ['pine-crooked', -10, -27, 1.3], ['rocks', -11, 20, 1.2], ['rocks', 17, 15, 1],
      ['gravestone-round', -12, 15, 1.05], ['gravestone-bevel', -8, 18, 1],
      ['gravestone-cross', -5, 14, 1.05], ['gravestone-broken', 1, 18, 1.1],
      ['gravestone-round', 5, 13, 1], ['gravestone-cross', 10, 19, 1],
      ['lightpost-single', -11, -5, 1.25], ['lightpost-single', 9, 3, 1.25],
    ];
    decor.forEach(([name, x, z, scale], i) => place(name as string, x as number, z as number, scale as number, i * 0.73));
    for (let i = -25; i <= 25; i += 5) {
      if (Math.abs(i) > 7) {
        place('fence', i, 25, 1, Math.PI / 2);
        place('fence', i, -25, 1, Math.PI / 2);
      }
    }

    const keys = new Set<string>();
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const aimPoint = new THREE.Vector3(0, 0, 1);
    const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const clock = new THREE.Clock();
    const enemies: { group: THREE.Group; health: number; speed: number; attack: number; alive: boolean }[] = [];
    const tracers: { line: THREE.Line; life: number }[] = [];
    let runtime = { ...INITIAL_HUD, active: false, spawn: 2, elapsed: 0, hudTick: 0, invulnerable: 0, reloadLeft: 0, dialogue: 0 };
    let disposed = false;
    let animation = 0;

    const showDialogue = (entry: readonly [string, string]) => {
      setDialogue({ speaker: entry[0], text: entry[1] });
      runtime.dialogue = 5.5;
    };

    const spawnEnemy = () => {
      if (enemies.filter((enemy) => enemy.alive).length >= 18) return;
      const angle = Math.random() * Math.PI * 2;
      const distance = 19 + Math.random() * 9;
      const group = new THREE.Group();
      group.position.set(
        THREE.MathUtils.clamp(player.position.x + Math.cos(angle) * distance, -28, 28),
        0,
        THREE.MathUtils.clamp(player.position.z + Math.sin(angle) * distance, -28, 28),
      );
      const fallback = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.75, 3, 6), new THREE.MeshStandardMaterial({ color: 0x759442, flatShading: true }));
      fallback.position.y = 0.8;
      fallback.castShadow = true;
      group.add(fallback);
      scene.add(group);
      const enemy = { group, health: runtime.stage >= 3 ? 3 : 2, speed: 1.35 + Math.random() * 0.75 + runtime.stage * 0.09, attack: 0, alive: true };
      enemies.push(enemy);
      loadModel(Math.random() > 0.18 ? 'character-zombie' : 'character-skeleton').then((source) => {
        if (disposed || !enemy.alive) return;
        fallback.visible = false;
        const model = prepare(cloneSkeleton(source));
        model.scale.setScalar(0.92 + Math.random() * 0.16);
        group.add(model);
      }).catch(() => undefined);
    };

    const removeEnemy = (enemy: (typeof enemies)[number]) => {
      enemy.alive = false;
      scene.remove(enemy.group);
      enemy.group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry.type === 'CapsuleGeometry') child.geometry.dispose();
      });
    };

    const reload = () => {
      if (!runtime.active || runtime.reloading || runtime.ammo >= 8 || runtime.reserve <= 0) return;
      runtime.reloading = true;
      runtime.reloadLeft = 1.15;
    };

    const shoot = () => {
      if (!runtime.active || runtime.reloading) return;
      if (runtime.ammo <= 0) {
        reload();
        return;
      }
      runtime.ammo -= 1;
      const origin = player.position.clone().add(new THREE.Vector3(0, 0.85, 0));
      const direction = aimPoint.clone().sub(player.position).setY(0).normalize();
      let hit: (typeof enemies)[number] | undefined;
      let hitDistance = 24;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const toEnemy = enemy.group.position.clone().sub(player.position).setY(0);
        const along = toEnemy.dot(direction);
        const side = toEnemy.clone().sub(direction.clone().multiplyScalar(along)).length();
        if (along > 0 && along < hitDistance && side < 0.85) {
          hit = enemy;
          hitDistance = along;
        }
      }
      const end = player.position.clone().add(direction.multiplyScalar(hitDistance)).setY(0.8);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([origin, end]),
        new THREE.LineBasicMaterial({ color: 0xf3e2a1, transparent: true, opacity: 0.9 }),
      );
      scene.add(line);
      tracers.push({ line, life: 0.08 });
      if (hit) {
        hit.health -= 1;
        if (hit.health <= 0) {
          removeEnemy(hit);
          runtime.kills += 1;
        }
      }
    };

    const interact = () => {
      if (!runtime.active) return;
      if (runtime.stage === 0) {
        const fuse = fuses.find((item) => !item.collected && item.group.position.distanceTo(player.position) < 2.2);
        if (fuse) {
          fuse.collected = true;
          fuse.group.visible = false;
          runtime.fuses += 1;
          if (runtime.fuses === 3) {
            runtime.stage = 1;
            npc.visible = true;
            showDialogue(DIALOGUE.fuses);
          }
        }
      } else if (runtime.stage === 1 && player.position.distanceTo(npc.position) < 2.6) {
        runtime.stage = 2;
        extraction.visible = true;
        beacon.intensity = 22;
        showDialogue(DIALOGUE.survivor);
      } else if (runtime.stage === 2 && player.position.distanceTo(extraction.position) < 3.3) {
        runtime.stage = 3;
        runtime.timer = 35;
        showDialogue(DIALOGUE.defend);
      }
    };

    const reset = () => {
      enemies.forEach(removeEnemy);
      enemies.length = 0;
      tracers.forEach((tracer) => scene.remove(tracer.line));
      tracers.length = 0;
      player.position.set(-21, 0, -18);
      fuses.forEach((fuse) => { fuse.collected = false; fuse.group.visible = true; });
      pickups.forEach((pickup) => { pickup.taken = false; pickup.group.visible = true; });
      npc.visible = false;
      extraction.visible = false;
      beacon.intensity = 0;
      runtime = { ...INITIAL_HUD, active: true, spawn: 1.2, elapsed: 0, hudTick: 0, invulnerable: 0, reloadLeft: 0, dialogue: 0 };
      setHud(INITIAL_HUD);
      setScreen('playing');
      showDialogue(DIALOGUE.start);
      canvas.focus();
    };

    controlsRef.current = {
      start: reset,
      resume: () => { runtime.active = true; setScreen('playing'); canvas.focus(); },
    };

    const onKeyDown = (event: KeyboardEvent) => {
      keys.add(event.code);
      if (event.code === 'KeyE' && !event.repeat) interact();
      if (event.code === 'KeyR' && !event.repeat) reload();
      if (event.code === 'KeyF' && !event.repeat) flashlight.intensity = flashlight.intensity > 0 ? 0 : 28;
      if (event.code === 'Escape' && !event.repeat) {
        if (runtime.active) { runtime.active = false; setScreen('paused'); }
        else {
          setScreen((current) => {
            if (current === 'paused') { runtime.active = true; return 'playing'; }
            return current;
          });
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 0 && runtime.active && event.pointerType !== 'touch') shoot();
    };
    const onResize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    onResize();

    Promise.all(['character-keeper', 'character-zombie', 'crypt-large', 'gravestone-round', 'pine'].map(loadModel))
      .then(() => { if (!disposed) setLoaded(true); })
      .catch(() => { if (!disposed) setLoaded(true); });

    const animate = () => {
      animation = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      runtime.elapsed += dt;

      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(aimPlane, aimPoint);

      const aimDirection = aimPoint.clone().sub(player.position).setY(0);
      if (aimDirection.lengthSq() > 0.01) player.rotation.y = Math.atan2(aimDirection.x, aimDirection.z);

      if (runtime.active) {
        const move = new THREE.Vector3(
          Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')),
          0,
          Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')),
        );
        const sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && runtime.stamina > 0 && move.lengthSq() > 0;
        if (move.lengthSq() > 0) {
          move.normalize().multiplyScalar((sprinting ? 7.2 : 4.5) * dt);
          player.position.add(move);
          player.position.x = THREE.MathUtils.clamp(player.position.x, -28.5, 28.5);
          player.position.z = THREE.MathUtils.clamp(player.position.z, -28.5, 28.5);
        }
        runtime.stamina = THREE.MathUtils.clamp(runtime.stamina + (sprinting ? -30 : 19) * dt, 0, 100);
        runtime.invulnerable = Math.max(0, runtime.invulnerable - dt);

        if (runtime.reloading) {
          runtime.reloadLeft -= dt;
          if (runtime.reloadLeft <= 0) {
            const needed = 8 - runtime.ammo;
            const loadedAmmo = Math.min(needed, runtime.reserve);
            runtime.ammo += loadedAmmo;
            runtime.reserve -= loadedAmmo;
            runtime.reloading = false;
          }
        }

        runtime.spawn -= dt;
        if (runtime.spawn <= 0) {
          spawnEnemy();
          runtime.spawn = runtime.stage === 3 ? 0.85 + Math.random() * 0.8 : 2.4 + Math.random() * 2.4;
        }

        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          const delta = player.position.clone().sub(enemy.group.position).setY(0);
          const distance = delta.length();
          if (distance > 1.05) enemy.group.position.add(delta.normalize().multiplyScalar(enemy.speed * dt));
          enemy.group.rotation.y = Math.atan2(delta.x, delta.z);
          enemy.attack -= dt;
          if (distance < 1.35 && enemy.attack <= 0 && runtime.invulnerable <= 0) {
            runtime.health -= runtime.stage === 3 ? 12 : 9;
            runtime.invulnerable = 0.45;
            enemy.attack = 0.8;
            if (runtime.health <= 0) {
              runtime.health = 0;
              runtime.active = false;
              setDialogue(null);
              setScreen('dead');
            }
          }
        }

        pickups.forEach((pickup) => {
          if (pickup.taken) return;
          pickup.group.rotation.y += dt * 1.4;
          pickup.group.position.y = Math.sin(runtime.elapsed * 2.5) * 0.08;
          if (pickup.group.position.distanceTo(player.position) < 1.2) {
            if (pickup.kind === 'health' && runtime.health < 100) runtime.health = Math.min(100, runtime.health + 35);
            else if (pickup.kind === 'ammo') runtime.reserve += 20;
            else return;
            pickup.taken = true;
            pickup.group.visible = false;
          }
        });

        fuses.forEach((fuse, index) => {
          if (!fuse.collected) {
            fuse.group.rotation.y += dt * 0.8;
            fuse.group.position.y = Math.sin(runtime.elapsed * 2 + index) * 0.09;
          }
        });
        extractionRing.rotation.z += dt * 0.35;
        beacon.intensity = extraction.visible ? 18 + Math.sin(runtime.elapsed * 4) * 4 : 0;

        if (runtime.stage === 3) {
          runtime.timer = Math.max(0, runtime.timer - dt);
          if (runtime.timer <= 0) {
            runtime.active = false;
            setDialogue(null);
            setScreen('won');
          }
        }

        let prompt = '';
        if (runtime.stage === 0 && fuses.some((fuse) => !fuse.collected && fuse.group.position.distanceTo(player.position) < 2.2)) prompt = '[E] SICHERUNG NEHMEN';
        if (runtime.stage === 1 && player.position.distanceTo(npc.position) < 2.6) prompt = '[E] MIT NOAH SPRECHEN';
        if (runtime.stage === 2 && player.position.distanceTo(extraction.position) < 3.3) prompt = '[E] SIGNAL SENDEN';
        runtime.prompt = prompt;

        if (runtime.dialogue > 0) {
          runtime.dialogue -= dt;
          if (runtime.dialogue <= 0) setDialogue(null);
        }
        runtime.hudTick -= dt;
        if (runtime.hudTick <= 0) {
          setHud({
            health: Math.round(runtime.health), ammo: runtime.ammo, reserve: runtime.reserve,
            stamina: Math.round(runtime.stamina), stage: runtime.stage, fuses: runtime.fuses,
            kills: runtime.kills, timer: Math.ceil(runtime.timer), prompt: runtime.prompt, reloading: runtime.reloading,
          });
          runtime.hudTick = 0.08;
        }
      }

      tracers.forEach((tracer) => {
        tracer.life -= dt;
        const material = tracer.line.material as THREE.LineBasicMaterial;
        material.opacity = Math.max(0, tracer.life * 12);
      });
      for (let i = tracers.length - 1; i >= 0; i -= 1) {
        if (tracers[i].life <= 0) {
          scene.remove(tracers[i].line);
          (tracers[i].line.geometry as THREE.BufferGeometry).dispose();
          (tracers[i].line.material as THREE.Material).dispose();
          tracers.splice(i, 1);
        }
      }

      const desiredCamera = player.position.clone().add(new THREE.Vector3(0, 16.5, 14));
      camera.position.lerp(desiredCamera, 1 - Math.pow(0.002, dt));
      const lookAt = player.position.clone().add(new THREE.Vector3(0, 0, -1.2));
      camera.lookAt(lookAt);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      controlsRef.current = null;
      cancelAnimationFrame(animation);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material?.dispose());
        }
      });
    };
  }, []);

  const start = useCallback(() => controlsRef.current?.start(), []);
  const resume = useCallback(() => controlsRef.current?.resume(), []);
  const pressKey = (code: string, pressed: boolean) => {
    window.dispatchEvent(new KeyboardEvent(pressed ? 'keydown' : 'keyup', { code }));
  };

  return (
    <main className="game-shell">
      <canvas ref={canvasRef} className="game-canvas" tabIndex={0} aria-label="Nachtwache Spielfeld" />
      <div className="grain" aria-hidden="true" />

      {screen === 'playing' && (
        <div className="hud" aria-live="polite">
          <section className="status-panel">
            <div className="portrait">E</div>
            <div className="bars">
              <div className="bar-label"><span>GESUNDHEIT</span><b>{hud.health}</b></div>
              <div className="bar"><i className="health" style={{ width: `${hud.health}%` }} /></div>
              <div className="bar-label"><span>AUSDAUER</span><b>{hud.stamina}</b></div>
              <div className="bar small"><i className="stamina" style={{ width: `${hud.stamina}%` }} /></div>
            </div>
          </section>

          <section className="mission-panel">
            <small>{MISSIONS[hud.stage][0]}</small>
            <strong>{MISSIONS[hud.stage][1]}</strong>
            {hud.stage === 0 && <span className="mission-count">{hud.fuses} / 3</span>}
            {hud.stage === 3 && <span className="mission-count timer">00:{String(hud.timer).padStart(2, '0')}</span>}
          </section>

          <section className="ammo-panel">
            <small>{hud.reloading ? 'NACHLADEN…' : 'PISTOLE · 9 MM'}</small>
            <div><b>{String(hud.ammo).padStart(2, '0')}</b><span>/ {hud.reserve}</span></div>
            <em>{hud.kills} BEDROHUNGEN BESEITIGT</em>
          </section>

          <div className="crosshair" aria-hidden="true"><span /><span /></div>
          {hud.prompt && <div className="interaction-prompt">{hud.prompt}</div>}
        </div>
      )}

      {dialogue && screen === 'playing' && (
        <section className="radio-message">
          <div className="signal-bars"><i /><i /><i /><i /></div>
          <div><small>{dialogue.speaker}</small><p>{dialogue.text}</p></div>
        </section>
      )}

      {screen === 'title' && (
        <section className="title-card">
          <p className="eyebrow">TANNWALD · 03:17 UHR</p>
          <h1>NACHT<span>WACHE</span></h1>
          <p className="tagline">Die Sirenen sind verstummt. Dein Funkgerät nicht.</p>
          <button type="button" onClick={start} disabled={!loaded}>{loaded ? 'NACHT BEGINNEN' : 'WELT WIRD GELADEN…'} <span>→</span></button>
          <div className="controls"><b>WASD</b> Bewegen <b>MAUS</b> Zielen / Schießen <b>E</b> Interagieren <b>R</b> Nachladen <b>F</b> Licht</div>
          <p className="story-hook">Du bist Elias Voss, der letzte Ranger von Tannwald. Stelle das Funksignal wieder her, finde den unbekannten Überlebenden – und entscheide, wie lange du für eine Stadt kämpfst, die bereits aufgegeben wurde.</p>
        </section>
      )}

      {screen === 'paused' && (
        <section className="overlay-card compact"><p className="eyebrow">SPIEL PAUSIERT</p><h2>Hol Luft.</h2><button type="button" onClick={resume}>WEITERSPIELEN <span>→</span></button></section>
      )}
      {screen === 'dead' && (
        <section className="overlay-card"><p className="eyebrow danger">SIGNAL VERLOREN</p><h2>Die Nacht war schneller.</h2><p>Du hast {hud.kills} Infizierte aufgehalten. Tannwald wartet noch immer auf sein letztes Signal.</p><button type="button" onClick={start}>NOCH EIN VERSUCH <span>→</span></button></section>
      )}
      {screen === 'won' && (
        <section className="overlay-card win"><p className="eyebrow">05:42 UHR · SIGNAL BESTÄTIGT</p><h2>Der Morgen findet euch.</h2><p>Noah erreicht den Konvoi. Mara hält ihr Versprechen. Hinter euch bleibt Tannwald still – aber zum ersten Mal seit Tagen klingt das Schweigen nicht wie ein Ende.</p><div className="result"><span>{hud.kills}<small>INFIZIERTE</small></span><span>{hud.health}<small>GESUNDHEIT</small></span></div><button type="button" onClick={start}>NACHT WIEDERHOLEN <span>↻</span></button></section>
      )}

      <div className="mobile-controls" aria-label="Touch-Steuerung">
        <div className="dpad">
          <button aria-label="Vorwärts" onPointerDown={() => pressKey('KeyW', true)} onPointerUp={() => pressKey('KeyW', false)}>▲</button>
          <button aria-label="Links" onPointerDown={() => pressKey('KeyA', true)} onPointerUp={() => pressKey('KeyA', false)}>◀</button>
          <button aria-label="Rückwärts" onPointerDown={() => pressKey('KeyS', true)} onPointerUp={() => pressKey('KeyS', false)}>▼</button>
          <button aria-label="Rechts" onPointerDown={() => pressKey('KeyD', true)} onPointerUp={() => pressKey('KeyD', false)}>▶</button>
        </div>
        <button className="touch-interact" onClick={() => pressKey('KeyE', true)}>E</button>
        <button className="touch-fire" onClick={() => canvasRef.current?.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }))}>FEUER</button>
      </div>

      <footer className="credit">3D-MODELLE: KENNEY · CC0</footer>
    </main>
  );
}
