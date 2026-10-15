# Naturerweiterung · 15. Oktober 2026

Die offenen Naturflächen erhalten weitere mittlere Hügel, Geländewellen, Felsgruppen, Waldinseln und drei kleine Teiche. Dorfkerne, Straßenanschlüsse, Arbeitsflächen und Unterschlüpfe behalten ihre ebenen Terrassen. Die zentrale Enklave verwendet weiterhin ihr ursprüngliches Höhenprofil.

## Wälder und Felsen

7.575 regionale Bäume ersetzen die bisherige Verteilung mit 2.293 Bäumen. Ein versetztes 8,5-Meter-Raster, Dichteflecken und Lichtungen bilden unterschiedliche Bestände. Landwirtschaft, Straßen, Häuser, Vorräte und Schutzbereiche halten Abstand. Kronen dürfen sich berühren; Stämme behalten Durchgänge. Fünf zusätzliche Waldinseln gliedern offene Zwischenräume.

`app/compactTrees.ts` erzeugt geschlossene Kronen in drei Detailstufen. Die nahe Nadelbaumkrone benötigt 108 statt 3.476 Dreiecken der bisherigen regionalen Krone; die nahe Laubbaumkrone 480 statt 1.536. Rotation und Größe variieren je Baum. Zwei Baumarten teilen Geometrie pro 100-Meter-Abschnitt und bleiben bis 380 Meter sichtbar. Die Originalbäume im zentralen Gebiet behalten ihre Darstellung.

`app/regionNature.ts` ergänzt größere örtliche Felsgruppen und häufiger Steine an Hängen. Im geladenen Spiel sind rund 2.800 Felsen sowie Büsche, Farne und Grasbüschel vorhanden. 80-Meter-Zellen und Instanzfarben ersetzen einzelne Varianten-Batches; die Zahl vorbereiteter Natur-Meshes sinkt von etwa 9.100 auf 2.200.

## Teiche und Ufer

Wiesenteich liegt westlich von Fichtenau, Schilfweiher im südöstlichen Wald und Steinweiher im östlichen Hügelland. Waldsee und Mühlenteich bleiben erhalten. Teiche und Flüsse besitzen insgesamt 735 Schilfgruppen, 114 Ufersteine, 176 Seerosen-Gruppen und sieben Stücke Treibholz. `app/shoreline.ts` prüft Uferhöhe, Wege, Brücken, Gebäude, Vorräte und bestehende Props vor der Platzierung.

Das Gelände trifft die Wasserfläche an ihrem Rand. Die äußere Geländeanpassung naher Höfe hebt keine Ufer mehr an. Boden-, Schilf- und Steinfarben gliedern den Übergang zwischen Wasser und Wiese. Tiefes Wasser bleibt für Landfiguren gesperrt. Gebäude desselben landwirtschaftlichen Hofs teilen eine Fundamenthöhe, damit sich überlappende Terrassen nicht gegenseitig anheben.

## Tiere

`app/wildlife.ts` verteilt 22 Rehe, 16 Hasen und 18 Enten in passenden Lebensräumen. Landtiere wandern in kleinen Gruppen, Hasen hüpfen, Enten schwimmen. Bei Annäherung weichen sie aus. Bewegungen prüfen Boden, Wasser, Straßen und tatsächliche Kollisionsobjekte. Tiere bleiben in der Nähe ihres Lebensraums; Pause und Dialoge stoppen die Simulation.

Die Tiere sind Umgebungsleben ohne Jagd-, Schadens- oder Lootsystem. Ihre Positionen sind kein neuer Spielstandbestandteil. Sechs Instanz-Batches stellen alle 56 Tiere dar; nur Tiere innerhalb von 180 Metern werden simuliert und gezeichnet. Es werden keine externen Assets, neuen Bibliotheken oder weiteren GPU-Lichter benötigt.

## Prüfung

`npm run check:nature` prüft Gelände, komplette Fundamente, Naturabstände, transformierte Modellpunkte gegen die Geländedreiecke, Baumgeometrie, alle fünf Gewässer, Uferdetails, Tierlebensräume, Bewegung, Pause und Culling. `check:region`, `check:settlements` und `check:campaign-region` sichern Straßen, Brücken, Gebäude, Ressourcen und Missionszugänge ab.

`scripts/browser-wilderness.js` besucht sechs Landschaftsansichten und prüft echte Tastaturbewegung. `scripts/browser-wildlife.js` kontrolliert alle drei Tierarten einschließlich Bewegung und Pause. `scripts/browser-nature-access.js` prüft im geladenen Spiel 1.716 Straßen-, Orts-, Start- und Missionspositionen. `scripts/browser-region.js` verwendet für die Kartenübergabe den aktuellen Mara-Start aus der Kampagnenkonfiguration.

Screenshots liegen in `output/playwright/wilderness-*.png`. Bildzeitmessungen sind kurze hardwareabhängige Stichproben mit adaptiver Auflösung und garantieren keine allgemeine Bildrate.

### Lokale Abnahme

Produktionsbuild, TypeScript, ESLint und die Prüfgruppen Natur, Region, Siedlungen, Kampagnenregion und Renderbudget bestehen. Im Browser bestehen sechs Naturansichten, Tierbewegung/Pause, alle 1.716 Zugangspositionen, acht Regionsansichten, Brückenüberquerung, Wasserblockierung und Kartenübergabe.

Chrome 155, AMD Radeon(TM) Graphics über ANGLE/D3D11, Fenster und interner Puffer 1.440 × 900, jeweils 1,8 Sekunden Aufwärmzeit und 90 Bildintervalle: Alle sechs Naturansichten erreichen 16,7 ms Median und 16,8 ms im 95. Perzentil, entsprechend ungefähr 60 FPS. Dabei sind je nach Ansicht 421–1.764 regionale Bäume im Sichtbudget. Die Messung ist keine Zusicherung für andere Hardware oder längere Spielsitzungen.

Der Renderer-Stresstest mit 30 Gegnern bei 1.920 × 1.080 Fenstergröße besteht mit 16,7 ms Median und 33,3 ms im 95. Perzentil; die adaptive interne Auflösung liegt dort bei 1.349 × 758. Tag-/Nacht- und Raumwechsel behalten dieselben 69 Shaderprogramme und erzeugen keine schwarzen Bildproben. Verkleinerte/verborgene Canvas-Layouts, Größenwechsel und ein absichtlich ausgelöster WebGL-Kontextverlust werden korrekt verarbeitet. Der Neustart gibt 30 Animationstexturen frei; vier lokale GPU-Lichter bleiben die Obergrenze.

Rohdaten: `output/performance/wilderness-final.json`, `wilderness-region.json` und `wilderness-stability.json` im selben Verzeichnis.
