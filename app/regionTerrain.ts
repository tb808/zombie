import { STRUCTURES, PARKED_CARS, REGION_POIS, REGION_BOUNDS, WORLD_ZONES, SpatialIndex, bridgeAt, inLegacy, lineDistance, nearestOn, roadsNear, smooth, waterClearance } from './regionPlan.ts';
import { SITE_RESERVATIONS, START_CAMP } from './shelterSites.ts';

const originalRaw = (x:number,z:number) => {
  const rolling=Math.sin(x*.055)*Math.cos(z*.07)*.7+Math.sin((x+z)*.035)*.38;
  const hill=(cx:number,cz:number,sx:number,sz:number,h:number)=>h*Math.exp(-((x-cx)**2/sx+(z-cz)**2/sz));
  return rolling+hill(-48,42,480,150,5.2)+hill(8,48,850,130,3.8)+hill(72,48,350,180,5.6)+hill(-68,-52,400,120,3.8)+hill(22,-50,650,135,4.6)+hill(86,-47,300,120,4.2);
};
export function originalHeight(x:number,z:number){let h=originalRaw(x,z);
  for(const[cx,cz,r]of [[-60,-31,17],[-22,-4,25],[18,18,18],[55,22,23],[66,-25,17]]){const t=Math.max(0,Math.min(1,1-Math.hypot(x-cx,z-cz)/r));h+=(originalRaw(cx,cz)-h)*t*t*(3-2*t)*.92;}
  h+=(.15-h)*smooth(78,98,x);
  for(const[cx,cz]of [[-77,5],[-113,69],[-121,119]]){const t=1-smooth(8,18,Math.max(Math.abs(x-cx),Math.abs(z-cz)));h+=(originalRaw(cx,cz)-h)*t;}return h;
}
export function regionalRaw(x:number,z:number){
  const hill=(cx:number,cz:number,rx:number,rz:number,h:number)=>h*Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
  // Broad landforms overlap with smaller rolling contours rather than isolated
  // cones. Fields have gentle slopes; forest ridges frame the village routes.
  const rolling=3.8*Math.sin(x*.018+Math.sin(z*.009)) * Math.cos(z*.015)
    +1.6*Math.sin(x*.037+z*.013)*Math.cos(z*.029)
    +1.2*Math.sin(x*.061-z*.027)*Math.cos(z*.048);
  return 5.5+Math.sin(x*.006)*Math.cos(z*.005)*3.2+rolling
    +hill(-490,-860,410,180,32)+hill(-780,-850,170,150,22)
    +hill(-460,690,410,260,23)+hill(1100,-340,190,430,29)+hill(1060,700,240,200,21)
    +hill(-905,375,145,175,17)+hill(-590,370,155,115,14)
    +hill(-330,505,125,165,19)+hill(-1080,-210,145,210,20)
    +hill(-320,-350,175,125,13)+hill(45,-475,155,145,18)
    +hill(280,490,180,125,16)+hill(445,-780,175,145,21)
    +hill(-1010,465,100,125,12)+hill(-900,80,120,100,9)
    +hill(-180,570,130,100,13)+hill(100,500,100,125,12)
    +hill(170,-690,140,110,18)+hill(-1040,-570,110,140,16)
    +hill(945,-610,95,120,14)+hill(1040,80,100,140,13)
    -hill(-750,110,170,125,3)-hill(740,30,100,260,3);
}
const pads=new SpatialIndex<{x:number;z:number;hx:number;hz:number;anchorX:number;anchorZ:number}>();
const villages=WORLD_ZONES.filter(z=>z.biome==='village');
for(const s of STRUCTURES){
  // Buildings in the same farm/service yard share its datum, including the
  // newer mission barn. Overlapping pads must not choose different heights.
  const yard=REGION_POIS.find(p=>p.id===s.zone&&['farm','gas','rest','power'].includes(p.kind)&&Math.hypot(s.x-p.x,s.z-p.z)<50);
  pads.add({...s,hx:s.hx+4,hz:s.hz+4,anchorX:yard?.x??s.x,anchorZ:yard?.z??s.z});
}
for(const p of PARKED_CARS)pads.add({...p,hx:3,hz:3.5,anchorX:p.x,anchorZ:p.z});
for(const p of REGION_POIS){
  // Entire working yards, including canopy feet/silos, share a level datum.
  const yard=p.kind==='gas'||p.kind==='rest'?{x:p.x,z:p.z-8,hx:16,hz:14}
    :p.kind==='farm'||p.kind==='power'?{x:p.x-2,z:p.z-13,hx:23,hz:13}
    :p.kind==='camp'?{x:p.x,z:p.z+8,hx:16,hz:6}:null;
  if(yard)pads.add({...yard,anchorX:p.x,anchorZ:p.z});
}
function baseHeight(x:number,z:number){
  const distance=Math.hypot(Math.max(-180-x,0,x-240),Math.max(-185-z,0,z-160));
  if(inLegacy(x,z))return originalHeight(x,z);
  let h=originalHeight(x,z)+(regionalRaw(x,z)-originalHeight(x,z))*smooth(0,100,distance);
  // An urban terrace follows the old city instead of flattening the whole east.
  const urban=(1-smooth(630,725,x))*smooth(220,290,x)*(1-smooth(255,335,z))*smooth(-410,-320,z);
  h+=(.15-h)*urban;
  // Settled village centres are natural clearings with gently graded edges.
  // Surrounding wooded hills stay intact; yards and gathering places stay usable.
  for(const v of villages){const edge=Math.hypot((x-v.x)/v.hx,(z-v.z)/v.hz);h+=(regionalRaw(v.x,v.z)-h)*(1-smooth(.85,1.65,edge));}
  const fortEdge=Math.max(Math.abs(x+400)-110,Math.abs(z+820)-85);
  h+=(regionalRaw(-400,-820)-h)*(1-smooth(0,45,fortEdge));
  return h;
}
function landHeight(x:number,z:number){
  const h=baseHeight(x,z);if(inLegacy(x,z))return h;
  // Higher hills need broader valley sides instead of vertical stream trenches.
  const width=32+Math.min(40,Math.max(0,h)*1.5),bank=waterClearance(x,z,80);
  // The shore meets the water plane, rather than leaving a bare trench outside it.
  if(bank<0)return -1.65+1.87*smooth(-6,0,bank);
  return h+(.22-h)*(1-smooth(0,width,bank));
}
export function groundHeight(x:number,z:number){
  if(inLegacy(x,z))return originalHeight(x,z);
  const land=landHeight(x,z);let h=land;
  const bank=waterClearance(x,z);
  // Mild road grades follow the surrounding contour. River banks stay carved.
  if(bank>14){let closest=Infinity,roadY=h;
    for(const r of roadsNear(x,z,20)){const d=lineDistance({x,z},r)-r.width/2;if(d<closest){closest=d;const q=nearestOn({x,z},r.a,r.b);roadY=landHeight(q.x,q.z);}}
    h+=(roadY-h)*(1-smooth(0,9,closest))*smooth(14,28,bank);
  }
  // Apply foundations after roads. A nearby road must never tilt a house floor.
  // Select one pad instead of accumulating neighbouring terrace influences.
  let padEdge=Infinity,padY=h;
  for(const s of pads.query(x,z,20)){const edge=Math.max(Math.abs(x-s.x)-s.hx,Math.abs(z-s.z)-s.hz);if(edge<padEdge){padEdge=edge;padY=landHeight(s.anchorX,s.anchorZ);}}
  h+=(padY-h)*(1-smooth(0,16,padEdge));
  for(const s of SITE_RESERVATIONS){const edge=Math.max(Math.abs(x-s.x)-s.hx,Math.abs(z-s.z)-s.hz),t=1-smooth(0,8,edge);if(t>0){const shared=Math.hypot(s.x-START_CAMP.x,s.z-START_CAMP.z)<40?START_CAMP:s;h+=(landHeight(shared.x,shared.z)-h)*t;}}
  // Outer grading from a nearby yard must not lift the water's edge. Actual
  // foundations are reserved farther inland and keep their shared level.
  return land+(h-land)*smooth(.8,7,bank);
}
// Grounded objects and actors use the same triangles as the rendered mesh.
// Cached shared vertices also keep adjacent chunk edges exactly aligned.
export const TERRAIN_STEP=2;
const vertexColumns=(REGION_BOUNDS.maxX-REGION_BOUNDS.minX)/TERRAIN_STEP+1;
const vertexRows=(REGION_BOUNDS.maxZ-REGION_BOUNDS.minZ)/TERRAIN_STEP+1;
const vertexHeights=new Float64Array(vertexColumns*vertexRows).fill(NaN);
export function terrainVertexHeight(x:number,z:number){
  const ix=(x-REGION_BOUNDS.minX)/TERRAIN_STEP,iz=(z-REGION_BOUNDS.minZ)/TERRAIN_STEP;
  if(!Number.isInteger(ix)||!Number.isInteger(iz)||ix<0||iz<0||ix>=vertexColumns||iz>=vertexRows)return groundHeight(x,z);
  const index=iz*vertexColumns+ix;let y=vertexHeights[index];
  if(Number.isNaN(y)){y=groundHeight(x,z);vertexHeights[index]=y;}return y;
}
export function terrainSurfaceHeight(x:number,z:number){
  const x0=Math.floor(x/TERRAIN_STEP)*TERRAIN_STEP,z0=Math.floor(z/TERRAIN_STEP)*TERRAIN_STEP;
  const u=(x-x0)/TERRAIN_STEP,v=(z-z0)/TERRAIN_STEP;
  const a=terrainVertexHeight(x0,z0),b=terrainVertexHeight(x0+TERRAIN_STEP,z0),c=terrainVertexHeight(x0,z0+TERRAIN_STEP);
  if(u+v<=1)return a+(b-a)*u+(c-a)*v;
  const d=terrainVertexHeight(x0+TERRAIN_STEP,z0+TERRAIN_STEP);
  return d+(c-d)*(1-u)+(b-d)*(1-v);
}
// Actor height includes bridge decks and short graded approaches. Terrain below
// the bridge retains its riverbed, so water never rises through a false land dam.
export function terrainHeight(x:number,z:number){const h=inLegacy(x,z)?originalHeight(x,z):terrainSurfaceHeight(x,z),bridge=bridgeAt(x,z,14);
  if(bridge){const dx=x-bridge.x,dz=z-bridge.z,along=Math.abs(dx*Math.sin(bridge.rotation)+dz*Math.cos(bridge.rotation)),across=Math.abs(dx*Math.cos(bridge.rotation)-dz*Math.sin(bridge.rotation));return h+(bridge.level-h)*(1-smooth(bridge.length/2,bridge.length/2+14,along))*(1-smooth(bridge.width/2+1,bridge.width/2+8,across));}
  return h;
}
