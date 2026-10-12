export type Dialogue = { speaker: string; lines: string[]; index: number };

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
  'Elias. Wir sind in Fichtenau, dem entferntesten Dorf von der Oststadt. Konvoi 2 fährt noch außerhalb der Sperrzone. Wenn wir ihn erreichen, kann er uns abholen.',
  'Dr. Falk ließ seine Versuche in der alten Klinik weiterlaufen, obwohl der Abbruch befohlen war. Seitdem sind die Straßen voller Infizierter.',
  'Dr. Weber konnte eine stabile Dosis Gegenmittel retten. Unser Ziel ist klar: Wir bringen sie und die Überlebenden zum Konvoi.',
  'Zuerst brauchen wir Funkkontakt. Der Generator unseres Lagers ist leer. Im Fichtenauer Holzlager liegt eine Brennstoffzelle. Bring sie zu mir zurück.',
  'Hier ist die Karte der ganzen Region. Öffne sie mit M. Die Brennstoffzelle liegt noch hier im Dorf; das Missionszeichen führt dich immer zum nächsten Schritt.',
  'Nimm den Verband neben dem Lager und trink von deinem Wasser. Draußen musst du deine Wunden selbst versorgen können.',
  'Jonas hat eine Pistole und eine Axt für dich bereitgelegt. Prüfe beide an seiner Scheibe, bevor du aufbrichst. Infizierte folgen Schüssen; die Axt ist leiser.',
  'Ich bleibe am Funkgerät. Sichere die Forstunterkunft, bevor du weiterziehst. In jedem Gebiet steht ein Haus, dessen Fenster, Türen und Schlafplatz du selbst sichern kannst.',
  'Tore öffnen sich mit E am rechten Pfosten. Verlasse das Lager durch das südliche Tor. An den Häusern verbrauchst du Bretter für Fenster, Ersatzteile für Türen und eine Ration für das Bett.',
] as const;
