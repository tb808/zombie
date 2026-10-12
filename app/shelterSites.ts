// Shared footprints keep regional generation, story positions and player-built
// shelters aligned without a dependency on the generated world.
export const REGIONAL_SHELTERS = [
  {id:'fichtenau',area:'VILLAGE_02',name:'Fichtenau · Forstunterkunft',x:-770,z:493},
  {id:'kornweiler',area:'VILLAGE_01',name:'Kornweiler · Gemeindehaus',x:-686,z:-543},
  {id:'brueckenfeld',area:'VILLAGE_03',name:'Brückenfeld · Schleusenhaus',x:716,z:407},
  {id:'aschenrode',area:'VILLAGE_04',name:'Aschenrode · Wachhaus',x:662,z:-672},
  {id:'city-centre',area:'MAIN_CITY',name:'Oststadt · Haus am Rathaus',x:340,z:-49},
  {id:'city-suburbs',area:'CITY_SUBURBS',name:'Linden · Nachbarschaftshaus',x:398,z:190},
  {id:'industry',area:'INDUSTRIAL_ZONE',name:'Ostwerk · Pförtnerhaus',x:545,z:-303},
  {id:'fort',area:'MILITARY_BASE',name:'Fort Eiche · Sanitätsunterkunft',x:-377,z:-820},
  {id:'fields',area:'FARMLAND',name:'Kornmark · Feldunterkunft',x:-495,z:-139},
  {id:'north-forest',area:'FOREST_NORTH',name:'Hochforst · Waldwache',x:-575,z:-695},
  {id:'south-forest',area:'FOREST_SOUTH',name:'Südlicher Tannwald · Waldhaus',x:-535,z:669},
  {id:'river',area:'RIVER_VALLEY',name:'Aue · Uferhaus',x:867,z:157},
  {id:'west-meadows',area:'REMOTE_AREA',name:'Westliche Weiden · Wegehaus',x:-919,z:63},
] as const;
// The four original shelters remain available in the central enclave.
// Kornmark's fields and their two farm stops share this regional shelter.
export const START_HOUSE = 'fichtenau';
export const START_CAMP={x:-793,z:493,hx:14,hz:17};
export const START_POINTS={
  player:{x:-794,z:494},mara:{x:-786,z:492},supplies:{x:-796,z:492},
  target:{x:-782,z:501},fuel:{x:-746,z:489},jonas:{x:-792,z:486},
} as const;
export const SITE_RESERVATIONS=[...REGIONAL_SHELTERS.map(h=>({...h,hx:11,hz:15})),{...START_CAMP,hx:18,hz:21},...Object.values(START_POINTS).map(p=>({...p,hx:2,hz:2}))];
