import assert from 'node:assert/strict';
import { Box3, Mesh, Vector3 } from 'three';
import { createLootVisualLibrary, LOOT_VISUAL_KINDS } from '../app/lootVisuals.ts';
import { LOOT } from '../app/world.ts';
import { CITY_LOOT } from '../app/city.ts';
import { HOUSE_LOOT } from '../app/safehouses.ts';
import { REGION_LOOT } from '../app/regionPlan.ts';

const library=createLootVisualLibrary(),materials=new Set(),geometries=new Set();
const stats=[];
for(const kind of new Set([...LOOT,...CITY_LOOT,...HOUSE_LOOT,...REGION_LOOT].map(p=>p.kind).concat(LOOT_VISUAL_KINDS))){
  const model=library.create(kind),copy=library.create(kind),bounds=new Box3().setFromObject(model),size=bounds.getSize(new Vector3());
  assert(Math.abs(bounds.min.y)<1e-6&&size.y>.01&&size.y<1&&size.x<1.6&&size.z<1.6,`${kind}: real item dimensions and ground contact`);
  assert(model.children.length<=3,`${kind}: material batch limit`);
  let triangles=0;
  model.children.forEach((mesh,i)=>{
    assert(mesh instanceof Mesh&&mesh.geometry===copy.children[i].geometry&&mesh.material===copy.children[i].material,`${kind}: repeated items share GPU resources`);
    materials.add(mesh.material);geometries.add(mesh.geometry);
    for(const name of ['position','normal','uv','color']){
      const attribute=mesh.geometry.getAttribute(name);assert(attribute,`${kind}: ${name}`);
      assert([...attribute.array].every(Number.isFinite),`${kind}: finite ${name}`);
    }
    triangles+=mesh.geometry.getAttribute('position').count/3;
  });
  assert(triangles>80&&triangles<6000,`${kind}: bounded detailed geometry (${triangles})`);
  copy.position.x=10;assert.equal(model.position.x,0,'Copies have independent placement');
  stats.push({kind,triangles,batches:model.children.length});
}
assert.equal(materials.size,3,'All world items share three materials and one label atlas');
let released=0;geometries.forEach(g=>g.addEventListener('dispose',()=>released++));library.dispose();
assert.equal(released,geometries.size,'Cleanup also releases prototypes hidden outside the current view');
console.log('PASS: every loot/quest kind has finite grounded geometry, shared copies, three material batches and bounded triangles.');
console.table(stats);
