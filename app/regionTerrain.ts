import { STRUCTURES, SpatialIndex, bridgeAt, inLegacy, lineDistance, nearestOn, roadsNear, smooth, waterClearance } from './regionPlan.ts';

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
  return 3.8+Math.sin(x*.006)*Math.cos(z*.005)*2.2+Math.sin((x-z)*.009)*.8
    +hill(-490,-860,410,180,26)+hill(-780,-850,170,150,18)+hill(-460,690,410,260,18)+hill(1100,-340,190,430,22)+hill(1060,700,240,200,15);
}
const pads=new SpatialIndex<(typeof STRUCTURES)[number]>();for(const s of STRUCTURES)pads.add(s);
function baseHeight(x:number,z:number){
  const distance=Math.hypot(Math.max(-180-x,0,x-240),Math.max(-185-z,0,z-160));
  if(inLegacy(x,z))return originalHeight(x,z);
  let h=originalHeight(x,z)+(regionalRaw(x,z)-originalHeight(x,z))*smooth(0,100,distance);
  // An urban terrace follows the old city instead of flattening the whole east.
  const urban=(1-smooth(630,725,x))*smooth(220,290,x)*(1-smooth(255,335,z))*smooth(-410,-320,z);
  h+=(.15-h)*urban;
  const fortEdge=Math.max(Math.abs(x+400)-110,Math.abs(z+820)-85);
  h+=(regionalRaw(-400,-820)-h)*(1-smooth(0,45,fortEdge));
  return h;
}
export function groundHeight(x:number,z:number){
  if(inLegacy(x,z))return originalHeight(x,z);
  let h=baseHeight(x,z);
  const bank=waterClearance(x,z);
  if(bank<35)h+=(-1.65-h)*(1-smooth(-3,32,bank));
  for(const s of pads.query(x,z,25)){const edge=Math.max(Math.abs(x-s.x)-s.hx,Math.abs(z-s.z)-s.hz),t=1-smooth(0,12,edge);if(t>0)h+=(baseHeight(s.x,s.z)-h)*t;}
  // Mild road grades follow the surrounding contour. River banks stay carved.
  if(bank>14){let closest=Infinity,roadY=h;
    for(const r of roadsNear(x,z,20)){const d=lineDistance({x,z},r)-r.width/2;if(d<closest){closest=d;const q=nearestOn({x,z},r.a,r.b);roadY=baseHeight(q.x,q.z);}}
    h+=(roadY-h)*(1-smooth(0,9,closest));
  }
  return h;
}
// Actor height includes bridge decks and short graded approaches. Terrain below
// the bridge retains its riverbed, so water never rises through a false land dam.
export function terrainHeight(x:number,z:number){const h=groundHeight(x,z),bridge=bridgeAt(x,z,14);
  if(bridge){const dx=x-bridge.x,dz=z-bridge.z,along=Math.abs(dx*Math.sin(bridge.rotation)+dz*Math.cos(bridge.rotation)),across=Math.abs(dx*Math.cos(bridge.rotation)-dz*Math.sin(bridge.rotation));return h+(bridge.level-h)*(1-smooth(bridge.length/2,bridge.length/2+14,along))*(1-smooth(bridge.width/2+1,bridge.width/2+8,across));}
  return h;
}
