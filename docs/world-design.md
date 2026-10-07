# Tannwald: Regionsgestaltung

## Maßstab und Bestand

Eine Einheit entspricht einem Meter. Y zeigt nach oben; X/Z sind die Bodenebene, Norden ist negatives Z. Die Grenzen liegen bei X −1.200…1.200 und Z −1.000…1.000. Gegenüber 420 × 345 Metern ist die Fläche etwa 33-mal größer. Bei 4,6 m/s dauert ein 650-Meter-Weg gut zwei Minuten; die diagonale Durchquerung dauert zu Fuß etwa elf Minuten, ohne Kampf oder Erkundung.

Die vorhandenen Questkoordinaten, Innenräume, Schutzbereiche, Waffen und Unterschlüpfe bleiben erhalten. `originalHeight` reproduziert das bisherige Gelände innerhalb der ursprünglichen Grenzen. Außerhalb blendet es sanft in die Region über. Die feinen bisherigen Vegetationsdetails bleiben auf das alte Gebiet begrenzt; ihre Schleife wächst nicht mit der neuen Fläche.

## Struktur

| Region | Rolle | Risiko |
| --- | --- | --- |
| MAIN_CITY | Dichtes Zentrum, Skyline, Geschäfte und Wohnungen | Hoch |
| CITY_SUBURBS | Kleine Häuser, Gärten, Übergang zu Wiesen | Mittel |
| INDUSTRIAL_ZONE | Fabrikschlote und Hallen am Nordzubringer | Hoch |
| VILLAGE_01 / Kornweiler | Landwirtschaftliches Straßendorf | Mittel |
| VILLAGE_02 / Fichtenau | Forstbetrieb, Holzlager, Mischwald | Mittel |
| VILLAGE_03 / Brückenfeld | Talstraße, Werkstatt, Tankstelle | Mittel |
| VILLAGE_04 / Aschenrode | Ruinen der fehlgeschlagenen Evakuierung | Hoch |
| MILITARY_BASE / Fort Eiche | Abgelegener Höhenhof, militärisches Loot | Sehr hoch |
| FARMLAND / REMOTE_AREA | Äcker, Weiden und einzelne Gehöfte | Niedrig |
| FOREST_NORTH / FOREST_SOUTH | Zusammenhängende Wälder mit Lichtungen | Niedrig |
| RIVER_VALLEY | Gewundene Aue, kontrollierte Brückenübergänge | Niedrig |

Hauptstraßen verbinden Stadt, Dörfer und Fort. Nebenstraßen schaffen einen westlichen Rundweg und eine östliche Verbindung über zwei Aue-Brücken. Feldwege enden an Höfen, Waldwege an Campingplatz, Jagdhütte oder Forschungsanlage. Abzweigungen entstehen an geteilten Knoten, statt in freier Landschaft zu enden. Stadtstraßen haben nachvollziehbare Blöcke, außerhalb folgen Kurven dem Flusstal und den Hügeln.

Die Aue verläuft östlich der Stadt. Der Birkenbach durchzieht südliche Felder und Wälder; der Hochbach führt vom Hochforst nach Süden. Straßen-/Gewässerkreuzungen erzeugen Brücken mit eigener Deckhöhe und aus der Kreuzungsrichtung berechneter Länge. Das Flussbett bleibt darunter abgesenkt. Gewässer sind im Spiel ein Hindernis; es gibt kein Schwimmsystem.

Gebäudeparzellen werden mit variablen Abständen aus diesen Routen abgeleitet. Innenstadt, Vororte, Industrie und Dörfer nutzen verschiedene Gebäudegruppen und Höhen. Acht Türme bilden die Skyline. Außenbereiche lassen große freie Landschaftsflächen bestehen. Waldmasken besitzen weiche Ränder, variierende Dichte und explizite Lichtungen um Orte; Feldflächen werden zusammenhängend definiert.

## Erweiterung

1. Region oder POI in `regionPlan.ts` definieren, mit Name, Charakter und Risiko.
2. Eine Route vom bestehenden Netz zum Ort hinzufügen. Gemeinsame Endpunkte oder tatsächlich kreuzende Straßen verwenden.
3. Gewässer, Feldflächen und Lichtungen zuerst planen. Gebäudemuster prüfen Straßen- und Wasserränder sowie andere Parzellen vor der Zulassung.
4. Passende Gebäudefamilie und Vorräte ergänzen. Öffentliche Gebäude erhalten zwei echte Eingänge; ihre Kollision besteht aus Wänden statt einer gefüllten Box.
5. `npm run check:region` und die Browserprüfung ausführen. Eine neue Straße kann zusätzliche Brücken erzeugen und Grundstücke/Vegetation verändern; diese Folgen sind beabsichtigt und müssen geprüft werden.

Der Zufallsanteil ist deterministisch. Neue Definitionen können die Reihenfolge und damit nachfolgende Varianten verändern; die vorhandenen Kampagnendaten sind davon getrennt. Es werden keine neuen externen Assets oder Bibliotheken benötigt.

## Laufzeitbudget

Gelände und Dekoration liegen in 100-Meter-Abschnitten. Statische Geometrie wird je Material/Abschnitt zusammengefasst. Die vorhandenen Baumarten liefern vorbereitete Varianten und drei instanzierte Entfernungsstufen. Bodendecker haben eigene kurze Sichtweite. Ferne Landmarken verwenden einfache Silhouetten. Der alte adaptive Auflösungsregler, die vier lokalen Lichtplätze und das Schattenbudget bleiben aktiv.

Die gesamte Region wird einmal im Speicher aufgebaut; das ist Entfernungsausblendung, kein Nachladen von Festplatte. Der unveränderliche regionale Kollisionsindex arbeitet unabhängig von sichtbaren Abschnitten. Kampagnentüren und Fenster verbleiben in der bestehenden veränderlichen Kollisionsliste. Wegsuche bekommt nur Hindernisse rund um Start/Ziel; höchstens zwei Gegnerpfade pro Frame werden neu berechnet. Wasserzellen sind nur für Navigation gedacht und versperren keine Schüsse über den Fluss.

Zombies entstehen in der Nähe des Spielers und verschwinden in großer Entfernung. Ortsbetreten, laufende Verstärkung und Gegnerarten berücksichtigen das Risiko. Obergrenzen sind 12/22/32/40 für reguläre Verstärkung; explizite Begegnungen und die ursprüngliche Endverteidigung respektieren die globale Grenze 40. Loot und Erkundungszustand setzen sich mit einem neuen Durchlauf zurück, ebenso wie die bestehenden Inhalte.

## Prüfungen

Die Regionsprüfung kontrolliert den kompletten Straßen-Graphen, Zufahrten aller POIs, alle neuen Straßenmittellinien, überlappungsfreie Parzellen, trockene Fundamente, begehbare Türen, alle regionalen Vorräte, Baumabstände, Brückendecks inklusive Begleiterwegfindung sowie korrekte Abstandsabfragen an negativen Koordinaten. Ein kompletter Szenenaufbau prüft gültige Geometrie, Instancing und Ausblendung.

Die Browserprüfung nutzt den tatsächlich laufenden WebGL-Renderer, betritt acht Regionen, misst Bildabstände und führt eine echte Tastaturbewegung über die Aue-Brücke durch. Die alten Asset-, Gameplay-, Innenraum-, Unterschlupf-, Grafik- und Renderprüfungen bleiben zusätzlich erforderlich. Ergebnisse hängen von Hardware, Auflösung und Browser ab; RAF-Bildabstände enthalten die Bildschirmtaktung.

## Abnahme am 7. Oktober 2026

Der finale Stand umfasst 122 zusätzliche Gebäude, darunter acht Hochhäuser und 26 durchsuchbare Erdgeschosse/Hallen, 2.298 regionale Bäume, sechs Brücken und 68 neue Vorratspunkte. Alle Regionsprüfungen, die bisherigen sieben statischen Prüfgruppen, TypeScript, ESLint und der Produktionsbuild bestehen. Im Browser bestehen Dialog/Karte, Kampf/Waffen, alle 24 Kampagnenschritte bis zur gewonnenen Endverteidigung sowie Bau, Schlaf und Respawn in allen vier bestehenden Unterschlüpfen.

Der WebGL-Stabilitätstest besteht mit 30 echten Gegnern: keine schwarzen Bildproben, keine spontanen Kontextverluste, unveränderte 53 Shaderprogramme bei Raum-/Tag-/Nachtwechseln und Freigabe aller 30 Gegner-Animationstexturen beim Neustart. Vier Fenstergrößen sowie die Wiederherstellung nach absichtlich ausgelöstem Kontextverlust funktionieren. Im Belastungstest liegen Median/P95 bei 16,7/33,3 ms; die adaptive Auflösung reduziert den Renderpuffer dabei auf 1.180 × 664 Pixel.

Die folgenden Regionsmessungen entstanden in Chrome 154 unter Windows mit AMD Radeon(TM) Graphics/ANGLE D3D11, Fenster 1.920 × 1.080, Renderpuffer 1.686 × 948. Jede Ansicht wurde 2,2 Sekunden aufgewärmt und danach über 45 RAF-Intervalle gemessen. Das sind kurze Vergleichsmessungen und keine zugesicherte Bildrate für andere Hardware oder lange Spielsitzungen.

| Ansicht | Median, ms | P95, ms | Draw Calls | Dreiecke |
| --- | ---: | ---: | ---: | ---: |
| Innenstadt | 17,6 | 20,7 | 139 | 84.178 |
| Industrie | 16,4 | 19,8 | 99 | 73.106 |
| Kornweiler | 16,6 | 19,7 | 108 | 60.578 |
| Fichtenau | 16,5 | 21,6 | 133 | 209.435 |
| Aue-Brücke | 16,6 | 19,2 | 81 | 41.628 |
| Aschenrode | 16,5 | 19,3 | 67 | 40.366 |
| Fort Eiche | 16,7 | 19,3 | 91 | 56.061 |
| Südlicher Wald | 16,2 | 23,3 | 155 | 496.369 |

Der Vergleich der ursprünglichen Wald-, Stadt-, Innenraum- und Nachtansichten bleibt bei 16,7 ms Median (vorher ebenfalls 16,7 ms); P95 beträgt abschließend 17,0/16,8/17,1/17,0 ms. In diesen kurzen Stichproben gibt es keine Intervalle über 50 ms, schwarzen Bildproben, WebGL-Fehler oder Kontextverluste. Auflösung und Kamerapunkte entsprechen der Vorhermessung. Die abschließenden Rohdaten stehen in `output/performance/region-legacy-final.json`.

Screenshots liegen in `output/playwright/region-*.png`. Die neue Browserprüfung steht in `scripts/browser-region.js`; sie testet zusätzlich echte Brückenbewegung, Wasserhindernisse, die unveränderte Kartenübergabe durch Mara und Übersicht/Detailzoom der erweiterten Weltkarte. Die Build-Werkzeuge Vinext und Next erzeugen unterschiedliche Routentypen; falls nach einem Vinext-Build ein alter `.next/types/validator.ts` von Next stehen bleibt, vor `tsc --noEmit` mit `npx --offline next typegen` die zusammengehörigen Next-Prüftypen erneuern.
