# Entwicklungsstand — Pocket Civilization 0.1

## Ausgangslage und Sicherung

Das Repository `kvderpj-2009/Test-game` enthielt nur eine README, keine Anwendung, Assets, Tests oder Spielstände. Ausgangscommit: `36031de06162a5a0169d3b92db83e4ed467d51c9`. Ein vollständiges Archiv einschließlich Git-Metadaten liegt unter `/workspace/backups/Test-game-before-rebuild.tar.gz`; ein Baseline-Commit wurde vor dem Neuaufbau angelegt. Es wurden keine alten Spielstände gelöscht.

## Implementiert

- TypeScript, Vite, PixiJS 8; getrennte Simulation, Daten, Welt, Rendering, UI und Speicherlogik.
- Hauptmenü mit Neustart, Fortsetzen, Spielständen, Einstellungen, vier Sprachen und Credits.
- 48 × 48 isometrische Welt mit Wäldern, Felsen, Fluss, Küsten und Erkundungsnebel.
- Kamera mit Maus, Touch und Tastatur; Scroll-/Pinch-Zoom; Auswahl über sichtbare Gebäudegrafik; Tiefensortierung der Bewohner.
- 29 Gebäudedefinitionen einschließlich Zentrum: Platzierungsprüfung, Bauvorschau, Kosten, echte Bauarbeit, Verschieben, optische Drehung, Upgrades, Abriss mit Teilrückerstattung.
- Wiederholte Wege/Palisaden, automatische Palisadenverbindungen, begehbare Tore, Hindernisse entfernen.
- Zehn Ressourcen und echte Arbeits-/Transportzyklen. Ketten: Getreide → Nahrung; Holz + Stein → Werkzeuge; Kupfer + Holz → Bronze. Eingänge werden verbraucht, Ausgänge erst bei Lieferung eingebucht.
- Arbeiterzuweisung, automatische Grundversorgung freier Bewohner, Baustellenpriorität, BFS zu erreichbaren Ressourcen und Zugängen; Neuplanung blockierter Routen.
- Wohnraum, Nahrung, Zufriedenheit, Produktivitätsverlust bei schlechter Versorgung, Wachstum und Lagergrenzen.
- Sieben Forschungen mit Kosten und Voraussetzungen. Bronzezeit verlangt zehn Einwohner und eine erkundete Region.
- Vier Regionen mit Expansion, Funden, Handel und gegnerischem Lager.
- Speerträger, Bogenschützen, Kaserne, Türme, Palisaden, Tore und Bodenverteidigung. Einheiten bewegen sich zum Gegner; Reichweite, HP, Schaden, Beute und Rückkehr werden simuliert. Periodische Dorfangriffe nach Freischaltung der Verteidigung.
- Zehn einmalig belohnte Aufgaben und situationsabhängige Einstiegshinweise.
- DE/EN/ES/FR über zentrale Übersetzungstabelle.
- Auto-/manueller Speicherplatz, Export/Import, Prüfsummen, Validierung, Backup, Formatmigration 1 → 2 und sichtbare Speicherfehler.
- Eigene prozedurale Grafiken, SVG-Icons, Laufanimationen, Tragewaren, Rauch, Vögel, Baufortschritt, Kampfeffekte und optionale synthetisierte Klänge.
- Produktionsbuild mit generiertem Offline-Service-Worker, Manifest und SVG-Icon.

## Verifikation

- TypeScript-Prüfung und Vite-Produktionsbuild.
- Simulationstests für Platzierung, Ressourcenmangel, Wasser, Erkundung, Hindernisse, Wegfindung, Arbeit, Wachstum, Warenketten, Upgrades, Verschieben, Abriss, Forschung und Kampf.
- Durchgehender Fortschritt ausschließlich mit regulären Startressourcen: Hütte → Holzfäller → Forschung → Wachstum → Farm/Mühle → Werkzeuge → Jagd/Handel → Kaserne/Turm → PvE-Sieg → Bronzezeit → Speichern/Laden.
- Speicherstandtests: Manipulation, beschädigte Daten, Backup, Migration, verweigerte Schreibvorgänge.
- Chromium-Browsertests: reale UI-Platzierung, Arbeiter, Upgrades, Reload mit Fortschritt, Forschungs-/Weltkartenmenüs und alle vier Sprachen.
- Mobile Emulation 390 × 844: Touch-Platzierung, Pinch-Zoom, Navigation, Sprachen und Überlaufprüfung.
- Visuell geprüfte Screenshots. Emulation ersetzt keine Messung auf physischer Android-Hardware.

Browserprüfungen beschleunigen Wartezeiten durch direkte Simulationsschritte. Ein separater Test spielt den Fortschritt mit regulärem Ressourcenbudget durch. Testinstrumentierung gibt es nur im Entwicklungsbuild mit `?qa`.

## Grenzen und offene Arbeit

- Zeitalter ab Eisenzeit: Bezeichnungen und erweiterbare Struktur, noch keine vollständigen Inhalte.
- Vier feste Regionen, keine große Kampagne oder mehrere unabhängige Städte.
- Einfache PvE-KI und gemeinsamer Angriffsbefehl; keine komplexen Formationen, Belagerungen oder Mehrspielerpartien.
- Eigene prozedurale Grafik statt finaler Illustrationen und professioneller Sprite-Atlanten.
- Android-SDK, physische Gerätetests, native Verpackung, Signierung und Veröffentlichung fehlen. Kein APK/AAB erzeugt.
- Keine unbeobachtete Offline-Simulation; keine behauptete Migration fremder Speicherformate.
- Fortschritt bis Bronzezeit getestet; mehrstündiges manuelles Balancing steht aus.

## Nächster konkreter Schritt

Längerer manueller Test auf einem Android-Mittelklassegerät; Frametimes und Speicher bei 50–100 Bewohnern messen. Daraus Animationen und UI-Abstände verbessern. Anschließend native Verpackung gemäß `docs/ANDROID_RELEASE.md` und einen Debug-Build auf dem Gerät prüfen. Neue Zeitalter in `src/game/data.ts` ergänzen und den Fortschrittstest erweitern.

## Abschlussprüfung am 4. November 2026

- Installation aus dem Lockfile (`npm ci`): erfolgreich.
- TypeScript und Produktionsbuild einschließlich Offline-Assets: erfolgreich.
- `npm test`: 21 Tests bestanden, darunter vollständiger Fortschritt mit regulären Startressourcen bis zur tatsächlichen Bronzeproduktion.
- `npm run test:e2e`: zwei Chromium-Tests bestanden (Desktop und Touch). Dachauswahl, Pinch-Zoom, vier Sprachen und Laden nach Reload geprüft.
- `npm run test:offline`: ein Produktionsbrowser-Test bestanden; Offline-Neustart und lokaler Spielstand funktionieren, QA-Zugriff ist im Produktionsbuild nicht vorhanden.
- Entwicklungsserver nach erneuter Installation durch Abruf von HTML und Spielmodul geprüft.
- `install_script` und `start_skill` für die Cloud-Umgebung als Entwurf gespeichert; eine Veröffentlichung der Umgebung wurde nicht ausgeführt.

Im Fortschrittstest gefundene Lieferweg-Blockaden nach Neubauten wurden durch erreichbare Ressourcen-/Zugangssuche und Neuplanung behoben. Beim Offline-Test wurde die Cache-Auswahl für statische Dateien mit `Vary`-Antwortheadern korrigiert. Native Android-Tests sind weiterhin offen.
