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
  'Elias. Die Sperrzone ist dicht, aber Konvoi 2 fährt noch außerhalb von Tannwald. Wenn wir ihn erreichen, kann er uns abholen.',
  'Dr. Falk ließ seine Versuche in der alten Klinik weiterlaufen, obwohl der Abbruch befohlen war. Seitdem sind die Straßen voller Infizierter.',
  'Dr. Weber konnte eine stabile Dosis Gegenmittel retten. Unser Ziel ist klar: Wir bringen sie und die Überlebenden zum Konvoi.',
  'Zuerst brauchen wir Funkkontakt. Der Generator der Station ist leer; auf dem verlassenen Markt liegt eine Brennstoffzelle. Bring sie zu mir zurück.',
  'Hier ist meine Karte. Öffne sie mit M, damit du den Markt findest. Das Missionszeichen zeigt immer den nächsten Schritt unseres Plans.',
  'Nimm den Verband neben dem Lager und trink von deinem Wasser. Draußen musst du deine Wunden selbst versorgen können.',
  'Jonas hat eine Pistole und eine Axt für dich bereitgelegt. Prüfe beide an seiner Scheibe, bevor du aufbrichst. Infizierte folgen Schüssen; die Axt ist leiser.',
  'Ich bleibe am Funkgerät. Sobald du die Zelle zurückbringst, hören wir, wer draußen noch lebt – und wo wir als Nächstes gebraucht werden.',
] as const;
