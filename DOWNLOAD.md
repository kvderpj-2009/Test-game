# Pocket Civilization 0.4.0

[Spielpaket herunterladen](Pocket-Civilization.zip?raw=true) · [Experimentelle Android-APK](Pocket-Civilization-0.4.0-debug.apk?raw=true)

Schmale Kopfleiste, Minikarte unten links und sechs Symbole rechts: Bauen, Forschung, Weltkarte, Militär, Aufgaben und Dein Weg. Alle Fenster beginnen geschlossen und lassen sich einzeln öffnen, schließen und wechseln. Die Karte bleibt neben geöffneten Fenstern bedienbar. Die Forschungshütte kann direkt aus dem Forschungsfenster gebaut oder im Dorf gefunden werden. Der Baukatalog enthält eine Suche, senkrechtes Scrollen und optional zukünftige Gebäude.

Die Steinzeit hat eigene Hütten aus Holz, Lehm, Stroh und Fellen, offene Werkplätze, Mahlsteine, Erdwege und passende Bewohner. Bestehende Spielstände erhalten automatisch die Darstellung ihrer Epoche. Alle elf Epochen und die Kampagne bleiben enthalten.

## Starten

ZIP vollständig entpacken. Node.js 22.12 oder neuer verwenden. Unter Windows `Start-Spiel.bat` öffnen, unter macOS/Linux im entpackten Ordner `node start.mjs` ausführen. Danach die angezeigte lokale Adresse im Browser öffnen. Der fertige Build liegt bei; `npm install` ist zum Spielen nicht nötig.

## Geprüft

34 Simulationstests, zwölf Browserprüfungen und eine Produktions-/Offlineprüfung bestanden. Die korrigierten Baukarten und Touch-Scrollen wurden gezielt erneut geprüft. Der tatsächliche Paketstarter wurde mit Spielstart, Speichern und Offline-Canvas geprüft. Alle Dateien besitzen im Paketmanifest geprüfte Größen und SHA-256-Prüfsummen. Der Quellcode, die Spielhilfe und die Bibliothekslizenzen liegen bei.

Ansichten: [Desktop](docs/compact-ui-desktop-0.4.0.png), [Handy](docs/compact-ui-mobile-0.4.0.png), [Bauen](docs/compact-ui-build-0.4.0.png), [Forschung](docs/compact-ui-research-0.4.0.png).

Die Android-Datei bleibt eine experimentelle Debug-Testfassung. Signierung, Upgrade-Zertifikat und eingebettete Browserdateien sind geprüft; eine Gerätefreigabe liegt nicht vor. Der native Emulatorbefund stammt aus 0.3.0 und ist in [Android-Prüfbericht](docs/ANDROID_RELEASE.md) dokumentiert. Keine Store-Veröffentlichung.

Vor einem Wechsel empfiehlt sich ein Export unter Einstellungen → Spielstände. Browser und APK verwenden getrennte Speicher.

Quellstand: `1b174500b54cf4b827b5356039d5d11dbd8db8fc`.

SHA-256 ZIP: `c73083b74cfaec717f1a82515fd4f87738f985cac1004ae0f7f34622c3e04fc7`

SHA-256 APK: `4259ae775db8f0c464b801d32afd7bd3ed847bd4d8c298398b319efe77b4d2b4`

`main` und frühere Downloadzweige bleiben erhalten.
