import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LAKES, WATER_LINES, REGION_LOOT, STRUCTURES, SpatialIndex, inLegacy, overlaps, roadClearance, seeded, waterClearance, bridgeAt } from './regionPlan.ts';
import { terrainHeight } from './regionTerrain.ts';
import { SITE_RESERVATIONS } from './shelterSites.ts';
import type { Obstacle, Point } from './survival.ts';

export type ShoreKind='reed'|'shoreRock'|'lily'|'driftwood';
export type ShorePlacement=Obstacle&{kind:ShoreKind;y:number;scale:number;rotation:number;water:string};
export function planShoreline(footprints:readonly Obstacle[]=[],reserved:readonly Point[]=[]){
  const out:ShorePlacement[]=[],occupied=new SpatialIndex<Obstacle>(24);
  [...STRUCTURES,...SITE_RESERVATIONS,...footprints].forEach(p=>occupied.add(p));
  const clear=[...REGION_LOOT,...reserved];
  const put=(kind:ShoreKind,x:number,z:number,seed:number,water:string)=>{
    const scale=.7+seeded(seed*43)*.65,r=(kind==='driftwood'?1.6:kind==='reed'?1.05:kind==='shoreRock'?1:.6)*scale,p={x,z,hx:r,hz:r},bank=waterClearance(x,z),y=kind==='lily'?.237:terrainHeight(x,z);
    if(inLegacy(x,z,12)||bridgeAt(x,z,10)||roadClearance(x,z)<r+3||occupied.query(x,z,r+.2).some(q=>overlaps(p,q,.2))||clear.some(q=>Math.hypot(q.x-x,q.z-z)<r+3))return;
    if(kind==='lily'?bank>-.8||bank<-12:bank<.8||bank>6||y<.22||y>2.1)return;
    if(kind!=='lily'&&Math.max(...[[r,0],[-r,0],[0,r],[0,-r]].map(([dx,dz])=>Math.abs(terrainHeight(x+dx,z+dz)-y)))>.13)return;
    const item={...p,kind,y,scale,rotation:seeded(seed*47)*Math.PI*2,water};out.push(item);occupied.add(item);
  };
  for(const [li,lake]of LAKES.entries()){
    const count=Math.ceil((lake.rx+lake.rz)*2.5);
    for(let i=0;i<count;i++){
      const seed=li*1009+i+41,angle=i/count*Math.PI*2,jitter=seeded(seed*17),offset=1+(1.2+jitter*3)/Math.min(lake.rx,lake.rz);
      if(jitter>.2)put(i%11===0?'shoreRock':i%23===0?'driftwood':'reed',lake.x+Math.cos(angle)*lake.rx*offset,lake.z+Math.sin(angle)*lake.rz*offset,seed,lake.id);
      if(i%5===0){const inside=1-(2+seeded(seed*19)*5)/Math.min(lake.rx,lake.rz);put('lily',lake.x+Math.cos(angle)*lake.rx*inside,lake.z+Math.sin(angle)*lake.rz*inside,seed+91,lake.id);}
    }
  }
  for(const line of WATER_LINES)for(let i=2;i<line.samples.length-2;i+=2){const p=line.samples[i],a=line.samples[i-1],b=line.samples[i+1],length=Math.hypot(b.x-a.x,b.z-a.z);
    for(const side of [-1,1]){const seed=i*71+line.id.length*91+side,offset=line.width/2*(.85+.22*Math.sin(i*.14))+2.5;put(i%7===0?'shoreRock':'reed',p.x+(b.z-a.z)/length*side*offset,p.z-(b.x-a.x)/length*side*offset,seed,line.id);}
  }
  return out;
}
function shoreGeometry(kind:ShoreKind){
  const pieces:THREE.BufferGeometry[]=[];
  const add=(g:THREE.BufferGeometry,color:number)=>{g.deleteAttribute('uv');const c=new THREE.Color(color),colors=Array.from({length:g.getAttribute('position').count},()=>[c.r,c.g,c.b]).flat();g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));pieces.push(g.index?g.toNonIndexed():g);if(g.index)g.dispose();};
  if(kind==='reed')for(let i=0;i<6;i++){
    const angle=i*2.4,x=Math.sin(angle)*.35,z=Math.cos(angle)*.35,h=.9+(i%3)*.22,g=new THREE.CylinderGeometry(.012,.022,h,4);g.translate(x,h/2,z);add(g,0x71815b);
    if(i%2===0){const head=new THREE.CylinderGeometry(.045,.045,.26,5);head.translate(x,h-.02,z);add(head,0x766044);}
    const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute([x,0,z,x+.07,.42,z,x+Math.cos(angle)*.6,.7,z+Math.sin(angle)*.6],3));leaf.computeVertexNormals();add(leaf,0x859268);
  }
  if(kind==='lily')for(let i=0;i<3;i++){
    const g=new THREE.CircleGeometry(.25+i*.035,10,0,Math.PI*1.85);g.rotateX(-Math.PI/2);g.rotateY(i*2.4);g.translate(Math.sin(i*2.4)*.25,.002+i*.003,Math.cos(i*2.4)*.25);add(g,0x667b51);
    if(i===0){const flower=new THREE.IcosahedronGeometry(.065,0);flower.scale(1,.45,1);flower.translate(0,.04,.22);add(flower,0xcfc8aa);}
  }
  if(kind==='shoreRock'){const g=new THREE.IcosahedronGeometry(1,1),p=g.getAttribute('position');for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*.7,Math.max(0,(p.getY(i)+.7)*.4),p.getZ(i)*.65);g.computeVertexNormals();add(g,0x9e9f8c);}
  if(kind==='driftwood'){const g=new THREE.CylinderGeometry(.08,.14,2.8,6);g.rotateZ(Math.PI/2);g.translate(0,.14,0);add(g,0x887b62);const branch=new THREE.CylinderGeometry(.025,.065,.8,5);branch.rotateZ(-.7);branch.translate(.3,.35,0);add(branch,0x887b62);}
  const merged=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());return merged;
}
export function buildShoreline(scene:THREE.Scene,plan:readonly ShorePlacement[]){
  const root=new THREE.Group();root.name='shoreline-life';scene.add(root);
  const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:THREE.DoubleSide,roughness:.95}),geometries=new Map<ShoreKind,THREE.BufferGeometry>();
  const cells=new Map<string,{x:number;z:number;points:ShorePlacement[];mesh?:THREE.InstancedMesh}>(),object=new THREE.Object3D();
  for(const p of plan){const x=Math.floor(p.x/80),z=Math.floor(p.z/80),key=`${x},${z},${p.kind}`;if(!cells.has(key))cells.set(key,{x:x*80+40,z:z*80+40,points:[]});cells.get(key)!.points.push(p);}
  for(const c of cells.values()){const kind=c.points[0].kind;if(!geometries.has(kind))geometries.set(kind,shoreGeometry(kind));const mesh=new THREE.InstancedMesh(geometries.get(kind)!,material,c.points.length);
    c.points.forEach((p,i)=>{object.position.set(p.x,p.y-.012,p.z);object.rotation.set(0,p.rotation,0);object.scale.setScalar(p.scale);object.updateMatrix();mesh.setMatrixAt(i,object.matrix);});mesh.computeBoundingSphere();mesh.receiveShadow=true;root.add(mesh);c.mesh=mesh;
  }
  let activeCells=0;const update=(x:number,z:number)=>{activeCells=0;for(const c of cells.values()){c.mesh!.visible=Math.hypot(x-c.x,z-c.z)<210;if(c.mesh!.visible)activeCells++;}};update(0,0);
  const counts=plan.reduce((a,p)=>(a[p.kind]++,a),{reed:0,shoreRock:0,lily:0,driftwood:0});
  return {root,plan,update,stats:()=>({...counts,cells:cells.size,activeCells})};
}
