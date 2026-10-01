# Nachtwache

Ein browserbasierter Low-Poly-First-Person-Shooter mit einer zusammenhängenden Story über fünf Schauplätze.

## Steuerung

- **WASD / Pfeiltasten:** bewegen
- **Maus:** umsehen, Linksklick schießt
- **Shift:** sprinten
- **E:** interagieren
- **R:** nachladen
- **F:** Taschenlampe
- **Escape:** Pause
- **1:** Verband (+40 Gesundheit; wird bei voller Gesundheit nicht verbraucht)
- **2:** Ration (volle Ausdauer und 20 Sekunden geringerer Sprintverbrauch)
- **3:** Batterie (Taschenlampe aufladen)
- **4:** Leuchtfackel (12 Sekunden Ablenkung, bis zu 10 Meter voraus)
- **5:** Mit drei Ersatzteilen am Funkturm den Sender verstärken (Konvoi 10 Sekunden früher)
- **J / M / Tab:** Feldjournal mit Karte, Ausrüstung und gesammelten Briefen; pausiert das Spiel

## Erkunden

Vorräte werden mit **E** gezielt gesammelt. Die Rangerstation bietet Verbände und Essen, das Dorf Rationen, Batterien und Munition, der Friedhof Fackeln und Verbände, die Klinik medizinische Versorgung und Ersatzteile, der Funkturm Munition und Reparaturmaterial. Verbrauchsgegenstände sind auf fünf pro Typ begrenzt, Ersatzteile auf zwölf; überschüssiger Loot bleibt liegen.

Fünf Briefe und bemalte Tafeln erzählen die Geschichte von Mara, Lea und der gescheiterten Evakuierung. Fundstücke bleiben für den aktuellen Durchlauf im Journal und verändern den Abschlusstext. Ein neuer Durchlauf setzt das Journal und alle Vorräte zurück.

Infizierte streifen umher, sehen den Spieler in der Nähe und hören Sprinten sowie Schüsse. Gebäude blockieren Sicht und Schüsse. Fackeln lenken sie ab. Noah wechselt zwischen Stand und Lauf; die echte `Root|Run`-Animation wird gezielt ausgewählt, da der erste Clip der FBX-Datei lediglich eine Zielpose ist. Nebel, Lichtflackern, Feuer, Staub und entfernte Geräusche beleben die Welt. Am Ende muss der Spieler im Umkreis von 18 Metern um den Sender bleiben, damit der Konvoi ankommt.

## Entwicklung und Prüfung

```sh
npm install
npm run dev
npm run lint
npx tsc --noEmit
node --experimental-strip-types scripts/verify-assets.mjs
npm run build
```

Die Assetprüfung decodiert sämtliche 49 Weltmodelle, prüft die Skelettbindung und Bewegung der beiden Animationsclips und kontrolliert alle Start-, Missions- und Fundstellen gegen echte Modellmaße. Eine Flutsuche prüft begehbare Verbindungen vom Startpunkt. Zusätzlich werden Sichtblockierung und unabhängige Inventarzustände geprüft. Benötigt Node.js 22.13 oder neuer.

## Assets

Die eingebundenen 3D-Modelle stammen aus Kenneys **Graveyard Kit**, **Survival Kit**, **City Kit (Suburban)**, **City Kit (Industrial)** und **Animated Characters Survivors**. Die geriggten Survivor-Figuren liefern auch die Lauf- und Idle-Animationen für Zombies und NPCs. Alle Packs stehen unter Creative Commons CC0. Kopien der Lizenztexte liegen unter `public/models/kenney/`.
