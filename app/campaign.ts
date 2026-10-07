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
  { title:'Eine Stimme im Rauschen', summary:'Mara braucht Strom für das Funkgerät. Erst mit Kontakt nach draußen lässt sich eine Rettung organisieren.' },
  { title:'Niemand bleibt zurück', summary:'Noah kennt Webers Arbeit. Rette ihn und übersteht die Nacht gemeinsam, bevor ihr sie in der Oststadt sucht.' },
  { title:'Der Weg zum Gegenmittel', summary:'Weber braucht das Lagerprotokoll. Lenz stellt den Strom her; Keycard und Archiv führen euch zum richtigen Laborbehälter.' },
  { title:'Das letzte Signal', summary:'Ihr habt das Gegenmittel. Jetzt muss der Sender den Konvoi erreichen – und ihr müsst bis zur Abholung durchhalten.' },
] as const;
type TaskId = typeof TASKS[number]['id'];
export type CampaignId = TaskId | 'returnFuel' | 'keycard';
type Mission = { id:CampaignId;chapter:number;place:string;title:string;reason:string;detail:string;x:number;z:number };
const STORY_LINKS: Record<TaskId,{chapter:number;title:string;reason:string;detail?:string}> = {
  intro:{chapter:0,title:'Höre Maras Rettungsplan',reason:'Der letzte Konvoi fährt außerhalb der Sperrzone. Mara weiß, wie ihr ihn erreichen könnt.'},
  map:{chapter:0,title:'Finde den Markt auf Maras Karte',reason:'Ohne Strom bleibt das Funkgerät stumm. Auf dem Markt liegt die letzte Brennstoffzelle.'},
  supplies:{chapter:0,title:'Nimm Maras Verband mit',reason:'Auf dem Weg zum Markt kann dir draußen niemand helfen. Mara hat einen Verband für dich bereitgelegt.'},
  water:{chapter:0,title:'Mach dich bereit für den Weg',reason:'Mara hat dir Wasser gegeben. Du musst den Markt und die Rückkehr schaffen, ohne zu erschöpfen.'},
  aim:{chapter:0,title:'Prüfe die Pistole vor dem Aufbruch',reason:'Jonas hat die Pistole aus dem Lager geholt. Prüfe ihren Treffpunkt hier, bevor du ihr draußen dein Leben anvertraust.'},
  reload:{chapter:0,title:'Fülle das Magazin für den Rückweg',reason:'Der Kontrollschuss hat eine Patrone verbraucht. Jonas schickt dich mit einem vollen Magazin zum Markt.'},
  axe:{chapter:0,title:'Halte eine leise Alternative bereit',reason:'Am Markt solltest du keinen ganzen Schwarm anlocken. Jonas gibt dir eine Axt für den Nahkampf.'},
  fuel:{chapter:0,title:'Berge die Brennstoffzelle',reason:'Mit der Zelle kann Mara das Funkgerät wieder betreiben und eine Nachricht vom Konvoi empfangen.'},
  flare:{chapter:1,title:'Lenke Noahs Verfolger ab',reason:'Mara empfängt Noahs Hilferuf: Er sitzt am Mausoleum fest und kennt den Weg zu Dr. Weber.'},
  noah:{chapter:1,title:'Hole Noah aus dem Mausoleum',reason:'Ohne Noah fehlt euch der Kontakt zu Weber. Lass ihn nicht zwischen den Infizierten zurück.'},
  planks:{chapter:1,title:'Sammelt Material für die Nacht',reason:'Noah ist erschöpft. Weber erwartet euch erst am Morgen; das offene Forsthaus muss bis dahin sicher werden.',detail:'Sammle mit E mindestens 8 Bretter und 2 Ersatzteile vor dem Forsthaus.'},
  house:{chapter:1,title:'Macht das Forsthaus zu eurem Rückzugsort',reason:'Ihr braucht einen Schlafplatz und einen Ort für die Rückkehr. Aktivierte Häuser halten nachts Infizierte mit UV-Licht fern.'},
  lamp:{chapter:1,title:'Leuchte den Schlafplatz aus',reason:'Noah bereitet die Nachtwache vor. UV hält die Infizierten fern; deine Lampe hilft euch im dunklen Haus.'},
  sleep:{chapter:1,title:'Wartet gemeinsam auf Webers Nachricht',reason:'Weber erwartet euch im Morgengrauen. Statt erschöpft durch die Nacht zu laufen, ruht ihr im gesicherten Forsthaus.'},
  weber:{chapter:2,title:'Frage Weber nach dem Gegenmittel',reason:'Noah hat euch zu Weber geführt. Sie weiß, wie ihr die richtige Dosis aus der verlassenen Klinik bergen könnt.'},
  lenz:{chapter:2,title:'Bitte Lenz um Strom für das Archiv',reason:'Webers Lagerprotokoll liegt hinter einer elektrischen Sicherheitstür. Ohne Strom bleibt der Zugang verriegelt.',detail:'Sprich mit Lenz im gesicherten Schulhof. Er kennt den Generator und die fehlenden Teile.'},
  fuse:{chapter:2,title:'Berge die Teile für den Generator',reason:'Lenz kann das Archiv versorgen, wenn du seine Ersatzsicherung und Material für die Verkabelung findest.'},
  power:{chapter:2,title:'Schalte den Weg ins Archiv frei',reason:'Mit Strom funktionieren Archivtür und Straßenbeleuchtung. Der laute Generator lockt allerdings Infizierte an.'},
  shotgun:{chapter:2,title:'Hole Schutz für Noah und die Dosis',reason:'Lenz gibt dir den Polizeischlüssel. In der Klinik warten schwere Infizierte; ihr braucht eine stärkere Waffe für die Rückkehr.'},
  archive:{chapter:2,title:'Finde die Kennung der stabilen Dosis',reason:'Zwischen den Laborproben darfst du keine falsche mitnehmen. Webers Protokoll nennt Behälter und Standort – und belegt Falks Verantwortung.',detail:'Öffne das Archiv mit Strom und Keycard. Lies mit E das Original auf der Kiste im hinteren Raum.'},
  serum:{chapter:3,title:'Berge Behälter C-07',reason:'Das Protokoll führt euch zum blauen Behälter im Laborcontainer. Diese stabile Dosis ist eure Hoffnung auf Rettung.'},
  repair:{chapter:3,title:'Mach das Rettungssignal hörbar',reason:'Das Gegenmittel ist bei euch, doch der Turmsender verliert Leistung. Ein schwaches Signal erreicht den Konvoi nicht zuverlässig.'},
  tower:{chapter:3,title:'Melde Noah und die Dosis zur Abholung',reason:'Der Sender ist bereit. Mara kann dem Konvoi jetzt eure Position melden, sobald Noah bei dir angekommen ist.'},
  defend:{chapter:3,title:'Haltet gemeinsam bis zur Rettung durch',reason:'Der Konvoi hat euren Ruf gehört. Auch die Infizierten kennen eure Position; schützt Noah und die Dosis bis zur Ankunft.'},
};
export const CAMPAIGN: readonly Mission[] = TASKS.flatMap((task):Mission[]=>{
  const linked={...task,...STORY_LINKS[task.id]};
  if(task.id==='fuel')return [linked,{id:'returnFuel',chapter:0,place:'RANGERSTATION',title:'Bringe Mara den Strom zurück',reason:'Die Zelle hilft erst im Generator. Mara wartet, um den Notkanal wieder einzuschalten.',detail:'Kehre zu Mara am Feuer zurück und übergib die Zelle mit E.',x:-53,z:-36}];
  if(task.id==='shotgun')return [linked,{id:'keycard',chapter:2,place:'KONTROLLPUNKT NORD',title:'Finde Webers Archiv-Keycard',reason:'Der Generator läuft. Jetzt fehlt die Zugangskarte, die Weber bei ihrer Flucht am Kontrollpunkt zurücklassen musste.',detail:'Sammle mit E die blaue Keycard im Kontrollpunkt. Danach führt dich das Ziel direkt zum Archiv.',x:184,z:-136}];
  return [linked];
});
export const missionIndex = (id: CampaignId) => CAMPAIGN.findIndex(m => m.id === id);
