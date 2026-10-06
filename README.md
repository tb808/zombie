# Nachtwache — Tannwald

Ein spielbarer Survival-FPS mit einer frei begehbaren Welt von 420 × 345 Metern, einer Hauptgeschichte und verbundenen Erkundungsaufträgen. Die Umgebung hat strukturierte, verwitterte Oberflächen, organische Vegetation und detaillierte Fahrzeuge. Three.js, React und die vorhandenen Kenney-Assets bleiben die Grundlage; die Figuren und Teile der ursprünglichen Architektur behalten ihre stilisierten Grundformen.

## Starten

```sh
npm install
npm run dev
```

Die lokale Adresse steht im Terminal (normalerweise http://localhost:3000). Maus und Tastatur werden benötigt. Ein Klick aktiviert die Maussteuerung; Escape pausiert.

## GitHub Pages

Einmalig im GitHub-Repository unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions** wählen. Danach diese Änderungen committen und auf `main` pushen. Der Workflow `.github/workflows/pages.yml` baut und veröffentlicht das Spiel automatisch bei jedem Push auf `main`; er lässt sich auch unter **Actions → Deploy to GitHub Pages → Run workflow** starten.

Adresse nach erfolgreichem Deploy: https://tb808.github.io/zombie/

```sh
npm ci
npm run build:pages
```

Der Pages-Build erzeugt die statische Website in `out/`, einschließlich aller Modelle und Texturen. Lokal verwendet er den Pfad `/zombie`; im Workflow kommt der tatsächliche Pfad aus der Pages-Konfiguration, sodass auch eine eigene Domain unterstützt wird. `NEXT_PUBLIC_BASE_PATH` kann für andere Zielpfade überschrieben werden. Die bisherigen Entwicklungs- und Sites-Build-Befehle bleiben verfügbar.

## Steuerung

| Taste | Aktion |
| --- | --- |
| WASD / Pfeiltasten | Bewegen |
| Maus / Linksklick | Umsehen / Angreifen; Karabiner feuert auch bei gehaltener Taste |
| Rechte Maustaste | Zielen: weniger Streuung, langsamer bewegen |
| Shift | Sprinten; wird von Infizierten gehört |
| Q | Zwischen gefundenen Waffen und Axt wechseln |
| R | Nachladen; Waffenwechsel bricht ohne Munitionsverlust ab |
| E | Vorräte, Hinweise, Gespräche, Türen und Geräte |
| E / Leertaste / Enter im Gespräch | Nächste Aussage; am Ende Gespräch beenden |
| F | Taschenlampe |
| 1 / 2 / 3 / 4 | Verband / Ration / Batterie / Leuchtfackel |
| 5 | Sender mit drei Ersatzteilen verstärken |
| 6 / 7 / 8 | Wasser / Antibiotika / Schutzweste |
| M | Maras Weltkarte öffnen / schließen; pausiert |
| J / Tab | Journal: Karte, Waffen, Vorräte, Aufgaben und Hinweise; pausiert |
| Mausrad / + / − auf der Karte | Von der gesamten Welt bis zu 600 % zoomen |
| Ziehen / Pfeiltasten auf der Karte | Kartenausschnitt verschieben; Pos1 zeigt die ganze Karte |

## Spielablauf

Mara erklärt Elias am Rangerlager den Ausbruch, Falks Rolle und die gescheiterte Evakuierung. Gespräche erscheinen als einzelne Untertitel mit Sprechername; die nächste Aussage folgt erst auf E, Leertaste, Enter oder den Weiter-Button. Währenddessen pausieren Weltzeit, Bewegung und Kampf. Nach Maras Einführung erhält Elias ihre Karte und den Auftrag, vom Markt über den Friedhof zur alten Klinik zu gehen. Die Karte zeigt von Anfang an die gesamte Spielwelt mit allen wichtigen Orten, Straßen, Gebäuden, Unterschlüpfen, Spielerposition und Missionsziel. Mausrad und Plus/Minus zoomen, Ziehen verschiebt den Ausschnitt. „Ganze Karte“ und „Mein Standort“ helfen bei der Orientierung. Ausrüstung und Fundstücke bleiben schon vor der Kartenübergabe verfügbar.

Die Hauptquest hat 24 Schritte. Nach Maras Einführung lernst du Karte, Sammeln, Wasser, gezieltes Schießen an einer Übungsscheibe, Nachladen und Axtkampf. Danach folgen Brennstoffzelle, Fackel-Ablenkung am Friedhof und Noahs Befreiung. Gemeinsam richtet ihr das Forsthaus ein, prüft die Lampe und schlaft eine Nacht. In der Oststadt führen Dr. Weber, Lenz, Sicherung, Generator, Waffenkammer und Lazarus-Archiv schließlich zum Gegenmittel, zur Senderreparatur und zum Konvoi. Bereits erledigte Aufgaben werden beim Erreichen ihres Questschritts erkannt. Journal und HUD zeigen das aktuelle Ziel; im Journal lässt sich die komplette Auftragsliste aufklappen.

Noah navigiert um Gebäude und folgt dem Spieler nach seiner Befreiung. Am Sender muss er innerhalb von zwölf Metern angekommen sein. Anschließend gilt es, vierzig Sekunden im Umkreis von achtzehn Metern zu überleben. Die in der Hauptquest erforderliche Verstärkung mit drei Ersatzteilen verkürzt die Zeit auf dreißig Sekunden.

Vier begehbare Gebäude lassen sich zu eigenen Unterschlüpfen ausbauen: **Forsthaus am Dorfrand**, **Feuerwache 04**, **Lindenhof** und **Hof Birkenrain**. Räume zuerst den Innenraum. Mit **E** vernagelst du jedes der vier offenen Fenster für zwei Bretter, verstärkst die beiden Türen für je ein Ersatzteil und bereitest das Bett für eine Ration vor. Baumaterial liegt vor jedem Haus. Bretter versperren tatsächlich Sicht, Schüsse und Bewegung. Verstärkte Türen lassen sich mit E öffnen und schließen. Erst vier vernagelte Fenster, zwei geschlossene und verstärkte Türen und das vorbereitete Bett erlauben die Aktivierung am Bett. Eine offene Tür hebt den Schutz vor Infizierten auf.

**E am vorbereiteten Bett** öffnet die Unterschlupfverwaltung und pausiert das Spiel. Aktiviere den Ort, wähle deinen Respawnpunkt oder warte sicher bis 19 Uhr. Zwischen 19 und 06 Uhr kannst du bis **06:00 am folgenden Morgen** schlafen; das regeneriert Ausdauer und bis zu 35 Gesundheit, verbraucht aber Durst. Nach dem Tod führt „Im Unterschlupf aufwachen“ zum gewählten Bett. Questfortschritt, Ausrüstung, bereits genommenes Loot und alle ausgebauten Häuser bleiben erhalten; Munition und Vorräte werden nicht neu erzeugt. Noah kehrt mit dir zurück, die Haustüren schließen sich. Beim Tod während der letzten Verteidigung beginnt deren Timer erneut. Karte und Journal zeigen Baufortschritt und aktiven Respawnpunkt. Alles gilt für den laufenden Durchgang; ein kompletter Neustart oder Neuladen der Seite setzt den Spielstand zurück.

Die Oststadt ist jederzeit über die Hauptstraße erreichbar. Insgesamt gibt es **21 begehbare Orte**, einschließlich Forsthaus, Notaufnahme, Polizei, Markthalle, Werkstatt, Feuerwehr, Wohnblock, Schule, Bahnhof, Kontrollpunkt und Lazarus-Archiv. Hof und Waldcamp liegen westlich außerhalb der Stadt.

Acht bisher geschlossene Häuserzeilen sind jetzt im Erdgeschoss begehbar: **Apotheke am Ring, Praxis Dr. Keller, Bäckerei Morgenrot, Elektro Funk & Technik, Café zur Linde, Wohnung der Familie Seidel, Waschsalon und Poststelle Ost**. Jedes Gebäude hat drei verbundene Raumabschnitte, einen offenen Vorder- und Hintereingang, 24 zusätzliche Vorratsfundorte insgesamt und einen eigenen lesbaren Brief, der im Journal gespeichert wird. Die Funde passen zum Ort: Medizin in Apotheke und Praxis, Lebensmittel in Bäckerei und Café, Batterien und Ersatzteile im Elektroladen. Karte und Ortsanzeige führen die Häuser einzeln; als erkundet zählt ein Ort erst beim Betreten.

Die Innenräume enthalten passende Verkaufs-, Arbeits-, Wohn- und Lagerräume mit Schränken, Regalen, Geräten, Sitzmöbeln und Kleinteilen. Holz-, Fliesen-, Putz- und Stoffoberflächen, verglaste Fensteröffnungen, Fensterbänke, Heizkörper, Sockelleisten, Steckdosen, Schalter und Deckenleuchten ergänzen die Einrichtung. Die Wohnung hat Küche, Sofa, Bett und Waschbereich; der Waschsalon hat Waschmaschinen mit Trommeln und einen Technikraum; die Praxis einen Behandlungsplatz. Möbelkanten sind abgerundet, Oberflächen besitzen Materialrelief und unterschiedliche Rauheit. Die oberen Fassadengeschosse bilden weiterhin die Skyline; zugänglich sind die Erdgeschosse.

## Umgebung und Grafik

Die gesamte Welt verwendet elf lokal erzeugte Materialtypen: Waldboden, Asphalt, Beton, Putz, Ziegel, Holz, Rinde, Stein, Metall, Stoff und Fliesen. Separate Farb-, Relief- und Rauheitsdaten werden in Weltkoordinaten auf die Geometrie projiziert; ihre Größe bleibt unabhängig von der Größe eines Gebäudes. Auch die ursprünglichen Modelle erhalten Oberflächendetails, während ihre Farbtexturen erhalten bleiben. Die Materialien benötigen keine externen Bilddownloads.

Die Nadelbäume haben dichte, unregelmäßige Fichtenkronen; Laubbäume rundliche, verzweigte Kronen. Schlanke, leicht gebogene Stämme verjüngen sich nach oben. Lokal erzeugte 512-Pixel-Texturen zeigen ganze Zweige mit feinen Nadeln beziehungsweise Blättern und transparenten Zwischenräumen. Gefaltete, räumlich verteilte Zweigflächen, weiche Kronennormalen und leichte Windbewegung vermeiden die bisherigen großen, vereinzelten Blattdreiecke. Jeder Baum bleibt auf zwei Materialgruppen beschränkt; seine Form ist anhand des Standorts reproduzierbar. Weitere Bäume und mehrere Tausend Grasbüschel verteilen sich über freie Wald- und Randflächen. Innenräume, Schutzbereiche, Straßen und wichtige Fundorte werden ausgenommen. Neue Baumstämme und Straßenmöbel besitzen Kollision. Felsen haben unregelmäßige, geglättete Formen; Kisten und Fässer zusätzliche Beschläge beziehungsweise Fassringe.

Die Oststadt hat Gehwegplatten, Bordsteine, Zebrastreifen, Kanaldeckel, Pfützen, Bänke, Abfallbehälter, Schaltkästen und geformte Straßenleuchten. Die abgestellten Autos haben abgerundete Karosserien, separate Scheiben, Spiegel, Türen, Reifen, Felgen und Scheinwerfer. Drahtzäune mit Pfosten und Querstreben ersetzen die massiven Wände der bewachten Schutzbereiche; deren Spielkollision und Schutzfunktion bleiben erhalten. Bewölkung, Materialreflexionen, feinere Schatten und zusätzliche Kantenglättung ergänzen den Tag-/Nachtwechsel.

Zusätzliche Details liegen in 40-Meter-Abschnitten und werden außerhalb von 105 Metern ausgeblendet. Baumteile, Fahrzeuge und Architektur werden nach Material zusammengefasst. Die Grafiküberarbeitung verändert weder die Missionsfolge noch die Loot-Mengen. Die vorhandenen Charaktermodelle bleiben stilisiert; diese Überarbeitung ist kein vollständiger Ersatz durch fotorealistische Figuren oder gescannte Architektur.

Ein Durchlauf startet um 09:00 Uhr. Ein vollständiger Tag dauert 24 Spielminuten; Sonne, Mond, Himmelsfarben, Schatten und leichter Dunst wechseln fließend zwischen Tag, Dämmerung und Nacht. Pausen und Journal halten auch die Weltzeit an. Die Uhrzeit steht im HUD. Nachts leuchten die Unterschlüpfe, und nach Lenz’ Reparatur auch die festen Straßenlaternen.

Rangerstation, Schutzhof der Notaufnahme, Schule und Waldcamp sind eingefriedete Unterschlüpfe mit bewachten Zugängen. Infizierte erscheinen außerhalb und können den Schutzbereich nicht betreten. Kleine Gruppen von Überlebenden bleiben dort; Lenz und sein Generator stehen im Schulhof. Die Karte markiert die Schutzbereiche grün. Dekorationen werden anhand ihrer geladenen Modellabmessungen ausgedünnt, sodass Gebäude, Wege zu Missionszielen, Vorräte und NPCs frei bleiben.

- **Das Licht der Oststadt:** Lenz benötigt die Sicherung aus seiner Werkstatt und zwei Ersatzteile. Der reparierte Generator versorgt die Beleuchtung, lockt Infizierte an und bringt den Polizeischlüssel. In der verschlossenen Waffenkammer liegt eine Schrotflinte.
- **Ein Name auf der Liste:** Dr. Weber sucht Ben. Die Patientenliste führt zum Bahnhof, ein Funkprotokoll weiter ins Waldcamp. Wer seine Rückkehr meldet, erhält Behandlung und Verbände. Mara reagiert auf die Nachricht von Lea.
- **Was Falk verschwieg:** Keycard vom Kontrollpunkt und reparierter Strom öffnen das Archiv. Der Abbruchbefehl bleibt im Journal und verändert den Abschlusstext.

Stromversorgung und Archiv gehören jetzt auch zur Hauptquest. Bens Spur bleibt optional.

Erkundung liefert Ausrüstung, Medizin und Zusammenhänge. Fortschritt gilt für den aktuellen Durchlauf; ein Neustart setzt ihn zurück. Es gibt derzeit keinen dauerhaften Spielstand.

## Kampf und Überleben

Wandler sind langsam. Hetzer schließen schnell auf; Brecher sind groß, ausdauernd und schlagen hart zu. Kriecher haben niedrige Trefferzonen. Fiebernde reagieren schnell und bewegen sich unruhiger. Wahrnehmung, Verfolgung, Geräuschuntersuchung, Suche, Angriff, Erholung, Treffer, Fallen, Aufstehen und Tod sind getrennte Zustände. Ohne Sichtkontakt verfolgen Gegner die zuletzt bekannte Position. Schüsse, Sprinten, Fackeln und Alarme haben unterschiedliche Hörreichweiten.

Angriffe kündigen sich sichtbar an. Schaden entsteht erst beim Treffermoment und lässt sich durch Abstand oder Deckung vermeiden. Kopftreffer, Schrot aus kurzer Entfernung und Axtschläge unterbrechen beziehungsweise werfen normale Gegner um. Brecher widerstehen dem Stagger. Axtschläge benötigen zwanzig Ausdauer und treffen nur in einem begrenzten Winkel und innerhalb von 2,6 Metern.

Pistole (9 mm), Schrotflinte (12/70) und Karabiner (5.56 mm) haben eigene Magazine und Vorräte. Wasser erhält die Ausdauerregeneration. Infektionen ab 75 Prozent zehren an der Gesundheit; Antibiotika behandeln sie. Westen absorbieren 55 Prozent des Schadens, bis ihr Schutz aufgebraucht ist. Unnötige Heilung verbraucht keine Gegenstände; überzähliger Loot bleibt liegen.

## Architektur und Prüfung

- `app/Game.tsx`: Szene, Eingabe, Kampf, Interaktionen, Aufgaben, Audio und HUD.
- `app/dialogue.ts`: kurze Untertitelaussagen und Maras Einführung.
- `app/WorldMap.tsx`: vollständige Weltkarte mit begrenztem Zoom und Verschieben.
- `app/survival.ts`: Waffen, Gegnertypen, Wahrnehmung, Zustände und begrenzte A*-Wegfindung.
- `app/zombieAnimation.ts`: vorhandene Skelettclips plus Gelenkposen. Die Laufphase folgt der gemessenen Bewegung.
- `app/city.ts`: Orte, Einrichtung, Loot, Hinweise, Türen und zusammengefasste Stadtgeometrie.
- `app/interiors.ts`: acht zusätzliche Erdgeschosse mit eigenen Raumthemen, prozeduralen Oberflächen, Vorräten und Briefen; Farbinformationen in der Geometrie erlauben gemeinsame Materialbatches.
- `app/surfaces.ts`: elf deterministische Materialtypen mit Relief, Rauheit und Projektion in Weltkoordinaten.
- `app/naturalAssets.ts`: verzweigte Bäume mit Blattgeometrie, geglättete Felsen, detaillierte Kisten/Fässer und abgerundete Fahrzeuge.
- `app/worldDetail.ts`: Vegetation und Straßeninfrastruktur mit geprüften Abständen, Stamm-/Möbelkollision und Entfernungsausblendung.
- `app/world.ts`: ursprüngliche Orte, Briefe, Gegenstände und gemeinsame Deckungsprüfung.
- `app/environment.ts`: Weltzeit, Tageslicht, Unterschlüpfe und Abstandsprüfung.

```sh
npm run lint
npx tsc --noEmit
npm run check:assets
npm run check:gameplay
npm run check:environment
npm run check:safehouses
npm run check:interiors
npm run check:graphics
npm run build
```

Die Prüfungen decodieren 49 Weltmodelle und kontrollieren Animationsbindung, Missionswege, neue Innenräume, Loot-Erreichbarkeit, Türzustände, Sichtkontakt, Geräuschgedächtnis, Angriffszeitpunkte, Ausweichen und Posen aller fünf Gegnertypen. Die Innenraumprüfung kontrolliert beide Eingänge, die Durchgänge zwischen den Räumen, Möbelabstände, alle 24 neuen Vorräte und acht Briefe sowie Texturen und das Zusammenfassen der Geometrie.

Wiederholbare Browserprüfungen mit laufendem Entwicklungsserver:

```sh
npx --yes --package @playwright/cli playwright-cli -s=zombie open http://localhost:3000 --headed
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-smoke.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-dialogue-map.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-safehouses.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-interiors.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-graphics.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-trees.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-story.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-defense.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-environment.js
```

Eine ausschließlich im Entwicklungsbuild verfügbare QA-Schnittstelle erlaubt Positionierung und Zustandsabfragen. Kampf, Gegenstände, Aufgaben, Navigation und Timer laufen durch die echten Spielsysteme. Der Verteidigungstest setzt den Storytest fort. Bildschirmaufnahmen liegen in `output/playwright/`.

Statische Stadtteile sind nach Material zusammengefasst und werden nach Entfernung ausgeblendet. Maximal vierzig lebende Gegner sind zugelassen; entfernte KI pausiert und wird außerhalb von 110 Metern entfernt. Leichen werden nach kurzer Zeit freigegeben. Pfadsuchen sind begrenzt und zeitlich versetzt. Es gibt kein Festplatten-Streaming der Welt; Modelle werden weiterhin im Browser geladen.

## Assets

Kenney: **Graveyard Kit**, **Survival Kit**, **City Kit (Suburban)**, **City Kit (Industrial)** und **Animated Characters Survivors**, jeweils CC0. Lizenzkopien liegen unter `public/models/kenney/`. Zusätzliche Architektur, Naturgeometrie, Fahrzeuge, Materialdaten und Skelettposen werden im Projekt erzeugt; Geräusche entstehen über Web Audio. Es werden keine kostenpflichtigen Asset-Dienste oder zusätzlichen externen Texturquellen benötigt.
