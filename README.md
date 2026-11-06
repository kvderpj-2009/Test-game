# Pocket Civilization 0.4.1

Ein eigenständiges, lokal spielbares Aufbaustrategiespiel für den Browser. Der Schwerpunkt liegt auf Siedlungswirtschaft, freien Bauplätzen, Arbeitern, Erkundung und einfachen Echtzeitkämpfen. Anregungen von Anno und Age of Empires werden mit eigenen Namen und eigener Grafik umgesetzt.

## Starten

Voraussetzung: Node.js 22.12 oder neuer (geprüft mit Node 24.22.1).

```bash
npm ci
npm run dev
```

Vite zeigt die lokale Entwicklungsadresse im Terminal. Keine API-Schlüssel, Konten oder externen Dienste erforderlich.

```bash
npm test            # Simulation, Produktionsketten, Spielstände, kompletter Fortschritt
npm run build       # TypeScript, optimierter Build und Offline-Cache
npm run preview     # Produktionsbuild lokal starten
npm run test:e2e    # Chromium: Desktop, Touch, Speichern, Sprachen
npm run test:offline # Nach dem Build: Offline-Neustart und Spielstand
npm run format      # Einheitliche Formatierung
```

Browserprüfungen verwenden hier `/usr/bin/chromium`. Auf anderen Systemen `PLAYWRIGHT_CHROMIUM_EXECUTABLE` auf den Browser setzen oder `npx playwright install chromium` ausführen.

## Spielen

1. **Neue Siedlung** beginnen. Du startest mit drei Bewohnern, einem Dorfzentrum und Vorräten.
2. Unter **Bauen → Wohnen** eine Hütte auswählen, auf freies Gelände tippen und den Bau bestätigen. Ein Bewohner übernimmt die Baustelle. Neue Bewohner kommen bei ausreichend Wohnraum und Nahrung.
3. Ein **Holzfällerlager** und eine **Forschungshütte** bauen. Gebäude anklicken und mit **+** Arbeiter zuweisen. Freie Bewohner sammeln Nahrung, Holz und Stein und übernehmen Bauaufträge.
4. **Landwirtschaft** erforschen. Farmen liefern Getreide; Mühlen verbrauchen Getreide und erzeugen Nahrung. Werkstätten benötigen Holz und Stein für Werkzeuge. Ohne Eingangswaren läuft die Produktion nicht.
5. Auf der **Weltkarte** Regionen erkunden. Sie vergrößern das nutzbare Gebiet und erschließen Funde, einen Handelspartner und ein Räuberlager.
6. **Verteidigung** erforschen, eine Kaserne und einen Wachturm bauen. Mehrere Speerträger oder Bogenschützen rekrutieren und das erkundete Lager angreifen.
7. Für die **Bronzezeit** sind zehn Bewohner, eine erkundete Region, die erforderlichen Technologien und Ressourcen notwendig. Kupfermine und Schmelze eröffnen eine weitere Produktionskette.

Lager sind begrenzt. Ein Betrieb ohne Arbeiter liefert keine Produktionswaren. Bei Ressourcenmangel können Arbeiter anderen Betrieben zugewiesen und Hindernisse für etwas Holz oder Stein entfernt werden. Werkstätten verbrauchen Holz: Zu viel Handwerk kann die Holzversorgung ausbremsen.

## Bedienung

Bauaufträge und fertige Gebäude erzeugen keine eingeblendeten Meldungen mehr. Der Baufortschritt bleibt am Gebäude und bei Auswahl in dessen Fenster sichtbar. Das gilt auch für Ausbauten und weitere Siedlungen.

Die Menüs beginnen geschlossen. Rechts öffnen die Symbole **Bauen**, **Forschung**, **Weltkarte**, **Militär**, **Aufgaben** und **Dein Weg** jeweils ein kleines Fenster. Nochmals auf dasselbe Symbol, auf **×** oder **Esc** drücken schließt es. Die Welt neben dem Fenster bleibt bedienbar. Die schmale Kopfleiste zeigt Vorräte und Bevölkerung; die Minikarte mit Zoomknöpfen liegt unten links, auch auf dem Handy.

Im Baumenü sucht das Suchfeld über alle Gebäudearten der erreichten Epoche. **Spätere Epochen** blendet zukünftige Gebäude ein. Die Forschungshütte steht unter **Gemeinschaft**; im Forschungsfenster gibt es einen direkten Bauknopf und bei vorhandener Hütte **Im Dorf zeigen**. Anschließend Arbeiter zuweisen.

| Aktion          | Maus / Tastatur               | Touch                        |
| --------------- | ----------------------------- | ---------------------------- |
| Kamera          | Ziehen, Pfeiltasten oder WASD | Mit einem Finger ziehen      |
| Zoom            | Mausrad, + / −                | Pinch-Zoom                   |
| Gebäude wählen  | Sichtbares Gebäude anklicken  | Gebäude antippen             |
| Bauplatz        | Gelände anklicken, bestätigen | Gelände antippen, bestätigen |
| Drehen          | R oder Drehknopf              | Drehknopf                    |
| Abbrechen       | Esc                           | Abbrechen-Knopf              |
| Pause           | Leertaste oder Pausenknopf    | Pausenknopf                  |
| Baumenü         | B                             | Bauen                        |
| Dorf zentrieren | Home oder Zielkreuz           | Zielkreuz an der Minikarte   |

Gebäude lassen sich optisch spiegeln; ihre quadratischen Grundflächen bleiben gleich. Wege und Palisaden können wiederholt gesetzt werden. Palisaden verbinden sich automatisch mit Nachbarn. Tore und Straßen sind begehbar. Das Dorfzentrum kann nicht abgerissen werden.

## Speichern und Offline-Betrieb

- Automatischer lokaler Spielstand alle 30 Sekunden sowie beim Verlassen des Spiels.
- Separater manueller Speicherplatz, JSON-Export und -Import in **Einstellungen → Spielstände**.
- Prüfsumme und Validierung vor dem Laden, Sicherung des letzten gültigen Spielstands, Migration von Format 1/2 nach 3 mit dauerhafter Sicherung des ursprünglichen Version-0.1-Stands.
- Beschädigte Daten werden nicht gelöscht. Eine gültige Sicherung kann wiederhergestellt werden.
- Das Repository enthielt keine früheren Spielstände oder ältere Spielimplementation. Unbekannte Fremdformate werden nicht als migrierbar ausgegeben.
- Der Produktionsbuild speichert seine Dateien nach dem ersten Online-Aufruf für Offline-Nutzung. Service Worker benötigen HTTPS oder eine lokale Entwicklungsadresse. Bei verweigertem Browserspeicher kann der Spielstand exportiert werden.
- Optionaler Abwesenheitsfortschritt simuliert bis zu zwei Stunden Produktion, Bau und Forschung; Überfälle warten. Standardmäßig ausgeschaltet.

## Architektur

`src/game` enthält die von DOM und Rendering getrennte Simulation: Gebäude-/Forschungsdaten, deterministisches Gelände, Wegfindung, Bevölkerung, Waren, Kampf und Spielstände. `src/render` zeichnet eigene Canvas-Texturen und stellt sie mit PixiJS dar; Kamera, Touch und Tiefensortierung liegen dort. `src/ui` enthält Oberfläche, SVG-Symbole und Übersetzungen für Deutsch, Englisch, Spanisch und Französisch.

Die Spielgrafik entsteht aus eigenen prozeduralen Illustrationen: farbige Gebäude mit Materialdetails, unterschiedliche Produktionsanlagen, schattierte Bäume und animierte Bewohner und Truppen. Es sind keine Assets der Inspirationsspiele enthalten. Texturen und Figurenanimationen werden wiederverwendet; Gelände ist gecacht und in kleine Texturseiten aufgeteilt. Die Simulation läuft mit zehn Schritten pro Spielsekunde. Die sparsame Grafikoption begrenzt die Bildrate auf 30. [Grafik und Kompatibilitätsmodus](docs/GRAPHICS.md) beschreibt die Umsetzung und ihre Prüfungen.

## Kampagne und Android

Die Version enthält 65 Gebäudetypen, 23 Ressourcen, 16 Forschungen, 13 Truppentypen, 22 Aufgaben und Meilensteine sowie zwölf Regionen. Alle elf Epochen sind spielbar. Bis zu vier unabhängige Siedlungen produzieren parallel und tauschen tatsächliche Waren über bis zu zwölf Routen aus. Die Raumexpedition schließt die Kampagne ab; danach bleibt das Reich spielbar.

Eine ausführliche [Spielhilfe](docs/GAME_GUIDE.md) erklärt die späteren Warenketten, Voraussetzungen, Versorgung, Formationen und Warenrouten. Die Android-Testfassung verpackt den vollständigen Browserbuild lokal und benötigt keine Internetberechtigung. Export/Import verwendet den Android-Dateidialog. Bauanleitung und Testgrenzen: [Android](docs/ANDROID_RELEASE.md).

```bash
npm run build:android # Android SDK 35 + Build Tools 35.0.0 + JDK 21 erforderlich
```

## Stand und nächste Arbeit

Die Spielsysteme sind bis zum Kampagnensieg implementiert und automatisiert geprüft, einschließlich eines Durchlaufs mit regulären Startvorräten. Version 0.4.0 ergänzt eine kompakte Oberfläche und eigene Steinzeitgebäude aus Holz, Lehm, Fellen und Stroh. Bestehende Spielstände erhalten die zur Epoche passende Darstellung automatisch. WebGL und der neue Canvas-Kompatibilitätsmodus sind im Browser geprüft. Es gibt keinen verpflichtenden Mehrspielerbetrieb und keine laufenden Dienste.

Die APK ist eine signierte, experimentelle Debug-Testversion. Im Cloud-Emulator stürzt bereits eine unabhängige HTML-Testseite in der System-WebView ab. Die App enthält jetzt eine Wiederherstellungsansicht und einen Canvas-Startpfad; eine native Gerätefreigabe liegt noch nicht vor. Eine Store-Fassung, Release-Schlüssel, Store-Einreichungen und Leistungsnachweise auf physischen Android-Geräten sind noch nicht vorhanden. Automatische Simulation und Emulation ersetzen keinen mehrstündigen manuellen Balancetest. Genaue Prüfergebnisse: [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md).

## Downloadpaket selbst erstellen

Nach erfolgreichem `npm run build:android` erzeugt `python3 scripts/package-release.py` unter `exports/` ein ZIP mit fertigem Spiel, lokalem Starter, Debug-APK, Spielhilfe, versioniertem Quellcode und den Lizenztexten der installierten Laufzeitbibliotheken. Neue Quelldateien vorher zu Git hinzufügen. Ein vorhandenes Ausgabeverzeichnis wird nicht überschrieben. `--out /anderer/ordner` wählt ein anderes Ziel; `--example /pfad/spielstand.json` fügt einen optionalen Beispielstand hinzu. Das Skript prüft die ZIP-Datei und alle enthaltenen Dateiprüfsummen.
