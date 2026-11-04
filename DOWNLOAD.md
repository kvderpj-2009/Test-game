# Pocket Civilization 0.2.0 herunterladen

- [Komplettes Spielpaket als ZIP](Pocket-Civilization.zip?raw=true)
- [Android-Testfassung als APK](Pocket-Civilization-0.2.0-debug.apk?raw=true)
- [SHA-256-Prüfsummen](SHA256SUMS.txt)

Das ZIP enthält den fertigen Browserbuild, einen lokalen Starter, Quellcode, Spielhilfe, Lizenzhinweise und die APK. Windows: entpacken und `Start-Spiel.bat` öffnen. macOS/Linux: `node start.mjs`. Node.js 22.12 oder neuer wird für den lokalen Browserstarter benötigt.

Alle elf Epochen sind spielbar. Neu sind zusätzliche Siedlungen mit Warenrouten, Versorgungsbedürfnisse, weitere Truppen mit Befehlen und der Kampagnenabschluss durch eine Raumexpedition. Die feinere Grafik folgt als eigener Schritt.

Die APK ist ausdrücklich eine signierte Debug-Testfassung, keine Store-Version. Sie benötigt eine aktuelle Android-System-WebView. Einzelheiten zu erfolgten Prüfungen und noch offenen Gerätetests stehen im [Entwicklungsbericht](DEVELOPMENT_PROGRESS.md) und in der [Android-Anleitung](docs/ANDROID_RELEASE.md).

Alte Browser-Spielstände vor einem Geräte-/Adresswechsel über Einstellungen → Spielstände exportieren und anschließend importieren. Die neue Version übernimmt das alte Spielformat. Vorhandene Downloadfassungen und der Hauptzweig bleiben erhalten.
