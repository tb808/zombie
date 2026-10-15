import * as THREE from 'three';
import { STORY_ACTIVITIES, type ActivityStates } from './storyActivities.ts';
import type { createLootVisualLibrary, LootVisualKind } from './lootVisuals.ts';

export function buildActivityProps(scene:THREE.Scene,height:(x:number,z:number)=>number,lootVisuals:ReturnType<typeof createLootVisualLibrary>){
  const roots=STORY_ACTIVITIES.flatMap(m=>m.steps.flatMap((s,index)=>{
    if(!s.prop||['talk','treat','deliver','escort','shelter','clear'].includes(s.kind))return [];
    const root=new THREE.Group();root.position.set(s.x,height(s.x,s.z),s.z);root.name=`activity-${m.id}-${index}`;
    const color=s.prop==='medicine'?0xf1e6cf:s.prop==='food'?0x937650:s.prop==='fuel'?0xc36b3e:s.prop==='tools'?0xcc9c47:0x729da5;
    const material=new THREE.MeshStandardMaterial({color,roughness:.7,metalness:.22});
    const indicator=new THREE.MeshStandardMaterial({color:0xdfff6b,emissive:0x7b9d27,emissiveIntensity:.8});
    const box=(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material=material)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);root.add(o);return o;};
    const device=s.kind==='defend'||s.kind==='repair'||s.kind==='switch';
    if(device){
      box(1.15,.85,.65,0,.52,0);box(.65,.32,.03,0,.66,.34,indicator);
      box(.07,.65,.07,.42,1.25,0);box(.7,.04,.04,.42,1.55,0);
      if(s.prop==='pump'||s.prop==='cooler'){box(.28,.7,.28,-.6,.4,0);box(1.5,.12,.12,0,.22,-.2);}
    }else if(s.kind==='collect'){
      const kinds:Partial<Record<NonNullable<typeof s.prop>,LootVisualKind>>={medicine:'medicalCase',food:'supplyCrate',fuel:'fuel',tools:'toolbox',battery:'powerBattery',module:'module',sample:'serum',cooler:'cooler'};
      const visual=lootVisuals.create(kinds[s.prop]??'scrap');visual.position.y=.025;root.add(visual);
    }else{
      box(s.prop==='cooler'?1.05:.65,s.prop==='food'?.6:.4,.5,0,.45,0);
      box(.28,.06,.1,0,.7,0);box(.08,.38,.52,.18,.45,0);
      if(s.prop==='medicine'){const red=new THREE.MeshStandardMaterial({color:0xd84340});box(.1,.24,.02,0,.46,.26,red);box(.24,.1,.02,0,.46,.27,red);}
    }
    root.visible=false;scene.add(root);return [{mission:m.id,index,root,indicator,device}];
  }));
  return {update(states:ActivityStates,learned:readonly string[],current:string,camera:{x:number;z:number}){
    for(const r of roots){
      const done=learned.includes(r.mission)||(states[r.mission]?.step??0)>r.index;
      const phase=learned.includes(r.mission)?Infinity:states[r.mission]?.step??0;
      const replaced=r.device&&roots.some(other=>other!==r&&other.device&&other.mission===r.mission&&other.index>r.index&&other.index<=phase&&other.root.position.distanceTo(r.root.position)<.1);
      r.root.visible=!replaced&&Math.hypot(camera.x-r.root.position.x,camera.z-r.root.position.z)<140&&(r.mission===current&&r.index<=phase||done&&r.device)&&(!done||r.device);
      r.indicator.emissive.setHex(done?0x248d55:0x7b9d27);r.indicator.color.setHex(done?0x5ad8a0:0xdfff6b);
    }
  }};
}
