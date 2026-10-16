# Storyüberarbeitung: Menschen, Macht und Verantwortung

## Verbindlicher Umfang

- Nachvollziehbarer Einstieg in Fichtenau: Elias war Evakuierungsfahrer, wurde nach dem Abbruch der Route aufgenommen und hilft zuerst im Lager. Pistole und Axt erhielt er beim Ankommen; Jonas prüft ihre Funktion mit ihm.
- Der vorhandene mechanische Einstieg und alle Dörfer, Stadtgebiete, Außenorte und Safehouses bleiben Teil der Welt.
- Sieben gespeicherte Entscheidungen verändern spätere Aufgaben, medizinische Hilfe, Angriffe, Bündnisse oder Noahs Schicksal. Entscheidungen zeigen ihre absehbaren Folgen; keine automatisch vorausgewählte Antwort.
- Der Bürgerbund und die Eichenwache entstehen zunächst als nachvollziehbare Interessengruppen. Der offene Krieg beginnt erst nach dem Labortest und dem Rasthof. Er muss durch bewaffnete Menschen, Deckung, gegenseitigen Beschuss und veränderte Einsatzgegner tatsächlich spielbar sein.
- Drei vorbereitete Wendungen: Maras vermeintlich aktueller Konvoi ist eine alte Aufnahme; Noah ist infizierter freiwilliger Versuchsteilnehmer; Rauchs gefälschte Befehle haben einen bereits echten Versorgungskonflikt eskalieren lassen. Keine dieser Erkenntnisse entschuldigt die früheren Entscheidungen der Beteiligten.
- Mara hat Ben auf einer Evakuierungsliste zurückgestellt. Seine bestehende freiwillige Suche erhält dadurch eine persönliche Bedeutung. Noah erhält eine Stimme und Zustimmung bei der Entscheidung über seine Behandlung.
- Unterschiedliche Enden zeigen Noahs Schicksal, die medizinische Versorgung, die Herrschaft über die Wege und Maras Verhältnis zu Ben. Die Schlusslage muss aus gespeicherten Entscheidungen entstehen und nach dem Laden gleich bleiben.

## Aufbau

1. Fichtenau: aufnehmen, verbinden, üben, Wasser, Funk, erstes gemeinsames Dach. Keine Fraktionskrieg-Erklärung zu Beginn.
2. Waldsee bis Markt: persönliche Hilfseinsätze; Eva entscheidet mit dem Spieler, welcher Gruppe sie hilft. Werkzeug, Nahrung und Rückzugsorte geben dem Weg einen Zweck. Noah wird als Mensch gerettet.
3. Höfe bis Radar: Lebensmittel zwischen Dorfküchen und Lazarett verteilen. Hanna und Ralf erklären die Ansprüche ihrer Gruppen. Offener oder verschlüsselter Funk verändert spätere Einsätze. Erst am Radar fällt die alte Aufnahme auf.
4. Fort und Außenlabor: medizinische Kontrolle und Versorgung stehen gegen Misstrauen. Noahs Probe bestätigt eine behandelbare Infektion, keine sofortige Wunderheilung. Der Spieler entscheidet mit ihm über Offenheit.
5. Rasthof und Ostwerk: aus Drohungen wird ein bewaffneter Konflikt. Versorgung der Unterkünfte, des Sanitätswegs oder einer unabhängigen Aufnahme verändert Deckung und Gegner.
6. Archiv bis Brückenfeld: ein Originalbefehl erklärt die Manipulation, ohne den bisherigen Krieg wegzuerklären. Das Schutzabkommen kann einer Seite gelten oder als schwierige gemeinsame Operation ausgehandelt werden.
7. Steinbruch, Klinik, Sender: Bergung und persönlicher Abschied. Aktive Dosis für Noah oder vollständige Kultur; anschließend eine durch das Bündnis veränderte Verteidigung und Evakuierung.

## Abschlussnachweise

Reine Dialogtexte reichen nicht für Entscheidungen oder den Krieg. Erforderlich sind verzweigte Aufgaben im laufenden Spiel, echte menschliche Kämpfer und gegenseitiger Schaden, dauerhafte Entscheidungen, Ladetests laufender Entscheidungen und Kämpfe sowie geprüfte Endvarianten. Vor Abschluss werden Einstieg, alle Entscheidungsstellen, beide Fraktionsseiten, das Schutzabkommen und beide medizinischen Ausgänge im Browser kontrolliert. Vorhandene Nachtjäger-, Inventar- und Weltänderungen dürfen dabei nicht verloren gehen.

## Geprüft am 16. Oktober 2026

- `scripts/browser-story.js` und `browser-story-ending.js`: alle 49 Missionen bis zum gespeicherten Sieg, alle 13 Regionsgebiete und zwölf Außenorte; tatsächliches Behandeln, Suchen, Reparieren, Bauen, Begleiten und Kämpfen. Die QA-Schnittstelle verkürzt Reisewege; sie setzt keine Missionsabschlüsse oder Gegnerschäden direkt.
- `scripts/browser-narrative.js`: alle 16 Antworten an sieben Entscheidungsstellen; ungelöste Entscheidung nach Seitenneuladen; drei Fraktionswege mit tatsächlichem Beschuss, Verteidigung und gespeichertem Kampf; beide Verhandlungen des Schutzabkommens; beide medizinischen Ausgänge mit realer Endverteidigung und erneut geladenem Sieg. Varianten starten aus isolierten, vom normalen Parser geladenen Testspeicherständen.
- `scripts/browser-story-branches.js`: Notküche nach Lazarettlieferung, öffentlicher Kanal nach verschlüsseltem Funk, getrennter Behandlungsplatz nach geheimem Befund und Patientenbehandlung nach Evas Waldhilfe sind erreichbar und per Spielinteraktion abschließbar. Evas Vorbereitung verringert die tatsächlich erzeugte Gegnergruppe.
- `scripts/browser-story-visual.js`: Evakuierungsbus am Start und getrennt lesbare Antwort-/Folgetexte. Aufnahmen liegen unter `output/playwright/`.
- `npm run check:story`: alle 288 Kombinationen, später Beginn des Kriegs, konkrete Aufgabenfolgen, Bündnisse und Endtexte; tatsächlicher gegenseitiger Gewehrschaden, Sichtblockierung, Wegsuche und gespeicherte Kämpfer.
- Speicherprüfungen decken Entscheidungen, offene Auswahl, beschädigte Kämpfer, alte Spielstände und ungültige Daten ab. Die Prüfungen für Safehouses, Innenräume, Inventar, Regionsroute, Siedlungen, Nachtregeln und alle sechs Zombieanimationen bestehen weiterhin.

Beim vollständigen Durchspielen wurde ein Hängenbleiben der Stadtbegleitung korrigiert: Wegsuche und Bewegung verwenden nun denselben Wandabstand. Die gesamte Route wurde danach erneut erfolgreich durchgespielt. Fraktionsmodelle verwenden vorhandene Überlebenden-Skins; die Armbinden unterscheiden ihre Zugehörigkeit. Das Journal verrät die Befehlsfälschung erst nach der Archivszene.
