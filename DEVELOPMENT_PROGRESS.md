# Entwicklungsstand — Pocket Civilization 0.2.0

Stand: 4. November 2026. Der spielerische Ausbau ist bis zum Kampagnensieg implementiert. Die auf Wunsch anschließende Grafikverfeinerung ist noch nicht begonnen. Die Android-Datei ist ausdrücklich eine Debug-Testfassung; eine Store-Freigabe liegt nicht vor.

## Sicherungen und Ausgangspunkt

Die erste spielbare Browserfassung 0.1.0 wurde als Ausgangspunkt erhalten. Vor diesem Ausbau wurde `/workspace/backups/Pocket-Civilization-before-campaign.bundle` erstellt und geprüft. Das ursprüngliche Repository-Archiv liegt unter `/workspace/backups/Test-game-before-rebuild.tar.gz`. Der bisherige Downloadzweig `downloads/pocket-civilization-0.1.0` bleibt erhalten. Die Arbeiten erfolgen auf `work`; `main` wird durch die Downloadbereitstellung nicht überschrieben.

## Neu implementiert

- Alle elf Epochen von Steinzeit bis Raumfahrt mit insgesamt 65 Gebäudetypen, 23 Ressourcen und 16 Forschungen.
- Echte spätere Produktionsketten für Eisen, Kohle, Stahl, Stoff, Papier, Medizin, Öl, Energie, Elektronik, Legierungen, Treibstoff, Daten und Kristalle.
- Forschungsbedingungen aus Vorgängertechnologie, lokalem Bevölkerungsziel, erforderlichem Gebäude und Warenkosten. Neue Wohn-, Lager-, Produktions- und Versorgungsgebäude.
- Gesundheit, Bildung und Kultur mit tatsächlicher Versorgung durch beschäftigte Arbeiter; Mangel wirkt auf Zufriedenheit. Produktionspause und Reparaturen.
- Zwölf Regionen; Weltcode für unterschiedliche Wald-/Felsverteilung. Brücken verbinden Flussufer.
- Bis zu vier Siedlungen mit jeweils eigener Karte, Bevölkerung, Armee, Lager und laufender Hintergrundsimulation.
- Bis zu zwölf Warenrouten: getrennte Lager, tatsächliche Abfahrt/Lieferung, einmalige oder regelmäßige Transporte, Pause, Warten bei vollem Ziellager und Rückgabe unterwegs befindlicher Fracht beim Auflösen.
- 13 Truppentypen einschließlich Belagerungseinheiten. Einzel-/Gruppenauswahl, Marsch, Halten, Verteidigen, Rückzug, drei Ziel-Formationen und Heilung bei Ruhe. Maximal 24 Soldaten je Siedlung.
- Hindernisbeachtende Überfälle, skalierende Schwierigkeit, Türme und zerstörbare Gebäude. Friedlich/Normal/Schwer sind umschaltbar.
- 22 Aufgaben und Meilensteine. Die Raumexpedition mit Raumhafen, zwei Siedlungen, sechs Regionen und Startressourcen beendet die Kampagne; Weiterspielen bleibt möglich.
- Format 3 übernimmt echte Version-0.1-Spielstände einschließlich Vorräten, Gebäuden, Arbeitern und Fortschritt. Die erste alte lokale Fassung bleibt unabhängig vom rotierenden Backup erhalten.
- Optionale Abwesenheitssimulation für maximal zwei Stunden, mit tatsächlichen Waren-/Bau-/Forschungszyklen; Überfälle warten.
- Alle neuen Bedienoberflächen und Spieltexte in Deutsch, Englisch, Spanisch und Französisch. Formen und Eingaben bleiben bei laufenden UI-Aktualisierungen erhalten.
- Eigenes natives Android-Projekt ohne zusätzliches App-Framework: vollständige Offline-Assets, lokale WebView, Android-Dateidialog für Import/Export, Pause/Resume, Zurücktaste und Systemleistenabstände.

Die neue Gebäudegrafik nutzt weiterhin eigene prozedurale Formen. Das sind funktionale vorläufige Darstellungen; sie werden nicht als finale Illustrationen oder als Grafiken anderer Spiele ausgegeben.

## Nachgewiesene Prüfungen

- `npm test`: **34 Tests bestanden**. Platzierung, Kosten, Arbeit, Warenketten, Wachstum, Forschung, Kampf, Migration, beschädigte Daten, mehrere Siedlungen, Warenrouten, volle Lager, Fracht-Rückgabe, Befehle, Brücken und Abwesenheitsfortschritt.
- Der vollständige Kampagnentest verwendet ausschließlich reguläre Startvorräte, die normalen Bau-/Forschungsaktionen und echte Produktion. Ergebnis: alle elf Epochen, Raumexpedition, 107 Einwohner, 68 Gebäude und zwei Siedlungen nach rund 3.450 simulierten Sekunden. Dieser Durchlauf verwendet den friedlichen Modus; Kampflogik wird zusätzlich separat und im Bronze-Durchlauf geprüft.
- `npm run test:e2e`: **vier Browserprüfungen bestanden** auf unverändertem Code. Desktop-Aufbau, Zuweisung, Upgrade, Speichern/Reload, Forschung, Erkundung; neue Siedlungen/Routen/Truppenbefehle/Kampagnensieg; Touch-Platzierung/Pinch-Zoom; neue Menüs bei 390 Pixel Breite in allen vier Sprachen. Der abschließende Lauf ist durch `test-results/.last-run.json` mit `status: passed` und Screenshots belegt.
- Eine zusätzliche gezielte Browserprüfung des nativen Zurück-Callbacks ist bestanden: Bestätigung abbrechen, Menü schließen, vor der Rückkehr ins Hauptmenü speichern und den Launcher-Callback auslösen. Der Java-Bridge-Aufruf wird dabei simuliert; dies ersetzt keinen nativen Gerätetest.
- `npm run test:offline`: **Produktionsprüfung bestanden**. Offline-Neustart und lokales Speichern funktionieren; die QA-Schnittstelle fehlt im Produktionsbuild.
- `npm run build:android`: TypeScript-Prüfung, Produktionsbuild, Offline-Assetliste und APK-Erstellung erfolgreich. APK-Signaturen v2/v3 und ZIP-Ausrichtung geprüft. Paket `app.pocketcivilization.game`, Version 0.2.0, SDK-Ziel 35, Mindest-API 26, keine Internetberechtigung.
- Simulation mit 10.000 weiteren Zeitschritten: bis 143 Einwohner, 68 Gebäude und zwei Siedlungen; alle Ressourcen endlich und nicht negativ. Auf der gemeinsam genutzten Cloud-CPU durchschnittlich ca. 0,52 ms je Schritt, 95. Perzentil ca. 0,88 ms. Rohdaten: `docs/SIMULATION_BENCHMARK.json`. Dies sind keine Android-Frameratewerte.
- Das fertige Downloadpaket wurde separat über seinen mitgelieferten Node-Starter geöffnet: Spielstart und Kampagnenmenü funktionieren ohne Browserfehler und ohne QA-Schnittstelle. Jede enthaltene Datei ist im Paketmanifest mit Größe und SHA-256 erfasst und geprüft.
- `git diff --check`: bestanden.

Die Browserprüfungen beschleunigen Bau-/Forschungszeiten und verwenden vorbereitete Zustände, um Bedienwege gezielt zu prüfen. Der gesonderte vollständige Kampagnentest bestätigt die Erreichbarkeit ohne zusätzliche Waren. Beim Testen gefundene Eingangsverluste beim Verschieben/Fliehen wurden behoben. Alte UI-Selektoren wurden an die neue Siedlungsübersicht angepasst; der umfangreiche Test aller mobilen Sprachvarianten erhielt eine passende Zeitgrenze.

## Android-Testgrenze

Die offiziellen SDK-/Emulatorpakete wurden gegen ihre veröffentlichten Prüfsummen geprüft. Das Android-35-Testsystem läuft hier ohne `/dev/kvm`. Bei der ersten Initialisierung hat Androids eigener Watchdog den Systemserver beendet. Nach einem erneuten Start wurde das System bereit und die signierte APK wurde tatsächlich installiert.

**Der native Starttest ist nicht bestanden.** Die Activity und Android-System-WebView 124 wurden gestartet, die Anzeige blieb zunächst leer. Danach stürzte der WebView-Renderer mit `SIGTRAP` innerhalb von `libwebviewchromium.so` ab; anschließend beendete Android auch die Activity. Im Emulator wurden außerdem fehlende ES-3.1-/3.2-Unterstützung und sehr lange Frames protokolliert. Die genaue Ursache des Rendererabsturzes ist damit nicht abschließend bewiesen; aus diesem Versuch folgt keine Aussage über ein physisches Gerät.

Die Browserfassung besteht ihre getrennten Prüfungen. Die APK bleibt ausschließlich eine experimentelle Testdatei. Dateidialoge, nativer Pause/Resume-Ablauf, zuverlässiger Start und Geräteperformance sind nicht abgenommen. Die vorhandene Browserprüfung des JavaScript-Bridge-Callbacks verwendet einen simulierten nativen Gegenpart und ersetzt diese Prüfung nicht.

## Nächste Arbeit

1. Den WebView-Start auf einem hardwarebeschleunigten Emulator oder physischen Android-Gerät prüfen, die Rendererabbruch-Behandlung ergänzen und anschließend die nativen Abläufe abnehmen. Die aktuelle APK ist noch nicht freigegeben.
2. Die gewünschte feinere, farbigere und klar lesbare eigene Grafik ausarbeiten: Gebäude-Silhouetten, Materialien, Bewohner, Animationen und Effekte. Keine übernommenen Clash-of-Clans-Assets.
3. Auf physischen Mittelklassegeräten Frametimes, Speicher, Temperatur, lange Sitzungen und kleine Displays prüfen; anschließend manuelles Balancing nach Spielerfahrung.
4. Eine Store-Veröffentlichung separat vorbereiten, einschließlich eigener Release-Signierung, Entwicklerkonten und Store-Unterlagen. Es wurde nichts in einen Store eingereicht.

Eine Spielhilfe liegt unter `docs/GAME_GUIDE.md`. `docs/ANDROID_RELEASE.md` enthält Bau- und Installationsschritte sowie die Grenzen der Debug-Testfassung.
