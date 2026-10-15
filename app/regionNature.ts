import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { instancedTreeParts } from './naturalAssets.ts';
import { surfaceMaterial } from './surfaces.ts';
import { REGION_BOUNDS, REGION_LOOT, REGION_POIS, REGION_SIGNS, SITE_FIXTURES, STRUCTURES, TREES, PARKED_CARS, SpatialIndex, fieldAt, forestDensity, inLegacy, overlaps, seeded, waterClearance, zoneAt } from './regionPlan.ts';
import { terrainHeight } from './regionTerrain.ts';
import { SITE_RESERVATIONS } from './shelterSites.ts';
import type { Obstacle, Point } from './survival.ts';
import { pedestrianClearance } from './streetPlan.ts';

export type NatureKind='rock'|'shrub'|'fern'|'grass';
export type NaturePlacement=Obstacle & {kind:NatureKind;y:number;radius:number;height:number;rotation:number;normal:readonly [number,number,number];variant:number};
// Sample the whole footprint, including diagonals. Objects follow a local
// support plane; reject abrupt terrace edges instead of hiding half an asset.
export function natureSupport(x:number,z:number,radius:number){
  const y=terrainHeight(x,z),dx=(terrainHeight(x+.5,z)-terrainHeight(x-.5,z)),dz=(terrainHeight(x,z+.5)-terrainHeight(x,z-.5));
  let error=0;
  for(let i=0;i<8;i++){const angle=i*Math.PI/4,ox=Math.cos(angle)*radius,oz=Math.sin(angle)*radius;error=Math.max(error,Math.abs(terrainHeight(x+ox,z+oz)-y-dx*ox-dz*oz));}
  const length=Math.hypot(dx,1,dz);
  return {y,slope:Math.hypot(dx,dz),error,normal:[-dx/length,1/length,-dz/length] as const};
}
export function planRegionNature(extraFootprints:readonly Obstacle[]=[],extraReserved:readonly Point[]=[]){
  const occupied=new SpatialIndex<Obstacle>(32),out:NaturePlacement[]=[];
  const fixed:Obstacle[]=[...STRUCTURES.map(b=>({...b,hx:b.hx+7,hz:b.hz+7})),
    ...SITE_RESERVATIONS.map(s=>({...s,hx:s.hx+5,hz:s.hz+5})),
    ...TREES.map(t=>({...t,hx:1.8,hz:1.8})),...PARKED_CARS.map(p=>({...p,hx:4,hz:4})),
    ...REGION_SIGNS.map(p=>({...p,hx:3,hz:3})),...REGION_POIS.map(p=>({...p,hx:65,hz:65})),...SITE_FIXTURES,...extraFootprints];
  fixed.forEach(o=>occupied.add(o));
  const reserved=[...REGION_LOOT,...extraReserved];let serial=1;
  for(let z=REGION_BOUNDS.minZ+12;z<REGION_BOUNDS.maxZ-12;z+=12)for(let x=REGION_BOUNDS.minX+12;x<REGION_BOUNDS.maxX-12;x+=12,serial++){
    const cx=x+(seeded(serial*71)-.5)*10,cz=z+(seeded(serial*73)-.5)*10;
    if(inLegacy(cx,cz,8)||zoneAt(cx,cz)?.biome==='city')continue;
    const forest=forestDensity(cx,cz),field=fieldAt(cx,cz);
    const patch=.5+.5*Math.sin(cx*.041+Math.sin(cz*.019)*2)*Math.cos(cz*.034);
    if(seeded(serial*79)>(field ? .13 : .28+forest*.4+patch*.25))continue;
    const count=1+Math.floor(seeded(serial*83)*3);
    for(let n=0;n<count;n++){
      const seed=serial*7+n,angle=seeded(seed*89)*Math.PI*2,distance=n?1.8+seeded(seed*97)*3:0;
      const wx=cx+Math.cos(angle)*distance,wz=cz+Math.sin(angle)*distance;
      const ridge=Math.min(1,natureSupport(cx,cz,1).slope*3);
      const kind:NatureKind=n===0&&seeded(seed*101)<.23+ridge*.2?'rock':n>0?(forest>.3?'fern':'grass'):'shrub';
      const radius=kind==='rock'?.55+seeded(seed*103)*1.65:kind==='shrub'?.65+seeded(seed*107)*.75:kind==='fern'?.45+seeded(seed*109)*.5:.35+seeded(seed*109)*.4;
      const height=kind==='rock'?radius*(.6+seeded(seed*113)*.55):kind==='shrub'?.8+seeded(seed*127)*.85:kind==='fern'?.45+seeded(seed*131)*.4:.3+seeded(seed*131)*.4;
      // Include the crown's downhill shift when the whole plant follows a slope.
      const extent=radius+height*.46,footprint={x:wx,z:wz,hx:extent,hz:extent};
      if(inLegacy(wx,wz,4)||waterClearance(wx,wz)<radius+3||pedestrianClearance(wx,wz)<radius+3
        ||occupied.query(wx,wz,extent+.6).some(o=>overlaps(footprint,o,.6))
        ||reserved.some(p=>Math.hypot(p.x-wx,p.z-wz)<extent+3))continue;
      const support=natureSupport(wx,wz,radius);
      if(support.slope>.46||support.error>.09)continue;
      const p:NaturePlacement={...footprint,kind,radius,height,y:support.y,normal:support.normal,rotation:seeded(seed*137)*Math.PI*2,variant:seed%3};
      out.push(p);occupied.add(p);
    }
  }
  // Larger local outcrops break up open hills without filling cultivated fields.
  for(const [cx,cz]of [[-1025,500],[-880,-570],[-210,570],[140,-650],[1025,-550],[1020,100],[-480,410]])for(let i=0;i<18;i++){
    const seed=91001+serial++,angle=i*2.399,r=Math.sqrt(i)*4,x=cx+Math.cos(angle)*r,z=cz+Math.sin(angle)*r,radius=1.8+seeded(seed*13)*2.5,height=radius*(.7+seeded(seed*17)*.4),extent=radius+height*.46,footprint={x,z,hx:extent,hz:extent};
    if(inLegacy(x,z,8)||pedestrianClearance(x,z)<extent+3||waterClearance(x,z)<extent+3||fieldAt(x,z)||zoneAt(x,z)?.biome==='city'||occupied.query(x,z,extent+.6).some(o=>overlaps(footprint,o,.6))||reserved.some(p=>Math.hypot(p.x-x,p.z-z)<extent+3))continue;
    const support=natureSupport(x,z,radius);if(support.slope>.46||support.error>.09)continue;
    const p:NaturePlacement={...footprint,kind:'rock',radius,height,y:support.y,normal:support.normal,rotation:angle,variant:seed%3};out.push(p);occupied.add(p);
  }
  return out;
}

function natureGeometry(kind:NatureKind,variant:number){
  if(kind==='rock'){
    const geometry=new THREE.IcosahedronGeometry(1,2),positions=geometry.getAttribute('position'),colors:number[]=[],color=new THREE.Color();
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),r=.86+.09*Math.sin(x*9+z*7+variant*3)+.05*Math.cos(y*8-x*4);
      positions.setXYZ(i,x*r,Math.max(0,(y*r+.62)/1.55),z*r*.88);
      color.setHex(variant===0?0xb5b5a5:variant===1?0xaaa79c:0xc4beb0);
      if(y>.2&&Math.sin(x*11+z*13)>0)color.lerp(new THREE.Color(0x74805c),.38);
      color.multiplyScalar(.86+.14*(y+1)/2);colors.push(color.r,color.g,color.b);
    }
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
  }
  const pieces:THREE.BufferGeometry[]=[];
  if(kind==='shrub'){
    // Open twig silhouettes use the same fine leaf texture as the mixed forest.
    for(let i=0;i<27;i++){
      const angle=i*2.4+variant*.7,r=Math.sqrt(seeded(i*47+variant+3))*.66;
      const y=.24+Math.sqrt(1-(r/.8)**2)*.42+(seeded(i*29+variant)-.5)*.19;
      const geometry=new THREE.PlaneGeometry(.46,.52);
      geometry.rotateX((seeded(i*31+variant)-.5)*1.7);geometry.rotateY(angle);geometry.rotateZ((seeded(i+variant*13)-.5)*.5);
      geometry.translate(Math.cos(angle)*r,y,Math.sin(angle)*r);pieces.push(geometry);
    }
  }else{
    const vertices:number[]=[];
    for(let i=0;i<(kind==='fern'?9:11);i++){
      const angle=i*2.4+variant,dx=Math.cos(angle),dz=Math.sin(angle),px=-dz,pz=dx;
      if(kind==='grass')vertices.push(px*.035,0,pz*.035,-px*.035,0,-pz*.035,dx*.65,.8+seeded(i*11)*.2,dz*.65);
      else for(let leaf=0;leaf<7;leaf++)for(const side of [-1,1]){
        const t=.15+leaf*.11,length=(1-t)*.3,cx=dx*t*.9,cz=dz*t*.9,cy=Math.sin(t*Math.PI*.85)*.75;
        vertices.push(cx,cy,cz,cx+px*length*side-dx*.08,cy-.04,cz+pz*length*side-dz*.08,cx+dx*.15,cy+.06,cz+dz*.15);
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();pieces.push(geometry);
  }
  const geometry=mergeGeometries(pieces);pieces.forEach(p=>p.dispose());if(!geometry)throw Error('Nature geometry failed');
  geometry.computeBoundingBox();geometry.translate(0,-geometry.boundingBox!.min.y,0);
  const colors:number[]=[],color=new THREE.Color([0xaebf91,0xc4c49a,0x96b58d][variant]);
  for(let i=0;i<geometry.getAttribute('position').count;i++)colors.push(color.r,color.g,color.b);
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geometry;
}

export function buildRegionNature(scene:THREE.Scene,plan:readonly NaturePlacement[]){
  const root=new THREE.Group();root.name='regional-nature';scene.add(root);
  const cells=new Map<string,{group:THREE.Group;x:number;z:number;distance:number;points:NaturePlacement[]}>();
  for(const p of plan){const ix=Math.floor(p.x/80),iz=Math.floor(p.z/80),key=`${ix},${iz},${p.kind}`;
    if(!cells.has(key)){const group=new THREE.Group();group.name=`nature-${key}`;root.add(group);cells.set(key,{group,x:ix*80+40,z:iz*80+40,distance:p.kind==='rock'?250:p.kind==='shrub'?150:75,points:[]});}cells.get(key)!.points.push(p);
  }
  const stone=surfaceMaterial('stone',0xffffff,{vertexColors:true,roughness:.95});
  const leaves=instancedTreeParts(false,0).leaves;
  const undergrowth=new THREE.MeshStandardMaterial({color:0x6f8554,vertexColors:true,side:THREE.DoubleSide,roughness:1});
  const geometries=new Map<string,THREE.BufferGeometry>(),object=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3(),spin=new THREE.Quaternion();
  let meshes=0;
  for(const cell of cells.values()){
    const first=cell.points[0],key=first.kind;
    if(!geometries.has(key))geometries.set(key,natureGeometry(first.kind,0));
    const mesh=new THREE.InstancedMesh(geometries.get(key)!,first.kind==='rock'?stone:first.kind==='shrub'?leaves:undergrowth,cell.points.length);
    cell.points.forEach((p,i)=>{
      object.position.set(p.x,p.y-(p.kind==='rock'?.025:0),p.z);normal.set(...p.normal);
      object.quaternion.setFromUnitVectors(up,normal).multiply(spin.setFromAxisAngle(up,p.rotation));
      object.scale.set(p.radius,p.height,p.radius);object.updateMatrix();mesh.setMatrixAt(i,object.matrix);mesh.setColorAt(i,new THREE.Color([0xffffff,0xe0dcca,0xd5e5ce][p.variant]));
    });mesh.computeBoundingSphere();mesh.castShadow=first.kind==='rock'||first.kind==='shrub';mesh.receiveShadow=true;cell.group.add(mesh);meshes++;
  }
  let activeCells=0;
  const update=(x:number,z:number)=>{activeCells=0;for(const c of cells.values()){c.group.visible=Math.hypot(x-c.x,z-c.z)<c.distance+57;if(c.group.visible)activeCells++;}};
  update(0,0);
  const counts=plan.reduce((a,p)=>(a[p.kind]++,a),{rock:0,shrub:0,fern:0,grass:0});
  return {root,plan,update,stats:()=>({...counts,meshes,cells:cells.size,activeCells})};
}
