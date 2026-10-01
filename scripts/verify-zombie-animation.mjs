import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AnimationMixer,Box3,Vector3} from 'three';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {ZombieAnimator} from '../app/zombieAnimation.ts';
import {makeBrain,transition} from '../app/survival.ts';
const read=name=>{const b=readFileSync(`public/models/kenney/characters/${name}.fbx`);return new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const base=read('characterMedium'),idle=read('animations/idle').animations.find(c=>c.name.endsWith('|Idle')),run=read('animations/run').animations.find(c=>c.name.endsWith('|Run'));
for(const kind of ['walker','crawler','tank','runner','infected']){
 const model=clone(base);const size=new Box3().setFromObject(model).getSize(new Vector3());model.scale.setScalar(1.82/size.y);model.updateMatrixWorld(true);model.position.y-=new Box3().setFromObject(model).min.y;
 const mixer=new AnimationMixer(model),actions={idle:mixer.clipAction(idle.clone()),run:mixer.clipAction(run.clone())};const animator=new ZombieAnimator(model,mixer,actions,kind,2.4),brain=makeBrain({x:0,z:0},0);
 for(let i=0;i<120;i++)animator.update(1/60,brain,0,i/60);
 model.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});const bounds=new Box3().setFromObject(model);
 assert(bounds.min.y>-.5,`${kind} below ground: ${bounds.min.y}`);assert(bounds.max.y<2.5,`${kind} invalid height`);
 if(kind==='crawler')assert(bounds.max.y<1.4,'Crawler stays near ground');
 const arm=model.getObjectByName('RightArm').quaternion.clone();transition(brain,'attack',.35);animator.update(.1,brain,0,3);assert(arm.angleTo(model.getObjectByName('RightArm').quaternion)>.1,'Attack changes joints');
 transition(brain,'dead');for(let i=0;i<100;i++)animator.update(.02,brain,0,4+i*.02);model.updateMatrixWorld(true);assert(Math.abs(model.rotation.x)>1||Math.abs(model.rotation.z)>1,'Death reaches a lying pose');
 console.log(`${kind}: ground bounds ${bounds.min.y.toFixed(2)}..${bounds.max.y.toFixed(2)}, attack and death joints verified`);
}
