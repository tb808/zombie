export type Dialogue = { speaker: string; lines: string[]; index: number };

export const NIGHT_HUNTER_WARNING = 'Noch eine Warnung für den Weg nach Norden und in die Oststadt: Dort jagen ab 19 Uhr Nachtjäger. Sie sind schneller als Hetzer und halten mehr aus als Brecher.';
export const NIGHT_HUNTER_ADVICE = 'Du erkennst sie an den hellen Schulterdornen, langen Klauen und orange leuchtenden Augen und Rippen. Kämpfe möglichst bei Tag; nachts bieten aktive UV-Lampen Schutz.';

// German sentence boundaries preserve abbreviations such as „Dr. Weber“.
export function subtitleLines(text: string | readonly string[]): string[] {
  const sentences = typeof text === 'string'
    ? Array.from(new Intl.Segmenter('de', { granularity: 'sentence' }).segment(text), part => part.segment.trim())
    : [...text];
  return sentences.flatMap(sentence => {
    const lines: string[] = [];
    let line = '';
    for (const word of sentence.split(/\s+/)) {
      if (line && line.length + word.length + 1 > 170) { lines.push(line); line = ''; }
      line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    return lines;
  });
}

export const MARA_INTRO = [
  'Elias. Du bist wach. Wir haben dich gestern an deinem abgestellten Evakuierungsbus gefunden. Das hier ist Fichtenau. Der Weg zur Stadt ist gesperrt.',
  'Du hast die letzten Fahrgäste zu Fuß weitergeschickt, bevor der Tank leer war. Einige sind hier angekommen. Die anderen fehlen noch. Wir suchen sie gemeinsam.',
  'Ich bin Mara. Ich habe die Abholung organisiert. Jetzt halte ich dieses Funkgerät am Leben. Heute kümmern wir uns erst einmal um die Menschen, die vor uns stehen.',
  'Zuerst brauchen wir Funkkontakt. Der Generator unseres Lagers ist leer. Im Fichtenauer Holzlager liegt eine Brennstoffzelle. Bring sie zu mir zurück.',
  'Hier ist die Karte der ganzen Region. Öffne sie mit M. Die Brennstoffzelle liegt noch hier im Dorf; das Missionszeichen führt dich immer zum nächsten Schritt.',
  'Nimm die Verbände neben dem Lager. Jonas hat sich am Arm verletzt; versorge ihn mit E. Trink danach von deinem Wasser, bevor du aufbrichst.',
  'Jonas gab dir gestern die Pistole und die Axt aus dem Bus. Prüfe beide an seiner Scheibe. Seit dem Überfall traue ich keiner Ausrüstung, die niemand angesehen hat.',
  'Ich bleibe am Funkgerät. Sichere die Forstunterkunft, bevor du weiterziehst. In jedem Gebiet steht ein Haus, dessen Fenster, Türen und Schlafplatz du selbst sichern kannst.',
  'Tore öffnen sich mit E am rechten Pfosten. Verlasse das Lager durch das südliche Tor. An den Häusern verbrauchst du Bretter für Fenster, Ersatzteile für Türen und eine Ration für das Bett.',
] as const;
