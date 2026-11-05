# Grafik in Version 0.3.0

Die Illustrationen sind eigene, im Projekt gezeichnete Formen. Es wurden weder Bilder anderer Spiele noch gekaufte Assetpakete verwendet. Die gemeinsame Farbwelt besteht aus warmem Sandstein und Holz, Terrakotta, blauen Dächern, türkisfarbenem Wasser und hellem Grün.

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

`e2e/rendering.spec.ts` startet beide Darstellungsarten, prüft die Auswahl über sichtbare Gebäudeflächen, die Wiederverwendung von Gelände und Gebäudesprites sowie das Ausblenden außerhalb der Kamera. Außerdem werden sämtliche Gebäude in drei Stufen, sieben Naturvarianten und alle Figurenbilder auf leere oder abgeschnittene Inhalte geprüft.

Diese Browserprüfungen belegen keine bestimmte Bildrate auf einem Android-Telefon. Für eine Gerätefreigabe bleiben Messungen auf realer Hardware erforderlich.


Der erspielte Raumfahrtstand wurde zusätzlich mit 108 Bewohnern und 68 Gebäuden in beiden Modi geladen, ohne JavaScriptfehler. Im hiesigen Headless-Browser mit Softwaregrafik und parallel emuliertem Android lagen die Bildintervalle bei rund 497 ms (WebGL) bzw. 222 ms (Canvas). Das ist für flüssiges Spielen zu langsam. Ein gesondertes Canvas-Profil bei 1280 × 900 Pixeln maß im Mittel rund 1,4 ms für Simulation/Oberfläche, 0,6 ms für Figuren/Effekte und 6,5 ms für den Canvas-Renderaufruf; diese Werte enthalten nicht die nachgelagerte Browserkomposition. Daraus folgt weder eine 30-FPS-Freigabe noch eine Messung auf einem Telefon. Rohdaten: `RENDER_BENCHMARK.json`.
