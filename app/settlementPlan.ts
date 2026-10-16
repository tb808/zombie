import { findPath, type Obstacle, type Point } from './survival.ts';
import { CITY_PLACES, CITY_LOOT, CITY_NPCS, DISCOVERIES } from './city.ts';
import { HOUSE_LOOT } from './safehouses.ts';
import { REFUGES } from './environment.ts';
import { LOOT, NOTES, segmentBlocked } from './world.ts';
import { BRIDGES, PARKED_CARS, REGION_LOOT, REGION_POIS, REGION_SIGNS, ROAD_LINES, SITE_FIXTURES, STRUCTURES, TREES, SpatialIndex, lineDistance, nearestOn, overlaps, seeded, waterClearance, zoneAt } from './regionPlan.ts';
import { terrainHeight } from './regionTerrain.ts';
import { CAMPAIGN } from './campaign.ts';
import { STORY_ACTIVITIES } from './storyActivities.ts';
import { STORY_EXTRA_POINTS } from './storyNarrative.ts';
import { LEGACY_PARKING, STREET_LINES, STREET_SEGMENTS, footprintStreetClearance, sidewalkWidth, streetClearance } from './streetPlan.ts';
import { LEGACY_FOUNDATIONS } from './legacyLayout.ts';

export type PropKind = 'lamp'|'villageLamp'|'brokenLamp'|'bench'|'bin'|'tippedBin'|'mailbox'|'cabinet'|'hydrant'|'bollard'|'trafficLight'|'sign'|'streetSign'|'busStop'|'shelter'|'advert'|'bikeRack'|'bicycle'|'luggage'|'bag'|'litter'|'pallet'|'crate'|'barrel'|'dumpster'|'cone'|'barrier'|'container'|'cableReel'|'pipes'|'forklift'|'tractor'|'trailer'|'car'|'wreck'|'policeCar'|'ambulance'|'fireTruck'|'van'|'truck'|'bus'|'table'|'chair'|'fallenChair'|'umbrella'|'cart'|'cartShelter'|'hedge'|'planter'|'smallTree'|'weeds'|'shed'|'logs'|'well'|'swing'|'slide'|'priceSign';
type Definition = { w:number;d:number;solid:boolean;distance:number };
// Conservative footprints include mirrors, handlebars, roof overhangs and open
// doors. Large assemblies reserve their own area; decorations have no collider.
export const PROP_DEFS:Record<PropKind,Definition> = {
  lamp:{w:1.7,d:.6,solid:true,distance:220},villageLamp:{w:.8,d:.8,solid:true,distance:180},brokenLamp:{w:1,d:4.3,solid:true,distance:125},
  bench:{w:2,d:.85,solid:true,distance:145},bin:{w:.65,d:.65,solid:true,distance:120},tippedBin:{w:1.1,d:1.1,solid:true,distance:100},mailbox:{w:.65,d:.6,solid:true,distance:125},cabinet:{w:1,d:.6,solid:true,distance:145},hydrant:{w:.55,d:.55,solid:true,distance:130},bollard:{w:.24,d:.24,solid:true,distance:150},trafficLight:{w:.55,d:.6,solid:true,distance:200},
  sign:{w:.85,d:.3,solid:true,distance:170},streetSign:{w:1.3,d:.4,solid:true,distance:150},busStop:{w:.6,d:.4,solid:true,distance:180},shelter:{w:4.4,d:1.9,solid:true,distance:185},advert:{w:2,d:.3,solid:true,distance:155},bikeRack:{w:2.2,d:.8,solid:true,distance:125},bicycle:{w:.55,d:1.9,solid:true,distance:125},luggage:{w:.55,d:.4,solid:false,distance:95},bag:{w:.55,d:.55,solid:false,distance:80},litter:{w:.55,d:.5,solid:false,distance:65},
  pallet:{w:1.3,d:1.1,solid:true,distance:120},crate:{w:1.3,d:1,solid:true,distance:130},barrel:{w:.9,d:.9,solid:true,distance:140},dumpster:{w:2.2,d:1.4,solid:true,distance:155},cone:{w:.45,d:.45,solid:false,distance:120},barrier:{w:2.6,d:.55,solid:true,distance:160},container:{w:6.2,d:2.5,solid:true,distance:210},cableReel:{w:1.4,d:1.2,solid:true,distance:150},pipes:{w:1.5,d:3.5,solid:true,distance:160},forklift:{w:1.7,d:3.6,solid:true,distance:180},tractor:{w:2.3,d:4.5,solid:true,distance:200},trailer:{w:2.5,d:4.5,solid:true,distance:190},
  car:{w:2.4,d:4.7,solid:true,distance:220},wreck:{w:3.2,d:5.1,solid:true,distance:200},policeCar:{w:2.4,d:4.7,solid:true,distance:220},ambulance:{w:2.4,d:5.5,solid:true,distance:220},fireTruck:{w:2.65,d:7,solid:true,distance:240},van:{w:2.4,d:5.5,solid:true,distance:220},truck:{w:2.7,d:8,solid:true,distance:240},bus:{w:2.7,d:9,solid:true,distance:240},
  table:{w:1.2,d:1.2,solid:true,distance:130},chair:{w:.65,d:.65,solid:true,distance:110},fallenChair:{w:.85,d:1.2,solid:false,distance:100},umbrella:{w:2.5,d:2.5,solid:false,distance:150},cart:{w:.75,d:1.35,solid:true,distance:140},cartShelter:{w:4.4,d:2,solid:true,distance:175},hedge:{w:2.8,d:.9,solid:true,distance:150},planter:{w:1.2,d:.6,solid:true,distance:140},smallTree:{w:2,d:2,solid:true,distance:210},weeds:{w:.5,d:.5,solid:false,distance:70},shed:{w:3.2,d:3,solid:true,distance:210},logs:{w:2.7,d:3,solid:true,distance:160},well:{w:2,d:2,solid:true,distance:190},swing:{w:3.4,d:2.6,solid:true,distance:180},slide:{w:1.4,d:3.5,solid:true,distance:170},priceSign:{w:1.4,d:.45,solid:true,distance:190},
};
export type SettlementProp = Obstacle & { id:string;kind:PropKind;rotation:number;variant:number;zone:string;scene:string;y:number;distance:number };
export type DressingLine = { a:Point;b:Point;width:number;kind:'curb'|'walk'|'stripe'|'parking'|'crossing'|'crack';scene:string };
export type SettlementScene = Point & {id:string;name:string;zone:string;kind:string};
export type DressingSurface = Point & {width:number;depth:number;rotation?:number;kind:'paving'|'asphalt';scene:string};
export type SettlementPlan = {props:SettlementProp[];lines:DressingLine[];scenes:SettlementScene[];surfaces:DressingSurface[]};

export const SETTLEMENT_ROADS=STREET_SEGMENTS;
export const dressingRoadClearance=streetClearance;
const entrancePads=STRUCTURES.flatMap(b=>[-1,1].map(side=>{const c=Math.cos(b.rotation),s=Math.sin(b.rotation);return {ownerId:b.id,x:b.x+side*(b.depth/2+2)*s,z:b.z+side*(b.depth/2+2)*c,hx:Math.abs(c)*1.2+Math.abs(s)*2,hz:Math.abs(s)*1.2+Math.abs(c)*2};}));
export const DRESSING_RESERVED:Point[]=[...REGION_LOOT,...CITY_LOOT,...HOUSE_LOOT,...LOOT,...NOTES,...DISCOVERIES,...CITY_NPCS,
  ...CAMPAIGN,...STORY_EXTRA_POINTS,...STORY_ACTIVITIES.flatMap(m=>[...m.steps,...(m.actor?[m.actor]:[])]),
  {x:-61,z:-35},{x:-53,z:-37},{x:-49,z:-34},{x:-19,z:-4},{x:17,z:15},{x:48,z:23},{x:66,z:-25},{x:120,z:90},
];
function fixedFootprints():Obstacle[]{return [
  ...STRUCTURES.map(b=>({...b,hx:b.hx+(b.kind==='tower'||b.kind==='apartment'?3.5:2),hz:b.hz+(b.kind==='tower'||b.kind==='apartment'?3.5:2)})),...SITE_FIXTURES,...LEGACY_FOUNDATIONS,
  ...CITY_PLACES.map(b=>({...b,hx:b.hx??7.8,hz:b.hz??7.5})),...REFUGES,
  ...PARKED_CARS.map(p=>({...p,hx:2,hz:2.8})),...REGION_SIGNS.map(p=>({...p,hx:2,hz:.5})),...TREES.map(p=>({...p,hx:1,hz:1})),...entrancePads,
  // Existing street cars, original skyline, and forestry yard.
  ...LEGACY_PARKING.map(p=>({...p,hx:1.2,hz:2.4})),
  ...[173,181,189].map(x=>({x,z:68,hx:3.2,hz:1.65})),
  ...[105,136,167,198].flatMap(x=>[-161,138].map(z=>({x,z,hx:5.8,hz:6.3}))),{x:-793,z:585,hx:8,hz:5},
];}
export function planSettlementDetail(extraFootprints:readonly Obstacle[]=[],extraReserved:readonly Point[]=[]):SettlementPlan{
  const props:SettlementProp[]=[],lines:DressingLine[]=[],scenes:SettlementScene[]=[],surfaces:DressingSurface[]=[],occupied=new SpatialIndex<Obstacle>(32);
  [...fixedFootprints(),...extraFootprints].forEach(p=>occupied.add(p));
  const reserved=[...DRESSING_RESERVED,...extraReserved];let serial=1;
  const line=(a:Point,b:Point,width:number,kind:DressingLine['kind'],scene='street')=>{if(Math.hypot(a.x-b.x,a.z-b.z)>.08)lines.push({a,b,width,kind,scene});};
  line({x:18,z:2.7},{x:18,z:4.5},1.5,'walk','cemetery-access');
  line({x:18,z:4.5},{x:22,z:7},1.5,'walk','cemetery-access');
  line({x:22,z:7},{x:22,z:16.2},1.5,'walk','cemetery-access');
  // Paths use the actual building walls, rather than the larger planting/prop
  // reservations. A route around a house must never cut through that house.
  const access=new SpatialIndex<Obstacle>(32);
  [...STRUCTURES,...LEGACY_FOUNDATIONS,...SITE_FIXTURES.filter(p=>p.solid),...TREES.map(p=>({...p,hx:.4,hz:.4})),...CITY_PLACES.map(p=>({...p,hx:p.hx??7.5,hz:p.hz??7})),...extraFootprints].forEach(p=>access.add(p));
  const accessBuildings=[...STRUCTURES,...LEGACY_FOUNDATIONS.map(b=>({...b,id:b.name,enterable:true,width:2*(Math.abs(Math.cos(b.rotation))*b.hx+Math.abs(Math.sin(b.rotation))*b.hz),depth:2*(Math.abs(Math.cos(b.rotation))*b.hz+Math.abs(Math.sin(b.rotation))*b.hx)}))];
  for(const b of accessBuildings){
    const local=(dz:number)=>({x:b.x+Math.sin(b.rotation)*dz,z:b.z+Math.cos(b.rotation)*dz});
    for(const side of b.enterable?[-1,1]:[1]){
      const apron=Math.min(b.hx/Math.max(.001,Math.abs(Math.sin(b.rotation))),b.hz/Math.max(.001,Math.abs(Math.cos(b.rotation))))+1.4;
      const front=local(side*(b.depth/2+.4)),gate=local(side*apron),scene=`yard-${b.id}`;
      line(front,gate,1.5,'walk',scene);
      let connected=false;
      const candidates=SETTLEMENT_ROADS.map(r=>({r,q:nearestOn(gate,r.a,r.b)})).sort((a,b)=>Math.hypot(a.q.x-gate.x,a.q.z-gate.z)-Math.hypot(b.q.x-gate.x,b.q.z-gate.z));
      for(const {r,q}of candidates.slice(0,12)){
        const distance=Math.hypot(gate.x-q.x,gate.z-q.z);if(distance<r.width/2+1||distance>85)continue;
        const offset=r.width/2+Math.max(.2,sidewalkWidth(r,q)*.65),end={x:q.x+(gate.x-q.x)/distance*offset,z:q.z+(gate.z-q.z)/distance*offset};
        const steps=Math.ceil(distance),clear=Array.from({length:steps+1},(_,i)=>({x:gate.x+(end.x-gate.x)*i/steps,z:gate.z+(end.z-gate.z)*i/steps})).every(p=>waterClearance(p.x,p.z)>2&&streetClearance(p.x,p.z)>.05&&!access.query(p.x,p.z,.8).some(o=>overlaps({...p,hx:.75,hz:.75},o,0)));
        if(clear){line(gate,end,1.5,'walk',scene);connected=true;break;}
      }
      if(!connected)for(const {r,q}of candidates.slice(0,6)){
        const distance=Math.hypot(gate.x-q.x,gate.z-q.z);if(distance<r.width/2+1||distance>100)continue;
        const offset=r.width/2+Math.max(1,sidewalkWidth(r,q)*.65),end={x:q.x+(gate.x-q.x)/distance*offset,z:q.z+(gate.z-q.z)/distance*offset},centre={x:(gate.x+end.x)/2,z:(gate.z+end.z)/2},radius=distance/2+18;
        const blocked=access.query(centre.x,centre.z,radius);
        const path=findPath(gate,end,blocked,.8);if(!path.length)continue;
        const points=[gate,...path];
        if(!points.slice(1).every((p,i)=>{const a=points[i],steps=Math.ceil(Math.hypot(p.x-a.x,p.z-a.z));return Array.from({length:steps+1},(_,n)=>({x:a.x+(p.x-a.x)*n/steps,z:a.z+(p.z-a.z)*n/steps})).every(q=>waterClearance(q.x,q.z)>2&&streetClearance(q.x,q.z)>.05);}))continue;
        const inflated=blocked.map(o=>({...o,hx:o.hx+.8,hz:o.hz+.8})),smooth=[gate];let cursor=0;
        while(cursor<points.length-1){
          let next=points.length-1;
          for(;next>cursor+1;next--){const a=points[cursor],b=points[next],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
            if(!segmentBlocked(a.x,a.z,b.x,b.z,inflated)&&Array.from({length:steps+1},(_,i)=>({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps})).every(p=>waterClearance(p.x,p.z)>2&&streetClearance(p.x,p.z)>.05))break;
          }smooth.push(points[next]);cursor=next;
        }
        for(let i=1;i<smooth.length;i++)line(smooth[i-1],smooth[i],1.5,'walk',scene);break;
      }
    }
  }
  const put=(kind:PropKind,x:number,z:number,rotation=0,zone='MAIN_CITY',scene='street',variant=serial%3,probe=false)=>{
    const d=PROP_DEFS[kind],c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation)),hx=(c*d.w+s*d.d)/2,hz=(s*d.w+c*d.d)/2;
    const footprint={x,z,hx,hz},y=terrainHeight(x,z);
    const across=Math.hypot(hx,hz);
    if((kind==='lamp'||kind==='villageLamp')&&props.some(p=>(p.kind==='lamp'||p.kind==='villageLamp')&&Math.hypot(p.x-x,p.z-z)<18))return false;
    if(!Number.isFinite(y)||waterClearance(x,z)<across+2||footprintStreetClearance(footprint,true)<.4||occupied.query(x,z,hx+.35,hz+.35).some(o=>overlaps(footprint,o,.35))||reserved.some(p=>Math.abs(x-p.x)<hx+1.8&&Math.abs(z-p.z)<hz+1.8)||BRIDGES.some(b=>Math.hypot(x-b.x,z-b.z)<b.length/2+6)||lines.some(l=>l.kind==='walk'&&lineDistance({x,z},{...l,id:'walk',kind:'walk'})<across+l.width/2+.6))return false;
    if(Math.max(...[[hx,hz],[-hx,hz],[hx,-hz],[-hx,-hz]].map(([dx,dz])=>Math.abs(terrainHeight(x+dx,z+dz)-y)))>.22)return false;
    if(probe)return true;
    const prop={id:`dressing-${serial++}`,kind,x,z,hx,hz,rotation,variant,zone,scene,y,distance:d.distance};props.push(prop);occupied.add(prop);return true;
  };
  const stops=[['zentrum',370,-62,'MAIN_CITY'],['linden',475,184,'CITY_SUBURBS'],['kornweiler',-676,-508,'VILLAGE_01'],['fichtenau',-765,530,'VILLAGE_02'],['brueckenfeld',670,442,'VILLAGE_03'],['aschenrode',625,-678,'VILLAGE_04']] as const;
  for(const[id,x,z,zone]of stops){
    const candidates=SETTLEMENT_ROADS.filter(r=>sidewalkWidth(r,nearestOn({x,z},r.a,r.b))>0).sort((a,b)=>lineDistance({x,z},a)-lineDistance({x,z},b));
    let placed=false;
    for(const closest of candidates.filter(r=>lineDistance({x,z},r)<100).slice(0,150)){
      const q=nearestOn({x,z},closest.a,closest.b),angle=Math.atan2(closest.b.x-closest.a.x,closest.b.z-closest.a.z);
      for(const side of [1,-1]){
        const ox=Math.cos(angle)*side,oz=-Math.sin(angle)*side,offset=closest.width/2+sidewalkWidth(closest,q)+1.8,centre={x:q.x+ox*offset,z:q.z+oz*offset},rotation=angle-side*Math.PI/2;
        const pole={x:centre.x-Math.sin(angle)*5.2-ox,z:centre.z-Math.cos(angle)*5.2-oz};
        if(!put('shelter',centre.x,centre.z,rotation,zone,`stop-${id}`,0,true)||!put('busStop',pole.x,pole.z,rotation,zone,`stop-${id}`,0,true))continue;
        put('shelter',centre.x,centre.z,rotation,zone,`stop-${id}`);put('busStop',pole.x,pole.z,rotation,zone,`stop-${id}`);
        const placeLocal=(kind:PropKind,along:number,out:number)=>put(kind,centre.x+Math.sin(angle)*along+ox*out,centre.z+Math.cos(angle)*along+oz*out,rotation,zone,`stop-${id}`);
        placeLocal('bench',5.5,0);placeLocal('bin',-4,1);placeLocal('luggage',3.2,0);placeLocal('bag',-3.2,0);placeLocal('bicycle',8,0);placeLocal('sign',-7,1);
        surfaces.push({...centre,width:4.8,depth:2.5,rotation,kind:'paving',scene:`stop-${id}`});
        scenes.push({...centre,id:`stop-${id}`,name:`HALTESTELLE · ${id.toUpperCase()}`,kind:'busStop',zone});placed=true;break;
      }if(placed)break;
    }
  }
  const district=(x:number,z:number)=>z<-225?'INDUSTRIAL_ZONE':z>145?'CITY_SUBURBS':'MAIN_CITY';
  const roads=STREET_LINES.map(r=>({...r,samples:r.samples.flatMap((p,i)=>{
    if(i===r.samples.length-1)return [p];const q=r.samples[i+1],steps=Math.ceil(Math.hypot(q.x-p.x,q.z-p.z)/10);
    return Array.from({length:steps},(_,n)=>({x:p.x+(q.x-p.x)*n/steps,z:p.z+(q.z-p.z)*n/steps}));
  })}));
  // Verge furniture follows actual street tangents. Separate intervals and
  // staggered sides avoid a repeated lamp/bench/bin row at identical distances.
  for(const road of roads){let travel=0,next=9+seeded(road.id.length*33)*14;
    for(let i=1;i<road.samples.length;i++){const a=road.samples[i-1],p=road.samples[i],step=Math.hypot(p.x-a.x,p.z-a.z),angle=Math.atan2(p.x-a.x,p.z-a.z);travel+=step;
      const village=zoneAt(p.x,p.z)?.biome==='village',walk=sidewalkWidth({...road,a,b:p},p),zone=village?zoneAt(p.x,p.z)!.id:district(p.x,p.z);
      if(!walk){next=travel+12;continue;}
      if(travel<next)continue;next=travel+(village?38+seeded(i*71)*20:27+seeded(i*71)*15);
      for(const side of [-1,1]){const offset=road.width/2+walk+(village?1.2:1.6),wx=p.x+Math.cos(angle)*side*offset,wz=p.z-Math.sin(angle)*side*offset;
        put(village?'villageLamp':'lamp',wx,wz,angle+(side>0?Math.PI:0),zone);
        if(!village&&zone==='MAIN_CITY'){
          const fx=wx+Math.sin(angle)*5,fz=wz+Math.cos(angle)*5;
          put(i%4===0?'bench':i%4===1?'bin':i%4===2?'hydrant':'cabinet',fx,fz,angle-side*Math.PI/2,zone);
          if(i%3===0)put('litter',fx+Math.cos(angle)*1.2,fz-Math.sin(angle)*1.2,i,zone);
        }
      }
    }
  }
  // Major junctions: stop lines, zebra crossings and corner-mounted signals.
  for(const x of [270,370,475,580])for(const z of [-104,4,104]){
    for(const [dx,dz,rotation]of [[10.5,10.5,0],[-10.5,-10.5,Math.PI]] as const){put('trafficLight',x+dx,z+dz,rotation);put('streetSign',x+dx+2,z+dz,rotation);}
    for(const side of [-1,1]){
      for(let i=-3;i<=3;i++)line({x:x+i*.9,z:z+side*8-1.5},{x:x+i*.9,z:z+side*8+1.5},.52,'crossing');
      line({x:x-4.5,z:z+side*13},{x:x+4.5,z:z+side*13},.28,'stripe');
    }
  }
  // Building yards use the facade's orientation. Two clear metres around an
  // entrance are reserved for doors, window construction and navigation.
  for(const b of STRUCTURES){const c=Math.cos(b.rotation),s=Math.sin(b.rotation),local=(dx:number,dz:number)=>({x:b.x+dx*c+dz*s,z:b.z-dx*s+dz*c}),scene=`yard-${b.id}`;
    const offset=b.depth/2+4.8,home=b.kind==='house'||b.kind==='ruin';
    if(home){
      for(const [kind,dx,dz]of [['mailbox',b.width/2+2.8,offset],['bin',-b.width/2-3,offset-1],['planter',b.width/2+2.8,offset-3]] as const){const p=local(dx,dz);put(kind,p.x,p.z,b.rotation,b.zone,scene);}
      const p=local(-b.width/2-3.5,-2);put('hedge',p.x,p.z,b.rotation+Math.PI/2,b.zone,scene);
      const q=local(b.width/2+4.3,-2);put(b.zone==='VILLAGE_02'?'logs':b.zone==='VILLAGE_01'?'trailer':'bicycle',q.x,q.z,b.rotation,b.zone,scene);
      if(seeded(b.x*13+b.z*17)>.62){const p=local(-b.width/2-5,-b.depth/2-4);put('shed',p.x,p.z,b.rotation,b.zone,scene);}
      if(seeded(b.x*19+b.z*3)>.4){const p=local(b.width/2+4.5,-b.depth/2-4.5);put('smallTree',p.x,p.z,0,b.zone,scene);}
      if(b.kind==='ruin'){const p=local(-3,offset+1);put('tippedBin',p.x,p.z,b.rotation+.8,b.zone,scene);put('bag',p.x+1.8,p.z+.5,.3,b.zone,scene);}
    }else if(b.kind==='warehouse'||b.kind==='barn'){
      for(const [kind,dx,dz]of [['pallet',-b.width/2-4,4],['crate',-b.width/2-4,1.7],['barrel',-b.width/2-4,-.5],['dumpster',b.width/2+4.5,-3]] as const){const p=local(dx,dz);put(kind,p.x,p.z,b.rotation,b.zone,scene);}
      const p=local(5,offset+3);put(b.kind==='barn'?'tractor':'truck',p.x,p.z,b.rotation,b.zone,scene);
      const q=local(-5,-offset);put(b.kind==='barn'?'logs':'container',q.x,q.z,b.rotation,b.zone,scene);
    }else{
      for(const [kind,dx,dz]of [['bikeRack',b.width/2+5,offset],['advert',-b.width/2-5,offset],['planter',b.width/2+5,-offset],['bin',-b.width/2-5,-offset]] as const){const p=local(dx,dz);put(kind,p.x,p.z,b.rotation,b.zone,scene);}
    }
    for(const side of [-1,1]){const p=local(side*(b.width/2+2.8),-b.depth/2-2.8);put('weeds',p.x,p.z,b.rotation,b.zone,scene);}
  }
  // Off-street parking follows curbs; varied colours and occasional empty bays.
  for(const road of ROAD_LINES.filter(r=>r.id.startsWith('city-long-'))){
    for(let z=-180;z<230;z+=31+seeded(z+300)*9){const x=road.samples[0].x+road.width/2+5.6,p={x,z},zone=district(x,z);
      if(put(seeded(z*31)>.93?'wreck':'car',x,z,seeded(z*13)*.12-.06,zone,'curb-parking')){
        surfaces.push({x,z,width:3.1,depth:5.8,kind:'asphalt',scene:'curb-parking'});
        for(const side of [-1,1])line({x:x+side*1.4,z:z-2.7},{x:x+side*1.4,z:z+2.7},.08,'parking');line({x:x-1.4,z:z-2.7},{x:x+1.4,z:z-2.7},.08,'parking');
      }
      if(z>200)put('smallTree',p.x+4.5,p.z,0,zone);
    }
  }
  // Find open parcels near the stated context, then furnish a coherent scene.
  const sceneAt=(id:string,name:string,kind:string,x:number,z:number,zone:string,layout:readonly [PropKind,number,number,number?][])=>{
    const before=props.length;
    for(const [prop,dx,dz,rotation]of layout)put(prop,x+dx,z+dz,rotation??0,zone,id);
    if(props.length>before){scenes.push({id,name,kind,x,z,zone});
      if(['cafe','square','market','construction','industry'].includes(kind)&&zone!=='LEGACY_CITY'){
        const group=props.slice(before),minX=Math.min(...group.map(p=>p.x-p.hx))-.25,maxX=Math.max(...group.map(p=>p.x+p.hx))+.25,minZ=Math.min(...group.map(p=>p.z-p.hz))-.25,maxZ=Math.max(...group.map(p=>p.z+p.hz))+.25;
        surfaces.push({x:(minX+maxX)/2,z:(minZ+maxZ)/2,width:maxX-minX,depth:maxZ-minZ,kind:kind==='market'||kind==='industry'?'asphalt':'paving',scene:id});
        if(kind==='market')for(const p of group.filter(p=>p.kind==='car'||p.kind==='van'))for(const side of [-1,1])line({x:p.x+side*1.5,z:p.z-3},{x:p.x+side*1.5,z:p.z+3},.08,'parking',id);
      }
    }
  };
  const findSite=(x:number,z:number,hx:number,hz:number)=>{
    for(let i=0;i<160;i++){const angle=i*2.399,r=i?5+Math.sqrt(i)*4:0,p={x:x+Math.cos(angle)*r,z:z+Math.sin(angle)*r,hx,hz};
      const y=terrainHeight(p.x,p.z),level=[[-hx,-hz],[hx,-hz],[-hx,hz],[hx,hz],[0,-hz],[0,hz],[-hx,0],[hx,0]].every(([dx,dz])=>Math.abs(terrainHeight(p.x+dx,p.z+dz)-y)<.18);
      if(level&&!occupied.query(p.x,p.z,hx+1,hz+1).some(o=>overlaps(p,o,1))&&waterClearance(p.x,p.z)>Math.hypot(hx,hz)+3&&footprintStreetClearance(p,true)>1&&!lines.some(l=>l.kind==='walk'&&lineDistance(p,{...l,id:'walk'})<Math.hypot(hx,hz)+l.width/2)&&!reserved.some(q=>Math.abs(q.x-p.x)<hx+3&&Math.abs(q.z-p.z)<hz+3))return p;
    }return null;
  };
  const plannedScenes:[string,string,string,number,number,string,readonly [PropKind,number,number,number?][]][]=[
    ['cafe-square','CAFÉ AM TURM','cafe',403,-55,'MAIN_CITY',[['table',-4,0],['chair',-5.5,0,Math.PI/2],['chair',-2.5,0,-Math.PI/2],['umbrella',-4,-3],['table',1,1],['fallenChair',2.8,1,.5],['chair',1,2.5,Math.PI],['bin',5,-4],['bikeRack',5,3],['litter',3,-2],['advert',-5,-5]]],
    ['market-square','ALTER MARKTPLATZ','square',317,-60,'MAIN_CITY',[['well',0,0],['bench',-5,0,Math.PI/2],['bench',5,0,-Math.PI/2],['planter',-4,-5],['planter',4,-5],['bin',5,3],['luggage',-3,3],['smallTree',0,-6],['bollard',-6,5],['bollard',6,5]]],
    ['city-park','LINDENPARK','park',535,159,'CITY_SUBURBS',[['bench',-6,0,Math.PI/2],['bench',6,0,-Math.PI/2],['smallTree',-5,-5],['smallTree',5,-5],['hedge',-6,5],['hedge',6,5],['bin',3,3],['swing',0,-2],['slide',0,4],['bicycle',8,1],['weeds',-7,-3]]],
    ['construction','ABGEBROCHENE BAUSTELLE','construction',610,-45,'MAIN_CITY',[['barrier',-4,-6],['barrier',0,-6],['cone',4,-6],['cone',5,-3],['pallet',-4,1],['pallet',-4,3],['pipes',0,2],['cableReel',3,2],['forklift',5,3],['container',-2,7],['crate',2,-1],['barrel',-5,-2]]],
    ['supermarket-parking','NAHKAUF · PARKPLATZ','market',329,178,'CITY_SUBURBS',[['car',-5,1],['van',0,1],['cartShelter',5,-3],['cart',6,1],['cart',5,3],['dumpster',-5,-5],['advert',0,-6],['smallTree',8,5],['litter',3,4]]],
    ['loading-yard','OSTWERK · LADEHOF','industry',562,-280,'INDUSTRIAL_ZONE',[['container',-3,-5],['truck',4,2],['forklift',-4,2],['pallet',0,2],['crate',0,4],['cableReel',-4,5],['dumpster',5,-5],['cabinet',0,-1]]],
  ];
  for(const [id,name,kind,x,z,zone,layout]of plannedScenes){const site=findSite(x,z,9,10)??findSite(x,z,7,8);if(site)sceneAt(id,name,kind,site.x,site.z,zone,layout);}
  // Existing public buildings keep all quest interactions and construction
  // points clear. Emergency vehicles are placed beside their actual destination.
  sceneAt('st-anna','ST. ANNA · EVAKUIERUNG','hospital',130,-89,'LEGACY_CITY',[['ambulance',0,0],['barrier',-6,0],['luggage',-3,3],['bag',-4,2]]);
  sceneAt('police-yard','POLIZEI · ABSPERRUNG','police',175,-89,'LEGACY_CITY',[['policeCar',0,0],['barrier',-5,0],['cone',-7,1],['cone',-7,-1]]);
  sceneAt('fire-yard','WACHE 04 · AUSFAHRT','fire',108,44,'LEGACY_CITY',[['fireTruck',0,0,Math.PI/2],['cone',-5,0],['hydrant',-7,0]]);
  sceneAt('old-cafe','CAFÉ ZUR LINDE · TERRASSE','cafe',140,44,'LEGACY_CITY',[['table',0,0],['chair',1.3,0,-Math.PI/2],['fallenChair',0,1.5,.8],['litter',-1,1],['planter',0,-2]]);
  sceneAt('old-market','MARKTHALLE · LIEFERUNG','market',126,-34,'LEGACY_CITY',[['cart',0,0],['cart',2,1,.2],['dumpster',-4,0],['crate',-1,-1]]);
  sceneAt('station-evac','BAHNHOF · LETZTER BUS','evacuation',190,119,'LEGACY_CITY',[['bus',0,0,Math.PI/2],['luggage',-6,0],['luggage',-5,1],['barrier',0,4],['bag',5,2]]);
  for(const[id,x,z,zone,layout]of [
    ['korn-hof',-687,-552,'VILLAGE_01',[['tractor',0,0],['trailer',0,-6],['well',6,0],['logs',-5,1],['shed',6,-6]]],
    ['fichten-hof',-781,565,'VILLAGE_02',[['trailer',0,0],['logs',-4,0],['shed',5,-5],['pallet',5,1],['barrel',4,3]]],
    ['bruecken-hof',678,477,'VILLAGE_03',[['van',0,0],['bench',5,0],['well',5,4],['bicycle',-3,0],['cabinet',-4,3]]],
    ['aschen-sperre',661,-709,'VILLAGE_04',[['wreck',0,0,.3],['barrier',5,0],['tippedBin',-4,0],['brokenLamp',-6,-4,1.2],['bag',4,3],['litter',3,1]]],
  ] as [string,number,number,string,[PropKind,number,number,number?][]][]){const site=findSite(x,z,8,8);if(site)sceneAt(id,id.replace('-',' · ').toUpperCase(),'villageYard',site.x,site.z,zone,layout);}
  for(const poi of REGION_POIS.filter(p=>p.kind==='gas'||p.kind==='rest'))sceneAt(`${poi.id}-forecourt`,`${poi.name} · VORPLATZ`,'fuel',poi.x,poi.z,poi.id,[['priceSign',-13,0],[poi.kind==='rest'?'ambulance':'car',12,-10],['dumpster',15,4],['barrel',-14,-8],['bin',-10,-8],['cone',12,0]]);
  return {props,lines,scenes,surfaces};
}
