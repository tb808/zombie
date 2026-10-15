import type { Obstacle, Point } from './survival.ts';
import { ROAD_LINES, SpatialIndex, WORLD_ZONES, lineDistance, nearestOn, type LineSegment } from './regionPlan.ts';

// One network for rendering, placement and validation, including the original
// rotated village roads. Lengths and offsets are metres.
export const CITY_ROADS = [
  {x:92,z:-20,w:9,h:260},{x:151,z:-20,w:10,h:270},{x:212,z:-20,w:9,h:260},
  ...[-104,-46,4,54,104].map(z=>({x:150,z,w:132,h:9})),
  {x:87,z:-7,w:45,h:9},{x:-92,z:89.5,w:7,h:111},{x:-87,z:34,w:59,h:7},
];
export const ORIGINAL_ROADS = [
  ...CITY_ROADS,
  {x:0,z:-7,w:145,h:9,rotation:.05},
  {x:82,z:-14,w:7,h:48},
];
export const STREET_LINES = [
  ...ROAD_LINES,
  ...ORIGINAL_ROADS.map((r,i)=>{
    const angle='rotation' in r?r.rotation:0,vertical=r.h>r.w;
    const dx=(vertical?0:r.w/2)*Math.cos(angle)-(vertical?r.h/2:0)*Math.sin(angle);
    const dz=(vertical?0:r.w/2)*Math.sin(angle)+(vertical?r.h/2:0)*Math.cos(angle);
    return {id:`legacy-${i}`,kind:'secondary',width:Math.min(r.w,r.h),samples:[{x:r.x-dx,z:r.z-dz},{x:r.x+dx,z:r.z+dz}]};
  }),
];
export const STREET_SEGMENTS:LineSegment[]=STREET_LINES.flatMap(r=>r.samples.slice(1).map((b,i)=>({a:r.samples[i],b,width:r.width,id:r.id,kind:r.kind})));
const index=new SpatialIndex<Obstacle & {segment:LineSegment}>(32);
for(const segment of STREET_SEGMENTS)index.add({x:(segment.a.x+segment.b.x)/2,z:(segment.a.z+segment.b.z)/2,hx:Math.abs(segment.b.x-segment.a.x)/2+segment.width/2,hz:Math.abs(segment.b.z-segment.a.z)/2+segment.width/2,segment});
export const streetsNear=(p:Point,radius=12)=>index.query(p.x,p.z,radius).map(s=>s.segment);
export const streetClearance=(x:number,z:number)=>streetsNear({x,z},32).reduce((d,s)=>Math.min(d,lineDistance({x,z},s)-s.width/2),Infinity);
export function sidewalkWidth(road:LineSegment,p:Point){
  if(road.kind==='forest'||road.kind==='field')return 0;
  if(road.id.startsWith('city-')||road.id==='industry'||road.id.startsWith('legacy-'))return 3.2;
  return WORLD_ZONES.some(v=>v.biome==='village'&&Math.hypot((p.x-v.x)/v.hx,(p.z-v.z)/v.hz)<1.05)?2.8:0;
}
export function pedestrianClearance(x:number,z:number){
  const p={x,z};return streetsNear(p,16).reduce((d,r)=>Math.min(d,lineDistance(p,r)-r.width/2-sidewalkWidth(r,nearestOn(p,r.a,r.b))),Infinity);
}
// Exact distance from an entire axis-aligned envelope to each road segment.
// Sampling just a centre or its corners misses a road cutting through an edge.
export function segmentBoxDistance(r:LineSegment,b:Obstacle){
  let lo=0,hi=1;
  for(const [start,delta,min,max]of [[r.a.x,r.b.x-r.a.x,b.x-b.hx,b.x+b.hx],[r.a.z,r.b.z-r.a.z,b.z-b.hz,b.z+b.hz]]){
    if(Math.abs(delta)<1e-9){if(start<min||start>max){lo=1;hi=0;break;}}
    else{const a=(min-start)/delta,c=(max-start)/delta;lo=Math.max(lo,Math.min(a,c));hi=Math.min(hi,Math.max(a,c));}
  }
  if(lo<=hi)return 0;
  const toBox=(p:Point)=>Math.hypot(Math.max(0,Math.abs(p.x-b.x)-b.hx),Math.max(0,Math.abs(p.z-b.z)-b.hz));
  return Math.min(toBox(r.a),toBox(r.b),...[-1,1].flatMap(x=>[-1,1].map(z=>lineDistance({x:b.x+x*b.hx,z:b.z+z*b.hz},r))));
}
export function footprintStreetClearance(b:Obstacle,pedestrian=false){
  return streetsNear(b,Math.hypot(b.hx,b.hz)+12).reduce((d,r)=>Math.min(d,segmentBoxDistance(r,b)-r.width/2-(pedestrian?sidewalkWidth(r,nearestOn(b,r.a,r.b)):0)),Infinity);
}
export const LEGACY_PARKING = [-88,-64,-32,-12,18,38,68,88].flatMap((z,i)=>[101.4,202.6].map(x=>({x,z,color:i})))
  .filter(p=>footprintStreetClearance({...p,hx:1.2,hz:2.4},true)>.25);
