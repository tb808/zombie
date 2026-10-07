import * as THREE from 'three';
import { detailedAsset, detailedCar, instancedTreeParts } from './naturalAssets.ts';
import { surfaceMaterial, type SurfaceKind } from './surfaces.ts';
import { terrainHeight } from './regionTerrain.ts';
import { PROP_DEFS, planSettlementDetail, type PropKind, type SettlementPlan } from './settlementPlan.ts';
import type { Obstacle, Point } from './survival.ts';

type Component = {geometry:THREE.BufferGeometry;material:THREE.Material;matrix:THREE.Matrix4;color:THREE.Color};
type Batch = {geometry:THREE.BufferGeometry;material:THREE.Material;matrices:THREE.Matrix4[];colors:THREE.Color[];cast:boolean};
type Cell = {group:THREE.Group;x:number;z:number;distance:number;batches:Map<string,Batch>};
type Load = (name:string)=>Promise<{scene:THREE.Object3D}>;
type Collision = {obstacles:Obstacle[];index:{add(o:Obstacle):void}};
const CHUNK=80;

// Every assembly is prepared once. Components of all assemblies share primitive
// geometries, PBR materials and per-instance colours inside nearby 80 m cells.
export function buildSettlementGeometry(scene:THREE.Scene,plan:SettlementPlan,models=new Map<string,THREE.Object3D>()){
  const root=new THREE.Group();root.name='settlement-dressing';scene.add(root);
  const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(.5,.5,1,10),sphere=new THREE.SphereGeometry(.5,10,7),cone=new THREE.ConeGeometry(.5,1,8),ring=new THREE.TorusGeometry(.5,.045,5,12);
  const materials=new Map<string,THREE.MeshStandardMaterial>();
  const material=(surface:SurfaceKind)=>{if(!materials.has(surface))materials.set(surface,surfaceMaterial(surface,0xffffff,{roughness:surface==='metal'?.72:.94,metalness:surface==='metal'?.4:0}));return materials.get(surface)!;};
  const glow=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffd69c,emissiveIntensity:0,roughness:.35});
  const labelGeometry=new Map<number,THREE.BufferGeometry>();let labelMaterial:THREE.Material|undefined;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');
    if(ctx){const labels=['RINGSTRASSE','QUERSTRASSE','LINDENWEG','STOP','UMLEITUNG','NAHKAUF','KAFFEE & KUCHEN','LETZTER BUS · 19:00','129.9','139.9','159.9','LINIE 4 · TANNWALD'];
      ctx.fillStyle='#415a4e';ctx.fillRect(0,0,1024,512);ctx.textAlign='center';ctx.textBaseline='middle';
      labels.forEach((label,i)=>{const x=i%4*256,y=Math.floor(i/4)*128;ctx.strokeStyle='#c8c8b0';ctx.lineWidth=4;ctx.strokeRect(x+6,y+6,244,116);ctx.fillStyle='#e1ddc3';ctx.font=`bold ${label.length>14?19:label.length>8?26:36}px sans-serif`;ctx.fillText(label,x+128,y+64,230);});
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;labelMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:.9});
    }
  }
  const object=new THREE.Object3D(),prototypes=new Map<string,Component[]>(),cells=new Map<string,Cell>(),lights:THREE.PointLight[]=[];
  let current:Component[]=[];
  const label=(index:number,x:number,y:number,z:number,w:number,h:number)=>{
    if(!labelMaterial)return;if(!labelGeometry.has(index)){const g=new THREE.PlaneGeometry(1,1),uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,(index%4+uv.getX(i))/4,1-(Math.floor(index/4)+1-uv.getY(i))/4);labelGeometry.set(index,g);}
    object.position.set(x,y,z);object.rotation.set(0,0,0);object.scale.set(w,h,1);object.updateMatrix();current.push({geometry:labelGeometry.get(index)!,material:labelMaterial,matrix:object.matrix.clone(),color:new THREE.Color(0xffffff)});
  };
  const part=(x:number,y:number,z:number,w:number,h:number,d:number,color:number,surface:SurfaceKind='metal',shape:THREE.BufferGeometry=cube,rx=0,ry=0,rz=0,mat:THREE.Material=material(surface))=>{
    object.position.set(x,y,z);object.rotation.set(rx,ry,rz);object.scale.set(w,h,d);object.updateMatrix();current.push({geometry:shape,material:mat,matrix:object.matrix.clone(),color:new THREE.Color(color)});
  };
  const bar=(a:number[],b:number[],radius=.035,color=0x53645d)=>{const from=new THREE.Vector3(...a as [number,number,number]),to=new THREE.Vector3(...b as [number,number,number]),delta=to.clone().sub(from);object.position.copy(from).add(to).multiplyScalar(.5);object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());object.scale.set(radius*2,delta.length(),radius*2);object.updateMatrix();current.push({geometry:cylinder,material:material('metal'),matrix:object.matrix.clone(),color:new THREE.Color(color)});};
  const wheel=(x:number,z:number,r=.34,width=.25,y=r)=>{part(x,y,z,r*2,width,r*2,0x303735,'fabric',cylinder,0,0,Math.PI/2);part(x*1.01,y,z,r*1.1,width*1.02,r*1.1,0x9b9e90,'metal',cylinder,0,0,Math.PI/2);};
  const imported=(name:string,height:number,color?:number,surface:SurfaceKind='metal',maxWidth=Infinity,maxDepth=Infinity)=>{
    const source=models.get(name);if(!source)return false;
    source.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),scale=height/size.y;
    const sx=Math.min(scale,maxWidth/size.x),sz=Math.min(scale,maxDepth/size.z);
    const normalize=new THREE.Matrix4().makeTranslation(-((bounds.min.x+bounds.max.x)/2)*sx,-bounds.min.y*scale,-((bounds.min.z+bounds.max.z)/2)*sz).multiply(new THREE.Matrix4().makeScale(sx,scale,sz));
    source.traverse(child=>{if(!(child instanceof THREE.Mesh))return;current.push({geometry:child.geometry,material:color===undefined?child.material as THREE.Material:material(surface),matrix:normalize.clone().multiply(child.matrixWorld),color:new THREE.Color(color??0xffffff)});});return true;
  };
  const reuse=(group:THREE.Group)=>{group.updateMatrixWorld(true);group.traverse(child=>{if(child instanceof THREE.Mesh)current.push({geometry:child.geometry,material:child.material as THREE.Material,matrix:child.matrixWorld.clone(),color:new THREE.Color(0xffffff)});});};
  const prototype=(kind:PropKind,variant:number)=>{
    const key=`${kind}-${variant}`;if(prototypes.has(key))return prototypes.get(key)!;current=[];
    const paint=[0x71867e,0x9a8971,0x877b75][variant%3],wood=0x9b8769,dark=0x52615b,cream=0xc9c4ae,red=0xb47157;
    switch(kind){
      case 'lamp':case 'villageLamp':{
        const height=kind==='lamp'?6.2:3.8;
        const def=PROP_DEFS[kind];if(kind==='lamp'||!imported('lightpost-single',height,0x738079,'metal',def.w,def.d)){part(0,height/2,0,.12,height,.12,dark,'metal',cylinder);part(kind==='lamp'?.24:0,height-.12,0,kind==='lamp'?1.15:.65,.12,.22,dark);part(0,.18,0,.22,.36,.22,dark,'metal',cylinder);}
        part(kind==='lamp'?.59:0,height-.2,0,.38,.13,.22,cream,'metal',cube,0,0,0,glow);break;
      }
      case 'brokenLamp':part(0,.1,0,.14,4,.14,dark,'metal',cylinder,Math.PI/2);part(0,.17,1.85,.48,.2,.5,dark);break;
      case 'bench':
        for(let i=0;i<5;i++){part(0,.47,-.28+i*.13,1.9,.07,.095,wood,'wood');part(0,.68+i*.11,.34,1.9,.085,.055,wood,'wood',cube,-.12);}
        for(const side of [-1,1]){part(side*.73,.23,0,.065,.46,.64,dark);part(side*.97,.72,.1,.055,.055,.6,dark);part(side*.97,.55,.32,.055,.35,.055,dark);}break;
      case 'bin':case 'tippedBin':{
        const tipped=kind==='tippedBin',rotation=tipped?Math.PI/2:0;
        part(0,tipped?.3:.45,0,.54,.9,.54,paint,'metal',cylinder,rotation);part(0,tipped?.32:.92,tipped?.48:0,.6,.055,.6,dark,'metal',cylinder,rotation);break;
      }
      case 'mailbox':part(0,.6,0,.07,1.2,.07,dark);part(0,1.12,0,.58,.38,.45,paint);part(0,1.2,.232,.35,.035,.02,0x303e38);break;
      case 'cabinet':part(0,.68,0,.9,1.35,.5,paint);for(let i=0;i<5;i++)part(0,.34+i*.075,.26,.58,.015,.025,dark);part(.29,.82,.26,.035,.15,.03,dark);break;
      case 'hydrant':part(0,.37,0,.23,.7,.23,red,'metal',cylinder);part(0,.77,0,.3,.15,.3,red,'metal',sphere);part(0,.47,0,.19,.48,.19,dark,'metal',cylinder,0,0,Math.PI/2);break;
      case 'bollard':part(0,.44,0,.16,.88,.16,dark,'metal',cylinder);part(0,.68,0,.19,.1,.19,cream,'metal',cylinder);break;
      case 'trafficLight':
        part(0,1.8,0,.1,3.6,.1,dark,'metal',cylinder);part(0,3.12,.12,.32,.86,.22,0x38443c);
        for(let i=0;i<3;i++)part(0,3.38-i*.26,.244,.16,.025,.16,[0x884d43,0x9c8b54,0x59796a][i],'metal',cylinder,Math.PI/2);break;
      case 'sign':case 'streetSign':case 'busStop':case 'priceSign':
        part(0,1.35,0,.075,2.7,.075,dark,'metal',cylinder);
        if(kind==='busStop'){part(0,2.42,0,.54,.055,.54,0xc9b469,'metal',cylinder,Math.PI/2);part(0,2.43,.04,.045,.29,.025,dark);part(.12,2.43,.04,.045,.29,.025,dark);part(.06,2.43,.04,.16,.035,.025,dark);label(11,0,1.7,.08,.58,.23);}
        else if(kind==='streetSign'){part(0,2.48,0,1.26,.24,.08,0x638174);label(variant%3,0,2.48,.048,1.2,.21);}
        else if(kind==='priceSign'){part(0,1.85,0,1.3,2,.16,paint);for(let i=0;i<3;i++){part(0,1.25+i*.38,.095,1,.23,.04,dark);label(8+i,0,1.25+i*.38,.122,.95,.23);}}
        else {if(!imported('signpost',2.7,wood,'wood',.8,.25))part(0,2.3,0,.82,.6,.1,cream);label(variant%2?3:4,0,2.3,.135,.8,.4);}break;
      case 'shelter':case 'cartShelter':
        for(const x of [-2,2])for(const z of [-.8,.8])part(x,1.15,z,.06,2.3,.06,dark);
        part(0,2.3,0,4.35,.14,1.85,paint);part(0,1.2,-.8,4.1,2,.04,0x7e9692);for(const x of [-2,2])part(x,1.2,0,.04,2,1.6,0x7e9692);
        if(kind==='shelter'){part(0,.47,-.35,3.5,.11,.5,wood,'wood');for(const x of [-1.5,1.5])part(x,.24,-.35,.05,.48,.5,dark);}break;
      case 'advert':part(0,1.25,0,1.9,2.3,.18,dark);part(0,1.3,.105,1.6,1.95,.03,variant%2?0xa4916f:0x8f9b83,'fabric');label(5+variant%3,0,1.55,.126,1.55,.8);part(0,.63,.126,.8,.04,.01,cream);break;
      case 'bikeRack':for(const x of [-.8,0,.8]){part(x,.36,0,.04,.7,.04,dark);part(x,.36,.55,.04,.7,.04,dark);part(x,.71,.27,.04,.04,.6,dark);}break;
      case 'bicycle':
        for(const z of [-.58,.61])part(0,.34,z,.62,.62,.62,0x303a34,'fabric',ring,0,Math.PI/2);
        for(const [a,b]of [[[0,.34,-.58],[0,.8,-.12]],[[0,.8,-.12],[0,.38,.02]],[[0,.38,.02],[0,.34,-.58]],[[0,.38,.02],[0,.8,.38]],[[0,.8,.38],[0,.8,-.12]],[[0,.8,.38],[0,.34,.61]]] as number[][][])bar(a,b,.028,paint);
        part(0,.87,-.12,.2,.08,.29,dark,'fabric');part(0,.97,.48,.52,.035,.04,dark);break;
      case 'luggage':part(0,.29,0,.48,.57,.33,paint,'fabric');part(0,.64,0,.17,.12,.04,dark);for(const x of [-.2,.2])wheel(x,0,.05,.06,.06);break;
      case 'bag':part(0,.2,0,.5,.4,.48,0x485c4a,'fabric',sphere);part(0,.41,0,.1,.1,.1,dark,'fabric',cone);break;
      case 'litter':part(0,.016,0,.32,.02,.27,cream,'fabric',cube,0,.4);part(.14,.018,.09,.18,.02,.2,wood,'fabric',cube,0,-.4);break;
      case 'pallet':
        for(const x of [-.48,0,.48])part(x,.12,0,.12,.22,1,wood,'wood');for(let i=0;i<5;i++)part(0,.26,-.44+i*.22,1.2,.075,.16,wood,'wood');break;
      case 'crate':reuse(detailedAsset('box',variant)!);break;
      case 'barrel':reuse(detailedAsset('barrel',variant)!);break;
      case 'dumpster':part(0,.62,0,2,1.1,1.2,paint);part(0,1.23,0,2.12,.14,1.3,dark);for(const x of [-.7,.7])for(const z of [-.42,.42])wheel(x,z,.11,.12,.13);part(0,.8,.61,.6,.27,.025,cream);break;
      case 'cone':part(0,.06,0,.42,.12,.42,dark);part(0,.4,0,.35,.65,.35,0xb98753,'metal',cone);part(0,.42,0,.2,.1,.2,cream,'metal',cylinder);break;
      case 'barrier':
        for(const x of [-1,1])part(x,.5,0,.09,1,.5,dark);part(0,.87,0,2.5,.4,.1,cream);for(let i=-2;i<=2;i++)part(i*.46,.87,.063,.17,.42,.025,red,'metal',cube,0,0,-.4);break;
      case 'container':part(0,1.3,0,6,2.6,2.35,paint);for(let x=-2.9;x<3;x+=.35)for(const side of [-1,1])part(x,1.3,side*1.2,.06,2.5,.06,dark);for(const x of [-2.95,2.95])part(x,1.3,0,.1,2.5,2.45,dark);break;
      case 'cableReel':part(0,.67,0,1.2,1,1.2,dark,'metal',cylinder,Math.PI/2);for(const z of [-.53,.53])part(0,.67,z,1.35,.12,1.35,wood,'wood',cylinder,Math.PI/2);break;
      case 'pipes':for(let i=0;i<5;i++)part((i%3-1)*.42,.25+Math.floor(i/3)*.38,0,.36,3.3,.36,paint,'metal',cylinder,Math.PI/2);break;
      case 'forklift':
        part(0,.45,0,1.35,.6,1.8,0xb19b58);part(0,.8,-.65,1.2,.9,.5,paint);for(const x of [-.65,.65])for(const z of [-.6,.6])wheel(x,z,.24,.22);
        for(const x of [-.53,.53])part(x,1.6,0,.07,2,.07,dark);part(0,2.6,0,1.3,.12,1.4,dark);for(const x of [-.42,.42]){part(x,1.2,1,.08,2.3,.12,dark);part(x,.13,1.55,.12,.09,1.05,dark);}break;
      case 'tractor':
        part(0,.75,.4,1.6,.9,2.5,paint);part(0,1.7,-.6,1.3,1.4,1.45,0x71857a);part(0,2.42,-.6,1.55,.12,1.6,cream);part(0,1.95,.13,1.15,.65,.04,0x9cafa6);
        for(const side of [-1,1]){wheel(side*.89,-1.05,.72,.44);wheel(side*.69,1.27,.38,.28);part(side*.73,1.28,-1.05,.5,.16,1.6,paint);}part(.38,1.95,.8,.12,1.8,.12,dark,'metal',cylinder);break;
      case 'trailer':
        part(0,.76,-.25,2.2,.25,3.4,dark);for(const x of [-1.05,1.05]){part(x,1.16,-.25,.12,.75,3.4,wood,'wood');wheel(x,-.3,.36,.24);}part(0,1.16,-1.9,2.2,.75,.12,wood,'wood');part(0,.58,1.85,.15,.15,.55,dark);break;
      case 'car':case 'policeCar':case 'wreck':
        reuse(detailedCar(variant));
        if(kind==='policeCar'){part(0,1.55,-.3,1,.16,.3,dark);for(const side of [-1,1]){part(side*.36,1.7,-.3,.25,.15,.28,0x64869e);part(side*1.017,.72,0,.025,.22,3.6,0x647f98);}}
        if(kind==='wreck'){part(1.24,.82,.6,.06,.7,1.1,paint,'metal',cube,0,-.5);part(0,1.14,1,.9,.3,.06,0x4e5147);part(.65,.35,2.3,.4,.3,.4,0x716952,'metal',sphere);}break;
      case 'van':case 'ambulance':case 'truck':case 'fireTruck':case 'bus':{
        const length=kind==='bus'?8.6:kind==='truck'?7.6:kind==='fireTruck'?6.7:5.1,col=kind==='ambulance'?0xb7b9a9:kind==='fireTruck'?red:paint;
        part(0,.8,0,2.2,.85,length,col);part(0,1.7,kind==='truck'||kind==='fireTruck'?length*.3:0,2,1.4,kind==='truck'||kind==='fireTruck'?2.1:length-.4,col);
        part(0,1.83,length/2-.15,1.8,.65,.06,0x819a96);for(const side of [-1,1]){for(const z of [-length*.32,length*.32])wheel(side*1.03,z,.4,.24);part(side*1.025,1.84,length/2-1,.04,.65,1,0x819a96);}
        part(0,.56,length/2+.05,2.2,.12,.13,dark);for(const x of [-.8,.8])part(x,.95,length/2+.06,.38,.2,.035,cream);
        if(kind==='bus')for(const side of [-1,1])for(let z=-3.3;z<3.2;z+=1.1)part(side*1.025,1.83,z,.04,.72,.9,0x819a96);
        if(kind==='truck'){part(0,1.48,-1.1,2.3,1.7,4.5,wood,'wood');part(0,2.4,-1.1,2.4,.12,4.6,paint);}
        if(kind==='fireTruck'){part(0,1.55,-1.1,2.3,1.5,3.7,red);for(let i=0;i<9;i++)part(0,2.55,-2.7+i*.5,1.3,.07,.08,cream);for(const x of [-.68,.68])part(x,2.55,-.7,.07,.07,4.5,cream);}
        if(kind==='ambulance'||kind==='fireTruck'){part(0,2.48,1.6,1.2,.14,.28,dark);for(const x of [-.43,.43])part(x,2.58,1.6,.3,.15,.25,0x64869e);}
        if(kind==='ambulance')for(const side of [-1,1]){part(side*1.025,1.6,-.6,.035,.18,1,red);part(side*1.025,1.6,-.6,.035,.7,.18,red);}break;
      }
      case 'table':part(0,.74,0,1.08,.08,1.08,wood,'wood',cylinder);part(0,.36,0,.065,.72,.065,dark);part(0,.08,0,.7,.08,.7,dark);break;
      case 'chair':case 'fallenChair':{
        const fallen=kind==='fallenChair',start=current.length;part(0,.45,0,.5,.08,.5,wood,'wood');part(0,.76,-.23,.5,.6,.06,wood,'wood');for(const x of [-.22,.22])for(const z of [-.22,.22])part(x,.22,z,.04,.44,.04,dark);
        if(fallen){const m=new THREE.Matrix4().makeTranslation(0,.3,-.5).multiply(new THREE.Matrix4().makeRotationX(Math.PI/2));for(let i=start;i<current.length;i++)current[i].matrix.premultiply(m);}break;
      }
      case 'umbrella':part(0,1.15,0,.055,2.3,.055,dark);part(0,2.25,0,2.3,.35,2.3,paint,'fabric',cone);part(0,.04,0,.6,.08,.6,dark);break;
      case 'cart':
        part(0,.47,0,.61,.06,1.08,dark);for(const side of [-1,1]){part(side*.3,.8,0,.035,.65,1.05,dark);for(let z=-.45;z<.6;z+=.17)part(side*.3,.8,z,.025,.6,.025,cream);}
        for(const z of [-.5,.5]){part(0,.8,z,.6,.6,.025,dark);for(const x of [-.23,.23])wheel(x,z,.07,.07,.08);}part(0,1.15,-.65,.7,.06,.055,red);break;
      case 'hedge':part(0,.62,0,2.7,1.2,.75,0x6d805a,'bark',sphere);for(const x of [-.8,0,.8])part(x,.8,.06,1.1,1.15,.8,0x73845e,'bark',sphere);break;
      case 'planter':
        if(!imported('suburban-planter',.63,wood,'wood',1.1,.55))part(0,.29,0,1.1,.58,.55,wood,'wood');for(const x of [-.32,0,.32])part(x,.7,0,.35,.5,.34,0x76855f,'bark',sphere);for(const x of [-.25,.25])part(x,.86,.13,.12,.1,.12,0xab8c71,'fabric',sphere);break;
      case 'smallTree':
        {const name=`prepared-tree-${variant}`;if(!models.has(name)){const tree=instancedTreeParts(false,variant),group=new THREE.Group();group.add(new THREE.Mesh(tree.trunk[2],tree.bark),new THREE.Mesh(tree.foliage[2],tree.leaves));models.set(name,group);}imported(name,3.5,undefined,'bark',2,2);break;}
      case 'weeds':for(let i=0;i<5;i++)part(Math.sin(i)*.1,.17,Math.cos(i)*.1,.025,.3+variant*.08,.07,0x7d8c60,'bark',cube,0,i,.2);break;
      case 'shed':part(0,1.1,0,3,2.2,2.7,wood,'wood');part(0,2.25,0,3.2,.15,3,paint);part(0,1,1.37,1.3,2,.04,dark);for(let x=-1.4;x<1.5;x+=.23)part(x,1.1,1.37,.025,2.1,.025,0x746a55,'wood');break;
      case 'logs':for(let i=0;i<8;i++)part((i%3-1)*.7,.35+Math.floor(i/3)*.55,0,.58,2.8,.58,wood,'bark',cylinder,Math.PI/2);break;
      case 'well':part(0,.45,0,1.7,.9,1.7,0x9b9c87,'stone',cylinder);part(0,.92,0,1.3,.03,1.3,0x3b5555,'metal',cylinder);for(const x of [-.7,.7])part(x,1.4,0,.12,2.1,.12,wood,'wood');part(0,2.45,0,1.85,.15,1.9,wood,'wood');part(0,1.65,0,.08,.5,.08,dark);break;
      case 'swing':for(const x of [-1.5,1.5])for(const z of [-1,1])bar([x,0,z],[x,2.7,0],.07,0x788273);bar([-1.5,2.7,0],[1.5,2.7,0],.08);for(const x of [-.55,.55]){for(const side of [-1,1])bar([x+side*.2,2.7,0],[x+side*.2,.5,0],.012);part(x,.5,0,.5,.07,.32,wood,'wood');}break;
      case 'slide':part(0,.9,0,1,.1,3,0x98a397,'metal',cube,.52);for(const z of [-1.2,1.2])part(0,.52,z,.8,1,.1,dark);for(let i=0;i<5;i++)part(0,.2+i*.3,-1.35,.8,.06,.07,dark);break;
    }
    if(kind==='bikeRack'||kind==='forklift'){const m=new THREE.Matrix4().makeTranslation(0,0,kind==='bikeRack'?-.27:-.5);current.forEach(c=>c.matrix.premultiply(m));}
    prototypes.set(key,current);return current;
  };
  const add=(component:Component,matrix:THREE.Matrix4,x:number,z:number,distance:number,cast=false)=>{
    const ix=Math.floor(x/CHUNK),iz=Math.floor(z/CHUNK),tier=distance<=80?'small':distance<=155?'furniture':'street',key=`${ix},${iz},${tier}`;
    if(!cells.has(key)){const group=new THREE.Group();group.name=`dressing-${key}`;root.add(group);cells.set(key,{group,x:ix*CHUNK+CHUNK/2,z:iz*CHUNK+CHUNK/2,distance:tier==='small'?75:tier==='furniture'?145:220,batches:new Map()});}
    const cell=cells.get(key)!,batchKey=`${component.geometry.uuid}-${component.material.uuid}-${cast}`;
    if(!cell.batches.has(batchKey))cell.batches.set(batchKey,{geometry:component.geometry,material:component.material,matrices:[],colors:[],cast});
    const batch=cell.batches.get(batchKey)!;batch.matrices.push(matrix.clone().multiply(component.matrix));batch.colors.push(component.color);
  };
  for(const p of plan.props){object.position.set(p.x,p.y+.025,p.z);object.rotation.set(0,p.rotation,0);object.scale.setScalar(1);object.updateMatrix();const matrix=object.matrix.clone();
    for(const component of prototype(p.kind,p.variant))add(component,matrix,p.x,p.z,p.distance,['car','wreck','tractor','truck','van','bus','ambulance','fireTruck','policeCar','shed','container'].includes(p.kind));
    if(p.kind==='lamp'||p.kind==='villageLamp'){const light=new THREE.PointLight(0xffd69c,0,22,2);light.position.set(p.x,p.y+(p.kind==='lamp'?5.8:3.5),p.z);lights.push(light);}
  }
  // Everyday scenes have a paved forecourt; cars sit in asphalt parking bays.
  // Small tiles conform to the existing terrain rather than flattening the map.
  for(const s of plan.surfaces){const nx=Math.ceil(s.width/1.5),nz=Math.ceil(s.depth/1.5),w=s.width/nx,d=s.depth/nz;
    for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const x=s.x-s.width/2+(ix+.5)*w,z=s.z-s.depth/2+(iz+.5)*d;object.position.set(x,terrainHeight(x,z)+.014,z);object.rotation.set(0,0,0);object.scale.set(w+.006,.025,d+.006);object.updateMatrix();add({geometry:cube,material:material(s.kind==='asphalt'?'asphalt':'concrete'),matrix:new THREE.Matrix4(),color:new THREE.Color(s.kind==='asphalt'?0x7c837b:0xafa995)},object.matrix,x,z,150);}
  }
  // Surface strips sample height along their entire length. Curbs and pavement
  // are visual dressing, so neither introduces a hidden navigation wall.
  for(const line of plan.lines){const length=Math.hypot(line.b.x-line.a.x,line.b.z-line.a.z),steps=Math.ceil(length/2),angle=Math.atan2(line.b.x-line.a.x,line.b.z-line.a.z);
    for(let i=0;i<steps;i++){const t=(i+.5)/steps,x=line.a.x+(line.b.x-line.a.x)*t,z=line.a.z+(line.b.z-line.a.z)*t,curb=line.kind==='curb',walk=line.kind==='walk';
      object.position.set(x,terrainHeight(x,z)+(curb?.09:walk?.025:.082),z);object.rotation.set(0,angle,0);object.scale.set(line.width,curb?.16:walk?.035:.012,length/steps+.008);object.updateMatrix();
      add({geometry:cube,material:material('concrete'),matrix:new THREE.Matrix4(),color:new THREE.Color(curb||walk?0xaeb1a0:0xd2cdb4)},object.matrix,x,z,curb?155:130);
    }
  }
  let instances=0,meshes=0;
  for(const cell of cells.values())for(const batch of cell.batches.values()){
    const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);batch.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,batch.colors[i]);});mesh.computeBoundingSphere();mesh.castShadow=batch.cast;mesh.receiveShadow=true;cell.group.add(mesh);instances+=mesh.count;meshes++;
  }
  let activeCells=0;
  const bounds:Record<string,{min:number[];max:number[]}>={};
  for(const [key,components]of prototypes){const box=new THREE.Box3();for(const part of components){if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox!.clone().applyMatrix4(part.matrix));}bounds[key]={min:box.min.toArray(),max:box.max.toArray()};}
  const update=(x:number,z:number)=>{activeCells=0;for(const cell of cells.values()){cell.group.visible=Math.hypot(cell.x-x,cell.z-z)<cell.distance+CHUNK*.72;if(cell.group.visible)activeCells++;}};
  update(-61,-35);
  return {root,plan,bounds,update,stats:()=>({props:plan.props.length,scenes:plan.scenes.length,cells:cells.size,activeCells,instances,meshes,lamps:lights.length}),
    lighting:(night:number,powered:boolean,camera:THREE.Vector3)=>{glow.emissiveIntensity=powered?night*.65:0;const near:THREE.PointLight[]=[];for(const light of lights){if(light.position.distanceToSquared(camera)<900){light.intensity=powered?night*19:0;near.push(light);}}return near;},
  };
}

export async function buildSettlementDetail(scene:THREE.Scene,footprints:readonly Obstacle[],reserved:readonly Point[],collision:Collision,load:Load,disposed:()=>boolean){
  const names=['lightpost-single','suburban-planter','signpost'],models=new Map<string,THREE.Object3D>();
  await Promise.all(names.map(async name=>{try{models.set(name,(await load(name)).scene);}catch{/* Procedural style-compatible fallback is prepared below. */}}));
  if(disposed())return undefined;
  const plan=planSettlementDetail(footprints,reserved),detail=buildSettlementGeometry(scene,plan,models);
  for(const p of plan.props){
    if(PROP_DEFS[p.kind].solid){const o=p.kind==='lamp'||p.kind==='villageLamp'||p.kind==='smallTree'?{x:p.x,z:p.z,hx:.15,hz:.15}: {x:p.x,z:p.z,hx:p.hx,hz:p.hz};collision.obstacles.push(o);collision.index.add(o);}
  }
  return detail;
}
