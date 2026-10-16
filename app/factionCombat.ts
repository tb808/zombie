import * as THREE from 'three';
import { FACTIONS, type Faction } from './narrative.ts';
import type { Point } from './survival.ts';

export type SavedFighter={id:string;faction:Faction;side:'ally'|'hostile';x:number;z:number;health:number;cooldown:number;encounter:string;name:string};
type Character={model:THREE.Group;mixer:THREE.AnimationMixer;actions:{idle:THREE.AnimationAction;run:THREE.AnimationAction}};
type ZombieTarget={group:THREE.Group;alive:boolean};
type Fighter=SavedFighter&{group:THREE.Group;head:THREE.Mesh;hitbox:THREE.Mesh;muzzle:THREE.Mesh;alive:boolean;deathTime:number;aimTime:number;path:Point[];pathTime:number;moving:boolean;character?:Character;flash:number};
type Api={height:(x:number,z:number)=>number;blocked:(x:number,z:number)=>boolean;path:(a:Point,b:Point)=>Point[];move:(p:THREE.Vector3,t:THREE.Vector3,speed:number,dt:number)=>boolean;visible:(a:THREE.Vector3,b:THREE.Vector3)=>boolean;obstacles:(a:Point,b:Point)=>readonly (Point&{hx:number;hz:number})[];player:()=>THREE.Vector3;hurt:(damage:number)=>void;zombies:()=>ZombieTarget[];hurtZombie:(z:ZombieTarget,damage:number,p:Point)=>void;noise:(p:Point)=>void;sound:(p:Point)=>void;load:(skin:string)=>Promise<Character>;friendlyFire:(faction:Faction)=>void;};
const names=['Rieger','Mertens','Aydin','Kovac','Stern','Bach','Lange','Veit'];
export function buildFactionCombat(scene:THREE.Scene,api:Api){
  const units:Fighter[]=[],hitboxes:THREE.Mesh[]=[];
  let generation=0;
  const material=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.8});
  const remove=(u:Fighter)=>{
    u.character?.mixer.stopAllAction();if(u.character)u.character.mixer.uncacheRoot(u.character.model);
    const skeletons=new Set<THREE.Skeleton>();
    u.group.traverse(o=>{if(o instanceof THREE.SkinnedMesh)skeletons.add(o.skeleton);if(o instanceof THREE.Mesh){if(o.userData.factionOwned)o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m instanceof THREE.MeshBasicMaterial&&m.map)m.map.dispose();m.dispose();});}});
    skeletons.forEach(s=>s.dispose());scene.remove(u.group);
  };
  const spawn=(saved:SavedFighter)=>{
    const group=new THREE.Group();group.name=`${FACTIONS[saved.faction].name} · ${saved.name}`;group.position.set(saved.x,api.height(saved.x,saved.z),saved.z);scene.add(group);
    const hidden=new THREE.MeshBasicMaterial({visible:false});
    const hitbox=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.65,3,7),hidden),head=new THREE.Mesh(new THREE.SphereGeometry(.23,8,6),hidden);
    hitbox.position.y=.87;head.position.y=1.58;group.add(hitbox,head);
    const fallback=new THREE.Mesh(new THREE.CapsuleGeometry(.3,.8,4,8),material(FACTIONS[saved.faction].color));fallback.position.y=.9;group.add(fallback);
    const armBand=new THREE.Mesh(new THREE.BoxGeometry(.18,.16,.27),material(FACTIONS[saved.faction].color));armBand.position.set(.38,1.2,0);group.add(armBand);
    const rifle=new THREE.Mesh(new THREE.BoxGeometry(.12,.15,.8),material(0x414941));rifle.position.set(.2,1.15,-.35);group.add(rifle);
    const muzzle=new THREE.Mesh(new THREE.SphereGeometry(.08,6,4),new THREE.MeshBasicMaterial({color:0xffb35a}));muzzle.position.set(.2,1.15,-.8);muzzle.visible=false;group.add(muzzle);
    for(const o of [hitbox,head,fallback,armBand,rifle,muzzle])o.userData.factionOwned=true;
    const u:Fighter={...saved,group,head,hitbox,muzzle,alive:true,deathTime:18,aimTime:0,path:[],pathTime:0,moving:false,flash:0};
    hitbox.userData.fighter=u;head.userData.fighter=u;head.userData.head=true;hitboxes.push(hitbox,head);units.push(u);
    const born=generation;
    api.load(saved.faction==='union'?'survivorFemaleA':'survivorMaleB').then(character=>{
      if(born!==generation||!u.alive){character.mixer.stopAllAction();character.model.traverse(o=>{if(o instanceof THREE.Mesh){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});return;}
      fallback.visible=false;u.character=character;character.model.rotation.y=Math.PI;group.add(character.model);
    }).catch(()=>undefined);
    return u;
  };
  const damage=(u:Fighter,amount:number,player=false)=>{
    if(!u.alive)return;
    if(player&&u.side==='ally'){u.side='hostile';api.friendlyFire(u.faction);}
    u.health-=amount;u.aimTime=.5;
    if(u.health<=0){u.alive=false;u.character?.actions.run.stop();u.character?.actions.idle.stop();u.group.rotation.z=Math.PI/2;u.group.position.y+=.25;u.muzzle.visible=false;
      for(const b of [u.hitbox,u.head]){const i=hitboxes.indexOf(b);if(i>=0)hitboxes.splice(i,1);}
    }
  };
  const spawnWave=(centre:Point,encounter:string,wave:number,faction:Faction,count:number,side:'ally'|'hostile')=>{
    // Completed posts keep their guards until the player leaves the area. Free
    // distant support slots so later encounters can always field their enemies.
    for(let i=units.length-1;i>=0;i--){const u=units[i];if(u.side==='ally'&&u.encounter!==encounter&&u.group.position.distanceTo(api.player())>110){for(const b of [u.hitbox,u.head]){const n=hitboxes.indexOf(b);if(n>=0)hitboxes.splice(n,1);}remove(u);units.splice(i,1);}}
    const prefix=`${encounter}:${wave}:${faction}:${side}:`;if(units.some(u=>u.id.startsWith(prefix)))return;
    let spawned=0;
    for(let i=0;i<60&&spawned<count&&units.filter(u=>u.alive).length<24;i++){
      const a=i*2.4+(side==='ally'?Math.PI:0),r=8+i%4*2,x=centre.x+Math.cos(a)*r,z=centre.z+Math.sin(a)*r;
      if(api.blocked(x,z)||Math.hypot(api.player().x-x,api.player().z-z)<3||!api.path({x,z},centre).length)continue;
      spawn({id:`${prefix}${spawned}`,faction,side,x,z,health:100,cooldown:.8+spawned*.25,encounter,name:names[(spawned+wave*3)%names.length]});spawned++;
    }
  };
  const tracer=(a:THREE.Vector3,b:THREE.Vector3)=>{
    const g=new THREE.BufferGeometry().setFromPoints([a,b]),line=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffcf78,transparent:true,opacity:.8}));scene.add(line);line.userData.life=.09;tracers.push(line);
  };
  const tracers:THREE.Line[]=[];
  const tick=(dt:number)=>{
    for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];t.userData.life-=dt;if(t.userData.life<=0){scene.remove(t);t.geometry.dispose();(t.material as THREE.Material).dispose();tracers.splice(i,1);}}
    for(let i=units.length-1;i>=0;i--){
      const u=units[i];
      if(!u.alive){u.deathTime-=dt;if(u.deathTime<=0){remove(u);units.splice(i,1);}continue;}
      const player=api.player(),distance=u.group.position.distanceTo(player);u.group.visible=distance<110;if(distance>110)continue;
      u.character?.mixer.update(dt);u.cooldown-=dt;u.pathTime-=dt;u.flash-=dt;u.muzzle.visible=u.flash>0||u.aimTime>0;
      const opponent=units.filter(v=>v!==u&&v.alive&&v.side!==u.side&&v.group.position.distanceTo(u.group.position)<42).sort((a,b)=>a.group.position.distanceToSquared(u.group.position)-b.group.position.distanceToSquared(u.group.position))[0];
      const zombie=api.zombies().find(z=>z.alive&&z.group.position.distanceTo(u.group.position)<16&&api.visible(u.group.position,z.group.position));
      const target=opponent?.group.position??(zombie?.group.position??(u.side==='hostile'&&distance<45?player:null));
      if(!target){u.aimTime=0;continue;}
      const to=target.clone();if(opponent||zombie)to.y+=1.2;
      u.group.rotation.y=Math.atan2(target.x-u.group.position.x,target.z-u.group.position.z)+Math.PI;
      const range=Math.hypot(target.x-u.group.position.x,target.z-u.group.position.z),visible=api.visible(u.group.position,target);
      let moving=false;
      if(!visible||range>27||range<5){
        if(u.pathTime<=0){
          let destination:Point=target;
          if(range<5){const dx=u.group.position.x-target.x,dz=u.group.position.z-target.z,d=Math.max(.1,Math.hypot(dx,dz));destination={x:u.group.position.x+dx/d*4,z:u.group.position.z+dz/d*4};}
          // A covered offset beside a wall gives riflemen a different movement
          // pattern from the infected instead of a reskinned melee chase.
          for(const o of api.obstacles(u.group.position,target).slice(0,24)){
            const p={x:o.x+(u.group.position.x>o.x?1:-1)*(o.hx+.9),z:o.z+(u.group.position.z>o.z?1:-1)*(o.hz+.9)};
            if(Math.hypot(p.x-u.group.position.x,p.z-u.group.position.z)<9&&!api.blocked(p.x,p.z)&&api.path(u.group.position,p).length){destination=p;break;}
          }
          u.path=api.path(u.group.position,destination);u.pathTime=1.1;
        }
        while(u.path.length&&Math.hypot(u.path[0].x-u.group.position.x,u.path[0].z-u.group.position.z)<.5)u.path.shift();
        if(u.path[0])moving=api.move(u.group.position,new THREE.Vector3(u.path[0].x,0,u.path[0].z),2.7,dt);
      }
      if(moving!==u.moving&&u.character){u.character.actions[moving?'idle':'run'].fadeOut(.2);u.character.actions[moving?'run':'idle'].reset().fadeIn(.2).play();u.moving=moving;}
      if(visible&&range<34&&u.cooldown<=0){
        if(u.aimTime<=0){u.aimTime=.55;u.cooldown=.01;}
        else {u.aimTime-=dt;if(u.aimTime<=0){
          const muzzle=u.group.position.clone();muzzle.y+=1.25;tracer(muzzle,to);u.flash=.08;api.noise(u.group.position);api.sound(u.group.position);
          if(api.visible(u.group.position,target)){
            if(opponent)damage(opponent,22);else if(zombie)api.hurtZombie(zombie,28,u.group.position);else api.hurt(8);
          }
          u.cooldown=1.3+(u.faction==='cinder'?.3:0);
        }}
      }else if(!visible)u.aimTime=0;
      u.x=u.group.position.x;u.z=u.group.position.z;
    }
  };
  const snapshot=():SavedFighter[]=>units.filter(u=>u.alive).map(u=>({id:u.id,faction:u.faction,side:u.side,x:u.group.position.x,z:u.group.position.z,health:u.health,cooldown:Math.max(0,u.cooldown),encounter:u.encounter,name:u.name}));
  const clear=()=>{generation++;units.forEach(remove);units.length=0;hitboxes.length=0;for(const t of tracers){scene.remove(t);t.geometry.dispose();(t.material as THREE.Material).dispose();}tracers.length=0;};
  return {hitboxes,tick,damage,spawnWave,snapshot,clear,restore:(saved:SavedFighter[])=>{clear();saved.forEach(spawn);},remaining:(encounter:string)=>units.filter(u=>u.alive&&u.side==='hostile'&&u.encounter===encounter).length,
    threat:(p:Point,r=8)=>units.some(u=>u.alive&&u.side==='hostile'&&Math.hypot(u.group.position.x-p.x,u.group.position.z-p.z)<r),
    nearest:(p:THREE.Vector3)=>units.filter(u=>u.alive&&u.side==='hostile'&&u.group.position.distanceTo(p)<18&&api.visible(p,u.group.position)).sort((a,b)=>a.group.position.distanceToSquared(p)-b.group.position.distanceToSquared(p))[0],
    prey:(p:THREE.Vector3)=>units.filter(u=>u.alive&&u.group.position.distanceTo(p)<8&&api.visible(p,u.group.position)).sort((a,b)=>a.group.position.distanceToSquared(p)-b.group.position.distanceToSquared(p))[0],
    inspect:()=>units.map(u=>({...snapshot().find(s=>s.id===u.id),alive:u.alive,position:u.group.position.toArray(),head:u.head.getWorldPosition(new THREE.Vector3()).toArray(),visible:api.visible(api.player(),u.group.position)})),
  };
}
