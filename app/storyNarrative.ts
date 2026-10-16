import { STORY_ACTIVITIES, type ActivityDefinition, type ActivityStep } from './storyActivities.ts';
import { factionEnemy, type ChoiceId, type NarrativeState, type Faction } from './narrative.ts';
const s=(kind:ActivityStep['kind'],label:string,p:{x:number;z:number},extra:Partial<ActivityStep>={}):ActivityStep=>({kind,label,...p,...extra});
const choice=(id:ChoiceId,m:ActivityDefinition)=>s('choice','Besprich mit den Helfern, wie es weitergeht',m,{choice:id});
export function resolveActivity(base:ActivityDefinition,n:NarrativeState):ActivityDefinition{
  const m={...base,steps:base.steps.map(step=>({...step}))};
  const steps=[...m.steps],p={x:m.x,z:m.z};
  if(m.id==='seecamp'){
    steps[0].lines=['Du bist der Fahrer, den Mara gefunden hat? Ich bin Eva. Wir haben die Menschen aus den abgestellten Bussen hierhergebracht.','Ninas Patienten warten am Rasthof. Ich kann mit dem Bein aber nicht einmal bis zur Hütte laufen. Dort steht der rote Sanitätskoffer.'];
    steps[2].lines=['Das hält. Danke, Elias. Du hast mich zuerst gefragt, wo es weh tut. Seit der Sperre fragt sonst jeder nur, ob ich noch gehen kann.','Ich kann Nina helfen oder bei Toms Vermisstensuche bleiben. Für beide Wege reicht meine Kraft heute nicht.'];
    steps.push(choice('care',m));
  }
  if(m.id==='oldMarket')steps[2].lines=['Die Kisten sind da. Die Kinder teilen die letzte Dose noch in Deckel auf. Danke, dass du nicht einfach daran vorbeigegangen bist.','Noah blieb am Friedhof zurück. Er nahm die Menschen ohne Papiere mit, als die Wache unsere Busse anhielt. Er würde sagen, es sei nur ein Umweg gewesen.'];
  if(m.id==='jaeger'&&n.choices.care==='scouts'){steps[0].count=2;steps[2].lines=['Eva hat den Zugang markiert und einen der Verfolger abgelenkt. Ohne sie wären wir hier viel länger festgesessen.','Nimm mein Werkzeug mit zum Mühlenhof. Oskar wartet am Wiesenhof auf einen sicheren Weg.'];}
  if(m.id==='birkenhof'){
    steps[3].lines=['Auf den Kisten stehen zwei Abholmarken: Hannas Dorfküchen und Ralfs Lazarett im Fort. Jemand hat die Lieferung doppelt versprochen.','Noah: Wer die Kiste bekommt, gewinnt Vertrauen. Wer sie nicht bekommt, bleibt trotzdem hungrig. Wir müssen es selbst sagen.'];
    steps.push(choice('supplies',m));
  }
  if(m.id==='kornweiler'){
    steps[0].lines=n.choices.supplies==='medics'?['Du hast die Lebensmittel ins Fort geschickt. Ich weiß, dass dort auch Verwundete liegen. Hier zählt seit gestern jedes Kind die Portionen.','Hilf uns wenigstens, den Schlafraum und die Aufnahme fertig zu machen. Dann rede ich wieder von Plänen.']:['Die Lebensmittel sind angekommen. Die Leute nennen unsere Küchen inzwischen Bürgerbund. Ich wollte eigentlich nur, dass niemand allein essen muss.','Die Wache nennt es unerlaubte Verteilung. Sichere erst das Gemeindehaus. Danach helfen wir den Menschen an der Kirche.'];
    if(n.choices.supplies==='medics')steps.push(s('repair','Richte Hannas zusätzliche Notküche ein',{x:m.x+2,z:m.z+2},{prop:'pump'}),s('talk','Melde Hanna die fertige Notküche',p,{speaker:'HANNA',lines:['Das ersetzt die Lebensmittel nicht. Aber heute muss wenigstens niemand im Regen warten.','Ralf ist kein Unmensch. Ich kenne die Gesichter auf seiner Liste. Die Menschen, die nicht daraufstehen, kenne ich auch.']}));
  }
  if(m.id==='radar'){
    steps[2].lines=['Ivo: Maras Konvoispruch läuft ein zweites Mal durch. Gleiche Pausen. Gleiches Störgeräusch. Elias, das ist eine Aufnahme von vor vier Tagen.','Mara · Funk: Ich weiß. Seit gestern weiß ich es. Ich habe weitergesendet, weil Fichtenau sonst wieder auseinandergegangen wäre. Das war nicht meine Entscheidung für euch.','Noah: Dann bauen wir einen wirklichen Weg nach draußen. Ralf hat Fahrzeuge im Fort, Weber eine Krankenstation. Keine Stimme aus einem alten Band.'];steps[2].reveal='convoy';
    steps.push(choice('signal',m));
  }
  if(m.id==='fortRoute'){
    steps[0].lines=n.choices.supplies==='medics'?['Die Lebensmittel sind angekommen. Seidel hat den Sanitätsweg für euch freigegeben. Ich teile, was ich habe.','Die Eichenwache hält die Straße. Aber Rauchs Leute behandeln jede fehlende Abholmarke inzwischen wie einen Angriff. Ich brauche euch lebend im Labor.']:['Hannas Küchen haben eure Lebensmittel bekommen. Bei mir liegen Wachen, die genau diese Küchen vor der Horde schützen sollten.','Ich gebe euch trotzdem das Kühlmodul. Helft vorher beim Notfallpaket für unser Lazarett. Wir lassen die Verwundeten nicht für ihren Kommandanten bezahlen.'];
    if(n.choices.supplies!=='medics')steps.push(s('collect','Berge das Notfallpaket für Ralfs Lazarett',steps[2],{prop:'medicine'}),s('deliver','Übergib Ralf die versprochene Hilfe',p,{speaker:'RALF',lines:['Danke. Seidel muss lernen, dass Hilfe kein Treueeid ist. Vielleicht hört er das eher von jemandem, der von draußen kommt.']}));
    if(n.choices.signal==='open')steps.push(s('talk','Beantworte Ralfs Fragen zum offenen Kanal',p,{speaker:'RALF',lines:['Eure offenen Meldungen haben Menschen hergeführt. Rauchs Leute schreiben jetzt jedes Wort mit.','Ich lasse euch trotzdem ins Labor. Aber beantwortet keine Abholfragen über diesen Kanal.']}));
  }
  if(m.id==='research'){
    steps[3].lines=['Noah: Die Probe ist stabil. Es ist mein Blut. Ich war freiwillig bei Lazarus, bevor aus den Untersuchungen eine Abriegelung wurde. Seit der Evakuierung bin ich infiziert.','C-07 bremst den Verlauf. Es ist keine Wunderheilung. Weber braucht eine Stammkultur, um daraus verlässlich Behandlungen herzustellen.','Ich habe es verschwiegen, weil ich für die Wache nur noch ein Risiko war. Ich wollte noch einmal als Mensch irgendwo ankommen. Wenn wir es den Helfern sagen, möchte ich selbst sprechen.'];steps[3].reveal='noah';
    steps.push(choice('truth',m));
  }
  if(m.id==='aschenrode')steps[2].lines=['Selma: Du bist aus Fichtenau? Mara hat damals die Namen am Bus abgehakt. Ihr Bruder Ben stand noch draußen. Dann kam der Befehl, die Türen zu schließen.','Sie hat nicht weggesehen. Sie hat mich angeschaut. Ich wünschte fast, sie hätte weggesehen.','Danke für den Verband. Ich kann gehen. Bring mich erst zum Wachhaus; Geschichten kann man auch erzählen, wenn man wieder atmen kann.'];
  if(m.id==='rest'){
    m.title=n.choices.signal==='open'?'Rette die Krankenstation aus dem Überfall':'Bring Ninas Patienten durch die Sperre';
    m.reason='Zwischen Bürgerbund und Eichenwache fallen die ersten Schüsse. Die Patienten gehören keiner Front.';
    steps[0].lines=n.choices.care==='clinic'?['Eva ist angekommen. Ohne sie hätte ich zwei Menschen verloren. Sie bereitet die Patienten vor, während du den Wagen reparierst.','Auf der Straße schießen Leute mit den gleichen Armbinden aufeinander. Ich kann die Verletzten nicht nach Farben sortieren.']:['Eva blieb bei den Suchtrupps. Ich verstehe das. Hier liege ich seit Stunden mit dem Ohr am Atem einer Patientin.','Hol zuerst die Ersatzteile. Danach brauche ich deine Hilfe am Tragetisch, bevor wir jemanden verladen können.'];
    steps[3]=s('war',n.choices.signal==='open'?'Halte die bewaffneten Angreifer von den Patienten fern':'Öffne den Sanitätsweg durch die bewaffnete Sperre',p,{opposition:'cinder',allies:['wardens','union'],count:(n.choices.signal==='open'?4:3)-(n.choices.care==='clinic'?1:0),reveal:'war'});
    steps.push(s(n.choices.care==='clinic'?'deliver':'treat',n.choices.care==='clinic'?'Hilf Eva beim Verladen der versorgten Patienten':'Versorge mit Nina die zurückgebliebenen Patienten',p,{prop:'medicine',speaker:'NINA',lines:['Hanna sagt, die Wache habe die Küchen ausgehungert. Seidel sagt, der Bürgerbund habe seine Verwundeten beraubt. Die Menschen hier haben beide Geschichten am Körper.','Mara: Ich habe Ben auf der Liste zurückgestellt, damit die Kinder zuerst hinein konnten. Ich habe mir gesagt, dass noch ein Bus käme. Seitdem höre ich Aufnahmen länger zu als Menschen.','Noah: Dann hören wir heute auf Nina. Erst die Patienten, dann die Fahnen.']}));
  }
  if(m.id==='industrial'){
    steps[0].lines=['Ada: Der Verteiler speist Dorfunterkünfte und Sanitätsstraße. Hanna und Seidel verlangen beide, dass ich die andere Leitung abschalte.','Die Angriffe am Rasthof haben alles beschleunigt. Wähle eine Leitung, bevor ich unter Spannung arbeite. Du wirst die Leute schützen müssen, die dadurch zu uns kommen.'];
    // Put the decision before the work. Old activity cursors are migrated by key.
    steps.splice(1,0,choice('front',m));
    const allegiance=n.choices.front??'hospital',allies:Faction[]=allegiance==='hospital'?['union','wardens']:[allegiance==='wardens'?'wardens':'union'];
    steps[4]=s('war','Decke Ada und den gewählten Anschluss',p,{opposition:allegiance==='hospital'?'cinder':allegiance==='wardens'?'union':'wardens',allies,count:3,seconds:allegiance==='hospital'?26:18});
  }
  if(m.id==='cityCentre'){
    const side=n.choices.front??'hospital';
    m.title=side==='wardens'?'Öffne die Quarantäneaufnahme für Helena':side==='union'?'Bring Helena durch die Bürgerbund-Linie':'Richte einen unabhängigen Aufnahmeweg ein';
    const allies:Faction[]=side==='hospital'?['union','wardens']:[side==='wardens'?'wardens':'union'];
    steps[0]=s('war',side==='wardens'?'Sichere die Aufnahme gegen eine bewaffnete Miliz':side==='union'?'Durchbrich die bewaffnete Straßensperre':'Schütze den neutralen Sammelpunkt',p,{opposition:side==='wardens'?'union':side==='union'?'wardens':'cinder',allies,count:3});
    if(n.choices.signal==='coded')steps.splice(1,0,s('switch','Öffne den öffentlichen Hilfskanal am Rathaus',{x:p.x+2,z:p.z+2},{prop:'radio',lines:['Helena: Wir haben eure Stimmen nicht gehört. Zwei Tage lang dachten wir, es gebe auf der anderen Seite niemanden mehr.','Jetzt können die Familien antworten. Eine sichere Leitung ist wertvoll. Eine erreichbare manchmal auch.']}));
    if(n.choices.truth==='open')steps.splice(1,0,s('talk','Erkläre der Aufnahme Noahs Schutzmaßnahmen',p,{speaker:'HELENA',lines:['Die Wache hat Noahs Befund. Die Helfer haben seine Erklärung. Bevor wir weitergehen, stimmen wir Abstand, Handschuhe und die getrennte Krankenaufnahme ab.','Noah: Ich beantworte ihre Fragen selbst. Bleib einfach hier, bis sie fertig sind.']}));
    steps[steps.length-1].lines=['Helena: Weber ist in St. Anna. Ich gehe zur Aufnahme, auch wenn mir die Fahne über dem Eingang nicht gefällt.','Die Stadt wartet nicht auf ein Wunder. Sie wartet darauf, dass jemand zurückkommt und hält, was er gesagt hat.'];
  }
  if(m.id==='suburbs')steps[0].lines=n.choices.truth==='open'?['Dana: Noah hat mit uns gesprochen. Wir wissen, was wir riskieren, und haben den hinteren Raum vorbereitet. Danke, dass wir entscheiden durften.','Hol die medizinischen Kisten. Keine von uns muss deswegen aufhören, einem Menschen Wasser zu bringen.']:['Dana: Weber hat Noahs Befund geschickt. Ich habe ihn umarmt, bevor ich ihn kannte. Nicht die Infektion macht mich wütend. Dass ihr mir die Entscheidung genommen habt.','Hol die medizinischen Kisten. Ich helfe ihm trotzdem. Aber hör diesmal zu, bevor du für mich entscheidest.'];
  if(m.id==='suburbs'&&n.choices.truth==='private')steps.splice(3,0,s('repair','Bereite mit Dana den fehlenden getrennten Behandlungsplatz vor',{x:p.x+2,z:p.z+2},{prop:'module'}));
  if(m.id==='brueckenfeld'){
    steps[0].lines=['Jo: Weber hat den Originalbefehl übertragen. Rauch gab zivile Hilferufe als Angriffssignale aus. Seidel ließ die Sperren stehen, Hanna antwortete mit bewaffneten Trupps.','Das Papier macht ihre Entscheidungen nicht ungeschehen. Aber es gibt uns etwas, das beide Seiten prüfen können. Entscheide, wer die letzte Bergung schützt.'];
    steps.splice(1,0,choice('pact',m));
    const truce=n.choices.pact==='truce',ally=n.choices.pact==='wardens'?'wardens':'union';
    steps[4]=s('war',truce?'Halte den gemeinsamen Kühlposten gegen Rauchs Trupps':'Schütze die Kühlung mit deiner verbündeten Fraktion',p,{opposition:factionEnemy(n),allies:truce?['union','wardens']:[ally],count:3,seconds:truce?28:18});
    if(truce){steps.splice(2,0,s('talk','Bestätige Hannas Seite des Abkommens',{x:p.x+2,z:p.z-2},{speaker:'HANNA · FUNK',lines:['Hanna: Ein Eingang wird von uns gehalten, der andere von der Wache. Die Patienten bleiben außerhalb ihrer Namenslisten.','Seidel bekommt keine Vergebung von mir. Aber ich schicke heute niemanden los, um sie mit einer Kugel einzufordern.']}),s('talk','Bestätige Seidels überprüfbare Zusage',{x:p.x+2,z:p.z+2},{speaker:'SEIDEL · FUNK',lines:['Seidel: Keine Abholung nach Uniform. Bürgerbund und Wache melden ihre Fahrzeuge offen. Ralf prüft die Plätze mit Hanna.','Ich habe Rauchs Meldungen nicht hinterfragt. Diesen Befehl unterschreibe ich mit meinem Namen. Ihr dürft ihn gegen mich verwenden.']}));}
  }
  if(m.id==='quarry')steps[0].lines=['Otto: Der Behälter ist schwer, aber die Kühlung steht. Ich trage ihn, du hältst den Weg frei.','Noah ist still geworden. Frag ihn an der Klinik, was er braucht. Er hat lang genug für andere gesprochen.'];
  return {...m,steps};
}
export const resolvedActivities=(n:NarrativeState)=>STORY_ACTIVITIES.map(m=>resolveActivity(m,n));
export const STORY_EXTRA_POINTS=[{x:47,z:21.4},{x:48,z:21.5},...STORY_ACTIVITIES.filter(m=>['cityCentre','brueckenfeld','kornweiler'].includes(m.id)).flatMap(m=>[{x:m.x+2,z:m.z+2},{x:m.x+2,z:m.z-2}])];
