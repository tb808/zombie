# Siedlungsdetails

Die zweite Gestaltungsrunde ergänzt die bestehenden Orte. Weltgrenzen, Straßenverbindungen, Gewässer, Gebäudeparzellen, Kampagne und Loot-Mengen bleiben erhalten. Die Planung umfasst 1.418 zusätzliche Props in 24 besonderen Szenen. Fahrbahnen und Zugänge werden vor der Zulassung geprüft; die Darstellung fügt keine neuen großen Gebäude hinzu.

## Unterschiedliche Ortsbilder

- Innenstadt: schlanke Straßenlaternen, Kreuzungsampeln, Zebrastreifen, Haltelinien, Bordsteine, Parkbuchten, Hydranten, Bänke, Abfallbehälter, Fahrradständer, Versorgungskästen und beschriftete Schilder.
- Wohnviertel: Briefkästen, Hauszugänge, Tonnen, Blumenkästen, Hecken, Fahrräder, kleine Bäume und Geräteschuppen. Parkplätze und ein kleiner Spielbereich ergänzen den südlichen Stadtrand.
- Ostwerk: Paletten, Kisten, Fässer, Container, Kabelrollen, Rohre, Müllcontainer, Gabelstapler und Lieferverkehr bei Hallen/Ladehof.
- Kornweiler: Traktor, Anhänger, Holz und Brunnen im landwirtschaftlichen Hof. Fichtenau: Forstanhänger, Holzstapel, Schuppen und Arbeitsmaterial. Brückenfeld: Werkstatttransporter, Bank, Brunnen und Tankstellenvorplatz. Aschenrode: beschädigtes Auto mit offener Tür, Absperrung, umgestürzte Tonne und gefallene Laterne.
- Bestehende öffentliche Orte: Krankenwagen an St. Anna, Polizeifahrzeug und Sperre beim Revier, Feuerwehrauto an Wache 04, Einkaufswagen an der Markthalle, Caféterrasse und Evakuierungsbus mit Gepäck am Bahnhof.

Die weiteren kleinen Orte umfassen Café am Turm, alten Marktplatz, Lindenpark, eine abgebrochene Baustelle, Nahkauf-Parkplatz, Ostwerk-Ladehof und sechs Haltestellen. Einige Haltestellen haben einen Unterstand, andere nur Haltestellenschild, Sitzplatz und kleinere Gegenstände. Gepäck, Müllsäcke, einzelne beschädigte Props und zurückgelassene Arbeitsgeräte erzählen von einem abrupten Aufbruch; intakte Alltagsobjekte überwiegen.

## Vorhandene Assets

Autos, Kisten und Fässer verwenden die bereits vorhandenen detaillierten Asset-Funktionen. Dorfleuchten, Pflanzkästen und Wegweiser übernehmen vorhandene Kenney-Geometrien. Kleine Bäume verwenden die vorbereiteten Laubbaum-Geometrien und Materialien der bestehenden Vegetation in kleinerem Maßstab. Neue Fahrzeugtypen und fehlende Alltagsobjekte bestehen aus einfachen Geometrien mit den vorhandenen Holz-, Metall-, Stoff-, Beton- und Steinoberflächen.

Lesbare Straßennamen, Hinweise, Werbung und fiktive Kraftstoffpreise teilen sich einen einzigen lokal erzeugten Texturatlas. Es werden keine neuen Downloads, Bibliotheken oder externen Dienste benötigt. Beschädigte Fahrzeuge sind Dekoration mit Kollision; sie sind nicht fahrbar. Verkehrssignale bleiben ausgefallen. Die neuen Laternen nutzen Lenz' bestehende Stromversorgung und die vorhandenen vier GPU-Lichtplätze.

## Platzierung und Erweiterung

`app/settlementPlan.ts` trennt Planung und Darstellung. `PROP_DEFS` enthält die tatsächlichen Stellflächen, Kollisionsart und Sichtweite jedes Prop-Typs. Straßenmöbel folgen den realen Straßentangenten mit versetzten Seiten und unterschiedlichen Abständen. Hausdetails richten sich nach der Fassadenrotation; öffentliche Szenen suchen freie Parzellen nahe ihren vorgesehenen Standorten. Kleinere Gegenstände werden als passende Gruppen zugelassen, nicht über das gesamte Gelände verteilt.

Gebäudefundamente, bestehende Fahrzeuge/Schilder, Vegetation, Schutzbereiche, Türen, Vorräte und Interaktionen reservieren Platz. Die zusätzlichen geladenen Originalmodelle fließen nach Ermittlung ihrer echten Abmessungen in die Prüfung ein. Große Props werden nur auf ausreichend ebenem Gelände zugelassen (maximal 22 cm Höhenabweichung über ihre Stellfläche). Gehwege und befestigte Flächen passen sich mit kurzen Teilstücken dem Gelände an. Bordsteine enden vor Kreuzungen und Kurven, auch wenn beide Straßenstücke dieselbe Straßen-ID besitzen.

Für einen neuen Typ zuerst `PROP_DEFS` und anschließend das Prototyp-Rezept in `app/settlementDetail.ts` ergänzen. Die lokale Modellgeometrie muss innerhalb der angegebenen Fläche bleiben. Danach eine Platzierungsregel oder kleine Szene in der Planung ergänzen und `npm run check:settlements` ausführen. Große Props erhalten Kollision; Papier, Gras, Gepäck und ähnliche kleine Objekte behindern keine Bewegung. Bei Laternen und kleinen Bäumen kollidiert nur der Stamm/Pfosten.

## Darstellung und Budget

Die Detaildarstellung verwendet 80-Meter-Zellen. Komponenten verschiedener Props teilen sich dieselben Grundgeometrien und Materialien; Farbe und Transformation liegen pro Instanz vor. Autos und bestehende komplexere Assets teilen ihre vorbereiteten Varianten. Papier/Unkraut, Stadtmöbel und größere Silhouetten haben getrennte Sichtweiten. Zellen werden alle 160 ms zusammen mit den vorhandenen Weltabschnitten ausgeblendet. Es gibt kein Nachladen von Festplatte und keine neuen Einzelmeshes für jeden platzierten Gegenstand.

Die im Speicher vorbereiteten Lichtquellen werden der bestehenden Auswahl nur in der Nähe des Spielers angeboten. Es entstehen keine zusätzlichen GPU-Punktlichter. Kollisionsabfragen bleiben im räumlichen Index und funktionieren auch bei ausgeblendeter Geometrie. Ein Neustart erstellt weder neue Props noch zusätzliche Lichtquellen.

## Qualitätsprüfung

`npm run check:settlements` kontrolliert alle tatsächlich platzierten Typen, deterministische Anordnung, freie Fahrbahnen/Bordsteine, verschiedene Dorfkontexte, trockene und ebene Standorte, echte Modellabmessungen, Abstände zwischen Props, Loot- und Türzugänge, offene Brücken, gültige instanzierte Geometrie und das lokale Lichtbudget. Die bisherige Regionsprüfung bleibt zusätzlich aktiv.

`scripts/browser-settlements.js` prüft das tatsächlich geladene Spiel einschließlich GLB-Abmessungen, besucht zehn Ansichten und alle 24 Szenen, bewegt den Spieler per Tastatur durch eine eingerichtete Straße und kontrolliert große Prop-Kollisionen sowie Konsolen- und Assetfehler. Screenshots liegen unter `output/playwright/settlement-*.png`.

Die Leistungsdaten aus diesen kurzen Stichproben sind kein Langzeitbenchmark und hängen von GPU, Fenstergröße und der adaptiven internen Auflösung ab. Der Renderer reduziert unter Last weiterhin seine Auflösung. Die Ergebnisse dieser Gestaltungsrunde stehen in `output/performance/settlements-final.json` und `output/performance/settlements-stability.json`.

### Abnahme am 7. Oktober 2026

Produktionsbuild, TypeScript und ESLint bestehen. Die statischen Prüfungen für Siedlungen, Region, Gameplay, Unterschlüpfe, Innenräume, Grafik und Renderbudget bestehen. Im Browser wurden zehn Ortsansichten und alle 24 kleinen Szenen geprüft. Die vollständige Hauptquest einschließlich Noahs Begleitung und erfolgreicher Schlussverteidigung, Waffen-/Interaktionsabläufe und alle vier ausbaubaren Unterschlüpfe funktionieren mit den ergänzten Details.

Die Browserprüfung bestätigt 1.418 Props, 24 Szenen und 275 zusätzliche Laternenpositionen. Große Props kollidieren, Fahrbahnmitten und Interaktionen bleiben zugänglich, und es treten keine Konsolen- oder Assetfehler auf. Die tatsächlichen geladenen GLB-Abmessungen passen in die reservierten Stellflächen.

Gemessen in Chrome 154 mit AMD Radeon(TM) Graphics über ANGLE/D3D11, Fenster 1.920 × 1.080, jeweils drei Sekunden Aufwärmzeit und 60 Bildintervalle:

| Ansicht | Median pro Frame | 95. Perzentil | Draw Calls |
| --- | ---: | ---: | ---: |
| Innenstadt | 19,0 ms | 21,9 ms | 315 |
| Industrie | 16,7 ms | 19,6 ms | 205 |
| Kornweiler | 16,6 ms | 19,1 ms | 127 |
| Fichtenau | 16,7 ms | 19,1 ms | 140 |
| Brückenfeld | 16,5 ms | 18,8 ms | 105 |
| Aschenrode | 16,6 ms | 19,8 ms | 92 |
| Café | 16,9 ms | 19,9 ms | 347 |
| Park | 17,4 ms | 20,2 ms | 772 |
| Krankenhaus | 16,7 ms | 20,1 ms | 515 |
| Tankstelle | 16,6 ms | 19,6 ms | 129 |

Die adaptive interne Auflösung lag dabei zwischen 1.517 × 853 und 1.686 × 948. Die Mediane entsprechen ungefähr 53–60 FPS auf dieser Hardware; daraus folgt keine allgemeine FPS-Garantie.

Der zusätzliche Stabilitätstest mit 30 echten Gegnern erreicht 16,7 ms Median und 33,2 ms im 95. Perzentil. Raum-/Tag-/Nachtwechsel produzieren keine schwarzen Bildproben und halten dieselben 66 Shaderprogramme. Fenstergrößenwechsel, vorübergehend unsichtbare Canvas-Layouts und ein absichtlich ausgelöster WebGL-Kontextverlust werden korrekt verarbeitet. Ein Neustart gibt alle 30 gegnerischen Animationstexturen frei; die GPU-Lichtzahl bleibt bei vier.
