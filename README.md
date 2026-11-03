# Pocket Civilization

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

| Aktion          | Maus / Tastatur               | Touch                         |
| --------------- | ----------------------------- | ----------------------------- |
| Kamera          | Ziehen, Pfeiltasten oder WASD | Mit einem Finger ziehen       |
| Zoom            | Mausrad, + / −                | Pinch-Zoom                    |
| Gebäude wählen  | Sichtbares Gebäude anklicken  | Gebäude antippen              |
| Bauplatz        | Gelände anklicken, bestätigen | Gelände antippen, bestätigen  |
| Drehen          | R oder Drehknopf              | Drehknopf                     |
| Abbrechen       | Esc                           | Abbrechen-Knopf               |
| Pause           | Leertaste oder Pausenknopf    | Pausenknopf                   |
| Baumenü         | B                             | Bauen                         |
| Dorf zentrieren | Home oder Zielkreuz           | Zielkreuz (größere Ansichten) |

Gebäude lassen sich optisch spiegeln; ihre quadratischen Grundflächen bleiben gleich. Wege und Palisaden können wiederholt gesetzt werden. Palisaden verbinden sich automatisch mit Nachbarn. Tore und Straßen sind begehbar. Das Dorfzentrum kann nicht abgerissen werden.

## Speichern und Offline-Betrieb

- Automatischer lokaler Spielstand alle 30 Sekunden sowie beim Verlassen des Spiels.
- Separater manueller Speicherplatz, JSON-Export und -Import in **Einstellungen → Spielstände**.
- Prüfsumme und Validierung vor dem Laden, Sicherung des letzten gültigen Spielstands, Migration von Format 1 nach 2.
- Beschädigte Daten werden nicht gelöscht. Eine gültige Sicherung kann wiederhergestellt werden.
- Das Repository enthielt keine früheren Spielstände oder ältere Spielimplementation. Unbekannte Fremdformate werden nicht als migrierbar ausgegeben.
- Der Produktionsbuild speichert seine Dateien nach dem ersten Online-Aufruf für Offline-Nutzung. Service Worker benötigen HTTPS oder eine lokale Entwicklungsadresse. Bei verweigertem Browserspeicher kann der Spielstand exportiert werden.
- Keine Offline-Zeitbeschleunigung: Die Simulation pausiert bei ausgeblendeter Seite und im Hauptmenü.

## Architektur

`src/game` enthält die von DOM und Rendering getrennte Simulation: Gebäude-/Forschungsdaten, deterministisches Gelände, Wegfindung, Bevölkerung, Waren, Kampf und Spielstände. `src/render` zeichnet eigene Canvas-Texturen und stellt sie mit PixiJS dar; Kamera, Touch und Tiefensortierung liegen dort. `src/ui` enthält Oberfläche, SVG-Symbole und Übersetzungen für Deutsch, Englisch, Spanisch und Französisch.

Die Spielgrafik ist eigene prozedurale Grafik, keine gekauften Assets oder finalen handgemalten Illustrationen. Es sind keine Assets der Inspirationsspiele enthalten. Texturen werden wiederverwendet, statisches Gelände wird gecacht, die Simulation läuft mit zehn Schritten pro Spielsekunde. Die sparsame Grafikoption begrenzt die Bildrate auf 30.

## Stand und Grenzen

Die Browserfassung enthält 29 Gebäudedefinitionen einschließlich des Dorfzentrums, eine 48 × 48 große Karte, sieben Forschungen, zehn Aufgaben und vier erkundbare Regionen. Steinzeit und Übergang zur Bronzezeit sind spielbar. Spätere Zeitalter sind als Daten vorbereitet, besitzen aber noch keine vollständigen Inhalte.

Mehrstündige Balancierung, handgezeichnete Animationen und echte Android-Gerätetests stehen noch aus. Es gibt noch keinen signierten Android-Build und keine Store-Veröffentlichung. Details: [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md), [Android-Vorbereitung](docs/ANDROID_RELEASE.md).
