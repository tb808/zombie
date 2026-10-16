import assert from 'node:assert/strict';
import { CAMPAIGN, missionIndex } from '../app/campaign.ts';
import { newHouses, HOUSE_LOOT } from '../app/safehouses.ts';
import { freshArsenal, makeBrain, ZOMBIES } from '../app/survival.ts';
import { newInventory, LOOT } from '../app/world.ts';
import { CITY_LOOT } from '../app/city.ts';
import { REGION_LOOT } from '../app/regionPlan.ts';
import { parseSave, pickProgress, lootKey } from '../app/saveGame.ts';
import { newNarrative } from '../app/narrative.ts';
import { newInventoryLayout, moveInventoryItem } from '../app/inventory.ts';

const manifest={loot:[{key:lootKey('water',-60,-36,0),count:2}],doors:['lab','police'],gates:['lodge']};
const fresh=()=>({version:1,revision:2,savedAt:Date.now(),mission:'intro',phase:'playing',
  progress:{health:76.5,stamina:100,stage:0,kills:0,timer:40,battery:83,inventory:newInventory(),inventoryLayout:newInventoryLayout(newInventory(),freshArsenal()),boosted:0,repaired:false,thirst:72,infection:3,protection:0,powerQuest:0,benQuest:0,evidence:[],visited:[],discovered:[],keycard:false,elapsed:24,hasMap:false,weapon:'pistol',arsenal:freshArsenal(),houses:newHouses(),respawn:null,learned:[],talkedTo:['mara','ranger-guard'],activities:{},narrative:newNarrative()},
  player:{x:-53,z:-37,yaw:-1.45,pitch:-.06},noah:{x:17,z:15},
  loot:[{key:manifest.loot[0].key,remaining:0}],doors:[],gates:[],
  enemies:[{kind:'walker',health:ZOMBIES.walker.health/2,x:-24,z:-2,yaw:1,brain:makeBrain({x:-24,z:-2},.4)}],
  fighters:[],flares:[],noises:[],conversation:{speaker:'MARA',lines:['Erster Satz','Zweiter Satz'],index:1,complete:'intro'},flashlight:false,reloadLeft:.7,shotCooldown:0,invulnerable:0});
const parsed=save=>parseSave(JSON.stringify(save),manifest);
const original=fresh();assert.deepEqual(parsed(original),original,'Real timestamp, interrupted conversation and reload survive serialization');
const hunterSave=fresh();hunterSave.enemies[0].kind='nightHunter';hunterSave.enemies[0].health=ZOMBIES.nightHunter.health-85;
assert.deepEqual(parsed(hunterSave),hunterSave,'Night hunter type, health and brain survive serialization');
assert.deepEqual(pickProgress({...original.progress,active:true}),original.progress,'Transient runtime fields are not restored');
for(const mutate of [s=>s.version=2,s=>s.progress.health=-1,s=>s.progress.inventory.water=999,s=>s.player.x=1e9,s=>s.mission='serum',s=>s.loot[0].remaining=3,s=>s.loot=[],s=>s.doors=['unknown'],s=>s.progress.respawn='lodge',s=>s.enemies[0].brain.target.x='bad',s=>s.progress.talkedTo='mara',s=>s.progress.talkedTo=[7],s=>s.conversation.index=2,s=>s.reloadLeft=-.01]){
  const save=fresh();mutate(save);assert.equal(parsed(save),null,'Corrupt or incompatible saves cannot reach the game runtime');
}
assert.equal(parseSave('{broken',manifest),null);assert.equal(parseSave(null,manifest),null);
const shelter=fresh();shelter.progress.houses.lodge={windows:[true,true,true,true],reinforced:[true,true],closed:[false,true],bed:true,claimed:true};shelter.progress.respawn='lodge';shelter.gates=['lodge'];shelter.doors=['lab'];assert.deepEqual(parsed(shelter),shelter,'Construction, open doors and selected respawn survive');
const dead=fresh();dead.phase='dead';dead.progress.health=0;dead.conversation=null;assert(parsed(dead));
const won=fresh();won.phase='won';won.mission='defend';won.progress.stage=missionIndex('defend');won.progress.timer=0;won.conversation=null;assert(parsed(won));won.progress.timer=1;assert.equal(parsed(won),null);
assert(missionIndex('fuel')<missionIndex('returnFuel')&&missionIndex('returnFuel')<missionIndex('noah'));
assert(missionIndex('power')<missionIndex('keycard')&&missionIndex('keycard')<missionIndex('archive')&&missionIndex('archive')<missionIndex('serum'));
assert(CAMPAIGN.every((m,i)=>m.reason&&m.detail&&(!i||m.chapter>=CAMPAIGN[i-1].chapter)));
const currentLoot=[...LOOT,...CITY_LOOT,...HOUSE_LOOT,...REGION_LOOT];
const fullManifest={...manifest,loot:currentLoot.map((p,i)=>({key:lootKey(p.kind,p.x,p.z,i),count:p.count}))};
const oldStart=[{x:-60,z:-36},{x:-57,z:-39},{x:-50,z:-34}];
const oldLoot=[...LOOT.map((p,i)=>i<3?{...p,...oldStart[i]}:p),...CITY_LOOT,...HOUSE_LOOT.slice(0,16),...REGION_LOOT];
const legacy=fresh();delete legacy.revision;legacy.mission='archive';legacy.progress.stage=21;legacy.progress.houses=Object.fromEntries(Object.entries(legacy.progress.houses).slice(0,4));legacy.progress.respawn='lodge';legacy.progress.houses.lodge={windows:[true,true,true,true],closed:[true,true],reinforced:[true,true],bed:true,claimed:true};legacy.conversation=null;
legacy.loot=oldLoot.map((p,i)=>({key:lootKey(p.kind,p.x,p.z,i),remaining:i===0||p.kind==='ammo'?0:p.count}));
const migrated=parseSave(JSON.stringify(legacy),fullManifest);
assert(migrated,'The previous 26-step save remains playable');
assert.equal(migrated.progress.stage,missionIndex('archive'));assert.equal(migrated.loot[0].remaining,0,'Relocated starting medicine stays collected');
assert.equal(migrated.progress.respawn,'lodge');assert(!migrated.progress.houses.fichtenau.claimed,'New houses need real construction');
for(const pickup of oldLoot.filter(p=>p.kind==='ammo'))assert.equal(migrated.loot.find(l=>l.key.startsWith(`ammo:${pickup.x}:${pickup.z}:`)).remaining,0,'Reindexed ammunition stays spent');
console.log('PASS: save round-trip, interrupted dialogue/reload, inventory and loot validation, shelter/doors/respawn, death/victory and connected story order.');

const withoutContacts=fresh();delete withoutContacts.progress.talkedTo;withoutContacts.progress.hasMap=true;withoutContacts.progress.powerQuest=1;withoutContacts.progress.learned=['noah'];
assert.deepEqual(parsed(withoutContacts).progress.talkedTo,['mara','noah','lenz'],'Older saves recover known story contacts without rejecting progress');
console.log('PASS: conversation contacts persist and older saves recover evidenced contacts.');
const withoutActivities=fresh();delete withoutActivities.progress.activities;
assert.deepEqual(parsed(withoutActivities).progress.activities,{},'Existing 49-step saves acquire empty activity state');
const working=fresh();working.mission='radar';working.progress.stage=missionIndex('radar');working.progress.activities={radar:{step:1,started:true,timer:8.25,wave:1,actor:{x:-780,z:-850}}};working.enemies[0].encounter='radar:1';working.conversation=null;
assert.deepEqual(parsed(working),working,'Work timer, worker position and encounter survive reload');
const speaking=fresh();speaking.mission='seecamp';speaking.progress.stage=missionIndex('seecamp');speaking.progress.activities={seecamp:{step:0,started:false,timer:0,wave:0,actor:{x:-405,z:790}}};speaking.conversation={speaker:'EVA',lines:['Hilf mir.'],index:0,complete:null,activity:{mission:'seecamp',step:0}};
assert.deepEqual(parsed(speaking),speaking,'Deferred activity dialogue completion is saved');
for(const mutate of [s=>s.progress.activities.radar.timer=-1,s=>s.progress.activities.radar.step=99,s=>s.progress.activities.radar.actor.x=1e8,s=>s.enemies[0].encounter='unknown:1']){const bad=structuredClone(working);mutate(bad);assert.equal(parsed(bad),null);}
console.log('PASS: activity migration, deferred dialogue, work timers, escort positions and persistent encounter validation.');

const arranged=fresh();arranged.progress.inventoryLayout=moveInventoryItem(arranged.progress.inventoryLayout,{area:'hotbar',index:0},{area:'backpack',index:12});
assert.deepEqual(parsed(arranged),arranged,'Custom hotbar and backpack positions survive saving');
const beforeSlots=fresh();delete beforeSlots.progress.inventoryLayout;
const recovered=parsed(beforeSlots);assert(recovered);assert.deepEqual(recovered.progress.inventory,beforeSlots.progress.inventory);assert.deepEqual(recovered.progress.arsenal,beforeSlots.progress.arsenal);
assert.deepEqual(recovered.progress.inventoryLayout,newInventoryLayout(beforeSlots.progress.inventory,beforeSlots.progress.arsenal),'Old saves receive movable slots without changing possessions');
for(const mutate of [p=>p.inventoryLayout=null,p=>p.inventoryLayout.hotbar.push(null),p=>p.inventoryLayout.hotbar[1]='pistol',p=>p.inventoryLayout.hotbar[0]='unknown',p=>p.inventoryLayout.hotbar[0]='rifle',p=>p.inventoryLayout.hotbar[0]=null,p=>p.inventoryLayout.backpack=[]]){const bad=fresh();mutate(bad.progress);assert.equal(parsed(bad),null,'Invalid, missing or duplicated stacks are rejected');}
console.log('PASS: movable inventory save round-trip, legacy migration and slot validation.');

const undecided=fresh();undecided.mission='seecamp';undecided.progress.stage=missionIndex('seecamp');undecided.conversation=null;
undecided.progress.activities.seecamp={step:3,started:false,timer:0,wave:0,actor:{x:-405,z:790}};undecided.progress.narrative.pending='care';
assert.deepEqual(parsed(undecided),undecided,'Pending choice survives without selecting a default');
const mismatched=structuredClone(undecided);mismatched.progress.narrative.pending='dose';assert.equal(parsed(mismatched),null,'Choice must belong to the current mission');
const chosen=structuredClone(undecided);chosen.progress.narrative={version:1,choices:{care:'clinic',front:'wardens',pact:'truce'},revealed:['convoy','noah','war','orders'],pending:null};
chosen.fighters=[{id:'rest:3:1:union:ally:0',faction:'union',side:'ally',x:12,z:16,health:56,cooldown:.85,encounter:'rest:3',name:'Aydin'}];
assert.deepEqual(parsed(chosen),chosen,'Story decisions, revelations and damaged combatants survive together');
for(const change of [s=>s.progress.narrative.choices.front='unknown',s=>s.fighters[0].health=101,s=>s.fighters[0].side='unknown',s=>s.fighters.push({...s.fighters[0]})]){const bad=structuredClone(chosen);change(bad);assert.equal(parsed(bad),null);}
const beforeStory=fresh();delete beforeStory.progress.narrative;delete beforeStory.fighters;assert.deepEqual(parsed(beforeStory).progress.narrative,newNarrative());assert.deepEqual(parsed(beforeStory).fighters,[]);
console.log('PASS: pending decisions, branching consequences, faction combat saves, corrupt choice/fighter rejection and legacy story migration.');
