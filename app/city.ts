import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Obstacle } from './survival.ts';
import { SAFEHOUSES } from './safehouses.ts';
import { INTERIOR_PLACES, INTERIOR_LOOT, INTERIOR_DISCOVERIES, buildInteriors, type InteriorKind } from './interiors.ts';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { surfaceMaterial, surfaceForColor, tintGeometry, type SurfaceKind } from './surfaces.ts';
import { detailedCar } from './naturalAssets.ts';

export type PlaceKind = 'hospital' | 'police' | 'market' | 'workshop' | 'shelter' | 'military' | 'station' | 'fire' | 'housing' | 'lab' | 'farm' | 'camp' | InteriorKind;
export const CITY_PLACES: { id: string; name: string; kind: PlaceKind; x: number; z: number; color: number; story: string; hx?: number; hz?: number }[] = [
  { id:'lodge', name:'FORSTHAUS · DORFRAND', kind:'housing', x:-77,z:5,color:0x827359,story:'Vier zerbrochene Fenster. Mit Brettern und verstärkten Türen wird daraus ein Unterschlupf.' },
  { id:'hospital', name:'ST. ANNA · NOTAUFNAHME', kind:'hospital', x:120,z:-70,color:0x759ca0,story:'Betten im Flur. Die Evakuierung endete nicht am Krankenhaus.' },
  { id:'police', name:'POLIZEI · BEZIRK OST',kind:'police',x:181,z:-70,color:0x526a87,story:'Die Waffenkammer ist verriegelt. Lenz kennt den Zugang.' },
  { id:'market', name:'MARKTHALLE · LEBENSMITTEL',kind:'market',x:120,z:-20,color:0x9b8256,story:'Die Regale wurden geplündert. Im Lager blieben Wasser und Konserven.' },
  { id:'workshop', name:'LENZ · WERKSTATT',kind:'workshop',x:181,z:-20,color:0x95785d,story:'Eine Reparatur wurde mitten in der Nacht abgebrochen.' },
  { id:'fire', name:'FEUERWEHR · WACHE 04',kind:'fire',x:120,z:30,color:0x965f54,story:'Die letzte Schicht fuhr zur Schule. Niemand kam zurück.' },
  { id:'housing', name:'WOHNBLOCK · LINDENHOF',kind:'housing',x:181,z:30,color:0x8c9279,story:'Ein gedeckter Tisch, eine rote Tasche und drei leere Stühle.' },
  { id:'shelter', name:'SCHULE · NOTUNTERKUNFT',kind:'shelter',x:120,z:80,color:0x778766,story:'Namen an der Tafel. Lea wurde zum Bahnhof gebracht.' },
  { id:'station', name:'BAHNHOF · EVAKUIERUNG',kind:'station',x:181,z:80,color:0x7b858c,story:'Alle Züge stehen still. Der Krankenwagen kam ohne Patienten.' },
  { id:'military', name:'KONTROLLPUNKT · NORD',kind:'military',x:181,z:-133,color:0x657458,story:'Die Sperre hielt die Menschen auf. Die Infektion hielt sie nicht auf.' },
  { id:'lab', name:'LAZARUS · ARCHIV',kind:'lab',x:120,z:-133,color:0x659093,story:'Hinter der Sicherheitstür liegt das Original des Abbruchbefehls.' },
  { id:'farm', name:'HOF BIRKENRAIN',kind:'farm',x:-113,z:69,color:0x8b6a4d,story:'Der Brunnen ist sauber. Frische Fußspuren führen zum Zeltlager.' },
  { id:'camp', name:'WALDCAMP · EVAKUIERTE',kind:'camp',x:-121,z:119,color:0x727b53,story:'Hier endete Bens Flucht aus der Klinik.' },
  ...INTERIOR_PLACES,
];
export const CITY_ROADS = [
  {x:92,z:-20,w:9,h:260},{x:151,z:-20,w:10,h:270},{x:212,z:-20,w:9,h:260},
  ...[-104,-46,4,54,104].map(z=>({x:150,z,w:132,h:9})),
  {x:87,z:-7,w:45,h:9},{x:-113,z:82,w:7,h:103},{x:-87,z:34,w:59,h:7},
];
export const CITY_LOOT = [
  {kind:'medkit',x:117,z:-71,count:2},{kind:'antibiotic',x:123,z:-73,count:1},
  {kind:'shells',x:178,z:-69,count:12},{kind:'armor',x:184,z:-74,count:1},
  {kind:'water',x:117,z:-23,count:2},{kind:'ration',x:123,z:-18,count:2},
  {kind:'scrap',x:178,z:-23,count:3},{kind:'battery',x:184,z:-18,count:2},
  {kind:'medkit',x:117,z:28,count:2},{kind:'scrap',x:122,z:29,count:2},
  {kind:'ration',x:177,z:28,count:1},{kind:'water',x:184,z:32,count:1},
  {kind:'medkit',x:117,z:77,count:1},{kind:'water',x:123,z:83,count:2},
  {kind:'shells',x:177,z:78,count:8},{kind:'flare',x:184,z:82,count:2},
  {kind:'rifleAmmo',x:178,z:-135,count:45},{kind:'armor',x:184,z:-131,count:1},
  {kind:'antibiotic',x:117,z:-137,count:2},{kind:'medkit',x:124,z:-131,count:2},
  {kind:'water',x:-116,z:66,count:3},{kind:'ration',x:-110,z:71,count:2},
  {kind:'medkit',x:-124,z:117,count:2},{kind:'flare',x:-118,z:121,count:2},
  ...INTERIOR_LOOT,
] as const;
export const DISCOVERIES: { id: string; x: number; z: number; y?: number; title: string; text: string }[] = [
  { id:'triage', x:120,z:-72,title:'Patientenliste · Ben Voss',text:'Ben wurde aus Zimmer 4 verlegt. Der Krankenwagen fuhr zum Bahnhof. An der Rückseite der Liste: „Nicht zum Militär. Folgt dem alten Waldweg.“' },
  { id:'ambulance',x:181,z:87,title:'Funkprotokoll · Wagen 12',text:'Ben und drei Kinder sind zu Fuß weiter. Die Ranger haben am Birkenrain ein Camp eingerichtet. Ben trägt die Schachtel mit Leas Fotos.' },
  { id:'archive',x:120,z:-136,title:'Lazarus · Lagerprotokoll und Abbruchbefehl',text:'Dr. Webers Lagerprotokoll: Nur Dosis C-07 ist stabil. Sie liegt im blauen Behälter im Laborcontainer der alten Klinik westlich der Oststadt. Andere Proben nicht öffnen. Angeheftet ist Falks unterschriebener Abbruchbefehl: Er wusste schon am Nachmittag von der Gefahr, deaktivierte aber die Sirenen und ließ die Evakuierungsbusse in die Sperrzone fahren. Bringt die Dosis und dieses Original zum Konvoi.' },
  { id:'home',x:181,z:27,title:'Für Papa',text:'Wir gehen mit Frau Weber in die Schule. Dein Essen steht auf dem Tisch. Wenn du kommst: Bring die rote Tasche mit. Lea.' },
  { id:'shelter',x:120,z:77,title:'Namen an der Tafel',text:'Lea — Konvoi 2. Ben — verletzt, Bahnhof. Mara — hält die Station. Unter den Namen steht: „Nicht streichen. Wiederfinden.“' },
  ...INTERIOR_DISCOVERIES,
] as const;
export const CITY_NPCS = [
  { id:'lenz',name:'LENZ · MECHANIKER',x:120,z:85,skin:'survivorMaleB',color:0xe4ae64 },
  { id:'weber',name:'DR. WEBER',x:114,z:-62,skin:'survivorFemaleA',color:0x8ecbda },
  { id:'ben',name:'BEN · EVAKUIERTER',x:-120,z:124,skin:'survivorMaleB',color:0xbcd99a },
  { id:'ranger-guard',name:'JONAS · RANGER',x:-55,z:-41,skin:'survivorMaleB',color:0xc8d5b1 },
  { id:'school-guard',name:'ANJA · WACHE',x:117,z:89,skin:'survivorFemaleA',color:0xc8d5b1 },
  { id:'school-resident',name:'PAUL · EVAKUIERTER',x:123,z:89,skin:'survivorMaleB',color:0xc8d5b1 },
  { id:'camp-guard',name:'NORA · RANGERIN',x:-117,z:125,skin:'survivorFemaleA',color:0xc8d5b1 },
] as const;
export type CityWorld = ReturnType<typeof buildCity>;
export function buildCity(scene: THREE.Scene, height: (x:number,z:number)=>number, obstacles: Obstacle[], board:(text:string,x:number,z:number,color?:string,graffiti?:boolean)=>THREE.Mesh) {
  const chunks: {group:THREE.Group;x:number;z:number}[] = [];
  const materials = new Map<SurfaceKind,THREE.MeshStandardMaterial>();
  const material=(color:number)=>{const surface=surfaceForColor(color);if(!materials.has(surface))materials.set(surface,surfaceMaterial(surface,0xffffff,{vertexColors:true,metalness:surface==='metal'?.5:0}));return materials.get(surface)!;};
  const cube=new RoundedBoxGeometry(1,1,1,2,.012), coloredGeometry=new Map<number,THREE.BufferGeometry>();
  const coloredCube=(color:number)=>{if(!coloredGeometry.has(color))coloredGeometry.set(color,tintGeometry(cube,color));return coloredGeometry.get(color)!;};
  const box=(group:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,color:number,solid=false)=>{
    const mesh=new THREE.Mesh(coloredCube(color),material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=h>1;mesh.receiveShadow=true;group.add(mesh);
    if(solid)obstacles.push({x:group.position.x+x,z:group.position.z+z,hx:w/2,hz:d/2});return mesh;
  };
  const doors: {id:string;mesh:THREE.Mesh;obstacle:Obstacle;open:boolean}[]=[];
  const fortifications: { house: string; kind: 'window' | 'door' | 'bed'; index: number; x: number; z: number; mesh: THREE.Group; obstacle?: Obstacle }[] = [];
  const dynamic = new Set<THREE.Object3D>();
  for(const p of CITY_PLACES){
    if(p.hx === 4)continue; // These narrower buildings have their own room layouts.
    const safehouse = SAFEHOUSES.some(h => h.id === p.id);
    const group=new THREE.Group();group.position.set(p.x,height(p.x,p.z)+.075,p.z);scene.add(group);chunks.push({group,x:p.x,z:p.z});
    // Human-sized architecture: two open entrances, broad sightlines, furnished
    // rooms. The rear archive/armory has a physically locked partition.
    box(group,0,-.09,0,15,.18,14,0x3b413e);
    box(group,-7.35,1.9,0,.3,3.8,14,p.color,true);box(group,7.35,1.9,0,.3,3.8,14,p.color,true);
    for(const z of [-6.85,6.85]){
      if(safehouse){
        // Real openings: the side jambs block actors; broken windows admit them
        // until player-built boards install collision and cover.
        for(const side of [-1,1]){
          box(group,side*2.4,1.9,z,1.3,3.8,.3,p.color,true);
          box(group,side*6.75,1.9,z,1.2,3.8,.3,p.color,true);
          box(group,side*4.6,.15,z,3.1,.3,.3,p.color);
          box(group,side*4.6,3.45,z,3.1,.7,.3,p.color);
        }
      }else{box(group,-4.55,1.9,z,5.6,3.8,.3,p.color,true);box(group,4.55,1.9,z,5.6,3.8,.3,p.color,true);}
      box(group,0,3.35,z,3.5,.9,.3,p.color);
    }
    box(group,0,3.9,0,15.6,.22,14.6,0x303b3a);
    box(group,0,4.15,-4,2,.4,2,0x5b6663);
    // Fascia, downpipes and masonry footings give every public facade depth.
    for(const side of [-1,1]){
      box(group,side*7.57,3.78,0,.13,.15,14.5,0x536467);
      box(group,side*7.58,1.86,5.8,.09,3.65,.09,0x536467);
      box(group,side*7.39,.2,0,.38,.4,14.2,0x3b413e);
    }
    // Exterior window frames and pale panes give each facade scale and rhythm.
    if(!safehouse)for(const side of [-1,1])for(const x of [-4.6,4.6]){box(group,x,2.1,side*7.02,2.5,1.55,.08,0x242f30);box(group,x,2.1,side*7.08,2.15,1.25,.03,0x7c9390);}
    if(safehouse){
      for(const [index, pos] of [[-4.6,-6.85],[4.6,-6.85],[-4.6,6.85],[4.6,6.85]].entries()){
        const [x,z]=pos, mesh=new THREE.Group();mesh.position.set(x,0,z);group.add(mesh);dynamic.add(mesh);
        const boards=new THREE.InstancedMesh(coloredCube(0xa78052),material(0xa78052),5),transform=new THREE.Object3D();
        for(let n=0;n<5;n++){transform.position.set(0,.55+n*.55,0);transform.scale.set(3.15,.34,.14);transform.rotation.z=n%2?.06:-.06;transform.updateMatrix();boards.setMatrixAt(n,transform.matrix);}
        boards.castShadow=true;boards.receiveShadow=true;mesh.add(boards);
        mesh.visible=false;
        fortifications.push({house:p.id,kind:'window',index,x:p.x+x,z:p.z+z,mesh,obstacle:{x:p.x+x,z:p.z+z,hx:1.6,hz:.16}});
      }
      for(const [index,z] of [-6.85,6.85].entries()){
        const mesh=new THREE.Group();mesh.position.z=z;group.add(mesh);dynamic.add(mesh);
        box(mesh,0,1.5,0,3.45,3,.25,0x62533b);
        box(mesh,0,1.4,.18,3.4,.25,.2,0xb09968);mesh.visible=false;
        fortifications.push({house:p.id,kind:'door',index,x:p.x,z:p.z+z,mesh,obstacle:{x:p.x,z:p.z+z,hx:1.73,hz:.16}});
      }
      const mesh=new THREE.Group();mesh.position.set(0,0,1);group.add(mesh);dynamic.add(mesh);
      box(mesh,0,.15,0,1.45,.3,2.3,0x59634c);box(mesh,0,.34,-.75,1.2,.13,.55,0xc6bb98);
      const blanket=box(mesh,0,.34,.3,1.4,.12,1.6,0x8f9c71);blanket.visible=false;
      fortifications.push({house:p.id,kind:'bed',index:0,x:p.x,z:p.z+1,mesh});
      const label=board('UNTERSCHLUPF / E: FENSTER, TÜREN, BETT',p.x,p.z+10,'#d4bd83');label.position.y=height(p.x,p.z)+2.3;
    }
    const sign=board(p.name,p.x,p.z+7.1,'#dfdfb5');sign.position.y=height(p.x,p.z)+3.1;
    if(p.kind==='police'||p.kind==='lab'){
      for(const x of [-4.7,4.7])box(group,x,1.6,-2.5,5.3,3.2,.22,0x536467,true);
      const door=box(group,0,1.55,-2.5,4.1,3.1,.2,0x8c6945);
      const obstacle={x:p.x,z:p.z-2.5,hx:2.05,hz:.12};obstacles.push(obstacle);doors.push({id:p.id,mesh:door,obstacle,open:false});
      // The rear exterior door is closed too, keeping access gating honest.
      box(group,0,1.55,-6.85,3.5,3.1,.3,0x536467,true);
    }
    if(['hospital','shelter','lab','camp'].includes(p.kind)){
      for(const x of [-4.8,4.8])for(const z of [-3.5,2]){box(group,x,.45,z,1.55,.3,2.6,0x606e6b);box(group,x,.64,z,1.45,.12,2.4,p.kind==='hospital'?0xb4c1b4:0x7b826c);box(group,x,.76,z-.8,1.1,.2,.45,0xbebfa4);}
      box(group,-6.4,1.1,0,.8,2.2,1.4,0x88978e,true);
    } else if(['market','workshop','military','police'].includes(p.kind)) {
      for(const x of [-5,5])for(const z of [-3,2]){for(const y of [.4,1.1,1.8]){box(group,x,y,z,2.1,.1,1.8,0x686d5d);for(let n=0;n<3;n++)box(group,x-.7+n*.7,y+.24,z,.4,.4,.8,[0x9b855a,0x6b7967,0x977565][n]);}box(group,x-1,.9,z,.08,1.8,1.8,0x3b4540);}
    } else {
      box(group,-4,.8,0,2.8,.15,1.5,0x846744,true);
      for(const z of [-1.5,1.5]){box(group,-4,.48,z,1,.12,1,0x665742);box(group,-4,.95,z+(z>0?.4:-.4),1,.85,.15,0x665742);}
      box(group,4,.55,-3,2.4,1.1,1.2,0x758170,true);box(group,5,1.2,3,2,2.4,.7,0x6d735d,true);
      box(group,-3.8,.93,0,.4,.08,.4,0xc5b896);
    }
    // Scattered paper, a dragged blood trail and boarded windows tell the story
    // without an interaction marker over every prop.
    for(let i=0;i<7;i++){const mark=box(group,Math.sin(i*2.7)*1.3,.015,5-i*1.5,.25+(i%2)*.2,.025,.65,i%3?0x48332c:0xbcb79d);mark.rotation.y=i;}
    if(!safehouse&&(p.kind==='housing'||p.kind==='military'))for(let i=0;i<3;i++){const plank=box(group,-4.5,1.7+i*.35,7.2,3,.17,.13,0x6e563a);plank.rotation.z=.18;}
    // Silhouettes above street level create readable landmarks.
    if(p.kind==='hospital'){box(group,0,5,0,.45,2.2,.25,0xca6f55);box(group,0,5,0,1.8,.45,.25,0xca6f55);}
    if(p.kind==='station'){for(let i=0;i<3;i++){box(group,12+i*8,1.4,-12,6,2.6,3.1,0x526866,true);box(group,12+i*8,2,-10.42,4.8,.8,.08,0x91a5a1);}}
    if(p.kind==='fire'){box(group,0,8,-3,3.3,8,3.3,0x645e4e);for(let y=5;y<12;y+=2)box(group,0,y,-1.3,1.7,.9,.1,0x263533);}
    if(p.kind==='military')for(const x of [-12,12])for(let i=0;i<3;i++)box(group,x,1,-6+i*5,2,2,3,0x59634c,true);
  }
  // A planned downtown skyline beside the road grid; only these blocks are
  // closed scenery, distinct from the explicitly signed public interiors.
  for(const x of [105,136,167,198])for(const z of [-161,138]){
    const group=new THREE.Group();group.position.set(x,height(x,z),z);scene.add(group);chunks.push({group,x,z});
    const h=12+((x+z+300)%4)*4;box(group,0,h/2,0,11,h,12,0x555f5b,true);
    for(let floor=2;floor<h;floor+=3)for(const wx of [-3,0,3])box(group,wx,floor,z<0?6.02:-6.02,1.3,1.5,.05,0x899d91);
  }
  chunks.push(...buildInteriors(scene,height,obstacles,board));
  // Park, abandoned cars, checkpoint barricades and bus stops connect districts.
  for(let i=0;i<16;i++){
    const x=i%2?95:207,z=-91+Math.floor(i/2)*26,group=new THREE.Group();group.position.set(x,height(x,z),z);scene.add(group);chunks.push({group,x,z});
    group.add(detailedCar(i));obstacles.push({x,z,hx:1,hz:2.2});
  }
  // Batch static pieces by material inside each cullable block. Doors retain
  // independent meshes because opening them changes gameplay collision.
  for(const {group} of chunks){
    const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
    for(const child of [...group.children]){if(!(child instanceof THREE.Mesh)||dynamic.has(child)||doors.some(d=>d.mesh===child)||(child.material as THREE.Material).transparent)continue;child.updateMatrix();const geometry=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geometry.applyMatrix4(child.matrix);const mat=child.material as THREE.Material;if(!batches.has(mat))batches.set(mat,[]);batches.get(mat)!.push(geometry);group.remove(child);}
    for(const [mat,geometries] of batches){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)throw new Error('City geometry could not be batched');const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
  }
  const openDoor=(id:string)=>{const door=doors.find(d=>d.id===id);if(!door||door.open)return;door.open=true;door.mesh.visible=false;const index=obstacles.indexOf(door.obstacle);if(index>=0)obstacles.splice(index,1);};
  const reset=()=>{for(const d of doors){d.open=false;d.mesh.visible=true;if(!obstacles.includes(d.obstacle))obstacles.push(d.obstacle);}};
  const update=(x:number,z:number)=>{for(const c of chunks)c.group.visible=Math.hypot(c.x-x,c.z-z)<155;};
  const setFortification=(house:string,kind:'window'|'door'|'bed',index:number,enabled:boolean)=>{
    const f=fortifications.find(f=>f.house===house&&f.kind===kind&&f.index===index);if(!f)return;
    if(kind==='bed')f.mesh.children[2].visible=enabled;else f.mesh.visible=enabled;
    if(f.obstacle){const at=obstacles.indexOf(f.obstacle);if(enabled&&at<0)obstacles.push(f.obstacle);else if(!enabled&&at>=0)obstacles.splice(at,1);}
  };
  return {chunks,doors,fortifications,setFortification,openDoor,reset,update};
}
