# Kampagne durch Tannwald

Ein neues Spiel beginnt in Fichtenau. Dessen Dorfzentrum ist rund 1.270 Meter Luftlinie vom Oststadtzentrum entfernt und liegt damit weiter entfernt als Kornweiler, Brückenfeld und Aschenrode. Startcamp, Mara, Jonas, Übungsziel, Vorräte und Brennstoffzelle sind gemeinsam im Dorf angeordnet.

## Zusammenhang und Route

Das durchgehende Ziel lautet: Noah und die stabile Dosis Gegenmittel zum letzten Konvoi bringen. 49 Missionen folgen einer festen Reihenfolge. HUD, Zielmarke und Journal zeigen immer die nächste Handlung sowie ihren Grund. Ein Bericht ist erst nach seiner letzten Aussage abgeschlossen und bleibt im Journal lesbar.

1. **Ein Licht in Fichtenau:** Maras Erklärung, Karte, Verband, Wasser, gezielter Schuss, Nachladen und Axt bereiten den Weg zum Holzlager vor. Mit der zurückgebrachten Brennstoffzelle kann Mara funken. Während sie den abgebrochenen Hilferuf rekonstruiert, baut Elias die Forstunterkunft aus, prüft die Taschenlampe und schläft bis zum Morgen.
2. **Niemand bleibt zurück:** Noahs Funkspur führt zum See-Campingplatz, zur Jagdhütte, zum Wiesenhof, zur alten Rangerstation und zum Markt. Die Fackel lenkt seine Verfolger ab; Elias befreit ihn am Friedhof.
3. **Webers Rettungsplan:** Noah kennt den gescheiterten Kühltransport W-07. Übergabenotizen und Funkberichte verbinden Westwiesen, Birkenhof, Mühlenhof, Kornweiler, Kirche, Hochforst, Radarstation, Fort Eiche, Außenlabor, Aschenrode, Rasthof, Industrie und Innenstadt. Jede Station erklärt, weshalb der Transport weitergeschickt wurde. Weber benötigt die Kennung aus dem Archiv: Lenz, Sicherung, Generator, Waffenkammer und Keycard erschließen den Zugang. Das Protokoll identifiziert Dosis C-07 und Falks Abbruchbefehl.
4. **Die letzte Bergung:** Der Weg zum Kühlbehälter führt durch die Vororte, zur Tankstelle und nach Brückenfeld. Am Umspannwerk wird der Kühlanschluss freigegeben, im Steinbruch W-07 geborgen. Elias holt die passende Dosis, verstärkt den Sender und begleitet Noah zur gemeinsamen Endverteidigung.

Alle vier Dörfer, drei Stadtgebiete, die übrigen sechs Regionsgebiete und alle zwölf benannten Außenorte liegen auf der Hauptquest. Freie Erkundung und Bens Suche bleiben möglich. Weitere Safehouses sind freiwillige Rückzugsorte; ihr Ausbau ist außerhalb der Einführung keine Pflichtmission.

## Regionale Safehouses

| Gebiet | Einnehmbares Gebäude |
| --- | --- |
| Fichtenau | Forstunterkunft |
| Kornweiler | Gemeindehaus |
| Brückenfeld | Schleusenhaus |
| Aschenrode | Wachhaus |
| Oststadtzentrum | Haus am Rathaus |
| Vororte Linden | Nachbarschaftshaus |
| Industriegebiet Ostwerk | Pförtnerhaus |
| Fort Eiche | Sanitätsunterkunft |
| Landwirtschaft Kornmark | Feldunterkunft |
| Hochforst | Waldwache |
| Südlicher Tannwald | Waldhaus |
| Aue-Flusstal | Uferhaus |
| Westliche Weiden | Wegehaus |

Mit den vier bestehenden Häusern im zentralen Tannwald gibt es 17 ausbaubare Innenräume. Jedes Haus erhält örtliche Bretter, Ersatzteile und eine Ration. Vier Fenster kosten insgesamt acht Bretter, zwei verstärkte Türen zwei Ersatzteile und das Bett eine Ration. Der Innenraum muss frei von Infizierten sein. Erst mit geschlossenen Türen und vollständiger Ausstattung ist die Aktivierung möglich. Anschließend können Spieler dort nachts bis 06 Uhr schlafen und einen Respawnpunkt setzen.

`shelterSites.ts` ist die gemeinsame Quelle für Haus- und Startpositionen. Regionale Gebäude, Bäume und Siedlungsdetails halten die reservierten Flächen frei; das Gelände bildet ebene Fundamente. Die normalen Innenraum-, Tor-, Fenster-, UV-, Schlaf- und Speichersysteme gelten für alle Häuser.

## Spielstände und Prüfungen

Ältere Spielstände der 26-Schritt-Kampagne werden anhand der Missionskennung übernommen. Bereits verbrauchtes Loot wird den neuen Positionen zugeordnet; neue regionale Baumaterialien werden ergänzt. Bestehende Häuser, Respawnpunkt, Ausrüstung und Gesprächsfortschritt bleiben erhalten. Für den vollständigen neuen Einstieg wird ein neues Spiel gewählt.

`npm run check:campaign-region` prüft die Entfernung der Dörfer, alle Gebiete und Außenorte in der Missionsfolge, freie Ziele und Vorräte, ebene Häuser sowie Wege durch tatsächlich geöffnete Tore zu den Betten. `npm run check:safehouses` kontrolliert Baukosten und Zustände aller 17 Häuser. `npm run check:save` prüft aktuelle Spielstände und die Übernahme alter Daten.

Die Browserprüfung `scripts/browser-story.js` durchläuft alle 49 Schritte bis zur Endverteidigung und prüft alle 13 Gebiete und zwölf Außenorte. Sie nutzt QA-Positionierung für lange Reiseabschnitte; Interaktionen, Dialoge, Bau, Kampf, Schlaf, Speichern und der letzte Begleiterweg laufen durch die echten Spielsysteme. `scripts/browser-story-ending.js` prüft Verteidigung und gespeicherten Sieg. `scripts/browser-safehouses.js` prüft Bau, Aktivierung und Respawn in allen 17 Häusern.

## Abnahme

Die vollständige Storyroute und die Endverteidigung einschließlich erneut geladenem Sieg bestanden am 7. Oktober 2026. Am 12. Oktober bestanden Bau, Aktivierung, UV, Schlaf bis morgens und Respawn in allen 17 Häusern sowie die Browserprüfung für unterbrochene Gespräche, Nachladen, Vorräte und Weiterspielen. Die Speicherprüfung umfasst außerdem die Übernahme der früheren Kampagne. Ein dabei gefundener Rundungsfehler beim Warten bis 19 Uhr ist mit einer Prüfung gebrochener Framezeiten abgesichert; Gespräche halten den Kamerawinkel innerhalb des speicherbaren Bereichs.
