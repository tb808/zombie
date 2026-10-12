import { START_POINTS, REGIONAL_SHELTERS } from './shelterSites.ts';
import { REGIONAL_STORY, type RegionalMissionId } from './regionalStory.ts';
const firstHouse=REGIONAL_SHELTERS.find(h=>h.id==='fichtenau')!;
const TASKS = [
  { id: 'intro', place: 'RANGERSTATION', title: 'Sprich mit Mara', detail: 'E am Lagerfeuer: erfahre, was in Tannwald passiert ist.', x: -53, z: -36 },
  { id: 'map', place: 'ORIENTIERUNG', title: 'Plane deinen Weg', detail: 'Öffne Maras Karte mit M. Zoome und suche das Dorf und die Unterschlüpfe.', x: -53, z: -36 },
  { id: 'supplies', place: 'RANGERSTATION', title: 'Packe Vorräte ein', detail: 'Sammle den Verband am Lager mit E. J zeigt Vorräte und ihre Wirkung.', x: -60, z: -36 },
  { id: 'water', place: 'ÜBERLEBEN', title: 'Trinke vor dem Aufbruch', detail: 'Drücke 6 für Wasser. Durst bremst deine Erholung; 2 gibt Ausdauer.', x: -60, z: -36 },
  { id: 'aim', place: 'ÜBUNGSPLATZ', title: 'Übe einen gezielten Schuss', detail: 'Halte die rechte Maustaste und triff die rote Zielscheibe. Schüsse locken Infizierte an.', x: -49, z: -34 },
  { id: 'reload', place: 'ÜBUNGSPLATZ', title: 'Lade deine Pistole nach', detail: 'R lädt fehlende Patronen aus der Reserve. Ein Waffenwechsel unterbricht das Nachladen.', x: -49, z: -34 },
  { id: 'axe', place: 'ÜBUNGSPLATZ', title: 'Teste die Feuerwehraxt', detail: 'Q wechselt zur Axt. Triff die Zielscheibe aus weniger als 2,6 m. Nahkampf kostet Ausdauer.', x: -49, z: -34 },
  { id: 'fuel', place: 'DORF TANNWALD', title: 'Hole die Brennstoffzelle', detail: 'Gehe leise zum Markt. Shift sprintet, verbraucht Ausdauer und macht Geräusche.', x: -19, z: -4 },
  { id: 'flare', place: 'ALTER FRIEDHOF', title: 'Schaffe einen Weg für Noah', detail: 'Wirf mit 4 eine Fackel beim Friedhof. Infizierte folgen dem Geräusch; nutze die Ablenkung.', x: 8, z: 5 },
  { id: 'noah', place: 'ALTER FRIEDHOF', title: 'Befreie Noah', detail: 'Sichere den Bereich am Mausoleum und sprich mit Noah. Er folgt dir ab jetzt.', x: 17, z: 15 },
  { id: 'planks', place: 'FORSTHAUS', title: 'Besorge Baumaterial', detail: 'Sammle Bretter und Ersatzteile vor dem Forsthaus. Vier Fenster brauchen je zwei Bretter.', x: -77, z: 15 },
  { id: 'house', place: 'FORSTHAUS', title: 'Richte einen Unterschlupf ein', detail: 'Räume das Haus. E an vier Fenstern und zwei Türen; richte das Bett ein und aktiviere den Ort.', x: -77, z: 6 },
  { id: 'lamp', place: 'NACHTWACHE', title: 'Prüfe deine Taschenlampe', detail: 'F schaltet Licht ein. Es verbraucht Batterie; 3 lädt die Lampe nach.', x: -77, z: 6 },
  { id: 'sleep', place: 'FORSTHAUS', title: 'Überstehe deine erste Nacht', detail: 'E am Bett: setze deinen Respawnpunkt. Warte dort bis 19 Uhr und schlafe bis 06 Uhr.', x: -77, z: 6 },
  { id: 'weber', place: 'ST. ANNA', title: 'Lass dir das Labor erklären', detail: 'Sprich mit Dr. Weber im Schutzhof der Notaufnahme. Sie erklärt Behandlung und Laborzugang.', x: 114, z: -62 },
  { id: 'lenz', place: 'SCHULHOF', title: 'Finde den Mechaniker', detail: 'Lenz braucht Hilfe mit dem Strom. Sichere Häuser in der Oststadt als weitere Rückzugsorte.', x: 120, z: 85 },
  { id: 'fuse', place: 'WERKSTATT', title: 'Berge Sicherung und Ersatzteile', detail: 'Sammle die Generatorsicherung und mindestens zwei Ersatzteile in der Werkstatt.', x: 181, z: -18 },
  { id: 'power', place: 'SCHULHOF', title: 'Stelle den Strom wieder her', detail: 'Setze Sicherung und zwei Ersatzteile am Generator ein. Sein Lärm zieht Infizierte an.', x: 120, z: 90 },
  { id: 'shotgun', place: 'POLIZEI', title: 'Öffne die Waffenkammer', detail: 'Lenz hat dir den Schlüssel gegeben. Öffne die Sicherheitstür mit E und hole die Jagdflinte.', x: 181, z: -74 },
  { id: 'archive', place: 'LAZARUS-ARCHIV', title: 'Sichere den Laborzugang', detail: 'Hole die Keycard am Kontrollpunkt Nord (184 / −136). Öffne das Archiv und lies den Abbruchbefehl.', x: 120, z: -136 },
  { id: 'serum', place: 'ALTE KLINIK', title: 'Sichere das Gegenmittel', detail: 'Weber hat den Behälter im Laborcontainer markiert. Noah begleitet dich.', x: 48, z: 23 },
  { id: 'repair', place: 'FUNKTURM 07', title: 'Verstärke den Sender', detail: 'Sammle drei Ersatzteile und setze sie am Funkturm mit 5 ein.', x: 66, z: -25 },
  { id: 'tower', place: 'FUNKTURM 07', title: 'Rufe den Konvoi', detail: 'Bringe Noah zum Sender. Er muss innerhalb von zwölf Metern sein. E startet den Notruf.', x: 66, z: -25 },
  { id: 'defend', place: 'LETZTE STELLUNG', title: 'Halte die Linie', detail: 'Bleibe beim Sender und verteidige dich bis zur Ankunft des Konvois.', x: 66, z: -25 },
] as const;
export const STORY_GOAL = 'Bringe Noah und das Gegenmittel zum Konvoi. Nur so können die Überlebenden Tannwald verlassen.';
export const CHAPTERS = [
  { title:'Ein Licht in Fichtenau', summary:'Im entferntesten Dorf braucht Mara Strom für den Funk. Prüfe die Ausrüstung, sichere die Forstunterkunft und warte auf den Hilferuf.' },
  { title:'Niemand bleibt zurück', summary:'Verfolge Noahs Funkspur vom Waldsee über Jagdhütte und Wiesenhof ins alte Tannwald. Befreie ihn am Friedhof.' },
  { title:'Webers Rettungsplan', summary:'Folge dem Kühltransport über die Höfe, Kornweiler, Hochforst und Aschenrode in die Oststadt. Weber, Lenz und das Archiv öffnen den Weg zur stabilen Dosis.' },
  { title:'Die letzte Bergung', summary:'Hole über Linden, Brückenfeld und das Umspannwerk den Kühlbehälter aus dem Steinbruch. Berge C-07, rufe den Konvoi und halte bis zur Abholung durch.' },
] as const;
type TaskId = typeof TASKS[number]['id'];
export type CampaignId = TaskId | 'returnFuel' | 'keycard' | RegionalMissionId;
type Mission = { id:CampaignId;chapter:number;place:string;title:string;reason:string;detail:string;x:number;z:number;kind?:'report';lines?:readonly string[];area?:string };
const STORY_LINKS: Record<TaskId,{chapter:number;title:string;reason:string;detail?:string}> = {
  intro:{chapter:0,title:'Höre Maras Rettungsplan',reason:'Der letzte Konvoi fährt außerhalb der Sperrzone. Mara weiß, wie ihr ihn erreichen könnt.'},
  map:{chapter:0,title:'Finde das Holzlager auf Maras Karte',reason:'Fichtenau liegt am weitesten von der Stadt entfernt. Die Brennstoffzelle im Holzlager bringt euch den ersten Funkkontakt.',detail:'Öffne M. Dein Standort ist Fichtenau; das Ziel führt zum Holzlager im Dorf.'},
  supplies:{chapter:0,title:'Nimm Maras Verband mit',reason:'Der Weg durch die Region wird lang. Mara hat einen Verband am Fichtenauer Lager bereitgelegt.'},
  water:{chapter:0,title:'Mach dich bereit für den Weg',reason:'Mara hat dir Wasser gegeben. Du musst das Holzlager und die Rückkehr schaffen, ohne zu erschöpfen.'},
  aim:{chapter:0,title:'Prüfe die Pistole vor dem Aufbruch',reason:'Jonas hat die Pistole aus dem Lager geholt. Prüfe ihren Treffpunkt hier, bevor du ihr draußen dein Leben anvertraust.'},
  reload:{chapter:0,title:'Fülle das Magazin für den Rückweg',reason:'Der Kontrollschuss hat eine Patrone verbraucht. Jonas schickt dich mit einem vollen Magazin zum Holzlager.'},
  axe:{chapter:0,title:'Halte eine leise Alternative bereit',reason:'In Fichtenau solltest du keinen ganzen Schwarm anlocken. Jonas gibt dir eine Axt für den Nahkampf.'},
  fuel:{chapter:0,title:'Berge die Brennstoffzelle im Holzlager',reason:'Mit der Zelle kann Mara das Funkgerät wieder betreiben und eine Nachricht vom Konvoi empfangen.',detail:'Gehe leise zum Holzlager in Fichtenau. Shift sprintet, verbraucht Ausdauer und macht Geräusche.'},
  flare:{chapter:1,title:'Lenke Noahs Verfolger ab',reason:'Mara empfängt Noahs Hilferuf: Er sitzt am Mausoleum fest und kennt den Weg zu Dr. Weber.'},
  noah:{chapter:1,title:'Hole Noah aus dem Mausoleum',reason:'Ohne Noah fehlt euch der Kontakt zu Weber. Lass ihn nicht zwischen den Infizierten zurück.'},
  planks:{chapter:0,title:'Besorge Baumaterial in Fichtenau',reason:'Der schwache Hilferuf bricht ab. Während Mara die Funkspur rekonstruiert, bereitest du einen sicheren Rückzugsort vor.',detail:'Sammle mit E mindestens 8 Bretter und 2 Ersatzteile vor der Forstunterkunft.'},
  house:{chapter:0,title:'Sichere die Forstunterkunft in Fichtenau',reason:'Vor dem langen Weg braucht ihr ein Bett und einen Ort für die Rückkehr. Solche einnehmbaren Häuser gibt es in jedem Gebiet.',detail:'Tor mit E am rechten Pfosten öffnen. Vier Fenster vernageln, beide Türen verstärken, Bett vorbereiten und am Bett aktivieren.'},
  lamp:{chapter:0,title:'Prüfe das Licht für die Nacht',reason:'Mara hält Funkwache. UV schützt deine aktivierte Unterkunft; die Taschenlampe hilft beim Erkunden und beim nächtlichen Aufbruch.'},
  sleep:{chapter:0,title:'Warte auf die rekonstruierte Funkspur',reason:'Mara gleicht die Aufzeichnungen über Nacht ab. Schlafe im gesicherten Haus und brich am Morgen Richtung Waldsee auf.',detail:'E am Bett: Fichtenau als Respawn wählen, bis 19 Uhr warten und bis 06 Uhr schlafen.'},
  weber:{chapter:2,title:'Frage Weber nach dem Gegenmittel',reason:'Die Transportspur führt zum Steinbruch. Weber erklärt euch jetzt, wie ihr die passende Dosis für W-07 findet.'},
  lenz:{chapter:2,title:'Bitte Lenz um Strom für das Archiv',reason:'Webers Lagerprotokoll liegt hinter einer elektrischen Sicherheitstür. Ohne Strom bleibt der Zugang verriegelt.',detail:'Sprich mit Lenz im gesicherten Schulhof. Er kennt den Generator und die fehlenden Teile.'},
  fuse:{chapter:2,title:'Berge die Teile für den Generator',reason:'Lenz kann das Archiv versorgen, wenn du seine Ersatzsicherung und Material für die Verkabelung findest.'},
  power:{chapter:2,title:'Schalte den Weg ins Archiv frei',reason:'Mit Strom funktionieren Archivtür und Straßenbeleuchtung. Der laute Generator lockt allerdings Infizierte an.'},
  shotgun:{chapter:2,title:'Hole Schutz für Noah und die Dosis',reason:'Lenz gibt dir den Polizeischlüssel. In der Klinik warten schwere Infizierte; ihr braucht eine stärkere Waffe für die Rückkehr.'},
  archive:{chapter:2,title:'Finde die Kennung der stabilen Dosis',reason:'Zwischen den Laborproben darfst du keine falsche mitnehmen. Webers Protokoll nennt Behälter und Standort – und belegt Falks Verantwortung.',detail:'Öffne das Archiv mit Strom und Keycard. Lies mit E das Original auf der Kiste im hinteren Raum.'},
  serum:{chapter:3,title:'Berge Dosis C-07 in den Kühlbehälter',reason:'W-07 ist bereit. Das Archiv führt euch zum blauen Behälter in der alten Klinik. Die Dosis bleibt für den Konvoi versiegelt.'},
  repair:{chapter:3,title:'Mach das Rettungssignal hörbar',reason:'Das Gegenmittel ist bei euch, doch der Turmsender verliert Leistung. Ein schwaches Signal erreicht den Konvoi nicht zuverlässig.'},
  tower:{chapter:3,title:'Melde Noah und die Dosis zur Abholung',reason:'Der Sender ist bereit. Mara kann dem Konvoi jetzt eure Position melden, sobald Noah bei dir angekommen ist.'},
  defend:{chapter:3,title:'Haltet gemeinsam bis zur Rettung durch',reason:'Der Konvoi hat euren Ruf gehört. Auch die Infizierten kennen eure Position; schützt Noah und die Dosis bis zur Ankunft.'},
};
const START_POSITIONS:Partial<Record<TaskId,{x:number;z:number}>>={intro:START_POINTS.mara,map:START_POINTS.mara,supplies:START_POINTS.supplies,water:START_POINTS.supplies,aim:START_POINTS.target,reload:START_POINTS.target,axe:START_POINTS.target,fuel:START_POINTS.fuel,planks:{x:firstHouse.x-4,z:firstHouse.z+10},house:{x:firstHouse.x,z:firstHouse.z+1},lamp:{x:firstHouse.x,z:firstHouse.z+1},sleep:{x:firstHouse.x,z:firstHouse.z+1}};
const baseCampaign: Mission[] = TASKS.flatMap((task):Mission[]=>{
  const linked={...task,...STORY_LINKS[task.id],...START_POSITIONS[task.id],...(START_POSITIONS[task.id]?{place:task.id==='fuel'?'FICHTENAU · HOLZLAGER':'FICHTENAU',area:'VILLAGE_02'}:{})};
  if(task.id==='fuel')return [linked,{id:'returnFuel',chapter:0,place:'FICHTENAU · RANGERLAGER',title:'Bringe Mara den Strom zurück',reason:'Die Zelle hilft erst im Generator. Mara wartet im Fichtenauer Lager, um den Notkanal einzuschalten.',detail:'Kehre zu Mara am Feuer zurück und übergib die Zelle mit E.',...START_POINTS.mara,area:'VILLAGE_02'}];
  if(task.id==='shotgun')return [linked,{id:'keycard',chapter:2,place:'KONTROLLPUNKT NORD',title:'Finde Webers Archiv-Keycard',reason:'Der Generator läuft. Jetzt fehlt die Zugangskarte, die Weber bei ihrer Flucht am Kontrollpunkt zurücklassen musste.',detail:'Sammle mit E die blaue Keycard im Kontrollpunkt. Danach führt dich das Ziel direkt zum Archiv.',x:184,z:-136}];
  return [linked];
});
const order:CampaignId[]=['intro','map','supplies','water','aim','reload','axe','fuel','returnFuel','planks','house','lamp','sleep',
  'seecamp','jaeger','wiesenhof','oldRanger','oldMarket','flare','noah',
  'westMeadows','birkenhof','muehlenhof','kornweiler','church','northForest','radar','fortRoute','research','aschenrode','rest','industrial','cityCentre',
  'weber','lenz','fuse','power','shotgun','keycard','archive',
  'suburbs','fuelRoute','brueckenfeld','powerRoute','quarry','serum','repair','tower','defend'];
const missions=new Map<CampaignId,Mission>([...baseCampaign,...REGIONAL_STORY.map(r=>({...r,kind:'report' as const,detail:r.id==='powerRoute'?'E am Netzschalter: Kühlanschluss freigeben.':r.id==='quarry'?'E am blauen W-07-Kühlbehälter: für C-07 mitnehmen.':'Lies mit E den markierten Funkbericht oder die Übergabenotiz.'}))].map(m=>[m.id,m]));
export const CAMPAIGN:readonly Mission[]=order.map(id=>missions.get(id)!);
export const missionIndex = (id: CampaignId) => CAMPAIGN.findIndex(m => m.id === id);
