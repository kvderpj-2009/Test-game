# Grafik in Version 0.4.0

Die Illustrationen sind eigene, im Projekt gezeichnete Formen. Es wurden weder Bilder anderer Spiele noch gekaufte Assetpakete verwendet. Die gemeinsame Farbwelt besteht aus warmem Sandstein und Holz, Terrakotta, blauen Dächern, türkisfarbenem Wasser und hellem Grün.

## Epochen und kompakte Oberfläche

Die Steinzeit verwendet eine eigene Gebäudefamilie: runde Flecht-/Lehmhütten, Strohdächer, Fellunterstände, rohe Holzpfosten, Steinwerkplätze und unbefestigte Wege. Dorfzentrum, Wohnhäuser und Forschungshütte besitzen keine Ziegeldächer, Glastürme oder Observatoriumskuppeln. Die Mühle ist ein Mahlsteinplatz, die Werkstatt ein offener Werkzeugplatz. Die Forschungshütte ist an einem Stein mit ockerfarbenen Zeichen erkennbar. Bewohner und frühe Truppen tragen erdige Kleidung und einfache Ausrüstung.

Bronze- und Eisenzeit erhalten eine zweite Materialvariante; ab der Antike wird die bisherige Gebäudefamilie verwendet. Neue spätere Gebäudetypen behalten ihre eigenen Formen. Die Darstellung richtet sich beim Laden, beim Epochenwechsel und in Vorschaubildern nach dem Spielstand. Grundflächen, Produktionswerte und Speicherformat ändern sich nicht. Höchstens drei Grafikfamilien je frühem Gebäudetyp werden zwischengespeichert.

Die Oberfläche belegt im Standardzustand nur eine 44 Pixel hohe Kopfleiste (66 Pixel bei schmalen Ansichten), sechs Symbole rechts und eine Minikarte unten links. Alle Inhaltsfenster öffnen auf Wunsch, sind schließbar und blockieren die Welt außerhalb ihres Bereichs nicht. Katalog, Forschung, Welt, Militär und Aufgaben scrollen innerhalb eines begrenzten Fensters. Bestätigungen bleiben modal.

Aufnahmen: [Desktop](compact-ui-desktop-0.4.0.png) · [Handy](compact-ui-mobile-0.4.0.png) · [Baumenü](compact-ui-build-0.4.0.png) · [Forschung](compact-ui-research-0.4.0.png).

## Gebäude und Bewohner

Alle 65 Gebäudetypen besitzen passende Darstellungen. Zu den neuen Formen gehören gefüllte Lagerplätze, Getreidesilos, Säulenbauten, eine Sternwarte mit Fernrohr, Fachwerk-Wachtürme, Industriehallen, ein Bohrturm, moderne Wohnhäuser, Reaktorkuppeln und eine Raketenrampe. Dachziegel, Fenster, Werkzeuge, Rohstoffe und kleine Gärten zeigen die Funktion. Ausbaustufen erhalten zusätzliche Markierungen; bei Wohn- und Industriebauten verändert sich auch die Höhe.

Bewohner tragen Werkzeuge oder Kisten. Die 13 Truppentypen verwenden passende Ausrüstung: unter anderem Bogen, Schild, Pferd, Katapult, Kanone und Rotoren. Die Gehphase folgt der tatsächlich zurückgelegten Strecke. Figuren, Natur und Gebäude werden nach ihrer Position in der isometrischen Welt sortiert.

## Darstellung und Kompatibilität

- Gebäude- und Naturtexturen werden wiederverwendet.
- Acht vorbereitete Animationsbilder je Figurenart und Tätigkeit ersetzen das erneute Zeichnen der Körperformen in jedem Bild.
- Gelände wird bei Änderungen an Weltcode, gerodeten Feldern oder Erkundung erneuert. Bau, Upgrade und Lageränderungen lösen keine neue Geländetextur aus.
- Geländetexturen sind in Seiten mit höchstens 1024 × 1024 Pixeln aufgeteilt. Gebäude verwenden 288 × 260 Pixel, Figuren 64 × 80 Pixel je Bild.
- Objekte außerhalb der Kamera werden ausgeblendet. Die sparsame Grafikoption begrenzt die Bildrate und reduziert Effekte.
- Pixi versucht WebGL und wechselt bei fehlender Unterstützung zu Canvas. Mit `?renderer=canvas` an der Spieladresse lässt sich Canvas direkt auswählen. Das verändert den Spielstand nicht.
- Die Android-App zeigt nach einem WebView-Rendererabbruch oder nach 45 Sekunden ohne Startbestätigung eine native Wiederherstellungsansicht. Ihr Kompatibilitätsknopf startet Canvas und merkt sich die Auswahl für folgende Starts. Die normale Darstellung lässt sich dort ebenfalls erneut versuchen.

## Prüfungen

`e2e/rendering.spec.ts` startet beide Darstellungsarten, prüft die Auswahl über sichtbare Gebäudeflächen, die Wiederverwendung von Gelände und Gebäudesprites sowie das Ausblenden außerhalb der Kamera. Außerdem werden sämtliche Gebäude in drei Stufen und drei Epochen, sieben Naturvarianten und alle Figurenbilder einschließlich der Steinzeitvarianten auf leere oder abgeschnittene Inhalte geprüft. `e2e/compact-ui.spec.ts` prüft geschlossene Startfenster, Fensterwechsel, freies Kartenziehen, Forschungszugriff, Epochenwechsel und Ansichten bei 1440 × 900, 390 × 844 sowie 844 × 390 Pixeln.

Diese Browserprüfungen belegen keine bestimmte Bildrate auf einem Android-Telefon. Für eine Gerätefreigabe bleiben Messungen auf realer Hardware erforderlich.

Der erspielte Raumfahrtstand wurde zusätzlich mit 108 Bewohnern und 68 Gebäuden in beiden Modi geladen, ohne JavaScriptfehler. Im hiesigen Headless-Browser mit Softwaregrafik und parallel emuliertem Android lagen die Bildintervalle bei rund 497 ms (WebGL) bzw. 222 ms (Canvas). Das ist für flüssiges Spielen zu langsam. Ein gesondertes Canvas-Profil bei 1280 × 900 Pixeln maß im Mittel rund 1,4 ms für Simulation/Oberfläche, 0,6 ms für Figuren/Effekte und 6,5 ms für den Canvas-Renderaufruf; diese Werte enthalten nicht die nachgelagerte Browserkomposition. Daraus folgt weder eine 30-FPS-Freigabe noch eine Messung auf einem Telefon. Rohdaten: `RENDER_BENCHMARK.json`.
