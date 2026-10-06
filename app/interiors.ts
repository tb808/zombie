import * as THREE from 'three';
import type { Obstacle } from './survival.ts';
import type { LootKind } from './world.ts';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { surfaceMaterial } from './surfaces.ts';

export type InteriorKind = 'pharmacy' | 'bakery' | 'cafe' | 'laundry' | 'electronics' | 'office' | 'apartment' | 'practice';
export const INTERIOR_PLACES = [
  { id: 'pharmacy', name: 'APOTHEKE · AM RING', kind: 'pharmacy', x: 137, z: -72, color: 0x748d83, story: 'Verkaufsraum, Rezeptur und Medikamentenlager. Die letzte Lieferung wurde nie abgeholt.' },
  { id: 'practice', name: 'PRAXIS · DR. KELLER', kind: 'practice', x: 198, z: -72, color: 0x8c9b96, story: 'Wartezimmer, Behandlung und Personalraum. Eine Untersuchung blieb unvollendet.' },
  { id: 'bakery', name: 'BÄCKEREI · MORGENROT', kind: 'bakery', x: 137, z: -20, color: 0xab9272, story: 'Verkauf, Backstube und Vorratsraum. Mehlspuren führen zum Hinterausgang.' },
  { id: 'electronics', name: 'ELEKTRO · FUNK & TECHNIK', kind: 'electronics', x: 198, z: -20, color: 0x6c8190, story: 'Laden, Reparaturplatz und Teilelager. Zwischen kaputten Radios liegen brauchbare Batterien.' },
  { id: 'cafe', name: 'CAFÉ · ZUR LINDE', kind: 'cafe', x: 137, z: 30, color: 0x987766, story: 'Gastraum, Küche und Lager. Kalter Kaffee und ein hastig verlassener Frühstückstisch.' },
  { id: 'apartment', name: 'WOHNUNG · FAMILIE SEIDEL', kind: 'apartment', x: 198, z: 30, color: 0x878974, story: 'Wohnküche, Wohnzimmer und Schlafzimmer mit Waschbereich. Die Koffer stehen noch bereit.' },
  { id: 'laundry', name: 'WASCHSALON · SAUBER & KLAR', kind: 'laundry', x: 137, z: 80, color: 0x7f9390, story: 'Waschraum, Faltplatz und Technikraum. Die Maschinen stoppten mitten im Programm.' },
  { id: 'office', name: 'POST & VERWALTUNG · OST', kind: 'office', x: 198, z: 84, color: 0x8a8174, story: 'Schalterhalle, Büros und Archiv. Nicht zugestellte Briefe erzählen von den letzten Stunden.' },
].map(p => ({ ...p, kind: p.kind as InteriorKind, hx: 4, hz: 9 }));

const supplies: Record<InteriorKind, readonly [LootKind, number][]> = {
  pharmacy: [['medkit', 1], ['antibiotic', 1], ['water', 1]],
  practice: [['medkit', 1], ['antibiotic', 1], ['battery', 1]],
  bakery: [['ration', 2], ['water', 1], ['planks', 2]],
  electronics: [['battery', 2], ['scrap', 2], ['flare', 1]],
  cafe: [['water', 1], ['ration', 1], ['medkit', 1]],
  apartment: [['ration', 1], ['battery', 1], ['ammo', 12]],
  laundry: [['water', 1], ['scrap', 1], ['planks', 2]],
  office: [['battery', 1], ['scrap', 1], ['ammo', 12]],
};
// Supplies sit in open floor crates beside the aisle, clear of solid furniture.
export const INTERIOR_LOOT = INTERIOR_PLACES.flatMap(p => supplies[p.kind].map(([kind, count], i) => ({
  kind, count, x: p.x + (i === 1 ? -1.25 : 1.25), z: p.z + [6, 0, -6][i], y: .48,
})));

const letters: Record<InteriorKind, [string, string]> = {
  pharmacy: ['Nicht abgeholtes Rezept', 'Frau Seidel: Die Medikamente für Ihren Vater liegen im hinteren Lager. Sollte ich nicht mehr hier sein, nehmen Sie sie bitte mit. Die Schule nimmt noch Menschen auf. — Eva, Apotheke am Ring'],
  practice: ['Die letzte Sprechstunde', 'Ich habe die Behandlung abgebrochen und die Patienten zu St. Anna geschickt. Fieber und ungewöhnlich empfindliches Gehör treten gemeinsam auf. Das ist keine gewöhnliche Grippe. Die Antibiotika bleiben für die Verletzten hier. — Dr. Keller'],
  bakery: ['Brot für die Schule', 'Die zweite Ladung Brot ist für die Kinder im Schulhof. Die Öfen sind ausgeschaltet, der Hinterausgang bleibt offen. Wer später kommt: Im Vorratsraum stehen noch Konserven. Bitte nehmt nur, was ihr tragen könnt. — Emil'],
  electronics: ['Reparaturauftrag 07', 'Lenz, die Batterien sind geprüft. Die Sicherung für deinen Generator liegt weiterhin in deiner Werkstatt. Ich konnte nur das Radio reparieren: Konvoi 2 sendet noch. Die Ersatzteile hier gehören jetzt allen. — Rudi'],
  cafe: ['Tisch sechs bleibt frei', 'Wir haben bis zum letzten Bus gewartet. Deine Tasse steht noch am Fenster. Nora führt uns zum Waldcamp am Birkenrain. Wenn du zurückkommst, folge dem Weg westlich der Stadt. — Lina'],
  apartment: ['Seidels Abschiedsbrief', 'Papa, wir nehmen die Fotos mit. Dein Mantel hängt im Flur und die Medikamente sind in der Apotheke am Ring bestellt. Wir gehen zuerst zur Schule. Bitte suche uns dort. Das Radio hat aufgehört zu sprechen. — Mia'],
  laundry: ['Stromabschaltung', 'Hauptschalter aus, Zulauf schließen. Die Wäsche gehört den Familien aus dem Lindenhof; lasst sie bitte liegen. Im Technikraum sind noch trockene Bretter und Teile für eine Reparatur. Ich gehe zur Feuerwache. — Jürg'],
  office: ['Unzustellbare Sendungen', 'Die Adressen im Evakuierungsgebiet sind nicht mehr erreichbar. Bringt die Briefe zur Schule, statt sie zu vernichten. Zwischen all den amtlichen Formularen stehen Menschen, die auf eine Antwort warten. — Poststelle Ost'],
};
export const INTERIOR_DISCOVERIES = INTERIOR_PLACES.map(p => ({
  id: `${p.id}-letter`, x: p.x, z: p.z - 6.8, y: .88, title: letters[p.kind][0], text: letters[p.kind][1],
}));

type Board = (text: string, x: number, z: number, color?: string, graffiti?: boolean) => THREE.Mesh;
type Surface = 'wood' | 'tile' | 'plaster' | 'fabric' | 'brick';

export function buildInteriors(scene: THREE.Scene, height: (x: number, z: number) => number, obstacles: Obstacle[], board: Board) {
  const chunks: { group: THREE.Group; x: number; z: number }[] = [];
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const tintedGeometry = new Map<string, THREE.BufferGeometry>();
  const material = (color: number, surface?: Surface, glow = 0) => {
    const metallic = color === 0x777e7b;
    const key = `${surface}:${metallic}:${glow}:${glow ? color : 0}`;
    if (!materials.has(key)) {
      materials.set(key, surfaceMaterial(surface??(metallic?'metal':'plaster'),0xffffff,{vertexColors:true,
        roughness:surface==='tile'?.52:.86,metalness:metallic?.55:0,emissive:glow?color:0,emissiveIntensity:glow}));
    }
    return materials.get(key)!;
  };
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xa9b9bd, roughness: .12, clearcoat:1, transparent: true, opacity: .18, depthWrite: false });
  const cube = new RoundedBoxGeometry(1, 1, 1,2,.016);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 24);
  const torus = new THREE.TorusGeometry(.32, .065, 8, 32);
  const sphere = new THREE.SphereGeometry(1, 20, 12);
  for (const p of INTERIOR_PLACES) {
    const group = new THREE.Group(); group.name = `interior-${p.id}`;
    // Keep finished floors just above the terrain to avoid overlapping surfaces.
    group.position.set(p.x, height(p.x, p.z) + .075, p.z); scene.add(group); chunks.push({ group, x: p.x, z: p.z });
    const part = (geometry: THREE.BufferGeometry, x: number, y: number, z: number, w: number, h: number, d: number, color: number, surface?: Surface, glow = 0) => {
      // Vertex colors retain every prop's palette while allowing one draw batch
      // per surface, rather than a separate draw call for every paint color.
      const key = `${geometry.uuid}:${color}`;
      if (!tintedGeometry.has(key)) {
        const tinted = geometry.clone(), rgb = new THREE.Color(color), values = new Float32Array(tinted.getAttribute('position').count * 3);
        for (let i = 0; i < values.length; i += 3) { values[i] = rgb.r; values[i + 1] = rgb.g; values[i + 2] = rgb.b; }
        tinted.setAttribute('color', new THREE.BufferAttribute(values, 3)); tintedGeometry.set(key, tinted);
      }
      const mesh = new THREE.Mesh(tintedGeometry.get(key)!, material(color, surface, glow));
      mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = h > .12; mesh.receiveShadow = true; group.add(mesh); return mesh;
    };
    const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: number, solid = false, surface?: Surface, glow = 0) => {
      const mesh = part(cube, x, y, z, w, h, d, color, surface, glow);
      if (solid) obstacles.push({ x: p.x + x, z: p.z + z, hx: w / 2, hz: d / 2 });
      return mesh;
    };
    const round = (x: number, y: number, z: number, radius: number, h: number, color: number) => part(cylinder, x, y, z, radius, h, radius, color);
    const wall = 0xc7c3b3, trim = 0x635b4d, metal = 0x777e7b, ink = 0x283738;
    const timber = p.kind === 'apartment' || p.kind === 'cafe' || p.kind === 'office';
    box(0, -.06, 0, 8, .12, 18, timber ? 0x94724d : 0xc0c5bb, false, timber ? 'wood' : 'tile');
    // Side windows are real holes in the visible walls; their sills retain collision.
    for (const side of [-1, 1]) {
      const x = side * 3.86;
      obstacles.push({ x: p.x + x, z: p.z, hx: .14, hz: 9 });
      for (const [z, length] of [[-8.1, 1.8], [-3, 3.6], [3, 3.6], [8.1, 1.8]]) box(x, 1.65, z, .28, 3.3, length, wall, false, 'plaster');
      for (const z of [-6, 0, 6]) {
        box(x, .46, z, .28, .92, 2.4, wall, false, 'plaster'); box(x, 2.98, z, .28, .64, 2.4, wall);
        const pane = new THREE.Mesh(cube, glass); pane.position.set(x, 1.8, z); pane.scale.set(.035, 1.72, 2.24); group.add(pane);
        for (const dz of [-1.15, 0, 1.15]) box(x, 1.8, z + dz, .36, 1.85, .055, trim);
        for (const y of [.94, 1.8, 2.66]) box(x, y, z, .36, .055, 2.4, trim);
        box(x - side * .12, .9, z, .55, .1, 2.6, 0xc6c1ad);
        if(p.kind === 'apartment') {
          round(x - side * .26, 2.8, z, .025, 2.8, trim).rotation.x = Math.PI / 2;
          for(const dz of [-1.07, 1.07])box(x - side * .25, 1.8, z + dz, .06, 1.85, .34, 0xb7a17d, false, 'fabric');
        }
        box(x - side * .2, .42, z, .22, .62, 1.35, 0x9eaaa4);
        for (let i = 0; i < 9; i++) box(x - side * .33, .42, z - .6 + i * .15, .025, .53, .045, 0x6a7670);
      }
      box(side * 3.68, .09, 0, .07, .18, 17.6, trim);
    }
    for (const z of [-8.86, 8.86, -3.1, 3.1]) {
      const exterior = Math.abs(z) > 8, color = exterior ? p.color : wall;
      for (const side of [-1, 1]) {
        box(side * 2.48, 1.65, z, 2.72, 3.3, .24, color, true, 'plaster');
        box(side * 1.13, 1.35, z, .1, 2.7, .34, trim);
        box(side * 2.48, .09, z + .14, 2.6, .18, .04, trim);
      }
      box(0, 2.98, z, 2.24, .64, .24, color); box(0, 2.65, z, 2.32, .08, .34, trim);
      box(0, .015, z, 2.2, .03, .34, metal);
      // Open door leaves rest against the jamb, outside the traversable doorway.
      box(-1.32, 1.3, z + .55, .08, 2.55, 1.1, exterior ? 0x465c59 : 0x897354);
      round(-1.24, 1.1, z + .92, .04, .11, metal);
    }
    box(0, 3.36, 0, 8.2, .12, 18.2, 0xcecabb, false, 'plaster');
    // Preserve the street silhouette, with inaccessible upper floors above the ceiling.
    const upperHeight = p.kind === 'apartment' || p.kind === 'office' ? 5.2 : 3;
    box(0, 3.5 + upperHeight / 2, 0, 8, upperHeight, 18, p.color, false, ['cafe','bakery','office'].includes(p.kind)?'brick':'plaster');
    box(0, 3.5 + upperHeight, 0, 8.5, .25, 18.5, 0x414e4b);
    for (const side of [-1, 1]) for (const z of [-6, -2, 2, 6]) for (let y = 4.8; y < 3.5 + upperHeight; y += 2.7) {
      box(side * 4.02, y, z, .055, 1.5, 1.4, ink); box(side * 4.055, y, z, .025, 1.25, 1.15, 0x8faaa6);
    }
    box(0, 2.9, 9.25, 6.4, .12, 1, p.color); // entrance canopy
    const sign = board(p.name, p.x, p.z + 9.12, '#eee2bb'); sign.position.y = group.position.y + 2.96;

    const chair = (x: number, z: number, color = 0x65776e, facing = 1) => {
      box(x, .46, z, .7, .13, .7, color, true, 'fabric'); box(x, .87, z + facing * .3, .7, .75, .1, color, false, 'fabric');
      for (const dx of [-.25, .25]) for (const dz of [-.25, .25]) box(x + dx, .22, z + dz, .05, .44, .05, metal);
    };
    const table = (x: number, z: number, w = 1.45, d = 1.15) => {
      box(x, .77, z, w, .1, d, 0x96784f, true, 'wood');
      for (const dx of [-w / 2 + .1, w / 2 - .1]) for (const dz of [-d / 2 + .1, d / 2 - .1]) box(x + dx, .37, z + dz, .075, .74, .075, trim);
    };
    const cabinet = (x: number, z: number, w = 1.4, d = .65, color = 0x91a59a) => {
      box(x, .49, z, w, .98, d, color, true); box(x, 1.02, z, w + .06, .08, d + .07, 0xd4d2be);
      for (const dx of [-w / 4, w / 4]) {
        box(x + dx, .47, z + d / 2 + .012, w / 2 - .025, .86, .035, color);
        box(x + dx, .79, z + d / 2 + .05, .2, .035, .06, metal);
      }
    };
    const shelving = (x: number, z: number, medical = false) => {
      box(x, 1.13, z, 1.4, 2.26, .65, 0x635f50, true, 'wood');
      for (const y of [.42, 1, 1.58, 2.16]) {
        box(x, y, z + .37, 1.4, .065, .75, 0xab9b78);
        for (let n = 0; n < 4; n++) {
          if ((n + Math.round(y * 10)) % 5 === 0) continue;
          box(x - .5 + n * .32, y + .19, z + .34, .22, .3, .28, medical ? [0xd5dbc8, 0x8faeb6, 0xb6a4bc, 0xd4c398][n] : [0xc4a372, 0x7a9585, 0xb6b7a2, 0x9d7863][n]);
          box(x - .5 + n * .32, y + .18, z + .49, .15, .1, .012, 0xe5ddc4);
        }
      }
    };
    const cup = (x: number, z: number, y = .89) => {
      round(x, y, z, .085, .16, 0xe1d9c3); round(x, y + .082, z, .065, .004, 0x4c3726);
      const handle = part(torus, x + .09, y, z, .13, .13, .13, 0xe1d9c3); handle.rotation.y = Math.PI / 2;
    };
    const sink = (x: number, z: number) => {
      cabinet(x, z); box(x, 1.067, z, .77, .014, .46, metal); box(x, 1.076, z, .6, .012, .31, ink);
      round(x, 1.2, z - .23, .025, .3, metal); box(x, 1.35, z - .12, .05, .04, .25, metal);
      box(x + .5, 1.19, z, .13, .22, .13, 0x869dba);
    };
    const desk = (x: number, z: number) => {
      table(x, z, 1.65, 1.2); box(x, 1.12, z - .27, .7, .44, .08, ink);
      box(x, 1.12, z - .22, .62, .35, .015, 0x607576); box(x, .87, z - .26, .06, .15, .08, metal);
      box(x, .84, z + .17, .56, .035, .18, 0x535d59);
      for (let i = 0; i < 5; i++) box(x - .22 + i * .11, .86, z + .17, .065, .018, .12, 0x969b91);
      box(x + .56, .86, z + .22, .24, .055, .32, 0xe1dbc7); chair(x, z + 1, 0x5f716e);
    };
    const fridge = (x: number, z: number) => {
      box(x, .96, z, 1.05, 1.92, .9, 0xbcc5b9, true);
      box(x, 1.45, z + .46, .96, .85, .05, 0xd5d7c7); box(x, .55, z + .46, .96, .87, .05, 0xd5d7c7);
      for (const y of [.83, 1.28]) box(x - .36, y, z + .51, .05, .24, .05, metal);
      box(x + .2, 1.52, z + .5, .26, .3, .015, 0xd0bc81);
    };
    const cooker = (x: number, z: number) => {
      cabinet(x, z, 1.2, .9, metal); box(x, .52, z + .47, .93, .55, .04, ink);
      for (const dx of [-.31, .31]) for (const dz of [-.23, .23]) round(x + dx, 1.071, z + dz, .18, .02, ink);
      for (let i = 0; i < 4; i++) round(x - .4 + i * .27, .88, z + .5, .045, .07, 0xbcb9aa).rotation.x = Math.PI / 2;
      box(x, 2.13, z, 1.5, .25, .85, metal); box(x, 2.69, z - .22, .42, .9, .42, metal);
    };
    const sofa = (x: number, z: number) => {
      box(x, .36, z, 1.5, .65, 2.3, 0x6f8276, true, 'fabric'); box(x + .63, .84, z, .2, .8, 2.3, 0x6f8276, false, 'fabric');
      for (const dz of [-.72, 0, .72]) box(x - .12, .72, z + dz, 1.18, .18, .65, 0x8e9b84, false, 'fabric');
      for (const dz of [-1.08, 1.08]) box(x, .76, z + dz, 1.5, .35, .17, 0x6f8276, false, 'fabric');
      box(x + .29, .98, z - .65, .48, .46, .15, 0xbfa67a, false, 'fabric').rotation.z = -.2;
    };

    if (p.kind === 'pharmacy') {
      cabinet(-2.65, 5.6, 1.4, 2.1); box(-2.65, 1.19, 6, .42, .25, .35, ink);
      shelving(2.75, 6, true); shelving(2.75, 0, true); sink(-2.75, -.8);
      table(-2.65, 1, 1.4, 1.1); round(-2.65, .91, 1, .18, .18, 0xd3d7c3);
      for (const z of [-5.2, -7.1]) shelving(2.75, z, true);
      fridge(-2.75, -6.2);
      for (const [w, h] of [[.75, .18], [.18, .75]]) box(0, 2.93, 9.2, w, h, .1, 0x82b996, false, undefined, .4);
    } else if (p.kind === 'bakery') {
      cabinet(-2.65, 5.6, 1.4, 2.2, 0x987853); shelving(2.75, 6);
      for (let i = 0; i < 6; i++) part(sphere, -2.65 + (i % 2) * .35, 1.18, 4.9 + Math.floor(i / 2) * .5, .17, .09, .3, 0xc29b5d);
      cooker(2.7, -.2); table(-2.65, 0, 1.4, 2.1);
      round(-2.6, .88, 0, .37, .07, 0xd4c6a3); box(-2.6, .95, .6, .055, .05, .75, 0x9d794c).rotation.y = .7;
      sink(2.65, 1.9); shelving(2.75, -6.3);
      for (const z of [-5.5, -7]) { box(-2.65, .42, z, 1.1, .8, .95, 0xc5b697, true, 'fabric'); box(-2.65, .85, z, .7, .025, .55, 0x806f4e); }
    } else if (p.kind === 'cafe') {
      for (const z of [4.7, 7.1]) { table(-2.7, z, 1.25, .85); chair(-2.7, z - .8, 0x876d52, -1); cup(-2.7, z); round(-2.4, .85, z, .17, .025, 0xdcd4bc); }
      cabinet(2.7, 5.6, 1.35, 2.4, 0x987453); box(2.7, 1.3, 6, .8, .5, .55, metal);
      round(2.45, 1.35, 6.3, .045, .12, ink); cup(2.8, 5, 1.15);
      cooker(2.65, -.7); sink(-2.65, -.7); cabinet(-2.65, 1.35);
      fridge(-2.75, -6.2); shelving(2.75, -6); shelving(2.75, -7.7);
    } else if (p.kind === 'laundry') {
      for (const x of [-2.75, 2.75]) for (const z of [4.7, 6.25, 7.8]) {
        box(x, .52, z, 1.35, 1.04, 1.15, 0xc4cdc5, true); box(x, .91, z + .59, 1.17, .17, .025, metal);
        const rim = part(torus, x, .47, z + .6, 1, 1, 1, metal); rim.rotation.set(0, 0, 0);
        round(x, .47, z + .61, .26, .045, 0x566b6e).rotation.x = Math.PI / 2;
        box(x + .4, .92, z + .61, .2, .055, .025, 0x8fab97, false, undefined, .15);
      }
      table(-2.65, 0, 1.45, 2.5); for (let i = 0; i < 4; i++) box(-2.65, .86 + i * .08, -.4, .85, .075, .55, i % 2 ? 0xbac2b3 : 0x8099a4, false, 'fabric');
      shelving(2.75, .8); sink(2.75, -1.4);
      round(-2.75, 1.15, -6, .56, 2.3, metal); cabinet(2.75, -6.2);
      for (const x of [-3.45, 3.45]) { round(x, 1.5, -6, .045, 3, metal); box(x, 1.2, -5.7, .07, .06, .65, metal); }
      box(2.7, 1.8, -8.68, .9, .95, .18, 0x5f6e65); box(2.7, 1.8, -8.56, .5, .22, .04, ink);
    } else if (p.kind === 'electronics') {
      cabinet(-2.65, 5.5, 1.4, 2); shelving(2.75, 6); desk(-2.65, 0);
      for (let i = 0; i < 3; i++) { box(2.7, .55 + i * .62, 0, 1.4, .08, 1.3, metal); box(2.7, .83 + i * .62, 0, .9, .46, .6, ink); box(2.7, .83 + i * .62, .31, .62, .31, .025, 0x829388); }
      obstacles.push({ x: p.x + 2.7, z: p.z, hx: .7, hz: .65 });
      shelving(2.75, -6); cabinet(-2.65, -6.3, 1.4, 2);
      for (let i = 0; i < 6; i++) { box(-2.95 + (i % 3) * .3, 1.1, -6.7 + Math.floor(i / 3) * .7, .16, .065, .42, i % 2 ? 0x8f674e : metal); }
      box(-2.65, 1.65, -8.65, 1.4, .7, .06, 0x776b51); for (let i = 0; i < 6; i++) box(-3.17 + i * .2, 1.6, -8.58, .06, .32, .07, metal);
    } else if (p.kind === 'office') {
      cabinet(-2.65, 5.6, 1.4, 2.2, 0x877860); chair(2.75, 5); chair(2.75, 7); desk(-2.65, 0); desk(2.65, 0);
      for (const x of [-2.7, 2.7]) { shelving(x, -6.5); for (let i = 0; i < 4; i++) box(x - .45 + i * .3, 1.9, -6.05, .2, .36, .25, i % 2 ? 0x7b8d87 : 0xa48c67); }
      box(0, 1.65, -8.7, 1.1, .85, .04, 0xbba47e); for (let i = 0; i < 5; i++) box(-.35 + i * .16, 1.65 + Math.sin(i) * .2, -8.66, .16, .22, .015, 0xe1d8b9);
    } else if (p.kind === 'apartment') {
      sink(-2.65, 7.4); cooker(-2.65, 5.6); table(2.65, 6, 1.4, 1.4); chair(2.65, 4.8, 0x957654, -1); cup(2.65, 6);
      sofa(2.65, 0); cabinet(-2.65, 0, 1.4, 1.9, 0x877451); box(-2.65, 1.45, -.1, .1, .9, 1.5, ink);
      box(-2.585, 1.45, -.1, .02, .75, 1.3, 0x536a68); shelving(-2.75, -2);
      box(-2.65, .25, -6, 1.6, .5, 2.5, 0x756348, true, 'wood'); box(-2.65, .58, -6, 1.53, .18, 2.35, 0xd5d1ba, false, 'fabric');
      box(-2.65, .74, -6.9, 1.1, .16, .5, 0xe8deca, false, 'fabric'); box(-2.65, .72, -5.6, 1.55, .13, 1.45, 0x8f9d88, false, 'fabric');
      sink(2.75, -5.5); box(2.7, 1.65, -8.65, 1.1, .9, .04, metal);
      box(2.7, .2, -7.2, 1.35, .4, 1.5, 0xd0d7cb, true); round(2.7, .42, -7.2, .35, .035, 0x8faaa5);
      box(-3.7, 1.7, 4, .07, .75, .55, 0x887359); box(-3.65, 1.7, 4, .025, .58, .38, 0xb7ad8b);
    } else if (p.kind === 'practice') {
      for (const z of [4.7, 6.1, 7.5]) chair(2.75, z, 0x899d99);
      cabinet(-2.65, 6, 1.4, 2.1); box(-2.65, 1.22, 6, .52, .32, .3, ink);
      box(-2.65, .57, 0, 1.35, .25, 2.35, 0x71938e, true, 'fabric'); box(-2.65, .37, 0, .8, .65, 1.6, metal);
      box(-2.65, .79, -.7, 1.3, .2, .7, 0xbcc7b8, false, 'fabric').rotation.x = -.25;
      sink(2.65, .9); shelving(2.75, -1.3, true); fridge(2.75, -6.2); desk(-2.65, -6);
      box(-3.68, 2.05, 0, .035, 1.1, .65, 0xe2ddc5); for (let i = 0; i < 5; i++) box(-3.65, 2.42 - i * .18, 0, .015, .035, .08 + i * .075, ink);
    }

    // Details shared by real occupied spaces: switches, sockets, vents, wall art,
    // skirting, ceiling fixtures, waste bins, loose documents and storage crates.
    for (const z of [-6, 0, 6]) {
      box(0, 3.22, z, timber ? 1.1 : 1.55, .1, .42, metal);
      box(0, 3.15, z, timber ? .95 : 1.4, .035, .3, 0xe5d7a9, false, undefined, .7);
      for (const side of [-1, 1]) box(side * 3.68, .3, z + 1.6, .03, .13, .18, 0xd4cfbd);
      box(-1.52, 1.22, z + 2.72, .16, .2, .025, 0xd3d0bf);
    }
    box(2.55, 2.6, -8.7, 1.1, .33, .04, metal); for (let i = 0; i < 8; i++) box(2.1 + i * .13, 2.6, -8.66, .05, .25, .02, ink);
    round(-3.3, .24, 3.8, .2, .48, metal); round(-3.3, .485, 3.8, .17, .008, ink);
    for (let i = 0; i < 12; i++) {
      const z = -8 + (i * 1.37 % 16), x = Math.sin(i * 7.1) * .75;
      const paper = box(x, .013 + i % 3 * .004, z, .16 + i % 2 * .1, .009, .25, i % 4 ? 0xd5cdb5 : 0x8c8066);
      paper.rotation.y = i * .63;
      if (i % 3 === 0) box(x, .026, z, .11, .004, .025, 0x6f7063).rotation.y = i * .63;
    }
    for (const loot of INTERIOR_LOOT.filter(l => Math.abs(l.x - p.x) < 4 && Math.abs(l.z - p.z) < 9)) {
      const x = loot.x - p.x, z = loot.z - p.z;
      box(x, .12, z, .7, .24, .6, 0x8b7857, false, 'wood');
      for (const side of [-1, 1]) box(x + side * .34, .24, z, .04, .18, .6, 0xa58a60);
      box(x, .24, z - .28, .7, .18, .04, 0xa58a60);
    }
    // A readable letter lies on a small console in the rear aisle.
    box(0, .35, -6.8, .8, .7, .6, 0x887658, false, 'wood');
    group.userData.unbatchedPieces = group.children.length;
  }
  return chunks;
}
