import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { surfaceMaterial, tintGeometry, type SurfaceKind } from './surfaces.ts';
import { detailedCar, instancedTreeParts } from './naturalAssets.ts';
import type { Obstacle, Point } from './survival.ts';
import { BRIDGES, FIELDS, LAKES, REGION_BOUNDS, REGION_LOOT, REGION_POIS, ROAD_LINES, STRUCTURES, TREES, WATER_LINES, PARKED_CARS, SpatialIndex, fieldAt, forestDensity, inLegacy, overlaps, seeded, waterBlocked, waterClearance, roadClearance, type Structure } from './regionPlan.ts';
import { groundHeight, terrainHeight } from './regionTerrain.ts';

const CHUNK = 100;
type Chunk = { group:THREE.Group; detail:THREE.Group; distant:THREE.Group; terrain:THREE.Group; trees:THREE.Group[]; x:number;z:number;batches:Map<THREE.Material,THREE.BufferGeometry[]>;farBatches:Map<THREE.Material,THREE.BufferGeometry[]> };
// Gameplay collision is independent from visible chunks. Dynamic campaign
// doors keep using their original obstacle list; this index is immutable.
export function regionalCollision() {
  type Collider = Obstacle & { navigationOnly?:boolean };
  const index=new SpatialIndex<Collider>(),obstacles:Collider[]=[];
  const add=(o:Collider)=>{obstacles.push(o);index.add(o);};
  for(const b of STRUCTURES){
    if(!b.enterable){add(b);continue;}
    add({x:b.x-b.width/2,z:b.z,hx:.2,hz:b.depth/2});add({x:b.x+b.width/2,z:b.z,hx:.2,hz:b.depth/2});
    for(const side of [-1,1])for(const end of [-1,1])add({x:b.x+side*(b.width/4+1),z:b.z+end*b.depth/2,hx:b.width/4-1,hz:.2});
  }
  for(const t of TREES)add({x:t.x,z:t.z,hx:.27*t.scale,hz:.27*t.scale});
  for(const p of PARKED_CARS)add({x:p.x,z:p.z,hx:1.8,hz:2.5});
  // Enclosing fort with an eight-metre gap on its southern access road.
  for(const o of fortWalls())add(o);
  // Four-metre bank cells serve bounded A*, while exact water tests prevent
  // actors from slipping through a sampled shoreline. Bridges are left open.
  const waterCells=new Set<string>();
  for(const line of WATER_LINES)for(const p of line.samples){const r=line.width/2+8;
    for(let z=Math.floor((p.z-r)/4)*4;z<=p.z+r;z+=4)for(let x=Math.floor((p.x-r)/4)*4;x<=p.x+r;x+=4){const key=`${x},${z}`;if(waterCells.has(key)||!waterBlocked(x,z))continue;waterCells.add(key);add({x,z,hx:1.4,hz:1.4,navigationOnly:true});}
  }
  for(const lake of LAKES)for(let z=lake.z-lake.rz;z<=lake.z+lake.rz;z+=4)for(let x=lake.x-lake.rx;x<=lake.x+lake.rx;x+=4)if(waterBlocked(x,z))add({x,z,hx:1.4,hz:1.4,navigationOnly:true});
  return {obstacles,index,blocked:(x:number,z:number)=>waterBlocked(x,z)||index.query(x,z,.5).some(o=>!o.navigationOnly&&Math.abs(x-o.x)<o.hx+.45&&Math.abs(z-o.z)<o.hz+.45),near:(a:Point,b:Point,margin=18,cover=false)=>index.query((a.x+b.x)/2,(a.z+b.z)/2,Math.abs(a.x-b.x)/2+margin,Math.abs(a.z-b.z)/2+margin).filter(o=>!cover||!o.navigationOnly)};
}
export function fortWalls():Obstacle[]{return [{x:-510,z:-820,hx:.15,hz:85},{x:-290,z:-820,hx:.15,hz:85},{x:-400,z:-905,hx:110,hz:.15},{x:-457,z:-735,hx:53,hz:.15},{x:-343,z:-735,hx:53,hz:.15}];}

export function buildRegionWorld(scene:THREE.Scene) {
  const root=new THREE.Group();root.name='tannwald-region';scene.add(root);
  const chunks=new Map<string,Chunk>(),materials=new Map<string,THREE.MeshStandardMaterial>();
  const mat=(kind:SurfaceKind)=>{if(!materials.has(kind))materials.set(kind,surfaceMaterial(kind,0xffffff,{vertexColors:true,roughness:kind==='metal'?.6:.92,metalness:kind==='metal'?.45:0}));return materials.get(kind)!;};
  const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),cone=new THREE.ConeGeometry(1,1,4);
  cone.rotateY(Math.PI/4);
  const tinted=new Map<string,THREE.BufferGeometry>();
  const at=(x:number,z:number)=>{const ix=Math.floor(x/CHUNK),iz=Math.floor(z/CHUNK),key=`${ix},${iz}`;
    if(!chunks.has(key)){const group=new THREE.Group(),detail=new THREE.Group(),distant=new THREE.Group(),terrain=new THREE.Group(),trees=Array.from({length:3},()=>new THREE.Group());root.add(group,detail,distant,terrain,...trees);group.name=`region-${key}`;chunks.set(key,{group,detail,distant,terrain,trees,x:ix*CHUNK+50,z:iz*CHUNK+50,batches:new Map(),farBatches:new Map()});}return chunks.get(key)!;};
  const transform=new THREE.Object3D();
  const piece=(x:number,y:number,z:number,w:number,h:number,d:number,color:number,kind:SurfaceKind='plaster',rotation=0,shape:THREE.BufferGeometry=cube,far=false)=>{
    const key=`${shape.uuid}-${color}`;if(!tinted.has(key))tinted.set(key,tintGeometry(shape,color));
    transform.position.set(x,y,z);transform.rotation.set(0,rotation,0);transform.scale.set(w,h,d);transform.updateMatrix();
    const source=tinted.get(key)!,g=source.index?source.toNonIndexed():source.clone();g.applyMatrix4(transform.matrix);
    const chunk=at(x,z),batches=far?chunk.farBatches:chunk.batches,m=mat(kind);if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(g);
  };
  const terrainMaterial=surfaceMaterial('soil',0xffffff,{vertexColors:true,roughness:.98});
  const color=new THREE.Color();
  for(let z=REGION_BOUNDS.minZ;z<REGION_BOUNDS.maxZ;z+=CHUNK)for(let x=REGION_BOUNDS.minX;x<REGION_BOUNDS.maxX;x+=CHUNK){
    const chunk=at(x+50,z+50),divisions=inLegacy(x+50,z+50,60)?50:20,positions:number[]=[],colors:number[]=[],indices:number[]=[];
    for(let iz=0;iz<=divisions;iz++)for(let ix=0;ix<=divisions;ix++){
      const wx=x+ix*CHUNK/divisions,wz=z+iz*CHUNK/divisions,y=groundHeight(wx,wz),field=fieldAt(wx,wz),forest=forestDensity(wx,wz);
      positions.push(wx,y,wz);color.setHex(field?[0x97916a,0x8b9064,0xa99c75][field.crop]:forest>.3?0x73806a:0x949f7b);
      if(wx>78&&wx<670&&wz>-390&&wz<270)color.lerp(new THREE.Color(0xa7a59b),.65);
      if(waterClearance(wx,wz)<7)color.setHex(0x858775);
      color.offsetHSL(0,0,Math.sin(wx*.09+wz*.07)*.025);colors.push(color.r,color.g,color.b);
    }
    for(let iz=0;iz<divisions;iz++)for(let ix=0;ix<divisions;ix++){const a=iz*(divisions+1)+ix,b=a+1,c=a+divisions+1,d=c+1;indices.push(a,c,b,b,c,d);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,terrainMaterial);mesh.receiveShadow=true;chunk.terrain.add(mesh);
  }
  // Continuous strips follow the shared design paths, with a shared vertex at
  // every bend. Adjacent strips meet exactly at their junction coordinates.
  const ribbon=(samples:Point[],width:number,material:THREE.Material,lift:number,water=false,waterOffset=0)=>{
    for(let i=0;i<samples.length-1;i++){
      const a=samples[i],b=samples[i+1],before=samples[Math.max(0,i-1)],after=samples[Math.min(samples.length-1,i+2)];
      const normal=(p:Point,q:Point)=>{const d=Math.hypot(q.x-p.x,q.z-p.z),w=water?width*(.85+.22*Math.sin((i+waterOffset)*.14)):width;return {x:(q.z-p.z)/d*w/2,z:-(q.x-p.x)/d*w/2};};
      const na=normal(before,b),nb=normal(a,after),corners=[[a.x-na.x,a.z-na.z],[a.x+na.x,a.z+na.z],[b.x-nb.x,b.z-nb.z],[b.x+nb.x,b.z+nb.z]];
      const vertices=corners.flatMap(([x,z])=>[x,water?.22:terrainHeight(x,z)+lift,z]);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));geometry.setIndex([0,2,1,1,2,3]);geometry.computeVertexNormals();
      const chunk=at((a.x+b.x)/2,(a.z+b.z)/2),g=geometry.toNonIndexed();geometry.dispose();if(!chunk.batches.has(material))chunk.batches.set(material,[]);chunk.batches.get(material)!.push(g);
    }
  };
  const asphalt=surfaceMaterial('asphalt',0x989b97),dirt=surfaceMaterial('soil',0xb5a38b),water=new THREE.MeshStandardMaterial({color:0x557b83,roughness:.25,metalness:.25});
  const sidewalk=surfaceMaterial('concrete',0xb8baae);
  for(const road of ROAD_LINES){if(road.id.startsWith('city-')||road.id==='industry')ribbon(road.samples,road.width+4.2,sidewalk,.055);ribbon(road.samples,road.width,road.kind==='field'||road.kind==='forest'?dirt:asphalt,.07);
    if(road.kind==='main')for(let i=1;i<road.samples.length;i+=2){const p=road.samples[i],q=road.samples[i-1],angle=Math.atan2(p.x-q.x,p.z-q.z);piece(p.x,terrainHeight(p.x,p.z)+.08,p.z,.15,.012,3,0xd5c9a4,'concrete',angle);}
  }
  let waterOffset=0;for(const line of WATER_LINES){ribbon(line.samples,line.width,water,0,true,waterOffset);waterOffset+=line.samples.length-1;}
  for(const lake of LAKES){const geometry=new THREE.CircleGeometry(1,64);geometry.rotateX(-Math.PI/2);geometry.scale(lake.rx,1,lake.rz);geometry.translate(lake.x,.22,lake.z);const mesh=new THREE.Mesh(geometry,water);at(lake.x,lake.z).group.add(mesh);}
  // Bridge decks sit above the actual water. Rails are outside the walkable
  // carriageway; approach surfaces use the same actor height as movement.
  for(const b of BRIDGES){const c=Math.cos(b.rotation),s=Math.sin(b.rotation);
    piece(b.x,b.level-.28,b.z,b.width+1,.55,b.length,0x8e9290,'concrete',b.rotation);
    for(const side of [-1,1]){
      const x=b.x+side*(b.width/2+.6)*c,z=b.z-side*(b.width/2+.6)*s;
      piece(x,b.level+.9,z,.1,.1,b.length,0x777f7b,'metal',b.rotation);
      for(let t=-b.length/2;t<=b.length/2;t+=4)piece(x+t*s,b.level+.5,z+t*c,.1,1,.1,0x777f7b,'metal');
    }
    for(const t of [-b.length*.25,b.length*.25])piece(b.x+t*s,b.level/2-1,b.z+t*c,b.width*.6,b.level+2,1.2,0x858b83,'concrete',b.rotation);
  }
  // Different building families share compact material batches. Public POI
  // buildings have two open entrances and searchable ground floors.
  const building=(b:Structure)=>{
    const y=terrainHeight(b.x,b.z),w=b.width,d=b.depth,h=b.height,c=Math.cos(b.rotation),s=Math.sin(b.rotation);
    const local=(x:number,py:number,z:number,bw:number,bh:number,bd:number,col:number,kind:SurfaceKind='plaster',far=false,shape:THREE.BufferGeometry=cube)=>piece(b.x+x*c+z*s,y+py,b.z-x*s+z*c,bw,bh,bd,col,kind,b.rotation,shape,far);
    if(b.enterable){
      local(-w/2,h/2,0,.35,h,d,b.color);local(w/2,h/2,0,.35,h,d,b.color);
      for(const end of [-1,1]){for(const side of [-1,1])local(side*(w/4+1),h/2,end*d/2,w/2-2,h,.35,b.color);local(0,(h+3)/2,end*d/2,4,h-3,.35,b.color);}
      local(0,.03,0,w,.06,d,0x858779,'concrete');local(0,Math.min(h,3.7),0,w+.6,.2,d+.6,0x5c6762,'metal');
      if(h>8)for(let floor=1;floor<Math.floor(h/3);floor++)for(let wx=-w/2+2;wx<w/2-1;wx+=3.5)for(const side of [-1,1])local(wx,1.8+floor*3,side*(d/2+.025),1.2,1.25,.05,0x53636a,'metal');
      for(const side of [-1,1])for(const pz of [-d*.25,d*.25]){local(side*(w/2-1.5),.8,pz,1.4,1.6,2.8,0x766e56,'wood');local(side*(w/2-1.5),1.7,pz,1.6,.12,3,0x8b8270,'wood');}
    }else{
      local(0,h/2,0,w,h,d,b.color,b.kind==='warehouse'?'metal':'plaster',b.kind==='tower');
      const levels=Math.floor(h/3);
      for(let floor=0;floor<levels;floor++)for(let wx=-w/2+2;wx<w/2-1;wx+=3.5)for(const side of [-1,1]){
        if(b.kind==='ruin'&&seeded(floor*127+wx*13)>.5)continue;
        local(wx,1.8+floor*3,side*(d/2+.025),1.2,1.25,.05,0x53636a,'metal');
      }
      local(0,1.25,d/2+.04,1.6,2.5,.08,0x594f44,'wood');
      if(b.kind==='apartment'||b.kind==='tower'){
        local(0,.18,0,w+7,.2,d+7,0xa0a294,'concrete');
        for(const side of [-1,1]){local(side*w*.25,1.55,d/2+.08,w*.32,2.4,.08,0x637975,'metal');local(side*w*.25,3,d/2+1,w*.36,.16,2.2,side>0?0x827359:0x6e7f72,'metal');}
        for(let floor=1;floor<levels;floor++)local(0,floor*3+.15,d/2+.2,w,.1,.4,0xb6b3a4,'concrete');
      }
    }
    if(['house','barn','service','ruin'].includes(b.kind)){
      if(b.kind!=='ruin')local(0,h+.95,0,(w+1)/Math.SQRT2,2,(d+1)/Math.SQRT2,0x686457,'wood',false,cone);
      else{local(-w*.25,h+.3,0,w*.45,.5,d,0x676252,'wood');local(w*.3,.7,d*.4,2,1.4,2,0x777c75,'stone');}
      local(-w*.25,h+1.1,-d*.22,.7,2,.7,0x6c6b62,'brick');
      if(b.kind==='service')local(0,h+5,-d*.3,2,10,2,0x817d6d,'stone');
    }else{
      local(0,h+.15,0,w+.5,.3,d+.5,0x64706d,'metal',b.kind==='tower');
      if(b.kind==='tower')local(w*.2,h+1.2,-d*.2,3,2,3,0x828984,'metal',true);
    }
    // Gardens and front-yard fences have a gate facing the street.
    if(b.kind==='house'&&!b.enterable)for(const side of [-1,1])local(side*(w/2+2),.5,1,.1,1,d+4,0x746e58,'wood');
    if(b.kind==='warehouse'){
      for(const side of [-1,1]){local(side*w*.23,1.6,d/2+.05,w*.3,3.2,.1,0x5e6c68,'metal');local(side*w*.23,3.7,d/2+.1,w*.32,.3,.2,0xa7a181,'metal');}
      local(0,h+.5,0,w*.8,.7,d*.7,0x737e78,'metal');
    }
  };
  STRUCTURES.forEach(building);
  for(const f of FIELDS){
    for(let z=f.z-f.hz+3;z<f.z+f.hz;z+=5){
      for(let x=f.x-f.hx+3;x<f.x+f.hx;x+=8){if(waterClearance(x,z)<8||roadClearance(x,z)<5||STRUCTURES.some(b=>overlaps({x,z,hx:4,hz:1},b,3)))continue;
        const geometry=new THREE.PlaneGeometry(7.5,.5);geometry.rotateX(-Math.PI/2);geometry.translate(x,terrainHeight(x,z)+.025,z);const g=tintGeometry(geometry,[0x777956,0x9c9467,0x786d54][f.crop]);geometry.dispose();const chunk=at(x,z),m=mat('soil');if(!chunk.batches.has(m))chunk.batches.set(m,[]);chunk.batches.get(m)!.push(g.toNonIndexed());g.dispose();
      }
    }
  }
  const fence=(o:Obstacle)=>{const vertical=o.hz>o.hx,length=Math.max(o.hx,o.hz)*2;
    for(let t=-length/2;t<=length/2;t+=5){const x=o.x+(vertical?0:t),z=o.z+(vertical?t:0),y=terrainHeight(x,z);piece(x,y+1.2,z,.12,2.4,.12,0x7c867a,'metal');}
    for(const py of [.7,1.5,2.2])piece(o.x,terrainHeight(o.x,o.z)+py,o.z,vertical?.06:length,.045,vertical?length:.06,0x909890,'metal');
  };
  fortWalls().forEach(fence);
  // Distinct landmarks and functional yards, placed on their actual access spurs.
  for(const p of REGION_POIS){const y=terrainHeight(p.x,p.z);
    if(p.kind==='farm')for(const offset of [-14,-6]){piece(p.x+offset,y+5,p.z-18,2.4,10,2.4,0x9da39b,'metal',0,cylinder);piece(p.x+offset,y+10.4,p.z-18,2.5,1,2.5,0x6b7670,'metal',0,cone);}
    if(p.kind==='gas'||p.kind==='rest'){
      piece(p.x,y+4,p.z-12,22,.4,12,0x8d8b77,'metal');for(const side of [-1,1])piece(p.x+side*9,y+2,p.z-12,.25,4,.25,0x6e7978,'metal');
      for(const offset of [-5,5])piece(p.x+offset,y+.75,p.z-12,.8,1.5,.6,0x9b7665,'metal');
    }
    if(p.kind==='radar'){piece(p.x+10,y+19,p.z+5,.7,38,.7,0x8f9993,'metal',0,cylinder,true);piece(p.x+10,y+35,p.z+5,7,.5,7,0xa4aaa4,'metal',0,cylinder,true);}
    if(p.kind==='quarry')for(let i=0;i<4;i++)piece(p.x+45+i*8,y+2+i*2,p.z-15,30,4,65-i*8,0x9a9689,'stone');
    if(p.kind==='power')for(let i=0;i<4;i++){piece(p.x-15+i*9,y+1.5,p.z-20,4,3,5,0x7e918c,'metal');piece(p.x-15+i*9,y+4,p.z-20,.6,2,.6,0xb5b4a2,'concrete',0,cylinder);}
    if(p.kind==='camp')for(const offset of [-12,12])piece(p.x+offset,y+.9,p.z+8,2,1.8,2.5,0x8a9576,'fabric',0,cone);
  }
  // Factory stacks, timber yard, fort watchtowers and marked helicopter pad.
  for(const x of [550,620])piece(x,terrainHeight(x,-365)+18,-365,1.9,36,1.9,0x8c8175,'brick',0,cylinder,true);
  const log=cylinder.clone();log.rotateX(Math.PI/2);
  for(let i=0;i<9;i++)piece(-797+(i%5)*1.8,terrainHeight(-797+(i%5)*1.8,585)+.55+Math.floor(i/5)*.9,585,.75,.75,8,0x8b775a,'wood',0,log);
  log.dispose();
  for(const x of [-618,-610])piece(x,terrainHeight(x,-490)+5,-490,2.2,10,2.2,0xa5aaa0,'metal',0,cylinder);
  for(const x of [-503,-297])for(const z of [-898,-742]){
    const y=terrainHeight(x,z);for(const side of [-1,1])for(const end of [-1,1])piece(x+side*1.8,y+5,z+end*1.8,.16,10,.16,0x73806d,'metal');piece(x,y+10,z,5,.4,5,0x7a8269,'wood');piece(x,y+11,z,4,1.8,4,0x75856e,'metal');piece(x,y+12,z,5,.4,5,0x5a6653,'metal');
  }
  const padY=terrainHeight(-400,-784);piece(-400,padY+.06,-784,24,.12,24,0x8b9184,'concrete');
  for(const x of [-405,-395])piece(x,padY+.13,-784,.7,.012,10,0xd5d2b9,'concrete');piece(-400,padY+.13,-784,10,.012,.7,0xd5d2b9,'concrete');
  for(let i=0;i<10;i++)piece(-492+i*12,terrainHeight(-492+i*12,-878)+1.3,-878,8,2.6,3,0x6f7c63,'metal');
  const mastY=terrainHeight(-420,-815);piece(-420,mastY+12,-815,.4,24,.4,0x939e93,'metal',0,cylinder,true);piece(-420,mastY+22,-815,5,.2,5,0xa6aea0,'metal',0,cylinder,true);
  for(const x of [-408,-392])piece(x,terrainHeight(x,-738)+1.3,-738,3,2.6,3,0x89927a,'metal');
  for(let i=0;i<5;i++)piece(-392+i*3.2,terrainHeight(-392+i*3.2,-739)+1.4,-739,2.9,.13,.13,0xccbf93,'metal');
  // Ground cover is instanced separately and only drawn in nearby chunks.
  const grassGeometry=new THREE.BufferGeometry(),gp:number[]=[];
  for(let i=0;i<5;i++){const angle=i*2.4,dx=Math.cos(angle)*.035,dz=Math.sin(angle)*.035;gp.push(-dx,0,-dz,dx,0,dz,Math.sin(angle)*.12,.35+seeded(i+7)*.2,Math.cos(angle)*.12);}
  grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));grassGeometry.computeVertexNormals();
  const grassMaterial=new THREE.MeshStandardMaterial({color:0x798264,side:THREE.DoubleSide,roughness:1});
  const grassBatches=new Map<Chunk,{x:number;z:number;scale:number}[]>(),parcels=new SpatialIndex<Structure>();STRUCTURES.forEach(b=>parcels.add(b));
  let grassSeed=1;
  for(let z=REGION_BOUNDS.minZ+8;z<REGION_BOUNDS.maxZ;z+=8)for(let x=REGION_BOUNDS.minX+8;x<REGION_BOUNDS.maxX;x+=8,grassSeed++){
    const wx=x+(seeded(grassSeed*37)-.5)*6,wz=z+(seeded(grassSeed*41)-.5)*6;
    if(inLegacy(wx,wz)||wx>240&&wx<680&&wz>-410&&wz<285||waterClearance(wx,wz)<3||roadClearance(wx,wz)<2||parcels.query(wx,wz,3).length)continue;
    const chunk=at(wx,wz);if(!grassBatches.has(chunk))grassBatches.set(chunk,[]);grassBatches.get(chunk)!.push({x:wx,z:wz,scale:.7+seeded(grassSeed*43)*1.7});
  }
  for(const [chunk,points]of grassBatches){const mesh=new THREE.InstancedMesh(grassGeometry,grassMaterial,points.length);points.forEach((p,i)=>{transform.position.set(p.x,terrainHeight(p.x,p.z)+.02,p.z);transform.rotation.set(0,seeded(i*19)*Math.PI*2,0);transform.scale.setScalar(p.scale);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});mesh.computeBoundingSphere();chunk.detail.add(mesh);}
  // Vehicles sit beside roads at developed locations, leaving the carriageway clear.
  for(const p of PARKED_CARS){
    const group=new THREE.Group();group.position.set(p.x,terrainHeight(p.x,p.z),p.z);group.rotation.y=.4;group.add(detailedCar(p.color));at(p.x,p.z).group.add(group);
  }
  // Eight existing tree variants, batched per chunk and distance level.
  const treeBatches=new Map<string,{chunk:Chunk;trees:typeof TREES;pine:boolean;variant:number}>();
  for(const tree of TREES){const chunk=at(tree.x,tree.z),key=`${chunk.x},${chunk.z},${tree.species},${tree.variant}`;if(!treeBatches.has(key))treeBatches.set(key,{chunk,trees:[],pine:tree.species==='pine',variant:tree.variant});treeBatches.get(key)!.trees.push(tree);}
  for(const batch of treeBatches.values()){
    const parts=instancedTreeParts(batch.pine,batch.variant);
    // The existing medium crown keeps fine texture detail with one quarter of
    // the twigs; dense regional forests reserve full crowns for original trees.
    for(let level=0;level<3;level++)for(const [geometry,material] of [[parts.trunk[level],parts.bark],[parts.foliage[Math.min(2,level+1)],parts.leaves]] as const){
      const mesh=new THREE.InstancedMesh(geometry,material,batch.trees.length);mesh.castShadow=level===0;mesh.receiveShadow=true;
      batch.trees.forEach((t,i)=>{transform.position.set(t.x,terrainHeight(t.x,t.z),t.z);transform.rotation.set(0,t.rotation,0);transform.scale.setScalar(t.scale);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});mesh.computeBoundingSphere();batch.chunk.trees[level].add(mesh);
    }
  }
  for(const chunk of chunks.values())for(const [batches,group]of [[chunk.batches,chunk.group],[chunk.farBatches,chunk.distant]] as const){
    for(const[material,geometries]of batches){const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)throw Error('Regional geometry could not be batched');const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=material!==water&&material!==asphalt&&material!==dirt;mesh.receiveShadow=true;group.add(mesh);}batches.clear();
  }
  cube.dispose();cylinder.dispose();cone.dispose();tinted.forEach(g=>g.dispose());
  let active=0,activeTrees=0;
  const update=(x:number,z:number)=>{active=0;activeTrees=0;
    for(const c of chunks.values()){const d=Math.hypot(c.x-x,c.z-z),near=d<235;c.group.visible=near;c.detail.visible=d<130;c.distant.visible=d<650;c.terrain.visible=d<650;if(near)active++;
      const level=d<65?0:d<130?1:2;
      c.trees.forEach((g,i)=>{g.visible=i===level&&d<220;if(g.visible)for(const mesh of g.children)activeTrees+=(mesh as THREE.InstancedMesh).count/2;});
    }
  };
  update(-61,-35);
  return {root,update,stats:()=>({chunks:chunks.size,activeChunks:active,structures:STRUCTURES.length,trees:TREES.length,activeTrees,bridges:BRIDGES.length,loot:REGION_LOOT.length})};
}
