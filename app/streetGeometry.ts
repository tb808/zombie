import type { Point } from './survival.ts';
import { BRIDGES, nearestOn, type LineSegment } from './regionPlan.ts';
import { STREET_LINES, sidewalkWidth, streetsNear } from './streetPlan.ts';

export type StreetPatch={points:Point[];kind:'sidewalk'|'curb'|'shoulder'|'marking';road:string};
const cross=(a:Point,b:Point,p:Point)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
function split(poly:Point[],a:Point,b:Point){
  const inside:Point[]=[],outside:Point[]=[];
  for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length],dp=cross(a,b,p),dq=cross(a,b,q);
    (dp>=0?inside:outside).push(p);
    if((dp<0)!==(dq<0)){const t=dp/(dp-dq),v={x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t};inside.push(v);outside.push(v);}
  }return {inside,outside};
}
function subtract(poly:Point[],clip:Point[]){
  const kept:Point[][]=[];let remaining=poly;
  for(let i=0;i<clip.length&&remaining.length>=3;i++){
    const result=split(remaining,clip[i],clip[(i+1)%clip.length]);
    if(result.outside.length>=3)kept.push(result.outside);remaining=result.inside;
  }return kept;
}
const roadRectangle=(r:LineSegment,margin=.025)=>{
  const dx=r.b.x-r.a.x,dz=r.b.z-r.a.z,l=Math.hypot(dx,dz),nx=dz/l*(r.width/2+margin),nz=-dx/l*(r.width/2+margin),tx=dx/l*margin,tz=dz/l*margin;
  return [{x:r.a.x-nx-tx,z:r.a.z-nz-tz},{x:r.a.x+nx-tx,z:r.a.z+nz-tz},{x:r.b.x+nx+tx,z:r.b.z+nz+tz},{x:r.b.x-nx+tx,z:r.b.z-nz+tz}];
};
const roadCap=(p:Point,r:number)=>Array.from({length:12},(_,i)=>({x:p.x+Math.cos(i*Math.PI/6)*r/Math.cos(Math.PI/12),z:p.z+Math.sin(i*Math.PI/6)*r/Math.cos(Math.PI/12)}));
export function planStreetSurfaces(){
  const patches:StreetPatch[]=[];
  for(const road of STREET_LINES){let travel=0;
    const normal=(i:number)=>{const a=road.samples[Math.max(0,i-1)],b=road.samples[Math.min(road.samples.length-1,i+1)],l=Math.hypot(b.x-a.x,b.z-a.z)||1;return {x:(b.z-a.z)/l,z:-(b.x-a.x)/l};};
    for(let i=1;i<road.samples.length;i++){
      const start=road.samples[i-1],end=road.samples[i],length=Math.hypot(end.x-start.x,end.z-start.z),steps=Math.ceil(length/2),na=normal(i-1),nb=normal(i);
      const segment={a:start,b:end,width:road.width,id:road.id,kind:road.kind};
      for(let n=0;n<steps;n++){
        const point=(t:number)=>({x:start.x+(end.x-start.x)*t,z:start.z+(end.z-start.z)*t});
        const a=point(n/steps),b=point((n+1)/steps),p=point((n+.5)/steps),walk=sidewalkWidth(segment,p);
        const offset=(q:Point,t:number,d:number)=>({x:q.x+(na.x+(nb.x-na.x)*t)*d,z:q.z+(na.z+(nb.z-na.z)*t)*d});
        const strip=(inner:number,outer:number,side:number,kind:StreetPatch['kind'])=>{
          let pieces=[[offset(a,n/steps,side*inner),offset(b,(n+1)/steps,side*inner),offset(b,(n+1)/steps,side*outer),offset(a,n/steps,side*outer)]];
          // Subtract actual neighbouring carriageways: pavement and kerbs never
          // continue across a junction. The road stays a flush crossing there.
          if(kind!=='marking')for(const other of streetsNear(p,road.width/2+walk+5)){
            pieces=pieces.flatMap(poly=>subtract(poly,roadRectangle(other)));
            for(const end of [other.a,other.b])if(Math.hypot(end.x-p.x,end.z-p.z)<other.width/2+road.width/2+walk+3)pieces=pieces.flatMap(poly=>subtract(poly,roadCap(end,other.width/2+.025)));
            if(!pieces.length)break;
          }
          for(const points of pieces)if(points.length>=3&&Math.abs(points.reduce((a,p,i)=>a+p.x*points[(i+1)%points.length].z-p.z*points[(i+1)%points.length].x,0))>.0001)patches.push({points,kind,road:road.id});
        };
        for(const side of [-1,1]){
          if(walk){strip(road.width/2+.12,road.width/2+walk,side,'sidewalk');
            const nearJunction=streetsNear(p,15).some(r=>r.id!==road.id&&Math.hypot(nearestOn(p,r.a,r.b).x-p.x,nearestOn(p,r.a,r.b).z-p.z)<r.width/2+6);
            if(!nearJunction)strip(road.width/2,road.width/2+.16,side,'curb');
          }else if(road.kind!=='forest'&&road.kind!=='field'&&!BRIDGES.some(r=>Math.hypot(p.x-r.x,p.z-r.z)<r.length/2+5))strip(road.width/2,road.width/2+.75,side,'shoulder');
        }
        if(road.kind==='main'&&!streetsNear(p,16).some(r=>r.id!==road.id&&lineNear(p,r))&&Math.floor((travel+(n+.5)*length/steps)/4)%2===0)strip(-.075,.075,1,'marking');
      }travel+=length;
    }
    // At a sharp bend, the interpolated strip alone can pinch the inner
    // pavement. A clipped annulus joins the two approaches around the corner.
    for(let i=1;i<road.samples.length-1;i++){
      const a=road.samples[i-1],p=road.samples[i],b=road.samples[i+1],al=Math.hypot(p.x-a.x,p.z-a.z),bl=Math.hypot(b.x-p.x,b.z-p.z);
      if(((p.x-a.x)*(b.x-p.x)+(p.z-a.z)*(b.z-p.z))/(al*bl)>.9)continue;
      const walk=sidewalkWidth({a:p,b,width:road.width,id:road.id,kind:road.kind},p);if(!walk)continue;
      const near=streetsNear(p,road.width/2+walk+2),point=(angle:number,r:number)=>({x:p.x+Math.cos(angle)*r,z:p.z+Math.sin(angle)*r});
      for(let n=0;n<24;n++){
        const a=n*Math.PI/12,b=(n+1)*Math.PI/12;
        let pieces=[[point(a,road.width/2),point(b,road.width/2),point(b,road.width/2+walk),point(a,road.width/2+walk)]];
        for(const r of near){pieces=pieces.flatMap(poly=>subtract(poly,roadRectangle(r)));for(const end of [r.a,r.b])pieces=pieces.flatMap(poly=>subtract(poly,roadCap(end,r.width/2+.025)));if(!pieces.length)break;}
        for(const points of pieces)if(points.length>=3&&Math.abs(points.reduce((a,p,i)=>a+p.x*points[(i+1)%points.length].z-p.z*points[(i+1)%points.length].x,0))>.0001)patches.push({points,kind:'sidewalk',road:road.id});
      }
    }
  }return patches;
}
const lineNear=(p:Point,r:LineSegment)=>{const q=nearestOn(p,r.a,r.b);return Math.hypot(p.x-q.x,p.z-q.z)<r.width/2+7;};
