import type { Obstacle, Point } from './survival.ts';
import type { LootKind } from './world.ts';

// Metres, Y up, north = negative Z. The original campaign is a preserved enclave.
export const LEGACY_BOUNDS = { minX: -180, maxX: 240, minZ: -185, maxZ: 160 };
export const REGION_BOUNDS = { minX: -1200, maxX: 1200, minZ: -1000, maxZ: 1000 };
export type Zone = Point & { id: string; name: string; hx: number; hz: number; risk: 0 | 1 | 2 | 3; biome: 'city' | 'village' | 'forest' | 'field' | 'remote'; detail: string };
export const WORLD_ZONES: Zone[] = [
  { id: 'MAIN_CITY', name: 'OSTSTADT · ZENTRUM', x: 405, z: -50, hx: 150, hz: 180, risk: 2, biome: 'city', detail: 'Bürotürme, Wohnblöcke und die verlassene Einkaufsmeile.' },
  { id: 'CITY_SUBURBS', name: 'LINDEN · STADTRAND', x: 440, z: 205, hx: 235, hz: 100, risk: 1, biome: 'city', detail: 'Gärten und Wohnstraßen gehen in Weiden über.' },
  { id: 'INDUSTRIAL_ZONE', name: 'OSTWERK · INDUSTRIE', x: 540, z: -295, hx: 140, hz: 105, risk: 2, biome: 'city', detail: 'Güterhof, Fabriken und Lagerhallen am Nordzubringer.' },
  { id: 'VILLAGE_01', name: 'KORNWEILER', x: -650, z: -530, hx: 145, hz: 110, risk: 1, biome: 'village', detail: 'Bauernhäuser, Scheunen und Silos zwischen großen Feldern.' },
  { id: 'VILLAGE_02', name: 'FICHTENAU', x: -740, z: 500, hx: 115, hz: 140, risk: 1, biome: 'village', detail: 'Forstbetrieb und Holzlager an der alten Waldstraße.' },
  { id: 'VILLAGE_03', name: 'BRÜCKENFELD', x: 690, z: 420, hx: 95, hz: 110, risk: 1, biome: 'village', detail: 'Werkstatt, Tankstelle und Mühle vor der großen Talbrücke.' },
  { id: 'VILLAGE_04', name: 'ASCHENRODE', x: 650, z: -650, hx: 85, hz: 95, risk: 2, biome: 'village', detail: 'Abgebrochene Evakuierung. Ruinen, Barrikaden und Hetzer.' },
  { id: 'MILITARY_BASE', name: 'FORT EICHE', x: -400, z: -820, hx: 110, hz: 85, risk: 3, biome: 'remote', detail: 'Abgelegene Höhenstellung. Brecher bewachen militärische Vorräte.' },
  { id: 'FARMLAND', name: 'KORNMARK · FELDER', x: -560, z: -260, hx: 380, hz: 240, risk: 0, biome: 'field', detail: 'Ackerstreifen, Wiesen und vereinzelte Gehöfte.' },
  { id: 'FOREST_NORTH', name: 'HOCHFORST', x: -400, z: -730, hx: 690, hz: 260, risk: 0, biome: 'forest', detail: 'Bewaldete Hügel zwischen Kornweiler und der Militärstraße.' },
  { id: 'FOREST_SOUTH', name: 'SÜDLICHER TANNWALD', x: -530, z: 650, hx: 570, hz: 330, risk: 0, biome: 'forest', detail: 'Dichter Mischwald, Lichtungen, Jagdhütten und ein Waldsee.' },
  { id: 'RIVER_VALLEY', name: 'AUE · FLUSSTAL', x: 870, z: 160, hx: 220, hz: 760, risk: 0, biome: 'remote', detail: 'Die Aue windet sich nach Süden. Nur die Brücken tragen sicher hinüber.' },
  { id: 'REMOTE_AREA', name: 'WESTLICHE WEIDEN', x: -970, z: 80, hx: 190, hz: 270, risk: 0, biome: 'field', detail: 'Ruhige Weiden und alte Feldwege weit außerhalb der Stadt.' },
];
export const seeded = (n: number) => { let v = Math.imul(n, 0x45d9f3b); v = Math.imul(v ^ v >>> 16, 0x45d9f3b); return ((v ^ v >>> 16) >>> 0) / 4294967296; };
export const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
export const inLegacy = (x: number, z: number, margin = 0) => x >= LEGACY_BOUNDS.minX - margin && x <= LEGACY_BOUNDS.maxX + margin && z >= LEGACY_BOUNDS.minZ - margin && z <= LEGACY_BOUNDS.maxZ + margin;
export function zoneAt(x: number, z: number) { return WORLD_ZONES.find(p => Math.abs(x - p.x) < p.hx && Math.abs(z - p.z) < p.hz); }

export type Route = { id: string; name: string; kind: 'main' | 'secondary' | 'field' | 'forest'; width: number; points: Point[] };
function route(id: string, name: string, kind: Route['kind'], coordinates: number[][]): Route {
  return { id, name, kind, width: kind === 'main' ? 11 : kind === 'secondary' ? 7 : 3.6, points: coordinates.map(([x, z]) => ({ x, z })) };
}
// Endpoints are shared junctions; every spur terminates at a named settlement/POI.
export const REGION_ROUTES: Route[] = [
  route('west', 'Kornmarkstraße', 'main', [[92,-104],[-110,-220],[-350,-320],[-510,-450],[-650,-530]]),
  route('north', 'Nordzubringer', 'main', [[370,-220],[390,-430],[490,-530],[650,-650]]),
  route('fort', 'Militärstraße', 'main', [[390,-430],[100,-480],[-120,-590],[-400,-720],[-400,-820]]),
  route('korn-fort', 'Hochforststraße', 'secondary', [[-650,-530],[-600,-650],[-400,-720]]),
  route('southwest', 'Alte Forststraße', 'secondary', [[-113,135],[-240,260],[-470,300],[-630,390],[-740,500]]),
  route('village-link', 'Westliche Landstraße', 'secondary', [[-650,-530],[-860,-340],[-920,-80],[-850,180],[-740,500]]),
  route('south', 'Talstraße', 'main', [[370,220],[320,340],[480,480],[690,420]]),
  route('east', 'Steinbruchstraße', 'main', [[650,104],[840,130],[1040,160]]),
  route('bridge', 'Talbrücke', 'secondary', [[690,420],[920,460],[1040,160]]),
  route('lake', 'Seeweg', 'forest', [[-740,500],[-700,630],[-630,685],[-480,695],[-405,755],[-405,790]]),
  route('farm-west', 'Birkenhofweg', 'field', [[-920,-80],[-1010,-170],[-1100,-280]]),
  route('farm-north', 'Mühlenhofweg', 'field', [[-350,-320],[-380,-180],[-480,-110]]),
  route('farm-south', 'Wiesenweg', 'field', [[320,340],[100,290],[-70,350],[-260,440]]),
  route('research', 'Lazarus Forstzufahrt', 'forest', [[-400,-720],[-140,-700],[-50,-810],[10,-870]]),
  route('radar', 'Radarweg', 'secondary', [[-400,-820],[-640,-850],[-780,-850]]),
  route('hunting', 'Jägerpfad', 'forest', [[-470,300],[-410,500],[-320,600]]),
  route('rest', 'Rastplatz-Zufahrt', 'secondary', [[490,-530],[420,-580],[340,-590]]),
  route('power', 'Netzstation-Zufahrt', 'secondary', [[920,460],[1010,590],[1060,650]]),
  route('church', 'Kirchweg', 'secondary', [[-650,-530],[-690,-590],[-740,-600]]),
  route('fuel', 'Tankstellen-Zufahrt', 'secondary', [[690,420],[640,370],[590,355]]),
  route('korn-lane', 'Kornweiler Dorfstraße', 'secondary', [[-650,-530],[-710,-485],[-620,-465],[-650,-530]]),
  route('fichten-lane', 'Fichtenau Holzstraße', 'secondary', [[-740,500],[-790,550],[-700,555],[-740,500]]),
  route('river-lane', 'Brückenfeld Mühlengasse', 'secondary', [[690,420],[640,460],[705,490],[690,420]]),
  route('ash-lane', 'Aschenrode Sackgasse', 'secondary', [[650,-650],[600,-690],[685,-720]]),
  ...[-220,-104,4,104,220].map((z,i) => route(`city-cross-${i}`, 'Oststadt Querstraße', 'main', [[212,z === -220 ? -150 : Math.min(z,110)],[270,z],[475,z],[650,z]])),
  ...[270,370,475,580,650].map((x,i) => route(`city-long-${i}`, 'Oststadt Ringstraße', i === 2 ? 'main' : 'secondary', [[x,-220],[x,-104],[x,104],[x,220]])),
  route('industry', 'Werkstraße', 'secondary', [[475,-220],[475,-330],[610,-330],[650,-220]]),
];
// Catmull-Rom sampled in metres, keeps junctions exact and rounds rural bends.
export function sampleLine(points: Point[], spacing = 10): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0,i-1)], b = points[i], c = points[i+1], d = points[Math.min(points.length-1,i+2)];
    const steps = Math.ceil(Math.hypot(c.x-b.x,c.z-b.z)/spacing);
    for (let n = 0; n < steps; n++) { const t = n/steps, t2=t*t,t3=t2*t;
      const axis = (k: 'x' | 'z') => .5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);
      out.push({x:axis('x'),z:axis('z')});
    }
  }
  out.push({...points[points.length-1]}); return out;
}
export const ROAD_LINES = REGION_ROUTES.map(r => ({...r, samples: r.id.startsWith('city-') || r.id === 'industry' ? r.points.flatMap((p,i) => i ? sampleLine([r.points[i-1],p]).slice(1) : [p]) : sampleLine(r.points)}));
export type LineSegment = { a: Point; b: Point; width: number; id: string; kind: string };
const segmentsOf = (lines: {id:string;kind:string;width:number;samples:Point[]}[]): LineSegment[] => lines.flatMap(r => r.samples.slice(1).map((b,i) => ({a:r.samples[i],b,width:r.width,id:r.id,kind:r.kind})));
export const ROAD_SEGMENTS = segmentsOf(ROAD_LINES);
export function nearestOn(p: Point, a: Point, b: Point) { const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return {x:a.x+t*dx,z:a.z+t*dz}; }
export function lineDistance(p: Point, s: LineSegment) { const q=nearestOn(p,s.a,s.b);return Math.hypot(p.x-q.x,p.z-q.z); }

export const WATER_LINES = [
  {id:'aue',kind:'river',width:24,samples:sampleLine([[600,-1040],[730,-700],[780,-430],[725,-90],[750,160],[825,440],[940,710],[880,1040]].map(([x,z])=>({x,z})))},
  {id:'birkenbach',kind:'stream',width:6,samples:sampleLine([[-1200,160],[-970,230],[-620,220],[-350,330],[30,390],[290,570],[640,610],[907,602]].map(([x,z])=>({x,z})))},
  {id:'hochbach',kind:'stream',width:4,samples:sampleLine([[-980,-980],[-850,-780],[-790,-630],[-930,-440],[-1050,-200],[-970,230]].map(([x,z])=>({x,z})))},
];
export const WATER_SEGMENTS = segmentsOf(WATER_LINES).map((s,i) => ({...s,width:s.width*(.85+.22*Math.sin(i*.14))}));
export const LAKES = [{id:'waldsee',name:'WALDSEE',x:-540,z:790,rx:108,rz:70}, {id:'muehlenteich',name:'MÜHLENTEICH',x:-560,z:-90,rx:42,rz:28}];

// A spatial grid keeps placement and actor queries independent of world area.
export class SpatialIndex<T extends Obstacle> {
  private cells = new Map<string,T[]>();
  readonly size: number;
  constructor(size = 64) { this.size = size; }
  add(item:T) { for(let z=Math.floor((item.z-item.hz)/this.size);z<=Math.floor((item.z+item.hz)/this.size);z++)for(let x=Math.floor((item.x-item.hx)/this.size);x<=Math.floor((item.x+item.hx)/this.size);x++){const k=`${x},${z}`;if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k)!.push(item);} }
  query(x:number,z:number,hx=1,hz=hx):T[]{const out=new Set<T>();for(let iz=Math.floor((z-hz)/this.size);iz<=Math.floor((z+hz)/this.size);iz++)for(let ix=Math.floor((x-hx)/this.size);ix<=Math.floor((x+hx)/this.size);ix++)for(const item of this.cells.get(`${ix},${iz}`)??[])if(Math.abs(x-item.x)<=hx+item.hx&&Math.abs(z-item.z)<=hz+item.hz)out.add(item);return [...out];}
}
const lineIndex = (segments:LineSegment[]) => {const index=new SpatialIndex<Obstacle & {segment:LineSegment}>();for(const segment of segments)index.add({x:(segment.a.x+segment.b.x)/2,z:(segment.a.z+segment.b.z)/2,hx:Math.abs(segment.a.x-segment.b.x)/2+segment.width/2,hz:Math.abs(segment.a.z-segment.b.z)/2+segment.width/2,segment});return index;};
const roadIndex=lineIndex(ROAD_SEGMENTS),waterIndex=lineIndex(WATER_SEGMENTS);
export const roadsNear = (x:number,z:number,radius=30) => roadIndex.query(x,z,radius).map(s=>s.segment);
export const watersNear = (x:number,z:number,radius=30) => waterIndex.query(x,z,radius).map(s=>s.segment);
export const roadClearance = (x:number,z:number) => roadsNear(x,z).reduce((d,s)=>Math.min(d,lineDistance({x,z},s)-s.width/2),Infinity);
export function waterClearance(x:number,z:number) {let d=watersNear(x,z).reduce((v,s)=>Math.min(v,lineDistance({x,z},s)-s.width/2),Infinity);for(const lake of LAKES)d=Math.min(d,(Math.hypot((x-lake.x)/lake.rx,(z-lake.z)/lake.rz)-1)*Math.min(lake.rx,lake.rz));return d;}
export type Bridge = Point & { id:string; rotation:number; length:number; width:number; level:number };
function intersections() {
  const bridges:Bridge[]=[];
  for(const road of ROAD_SEGMENTS)for(const water of watersNear((road.a.x+road.b.x)/2,(road.a.z+road.b.z)/2,22)){
    const rx=road.b.x-road.a.x,rz=road.b.z-road.a.z,sx=water.b.x-water.a.x,sz=water.b.z-water.a.z,den=rx*sz-rz*sx;
    if(Math.abs(den)<.001)continue;
    const qx=water.a.x-road.a.x,qz=water.a.z-road.a.z,t=(qx*sz-qz*sx)/den,u=(qx*rz-qz*rx)/den;
    if(t<0||t>1||u<0||u>1)continue;
    const x=road.a.x+t*rx,z=road.a.z+t*rz;
    if(bridges.some(b=>Math.hypot(x-b.x,z-b.z)<25))continue;
    const sine=Math.abs(den)/(Math.hypot(rx,rz)*Math.hypot(sx,sz));
    bridges.push({id:`${road.id}-${water.id}`,x,z,rotation:Math.atan2(rx,rz),length:water.width/Math.max(.25,sine)+24,width:road.width,level:2.8});
  }
  return bridges;
}
export const BRIDGES = intersections();
export function bridgeAt(x:number,z:number,margin=0){return BRIDGES.find(b=>{const dx=x-b.x,dz=z-b.z,c=Math.cos(b.rotation),s=Math.sin(b.rotation);return Math.abs(dx*c-dz*s)<b.width/2+margin&&Math.abs(dx*s+dz*c)<b.length/2+margin;});}
export const waterBlocked = (x:number,z:number) => waterClearance(x,z)<.65&&!bridgeAt(x,z,-.55);

export const FIELDS = [
  [-750,-350,130,64],[-600,-250,105,75],[-420,-410,90,60],[-900,-170,85,65],[-520,-110,70,55],[-1060,-380,75,62],
  [-1000,30,100,65],[-250,470,90,64],[10,280,72,55],[220,660,120,80],[440,680,90,70],[540,310,62,42],
].map(([x,z,hx,hz],i)=>({id:`field-${i}`,x,z,hx,hz,crop:i%3}));
export const fieldAt=(x:number,z:number)=>FIELDS.find(f=>Math.abs(x-f.x)<f.hx&&Math.abs(z-f.z)<f.hz);
export const FORESTS=[[-550,-805,550,210],[-1010,610,180,310],[-480,710,450,255],[-370,470,270,230],[1070,-430,155,380],[1100,780,160,220]];
const CLEARINGS=[[-320,600,38],[-430,790,42],[10,-870,62],[-780,-850,50],[-400,-820,160],[-740,500,125],[-650,-530,165]];
export function forestDensity(x:number,z:number){if(inLegacy(x,z)||fieldAt(x,z)||waterClearance(x,z)<8||zoneAt(x,z)?.biome==='city')return 0;let d=0;for(const [cx,cz,hx,hz]of FORESTS)d=Math.max(d,1-smooth(.65,1.08,Math.hypot((x-cx)/hx,(z-cz)/hz)));for(const[cx,cz,r]of CLEARINGS)d*=smooth(r,r+35,Math.hypot(x-cx,z-cz));return d*(.72+.28*Math.sin(x*.012)*Math.cos(z*.009));}

export type WorldPOI = Point & { id:string;name:string;kind:'farm'|'gas'|'church'|'camp'|'bunker'|'radar'|'research'|'quarry'|'power'|'rest';risk:0|1|2|3;detail:string };
export const REGION_POIS:WorldPOI[]=[
  {id:'birkenhof',name:'BIRKENHOF',kind:'farm',x:-1100,z:-280,risk:0,detail:'Brunnen und Vorräte am Ende des Feldwegs.'},
  {id:'muehlenhof',name:'MÜHLENHOF',kind:'farm',x:-480,z:-110,risk:0,detail:'Scheune und Silos über dem Mühlenteich.'},
  {id:'wiesenhof',name:'WIESENHOF',kind:'farm',x:-260,z:440,risk:0,detail:'Ein abgelegenes Gehöft über dem Birkenbach.'},
  {id:'jaeger',name:'JAGDHÜTTE',kind:'camp',x:-320,z:600,risk:0,detail:'Versteckte Vorräte in einer Lichtung.'},
  {id:'seecamp',name:'CAMPING WALDSEE',kind:'camp',x:-405,z:790,risk:1,detail:'Zelte am Ostufer. Das Feuer ist lange erloschen.'},
  {id:'radar',name:'RADARSTATION 12',kind:'radar',x:-780,z:-850,risk:2,detail:'Der hohe Sendemast steht über dem Hochforst.'},
  {id:'research',name:'LAZARUS · AUSSENLABOR',kind:'research',x:10,z:-870,risk:3,detail:'Versiegelte Versuchsanlage mit seltenen medizinischen Vorräten.'},
  {id:'quarry',name:'STEINBRUCH AUE',kind:'quarry',x:1040,z:160,risk:1,detail:'Terrassierter Abbau am östlichen Talhang.'},
  {id:'power',name:'UMSPANNWERK SÜD',kind:'power',x:1060,z:650,risk:2,detail:'Transformatoren hinter dem alten Kontrollzaun.'},
  {id:'rest',name:'RASTHOF NORD',kind:'rest',x:340,z:-590,risk:1,detail:'Ein verlassener Rastplatz am Nordzubringer.'},
  {id:'church',name:'ST. GEORG · KORNWEILER',kind:'church',x:-740,z:-600,risk:1,detail:'Kirchturm und ein stiller Friedhof am Dorfrand.'},
  {id:'fuel',name:'TANKSTELLE BRÜCKENFELD',kind:'gas',x:590,z:355,risk:1,detail:'Treibstofflager an der Zufahrt zur Talstraße.'},
];
export function riskAt(x:number,z:number){const poi=REGION_POIS.find(p=>Math.hypot(x-p.x,z-p.z)<55);return poi?.risk??(inLegacy(x,z)&&x>85?2:zoneAt(x,z)?.risk??0);}
export type Structure = Obstacle & {id:string;kind:'house'|'tower'|'apartment'|'warehouse'|'barn'|'ruin'|'service';width:number;depth:number;height:number;color:number;rotation:number;zone:string;enterable:boolean};
export const overlaps=(a:Obstacle,b:Obstacle,gap=1)=>Math.abs(a.x-b.x)<a.hx+b.hx+gap&&Math.abs(a.z-b.z)<a.hz+b.hz+gap;
function planStructures(){
  const out:Structure[]=[],occupied=new SpatialIndex<Structure>();let n=1;
  const add=(x:number,z:number,kind:Structure['kind'],zone:string,rotation=0,enterable=false)=>{
    const dimensions=kind==='tower'?[10,9,25+seeded(n*43)*35]:kind==='warehouse'?[15,11,6]:kind==='barn'?[10,7,6]:kind==='apartment'?[10,8,11+seeded(n*39)*7]:[5.5+seeded(n*11)*2,5+seeded(n*13)*2,4.3+seeded(n*17)*3];
    const [hx,hz,height]=dimensions,c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));
    const b:Structure={id:`structure-${n++}`,x,z,hx:c*hx+s*hz,hz:s*hx+c*hz,width:hx*2,depth:hz*2,kind,zone,height,color:[0x939180,0x8e8272,0x7c8c83,0xb3a08a,0xa9adb0][n%5],rotation,enterable};
    if(inLegacy(x,z,18)||x-b.hx<REGION_BOUNDS.minX+10||x+b.hx>REGION_BOUNDS.maxX-10||occupied.query(x,z,b.hx+4,b.hz+4).some(o=>overlaps(b,o,4)))return;
    const radius=Math.hypot(b.hx,b.hz);
    if(waterClearance(x,z)<radius+8||roadClearance(x,z)<radius+4)return;
    out.push(b);occupied.add(b);
  };
  // Irregular parcels around a legible downtown street system, tapering south.
  for(let z=-192;z<259;z+=26)for(let x=248;x<654;x+=26){
    const wx=x+(seeded(n*71)-.5)*12,wz=z+(seeded(n*73)-.5)*12,central=Math.hypot((wx-410)/180,(wz+50)/200);
    if(seeded(n*91)> (z>145?.62:.93)){n++;continue;}
    const kind=z>145?'house':central<.65&&seeded(n*31)>.38?'tower':'apartment';
    add(wx,wz,kind,z>145?'CITY_SUBURBS':'MAIN_CITY',0,kind==='apartment'&&n%3===0);
  }
  for(const z of [-260,-305,-365])for(const x of [430,520,570,640])add(x,z,'warehouse','INDUSTRIAL_ZONE');
  // Village parcels follow a curved main street; frontage offsets and gaps vary.
  for(const [id,pathId,cx,cz,radius]of [['VILLAGE_01','west',-650,-530,140],['VILLAGE_02','southwest',-740,500,150],['VILLAGE_03','south',690,420,125],['VILLAGE_04','north',650,-650,115]] as const){
    const line=ROAD_LINES.find(r=>r.id===pathId)!;
    let last:Point={x:Infinity,z:Infinity};
    for(let i=1;i<line.samples.length;i++){const p=line.samples[i],a=line.samples[i-1];if(Math.hypot(p.x-cx,p.z-cz)>radius||Math.hypot(p.x-last.x,p.z-last.z)<23+seeded(i*53)*12)continue;last=p;const angle=Math.atan2(p.x-a.x,p.z-a.z);
      for(const side of [-1,1]){const offset=21+seeded(n*47)*9;add(p.x+Math.cos(angle)*side*offset,p.z-Math.sin(angle)*side*offset,id==='VILLAGE_04'?'ruin':id==='VILLAGE_01'&&n%4===0?'barn':'house',id,angle-side*Math.PI/2);}
    }
  }
  // Extra lanes extend from each village square, sharing the regional network.
  for(const zone of WORLD_ZONES.filter(z=>z.biome==='village'))for(let i=0;i<5;i++){
    const x=zone.x-60+i*28,z=zone.z+(i%2?44:-52);add(x,z,zone.id==='VILLAGE_04'?'ruin':'house',zone.id,0);
  }
  for(const poi of REGION_POIS){const kind=poi.kind==='farm'?'barn':poi.kind==='research'||poi.kind==='power'?'warehouse':poi.kind==='church'?'service':'house';add(poi.x+25,poi.z+22,kind,poi.id,0,true);if(poi.kind==='farm')add(poi.x-22,poi.z+24,'house',poi.id);}
  for(const[x,z]of [[-462,-858],[-400,-858],[-338,-858],[-470,-790],[-330,-790]])add(x,z,'warehouse','MILITARY_BASE',0,true);
  return out;
}
export const STRUCTURES=planStructures();
export const PARKED_CARS=WORLD_ZONES.filter(z=>z.biome==='village'||z.id==='INDUSTRIAL_ZONE').flatMap(p=>{
  for(let i=0;i<24;i++){const angle=i*2.4,r=18+i*1.5,x=p.x+Math.cos(angle)*r,z=p.z+Math.sin(angle)*r;
    if(roadClearance(x,z)>5&&waterClearance(x,z)>7&&!STRUCTURES.some(b=>overlaps({x,z,hx:1.8,hz:2.5},b,3)))return [{x,z,color:p.risk}];
  }return [];
});
export const REGION_SIGNS=[...WORLD_ZONES.filter(z=>z.biome==='village'||z.id==='MILITARY_BASE'||z.id==='INDUSTRIAL_ZONE'),...REGION_POIS].flatMap(p=>{
  for(let i=0;i<32;i++){const angle=i*2.4,r=16+i*.65,x=p.x+Math.cos(angle)*r,z=p.z+Math.sin(angle)*r;
    if(roadClearance(x,z)>3&&waterClearance(x,z)>5&&!STRUCTURES.some(b=>overlaps({x,z,hx:2,hz:.5},b,2))&&!PARKED_CARS.some(b=>Math.hypot(x-b.x,z-b.z)<5))return [{x,z,name:p.name,risk:p.risk}];
  }return [];
});
export const REGION_LOOT:{kind:LootKind;x:number;z:number;count:number}[]=[
  ...WORLD_ZONES.filter(z=>z.biome==='village'||z.id==='MILITARY_BASE'||z.id==='INDUSTRIAL_ZONE').flatMap((p,i)=>[
    {kind:(p.risk===3?'rifleAmmo':i%2?'scrap':'ration') as LootKind,x:p.x,z:p.z,count:p.risk===3?60:3},
    {kind:(p.risk===3?'armor':'water') as LootKind,x:p.x+3,z:p.z,count:2},
    {kind:(p.risk>=2?'antibiotic':'medkit') as LootKind,x:p.x-3,z:p.z,count:2},
  ]),
  ...REGION_POIS.flatMap(p=>[{kind:(p.kind==='research'?'antibiotic':p.kind==='farm'?'ration':p.risk>=2?'rifleAmmo':'scrap') as LootKind,x:p.x,z:p.z,count:p.risk>=2&&p.kind!=='research'?30:2},{kind:'water' as LootKind,x:p.x+3,z:p.z,count:2}]),
  ...STRUCTURES.filter(s=>s.enterable).map((s,i)=>({kind:(s.zone==='MILITARY_BASE'?'rifleAmmo':s.zone==='research'?'medkit':s.zone==='MAIN_CITY'?['ammo','medkit','water','scrap'][i%4]:'ration') as LootKind,x:s.x,z:s.z,count:s.zone==='MILITARY_BASE'?30:s.zone==='MAIN_CITY'&&i%4===0?24:2})),
];

export type TreePlacement=Point&{species:'pine'|'broadleaf';variant:number;scale:number;rotation:number};
export function planTrees(){const trees:TreePlacement[]=[];const occupied=new SpatialIndex<Obstacle>();for(const s of STRUCTURES)occupied.add(s);let n=1;
  for(let z=REGION_BOUNDS.minZ+14;z<REGION_BOUNDS.maxZ-14;z+=14)for(let x=REGION_BOUNDS.minX+14;x<REGION_BOUNDS.maxX-14;x+=14,n++){
    const wx=x+(seeded(n*13)-.5)*10,wz=z+(seeded(n*19)-.5)*10,d=forestDensity(wx,wz);
    if(seeded(n*23)>d*.88||roadClearance(wx,wz)<7||occupied.query(wx,wz,9).length||REGION_LOOT.some(p=>Math.hypot(p.x-wx,p.z-wz)<8)||PARKED_CARS.some(p=>Math.hypot(p.x-wx,p.z-wz)<8)||REGION_SIGNS.some(p=>Math.hypot(p.x-wx,p.z-wz)<5))continue;
    trees.push({x:wx,z:wz,species:seeded(n*37)>.28?'pine':'broadleaf',variant:n%4,scale:.95+seeded(n*29)*.65,rotation:seeded(n*31)*Math.PI*2});
  }return trees;}
export const TREES=planTrees();
