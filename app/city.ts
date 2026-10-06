import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Obstacle } from './survival.ts';

export type PlaceKind = 'hospital' | 'police' | 'market' | 'workshop' | 'shelter' | 'military' | 'station' | 'fire' | 'housing' | 'lab' | 'farm' | 'camp';
export const CITY_PLACES: { id: string; name: string; kind: PlaceKind; x: number; z: number; color: number; story: string }[] = [
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
] as const;
export const DISCOVERIES = [
  { id:'triage', x:120,z:-72,title:'Patientenliste · Ben Voss',text:'Ben wurde aus Zimmer 4 verlegt. Der Krankenwagen fuhr zum Bahnhof. An der Rückseite der Liste: „Nicht zum Militär. Folgt dem alten Waldweg.“' },
  { id:'ambulance',x:181,z:87,title:'Funkprotokoll · Wagen 12',text:'Ben und drei Kinder sind zu Fuß weiter. Die Ranger haben am Birkenrain ein Camp eingerichtet. Ben trägt die Schachtel mit Leas Fotos.' },
  { id:'archive',x:120,z:-136,title:'Lazarus · der Abbruchbefehl',text:'Falk erhielt den Abbruchbefehl bereits am Nachmittag. Er deaktivierte die Sirenen und ließ die Evakuierungsbusse in die Sperrzone fahren. Dr. Weber hat die Unterschrift gesichert.' },
  { id:'home',x:181,z:27,title:'Für Papa',text:'Wir gehen mit Frau Weber in die Schule. Dein Essen steht auf dem Tisch. Wenn du kommst: Bring die rote Tasche mit. Lea.' },
  { id:'shelter',x:120,z:77,title:'Namen an der Tafel',text:'Lea — Konvoi 2. Ben — verletzt, Bahnhof. Mara — hält die Station. Unter den Namen steht: „Nicht streichen. Wiederfinden.“' },
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
  const materials = new Map<number,THREE.MeshStandardMaterial>();
  const material=(color:number)=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.88}));return materials.get(color)!;};
  const cube=new THREE.BoxGeometry(1,1,1);
  const box=(group:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,color:number,solid=false)=>{
    const mesh=new THREE.Mesh(cube,material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=h>1;mesh.receiveShadow=true;group.add(mesh);
    if(solid)obstacles.push({x:group.position.x+x,z:group.position.z+z,hx:w/2,hz:d/2});return mesh;
  };
  const doors: {id:string;mesh:THREE.Mesh;obstacle:Obstacle;open:boolean}[]=[];
  for(const p of CITY_PLACES){
    const group=new THREE.Group();group.position.set(p.x,height(p.x,p.z),p.z);scene.add(group);chunks.push({group,x:p.x,z:p.z});
    // Human-sized architecture: two open entrances, broad sightlines, furnished
    // rooms. The rear archive/armory has a physically locked partition.
    box(group,0,-.09,0,15,.18,14,0x3b413e);
    box(group,-7.35,1.9,0,.3,3.8,14,p.color,true);box(group,7.35,1.9,0,.3,3.8,14,p.color,true);
    for(const z of [-6.85,6.85]){box(group,-4.55,1.9,z,5.6,3.8,.3,p.color,true);box(group,4.55,1.9,z,5.6,3.8,.3,p.color,true);box(group,0,3.35,z,3.5,.9,.3,p.color);}
    box(group,0,3.9,0,15.6,.22,14.6,0x303b3a);
    box(group,0,4.15,-4,2,.4,2,0x5b6663);
    // Exterior window frames and pale panes give each facade scale and rhythm.
    for(const side of [-1,1])for(const x of [-4.6,4.6]){box(group,x,2.1,side*7.02,2.5,1.55,.08,0x242f30);box(group,x,2.1,side*7.08,2.15,1.25,.03,0x7c9390);}
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
    if(p.kind==='housing'||p.kind==='military')for(let i=0;i<3;i++){const plank=box(group,-4.5,1.7+i*.35,7.2,3,.17,.13,0x6e563a);plank.rotation.z=.18;}
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
  for(const x of [137,198])for(const z of [-72,-20,30,80]){
    const group=new THREE.Group();group.position.set(x,height(x,z),z);scene.add(group);chunks.push({group,x,z});
    const h=8+(Math.abs(z)%3)*3;
    box(group,0,h/2,0,8,h,18,z<0?0x756b58:0x686f63,true);box(group,0,h+.18,0,8.5,.35,18.5,0x38443d);
    for(let y=2;y<h;y+=2.7)for(const wz of [-6,-2,2,6]){box(group,-4.03,y,wz,.08,1.5,1.4,0x34443e);box(group,4.03,y,wz,.08,1.5,1.4,0x819589);}
    box(group,0,1.4,9.02,6,2.1,.1,0x33403b);box(group,0,2.9,9.3,7,.2,1.2,0x7b7b57);
  }
  // Park, abandoned cars, checkpoint barricades and bus stops connect districts.
  for(let i=0;i<16;i++){
    const x=i%2?95:207,z=-91+Math.floor(i/2)*26,group=new THREE.Group();group.position.set(x,height(x,z),z);scene.add(group);chunks.push({group,x,z});
    box(group,0,.6,0,2,.8,4.4,[0x5d6e72,0x866e51,0x7a4742][i%3],true);box(group,0,1.22,-.25,1.8,.65,2.3,0x52635f);box(group,0,1.25,1,1.55,.45,.08,0x879e9a);
    for(const side of [-1,1])for(const z of [-1.4,1.4])box(group,side*1.02,.3,z,.2,.6,.6,0x202724);
  }
  // Batch static pieces by material inside each cullable block. Doors retain
  // independent meshes because opening them changes gameplay collision.
  for(const {group} of chunks){
    const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
    for(const child of [...group.children]){if(!(child instanceof THREE.Mesh)||doors.some(d=>d.mesh===child))continue;child.updateMatrix();const geometry=child.geometry.clone().applyMatrix4(child.matrix);const mat=child.material as THREE.Material;if(!batches.has(mat))batches.set(mat,[]);batches.get(mat)!.push(geometry);group.remove(child);}
    for(const [mat,geometries] of batches){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(merged){const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}}
  }
  const openDoor=(id:string)=>{const door=doors.find(d=>d.id===id);if(!door||door.open)return;door.open=true;door.mesh.visible=false;const index=obstacles.indexOf(door.obstacle);if(index>=0)obstacles.splice(index,1);};
  const reset=()=>{for(const d of doors){d.open=false;d.mesh.visible=true;if(!obstacles.includes(d.obstacle))obstacles.push(d.obstacle);}};
  const update=(x:number,z:number)=>{for(const c of chunks)c.group.visible=Math.hypot(c.x-x,c.z-z)<155;};
  return {chunks,doors,openDoor,reset,update};
}
