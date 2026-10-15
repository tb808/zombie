import type { Point } from './survival.ts';
import { bridgeAt } from './regionPlan.ts';
import { TERRAIN_STEP, terrainHeight, terrainSurfaceHeight } from './regionTerrain.ts';

const cross=(a:Point,b:Point,p:Point)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
function clip(poly:Point[],triangle:Point[]){
  for(let edge=0;edge<3&&poly.length;edge++){
    const a=triangle[edge],b=triangle[(edge+1)%3],out:Point[]=[];
    for(let i=0;i<poly.length;i++){
      const p=poly[i],q=poly[(i+1)%poly.length],dp=cross(a,b,p),dq=cross(a,b,q);
      if(dp>=-1e-8)out.push(p);
      if((dp<0)!==(dq<0)){const t=dp/(dp-dq);out.push({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t});}
    }poly=out;
  }return poly;
}
// Cut paving/asphalt at the ground mesh's actual cell diagonals. A regular
// rotated grid interpolates across those diagonals and lets soil poke through.
export function groundSurfaceTriangles(points:readonly Point[],lift:number){
  const positions:number[]=[],step=TERRAIN_STEP;
  for(let n=1;n<points.length-1;n++){
    const triangle=[points[0],points[n],points[n+1]],minX=Math.floor(Math.min(...triangle.map(p=>p.x))/step)*step,maxX=Math.max(...triangle.map(p=>p.x)),minZ=Math.floor(Math.min(...triangle.map(p=>p.z))/step)*step,maxZ=Math.max(...triangle.map(p=>p.z));
    for(let z=minZ;z<maxZ;z+=step)for(let x=minX;x<maxX;x+=step){
      const a={x,z},b={x:x+step,z},c={x,z:z+step},d={x:x+step,z:z+step};
      for(const cell of [[a,b,c],[b,d,c]]){
        const polygon=clip(triangle,cell);
        for(let i=1;i<polygon.length-1;i++){
          const t=[polygon[0],polygon[i],polygon[i+1]],area=cross(t[0],t[1],t[2]);if(Math.abs(area)<1e-7)continue;
          if(area>0)t.reverse();
          for(const p of t){const y=bridgeAt(p.x,p.z,14)?terrainHeight(p.x,p.z):terrainSurfaceHeight(p.x,p.z);positions.push(p.x,y+lift,p.z);}
        }
      }
    }
  }return positions;
}
