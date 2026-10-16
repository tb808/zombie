import { STRUCTURES } from './regionPlan.ts';
import { REGIONAL_SHELTERS } from './shelterSites.ts';
import type { Point } from './survival.ts';
import { NIGHT_HUNTER_WARNING, NIGHT_HUNTER_ADVICE } from './dialogue.ts';
import type { ChoiceId, Faction } from './narrative.ts';

export type ActivityKind = 'talk'|'collect'|'treat'|'deliver'|'repair'|'switch'|'clear'|'defend'|'escort'|'shelter'|'choice'|'war';
export type ActivityMissionId = 'seecamp'|'jaeger'|'wiesenhof'|'oldRanger'|'oldMarket'|'westMeadows'|'birkenhof'|'muehlenhof'|'kornweiler'|'church'|'northForest'|'radar'|'fortRoute'|'research'|'aschenrode'|'rest'|'industrial'|'cityCentre'|'suburbs'|'fuelRoute'|'brueckenfeld'|'powerRoute'|'quarry';
export type ActivityStep = Point & {kind:ActivityKind;label:string;lines?:readonly string[];prop?:'medicine'|'tools'|'food'|'battery'|'fuel'|'module'|'sample'|'pump'|'radio'|'cooler'|'switch';seconds?:number;count?:number;house?:string;choice?:ChoiceId;speaker?:string;reveal?:string;opposition?:Faction;allies?:Faction[]};
export type ActivityDefinition = Point & {id:ActivityMissionId;chapter:number;place:string;title:string;reason:string;area?:string;actor?:Point&{name:string;skin:string};steps:readonly ActivityStep[];reward?:{ammo?:number;medkit?:number;water?:number;ration?:number};secures?:string;lines:readonly string[]};
export type ActivityProgress = {step:number;started:boolean;timer:number;wave:number;actor:Point|null};
export type ActivityStates = Record<string,ActivityProgress>;
export const newActivityProgress = ():ActivityProgress=>({step:0,started:false,timer:0,wave:0,actor:null});
const house=(id:string)=>REGIONAL_SHELTERS.find(h=>h.id===id)!;
const outside=(id:string)=>{const h=house(id);return {x:h.x+10,z:h.z+2};};
const room=(zone:string,dx=0,dz=0):Point=>{const b=STRUCTURES.find(b=>b.zone===zone&&b.enterable);if(!b)throw Error(`Missing activity interior: ${zone}`);return {x:b.x+dx,z:b.z+dz};};
const person=(name:string,p:Point,skin='survivorMaleB')=>({name,...p,skin});
const step=(kind:ActivityKind,label:string,p:Point,extra:Partial<ActivityStep>={}):ActivityStep=>({kind,label,...p,...extra});
const talk=(label:string,p:Point,...lines:string[])=>step('talk',label,p,{lines});
const collect=(label:string,p:Point,prop:ActivityStep['prop'])=>step('collect',label,p,{prop});
const clear=(label:string,p:Point,count=3)=>step('clear',label,p,{count});
const defend=(label:string,p:Point,seconds=20)=>step('defend',label,p,{seconds,count:2,prop:'radio'});
const escort=(label:string,p:Point)=>step('escort',label,p);
const operate=(kind:'treat'|'deliver'|'repair'|'switch',label:string,p:Point,prop:ActivityStep['prop'],...lines:string[])=>step(kind,label,p,{prop,lines:lines.length?lines:undefined});

// Concrete actions replace the former chain of transport letters. Coordinates
// in room() are inside existing, enterable buildings, not outside façades.
export const STORY_ACTIVITIES:readonly ActivityDefinition[]=[
  {id:'seecamp',chapter:1,area:'FOREST_SOUTH',place:'CAMPING WALDSEE',x:-405,z:790,title:'Hilf Eva am Waldsee',reason:'Das Lager hat Verletzte aufgenommen. Bevor jemand weiterreisen kann, braucht Eva medizinische Hilfe.',actor:person('EVA',{x:-405,z:790},'survivorFemaleA'),reward:{medkit:2,water:2},steps:[
    talk('Sprich mit der verletzten Eva',{x:-405,z:790},'Ich bin am Ufer gestürzt. In der Campinghütte liegt der rote Sanitätskoffer. Schau im Gebäude nach, ich kann kaum auftreten.','Mara schickt dich? Gut. Helfen wir erst den Menschen hier, bevor wir weiterziehen.'),
    collect('Durchsuche die Campinghütte · Sanitätskoffer',room('seecamp'),'medicine'),
    operate('treat','Versorge Eva mit dem Sanitätskoffer',{x:-405,z:790},'medicine','Das Bein ist verbunden. Die restlichen Verbände sind für dich.','Ranger Tom sitzt an der Jagdhütte fest. Er hat Werkzeug für unsere Wasserpumpe. Hol ihn da raus.')],lines:['Eva wurde behandelt. Ranger Tom braucht Hilfe an der Jagdhütte.']},
  {id:'jaeger',chapter:1,place:'JAGDHÜTTE',x:-320,z:600,title:'Befreie Ranger Tom',reason:'Ohne Toms Werkzeug bleibt das Wasser aus. Infizierte haben ihn an der Jagdhütte eingeschlossen.',actor:person('TOM',{x:-320,z:600}),reward:{ammo:24},steps:[
    clear('Räume den Zugang zur Jagdhütte',{x:-320,z:600}),
    collect('Berge Toms Werkzeug aus der Hütte',room('jaeger'),'tools'),
    talk('Sprich mit dem befreiten Ranger',{x:-320,z:600},'Danke! Nimm den Werkzeugkasten mit. Damit bekommen wir später die Pumpe am Mühlenhof wieder an.','Am Wiesenhof wartet Oskar. Er schafft es allein nicht bis zum Sammelplatz. Hilf ihm, ich halte die Hütte frei.')],lines:['Tom ist frei. Sein Werkzeug hilft beim Wiederaufbau der Wasserversorgung.']},
  {id:'wiesenhof',chapter:1,place:'WIESENHOF',x:-260,z:440,title:'Bring Oskar aus dem Hof',reason:'Oskar braucht einen sicheren Weg aus dem offenen Hof. Bleib bei ihm und führe ihn zum Sammelplatz.',actor:person('OSKAR',{x:-260,z:440}),reward:{ration:2,ammo:18},steps:[
    talk('Hole Oskar am Hof ab',{x:-260,z:440},'Ich gehe mit dir. Lauf nicht zu weit voraus. Wenn sie zu nah kommen, bleibe ich stehen.','Der Sammelplatz liegt neben der Scheune. Danach solltest du das alte Rangerlager wieder anschließen.'),
    escort('Begleite Oskar zum Sammelplatz',{x:-235,z:462}),
    talk('Verabschiede Oskar am Sammelplatz',{x:-235,z:462},'Geschafft. Ich bleibe bei den anderen. Im alten Rangerlager fehlt eine Notstrombatterie.','Sichere dessen Funkanschluss, damit Mara auch die Menschen im alten Dorf erreicht.')],lines:['Oskar hat den Sammelplatz erreicht. Das alte Rangerlager braucht Notstrom.']},
  {id:'oldRanger',chapter:1,place:'ALTE RANGERSTATION',x:-53,z:-36,title:'Verbinde das alte Rangerlager',reason:'Die Helfer brauchen einen erreichbaren Stützpunkt zwischen Fichtenau und dem alten Dorf.',reward:{ammo:18},steps:[
    collect('Berge die Notstrombatterie am Lager',{x:-60,z:-36},'battery'),
    operate('repair','Setze die Batterie am Funkanschluss ein',{x:-53,z:-36},'radio'),
    clear('Sichere den Zugang zum Stützpunkt',{x:-44,z:-32},2)],lines:['Das Rangerlager ist wieder erreichbar. Am Markt brauchen die letzten Bewohner Hilfe.']},
  {id:'oldMarket',chapter:1,place:'DORF TANNWALD',x:-19,z:-4,title:'Sichere die Versorgung am Markt',reason:'Erik kann seine Vorräte nicht zu den Flüchtenden bringen, solange Infizierte den Markt besetzen.',actor:person('ERIK',{x:-19,z:-4}),reward:{ammo:24,ration:2},steps:[
    clear('Befreie den Marktzugang',{x:-19,z:-4}),
    collect('Berge die Vorratskiste am Marktstand',{x:-13,z:-5},'food'),
    operate('deliver','Übergib Erik die Vorratskiste',{x:-19,z:-4},'food','Jetzt haben die Leute etwas zu essen. Aber Noah fehlt noch. Er hat die Nachzügler zum Friedhof geführt.','Mara · Funk: Wir holen ihn. Nutze eine Fackel als Ablenkung, dann befreie ihn am Mausoleum.')],lines:['Der Markt ist versorgt. Noah blieb bei der letzten Gruppe am Friedhof zurück.']},
  {id:'westMeadows',chapter:2,area:'REMOTE_AREA',place:'WESTLICHE WEIDEN',...outside('west-meadows'),title:'Hilf Lea über die Weiden',reason:'Noah kennt noch gestrandete Menschen auf dem Weg nach Kornweiler. Lea wartet ohne Schutz an der Straße.',actor:person('LEA',outside('west-meadows'),'survivorFemaleA'),reward:{water:2,ammo:18},secures:'REMOTE_AREA',steps:[
    talk('Sprich mit Lea am Wegehaus',outside('west-meadows'),'Noah! Ihr lebt. Ich warte hier seit dem Abbruch der Busfahrt. Bringt mich zur Unterkunft, dann helfe ich am Sammelplatz.'),
    escort('Begleite Lea zum Eingang des Wegehauses',{x:house('west-meadows').x,z:house('west-meadows').z+13}),
    talk('Stimme die Versorgung mit Lea ab',{x:house('west-meadows').x,z:house('west-meadows').z+13},'Ich halte hier Wache. Am Birkenhof stehen Lebensmittel in der Scheune. Wenn ihr sie bergt, können wir die Menschen in Kornweiler versorgen.')],lines:['Lea bewacht den westlichen Sammelplatz. Lebensmittel fehlen noch.']},
  {id:'birkenhof',chapter:2,place:'BIRKENHOF',x:-1100,z:-280,title:'Berge Lebensmittel für Kornweiler',reason:'Die westlichen Höfe können Kornweiler versorgen. Dazu müssen die Vorräte aus der verlassenen Scheune geholt werden.',reward:{ration:3,ammo:24},steps:[
    clear('Sichere den Ladeplatz am Birkenhof',{x:-1100,z:-280}),
    collect('Durchsuche die Scheune · erste Lebensmittelkiste',room('birkenhof',-2,0),'food'),
    collect('Durchsuche die Scheune · zweite Lebensmittelkiste',room('birkenhof',2,2),'food'),
    operate('deliver','Verlade die Lebensmittel für das Dorf',{x:-1100,z:-280},'food')],lines:['Lebensmittel sind verladen. Am Mühlenhof fehlt noch sauberes Wasser für das Dorf.']},
  {id:'muehlenhof',chapter:2,area:'FARMLAND',place:'MÜHLENHOF · KORNMARK',x:-480,z:-110,title:'Bring die Wasserpumpe wieder in Gang',reason:'Lebensmittel allein reichen nicht. Mit Toms Werkzeug kann die Dorfversorgung wieder anlaufen.',actor:person('MILA',{x:-480,z:-110},'survivorFemaleA'),reward:{water:3,ammo:24},secures:'FARMLAND',steps:[
    talk('Sprich mit Mila an der Pumpe',{x:-480,z:-110},'Die Pumpe zieht Luft. In der Mühle liegt ein neuer Filter. Toms Werkzeugkasten passt an die Verschraubung.','Besorg den Filter. Während ich die Leitung entlüfte, musst du auf die Geräusche achten.'),
    collect('Suche den Wasserfilter in der Mühle',room('muehlenhof'),'module'),
    operate('repair','Montiere den Filter mit Toms Werkzeug',{x:-480,z:-110},'pump'),
    defend('Schütze Mila beim Entlüften der Pumpe',{x:-480,z:-110},18)],lines:['Die Wasserpumpe versorgt die Höfe wieder. Kornweiler kann die Hilfslieferung aufnehmen.']},
  {id:'kornweiler',chapter:2,area:'VILLAGE_01',place:'KORNWEILER',...outside('kornweiler'),title:'Mach Kornweiler zum Zufluchtsort',reason:'Essen und Wasser sind unterwegs. Hanna braucht ein gesichertes Gebäude, in dem die Menschen bleiben können.',actor:person('HANNA',outside('kornweiler'),'survivorFemaleA'),reward:{ammo:30,medkit:1},secures:'VILLAGE_01',steps:[
    talk('Besprich den Schutz des Dorfes mit Hanna',outside('kornweiler'),'Die Vorräte von den Höfen retten uns den Tag. Jetzt brauchen wir einen sicheren Schlafplatz.','Räume das Gemeindehaus, vernagle die Fenster und aktiviere das Bett. Material liegt vor dem Hof. Ein bereits gesichertes Haus zählt natürlich auch.'),
    step('shelter','Sichere und aktiviere das Gemeindehaus',{x:house('kornweiler').x,z:house('kornweiler').z+1},{house:'kornweiler'}),
    talk('Melde Hanna den sicheren Rückzugsort',outside('kornweiler'),'Jetzt können die Leute hier schlafen. An der Kirche wartet Emil mit einer Nachzüglerin. Helft ihnen, den Sammelpunkt zu erreichen.',NIGHT_HUNTER_WARNING,NIGHT_HUNTER_ADVICE)],lines:['Kornweiler besitzt einen aktivierten Unterschlupf und erhält Versorgung.',NIGHT_HUNTER_WARNING,NIGHT_HUNTER_ADVICE]},
  {id:'church',chapter:2,place:'ST. GEORG · KORNWEILER',x:-740,z:-600,title:'Bring die letzte Nachzüglerin in Sicherheit',reason:'Emil hat Lina an der Kirche gefunden. Sie braucht Begleitung zum geschützten Sammelpunkt.',actor:person('LINA',{x:-740,z:-600},'survivorFemaleA'),reward:{ammo:18,medkit:1},steps:[
    talk('Hole Lina im Kirchhof ab',{x:-740,z:-600},'Emil wartet hinter der Kirche. Ich komme mit dir. Bleib bitte in meiner Nähe.'),
    escort('Begleite Lina zur Kirchenunterkunft',room('church')),
    talk('Sprich mit Lina an der Unterkunft',room('church'),'Danke. Dr. Weber versorgt weiter Menschen in der Stadt. Sie sucht einen Weg, die Infektion zu stoppen.','Im Hochforst steht ein Funkrelais. Wenn ihr es repariert, können wir mit ihr sprechen.')],lines:['Lina ist in Sicherheit. Ein Funkrelais soll den Kontakt zu Weber herstellen.']},
  {id:'northForest',chapter:2,area:'FOREST_NORTH',place:'HOCHFORST · WALDWACHE',...outside('north-forest'),title:'Repariere das Funkrelais im Hochforst',reason:'Die Siedlungen brauchen Kontakt zur Stadt. Erst ein laufendes Relais bringt Webers Nachricht durch.',reward:{ammo:18},secures:'FOREST_NORTH',steps:[
    collect('Suche das Batteriemodul in der Waldwache',{x:house('north-forest').x,z:house('north-forest').z+1},'battery'),
    operate('repair','Schließe das Batteriemodul am Relais an',outside('north-forest'),'radio'),
    operate('switch','Schalte das Relais auf Kanal 12',outside('north-forest'),'switch','Weber · Funk: Ich höre euch! Im Außenlabor könnte noch eine stabile Probe sein. Die Radarstation kann die Sperre des Forts lösen.','Mara: Zuerst eine sichere Verbindung. Ivo am Radar braucht Schutz, bis der Kanal steht.')],lines:['Das Relais verbindet die Dörfer. Weber meldet einen möglichen medizinischen Durchbruch.']},
  {id:'radar',chapter:2,place:'RADARSTATION 12',x:-780,z:-850,title:'Halte Ivos Funkverbindung offen',reason:'Ivo muss Webers Kanal entschlüsseln. Der Sender ist laut; du und Noah sichern ihn während der Arbeit.',actor:person('IVO',{x:-780,z:-850}),reward:{ammo:30,medkit:1},steps:[
    talk('Sprich mit Ivo am Sender',{x:-780,z:-850},'Ich brauche einen Moment am Sender. Bleib in der Nähe. Wenn sie direkt bei mir stehen, kann ich nicht weiterarbeiten.','Hier oben kommen nachts auch Nachtjäger. Ihre leuchtenden Rippen und Schulterdornen siehst du schon zwischen den Bäumen. Geh bei Dunkelheit zum UV-Licht zurück.'),
    defend('Decke Ivo, bis Webers Kanal steht',{x:-780,z:-850},22),
    talk('Nimm Webers Antwort entgegen',{x:-780,z:-850},'Weber spricht von einer stabilen Dosis, aber noch ist nichts bewiesen. Ralf im Fort hat passende medizinische Kühlmodule.','Helft ihm mit dem Sanitätslager. Dann kann er euch Material für das Außenlabor geben.')],lines:['Webers Kanal ist frei. Im Fort liegt medizinische Ausrüstung für einen Labortest.']},
  {id:'fortRoute',chapter:2,area:'MILITARY_BASE',place:'FORT EICHE',...outside('fort'),title:'Hilf Ralf im Sanitätslager',reason:'Ralf teilt seine Ausrüstung, wenn die eingeschlossene Sanitätsfracht geborgen werden kann.',actor:person('RALF',outside('fort')),reward:{ammo:36,medkit:2},steps:[
    talk('Sprich mit dem Sanitäter Ralf',outside('fort'),'In der Halle liegen die Kühlmodule neben den Notfallpaketen. Ich komme nicht mehr an die Fracht.','Räumt den Zugang und holt ein intaktes Modul. Damit könnt ihr Webers Probe im Außenlabor untersuchen.'),
    clear('Sichere den Zugang zur Sanitätshalle',room('MILITARY_BASE')),
    collect('Durchsuche die Sanitätshalle · Kühlmodul',room('MILITARY_BASE',0,2),'module'),
    operate('deliver','Übergib Ralf das Kühlmodul',outside('fort'),'module','Das Modul funktioniert. Ihr bekommt die Medikamente; den Adapter nehme ich für den Probentest mit.','Geht ins Außenlabor. Noah kann das Analysegerät bedienen, während ihr den Raum schützt.')],lines:['Ralf hat das Kühlmodul geprüft. Die Probe im Außenlabor lässt sich untersuchen.']},
  {id:'research',chapter:2,place:'LAZARUS · AUSSENLABOR',x:10,z:-870,title:'Untersuche die Probe mit Noah',reason:'Erst ein gemeinsamer Labortest zeigt, ob Webers Hoffnung auf ein Heilmittel berechtigt ist.',reward:{ammo:30},steps:[
    collect('Durchsuche das Außenlabor · versiegelte Probe',room('research',-3,0),'sample'),
    operate('repair','Setze Probe und Kühlmodul ins Analysegerät',room('research',3,0),'module'),
    defend('Sichere den Raum, während Noah die Probe prüft',room('research'),18),
    operate('switch','Bestätige das positive Analyseergebnis',room('research',3,0),'switch','Noah: Die Probe bleibt stabil. Weber hatte recht. Mit einer echten Dosis könnten wir die Infektion behandeln.','Mara: Dann bringen wir das Ergebnis zu Weber. Helft den Menschen auf dem Weg und holt ihre Freigabe für die Klinik.')],lines:['Der Labortest bestätigt Webers Hoffnung. Jetzt wird die Bergung der stabilen Dosis zum gemeinsamen Ziel.']},
  {id:'aschenrode',chapter:2,area:'VILLAGE_04',place:'ASCHENRODE',...outside('aschenrode'),title:'Rette Selma aus Aschenrode',reason:'Auf dem Weg zur Stadt treffen Noah und du auf eine verletzte Fahrerin. Die Probe ist kein Grund, sie zurückzulassen.',actor:person('SELMA',outside('aschenrode'),'survivorFemaleA'),reward:{ammo:30,medkit:1},secures:'VILLAGE_04',steps:[
    clear('Sichere den Zugang zu Selma',outside('aschenrode')),
    collect('Suche Verbandszeug im Wachhaus',{x:house('aschenrode').x,z:house('aschenrode').z+1},'medicine'),
    operate('treat','Versorge Selmas Verletzung',outside('aschenrode'),'medicine','Ich kann wieder gehen. Am Wachhaus haben die anderen einen Sammelpunkt. Begleitet mich bis zum Hoftor.'),
    escort('Begleite Selma zum Wachhaus',{x:house('aschenrode').x,z:house('aschenrode').z+13})],lines:['Selma ist versorgt und hat den Sammelplatz erreicht. Am Rasthof wartet ein beschädigter Krankenwagen.']},
  {id:'rest',chapter:2,place:'RASTHOF NORD',x:340,z:-590,title:'Mach den Krankenwagen einsatzbereit',reason:'Ninas Patienten kommen ohne ein repariertes Fahrzeug nicht zur Notaufnahme.',actor:person('NINA',{x:340,z:-590},'survivorFemaleA'),reward:{ammo:30,medkit:2},steps:[
    talk('Sprich mit Nina am Krankenwagen',{x:340,z:-590},'Der Anlasser ist hin. Im Rasthof liegt ein Ersatz. Holt ihn, dann können wir die Patienten zur Stadt bringen.'),
    collect('Durchsuche den Rasthof · Ersatzanlasser',room('rest'),'tools'),
    operate('repair','Baue den Ersatzanlasser ein',{x:340,z:-590},'tools'),
    defend('Schütze Nina beim Verladen der Patienten',{x:340,z:-590},18)],lines:['Nina kann ihre Patienten abtransportieren. Ada im Ostwerk braucht Hilfe beim Notstromnetz.']},
  {id:'industrial',chapter:2,area:'INDUSTRIAL_ZONE',place:'OSTWERK · INDUSTRIE',...outside('industry'),title:'Stelle mit Ada die Notversorgung her',reason:'Das Notstromnetz versorgt medizinische Geräte in der Stadt. Ada kann es reparieren, wenn du sie absicherst.',actor:person('ADA',outside('industry'),'survivorFemaleA'),reward:{ammo:30},secures:'INDUSTRIAL_ZONE',steps:[
    talk('Sprich mit Ada am Verteiler',outside('industry'),'Im Pförtnerhaus liegt die Leistungssicherung. Setze sie ein; dann kümmere ich mich um die Verkabelung.'),
    collect('Suche die Leistungssicherung im Pförtnerhaus',{x:house('industry').x,z:house('industry').z+1},'module'),
    operate('repair','Setze die Sicherung am Verteiler ein',outside('industry'),'switch'),
    defend('Decke Ada bei der Netzreparatur',outside('industry'),22)],lines:['Adas Notstromnetz läuft. Im Zentrum müssen noch Nachzügler zur Aufnahme gebracht werden.']},
  {id:'cityCentre',chapter:2,area:'MAIN_CITY',place:'OSTSTADT · ZENTRUM',...outside('city-centre'),title:'Befreie die Nachzügler im Zentrum',reason:'Helena kann den offenen Platz nicht allein verlassen. Bring sie zum Sammelpunkt, bevor ihr Weber aufsucht.',actor:person('HELENA',outside('city-centre'),'survivorFemaleA'),reward:{ammo:24,water:2},secures:'MAIN_CITY',steps:[
    clear('Sichere Helenas Fluchtweg',outside('city-centre')),
    talk('Hole Helena am Platz ab',outside('city-centre'),'Danke. Ich gehe mit euch zum Sammelpunkt am Rathaus. Danach findet ihr Weber in St. Anna.'),
    escort('Begleite Helena zum Sammelpunkt',{x:house('city-centre').x,z:house('city-centre').z+13}),
    talk('Sprich mit Helena am Sammelpunkt',{x:house('city-centre').x,z:house('city-centre').z+13},'Weber wartet in St. Anna am alten Stadtrand. Zeigt ihr das Ergebnis aus dem Außenlabor. Sie kennt den Zugang zur stabilen Dosis.')],lines:['Die Nachzügler sind in Sicherheit. Weber kann das Analyseergebnis in einen Bergungsplan übersetzen.']},
  {id:'suburbs',chapter:3,area:'CITY_SUBURBS',place:'LINDEN · STADTRAND',...outside('city-suburbs'),title:'Hilf der Krankenstation in Linden',reason:'Vor der langen Bergung braucht die Station Medizin. Weber hat euch einen noch zugänglichen Vorrat genannt.',actor:person('DANA',outside('city-suburbs'),'survivorFemaleA'),reward:{medkit:2,water:2},secures:'CITY_SUBURBS',steps:[
    talk('Sprich mit Dana an der Krankenstation',outside('city-suburbs'),'In der Wohnung stehen zwei medizinische Kisten. Holt beide, dann kann ich die Kranken weiter versorgen.'),
    collect('Durchsuche den vorderen Wohnraum · Medikamente',{x:house('city-suburbs').x+3,z:house('city-suburbs').z+2},'medicine'),
    collect('Durchsuche den hinteren Wohnraum · Infusionen',{x:house('city-suburbs').x,z:house('city-suburbs').z-3},'medicine'),
    operate('deliver','Versorge Dana mit den Medikamenten',outside('city-suburbs'),'medicine','Jetzt kann ich hier weitermachen. Jo an der Tankstelle baut eure mobile Kühlung. Er braucht Treibstoff aus seiner Garage.')],lines:['Lindens Krankenstation ist versorgt. Jo bereitet die mobile Kühlung für C-07 vor.']},
  {id:'fuelRoute',chapter:3,place:'TANKSTELLE BRÜCKENFELD',x:590,z:355,title:'Berge Treibstoff für die Kühlung',reason:'Die stabile Dosis braucht eine Kühlkette. Der benötigte Kanister liegt in der verlassenen Tankstellengarage.',reward:{ammo:18},steps:[
    collect('Durchsuche die Tankstellengarage · Treibstoff',room('fuel'),'fuel'),
    operate('repair','Fülle den mobilen Kühlgenerator',{x:590,z:355},'pump'),
    operate('switch','Teste die Kraftstoffpumpe',{x:593,z:355},'switch','Jo · Funk: Kraftstoff kommt an. Ich warte am Schleusenhaus in Brückenfeld. Wir schließen die Kühlanlage gemeinsam an.')],lines:['Treibstoff und Pumpe sind bereit. Jo wartet in Brückenfeld auf den gemeinsamen Anschluss.']},
  {id:'brueckenfeld',chapter:3,area:'VILLAGE_03',place:'BRÜCKENFELD',...outside('brueckenfeld'),title:'Baue mit Jo die Kühlanlage auf',reason:'Jo kennt die Anlage. Du bringst die Teile an und hältst ihm beim Anschluss den Rücken frei.',actor:person('JO',outside('brueckenfeld')),reward:{ammo:30},secures:'VILLAGE_03',steps:[
    talk('Besprich den Anschluss mit Jo',outside('brueckenfeld'),'Berge den Anschlussadapter aus dem Schleusenhaus. Danach setze ihn an die Kühlanlage und bleib bei mir.'),
    collect('Suche den Anschlussadapter im Schleusenhaus',{x:house('brueckenfeld').x,z:house('brueckenfeld').z+1},'module'),
    operate('repair','Setze den Adapter an der Kühlanlage ein',outside('brueckenfeld'),'cooler'),
    defend('Schütze Jo beim Anschluss der Kühlung',outside('brueckenfeld'),24)],lines:['Jos Kühlanlage läuft. Das Umspannwerk muss den letzten Anschluss freigeben.']},
  {id:'powerRoute',chapter:3,place:'UMSPANNWERK SÜD',x:1060,z:650,title:'Fahre das Umspannwerk wieder hoch',reason:'Die mobile Kühlung ist vorbereitet. Der Stromkreis zum Steinbruch muss in der richtigen Reihenfolge zugeschaltet werden.',reward:{ammo:24},steps:[
    clear('Sichere den Zugang zur Schalthalle',{x:1060,z:650}),
    operate('switch','Schalte in der Halle zuerst die Notversorgung ein',room('power',-3,0),'switch'),
    operate('switch','Schalte danach den Kühlkreis zu',room('power',3,0),'switch'),
    operate('switch','Gib den Außenanschluss zum Steinbruch frei',{x:1060,z:650},'switch','Mara · Funk: Der Kühlkreis steht. Im Steinbruch liegt der Transportbehälter. Bringt ihn unbeschädigt zur Klinik.')],lines:['Die Schaltfolge ist abgeschlossen. Der Steinbruch erhält Kühlstrom.']},
  {id:'quarry',chapter:3,area:'RIVER_VALLEY',place:'STEINBRUCH AUE',x:1040,z:160,title:'Berge den Kühlbehälter mit Otto',reason:'Otto kennt den Lagerraum und kann den schweren Behälter tragen. Sichere den Weg für die gemeinsame Bergung.',actor:person('OTTO',{x:1040,z:160}),reward:{ammo:30,medkit:1},steps:[
    talk('Sprich mit Otto an der Bergungsstelle',{x:1040,z:160},'Ich trage den Behälter zum Ladeplatz. Holt ihn zuerst aus der Halle und räumt den Zugang. Bleibt dann bei mir.'),
    collect('Durchsuche die Steinbruchhalle · Kühlbehälter W-07',room('quarry'),'cooler'),
    clear('Räume den Weg zum Ladeplatz',{x:1040,z:160}),
    escort('Begleite Otto mit W-07 zum Ladeplatz',room('quarry'))],lines:['W-07 wurde gemeinsam geborgen. Jetzt könnt ihr C-07 in der alten Klinik aufnehmen und den Konvoi rufen.']},
];
export const activityStep=(mission:ActivityDefinition,state?:ActivityProgress)=>mission.steps[state?.step??0];
export const securedAreas=(learned:readonly string[])=>STORY_ACTIVITIES.filter(m=>m.secures&&learned.includes(m.id)).map(m=>m.secures!);
export const reliefPressure=(risk:number,secured:boolean)=>({cap:Math.max(6,[12,22,32,40][risk]-(secured?4:0)),interval:[30,15,8,3.5][risk]+(secured?15:0)});
