# Pocket Civilization 0.4.1

[Spielpaket herunterladen](Pocket-Civilization.zip?raw=true) · [Experimentelle Android-APK](Pocket-Civilization-0.4.1-debug.apk?raw=true)

Bauaufträge und fertige Gebäude erzeugen keine eingeblendeten Meldungen mehr. Das gilt auch für Ausbauten und andere Siedlungen. Der Baufortschritt ist am Gebäude sichtbar; sein Balken berücksichtigt nun die tatsächliche Bau- beziehungsweise Ausbauzeit. Bestehende Spielstände werden übernommen.

Die kompakte Oberfläche aus 0.4.0 bleibt enthalten: dünne Kopfleiste, Minikarte unten links, Symbole rechts und kleine, schließbare Fenster. Forschungshütte direkt im Forschungsfenster bauen oder finden; passende Steinzeitgebäude und Bewohner.

## Starten

ZIP vollständig entpacken. Node.js 22.12 oder neuer verwenden. Unter Windows `Start-Spiel.bat` öffnen, unter macOS/Linux im entpackten Ordner `node start.mjs` ausführen. Die angezeigte lokale Adresse im Browser öffnen. Der fertige Build liegt bei; `npm install` ist zum Spielen nicht nötig.

## Geprüft

34 Simulationstests, vier gezielte Browserprüfungen und die Produktions-/Offlineprüfung bestanden. Zusätzliche Baukontrolle: Neubau, Ausbau und Hintergrundsiedlung abgeschlossen, fünf Bauereignisse und kein Bau-Popup. Der Paketstarter wurde mit Spielstart, Speichern und Offline-Canvas geprüft. Das ZIP enthält Spielhilfe, Quellcode, Lizenzen und ein geprüftes Manifest mit Dateigrößen und SHA-256-Prüfsummen.

Die Android-APK bleibt eine experimentelle Testfassung. Das Update-Zertifikat und die eingebetteten Browserdateien sind abgeglichen. Reale Geräteprüfungen stehen aus; der native Emulatorbefund stammt aus 0.3.0. Details: [Android-Prüfbericht](docs/ANDROID_RELEASE.md).

Für einen Wechsel zwischen Browser und APK den Stand unter Einstellungen → Spielstände exportieren und importieren.

Quellstand: `78e86dcc976e43550c4e4ad8d8302c71e3808fde`.

SHA-256 ZIP: `4c92b2314fdec9bd8a59bda8b134574204306a7d835c711b43c7f0e7c2d62d3b`

SHA-256 APK: `658b16c082ae1189d403b376c7ecab3f63c65fcaf73e01e24fdea1848613231f`

`main` und frühere Downloads bleiben erhalten.
