import { daylightAt } from './environment.ts';
import type { LootKind } from './world.ts';

export const SAFEHOUSES = [
  { id: 'lodge', name: 'Forsthaus am Dorf', x: -77, z: 5 },
  { id: 'fire', name: 'Feuerwache 04', x: 120, z: 30 },
  { id: 'housing', name: 'Lindenhof', x: 181, z: 30 },
  { id: 'farm', name: 'Hof Birkenrain', x: -113, z: 69 },
] as const;
export const HOUSE_LOOT: {kind:LootKind;x:number;z:number;count:number}[] = SAFEHOUSES.flatMap(h => [
  {kind:'planks',x:h.x-4,z:h.z+10,count:8}, {kind:'planks',x:h.x+4,z:h.z+10,count:4},
  {kind:'scrap',x:h.x,z:h.z+12,count:2}, {kind:'ration',x:h.x+3,z:h.z+2,count:1},
]);
export type HouseState = { windows: boolean[]; reinforced: boolean[]; closed: boolean[]; bed: boolean; claimed: boolean };
export const newHouses = (): Record<string, HouseState> => Object.fromEntries(SAFEHOUSES.map(h => [h.id, {
  windows: [false, false, false, false], reinforced: [false, false], closed: [false, false], bed: false, claimed: false,
}]));
export const houseReady = (h: HouseState) => h.windows.every(Boolean) && h.reinforced.every(Boolean) && h.closed.every(Boolean) && h.bed;
// Opening an entrance does not dismantle the installed UV equipment.
export const houseSecured = (h: HouseState) => h.claimed && h.windows.every(Boolean) && h.reinforced.every(Boolean) && h.bed;
export const houseProtected = (h: HouseState) => h.claimed && houseReady(h);
export const houseContains = (h: { x: number; z: number }, x: number, z: number, margin = 0) => Math.abs(x - h.x) < 7.1 + margin && Math.abs(z - h.z) < 6.6 + margin;
export const canSleep = (elapsed: number) => { const { hours } = daylightAt(elapsed); return hours >= 19 || hours < 6; };
export const nextHour = (elapsed: number, hour: number) => {
  const current = daylightAt(elapsed).hours;
  return elapsed + ((hour - current + 24) % 24 || 24) * 60;
};
