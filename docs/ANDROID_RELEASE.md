# Android-Veröffentlichung vorbereiten

Der Browserbuild ist derzeit die geprüfte Plattform. Eine spätere native Verpackung kann beispielsweise über Capacitor erfolgen. Dieser Release-Schritt ist noch nicht ausgeführt: Es gibt kein natives Projekt und kein signiertes APK/AAB.

## Vorhanden

- Touch-Steuerung, responsive Oberfläche, lokale Spielstände und Export/Import.
- Offline-Assets, Web-App-Manifest und eigenes SVG-Icon.
- Produktionsdateien unter `dist/` nach `npm run build`.
- Keine Konten, Werbung, kostenpflichtigen APIs, Tracking-Dienste oder Multiplayer-Abhängigkeit.

## Erster Android-Build

1. Eine stabile Capacitor-Version passend zu Node/Android auswählen; `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` installieren und im Lockfile festhalten.
2. Finale eindeutige Application-ID festlegen; `Pocket Civilization` als App-Namen und `dist` als `webDir` verwenden. Keine externe `server.url` in der Release-Konfiguration.
3. Android-Projekt generieren, Webbuild erzeugen und Assets synchronisieren.
4. Passendes Android-SDK, Build Tools und JDK installieren. Hier ist Java vorhanden, aber kein Android-SDK eingerichtet.
5. PNG-Icons in Android-Dichten, adaptive Icons und Splashscreen aus eigenem Artwork erzeugen.
6. Nur nötige Berechtigungen verwenden. Das Spiel benötigt weder Standort noch Kamera, Kontakte oder Mikrofon. Export/Import auf Android separat prüfen; Browserdateidialoge sind kein Nachweis des nativen Ablaufs.
7. Debug-APK auf einem echten Mittelklassegerät und verschiedenen Displaygrößen testen. Pause/Resume, Audio-Fokus, Prozessabbruch, Speicherlimits, Back-Taste, Safe Areas und Offline-Start prüfen.
8. Release erst danach signieren. Keystore und Passwörter gehören in sichere Release-Konfiguration, nie ins Repository. Google Play und Huawei benötigen eigene Entwicklerkonten und aktuelle Store-Metadaten.

## Abnahme vor Store-Einreichung

- Vollständiger Gameplay-Durchlauf und anschließendes Laden.
- Wirtschaftszahlen vor/nach App-Unterbrechung vergleichen.
- Netzwerkanfragen und Berechtigungen prüfen.
- Startzeit, Speicher, Framerate und lange Frames bei größerer Siedlung messen.
- Vier Sprachen auf kleinen Displays ohne abgeschnittene Bestätigungsbuttons.
- Altersfreigabe, Datenschutzangaben, Bilder, Beschreibung und Support-Kontakt mit den tatsächlichen Funktionen abgleichen.

Signierung und Veröffentlichung sind durch die bisherigen Tests nicht belegt.
