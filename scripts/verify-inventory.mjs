import assert from 'node:assert/strict';
import { newInventory, ITEMS } from '../app/world.ts';
import { freshArsenal } from '../app/survival.ts';
import { HOTBAR_SIZE, BACKPACK_SIZE, moveInventoryItem, newInventoryLayout, syncInventoryLayout, validInventoryLayout } from '../app/inventory.ts';

const inventory=newInventory(),arsenal=freshArsenal();
const initial=newInventoryLayout(inventory,arsenal),original=structuredClone(initial);
assert.equal(initial.hotbar.length,HOTBAR_SIZE);assert.equal(initial.backpack.length,BACKPACK_SIZE);
assert(validInventoryLayout(initial,inventory,arsenal));
const from={area:'hotbar',index:0},to={area:'backpack',index:12};
const stowed=moveInventoryItem(initial,from,to);
assert.equal(stowed.hotbar[0],null);assert.equal(stowed.backpack[12],'pistol');assert.deepEqual(initial,original,'Moves do not mutate prior state');
const assigned=moveInventoryItem(stowed,{area:'backpack',index:12},{area:'hotbar',index:3});
assert.equal(assigned.hotbar[3],'pistol');assert.equal(assigned.backpack[12],'water','Occupied slots exchange possessions');
assert(validInventoryLayout(assigned,inventory,arsenal));
const sorted=moveInventoryItem(assigned,{area:'backpack',index:12},{area:'backpack',index:19});
assert.equal(sorted.backpack[19],'water');assert.equal(sorted.backpack[12],null);
const reordered=moveInventoryItem(sorted,{area:'hotbar',index:1},{area:'hotbar',index:4});
assert.equal(reordered.hotbar[4],'axe');assert.equal(reordered.hotbar[1],'flare');
for(const invalid of [{area:'hotbar',index:5},{area:'backpack',index:-1},{area:'unknown',index:0},{area:'backpack',index:.5}]){
  assert.deepEqual(moveInventoryItem(initial,from,invalid),initial);assert.deepEqual(moveInventoryItem(initial,invalid,to),initial);
}
assert.deepEqual(moveInventoryItem(initial,{area:'backpack',index:19},from),initial,'An empty source cannot delete an item');
const spent={...inventory,medkit:0},depleted=syncInventoryLayout(reordered,spent,arsenal);
assert(![...depleted.hotbar,...depleted.backpack].includes('medkit'));
const restocked=syncInventoryLayout(depleted,{...spent,medkit:2,scrap:3},{...arsenal,rifle:{...arsenal.rifle,owned:true}});
assert.deepEqual(restocked.hotbar,depleted.hotbar,'Pickups preserve all hotbar assignments and empty slots');
assert(restocked.backpack.includes('medkit')&&restocked.backpack.includes('scrap')&&restocked.backpack.includes('rifle'));
assert.equal(restocked.backpack[19],'water','Picking up items preserves custom backpack positions');
const allInventory=Object.fromEntries(Object.entries(ITEMS).map(([kind,item])=>[kind,item.limit]));
const allArsenal=Object.fromEntries(Object.entries(arsenal).map(([kind,weapon])=>[kind,{...weapon,owned:true}]));
const all=newInventoryLayout(allInventory,allArsenal);
assert(validInventoryLayout(all,allInventory,allArsenal),'Every weapon and supply stack fits');
assert.equal([...all.hotbar,...all.backpack].filter(Boolean).length,Object.keys(ITEMS).length+Object.keys(arsenal).length);
console.log('PASS: five flexible hotbar slots, backpack moves, occupied swaps, immutable state, invalid moves, depletion, pickup placement and complete equipment capacity.');
