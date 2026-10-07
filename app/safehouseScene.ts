import * as THREE from 'three';
import { REFUGES } from './environment.ts';
import { SAFEHOUSES, houseSecured, type HouseState } from './safehouses.ts';
import { gateFootprint, uvScheduled } from './nightSurvival.ts';
import type { Obstacle } from './survival.ts';

export function buildSafehouseEntrances(scene:THREE.Scene,height:(x:number,z:number)=>number,obstacles:Obstacle[]) {
  const steel=new THREE.MeshStandardMaterial({color:0x889a9c,roughness:.65,metalness:.6});
  const sites=[...REFUGES.map(r=>({...r,prebuilt:true})),...SAFEHOUSES.map(h=>({...h,hx:7.35,hz:9,prebuilt:false}))];
  const gates=sites.map(site=>{
    const x=site.x,z=site.z+site.hz,y=height(x,z),pivot=new THREE.Group(),root=new THREE.Group();scene.add(root);
    pivot.position.set(x-2.05,y,z);root.add(pivot);
    const bar=(parent:THREE.Group,bx:number,by:number,bz:number,w:number,h:number,d:number)=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),steel);mesh.position.set(bx,by,bz);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
    };
    for(const level of [.15,1.85])bar(pivot,2.05,level,0,4.1,.09,.14);
    const bars=new THREE.InstancedMesh(new THREE.BoxGeometry(.06,1.8,.1),steel,13),transform=new THREE.Object3D();
    for(let i=0;i<bars.count;i++){transform.position.set(i*4.1/12,1,0);transform.updateMatrix();bars.setMatrixAt(i,transform.matrix);}bars.castShadow=bars.receiveShadow=true;pivot.add(bars);
    for(const side of [-1,1]){
      const post=new THREE.Mesh(new THREE.BoxGeometry(.15,2.4,.15),steel);post.position.set(x+side*2.17,y+1.2,z);root.add(post);
    }
    // The player-built houses get a small enclosed entrance court.
    if(!site.prebuilt){
      const wall=(wx:number,wz:number,hx:number,hz:number)=>{
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(hx*2,1.6,hz*2),steel);mesh.position.set(wx,height(wx,wz)+.8,wz);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);obstacles.push({x:wx,z:wz,hx,hz});
      };
      for(const side of [-1,1]){
        wall(x+side*4.725,z,2.625,.12);
        wall(x+side*7.35,site.z+7.9,.12,1.1);
      }
    }
    const obstacle=gateFootprint(x,z,false);obstacles.push(obstacle);
    const tubes:THREE.Mesh[]=[],emission=new THREE.MeshStandardMaterial({color:0x7794b2,emissive:0x704dff,emissiveIntensity:0});
    const lampPositions=[[x,z-1],...[-1,1].flatMap(side=>[-1,1].map(end=>[x+side*(site.hx-1),site.z+end*(site.hz-1)]))];
    for(const [lx,lz] of lampPositions){
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.04,.07,2.8,8),steel);pole.position.set(lx,height(lx,lz)+1.4,lz);root.add(pole);
      const tube=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.9,12),emission);tube.rotation.z=Math.PI/2;tube.position.set(lx,height(lx,lz)+2.85,lz);tube.visible=site.prebuilt;root.add(tube);tubes.push(tube);
    }
    const light=new THREE.PointLight(0x8562ff,0,Math.max(site.hx,site.hz)*2.5,2);light.position.set(x,y+2.8,z-2);
    const strip=new THREE.Mesh(new THREE.PlaneGeometry(4.2,2.5),new THREE.MeshBasicMaterial({color:0x795cff,transparent:true,opacity:.16,depthWrite:false}));
    strip.rotation.x=-Math.PI/2;strip.position.set(x,y+.06,z-.5);strip.visible=false;root.add(strip);
    return {...site,x,z,pivot,root,obstacle,open:false,uv:false,light,tubes,emission,strip};
  });
  const setGate=(id:string,open:boolean)=>{
    const gate=gates.find(g=>g.id===id);if(!gate)return;
    gate.open=open;Object.assign(gate.obstacle,gateFootprint(gate.x,gate.z,open));
  };
  const update=(elapsed:number,houses:Record<string,HouseState>,dt:number,camera?:{x:number;z:number})=>{
    for(const gate of gates){
      gate.root.visible=!camera||Math.hypot(gate.x-camera.x,gate.z-camera.z)<155;
      const secured=gate.prebuilt||houseSecured(houses[gate.id]);
      gate.uv=secured&&uvScheduled(elapsed);gate.light.intensity=gate.uv?65:0;
      gate.emission.emissiveIntensity=gate.uv?3:0;gate.tubes.forEach(t=>{t.visible=secured;});gate.strip.visible=gate.uv;
      gate.pivot.rotation.y=THREE.MathUtils.damp(gate.pivot.rotation.y,gate.open?-Math.PI/2:0,9,dt);
    }
  };
  const reset=()=>{for(const gate of gates){
    setGate(gate.id,false);gate.pivot.rotation.y=0;gate.uv=false;gate.light.intensity=0;
    gate.emission.emissiveIntensity=0;gate.strip.visible=false;gate.tubes.forEach(t=>{t.visible=gate.prebuilt;});
  }};
  return {gates,setGate,update,reset};
}
