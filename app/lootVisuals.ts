import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { LootKind } from './world.ts';

export type LootVisualKind = LootKind | 'fuel' | 'serum' | 'fuse' | 'keycard' | 'shotgun' | 'rifle' | 'medicalCase' | 'supplyCrate' | 'powerBattery' | 'toolbox' | 'module' | 'cooler';
export const LOOT_VISUAL_KINDS: readonly LootVisualKind[] = ['medkit','ration','battery','flare','scrap','water','antibiotic','armor','planks','ammo','shells','rifleAmmo','fuel','serum','fuse','keycard','shotgun','rifle','medicalCase','supplyCrate','powerBattery','toolbox','module','cooler'];
const ATLAS_ROWS=Math.ceil(LOOT_VISUAL_KINDS.length/4);
const labels: Record<LootVisualKind, readonly [string,string,string]> = {
  medkit:['VERBAND','STERIL · 5 m','#b33e39'],ration:['RATION','FELDKÜCHE · 400 g','#8a693e'],battery:['BATTERIE','1.5 V · ALKALINE','#236e80'],
  flare:['SIGNAL','LEUCHTFACKEL','#c34d29'],scrap:['ERSATZTEILE','M8 · STAHL','#586460'],water:['WASSER','TRINKWASSER · 0.75 L','#267896'],
  antibiotic:['ANTIBIOTIKA','500 mg · 12 KAPSELN','#77638e'],armor:['SCHUTZ','PLATTENTRÄGER','#495a42'],planks:['BAUHOLZ','TROCKEN · KIEFER','#88623c'],
  ammo:['9 mm','24 PATRONEN','#a47c38'],shells:['12 / 70','SCHROT · 6 HÜLSEN','#993b31'],rifleAmmo:['5.56 mm','GEWEHRMUNITION','#54633d'],
  fuel:['KRAFTSTOFF','5 L · ENTZÜNDLICH','#ab6230'],serum:['LAZARUS','SERUM · PROBE 07','#327d91'],fuse:['SICHERUNG','32 A · 400 V','#b8953d'],
  keycard:['ZUGANG','SEKTOR 07 · PERSONAL','#2b6572'],shotgun:['12 / 70','PUMPGUN','#5b564b'],rifle:['5.56 mm','DIENSTGEWEHR','#495441'],
  medicalCase:['SANITÄT','ERSTE HILFE','#b33e39'],supplyCrate:['VORRÄTE','LEBENSMITTEL','#8a693e'],powerBattery:['NOTSTROM','12 V · 60 Ah','#236e80'],toolbox:['WERKZEUG','WARTUNG · SATZ 07','#a34e35'],module:['MODUL','ANSCHLUSS · 07','#507364'],cooler:['KÜHLTRANSPORT','W-07 · VERSIEGELT','#327d91'],
};

// One atlas and three shared material batches for all copies in the world.
// Geometry is baked once per item, including the small parts and label UVs.
function labelAtlas() {
  if(typeof document==='undefined') {
    const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.needsUpdate=true;return texture;
  }
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=ATLAS_ROWS*128;
  const ctx=canvas.getContext('2d')!;
  LOOT_VISUAL_KINDS.forEach((kind,i)=>{
    const x=i%4*256,y=Math.floor(i/4)*128,[title,subtitle,color]=labels[kind];
    ctx.fillStyle='#ebe7d8';ctx.fillRect(x,y,256,128);
    ctx.fillStyle=color;ctx.fillRect(x+5,y+5,246,38);ctx.fillStyle='#ffffff';
    ctx.font='bold 23px Arial';ctx.textAlign='center';ctx.fillText(title,x+128,y+32,238);
    ctx.fillStyle='#282e2c';ctx.font='bold 12px Arial';ctx.fillText(subtitle,x+128,y+65,238);
    ctx.textAlign='left';ctx.font='10px monospace';ctx.fillText('TANNWALD · VORRAT 07',x+12,y+83);
    for(let bar=0;bar<37;bar++){ctx.fillRect(x+12+bar*4,y+92,bar%3===0?3:1,22);}
    ctx.font='bold 20px Arial';ctx.fillText(kind==='medkit'||kind==='antibiotic'?'+':'07',x+202,y+111);
  });
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

export function createLootVisualLibrary() {
  const bodyMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.76});
  const metalMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.34,metalness:.65});
  const labelMaterial=new THREE.MeshStandardMaterial({map:labelAtlas(),roughness:.85,polygonOffset:true,polygonOffsetFactor:-1});
  const materials=[bodyMaterial,metalMaterial,labelMaterial],cache=new Map<LootVisualKind,THREE.Group>();
  const build=(kind:LootVisualKind)=>{
    const parts:THREE.BufferGeometry[][]=[[],[],[]];
    const add=(source:THREE.BufferGeometry,color:number,x:number,y:number,z:number,rx=0,ry=0,rz=0,batch=0)=>{
      const geometry=source.index?source.toNonIndexed():source.clone();source.dispose();
      geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));
      const count=geometry.getAttribute('position').count,c=new THREE.Color(color),colors=new Float32Array(count*3);
      for(let i=0;i<count;i++)c.toArray(colors,i*3);
      geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));parts[batch].push(geometry);
    };
    const box=(w:number,h:number,d:number,x:number,y:number,z:number,color:number,r=.012,rx=0,ry=0,rz=0,batch=0)=>add(new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/3,h/3,d/3)),color,x,y,z,rx,ry,rz,batch);
    const cylinder=(r:number,h:number,x:number,y:number,z:number,color:number,rx=0,rz=0,batch=0,top=r)=>add(new THREE.CylinderGeometry(top,r,h,16),color,x,y,z,rx,0,rz,batch);
    const torus=(r:number,tube:number,x:number,y:number,z:number,color:number,rx=0,ry=0,batch=0)=>add(new THREE.TorusGeometry(r,tube,6,24),color,x,y,z,rx,ry,0,batch);
    const label=(w:number,h:number,x:number,y:number,z:number,rx=0,ry=0)=>{
      const geometry=new THREE.PlaneGeometry(w,h),uv=geometry.getAttribute('uv'),i=LOOT_VISUAL_KINDS.indexOf(kind);
      for(let v=0;v<uv.count;v++)uv.setXY(v,(i%4+(uv.getX(v)*.96+.02))/4,1-(Math.floor(i/4)+(1-uv.getY(v))*.94+.03)/ATLAS_ROWS);
      add(geometry,0xffffff,x,y,z,rx,ry,0,2);
    };
    const cartridge=(x:number,z:number,rifle=false,shell=false)=>{
      const r=shell?.055:rifle?.034:.044,h=shell?.27:rifle?.27:.15;
      cylinder(r,h,x,h/2+.018,z,shell?0xb83e35:0xc4a45c,0,0,shell?0:1);
      cylinder(r+.006,.035,x,.025,z,0xb89a50,0,0,1);
      if(!shell)cylinder(r,.09,x,h+.05,z,0xb38350,0,0,1,rifle?.002:.018);
    };
    switch(kind){
      case 'medkit': {
        box(.34,.07,.26,.11,.043,0,0xe4ddc7,.02);label(.28,.21,.11,.081,0,-Math.PI/2);
        for(const [x,z] of [[-.17,-.02],[-.08,-.17]]){
          cylinder(.095,.15,x,.095,z,0xe6dfc8,Math.PI/2);
          cylinder(.034,.153,x,.095,z,0x827963,Math.PI/2);
          for(let r=0;r<3;r++)torus(.048+r*.018,.002,x,.095,z+.077,0xbab09a);
        }
        break;
      }
      case 'ration': {
        box(.28,.38,.095,-.11,.195,0,0xb9a77a,.035,0,0,-.13);label(.2,.23,-.11,.21,.064,0,0);
        box(.27,.026,.1,-.13,.39,0,0x847653,.008,0,0,-.13);
        cylinder(.105,.21,.15,.107,.045,0x929b8c,0,0,1);
        for(const y of [.012,.202])torus(.1,.008,.15,y,.045,0xc8cec4,Math.PI/2,0,1);
        torus(.028,.007,.15,.218,.045,0x848d85,Math.PI/2,0,1);label(.14,.1,.15,.12,.151);
        break;
      }
      case 'battery': {
        for(const [x,z] of [[-.08,-.025],[.075,.03]]){
          cylinder(.066,.28,x,.144,z,0x26383c);cylinder(.067,.07,x,.25,z,0xb1b8ac,0,0,1);
          cylinder(.025,.018,x,.298,z,0xc8cfc3,0,0,1);cylinder(.067,.018,x,.01,z,0xb1b8ac,0,0,1);
          label(.085,.12,x,.14,z+.068);
        }break;
      }
      case 'flare': {
        cylinder(.058,.51,0,.065,0,0xc24732,Math.PI/2);
        cylinder(.063,.09,0,.065,-.26,0x404944,Math.PI/2);
        cylinder(.06,.055,0,.065,.25,0xdab455,Math.PI/2);
        for(let i=0;i<4;i++)torus(.059,.004,0,.065,-.16+i*.025,0x6c6351);
        torus(.036,.006,0,.07,.31,0xa6aca2,0,0,1);
        label(.085,.25,0,.127,0,-Math.PI/2);break;
      }
      case 'water': {
        const profile=[[.055,0],[.105,.02],[.115,.07],[.108,.13],[.115,.17],[.108,.21],[.115,.25],[.108,.3],[.105,.35],[.065,.4],[.047,.43],[.047,.47]].map(([r,y])=>new THREE.Vector2(r,y));
        add(new THREE.LatheGeometry(profile,20),0x7aaeb8,0,0,0);
        cylinder(.053,.055,0,.482,0,0x326c8b);for(let i=0;i<3;i++)torus(.054,.003,0,.465+i*.015,0,0x8fb6c2,Math.PI/2);
        label(.15,.16,0,.255,.116);break;
      }
      case 'antibiotic': {
        cylinder(.1,.22,-.04,.115,0,0xded9c8);cylinder(.11,.045,-.04,.247,0,0xeeeeDC);
        for(let i=0;i<16;i++){const a=i*Math.PI/8;cylinder(.003,.032,-.04+Math.cos(a)*.108,.247,Math.sin(a)*.108,0xc5c1b5);}
        label(.16,.135,-.04,.132,.102);
        for(const z of [.06,-.04]){
          add(new THREE.CapsuleGeometry(.023,.055,3,8),0xe2dbca,.13,.025,z,Math.PI/2);
          cylinder(.024,.04,.13,.026,z+.018,0x9a5d66,Math.PI/2);
        }break;
      }
      case 'armor': {
        const outline=new THREE.Shape();outline.moveTo(-.26,-.31);outline.lineTo(.26,-.31);outline.lineTo(.29,.13);outline.lineTo(.19,.31);outline.lineTo(.09,.25);outline.quadraticCurveTo(0,.16,-.09,.25);outline.lineTo(-.19,.31);outline.lineTo(-.29,.13);outline.closePath();
        add(new THREE.ExtrudeGeometry(outline,{depth:.09,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.012,bevelThickness:.012,curveSegments:6}),0x606d50,0,.035,0,-Math.PI/2);
        for(const x of [-.19,.19])box(.09,.035,.16,x,.075,-.36,0x879071,.015);
        for(const z of [-.08,.02,.12])box(.48,.018,.027,0,.155,z,0x3f4a36,.004);
        for(const x of [-.16,0,.16])box(.125,.065,.15,x,.155,.21,0x74815d,.013);
        label(.22,.08,0,.15,-.16,-Math.PI/2);break;
      }
      case 'planks': {
        for(let i=0;i<3;i++){
          const y=.035+i*.065,z=(i%2)*.035;
          box(1.18-i*.06,.06,.135,0,y,z,0xae8656+i*0x090908,.007,0,i===1?.045:-.025);
          for(let grain=0;grain<3;grain++)box(.9,.002,.002,-.06,y+.031,z-.045+grain*.041,0x795b3c,.0005,0,i===1?.045:-.025);
        }
        for(const x of [-.35,.35])box(.055,.205,.19,x,.105,.01,0x777769,.007);
        label(.24,.11,.06,.207,.02,-Math.PI/2);break;
      }
      case 'scrap': {
        torus(.115,.033,-.11,.039,.005,0x87928c,Math.PI/2,0,1);
        for(let i=0;i<10;i++){const a=i*Math.PI/5;box(.06,.058,.045,-.11+Math.sin(a)*.145,.04,Math.cos(a)*.145,0x78837d,.004,0,a,0,1);}
        box(.065,.035,.32,.15,.028,.015,0x9fa99e,.007,0,-.28,0,1);
        torus(.064,.018,.105,.03,-.15,0x9fa99e,Math.PI/2,0,1);
        for(const z of [.07,.15]){cylinder(.018,.13,.28,.025,z,0x939b8d,0,Math.PI/2,1);cylinder(.032,.025,.22,.025,z,0xc2b699,0,Math.PI/2,1);}
        torus(.075,.009,.12,.026,.16,0x393e37,Math.PI/2);break;
      }
      case 'ammo':case 'shells':case 'rifleAmmo': {
        const rifle=kind==='rifleAmmo',shell=kind==='shells';
        box(.37,.09,.25,-.015,.048,0,shell?0x5c6346:rifle?0x66714e:0xb49a64,.014);
        box(.37,.018,.23,-.015,.12,-.2,shell?0x5c6346:rifle?0x66714e:0xb49a64,.006,-.65);
        label(.3,.16,-.015,.205,-.163,-.65);
        for(let row=0;row<2;row++)for(let col=0;col<3;col++)cartridge(-.13+col*.115,-.06+row*.12,rifle,shell);
        break;
      }
      case 'fuel': {
        box(.43,.56,.23,0,.29,0,0xb16d38,.045);box(.31,.065,.23,0,.59,0,0x9b5c31,.018);
        box(.045,.1,.045,-.13,.67,0,0x986039);box(.045,.1,.045,.09,.67,0,0x986039);box(.26,.04,.05,-.02,.73,0,0x986039);
        cylinder(.052,.05,.13,.63,0,0x353d36,0,0,1);
        for(const direction of [-1,1])box(.025,.35,.012,0,.3,.121,0x85532d,.003,0,0,direction*.75);
        label(.24,.17,0,.34,.13);break;
      }
      case 'serum': {
        cylinder(.073,.29,0,.17,0,0x70bdc9);cylinder(.08,.07,0,.35,0,0xd0d7c9,0,0,1);
        cylinder(.06,.016,0,.394,0,0x427786);label(.105,.16,0,.17,.075);
        torus(.075,.01,0,.033,0,0x879990,Math.PI/2,0,1);break;
      }
      case 'fuse': {
        cylinder(.055,.25,0,.06,0,0xe3ddc8,Math.PI/2);
        for(const z of [-.14,.14])cylinder(.058,.055,0,.06,z,0xb9a66c,Math.PI/2,0,1);
        label(.075,.16,0,.117,0,-Math.PI/2);break;
      }
      case 'keycard': {
        box(.25,.012,.16,0,.012,0,0xd8ded0,.012);box(.25,.002,.025,0,.02,-.047,0x303b38,.001);
        label(.23,.11,0,.022,.012,-Math.PI/2);torus(.018,.004,-.105,.023,.052,0x7b8b88,Math.PI/2,0,1);break;
      }
      case 'shotgun':case 'rifle': {
        const rifle=kind==='rifle',stock=rifle?0x505b45:0x8b6040;
        box(.13,.1,.36,0,.12,.35,stock,.025);box(.12,.12,.27,0,.15,.035,0x444e49,.013);
        cylinder(.026,.57,0,.19,-.35,0x6b7470,Math.PI/2,0,1);
        box(.13,.11,.22,0,.15,-.24,stock,.018);
        if(rifle){box(.07,.16,.14,0,.08,-.04,0x59624d,.008,0,0,-.18);box(.07,.12,.08,0,.08,.13,stock,.01);}
        torus(.046,.009,0,.07,.13,0x515a54,0,Math.PI/2,1);
        box(.015,.04,.025,0,.23,-.58,0x444d46,.003);break;
      }
      case 'medicalCase':case 'toolbox':case 'cooler': {
        const cool=kind==='cooler',medical=kind==='medicalCase',w=cool?.66:.55,h=cool?.4:.28,d=.34;
        box(w,h,d,0,h/2+.015,0,cool?0x4f8394:medical?0xd6d9c7:0x555f57,.035);
        box(w+.02,.065,d+.015,0,h+.035,0,medical?0xb34e45:cool?0xd9ded4:0x9a4b37,.018);
        for(const x of [-w*.32,w*.32]){
          box(.042,.105,.023,x,h,.18,0xb6b9a6,.004,0,0,0,1);
          box(.04,.05,.02,x,h-.03,.2,0x535e57,.003,0,0,0,1);
        }
        for(const x of [-.11,.11])box(.035,.09,.035,x,h+.09,0,0x3c4842,.006);
        box(.25,.035,.04,0,h+.14,0,0x3c4842,.008);
        for(const x of [-w*.42,w*.42])box(.04,h*.7,.02,x,h/2,.177,0x768c85,.004);
        label(.31,.16,0,h*.52,.18);
        if(medical){box(.22,.055,.009,0,h+.035,.18,0xf0ecdb,.003);box(.055,.055,.009,0,h+.035,.187,0xf0ecdb,.003);}
        break;
      }
      case 'powerBattery': {
        box(.44,.31,.25,0,.16,0,0x424d49,.02);box(.46,.045,.27,0,.335,0,0x2d3834,.012);
        for(const [x,color] of [[-.14,0xa95040],[.14,0x537994]]){cylinder(.033,.04,x,.378,0,0xb2b9ac,0,0,1);box(.09,.02,.08,x,.357,0,color,.005);}
        box(.032,.09,.035,-.09,.407,0,0x8c9584,.006);box(.032,.09,.035,.09,.407,0,0x8c9584,.006);box(.21,.025,.035,0,.46,0,0x8c9584,.005);
        label(.33,.2,0,.16,.128);break;
      }
      case 'supplyCrate': {
        box(.6,.035,.4,0,.025,0,0x9e8053,.006);
        for(const x of [-.28,.28])box(.035,.3,.4,x,.18,0,0xaf8f5e,.005);
        for(const z of [-.19,.19])for(const y of [.09,.23])box(.6,.09,.025,0,y,z,0xb39866,.005);
        for(const x of [-.22,0,.22]){
          cylinder(.069,.19,x,.14,0,0x83907b,0,0,1);torus(.066,.006,x,.24,0,0xc9cfc4,Math.PI/2,0,1);
          box(.13,.16,.12,x,.125,-.105,0xc1ac77,.014);
        }
        label(.3,.11,0,.23,.205);break;
      }
      case 'module': {
        box(.37,.025,.27,0,.02,0,0x3b7157,.005);
        for(const x of [-.12,0,.12]){
          box(.06,.045,.07,x,.055,.05,0x38423b,.003);
          cylinder(.025,.06,x,.06,-.075,0x9da89b,0,0,1);
          for(let i=0;i<3;i++)box(.008,.04,.09,x-.02+i*.02,.06,.05,0xb7baab,.002,0,0,0,1);
        }
        for(const x of [-.14,.14])box(.045,.04,.05,x,.05,.145,0xb5a16a,.004,0,0,0,1);
        label(.17,.07,0,.034,-.112,-Math.PI/2);break;
      }
    }
    const group=new THREE.Group();group.name=`loot-${kind}`;group.userData.lootKind=kind;
    parts.forEach((geometries,i)=>{
      if(!geometries.length)return;
      const geometry=mergeGeometries(geometries)!;geometries.forEach(g=>g.dispose());
      geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,materials[i]);mesh.receiveShadow=true;group.add(mesh);
    });
    // All models use the contact point as their origin, including laid-down gear.
    const bounds=new THREE.Box3().setFromObject(group);
    group.children.forEach(child=>{if(child instanceof THREE.Mesh)child.geometry.translate(0,-bounds.min.y,0);});
    return group;
  };
  return {
    create(kind:LootVisualKind){if(!cache.has(kind))cache.set(kind,build(kind));return cache.get(kind)!.clone();},
    dispose(){cache.forEach(group=>group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();}));materials.forEach(material=>material.dispose());labelMaterial.map?.dispose();},
  };
}
