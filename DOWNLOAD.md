# Pocket Civilization 0.3.0

[Spielpaket herunterladen](Pocket-Civilization.zip?raw=true) · [Experimentelle Android-APK](Pocket-Civilization-0.3.0-debug.apk?raw=true)

Die neue Version enthält farbigere eigene Gebäude und Landschaft, animierte Bewohner und alle 13 Truppentypen, wiederverwendete Grafikflächen sowie einen Canvas-Kompatibilitätsmodus. Alle elf Epochen und die vollständige Kampagne sind enthalten. Bestehende Spielstände werden übernommen.

## Starten

ZIP vollständig entpacken. Node.js 22.12 oder neuer verwenden. Unter Windows `Start-Spiel.bat` öffnen, unter macOS/Linux im entpackten Ordner `node start.mjs` ausführen. Danach die angezeigte lokale Adresse im Browser öffnen. Der fertige Build liegt bei; `npm install` ist zum Spielen nicht nötig.

## Geprüft und noch offen

34 Simulationstests, acht Browserprüfungen und die zusätzliche Produktions-/Offlineprüfung sind bestanden. Auch der Paketstarter wurde separat geprüft. Das ZIP enthält Spielhilfe, Quellcode, Bibliothekslizenzen und ein Manifest mit Prüfsummen für alle Dateien.

Die Android-Datei bleibt eine Testfassung. In den Cloud-Emulatoren stürzt bereits eine unabhängige HTML-Seite in der System-WebView ab. Die neue native Wiederherstellungsansicht wurde angezeigt und ihr Kompatibilitätsknopf speichert die Auswahl korrekt. Ein erfolgreicher nativer Spielbetrieb und die Leistungsfreigabe auf echten Geräten stehen aus. Details: [Android-Prüfbericht](docs/ANDROID_RELEASE.md) und [Entwicklungsstand](DEVELOPMENT_PROGRESS.md). Keine Store-Veröffentlichung.

Quellstand: `27c9f9e6a7d5a91533d448a836cca312925e8515`.

SHA-256 ZIP: `5632fd8a2a12ca3a1b6265b38afab95cb7273e47615a22f7589d306ee5fa698f`

SHA-256 APK: `909280669b21e200560ac575a9da0ebe2c88438779ae065209f3fc1a32366798`

Die vorherigen Versionen bleiben in ihren Downloadzweigen erhalten.
