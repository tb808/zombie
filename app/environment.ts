// One real second advances one game minute; a full day lasts 24 minutes.
export const DAY_SECONDS = 24 * 60;
export const START_HOUR = 9;
const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function daylightAt(elapsed: number) {
  const hours = ((START_HOUR + elapsed * 24 / DAY_SECONDS) % 24 + 24) % 24;
  const angle = (hours - 6) / 24 * Math.PI * 2;
  const elevation = Math.sin(angle);
  const daylight = smooth(-.12, .22, elevation);
  const twilight = smooth(-.2, 0, elevation) * (1 - smooth(.05, .4, elevation));
  return { hours, angle, elevation, daylight, twilight, night: 1 - daylight,
    sunIntensity: 3.2 * smooth(0, .35, elevation),
    moonIntensity: .28 * smooth(0, .3, -elevation),
    skyIntensity: .32 + daylight * 1.65,
    fogDensity: .0025 + (1 - daylight) * .002,
    period: hours < 5.5 || hours >= 19 ? 'NACHT' : hours < 7 ? 'MORGENDÄMMERUNG' : hours < 17.5 ? 'TAG' : 'ABENDDÄMMERUNG',
    clock: `${String(Math.floor(hours)).padStart(2, '0')}:${String(Math.floor(hours % 1 * 60)).padStart(2, '0')}`,
    day: Math.floor((START_HOUR + elapsed * 24 / DAY_SECONDS) / 24) + 1,
  };
}

export const REFUGES = [
  { id: 'ranger', name: 'Rangerstation', x: -62, z: -34, hx: 17, hz: 17 },
  { id: 'hospital', name: 'St. Anna · Schutzhof', x: 120, z: -70, hx: 12, hz: 13 },
  { id: 'shelter', name: 'Schule · Notunterkunft', x: 120, z: 80, hx: 12, hz: 13 },
  { id: 'camp', name: 'Waldcamp', x: -121, z: 119, hx: 13, hz: 13 },
] as const;

export const refugeAt = (x: number, z: number, margin = 0) => REFUGES.find(r => Math.abs(x - r.x) < r.hx + margin && Math.abs(z - r.z) < r.hz + margin);

export function refugeWalls(r: typeof REFUGES[number]) {
  return [
    { x:r.x-r.hx, z:r.z, hx:.125, hz:r.hz },
    { x:r.x+r.hx, z:r.z, hx:.125, hz:r.hz },
    { x:r.x, z:r.z-r.hz, hx:r.hx, hz:.125 },
    ...[-1,1].map(side=>({ x:r.x+side*(r.hx+2)/2, z:r.z+r.hz, hx:(r.hx-2)/2, hz:.125 })),
  ];
}

export const footprintsOverlap = (a: { x: number; z: number; hx: number; hz: number }, b: { x: number; z: number; hx: number; hz: number }, gap = .5) =>
  Math.abs(a.x - b.x) < a.hx + b.hx + gap && Math.abs(a.z - b.z) < a.hz + b.hz + gap;
