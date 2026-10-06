# Nachtwache — Tannwald

Ein spielbarer Low-Poly-Survival-FPS mit einer frei begehbaren Welt von 420 × 345 Metern, einer Hauptgeschichte und verbundenen Erkundungsaufträgen. Three.js, React und die vorhandenen Kenney-Assets bleiben die Grundlage.

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
| F | Taschenlampe |
| 1 / 2 / 3 / 4 | Verband / Ration / Batterie / Leuchtfackel |
| 5 | Sender mit drei Ersatzteilen verstärken |
| 6 / 7 / 8 | Wasser / Antibiotika / Schutzweste |
| J / M / Tab | Journal: Karte, Waffen, Vorräte, Aufgaben und Hinweise; pausiert |

## Spielablauf

Mara schickt Elias vom Rangerlager über Markt und Friedhof zur alten Klinik. Noah muss befreit und zum Funkturm begleitet werden. Er navigiert um Gebäude und folgt dem Spieler; am Sender muss er innerhalb von zwölf Metern angekommen sein. Anschließend gilt es, vierzig Sekunden im Umkreis von achtzehn Metern zu überleben. Drei Ersatzteile verkürzen die Zeit auf dreißig Sekunden.

Die Oststadt ist jederzeit über die Hauptstraße erreichbar. Ihr Straßennetz verbindet zwölf neue betretbare Orte einschließlich Notaufnahme, Polizei, Markthalle, Werkstatt, Feuerwehr, Wohnblock, Schule, Bahnhof, Kontrollpunkt und Lazarus-Archiv. Hof und Waldcamp liegen westlich außerhalb der Stadt. Öffentliche Gebäude haben eingerichtete Innenräume; geschlossene Wohn- und Büroblöcke bilden Skyline und Straßenkanten.

Ein Durchlauf startet um 09:00 Uhr. Ein vollständiger Tag dauert 24 Spielminuten; Sonne, Mond, Himmelsfarben, Schatten und leichter Dunst wechseln fließend zwischen Tag, Dämmerung und Nacht. Pausen und Journal halten auch die Weltzeit an. Die Uhrzeit steht im HUD. Nachts leuchten die Unterschlüpfe, und nach Lenz’ Reparatur auch die festen Straßenlaternen.

Rangerstation, Schutzhof der Notaufnahme, Schule und Waldcamp sind eingefriedete Unterschlüpfe mit bewachten Zugängen. Infizierte erscheinen außerhalb und können den Schutzbereich nicht betreten. Kleine Gruppen von Überlebenden bleiben dort; Lenz und sein Generator stehen im Schulhof. Die Karte markiert die Schutzbereiche grün. Dekorationen werden anhand ihrer geladenen Modellabmessungen ausgedünnt, sodass Gebäude, Wege zu Missionszielen, Vorräte und NPCs frei bleiben.

- **Das Licht der Oststadt:** Lenz benötigt die Sicherung aus seiner Werkstatt und zwei Ersatzteile. Der reparierte Generator versorgt die Beleuchtung, lockt Infizierte an und bringt den Polizeischlüssel. In der verschlossenen Waffenkammer liegt eine Schrotflinte.
- **Ein Name auf der Liste:** Dr. Weber sucht Ben. Die Patientenliste führt zum Bahnhof, ein Funkprotokoll weiter ins Waldcamp. Wer seine Rückkehr meldet, erhält Behandlung und Verbände. Mara reagiert auf die Nachricht von Lea.
- **Was Falk verschwieg:** Keycard vom Kontrollpunkt und reparierter Strom öffnen das Archiv. Der Abbruchbefehl bleibt im Journal und verändert den Abschlusstext.

Erkundung liefert Ausrüstung, Medizin und Zusammenhänge. Fortschritt gilt für den aktuellen Durchlauf; ein Neustart setzt ihn zurück. Es gibt derzeit keinen dauerhaften Spielstand.

## Kampf und Überleben

Wandler sind langsam. Hetzer schließen schnell auf; Brecher sind groß, ausdauernd und schlagen hart zu. Kriecher haben niedrige Trefferzonen. Fiebernde reagieren schnell und bewegen sich unruhiger. Wahrnehmung, Verfolgung, Geräuschuntersuchung, Suche, Angriff, Erholung, Treffer, Fallen, Aufstehen und Tod sind getrennte Zustände. Ohne Sichtkontakt verfolgen Gegner die zuletzt bekannte Position. Schüsse, Sprinten, Fackeln und Alarme haben unterschiedliche Hörreichweiten.

Angriffe kündigen sich sichtbar an. Schaden entsteht erst beim Treffermoment und lässt sich durch Abstand oder Deckung vermeiden. Kopftreffer, Schrot aus kurzer Entfernung und Axtschläge unterbrechen beziehungsweise werfen normale Gegner um. Brecher widerstehen dem Stagger. Axtschläge benötigen zwanzig Ausdauer und treffen nur in einem begrenzten Winkel und innerhalb von 2,6 Metern.

Pistole (9 mm), Schrotflinte (12/70) und Karabiner (5.56 mm) haben eigene Magazine und Vorräte. Wasser erhält die Ausdauerregeneration. Infektionen ab 75 Prozent zehren an der Gesundheit; Antibiotika behandeln sie. Westen absorbieren 55 Prozent des Schadens, bis ihr Schutz aufgebraucht ist. Unnötige Heilung verbraucht keine Gegenstände; überzähliger Loot bleibt liegen.

## Architektur und Prüfung

- `app/Game.tsx`: Szene, Eingabe, Kampf, Interaktionen, Aufgaben, Audio und HUD.
- `app/survival.ts`: Waffen, Gegnertypen, Wahrnehmung, Zustände und begrenzte A*-Wegfindung.
- `app/zombieAnimation.ts`: vorhandene Skelettclips plus Gelenkposen. Die Laufphase folgt der gemessenen Bewegung.
- `app/city.ts`: Orte, Einrichtung, Loot, Hinweise, Türen und zusammengefasste Stadtgeometrie.
- `app/world.ts`: ursprüngliche Orte, Briefe, Gegenstände und gemeinsame Deckungsprüfung.
- `app/environment.ts`: Weltzeit, Tageslicht, Unterschlüpfe und Abstandsprüfung.

```sh
npm run lint
npx tsc --noEmit
npm run check:assets
npm run check:gameplay
npm run check:environment
npm run build
```

Die Prüfungen decodieren 49 Weltmodelle und kontrollieren Animationsbindung, Missionswege, neue Innenräume, Loot-Erreichbarkeit, Türzustände, Sichtkontakt, Geräuschgedächtnis, Angriffszeitpunkte, Ausweichen und Posen aller fünf Gegnertypen.

Wiederholbare Browserprüfungen mit laufendem Entwicklungsserver:

```sh
npx --yes --package @playwright/cli playwright-cli -s=zombie open http://localhost:3000 --headed
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-smoke.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-story.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-defense.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-environment.js
```

Eine ausschließlich im Entwicklungsbuild verfügbare QA-Schnittstelle erlaubt Positionierung und Zustandsabfragen. Kampf, Gegenstände, Aufgaben, Navigation und Timer laufen durch die echten Spielsysteme. Der Verteidigungstest setzt den Storytest fort. Bildschirmaufnahmen liegen in `output/playwright/`.

Statische Stadtteile sind nach Material zusammengefasst und werden nach Entfernung ausgeblendet. Maximal vierzig lebende Gegner sind zugelassen; entfernte KI pausiert und wird außerhalb von 110 Metern entfernt. Leichen werden nach kurzer Zeit freigegeben. Pfadsuchen sind begrenzt und zeitlich versetzt. Es gibt kein Festplatten-Streaming der Welt; Modelle werden weiterhin im Browser geladen.

## Assets

Kenney: **Graveyard Kit**, **Survival Kit**, **City Kit (Suburban)**, **City Kit (Industrial)** und **Animated Characters Survivors**, jeweils CC0. Lizenzkopien liegen unter `public/models/kenney/`. Zusätzliche Architektur und Skelettposen werden im Projekt erzeugt; Geräusche entstehen über Web Audio. Die Überarbeitung bleibt dem stilisierten Low-Poly-Look treu.
