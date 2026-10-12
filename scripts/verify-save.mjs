import assert from 'node:assert/strict';
import { CAMPAIGN, missionIndex } from '../app/campaign.ts';
import { newHouses, HOUSE_LOOT } from '../app/safehouses.ts';
import { freshArsenal, makeBrain, ZOMBIES } from '../app/survival.ts';
import { newInventory, LOOT } from '../app/world.ts';
import { CITY_LOOT } from '../app/city.ts';
import { REGION_LOOT } from '../app/regionPlan.ts';
import { parseSave, pickProgress, lootKey } from '../app/saveGame.ts';

const manifest={loot:[{key:lootKey('water',-60,-36,0),count:2}],doors:['lab','police'],gates:['lodge']};
const fresh=()=>({version:1,revision:2,savedAt:Date.now(),mission:'intro',phase:'playing',
  progress:{health:76.5,stamina:100,stage:0,kills:0,timer:40,battery:83,inventory:newInventory(),boosted:0,repaired:false,thirst:72,infection:3,protection:0,powerQuest:0,benQuest:0,evidence:[],visited:[],discovered:[],keycard:false,elapsed:24,hasMap:false,weapon:'pistol',arsenal:freshArsenal(),houses:newHouses(),respawn:null,learned:[],talkedTo:['mara','ranger-guard']},
  player:{x:-53,z:-37,yaw:-1.45,pitch:-.06},noah:{x:17,z:15},
  loot:[{key:manifest.loot[0].key,remaining:0}],doors:[],gates:[],
  enemies:[{kind:'walker',health:ZOMBIES.walker.health/2,x:-24,z:-2,yaw:1,brain:makeBrain({x:-24,z:-2},.4)}],
  flares:[],noises:[],conversation:{speaker:'MARA',lines:['Erster Satz','Zweiter Satz'],index:1,complete:'intro'},flashlight:false,reloadLeft:.7,shotCooldown:0,invulnerable:0});
const parsed=save=>parseSave(JSON.stringify(save),manifest);
const original=fresh();assert.deepEqual(parsed(original),original,'Real timestamp, interrupted conversation and reload survive serialization');
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
