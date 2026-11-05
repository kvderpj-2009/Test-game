# Entwicklungsstand — Pocket Civilization 0.4.0

Stand: 5. November 2026. Die Spielsysteme sind bis zum Kampagnensieg umgesetzt; die anschließende Grafikverfeinerung ist enthalten. Die Browserfassung ist automatisiert geprüft. Android bleibt eine experimentelle Debug-Testfassung, ohne Geräte- oder Store-Freigabe.

## Sicherungen

Vor dem grafischen Ausbau wurde `/workspace/backups/Pocket-Civilization-before-polish.bundle` erstellt und geprüft. Frühere Sicherungen und die Downloadzweige für 0.1.0 und 0.2.0 bleiben erhalten. Die Quellarbeit erfolgt auf `work`; die Downloadbereitstellung überschreibt `main` nicht.

## Spielumfang

Alle elf Epochen von der Steinzeit bis zur Raumfahrt sind spielbar: 65 Gebäudetypen, 23 Ressourcen, 16 Forschungen, 13 Truppentypen, 22 Aufgaben und zwölf Regionen. Produktion benötigt tatsächlich Arbeiter und Eingangswaren. Bis zu vier Siedlungen besitzen getrennte Lager, Bevölkerung und Armeen; bis zu zwölf Warenrouten transportieren echte Fracht. Gesundheit, Bildung, Kultur, Reparaturen, Erkundung, Überfälle, drei Schwierigkeitsgrade, Formationen und Abwesenheitsfortschritt sind implementiert. Die Raumexpedition beendet die Kampagne; Weiterspielen ist möglich.

Format 3 übernimmt bestehende Spielstände; der ursprüngliche Version-0.1-Stand bleibt bei der Migration zusätzlich gesichert. Automatisches und manuelles Speichern sowie JSON-Export/-Import sind vorhanden. Oberfläche und Spieltexte gibt es in Deutsch, Englisch, Spanisch und Französisch. [Spielhilfe](docs/GAME_GUIDE.md).

## Neu in 0.4.0

- Schmale Kopfleiste; Minikarte mit Zoom und Zentrieren unten links auf Desktop und Handy.
- Sechs Symbole rechts öffnen Bauen, Forschung, Weltkarte, Militär, Aufgaben und Dein Weg. Alle Fenster beginnen geschlossen und lassen sich per Symbol, × oder Esc schließen. Kein abdeckender Hintergrund; die Karte bleibt neben offenen Fenstern bedienbar.
- Kleiner Baukatalog mit Suche über Gebäudearten, Kategorienauswahl und optionalen späteren Epochen. Forschungshütte direkt aus dem Forschungsfenster bauen oder auf der Karte finden und Arbeiter zuweisen.
- Eigene Steinzeitgebäude mit Holz, Lehm, Stroh und Fellen; einfache Werkplätze, Mahlsteine, Erdwege und Bewohnerkleidung. Vorschau, Welt und Gebäudeauswahl verwenden dieselbe zur Epoche passende Darstellung, auch bei älteren Spielständen.
- Android-Zurück schließt auch Baumenü, Dein Weg und Gebäudeauswahl. Versionsanzeige stammt aus der Paketversion.
- Sicherung vor diesem Umbau: `/workspace/backups/Pocket-Civilization-before-compact-ui.bundle`, geprüft. Frühere Downloadzweige einschließlich 0.3.0 bleiben bestehen.

## Frühere Grafiküberarbeitung in 0.3.0

- Eigene farbigere Gebäudeillustrationen mit Materialdetails, Fenstern, Gütern und unterschiedlichen Produktionsanlagen: Silos, Säulenbauten, Fernrohr, Bohrturm, Fabriken, moderne Wohnhäuser, Reaktoren und Raketenrampe.
- Schattierte Baumkronen und Felsen, hellere Wiesen, türkisfarbenes Wasser und Uferlinien. Keine übernommenen Bilder anderer Spiele und keine gekauften Grafiken.
- Animierte Bewohner mit Werkzeugen und Transportkisten; passende Darstellungen für alle 13 Truppentypen einschließlich Pferd, Katapult, Kanone und Drohne.
- Wiederverwendete Animationsbilder und Gebäudesprites. Geländetexturen werden bei Kartenänderungen erneuert und bleiben bei gewöhnlichen Gebäudeänderungen erhalten. Seiten von höchstens 1024 × 1024 Pixeln und Ausblenden außerhalb der Kamera begrenzen die Renderarbeit.
- Canvas als Alternative zu WebGL, auch offline. Direkt wählbar mit `?renderer=canvas`.
- Native Android-Wiederherstellung nach Rendererabbruch oder ausbleibender Startbestätigung nach 45 Sekunden. Der Kompatibilitätsknopf merkt sich Canvas für folgende Starts. Alte WebView-Rückmeldungen dürfen einen neuen Start nicht ersetzen. Bestehende lokale Spielstände werden nicht gelöscht.
- Reproduzierbares Downloadpaket mit Starter, APK, Quellcode, Spielhilfe, Bibliothekslizenzen und geprüften SHA-256-Dateiprüfsummen: `scripts/package-release.py`.

## Nachgewiesene Prüfungen

- **34 Simulationstests bestanden.** Platzierung, Kosten, Produktion, Bevölkerungswachstum, Forschung, Kampf, Migration, beschädigte Daten, Siedlungen, Routen, volle Lager, Frachtrückgabe, Befehle, Brücken und Abwesenheitsfortschritt.
- Der vollständige Kampagnentest verwendet reguläre Startvorräte, normale Bau-/Forschungsaktionen und echte Produktion: alle elf Epochen, Raumexpedition, 107 Einwohner, 68 Gebäude und zwei Siedlungen nach etwa 3.450 simulierten Sekunden. Friedlicher Modus; Kampflogik wird zusätzlich separat und im Bronze-Durchlauf geprüft.
- **Zwölf Browserprüfungen bestanden:** Desktop-Aufbau und Dachauswahl, Arbeiterzuweisung, Upgrade, Speichern/Reload, Forschung und Erkundung; Siedlungen, Routen, Gruppenbefehle und Sieg; Touch-Platzierung, senkrechtes Scrollen im Baumenü und Pinch-Zoom; mobile Menüs in allen vier Sprachen; native JavaScript-Rückmeldungen; beide Grafikmodi sowie Wiederverwendung und Kamera-Ausblendung.
- Alle 65 Gebäude in drei Stufen und drei Epochen, sieben Baumvarianten und sämtliche Figurenbilder auf leere oder abgeschnittene Inhalte geprüft.
- **Produktions-/Offlineprüfung bestanden:** Neustart ohne Netz, erhaltene Spielstände, keine QA-Schnittstelle, auch das separate Canvas-Rendererpaket offline verfügbar. Der aktualisierte Bridge-Test schließt auch Baumenü, Dein Weg und Gebäudeauswahl vor dem Hauptmenü. Die Bridge verwendet dabei einen simulierten nativen Gegenpart.
- Der erspielte Raumfahrtstand wurde mit 108 Bewohnern und 68 Gebäuden in beiden Grafikmodi dargestellt, ohne JavaScriptfehler. Die Softwaregrafik der Cloud lieferte dabei niedrige Bildraten. Messwerte und Grenzen: [Grafikbericht](docs/GRAPHICS.md), `docs/RENDER_BENCHMARK.json`. Es gibt keinen daraus abgeleiteten 30-FPS-Nachweis auf Android.
- TypeScript, Produktionsbuild und Offline-Assetliste erstellt. Debug-APK gebaut; Signaturen v2/v3 und ZIP-Ausrichtung geprüft. Das Signaturzertifikat und der native Java-Code stimmen mit 0.3.0 überein; die eingebetteten Spiel-Assets stimmen bytegenau mit dem geprüften Browserbuild überein. Paket `app.pocketcivilization.game`, Version 0.4.0, Ziel-API 35, Mindest-API 26, keine Internetberechtigung.
- Das erzeugte Downloadpaket wurde mit dem mitgelieferten Node-Starter geöffnet: Spielstart, Speichern, Offline-Neustart mit Canvas, fehlende QA-Schnittstelle und Begrenzung des Servers auf die Spieldateien sind geprüft. Alle Dateigrößen und Prüfsummen im Paketmanifest werden gegen den tatsächlichen ZIP-Inhalt geprüft.
- Die Bibliothekslizenzen liegen im ZIP und in der APK. Der vom npm-Paket ausgelassene MIT-Text für `@pixi/colord@2.9.6` wurde mit der offiziellen Quelle abgeglichen und mit Versionsbindung und Prüfsumme im Repository hinterlegt.
- `git diff --check` bestanden. Der Abhängigkeitsbaum ist konsistent; die Laufzeitbibliotheken wurden für die Grafiküberarbeitung nicht aktualisiert.

Die Browserprüfungen verwenden teilweise beschleunigte Zeiten und vorbereitete Zustände, um die Bedienwege gezielt zu testen. Der gesonderte Kampagnentest belegt die Erreichbarkeit ohne zusätzliche Waren. Die ältere Simulationsmessung mit bis zu 143 Einwohnern liegt weiterhin unter `docs/SIMULATION_BENCHMARK.json`; sie ist keine Bildratenmessung.

Die kompakte Oberfläche und der aktualisierte Rückweg sind zusätzlich mit drei Ansichtsgrößen geprüft: 1440 × 900, 390 × 844 und 844 × 390. Geschlossene Startfenster lassen in diesen Ansichten mindestens 80 % der Fläche für die Welt frei. Die Handy-Kopfleiste wird auf überlappende Elemente geprüft. Der native Android-Befund unten stammt aus Version 0.3.0; für 0.4.0 werden Browserprüfungen und APK-Bau ausgeführt, keine neue Gerätefreigabe.

## Android-Befund

Die offiziellen Systemabbilder und SDK-Pakete wurden gegen die veröffentlichten Prüfsummen geprüft. In dieser Cloud fehlt `/dev/kvm`; Android wird vollständig auf der CPU emuliert.

Unter Android 35 / WebView 124 stürzte die bisherige Spielansicht mit `SIGTRAP` ab. Ein erneuter Systemstart zeigte zusätzlich ANRs und Neustarts des Android-Systemservers. Zur Eingrenzung wurde ein unabhängiges Android-34-Abbild mit WebView 113.0.5672.136 und deaktivierter Vulkan-Emulation gestartet.

Dort wurde eine separate, minimale native Test-App installiert. Sie lud ausschließlich eine einfache lokale HTML-Seite, ohne Spielskript, Pixi oder WebGL. Auch ihr WebView-Renderer brach mit Fehlercode 5 ab; die Test-App meldete `Renderer gone, crashed=true`. Der Fehler tritt damit auch unabhängig vom Spiel auf. Die genaue Ursache innerhalb der emulierten WebView ist nicht abschließend bestimmt.

Die damalige 0.3.0-APK wurde anschließend auf Android 34 installiert. Ihre native Wiederherstellungsansicht erschien beim fehlgeschlagenen Start, der Spielprozess blieb aktiv. Nach Schließen eines System-UI-ANR-Dialogs wurde der Kompatibilitätsknopf erfolgreich betätigt und `canvasRenderer=true` in den App-Einstellungen nachgewiesen. Die Aufnahme und die abgegrenzten Ergebnisse liegen unter `docs/android-recovery-0.3.0.png` und `docs/ANDROID_VERIFICATION.json`. Der abschließende Build ergänzt Lizenztexte; seine Spiel-Assets und `classes.dex` wurden bytegenau mit dem installierten Testbuild verglichen.

Die neue Spiel-App enthält deshalb eine native Wiederherstellungsansicht und einen Canvas-Startpfad. Der Canvas-Modus kann fehlende WebGL-Unterstützung überbrücken; einen unabhängig davon abstürzenden System-WebView-Prozess kann er nicht reparieren. Ein erfolgreicher nativer Spielstart und die vollständigen nativen Import-/Export- und Pause-/Resume-Abläufe sind noch nicht freigegeben. [Android-Bauanleitung und Testgrenzen](docs/ANDROID_RELEASE.md).

## Verbleibende externe Prüfungen

1. Erfolgreicher Start, Dateidialoge, Zurücktaste und Pause/Resume auf einem physischen Android-Gerät oder hardwarebeschleunigten Testsystem.
2. Bildrate, Speicher, Temperatur und lange Spielsitzungen auf realen Geräten; weiteres manuelles Balancing nach Spielerfahrung.
3. Eine ausdrücklich beauftragte Store-Veröffentlichung mit Release-Signierung, Entwicklerkonten, aktuellen Store-Vorgaben und vollständigen Metadaten. Es wurde nichts in einen Store eingereicht.
