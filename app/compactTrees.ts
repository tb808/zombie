import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { instancedTreeParts } from './naturalAssets.ts';

type Parts={trunk:THREE.BufferGeometry[];foliage:THREE.BufferGeometry[];bark:THREE.Material;leaves:THREE.Material};
const cache=new Map<boolean,Parts>();
// Regional stands trade hundreds of alpha-tested twig cards for small, closed
// crown volumes. The original close-up trees and their materials remain intact.
export function compactTreeParts(pine:boolean):Parts{
  if(cache.has(pine))return cache.get(pine)!;
  const original=instancedTreeParts(pine,0),foliage:THREE.BufferGeometry[]=[],trunk:THREE.BufferGeometry[]=[];
  for(let level=0;level<3;level++){
    const wood=new THREE.CylinderGeometry(.085,.2,pine?5.8:4.6,level===0?7:5);wood.translate(0,(pine?5.8:4.6)/2,0);trunk.push(wood);
    const pieces:THREE.BufferGeometry[]=[];
    if(pine){
      const count=level===0?6:level===1?4:3;
      for(let i=0;i<count;i++){
        const t=i/(count-1),r=1.6*(1-t)+.32,h=level===0?1.85:2.4;
        const g=new THREE.ConeGeometry(r,h,level===0?9:6,1);g.rotateY(i*1.7);g.translate(Math.sin(i*2.4)*.14,1.8+t*4.7,Math.cos(i*2.4)*.13);pieces.push(g);
      }
    }else{
      const count=level===0?6:level===1?4:3;
      for(let i=0;i<count;i++){
        const angle=i*2.4,r=i===0?0:1.05,g=new THREE.IcosahedronGeometry(1,level===0?1:0);
        g.scale(i===0?1.65:1.35,i===0?1.8:1.4,i===0?1.6:1.3);g.rotateY(angle);g.translate(Math.sin(angle)*r,4.1+(i===0?1.25:Math.sin(i)*.4),Math.cos(angle)*r);pieces.push(g);
      }
    }
    const crown=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());
    const vertices=crown.getAttribute('position'),colors:number[]=[],color=new THREE.Color();
    for(let i=0;i<vertices.count;i++){
      const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),jitter=1+.07*Math.sin(x*5+z*4+y*3);
      vertices.setXYZ(i,x*jitter,y,z*jitter);color.setHex(pine?0x526c4b:0x7c8b58).multiplyScalar(.84+.16*(y/7)+.04*Math.sin(x*7+z*5));colors.push(color.r,color.g,color.b);
    }
    crown.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));crown.computeVertexNormals();foliage.push(crown);
  }
  const leaves=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1});
  const parts={trunk,foliage,bark:original.bark as THREE.Material,leaves};cache.set(pine,parts);return parts;
}
