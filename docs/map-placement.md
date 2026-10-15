# Platzierung und Straßenraum

Die gesamte Karte verwendet einen gemeinsamen Straßenplan in `app/streetPlan.ts`. Er umfasst die regionalen Routen, das alte Stadtgitter, die gedrehte Dorfstraße und die Zufahrten der ursprünglichen Karte. Darstellung, Requisiten, Vegetation und Prüfungen verwenden dieselben Abstände.

## Straßen und Gehwege

Stadtstraßen und die alten Ortsstraßen erhalten beidseitig 3,2 Meter breite Gehwege. Die vier Dorfkerne erhalten 2,8 Meter breite Gehwege auch an ihren durchgehenden Hauptstraßen. Außerhalb bebauter Orte haben asphaltierte Straßen schmale Bankette; Feld- und Waldwege behalten ihre unbefestigte Oberfläche.

`streetGeometry.ts` schneidet Gehwege, Bordsteine und Bankette gegen sämtliche Fahrbahnen, einschließlich anderer Abschnitte derselben Straße. Ergänzungen schließen die Gehwege an engen Kurven. An Kreuzungen bleiben Bordsteine für ebene Übergänge unterbrochen. Mittellinien halten Abstand zu einmündenden Straßen. `groundSurface.ts` schneidet Asphalt und Wege zusätzlich entlang der tatsächlichen Geländedreiecke; so scheint an Hängen kein Boden durch die Oberflächen. Die Geometrie wird vor dem Erzeugen der Three.js-Geometrien je Material und Kartenabschnitt zusammengefasst.

Die Straße am alten Friedhof ist durch einen Fußzugang zum Tor und Mausoleum ersetzt. Die alte Klinikzufahrt verläuft östlich der Gebäude. Die Forststraße umgeht den Birkenrain-Hof und das Waldcamp. Das Fort besitzt passende Öffnungen für Hauptzufahrt und Radarstraße. Zusätzliche Randbreite der Brückendecks hält auch die Kurvenränder über dem Wasser begehbar.

## Gebäude und Alltagsobjekte

`legacyLayout.ts` enthält alle 15 ursprünglichen GLB-Gebäude mit ihren vollständigen Modellhüllen. Zurückgesetzte Dorfhäuser und kleinere Klinikbauten lassen Platz für Gehwege und den Versorgungshof. Die Fundamente berücksichtigen Dachüberstände und außermittige Modellursprünge. Sie werden über die gesamte Standfläche eingeebnet.

Requisiten werden mit ihrer vollständigen gedrehten Hülle gegen Fahrbahnen und Gehwege geprüft. Laternen, Bänke, Schilder und Parkplätze stehen außerhalb der freien Gehfläche. Laternen halten mindestens 18 Meter Abstand zueinander; nach einer Landstraße beginnt der Abstandszähler im Ort neu. Hauswege entstehen vor der Dekoration. Wenn eine direkte Verbindung blockiert ist, wird ein Weg um vorhandene Gebäude gesucht; die Planung verwendet dafür tatsächliche Gebäudeflächen. Alle regionalen Gebäude besitzen einen mit der Straße verbundenen Zugang. Die sechs Haltestellen haben jeweils einen zur Straße geöffneten Unterstand, ein Haltestellenschild und eine eigene gepflasterte Standfläche.

Die ursprünglichen Straßenlaternen an Querstraßen wurden durch die gemeinsame Planung ersetzt. Alte Stadtfahrzeuge stehen in reservierten Parkflächen. Die Bahnhofswagen stehen vollständig im Gleisbereich. Silos, Transformatoren, Wachposten, Steinbruchterrassen und weitere feste Anlagen besitzen reservierte Flächen und passende Spielkollisionen; Vegetation und Siedlungsdetails halten diese Bereiche frei. Versetzte Silos lassen die bestehenden Arbeits- und Vorratspunkte erreichbar.

Umgehungswege werden nach der Wegsuche auf wenige freie, direkte Abschnitte geglättet. Beim Laden älterer Spielstände werden Spieler und Noah bei einer inzwischen überbauten Position auf den nächsten freien Punkt versetzt; Ausrüstung und Missionsfortschritt bleiben erhalten.

## Wiederholbare Prüfung

- `npm run check:layout`: knapp 59.000 Prüfstellen über die vollständige Straßenbreite, mehr als 800 Gehwegproben, alle Gehweg-/Bordsteinpolygone, Hauszugänge, Haltestellen, feste Anlagen und ursprüngliche Fundamente. Wasserhindernisse werden ebenfalls geprüft.
- `npm run check:assets`: echte GLB-Abmessungen gegen Straßen, Gehwege, Fundamente, andere Gebäude, Missionspunkte, Vorräte und die Wege der alten Karte.
- `npm run check:settlements`, `check:region`, `check:nature` und `check:campaign-region`: Requisiten, Geländedreiecke, Gewässer, Brücken, Vegetation, regionale Hausflächen und erreichbare Spielinhalte.
- `scripts/browser-map-layout.js`: tatsächlich geladene Modelle, vollständige regionale Fahrbahnbreiten, alle 13 Regionen und zwölf Außenorte, vier Ansichten des alten Kartenbereichs sowie echte Tastaturbewegung auf einem Gehweg. Die Prüfung wartet auf gerenderte Frames, bevor sie Screenshots erstellt.

Browseransichten und Ergebnisse liegen unter `output/playwright/layout-*`. Der statische Produktionsbuild wird mit `npm run build:pages` geprüft; dabei erfolgt keine Veröffentlichung.

## Abnahme am 15. Oktober 2026

Die statische Planung umfasst 1.350 Requisiten und 24 Szenen; nach Prüfung gegen die tatsächlich geladenen Altmodelle verbleiben 1.342 Requisiten im Browser. Alle sechs Haltestellen sind vollständig. Die Gesamtprüfung umfasst 58.911 Fahrbahnprüfstellen und 816 Gehwegproben. Die Browserabnahme erfasst 29 Ansichten, echte Gehwegbewegung sowie die lokale Wiederherstellung einer inzwischen überbauten Speicherposition. Es treten keine Browserfehler auf. Die bestehenden Prüfgruppen, TypeScript, ESLint und der statische Produktionsbuild bestehen.
