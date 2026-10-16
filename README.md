# Nachtwache — Tannwald

Ein spielbarer Survival-FPS mit einer frei begehbaren Region von **2.400 × 2.000 Metern (4,8 km²)**, einer Hauptgeschichte und verbundenen Erkundungsaufträgen. Die ursprünglichen Missionsorte liegen weiterhin im Zentrum der Region. Eine erweiterte Oststadt, vier Landdörfer, Wälder, Landwirtschaft, Flüsse und abgelegene Anlagen machen daraus eine zusammenhängende Welt. Three.js, React und die vorhandenen Kenney-Assets bleiben die Grundlage.

## Die neue Region

Die Oststadt besitzt ein dichtes Zentrum mit acht 25–60 Meter hohen Türmen, Wohnblöcke mit durchsuchbaren Erdgeschossen, südliche Vororte und ein Industriegebiet am Nordzubringer. **Kornweiler** liegt zwischen Äckern und Höfen, **Fichtenau** am Forst, **Brückenfeld** an der Talstraße und **Aschenrode** am verlassenen Nordende. Die Häuser folgen den Zufahrten und örtlichen Straßen statt einem wiederholten Dorf-Raster.

Der Fluss **Aue**, **Birkenbach** und **Hochbach** bilden ein geschwungenes Gewässersystem; Waldsee und Mühlenteich ergänzen es. Sechs aus Straßen-/Wasserkreuzungen abgeleitete Brücken sind begehbar. Tiefes Wasser sperrt den Weg für Spieler und Infizierte; Begleiter können die Brücken benutzen. Boden unter Brücken und begehbare Deckhöhe sind getrennt.

**Fort Eiche** steht auf einer abgelegenen Anhöhe mit umzäuntem Hof, bewachbarer Zufahrt, fünf begehbaren Hallen, Wachtürmen, Containern und Helipad. Weitere Ziele sind Bauernhöfe, Jagdhütte, Campingplatz, Kirche, Tankstelle, Rasthof, Radarstation, Steinbruch, Umspannwerk und ein verlassenes Lazarus-Außenlabor. Die ruhigeren Zwischenräume bleiben bewusst unbebaut. Je nach Region gelten vier Risikostufen mit 12/22/32/40 aktiven Infizierten als Obergrenzen und unterschiedlicher Verstärkungsrate; militärische Orte erhalten häufiger Brecher und militärische Vorräte.

124 zusätzliche Gebäude, rund 7.600 regional instanzierte Bäume und zusätzliche Vorratsfundorte erweitern die bisherigen Inhalte. Dazu gehören jetzt eine echte Scheune am Birkenhof und eine Tankstellengarage für die Suchaufträge. Zu den alten 21 Innenräumen kommen 13 regionale Safehouses hinzu. Die Hauptquest führt in 49 Missionen durch alle vier Dörfer, die Stadtgebiete und sämtliche zwölf abgelegenen Orte. Maras Karte zeigt das ganze Straßennetz, Gewässer, Felder, Waldgebiete, Gebäude und wichtige Orte. Bis zu 2.400 % Zoom und „Mein Standort“ zeigen auch lokale Details.

Die Planung ist in `app/regionPlan.ts` abgelegt, das Gelände in `app/regionTerrain.ts` und die abschnittsweise Darstellung/Kollision in `app/regionWorld.ts`. Erweiterung und Gestaltungsregeln stehen in [docs/world-design.md](docs/world-design.md).

## Siedlungsdetails

Stadt, Dörfer und Industriehöfe enthalten jetzt rund 1.350 zusätzliche Alltagsobjekte und 24 kleine Szenen: Caféterrassen, Haltestellen, Marktplatz, Spielbereich, Baustelle, Ladehof, Parkplatz und Evakuierungsorte. Straßenlaternen, Ampeln, Überwege, Bordsteine, Parkbuchten, unterschiedliche Fahrzeuge, Hauszugänge, Briefkästen, Hecken, Fahrräder und zurückgelassene Gegenstände verbinden die Gebäude mit ihrer Umgebung. Die Dörfer erhalten passende Landwirtschafts- und Forstdetails; Aschenrode zeigt einzelne Unfall- und Sperrstellen.

Stadt und Dörfer besitzen durchgehende Gehwege. Vollständige Objektflächen halten Fahrbahnen, Gehwege und Hauszugänge frei; Laternen erhalten nachvollziehbare Abstände. Korrigierte alte Zufahrten umgehen Gebäude, und alle sechs Haltestellen haben einen Unterstand. `npm run check:layout` prüft die gesamte Karte über volle Straßenbreiten, Gehwegflächen und Fundamente. Details stehen in [docs/map-placement.md](docs/map-placement.md).

Vorhandene Assets werden wiederverwendet. Instanzierte Komponenten in 80-Meter-Zellen und getrennte Sichtweiten begrenzen die Darstellung; die zusätzliche Straßenbeleuchtung verwendet das bestehende Lichtbudget und Lenz' Stromversorgung. `app/settlementPlan.ts` plant die Details, `app/settlementDetail.ts` stellt sie dar. Gestaltungsregeln und Prüfungen stehen in [docs/settlement-details.md](docs/settlement-details.md). `npm run check:settlements` prüft Stellflächen, Fahrbahnen, Türen, Vorräte, Modelldimensionen, Instancing und Culling.

## Natur und Wildtiere

Zusätzliche Hügel, Felsgruppen und dichtere Waldinseln unterbrechen die offenen Grünflächen. Vereinfachte Baumkronen ermöglichen rund 7.600 regionale Bäume mit größeren Sichtweiten. Drei kleine Teiche ergänzen Waldsee und Mühlenteich; Schilf, Seerosen, Ufersteine und Treibholz kleiden die Gewässer aus. 56 Rehe, Hasen und Enten wandern, hüpfen und schwimmen in passenden Lebensräumen und weichen dem Spieler aus. Details und Prüfungen stehen in [docs/wilderness.md](docs/wilderness.md).

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
| 1–5 | Gegenstand auf dem frei belegten Hotbar-Platz benutzen / Waffe ausrüsten |
| I | Inventar öffnen / schließen; pausiert |
| Ziehen oder Gegenstand + Zielplatz anklicken im Inventar | Stapel und Waffen verschieben, Positionen tauschen, Hotbar belegen oder leeren |
| 1–5 nach Auswahl im Inventar | Gewählten Gegenstand auf diesen Hotbar-Platz legen; belegte Plätze werden getauscht |
| M | Maras Weltkarte öffnen / schließen; pausiert |
| J / Tab | Journal: Karte, Waffen, Vorräte, Aufgaben und Hinweise; pausiert |
| Mausrad / + / − auf der Karte | Von der gesamten Welt bis zu 2.400 % zoomen |
| Ziehen / Pfeiltasten auf der Karte | Kartenausschnitt verschieben; Pos1 zeigt die ganze Karte |

## Spielablauf

Ein neues Spiel beginnt im Rangerlager **Fichtenau**, dem am weitesten vom Stadtzentrum entfernten Dorf. Mara erklärt Elias dort die Lage und organisiert mit ihm die erste Hilfstour. Gespräche erscheinen als einzelne Untertitel mit Sprechername; die nächste Aussage folgt erst auf E, Leertaste, Enter oder den Weiter-Button. Währenddessen pausieren Weltzeit, Bewegung und Kampf. Nach Maras Einführung erhält Elias ihre Karte und den Auftrag, die Brennstoffzelle aus dem örtlichen Holzlager zurückzubringen. Die Karte zeigt von Anfang an die gesamte Spielwelt mit allen wichtigen Orten, Straßen, Gebäuden, Unterschlüpfen, Spielerposition und Missionsziel. Mausrad und Plus/Minus zoomen, Ziehen verschiebt den Ausschnitt. „Ganze Karte“ und „Mein Standort“ helfen bei der Orientierung. Ausrüstung und Fundstücke bleiben schon vor der Kartenübergabe verfügbar.

Auf der Karte markieren grüne Haus- und Schildsymbole gesicherte Safehouses und bewachte Unterschlüpfe. R zeigt den Respawnpunkt; ein gelber Rand kennzeichnet einen offenen Eingang. Bereits angesprochene NPCs erscheinen mit einem lila Personensymbol. Die Namenslisten unter der Karte zoomen direkt zum gewählten Ort oder Gesprächspartner. Kontakte bleiben beim Speichern erhalten; Noahs Markierung zeigt seine aktuelle Position.

Die Hauptstory führt in **49 Missionen durch vier Kapitel**. Zuerst hilfst du Menschen und baust Rückzugsorte auf. Über Versorgung und gemeinsame Einsätze entsteht der Kontakt zu Weber; erst ein Labortest bestätigt die Chance auf ein Heilmittel. HUD, Karte und Journal zeigen die aktuelle Teilaufgabe und ihren Zweck. Bens Suche bleibt ein freiwilliger Nebenauftrag.

**Ein Licht in Fichtenau:** Versorge Jonas, lerne Ausrüstung und Kampf kennen, bringe Maras Funkgerät zum Laufen und sichere die Forstunterkunft. **Niemand bleibt zurück:** Durchsuche eine Campinghütte nach Medizin, behandle Eva, befreie Tom, begleite Oskar und sichere den Markt. **Was unsere Versprechen kosten:** Berge Lebensmittel, repariere mit Mila die Wasserpumpe und sichere Kornweiler. Schütze Funker und Mechaniker, rette Gestrandete und untersuche mit Noah eine Probe im Außenlabor. **Ein Morgen nach dem Krieg:** Versorge eine Krankenstation, baue mit Jo die Kühlung auf, schalte das Umspannwerk zu und berge den Behälter mit Otto. Danach folgen C-07 und die gemeinsame Endverteidigung. Die 23 ehemaligen Briefstationen enthalten je nach Entscheidungen 92–94 Teilaufgaben, zwölf Handlungsarten und 17 zusätzliche NPCs. Arbeitszeiten, Begleiterwege und Sicherungen haben echte Abschlussbedingungen. Erfolgreiche Hilfseinsätze verringern die reguläre Gegnerverstärkung im jeweiligen Gebiet.

Sieben Entscheidungen verändern die folgenden Aufgaben, medizinische Unterstützung, Fraktionsgegner und das Ende. Eva, Hanna, Ralf und Noah erklären die persönlichen Folgen. Der Bürgerbund und die Eichenwache geraten erst nach den ersten Hilfstouren und dem Labortest in einen offenen Konflikt. Menschliche Kämpfer nutzen Gewehre, Sichtkontakt und Wegsuche; Verbündete und Infizierte können einander bekämpfen. Das Journal hält die gewählten Zusagen fest. Die fortlaufende Story bleibt auf derselben verständlichen Route durch alle Orte. Briefe sind überwiegend freiwillige Hintergrundgeschichten; der Hauptweg benötigt nur ein zusammenhängendes Archivprotokoll.

Am Start stehen **Weiterspielen** und **Neues Spiel**. Der Spielstand wird automatisch alle drei Sekunden sowie bei Gesprächen, Pausen, Schlafen, beim Verlassen und bei Tod oder Sieg lokal in diesem Browser gespeichert. Er enthält Quest und Gesprächsposition, Spieler und Noah, Uhrzeit, Gesundheit, Waffen und Munition, Inventar, genommenes Loot, Gegner, Türen, Tore, Barrikaden und Respawnpunkt. Weiterspielen lädt auch nach einem Neuladen diese Welt; neues Spiel ersetzt den bisherigen Durchgang. Beschädigte oder zur Spielwelt inkompatible Daten deaktivieren Weiterspielen mit einem Hinweis und verhindern kein neues Spiel. Es gibt einen lokalen Spielstand, keine Synchronisierung zwischen Browsern oder Geräten.

Das Inventar hat einen frei sortierbaren Rucksack und genau **fünf Hotbar-Plätze** für Waffen oder Vorratsstapel. **I** öffnet direkt die Verwaltung. Ziehen oder zwei Klicks verschieben einen Gegenstand; ein belegter Zielplatz tauscht beide Positionen. Die Detailansicht erlaubt Benutzen, Ausrüsten und Zurücklegen in den Rucksack. Neue Funde landen im Rucksack, leere Stapel geben ihren Platz frei. Die Anordnung wird nach jeder Änderung gespeichert. Ältere Spielstände erhalten automatisch neue Plätze; Vorräte und Munition bleiben erhalten.

Spielstände der bisherigen 26-Schritt-Kampagne werden übernommen: Die aktuelle Mission, Ausrüstung, verbrauchten Vorräte und vier bisherigen Häuser bleiben erhalten; die neuen regionalen Häuser starten ungesichert. **Neues Spiel** beginnt die vollständige Route ab Fichtenau. Die Route und regionalen Rückzugsorte stehen in [docs/campaign-route.md](docs/campaign-route.md).

Noah navigiert um Gebäude, folgt dem Spieler nach seiner Befreiung und unterstützt ihn im Kampf. Weitere Begleiter warten bei Gefahr oder zu großem Abstand; gemeinsame Arbeiten pausieren ohne Deckung und Nähe. Teilziele, Arbeitszeiten, Angriffswellen und Begleiterpositionen werden mitgespeichert. Am Sender muss Noah innerhalb von zwölf Metern angekommen sein. Anschließend gilt es, vierzig Sekunden im Umkreis von achtzehn Metern zu überleben. Die in der Hauptquest erforderliche Verstärkung mit drei Ersatzteilen verkürzt die Zeit auf dreißig Sekunden.

**17 begehbare Gebäude** lassen sich zu eigenen Unterschlüpfen ausbauen: je ein neues Safehouse in allen 13 Regionsgebieten sowie die bisherigen **Forsthaus am Dorfrand**, **Feuerwache 04**, **Lindenhof** und **Hof Birkenrain**. Fichtenau gehört zur Einführung; Kornweilers Gemeindehaus wird später für die Dorfbewohner gesichert. Weitere Häuser können unterwegs freiwillig ausgebaut werden. Öffne das Hoftor mit **E am rechten Pfosten** und räume den Innenraum. Mit **E** vernagelst du jedes der vier offenen Fenster für zwei Bretter, verstärkst die beiden Türen für je ein Ersatzteil und bereitest das Bett für eine Ration vor. Baumaterial liegt vor jedem Haus. Bretter versperren tatsächlich Sicht, Schüsse und Bewegung. Verstärkte Türen lassen sich mit E öffnen und schließen. Erst vier vernagelte Fenster, zwei geschlossene und verstärkte Türen und das vorbereitete Bett erlauben die Aktivierung am Bett. Nach Aktivierung werden UV-Lampen installiert. Bei Dunkelheit halten sie Infizierte auch bei offener Tür oder offenem Tor zurück. Tagsüber zählen die tatsächlichen Barrikaden; zum Schlafen müssen weiterhin beide Haustüren geschlossen sein. Ungesicherte oder noch nicht aktivierte Häuser haben keine UV-Lampen und keinen automatischen Schutz.

**E am vorbereiteten Bett** öffnet die Unterschlupfverwaltung und pausiert das Spiel. Aktiviere den Ort, wähle deinen Respawnpunkt oder warte sicher bis 19 Uhr. Zwischen 19 und 06 Uhr kannst du bis **06:00 am folgenden Morgen** schlafen; das regeneriert Ausdauer und bis zu 35 Gesundheit, verbraucht aber Durst. Nach dem Tod führt „Im Unterschlupf aufwachen“ zum gewählten Bett. Questfortschritt, Ausrüstung, bereits genommenes Loot und alle ausgebauten Häuser bleiben erhalten; Munition und Vorräte werden nicht neu erzeugt. Noah kehrt mit dir zurück, die Haustüren schließen sich. Beim Tod während der letzten Verteidigung beginnt deren Timer erneut. Karte und Journal zeigen Baufortschritt und aktiven Respawnpunkt. Die automatische Speicherung erhält den Durchgang auch nach dem Neuladen. Nur „Neues Spiel“ setzt den Spielstand zurück.

Die Oststadt ist jederzeit über die Hauptstraße erreichbar. Die handgebauten Innenräume umfassen jetzt **34 begehbare Orte**, einschließlich Forsthaus, Notaufnahme, Polizei, Markthalle, Werkstatt, Feuerwehr, Wohnblock, Schule, Bahnhof, Kontrollpunkt, Lazarus-Archiv und regionalen Safehouses. Zusätzlich bleiben die durchsuchbaren regionalen Erdgeschosse und Hallen zugänglich. Hof und Waldcamp liegen westlich außerhalb der Stadt.

Acht bisher geschlossene Häuserzeilen sind jetzt im Erdgeschoss begehbar: **Apotheke am Ring, Praxis Dr. Keller, Bäckerei Morgenrot, Elektro Funk & Technik, Café zur Linde, Wohnung der Familie Seidel, Waschsalon und Poststelle Ost**. Jedes Gebäude hat drei verbundene Raumabschnitte, einen offenen Vorder- und Hintereingang, 24 zusätzliche Vorratsfundorte insgesamt und einen eigenen lesbaren Brief, der im Journal gespeichert wird. Die Funde passen zum Ort: Medizin in Apotheke und Praxis, Lebensmittel in Bäckerei und Café, Batterien und Ersatzteile im Elektroladen. Karte und Ortsanzeige führen die Häuser einzeln; als erkundet zählt ein Ort erst beim Betreten.

Die Innenräume enthalten passende Verkaufs-, Arbeits-, Wohn- und Lagerräume mit Schränken, Regalen, Geräten, Sitzmöbeln und Kleinteilen. Holz-, Fliesen-, Putz- und Stoffoberflächen, verglaste Fensteröffnungen, Fensterbänke, Heizkörper, Sockelleisten, Steckdosen, Schalter und Deckenleuchten ergänzen die Einrichtung. Die Wohnung hat Küche, Sofa, Bett und Waschbereich; der Waschsalon hat Waschmaschinen mit Trommeln und einen Technikraum; die Praxis einen Behandlungsplatz. Möbelkanten sind abgerundet, Oberflächen besitzen Materialrelief und unterschiedliche Rauheit. Die oberen Fassadengeschosse bilden weiterhin die Skyline; zugänglich sind die Erdgeschosse.

## Umgebung und Grafik

Die gesamte Welt verwendet elf lokal erzeugte Materialtypen: Waldboden, Asphalt, Beton, Putz, Ziegel, Holz, Rinde, Stein, Metall, Stoff und Fliesen. Separate Farb-, Relief- und Rauheitsdaten werden in Weltkoordinaten auf die Geometrie projiziert; ihre Größe bleibt unabhängig von der Größe eines Gebäudes. Auch die ursprünglichen Modelle erhalten Oberflächendetails, während ihre Farbtexturen erhalten bleiben. Die Materialien benötigen keine externen Bilddownloads.

Die Nadelbäume haben dichte, unregelmäßige Fichtenkronen; Laubbäume rundliche, verzweigte Kronen. Schlanke, leicht gebogene Stämme verjüngen sich nach oben. Lokal erzeugte 512-Pixel-Texturen zeigen ganze Zweige mit feinen Nadeln beziehungsweise Blättern und transparenten Zwischenräumen. Gefaltete, räumlich verteilte Zweigflächen, weiche Kronennormalen und leichte Windbewegung vermeiden die bisherigen großen, vereinzelten Blattdreiecke. Jeder Baum bleibt auf zwei Materialgruppen beschränkt; seine Form ist anhand des Standorts reproduzierbar. Weitere Bäume und mehrere Tausend Grasbüschel verteilen sich über freie Wald- und Randflächen. Innenräume, Schutzbereiche, Straßen und wichtige Fundorte werden ausgenommen. Neue Baumstämme und Straßenmöbel besitzen Kollision. Felsen haben unregelmäßige, geglättete Formen; Kisten und Fässer zusätzliche Beschläge beziehungsweise Fassringe.

Die Oststadt hat Gehwegplatten, Bordsteine, Zebrastreifen, Kanaldeckel, Pfützen, Bänke, Abfallbehälter, Schaltkästen und geformte Straßenleuchten. Die abgestellten Autos haben abgerundete Karosserien, separate Scheiben, Spiegel, Türen, Reifen, Felgen und Scheinwerfer. Drahtzäune mit Pfosten und Querstreben ersetzen die massiven Wände der bewachten Schutzbereiche; deren Spielkollision und Schutzfunktion bleiben erhalten. Bewölkung, Materialreflexionen, feinere Schatten und zusätzliche Kantenglättung ergänzen den Tag-/Nachtwechsel.

Zusätzliche Details liegen in 40-Meter-Abschnitten und werden außerhalb von 105 Metern ausgeblendet. Baumteile, Fahrzeuge und Architektur werden nach Material zusammengefasst. Die Grafiküberarbeitung verändert weder die Missionsfolge noch die Loot-Mengen. Die vorhandenen Charaktermodelle bleiben stilisiert; diese Überarbeitung ist kein vollständiger Ersatz durch fotorealistische Figuren oder gescannte Architektur.

Die Bäume teilen sich sechzehn Formvarianten pro Baumart und verwenden drei Entfernungsstufen: nahe Kronen behalten ihre vollständigen Zweige, entfernte Kronen brauchen weniger Geometrie. Übergangsbereiche verhindern ständige Stufenwechsel. Entferntes Laub entfällt im Schattenpass. Sonne und Mond teilen sich einen Schattenwerfer mit 1024-Pixel-Schattenkarte; Schatten werden in begrenzten Abständen und bei größeren Bewegungen aktualisiert. Vier feste GPU-Lichtplätze beleuchten die jeweils relevanten Feuer, Laternen und Leuchtfackeln. Innenraum-, Waffen- und Taschenlampenlicht bleiben zusätzlich verfügbar. Die Lichtanzahl bleibt bei Raumwechseln, Gesprächen und Leuchtfackeln konstant, sodass keine neuen Materialshader aufgrund einer anderen Lampenzahl entstehen.

Die interne Auflösung ist auf etwa 1,6 Millionen Pixel begrenzt und wird bei anhaltender Last schrittweise abgesenkt. Bei ausreichender Leistung steigt sie langsam wieder an; einzelne Ruckler oder ein verborgenes Fenster verändern sie nicht. Kantenglättung erfolgt nach der Farbausgabe, der zusätzliche Bloom-Pass entfällt. Größenänderungen werden am Anfang eines Frames übernommen; ein kurzzeitig null Pixel großes Layout löscht die bestehenden Grafikpuffer nicht. Shader werden während des Ladens für den tatsächlichen Renderpfad vorbereitet. Nach einem WebGL-Kontextverlust werden alte GPU-Ressourcen freigegeben, Reflexionen und Shader neu aufgebaut und die Szene wieder gerendert. Gegner teilen sich vorbereitete Charaktergeometrie; pro Frame sind höchstens zwei neue Gegner-Wegberechnungen zugelassen. Neustarts und abgelaufene Leuchtfackeln geben ihre eigenen Ressourcen frei.

Ein Durchlauf startet um 09:00 Uhr. Ein vollständiger Tag dauert 24 Spielminuten; Sonne, Mond, Himmelsfarben, Schatten und leichter Dunst wechseln fließend zwischen Tag, Dämmerung und Nacht. Pausen und Journal halten auch die Weltzeit an. Die Uhrzeit steht im HUD. Ab 17 Uhr steigt die Gefahr fließend an, ab 20 Uhr gilt die volle Nachtstärke: Infizierte laufen 30 Prozent schneller, verursachen 45 Prozent mehr Schaden und erkennen den Spieler aus 25 Prozent größerer Entfernung. Hetzer, Fiebernde und Brecher sind nachts häufiger; die Intervalle für umherziehende Gegner sind um bis zu 55 Prozent kürzer. Ab 05 Uhr nimmt die Gefahr wieder ab, um 07 Uhr gilt Tagesstärke. Gesicherte Unterschlüpfe verwenden unabhängige UV-Notversorgung; Lenz’ Generator versorgt zusätzlich die Straßenlaternen.

Das Startlager Fichtenau, die alte Rangerstation, der Schutzhof der Notaufnahme, die Schule und das Waldcamp sind eingefriedete Unterschlüpfe mit bewachten Zugängen. Alle fünf Orte haben bedienbare Tore. Mit E am rechten Torpfosten lassen sie sich öffnen und wieder schließen; der Schwenkbereich muss frei sein. Die geschlossenen Tore blockieren Bewegung und Sicht. UV-Lampen schalten um 17:30 Uhr automatisch ein und um 06:30 Uhr aus. Bei aktivem UV gelangen Infizierte auch durch offene Tore nicht in den Schutzbereich; bereits eingedrungene Infizierte werden durch UV geschädigt. Kleine Gruppen von Überlebenden bleiben dort; Lenz und sein Generator stehen im Schulhof. Die Karte markiert die Schutzbereiche grün. Dekorationen werden anhand ihrer geladenen Modellabmessungen ausgedünnt, sodass Gebäude, Wege zu Missionszielen, Vorräte und NPCs frei bleiben.

- **Das Licht der Oststadt:** Lenz benötigt die Sicherung aus seiner Werkstatt und zwei Ersatzteile. Der reparierte Generator versorgt die Beleuchtung, lockt Infizierte an und bringt den Polizeischlüssel. In der verschlossenen Waffenkammer liegt eine Schrotflinte.
- **Ein Name auf der Liste:** Dr. Weber sucht Ben. Die Patientenliste führt zum Bahnhof, ein Funkprotokoll weiter ins Waldcamp. Wer seine Rückkehr meldet, erhält Behandlung und Verbände. Mara reagiert auf die Nachricht von Lea.
- **Was Falk verschwieg:** Keycard vom Kontrollpunkt und reparierter Strom öffnen das Archiv. Der Abbruchbefehl bleibt im Journal und verändert den Abschlusstext.

Stromversorgung und Archiv gehören jetzt auch zur Hauptquest. Bens Spur bleibt optional.

Erkundung liefert Ausrüstung, Medizin und Zusammenhänge. Ein neues Spiel setzt den Durchgang zurück; Weiterspielen stellt den gespeicherten Durchgang wieder her.

## Kampf und Überleben

Wandler sind langsam. Hetzer schließen schnell auf; Brecher sind groß, ausdauernd und schlagen hart zu. Kriecher haben niedrige Trefferzonen. Fiebernde reagieren schnell und bewegen sich unruhiger. Wahrnehmung, Verfolgung, Geräuschuntersuchung, Suche, Angriff, Erholung, Treffer, Fallen, Aufstehen und Tod sind getrennte Zustände. Ohne Sichtkontakt verfolgen Gegner die zuletzt bekannte Position. Schüsse, Sprinten, Fackeln und Alarme haben unterschiedliche Hörreichweiten.

Ab Kapitel 3 können zwischen **19:00 und 05:30 Uhr** seltene **Nachtjäger** in Gebieten der Gefahrenstufen 2–3 erscheinen, unter anderem bei Radarstation, Fort, Außenlabor, Aschenrode, Industrie und Oststadt. Die ersten Orte bleiben auch bei späteren Besuchen frei von ihren Spawns. Höchstens zwei sind gleichzeitig aktiv. Mit 560 Lebenspunkten, 5,8 m/s Grundtempo und 38 Grundschaden übertreffen sie alle regulären Typen; nachts wirken zusätzlich die üblichen Nachtboni. Helle Schulterdornen, lange Klauen, orange leuchtende Augen und Rippen und eine geduckte Laufhaltung unterscheiden sie sichtbar. Körpertreffer werfen sie nicht um; Kopftreffer unterbrechen kurz. UV schützt weiterhin, und bei Tagesanbruch oder Schlaf bis zum Morgen verschwinden sie ohne Kill-Gutschrift. Hanna warnt vor der Nordroute; Ivo und später Lenz greifen die Gefahr auf. Maras Einführung enthält diese Warnung noch nicht.

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
- `app/lootVisuals.ts`: erkennbare Modelle für Vorräte und einsammelbare Questobjekte: Verbandrollen, Flaschen, Patronen, Batterien, Westen, Werkzeug, Kanister und Transportkoffer. Kopien teilen Geometrien, drei Materialien und einen Beschriftungsatlas. Fundstücke liegen ruhig auf und werden außerhalb von 100 Metern ausgeblendet.
- `app/worldDetail.ts`: Vegetation und Straßeninfrastruktur mit geprüften Abständen, Stamm-/Möbelkollision und Entfernungsausblendung.
- `app/regionPlan.ts`: deterministische Regionen, verbundenes Straßennetz, Gewässer, Brücken, Parzellen, Felder, Waldmasken, POIs, Loot und räumlicher Index.
- `app/regionTerrain.ts`: erhaltenes Missionsgelände, regionale Hügel, Flussbetten, Gebäudefundamente, Straßenprofile und Brückendecks.
- `app/regionWorld.ts`: Geländeabschnitte, nach Material zusammengefasste Architektur, instanzierte Vegetation, nahe/mittlere/ferne Baumkronen und unabhängige Spielkollision.
- `app/renderBudget.ts`: Renderauflösung, feste lokale Lichtplätze und abbrechbare Shader-Vorbereitung.
- `app/world.ts`: ursprüngliche Orte, Briefe, Gegenstände und gemeinsame Deckungsprüfung.
- `app/environment.ts`: Weltzeit, Tageslicht, Unterschlüpfe und Abstandsprüfung.
- `app/nightSurvival.ts`: Nachtstärke, Gegnerverteilung, UV-Zeiten und bedingter Schutz.
- `app/shelterSites.ts`: regional verteilte Safehouses, Startpunkte und freigehaltene Bauflächen.
- `app/narrative.ts`, `app/storyNarrative.ts`: gespeicherte Entscheidungen, abgeleitete Missionsvarianten, vorbereitete Wendungen und medizinische/politische Enden.
- `app/factionCombat.ts`: menschliche Gewehrkämpfer, Verbündete, Treffer, Deckungswege und gespeicherte Kampfzustände.
- `app/storyActivities.ts`: konkrete Hilfseinsätze, Teilaufgaben, NPCs, Arbeitsplätze und Belohnungen; `regionalStory.ts` erhält die bestehenden Importnamen.
- `app/activityScene.ts`: sichtbare Sanitätskoffer, Versorgungskisten, Werkzeuge, Kühlmodule und betriebsfähige Geräte.
- `app/safehouseScene.ts`: 22 Tore, echte Tor-Kollision und UV-Leuchten mit begrenzter Sichtweite.

```sh
npm run lint
npx tsc --noEmit
npm run check:assets
npm run check:gameplay
npm run check:environment
npm run check:safehouses
npm run check:interiors
npm run check:graphics
npm run check:rendering
npm run check:loot
npm run check:region
npm run check:nature
npm run check:campaign-region
npm run check:save
npm run check:inventory
npm run build
```

Die Prüfungen decodieren 49 Weltmodelle und kontrollieren Animationsbindung, Missionswege, neue Innenräume, Loot-Erreichbarkeit, Türzustände, Sichtkontakt, Geräuschgedächtnis, Angriffszeitpunkte, Ausweichen und Posen aller sechs Gegnertypen. Die Innenraumprüfung kontrolliert beide Eingänge, die Durchgänge zwischen den Räumen, Möbelabstände, alle 24 neuen Vorräte und acht Briefe sowie Texturen und das Zusammenfassen der Geometrie.

Wiederholbare Browserprüfungen mit laufendem Entwicklungsserver:

```sh
npx --yes --package @playwright/cli playwright-cli -s=zombie open http://localhost:3000 --headed
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-smoke.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-dialogue-map.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-map-contacts.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-safehouses.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-interiors.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-graphics.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-trees.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-loot-visuals.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-performance.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-render-stability.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-story.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-story-ending.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-save.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-inventory.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-activity-save.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-defense.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-environment.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-night-survival.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-night-combat.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-night-hunter.js
npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-nature.js
```

Eine ausschließlich im Entwicklungsbuild verfügbare QA-Schnittstelle erlaubt Positionierung und Zustandsabfragen. Kampf, Gegenstände, Aufgaben, Navigation und Timer laufen durch die echten Spielsysteme. Der Verteidigungstest setzt den Storytest fort. Bildschirmaufnahmen liegen in `output/playwright/`.

Der Performancevergleich misst RAF-Bildabstände in Millisekunden im selben 1920×1080-Fenster in Wald, Stadt, Wohnung und Nachtansicht. Jede Ansicht läuft vor der Messung fünf Sekunden, damit Texturuploads und adaptive Auflösung sich einpendeln. Er liefert Median, p95, Rendererprofil, Renderaufrufe, Dreiecke und die tatsächlich verwendete interne Auflösung. Diese Bildabstände enthalten die Bildschirmtaktung und sind keine isolierten GPU-Zeiten. Pixelprüfungen laufen außerhalb des Timingfensters. Der Stabilitätstest prüft Raumwechsel ohne zusätzliche Shaderprogramme, Größenänderungen, 30 reale Gegner, Speicherfreigabe beim Neustart und einen absichtlich ausgelösten WebGL-Kontextverlust. Hardware, Browser, Fenstergröße, Einlaufzeit und Hintergrundlast müssen bei Vergleichen gleich sein.

Statische Stadtteile sind nach Material zusammengefasst und werden nach Entfernung ausgeblendet. Die Region benutzt 100-Meter-Abschnitte: Architektur bis etwa 235 Meter, bodennahe Vegetation bis 130 Meter, Bäume bis 380 Meter, Landmarken bis 650 Meter und Gelände bis hinter die Sichtweite von 1.000 Metern. Vereinfachte regionale Kronen teilen Geometrie und Materialien in drei Detailstufen; Naturdetails verwenden 80-Meter-Zellen. Kollision und Wegsuche fragen einen räumlichen Index ab und bleiben auch außerhalb der sichtbaren Abschnitte wirksam. Bis zu vierzig lebende Gegner sind zugelassen; entfernte KI pausiert und wird außerhalb von 110 Metern entfernt. Es gibt kein Festplatten-Streaming: Die deterministische Region wird beim Laden einmal aufgebaut, entfernte Abschnitte werden ausgeblendet.

Überlagerte Hügelrücken, Wellen und breite Bachmulden gliedern das Gelände. Gebäude, Dorfhöfe und Safehouses stehen auf ebenen Terrassen. Straßen und Ackerstreifen folgen den Hängen; außerhalb der ursprünglichen Enklave benutzen Figuren und Objektfüße die tatsächlich gerenderten Geländedreiecke. Felsen, Buschgruppen, Farne und Grasbüschel werden nach Wald-/Wiesenlage verteilt und erst nach den übrigen Objekten platziert. Standflächen, Neigung, Wasser, Wege, Eingänge, Vorräte und bestehende Objekte werden dabei geprüft. Felsen besitzen Kollision, niedriges Grün bleibt begehbar; Naturdetails teilen sich Geometrie und werden lokal ausgeblendet. `check:nature` prüft auch die transformierten Modellpunkte gegen den sichtbaren Boden; `browser-nature.js` zeigt vier Landschaften und testet echte Bewegung über Hügel.

`npm run check:region` kontrolliert Straßennetz-Verbindungen, sämtliche Zufahrten, Gebäudefundamente, Eingänge, Loot, Wasser-/Straßenabstände, alle Brückendecks, Begleiterwege, erhaltene Missionshöhen, räumliche Abfragen, gültige Geometrie und Instancing/Culling. `scripts/browser-region.js` prüft acht echte Spielsichten, Wasserblockierung, Bewegung über die Aue-Brücke, Maras Kartenübergabe, regionale Kartenebenen und Frame-Abstände. Mit laufendem Server: `npx --yes --package @playwright/cli playwright-cli -s=zombie run-code --filename scripts/browser-region.js`.

## Assets

Kenney: **Graveyard Kit**, **Survival Kit**, **City Kit (Suburban)**, **City Kit (Industrial)** und **Animated Characters Survivors**, jeweils CC0. Lizenzkopien liegen unter `public/models/kenney/`. Zusätzliche Architektur, Naturgeometrie, Fahrzeuge, Materialdaten und Skelettposen werden im Projekt erzeugt; Geräusche entstehen über Web Audio. Es werden keine kostenpflichtigen Asset-Dienste oder zusätzlichen externen Texturquellen benötigt.
