import * as THREE from 'three';

// Small story props use the same grounded, weathered shapes as the settlement
// vehicles. The bus explains Elias's arrival before the first conversation.
export function buildNarrativeScene(scene:THREE.Scene,height:(x:number,z:number)=>number){
  const vehicle=(bus:boolean)=>{
    const g=new THREE.Group(),paint=new THREE.MeshStandardMaterial({color:bus?0x8a947c:0xd0cbb7,roughness:.92}),glass=new THREE.MeshStandardMaterial({color:0x34484a,roughness:.6}),dark=new THREE.MeshStandardMaterial({color:0x292e2b,roughness:1});
    const box=(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);};
    const length=bus?7.4:5.2;
    box(2.45,2.2,length,0,1.65,0,paint);box(2.2,.8,.04,0,2.1,-length/2-.025,glass);
    for(const side of [-1,1]){for(let i=0;i<(bus?5:2);i++)box(.04,.75,.86,side*1.235,2.1,-length/2+1+i*1.16,glass);
      for(const z of [-length/2+1,length/2-1]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.24,12),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(side*1.22,.51,z);g.add(wheel);}}
    box(2.3,.16,.2,0,.65,-length/2-.1,dark);
    for(const side of [-1,1])box(.32,.25,.05,side*.8,1.2,-length/2-.04,new THREE.MeshStandardMaterial({color:0xd1cca6,emissive:0xd1cca6,emissiveIntensity:bus?0:.5}));
    return g;
  };
  const bus=vehicle(true);bus.name='Elias · abgestellter Evakuierungsbus';bus.position.set(-802,height(-802,497),497);scene.add(bus);
  const evacuation=vehicle(false);evacuation.name='Ralf · Evakuierungswagen';evacuation.position.set(66,height(66,-13),-13);evacuation.rotation.y=Math.PI;evacuation.visible=false;scene.add(evacuation);
  return {bus,evacuation,obstacle:{x:-802,z:497,hx:1.25,hz:3.75},update:(arrived:boolean)=>{evacuation.visible=arrived;}};
}
