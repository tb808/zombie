import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LAKES, REGION_BOUNDS, roadClearance, waterClearance, seeded, inLegacy, zoneAt } from './regionPlan.ts';
import { terrainHeight } from './regionTerrain.ts';
import type { Point } from './survival.ts';

export type AnimalKind='deer'|'hare'|'duck';
export type AnimalHome=Point&{id:number;kind:AnimalKind;radius:number;scale:number;lake?:string};
type Animal=AnimalHome&{homeX:number;homeZ:number;targetX:number;targetZ:number;angle:number;wait:number;step:number;moving:boolean;fleeing:boolean};
type Blocked=(x:number,z:number)=>boolean;
export function wildlifeLandClear(x:number,z:number,blocked:Blocked){
  if(inLegacy(x,z,12)||zoneAt(x,z)?.biome==='city'||roadClearance(x,z)<4||waterClearance(x,z)<4||blocked(x,z))return false;
  const y=terrainHeight(x,z);
  return Number.isFinite(y)&&Math.abs(terrainHeight(x+1,z)-y)<.45&&Math.abs(terrainHeight(x,z+1)-y)<.45;
}
export function planWildlife(blocked:Blocked):AnimalHome[]{
  const out:AnimalHome[]=[];let id=1;
  const habitats:[AnimalKind,number,number,number][]=[['deer',-945,575,4],['deer',-390,500,4],['deer',140,-655,4],['deer',1050,-445,4],['deer',-890,-560,3],['deer',-230,750,3],['hare',-980,100,4],['hare',-510,-210,4],['hare',140,600,4],['hare',380,600,4]];
  for(const[kind,cx,cz,count]of habitats)for(let n=0;n<count;n++){
    for(let i=0;i<45;i++){const seed=id*71+i+13,angle=seeded(seed)*Math.PI*2,r=3+seeded(seed*17)*16,x=cx+Math.sin(angle)*r,z=cz+Math.cos(angle)*r;
      if(!wildlifeLandClear(x,z,blocked)||out.some(p=>Math.hypot(x-p.x,z-p.z)<2))continue;
      out.push({id:id++,kind,x,z,radius:kind==='deer'?20:12,scale:.8+seeded(seed*19)*.3});break;
    }
  }
  for(const lake of LAKES)for(let i=0;i<(lake.rx>50?6:3);i++){
    const angle=i*2.4+1.1,x=lake.x+Math.cos(angle)*lake.rx*.55,z=lake.z+Math.sin(angle)*lake.rz*.55;
    out.push({id:id++,kind:'duck',x,z,radius:Math.min(lake.rx,lake.rz)*.3,scale:.85+seeded(id*31)*.2,lake:lake.id});
  }
  return out;
}
function animalGeometry(kind:AnimalKind){
  const parts:THREE.BufferGeometry[]=[];
  const add=(x:number,y:number,z:number,w:number,h:number,d:number,color:number,shape:'ellipsoid'|'cone'|'box'='ellipsoid',rotation=0)=>{
    const g=shape==='ellipsoid'?new THREE.IcosahedronGeometry(1,1):shape==='cone'?new THREE.ConeGeometry(1,1,5):new THREE.BoxGeometry(2,2,2);
    g.scale(w/2,h/2,d/2);g.rotateX(rotation);g.translate(x,y,z);
    const c=new THREE.Color(color),colors=Array.from({length:g.getAttribute('position').count},()=>[c.r,c.g,c.b]).flat();g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts.push(g.index?g.toNonIndexed():g);if(g.index)g.dispose();
  };
  if(kind==='deer'){
    add(0,1.02,0,.64,.82,1.35,0x9c8565);add(0,.94,-.58,.38,.5,.45,0xc5b99b);add(0,1.42,.52,.36,.9,.38,0xa18c6e,'ellipsoid',-.25);
    add(0,1.81,.73,.4,.44,.68,0x9e896c);add(0,1.68,1.02,.25,.2,.23,0x5b5548);
    for(const side of [-1,1]){add(side*.24,2.02,.65,.2,.42,.15,0x9c8565,'cone',-.25);add(side*.18,1.88,.86,.055,.055,.06,0x272e28);}
    add(0,1.09,-.74,.2,.22,.32,0xbfb194,'cone',Math.PI/2);
  }else if(kind==='hare'){
    add(0,.34,0,.38,.46,.68,0x9b947f);add(0,.55,.28,.33,.36,.36,0xa8a089);add(0,.31,-.36,.22,.22,.22,0xcdc6b2);
    for(const side of [-1,1]){add(side*.1,.89,.25,.095,.62,.14,0xa49a82,'ellipsoid',-.16);add(side*.14,.61,.41,.045,.045,.05,0x292f28);}add(0,.48,.47,.09,.07,.07,0x746b60);
  }else{
    add(0,.16,0,.39,.33,.64,0x948e70);add(0,.2,-.32,.22,.19,.35,0x6e7964,'cone',-Math.PI/2);add(0,.41,.22,.2,.4,.21,0x6c8165);add(0,.57,.29,.26,.25,.3,0x647b63);
    add(0,.54,.49,.23,.065,.25,0xb29b61,'box');for(const side of [-1,1]){add(side*.19,.23,0,.075,.19,.44,0x6d7666);add(side*.115,.61,.36,.04,.04,.045,0x26332c);}
  }
  const body=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());
  const legHeight=kind==='deer'?.71:.16,leg=new THREE.CylinderGeometry(kind==='deer'?.035:.025,kind==='deer'?.045:.03,legHeight,5);leg.translate(0,-legHeight/2,0);
  return {body,leg,legHeight};
}
export function buildWildlife(scene:THREE.Scene,homes:readonly AnimalHome[],blocked:Blocked){
  const root=new THREE.Group();root.name='ambient-wildlife';scene.add(root);
  const animals:Animal[]=homes.map(p=>({...p,homeX:p.x,homeZ:p.z,targetX:p.x,targetZ:p.z,angle:seeded(p.id*43)*Math.PI*2,wait:seeded(p.id*17)*4,step:0,moving:false,fleeing:false}));
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),legMaterial=new THREE.MeshStandardMaterial({color:0x7c705c,roughness:1});
  const batches=new Map<AnimalKind,{body:THREE.InstancedMesh;legs:THREE.InstancedMesh;legHeight:number}>(),object=new THREE.Object3D(),base=new THREE.Matrix4(),local=new THREE.Matrix4();
  for(const kind of ['deer','hare','duck'] as const){const count=homes.filter(p=>p.kind===kind).length;if(!count)continue;const g=animalGeometry(kind),body=new THREE.InstancedMesh(g.body,material,count),legs=new THREE.InstancedMesh(g.leg,legMaterial,count*4);
    body.frustumCulled=legs.frustumCulled=false;body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);legs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);body.castShadow=true;body.receiveShadow=true;root.add(body,legs);batches.set(kind,{body,legs,legHeight:g.legHeight});
  }
  const clear=(a:Animal,x:number,z:number)=>{
    if(x<REGION_BOUNDS.minX+3||x>REGION_BOUNDS.maxX-3||z<REGION_BOUNDS.minZ+3||z>REGION_BOUNDS.maxZ-3)return false;
    if(a.kind==='duck'){const lake=LAKES.find(l=>l.id===a.lake)!;return waterClearance(x,z)<-1&&Math.hypot((x-lake.x)/lake.rx,(z-lake.z)/lake.rz)<.85;}
    return wildlifeLandClear(x,z,blocked);
  };
  let active=0,moving=0,fleeing=0;
  const update=(dt:number,time:number,player:Point)=>{
    active=moving=fleeing=0;const counts={deer:0,hare:0,duck:0};
    for(const a of animals){const distance=Math.hypot(a.x-player.x,a.z-player.z);if(distance>180)continue;active++;
      a.fleeing=distance<(a.kind==='deer'?13:a.kind==='hare'?8:5);if(a.fleeing)fleeing++;
      if(dt>0){a.wait-=dt;
        if(a.wait<=0||a.fleeing){
          const direction=a.fleeing?Math.atan2(a.x-player.x,a.z-player.z):seeded(a.id*113+Math.floor(time/5))*Math.PI*2;
          const radius=a.fleeing?a.radius:3+seeded(a.id*71+Math.floor(time/5))*a.radius*.65,tx=a.homeX+Math.sin(direction)*radius,tz=a.homeZ+Math.cos(direction)*radius;
          if(clear(a,tx,tz)){a.targetX=tx;a.targetZ=tz;}a.wait=3+seeded(a.id*53+Math.floor(time))*6;
        }
        const dx=a.targetX-a.x,dz=a.targetZ-a.z,length=Math.hypot(dx,dz),speed=a.kind==='duck'?.48:a.kind==='hare'?(a.fleeing?3.4:1.3):(a.fleeing?4.6:.65),step=Math.min(length,speed*dt);
        a.moving=length>.12;const nx=a.x+dx/(length||1)*step,nz=a.z+dz/(length||1)*step;
        if(a.moving&&clear(a,nx,nz)){a.x=nx;a.z=nz;a.angle=Math.atan2(dx,dz);a.step+=step*(a.kind==='hare'?10:5);}else{a.moving=false;a.targetX=a.x;a.targetZ=a.z;}
      }
      if(a.moving)moving++;const i=counts[a.kind]++,batch=batches.get(a.kind)!,hop=a.kind==='hare'&&a.moving?Math.abs(Math.sin(a.step))*.16:0;
      object.position.set(a.x,a.kind==='duck'?.22+Math.sin(time*2+a.id)*.009:terrainHeight(a.x,a.z)+hop,a.z);object.rotation.set(0,a.angle,0);object.scale.setScalar(a.scale);object.updateMatrix();base.copy(object.matrix);batch.body.setMatrixAt(i,base);
      if(a.kind!=='duck')for(let leg=0;leg<4;leg++){
        const side=leg%2?1:-1,front=leg<2?1:-1,swing=a.moving?Math.sin(a.step+(side===front?0:Math.PI))*(a.fleeing?.5:.23):0;
        object.position.set(side*(a.kind==='deer'?.22:.13),batch.legHeight,front*(a.kind==='deer'?.44:.2));object.rotation.set(swing,0,0);object.scale.setScalar(1);object.updateMatrix();local.multiplyMatrices(base,object.matrix);batch.legs.setMatrixAt(i*4+leg,local);
      }
    }
    for(const [kind,b]of batches){b.body.count=counts[kind];b.legs.count=kind==='duck'?0:counts[kind]*4;b.body.visible=b.body.count>0;b.legs.visible=b.legs.count>0;b.body.instanceMatrix.needsUpdate=true;b.legs.instanceMatrix.needsUpdate=true;}
  };
  update(0,0,{x:0,z:0});
  return {root,homes,update,stats:()=>({total:animals.length,deer:homes.filter(p=>p.kind==='deer').length,hares:homes.filter(p=>p.kind==='hare').length,ducks:homes.filter(p=>p.kind==='duck').length,active,moving,fleeing,meshes:batches.size*2}),positions:()=>animals.map(a=>({id:a.id,kind:a.kind,x:a.x,z:a.z,y:a.kind==='duck'?.22:terrainHeight(a.x,a.z),moving:a.moving,fleeing:a.fleeing}))};
}
