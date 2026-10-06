export const ITEMS = {
  medkit: { name: 'Verband', key: '1', purpose: 'Heilt 40 Gesundheit', color: '#ff776b', limit: 5 },
  ration: { name: 'Ration', key: '2', purpose: 'Füllt Ausdauer; 20 s sparsamer sprinten', color: '#efbd73', limit: 5 },
  battery: { name: 'Batterie', key: '3', purpose: 'Lädt die Taschenlampe vollständig', color: '#90dce5', limit: 5 },
  flare: { name: 'Leuchtfackel', key: '4', purpose: 'Lenkt Infizierte 12 s vom Spieler ab', color: '#f99d62', limit: 5 },
  scrap: { name: 'Ersatzteile', key: '5', purpose: '3 Teile: Sender verstärken (−10 s)', color: '#c1cbbf', limit: 12 },
  water: { name: 'Wasser', key: '6', purpose: 'Stillt Durst; verhindert Erschöpfung', color: '#8acde0', limit: 5 },
  antibiotic: { name: 'Antibiotika', key: '7', purpose: 'Behandelt die Infektion vollständig', color: '#b7a5e4', limit: 3 },
  armor: { name: 'Schutzweste', key: '8', purpose: 'Rüstet 100 Schutz aus; absorbiert 55% Schaden', color: '#99bba0', limit: 2 },
  planks: { name: 'Bretter', key: 'E', purpose: 'Am Fenster: 2 Bretter zum Vernageln', color: '#d2a56b', limit: 32 },
} as const;
export type ItemKind = keyof typeof ITEMS;
export type LootKind = ItemKind | 'ammo' | 'shells' | 'rifleAmmo';
export const lootName = (kind: LootKind) => kind === 'ammo' ? '9 mm' : kind === 'shells' ? '12/70 Schrot' : kind === 'rifleAmmo' ? '5.56 mm' : ITEMS[kind].name;
export type Inventory = Record<ItemKind, number>;
export const newInventory = (): Inventory => ({ medkit: 1, ration: 1, battery: 1, flare: 1, scrap: 0, water: 2, antibiotic: 0, armor: 0, planks: 0 });
export const REGIONS = [
  { name: 'Rangerstation', x: -60, z: -33, loot: 'Verbände · Rationen', detail: 'Das letzte warme Feuer. Mara hält hier Wache.' },
  { name: 'Dorf Tannwald', x: -22, z: -4, loot: 'Rationen · Batterien · Munition', detail: 'Verlassene Marktstände und eine nie beendete Evakuierung.' },
  { name: 'Alter Friedhof', x: 17, z: 19, loot: 'Leuchtfackeln · Verbände', detail: 'Kerzen weisen den Weg zu Noahs Versteck.' },
  { name: 'Klinikgelände', x: 48, z: 23, loot: 'Verbände · Batterien · Ersatzteile', detail: 'Hier begann Projekt Lazarus. Die Notbeleuchtung läuft noch.' },
  { name: 'Funkturm 07', x: 66, z: -25, loot: 'Munition · Ersatzteile · Leuchtfackeln', detail: 'Ein verstärkter Sender verkürzt die Wartezeit auf den Konvoi.' },
] as const;
export const LOOT: { kind: LootKind; x: number; z: number; count: number }[] = [
  { kind: 'medkit', x: -60, z: -36, count: 1 }, { kind: 'ration', x: -57, z: -39, count: 2 },
  { kind: 'flare', x: -50, z: -34, count: 1 }, { kind: 'ammo', x: -46, z: -7, count: 24 },
  { kind: 'ration', x: -28, z: -5, count: 2 }, { kind: 'battery', x: -23, z: -5, count: 1 },
  { kind: 'ammo', x: -13, z: -5, count: 36 }, { kind: 'scrap', x: -7, z: -3, count: 1 },
  { kind: 'flare', x: 8, z: 5, count: 2 }, { kind: 'medkit', x: 12, z: 17, count: 1 },
  { kind: 'ammo', x: 29, z: 14, count: 24 }, { kind: 'ration', x: 30, z: 26, count: 1 },
  { kind: 'medkit', x: 38, z: 24, count: 2 }, { kind: 'battery', x: 43, z: 21, count: 2 },
  { kind: 'scrap', x: 57, z: 20, count: 2 }, { kind: 'ammo', x: 64, z: 21, count: 36 },
  { kind: 'scrap', x: 60, z: -25, count: 2 }, { kind: 'ammo', x: 71, z: -24, count: 48 },
  { kind: 'flare', x: 62, z: -29, count: 2 }, { kind: 'medkit', x: 73, z: -26, count: 1 },
];
export const NOTES = [
  { title: 'Mara an die Spätschicht', author: 'Rangerstation · 18:40', x: -58, z: -36, graffiti: 'WIR WARTEN AUF EUCH', text: 'Der Bus kam ohne Kinder zurück. Ich habe Essen am Zelt gelassen und die Lampe am Weg angelassen. Wenn Lea zurückkommt: Sag ihr, ich halte mein Versprechen. Niemand bleibt hier allein. — Mara' },
  { title: 'Die letzte Einkaufsliste', author: 'Tannwald · 20:15', x: -32, z: -5, graffiti: 'KEIN BUS MEHR / ZUM FRIEDHOF →', text: 'Brot. Batterien. Leas rote Jacke. Die Durchsage sagt, wir sollen an der Klinik warten. Aber Noah hat die Busse umkehren sehen. Wir gehen durch den Friedhof. Die Rationen liegen unter dem Marktstand. — Ben' },
  { title: 'Unter den Namen', author: 'St. Michael · 22:06', x: 10, z: 18, graffiti: 'LEA LEBT / FOLGT DEM LICHT', text: 'Die neuen Gräber sind leer. Wir haben die Namen nur aufgeschrieben, damit niemand vergessen wird. Lea ist mit dem ersten Konvoi gefahren. Mara weiß es noch nicht. Noah wartet beim Mausoleum. Fackeln ziehen die Kranken an — werft sie weg vom Weg. — Ben' },
  { title: 'Lazarus: Abbruchprotokoll', author: 'Klinik · 00:32', x: 40, z: 22, graffiti: 'FALK WUSSTE ES', text: 'Falk hat den Abbruch verweigert. Die Proben reagieren auf Schall, nicht auf Licht. Ich habe eine stabile Dosis im blauen Behälter gesichert. Die Ersatzteile neben dem Labor passen in den Sender. Bitte bringt die Dosis und diese Wahrheit nach draußen. — Dr. I. Weber' },
  { title: 'Eine Stimme im Rauschen', author: 'Funkturm 07 · 02:58', x: 63, z: -23, graffiti: 'MARA / LEA IST IN SICHERHEIT', text: 'Konvoi 2 meldet: Ein Mädchen mit roter Jacke ist angekommen. Sie fragt nach Mara. Der Sender verliert Leistung. Drei Ersatzteile reichen, um das Signal zu stabilisieren. Dann finden sie uns zehn Sekunden schneller. Wir lassen das Licht an. — Funkdienst 07' },
] as const;

// Segment/AABB intersection shared by movement visibility and ballistic cover.
export function segmentBlocked(ax: number, az: number, bx: number, bz: number, obstacles: readonly { x: number; z: number; hx: number; hz: number }[]) {
  return obstacles.some(o => {
    let lo = 0, hi = 1;
    for (const [start, delta, min, max] of [[ax, bx - ax, o.x - o.hx, o.x + o.hx], [az, bz - az, o.z - o.hz, o.z + o.hz]]) {
      if (Math.abs(delta) < 1e-8) { if (start < min || start > max) return false; }
      else { const a = (min - start) / delta, b = (max - start) / delta; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); if (lo > hi) return false; }
    }
    return true;
  });
}
