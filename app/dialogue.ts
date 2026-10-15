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
  'Elias. Willkommen in Fichtenau. Die Menschen hier brauchen Wasser, Verbände und einen sicheren Platz für die Nacht. Packen wir zuerst hier an.',
  'Die Straßen sind voller Infizierter. Zwischen den Dörfern sind noch Menschen gestrandet. Wir helfen ihnen Schritt für Schritt.',
  'Dr. Weber behandelt die Kranken in der Stadt. Über ihre Arbeit wissen wir bisher wenig. Zuerst verbinden wir die Helfer und sichern unsere Rückzugsorte.',
  'Zuerst brauchen wir Funkkontakt. Der Generator unseres Lagers ist leer. Im Fichtenauer Holzlager liegt eine Brennstoffzelle. Bring sie zu mir zurück.',
  'Hier ist die Karte der ganzen Region. Öffne sie mit M. Die Brennstoffzelle liegt noch hier im Dorf; das Missionszeichen führt dich immer zum nächsten Schritt.',
  'Nimm die Verbände neben dem Lager. Jonas hat sich am Arm verletzt; versorge ihn mit E. Trink danach von deinem Wasser, bevor du aufbrichst.',
  'Jonas hat eine Pistole und eine Axt für dich bereitgelegt. Prüfe beide an seiner Scheibe, bevor du aufbrichst. Infizierte folgen Schüssen; die Axt ist leiser.',
  'Ich bleibe am Funkgerät. Sichere die Forstunterkunft, bevor du weiterziehst. In jedem Gebiet steht ein Haus, dessen Fenster, Türen und Schlafplatz du selbst sichern kannst.',
  'Tore öffnen sich mit E am rechten Pfosten. Verlasse das Lager durch das südliche Tor. An den Häusern verbrauchst du Bretter für Fenster, Ersatzteile für Türen und eine Ration für das Bett.',
] as const;
