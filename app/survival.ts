import { segmentBlocked } from './world.ts';
import { REGION_BOUNDS } from './regionPlan.ts';

export type Point = { x: number; z: number };
export type Obstacle = Point & { hx: number; hz: number };
export const WORLD = REGION_BOUNDS;
export const ZOMBIES = {
  walker: { name: 'Wandler', health: 90, speed: 1.45, damage: 12, scale: 1, windup: .72, recovery: 1.1, sight: 17 },
  runner: { name: 'Hetzer', health: 65, speed: 4.1, damage: 9, scale: .95, windup: .48, recovery: 1, sight: 23 },
  tank: { name: 'Brecher', health: 360, speed: 1.1, damage: 28, scale: 1.5, windup: 1.2, recovery: 1.7, sight: 16 },
  crawler: { name: 'Kriecher', health: 60, speed: 1, damage: 10, scale: .95, windup: .85, recovery: 1.3, sight: 12 },
  infected: { name: 'Fiebernder', health: 105, speed: 2.7, damage: 14, scale: 1.02, windup: .58, recovery: .95, sight: 21 },
} as const;
export type ZombieKind = keyof typeof ZOMBIES;
export type BrainState = 'idle' | 'wander' | 'notice' | 'chase' | 'investigate' | 'search' | 'attack' | 'recover' | 'hit' | 'fall' | 'rise' | 'feed' | 'dead';
export type Brain = { state: BrainState; time: number; memory: number; lastKnown: Point; home: Point; target: Point; phase: number; attackLanded: boolean };
export const makeBrain = (home: Point, phase = 0, resting = false): Brain => ({ state: resting ? 'feed' : 'idle', time: resting ? 8 : 1 + phase % 3, memory: 0, home: { ...home }, lastKnown: { ...home }, target: { ...home }, phase, attackLanded: false });
export function transition(brain: Brain, state: BrainState, time = 0) { brain.state = state; brain.time = time; brain.attackLanded = false; }
export type Stimulus = Point & { radius: number; life: number; kind: 'shot' | 'step' | 'alarm' | 'flare' | 'explosion' };
export function think(brain: Brain, kind: ZombieKind, position: Point, player: Point, yaw: number, obstacles: readonly Obstacle[], noises: readonly Stimulus[], dt: number): { speed: number; strike: boolean } {
  const spec = ZOMBIES[kind];
  brain.time -= dt; brain.memory = Math.max(0, brain.memory - dt);
  if (brain.state === 'dead') return { speed: 0, strike: false };
  const dx = player.x - position.x, dz = player.z - position.z, distance = Math.hypot(dx, dz);
  const facing = (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / Math.max(distance, .001);
  const sees = distance < spec.sight && (distance < 3 || facing > -.15 || brain.state === 'chase') && !segmentBlocked(position.x, position.z, player.x, player.z, obstacles);
  if (sees) { brain.lastKnown = { ...player }; brain.memory = 6; }
  const noise = noises.filter(n => n.life > 0 && Math.hypot(n.x - position.x, n.z - position.z) < n.radius).sort((a, b) => (b.kind === 'flare' ? 100 : b.radius) - (a.kind === 'flare' ? 100 : a.radius))[0];
  if (['hit', 'fall', 'rise', 'notice', 'recover'].includes(brain.state)) {
    if (brain.time <= 0) {
      if (brain.state === 'fall') transition(brain, 'rise', 1.5);
      else transition(brain, brain.memory > 0 ? 'chase' : 'search', 4);
    }
    return { speed: 0, strike: false };
  }
  if (brain.state === 'attack') {
    const strike = !brain.attackLanded && brain.time <= .16;
    if (strike) brain.attackLanded = true;
    if (brain.time <= 0) transition(brain, 'recover', spec.recovery);
    return { speed: 0, strike: strike && distance < (kind === 'tank' ? 2.25 : 1.85) && sees };
  }
  if (sees && !(noise?.kind === 'flare' && distance > 3)) {
    if (brain.state === 'feed') { transition(brain, 'rise', 1.5); return { speed: 0, strike: false }; }
    if (['idle', 'wander', 'investigate'].includes(brain.state)) { transition(brain, 'notice', kind === 'infected' ? .2 : .55); return { speed: 0, strike: false }; }
    if (distance < (kind === 'tank' ? 1.95 : 1.5)) { transition(brain, 'attack', spec.windup); return { speed: 0, strike: false }; }
    brain.state = 'chase'; brain.target = { ...brain.lastKnown };
  } else if (noise && (brain.memory <= 0 || noise.kind === 'flare')) {
    if (brain.state === 'feed') { transition(brain, 'rise', 1.5); return { speed: 0, strike: false }; }
    brain.state = 'investigate'; brain.target = { x: noise.x, z: noise.z }; brain.lastKnown = { ...brain.target };
  } else if (brain.state === 'chase') {
    brain.target = { ...brain.lastKnown };
    if (brain.memory <= 0 || Math.hypot(position.x - brain.target.x, position.z - brain.target.z) < 1) transition(brain, 'search', 5);
  } else if (brain.state === 'investigate' && Math.hypot(position.x - brain.target.x, position.z - brain.target.z) < 1.2) transition(brain, 'search', 5);
  if (brain.state === 'search') {
    brain.target = { x: brain.lastKnown.x + Math.sin(brain.time * .7 + brain.phase) * 3, z: brain.lastKnown.z + Math.cos(brain.time * .7 + brain.phase) * 3 };
    if (brain.time <= 0) transition(brain, 'idle', 2);
  }
  if (brain.state === 'idle' && brain.time <= 0) { transition(brain, 'wander', 6); brain.phase += 1.73; brain.target = { x: brain.home.x + Math.sin(brain.phase) * 5, z: brain.home.z + Math.cos(brain.phase) * 5 }; }
  if (brain.state === 'wander' && (brain.time <= 0 || Math.hypot(position.x - brain.target.x, position.z - brain.target.z) < .4)) transition(brain, 'idle', 2 + brain.phase % 4);
  return { speed: ['idle', 'feed'].includes(brain.state) ? 0 : spec.speed * (brain.state === 'chase' ? 1 : .45), strike: false };
}

// Bounded A*; persistent paths are followed between staggered AI ticks. Walls are
// inflated by the actor radius so paths through open doors remain collision-safe.
export function findPath(start: Point, goal: Point, obstacles: readonly Obstacle[], radius = .48): Point[] {
  const inflated = obstacles.map(o => ({ ...o, hx: o.hx + radius, hz: o.hz + radius }));
  if(inflated.some(o=>Math.abs(goal.x-o.x)<o.hx&&Math.abs(goal.z-o.z)<o.hz))return [];
  if (!segmentBlocked(start.x, start.z, goal.x, goal.z, inflated)) return [{ ...goal }];
  const step = 1.5, key = (x: number, z: number) => `${x},${z}`;
  const sx = Math.round(start.x / step), sz = Math.round(start.z / step), gx = Math.round(goal.x / step), gz = Math.round(goal.z / step);
  const open = [{ x: sx, z: sz, g: 0, f: 0 }], costs = new Map([[key(sx, sz), 0]]), parents = new Map<string, string>(), closed = new Set<string>();
  let end = '';
  for (let n = 0; open.length && n < 1800; n++) {
    let best = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const current = open.splice(best, 1)[0], ck = key(current.x, current.z);
    if (closed.has(ck)) continue; closed.add(ck);
    if (Math.hypot(current.x - gx, current.z - gz) < 1.5 && !segmentBlocked(current.x * step, current.z * step, goal.x, goal.z, inflated)) { end = ck; break; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = current.x + dx, z = current.z + dz, k = key(x, z), wx = x * step, wz = z * step;
      if (wx < WORLD.minX || wx > WORLD.maxX || wz < WORLD.minZ || wz > WORLD.maxZ || closed.has(k) || segmentBlocked(current.x * step, current.z * step, wx, wz, inflated)) continue;
      const g = current.g + Math.hypot(dx, dz); if (g >= (costs.get(k) ?? Infinity)) continue;
      costs.set(k, g); parents.set(k, ck); open.push({ x, z, g, f: g + Math.hypot(x - gx, z - gz) });
    }
  }
  if (!end) return [];
  const path: Point[] = [{ ...goal }];
  while (end !== key(sx, sz)) { const [x, z] = end.split(',').map(Number); path.unshift({ x: x * step, z: z * step }); end = parents.get(end)!; }
  while (path.length > 1 && !segmentBlocked(start.x, start.z, path[1].x, path[1].z, inflated)) path.shift();
  return path;
}

export const WEAPONS = {
  pistol: { name: 'Voss P12', ammo: '9 mm', magazine: 12, damage: 34, pellets: 1, interval: .23, reload: 1.35, range: 65, spread: .008, recoil: .046, noise: 48, weight: 1 },
  shotgun: { name: 'Jagdflinte M6', ammo: '12/70', magazine: 6, damage: 23, pellets: 7, interval: .9, reload: 2.6, range: 30, spread: .085, recoil: .13, noise: 65, weight: 1.15 },
  rifle: { name: 'Karabiner R30', ammo: '5.56 mm', magazine: 30, damage: 27, pellets: 1, interval: .11, reload: 2.1, range: 95, spread: .019, recoil: .036, noise: 60, weight: 1.1 },
  axe: { name: 'Feuerwehraxt', ammo: 'Ausdauer', magazine: 0, damage: 65, pellets: 1, interval: .8, reload: 0, range: 2.6, spread: 0, recoil: .07, noise: 7, weight: 1.08 },
} as const;
export type WeaponKind = keyof typeof WEAPONS;
export const freshArsenal = () => ({ pistol: { owned: true, ammo: 12, reserve: 48 }, shotgun: { owned: false, ammo: 0, reserve: 0 }, rifle: { owned: false, ammo: 0, reserve: 0 }, axe: { owned: true, ammo: 0, reserve: 0 } });
