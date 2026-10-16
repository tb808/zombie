import * as THREE from 'three';

/** Bone-bound additions use metres after character normalization. No new assets
 * or lights are needed; emissive marks remain readable in the dark. */
export function decorateNightHunter(model:THREE.Group) {
  model.traverse(object=>{
    if(object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
      object.material.color.set(0x61546f);
      object.material.roughness=.94;
    }
  });
  model.updateMatrixWorld(true);
  const boneGroup=(name:string)=>{
    const bone=model.getObjectByName(name);
    if(!bone)return undefined;
    const group=new THREE.Group();group.name=`night-hunter-${name}`;
    const scale=bone.getWorldScale(new THREE.Vector3());
    group.scale.set(1/scale.x,1/scale.y,1/scale.z);
    group.quaternion.copy(bone.getWorldQuaternion(new THREE.Quaternion()).invert());
    bone.add(group);return group;
  };
  const glow=new THREE.MeshStandardMaterial({color:0xffab52,emissive:0xff590c,emissiveIntensity:3,roughness:.55});
  const ivory=new THREE.MeshStandardMaterial({color:0xc6c1af,roughness:.85});
  const shell=new THREE.MeshStandardMaterial({color:0x302735,roughness:.95});
  const add=(parent:THREE.Group|undefined,geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);
    mesh.userData.ownedEnemyGeometry=true;mesh.castShadow=material!==glow;parent?.add(mesh);return mesh;
  };
  const head=boneGroup('Head'),chest=boneGroup('Chest');
  for(const side of [-1,1]) {
    const eye=add(head,new THREE.SphereGeometry(.055,8,6),glow,side*.105,.32,.235);
    eye.name='night-hunter-eye';eye.scale.set(1,.65,.65);
    for(let rib=0;rib<3;rib++) {
      const mark=add(chest,new THREE.BoxGeometry(.17,.035,.035),glow,side*.13,.12+rib*.09,.185);
      mark.name='night-hunter-rib';mark.rotation.z=side*-.22;
    }
    const arm=boneGroup(side===1?'LeftArm':'RightArm');
    const plate=add(arm,new THREE.SphereGeometry(.15,8,6),shell,side*.04,.03,0);
    plate.scale.set(1.25,1,.9);
    for(let spike=0;spike<3;spike++) {
      const thorn=add(arm,new THREE.ConeGeometry(.055,.3+spike*.035,5),ivory,side*(.05+spike*.065),.18,-.08+spike*.075);
      thorn.name='night-hunter-thorn';thorn.rotation.z=-side*(.25+spike*.2);
    }
    const hand=boneGroup(side===1?'LeftHand':'RightHand');
    for(let claw=0;claw<3;claw++) {
      const nail=add(hand,new THREE.ConeGeometry(.03,.3,5),ivory,side*.19,-.03,-.075+claw*.075);
      nail.name='night-hunter-claw';nail.rotation.z=-side*Math.PI/2;
    }
  }
}
