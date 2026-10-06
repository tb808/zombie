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
  'Elias. Gut, dass du lebst. Seit gestern Abend ist Tannwald abgeriegelt.',
  'In der alten Klinik lief Projekt Lazarus. Dr. Falk arbeitete dort an einem Virus.',
  'Als die Versuche außer Kontrolle gerieten, verweigerte er den Abbruch. Die Infektion gelangte nach draußen.',
  'Dann fielen die Sirenen aus. Die Evakuierungsbusse fuhren direkt in die Sperrzone.',
  'Viele Menschen wurden infiziert. Sie greifen uns an und folgen Geräuschen. Sei draußen so leise wie möglich.',
  'Wir haben die Rangerstation gesichert. Auch in der Oststadt und am Birkenrain halten sich noch Überlebende.',
  'Dr. Weber konnte eine stabile Dosis Gegenmittel im Laborcontainer der alten Klinik sichern. Die müssen wir zum Konvoi bringen.',
  'Aber unser Generator ist leer. Die Brennstoffzelle liegt auf dem verlassenen Markt. Vorher nehmen wir uns Zeit für deine Ausrüstung.',
  'Pack den Verband am Lager ein, trink etwas und übe an der roten Zielscheibe neben Jonas. Ziele mit der rechten Maustaste, lade mit R nach und teste mit Q die Axt.',
  'Such danach Noah am alten Friedhof. Er kennt das Labor und soll dich zum Funkturm begleiten.',
  'Hier, nimm meine Karte. Sie zeigt ganz Tannwald: die Oststadt, den Birkenrain und unsere Unterschlüpfe.',
  'Öffne sie mit M. Mit dem Mausrad oder Plus und Minus kannst du zoomen; mit gedrückter Maus verschiebst du sie.',
  'Am Dorfrand steht ein begehbares Forsthaus. Räumt es, vernagelt die vier Fenster mit je zwei Brettern und verstärkt beide Türen mit je einem Ersatzteil.',
  'Eine Ration am Bett macht daraus einen Schlafplatz. Aktiviere ihn als Unterschlupf und Respawnpunkt. Geschlossene Türen schützen euch; nachts könnt ihr bis zum Morgen schlafen.',
  'Weitere Häuser zum Sichern findest du in der Feuerwache, im Lindenhof und am Hof Birkenrain. Dr. Weber und Lenz helfen euch danach mit Laborzugang und Strom.',
  'Bring Noah und das Gegenmittel zum Funkturm 07. Wenn der Sender läuft, kann uns der Konvoi finden.',
] as const;
