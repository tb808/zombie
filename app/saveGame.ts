import { CAMPAIGN, type CampaignId } from './campaign.ts';
import { SAFEHOUSES, type HouseState } from './safehouses.ts';
import { WORLD, WEAPONS, ZOMBIES, type WeaponKind, type ZombieKind, type Brain, type Stimulus } from './survival.ts';
import { ITEMS, type Inventory } from './world.ts';

export const SAVE_KEY = 'nachtwache.save.v1';
export type PlayerProgress = {
  health:number;stamina:number;stage:number;kills:number;timer:number;battery:number;inventory:Inventory;
  boosted:number;repaired:boolean;thirst:number;infection:number;protection:number;powerQuest:number;benQuest:number;
  evidence:string[];visited:string[];discovered:number[];keycard:boolean;elapsed:number;hasMap:boolean;
  weapon:WeaponKind;arsenal:Record<WeaponKind,{owned:boolean;ammo:number;reserve:number}>;
  houses:Record<string,HouseState>;respawn:string|null;learned:string[];
};
export type SavedConversation = {speaker:string;lines:string[];index:number;complete:CampaignId|null};
export const PROGRESS_KEYS = ['health','stamina','stage','kills','timer','battery','inventory','boosted','repaired','thirst','infection','protection','powerQuest','benQuest','evidence','visited','discovered','keycard','elapsed','hasMap','weapon','arsenal','houses','respawn','learned'] as const;
export const pickProgress = (p:PlayerProgress):PlayerProgress => Object.fromEntries(PROGRESS_KEYS.map(key=>[key,p[key]])) as PlayerProgress;
export type GameSave = {
  version:1;savedAt:number;mission:CampaignId;phase:'playing'|'dead'|'won';progress:PlayerProgress;
  player:{x:number;z:number;yaw:number;pitch:number};noah:{x:number;z:number};
  loot:{key:string;remaining:number}[];doors:string[];gates:string[];
  enemies:{kind:ZombieKind;health:number;x:number;z:number;yaw:number;brain:Brain}[];
  flares:{x:number;z:number;life:number}[];noises:Stimulus[];
  conversation:SavedConversation|null;flashlight:boolean;reloadLeft:number;shotCooldown:number;invulnerable:number;
};
export const lootKey = (kind:string,x:number,z:number,index:number) => `${kind}:${x}:${z}:${index}`;
type Manifest = {loot:{key:string;count:number}[];doors:string[];gates:string[]};
const record = (v:unknown):v is Record<string,unknown> => !!v&&typeof v==='object'&&!Array.isArray(v);
const number = (v:unknown,min=0,max=1e9):v is number => typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const integer = (v:unknown,min=0,max=1e9) => number(v,min,max)&&Number.isInteger(v);
const strings = (v:unknown,max=5000):v is string[] => Array.isArray(v)&&v.length<=max&&v.every(s=>typeof s==='string'&&s.length<=200);
const flags = (v:unknown,length:number):v is boolean[] => Array.isArray(v)&&v.length===length&&v.every(f=>typeof f==='boolean');
const point = (v:unknown) => record(v)&&number(v.x,WORLD.minX,WORLD.maxX)&&number(v.z,WORLD.minZ,WORLD.maxZ);

// A bad/incompatible save must never prevent starting a fresh game. Reconstruct
// only values validated against the current world and inventory contracts.
export function parseSave(raw:string|null,manifest:Manifest):GameSave|null {
  if(!raw)return null;
  try {
    const s:unknown=JSON.parse(raw);if(!record(s)||s.version!==1||!number(s.savedAt,0,Number.MAX_SAFE_INTEGER))return null;
    const p=s.progress;if(!record(p)||!integer(p.stage,0,CAMPAIGN.length-1)||s.mission!==CAMPAIGN[p.stage as number].id)return null;
    if(!['playing','dead','won'].includes(String(s.phase)))return null;
    for(const key of ['health','stamina','battery','thirst','infection','protection'])if(!number(p[key],0,100))return null;
    for(const key of ['elapsed','kills','timer','boosted'])if(!number(p[key]))return null;
    if(!integer(p.kills)||!integer(p.powerQuest,0,3)||!integer(p.benQuest,0,4))return null;
    for(const key of ['repaired','keycard','hasMap'])if(typeof p[key]!=='boolean')return null;
    if(!strings(p.evidence)||!strings(p.visited)||!strings(p.learned))return null;
    if(!Array.isArray(p.discovered)||p.discovered.some(n=>!integer(n,0,4)))return null;
    if(!record(p.inventory)||!record(p.arsenal)||!record(p.houses))return null;
    for(const [kind,item] of Object.entries(ITEMS))if(!integer(p.inventory[kind],0,item.limit))return null;
    for(const [kind,weapon] of Object.entries(WEAPONS)){
      const a=p.arsenal[kind];if(!record(a)||typeof a.owned!=='boolean'||!integer(a.ammo,0,weapon.magazine)||!integer(a.reserve,0,1e6))return null;
    }
    if(!(String(p.weapon) in WEAPONS)||!(p.arsenal[String(p.weapon)] as {owned:boolean}).owned)return null;
    for(const h of SAFEHOUSES){
      const state=p.houses[h.id];if(!record(state)||!flags(state.windows,4)||!flags(state.closed,2)||!flags(state.reinforced,2)||typeof state.bed!=='boolean'||typeof state.claimed!=='boolean')return null;
    }
    if(p.respawn!==null&&(!SAFEHOUSES.some(h=>h.id===p.respawn)||!(p.houses[String(p.respawn)] as HouseState).claimed))return null;
    if(!point(s.player)||!record(s.player)||!number(s.player.yaw,-1e9,1e9)||!number(s.player.pitch,-1.3,1.3)||!point(s.noah))return null;
    if(!strings(s.doors)||s.doors.some(id=>!manifest.doors.includes(id))||!strings(s.gates)||s.gates.some(id=>!manifest.gates.includes(id)))return null;
    if(!Array.isArray(s.loot)||s.loot.length!==manifest.loot.length)return null;
    const counts=new Map(manifest.loot.map(l=>[l.key,l.count])),seen=new Set<string>();
    for(const entry of s.loot){
      if(!record(entry)||typeof entry.key!=='string'||!counts.has(entry.key)||seen.has(entry.key)||!integer(entry.remaining,0,counts.get(entry.key)))return null;
      seen.add(entry.key);
    }
    if(!Array.isArray(s.enemies)||s.enemies.length>40)return null;
    const brainStates=['idle','wander','notice','chase','investigate','search','attack','recover','hit','fall','rise','feed','dead'];
    for(const e of s.enemies){
      if(!record(e)||!(String(e.kind) in ZOMBIES)||!number(e.health,.001,ZOMBIES[e.kind as ZombieKind].health)||!point(e)||!number(e.yaw,-1e9,1e9))return null;
      const b=e.brain;if(!record(b)||!brainStates.includes(String(b.state))||!number(b.time,-1e6,1e6)||!number(b.memory)||!number(b.phase,-1e6,1e6)||typeof b.attackLanded!=='boolean')return null;
      for(const key of ['lastKnown','home','target']){const pt=b[key];if(!record(pt)||!number(pt.x,WORLD.minX-100,WORLD.maxX+100)||!number(pt.z,WORLD.minZ-100,WORLD.maxZ+100))return null;}
    }
    if(typeof s.flashlight!=='boolean'||!number(s.reloadLeft,0,10)||!number(s.shotCooldown,0,10)||!number(s.invulnerable,0,10))return null;
    if(!Array.isArray(s.flares)||s.flares.length>64||s.flares.some(f=>!record(f)||!point(f)||!number(f.life,.001,12)))return null;
    if(!Array.isArray(s.noises)||s.noises.length>24||s.noises.some(n=>!record(n)||!number(n.x,WORLD.minX-100,WORLD.maxX+100)||!number(n.z,WORLD.minZ-100,WORLD.maxZ+100)||!number(n.radius,0,500)||!number(n.life,-1,30)||!['shot','step','alarm','flare','explosion'].includes(String(n.kind))))return null;
    if(s.conversation!==null){
      const c=s.conversation;if(!record(c)||typeof c.speaker!=='string'||c.speaker.length>200||!Array.isArray(c.lines)||!c.lines.length||c.lines.length>64||c.lines.some(line=>typeof line!=='string'||line.length>1000)||!integer(c.index,0,c.lines.length-1))return null;
      if(c.complete!==null&&!CAMPAIGN.some(m=>m.id===c.complete))return null;
    }
    if(s.phase==='dead'&&p.health!==0||s.phase==='playing'&&p.health===0||s.phase==='won'&&(s.mission!=='defend'||p.timer!==0))return null;
    return s as unknown as GameSave;
  }catch{return null;}
}
