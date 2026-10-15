// Full model envelopes (including roofs) from the loaded original GLBs.
// Shared by terrain foundations, placement and the map-wide layout audit.
export const LEGACY_BUILDINGS = [
  {name:'suburban-building-type-a',x:-58,z:-28,scale:1.65,rotation:Math.PI,hx:7.3,hz:5.8},
  {name:'suburban-building-type-h',x:-72,z:-26,scale:1.15,rotation:Math.PI/2,hx:4.1,hz:5.8},
  {name:'suburban-building-type-c',x:-37,z:-22,scale:1.55,rotation:0,hx:5.5,hz:4.4},
  {name:'suburban-building-type-f',x:-24,z:-23,scale:1.7,rotation:0,hx:6.1,hz:6},
  {name:'suburban-building-type-k',x:-11,z:-21,scale:1.65,rotation:0,hx:3.8,hz:4.2},
  {name:'suburban-building-type-n',x:-35,z:7,scale:1.7,rotation:Math.PI,hx:7.6,hz:5.9},
  {name:'suburban-building-type-r',x:-22,z:8,scale:1.75,rotation:Math.PI,hx:4.5,hz:4.5},
  {name:'suburban-building-type-t',x:-8,z:8,scale:1.55,rotation:Math.PI,hx:5.1,hz:5.4},
  {name:'crypt-large',x:20,z:24,scale:1.65,rotation:Math.PI,hx:5.8,hz:7.5},
  {name:'industrial-building-a',x:44,z:29,scale:1.8,rotation:Math.PI,hx:7.3,hz:4.4},
  {name:'industrial-building-f',x:57,z:28,scale:1.85,rotation:Math.PI,hx:4.95,hz:3.6,offsetX:2.44,offsetZ:-1.37},
  {name:'industrial-building-c',x:50,z:9.8,scale:1.3,rotation:0,hx:5.6,hz:6.3,offsetX:.56,offsetZ:.83},
  {name:'industrial-building-j',x:71,z:8,scale:1.3,rotation:0,hx:4.5,hz:5.6,offsetX:-3.68,offsetZ:2.32},
  {name:'industrial-building-m',x:74,z:27,scale:1.65,rotation:Math.PI/2,hx:5.3,hz:4.15},
  {name:'industrial-building-r',x:66,z:-35,scale:1.7,rotation:Math.PI,hx:8.6,hz:4.5},
];
export const LEGACY_FOUNDATIONS=LEGACY_BUILDINGS.map(b=>({...b,x:b.x+(b.offsetX??0),z:b.z+(b.offsetZ??0)}));
