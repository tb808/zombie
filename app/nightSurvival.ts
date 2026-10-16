import { daylightAt, refugeAt } from './environment.ts';
import { SAFEHOUSES, houseSecured, type HouseState } from './safehouses.ts';
import { riskAt } from './regionPlan.ts';
import type { Point, ZombieKind } from './survival.ts';

export const NIGHT_HUNTER_CAP = 2;
export const isHunterNight = (elapsed:number) => daylightAt(elapsed).period === 'NACHT';
// Use the underlying area's risk, so helping a settlement does not erase this
// nocturnal threat. Check both positions to protect borders of the early areas.
export function nightHunterAllowed(elapsed:number,chapter:number,player:Point,spawn:Point=player) {
  return isHunterNight(elapsed) && chapter>=2 && riskAt(player.x,player.z)>=2 && riskAt(spawn.x,spawn.z)>=2;
}

export function nightThreat(elapsed: number) {
  const { hours } = daylightAt(elapsed);
  const ramp = (n:number) => { const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t); };
  const strength = hours>=17 ? ramp((hours-17)/3) : 1-ramp((hours-5)/2);
  return { strength, speed:1+.3*strength, damage:1+.45*strength, sight:1+.25*strength, spawnInterval:1-.55*strength };
}

export const uvScheduled = (elapsed:number) => { const {hours}=daylightAt(elapsed);return hours>=17.5 || hours<6.5; };
export function uvProtectedAt(elapsed:number, houses:Record<string,HouseState>, x:number,z:number,margin=0) {
  if(!uvScheduled(elapsed))return undefined;
  return refugeAt(x,z,margin) ?? SAFEHOUSES.find(h=>houseSecured(houses[h.id])&&Math.abs(x-h.x)<7.1+margin&&z>h.z-6.6-margin&&z<h.z+9.5+margin);
}

export function roamingZombie(elapsed:number,risk:number,roll:number,tougher=false,allowNightHunter=false):ZombieKind {
  if(allowNightHunter && isHunterNight(elapsed) && roll<(risk>=3?.18:.14))return 'nightHunter';
  if(tougher)return 'tank';
  const strength=nightThreat(elapsed).strength;
  const tank=.02+risk*.025+strength*.12, runner=.1+risk*.035+strength*.16, infected=.12+strength*.15;
  return roll<tank?'tank':roll<tank+runner?'runner':roll<tank+runner+infected?'infected':roll<tank+runner+infected+.1?'crawler':'walker';
}

export const gateFootprint = (x:number,z:number,open:boolean) => open
  ? {x:x-2.05,z:z+2.05,hx:.12,hz:2.05}
  : {x,z,hx:2.05,hz:.12};
