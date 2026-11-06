# Android-Testfassung 0.4.1

Das native Projekt liegt in `android/`. Eine kleine Java-Activity lädt den vollständigen Produktionsbuild aus dem APK über einen lokalen HTTPS-Ursprung. Sie verwendet die Android-System-WebView. Es gibt keine Netzwerkberechtigung, externe Serveradresse, Werbung oder verpflichtenden Konten. Die Anwendung benötigt Android 8 oder neuer sowie eine aktuelle System-WebView; die bislang geprüften Android-Versionen stehen im Entwicklungsbericht.

Version 0.4.1 unterdrückt die Bau-Popups und korrigiert den Baufortschrittsbalken. Seit Version 0.4.0 enthält das Spiel die kompakte Oberfläche und Steinzeitgrafik. Die native Java-Hülle bleibt gegenüber 0.3.0 unverändert; die JavaScript-Zurückbehandlung schließt auch Baumenü, Dein Weg und Gebäudeauswahl. Die folgende native Emulatordokumentation bezieht sich auf 0.3.0 und ist keine Gerätefreigabe für 0.4.1.

## Bisheriger nativer Befund

Die Browserfassung besteht ihre Prüfungen mit WebGL und Canvas. Für die native APK liegt noch kein erfolgreicher Spielstart auf einem realen Gerät vor.

Im bisherigen Android-35-Testsystem stürzte WebView 124 mit `SIGTRAP` ab. Zur Eingrenzung wurde eine eigenständige, minimale Test-App auf Android 34 mit WebView 113.0.5672.136 installiert. Auch deren einfache lokale HTML-Seite löste einen Rendererabbruch aus, ohne Spielskripte, Pixi oder WebGL. Die Cloud-Emulatoren laufen ohne KVM; außerdem traten Android-System-ANRs auf. Dieser Befund belegt einen Fehler außerhalb des eigentlichen Spielcodes, bestimmt aber seine genaue Ursache noch nicht.

Die damals neue 0.3.0-APK ließ sich anschließend installieren. Bei ihrem fehlgeschlagenen Start erschien tatsächlich die native Wiederherstellungsansicht, und die Activity blieb aktiv. Nach Schließen eines Android-System-UI-ANR-Dialogs wurde der Kompatibilitätsknopf betätigt; die App speicherte `canvasRenderer=true`. Damit sind die Wiederherstellungsansicht und die Auswahl des Modus nativ nachgewiesen, jedoch noch kein erfolgreicher nativer Spielbetrieb. [Aufnahme der Wiederherstellungsansicht](android-recovery-0.3.0.png), [Prüfprotokoll](ANDROID_VERIFICATION.json).

Die APK ist deshalb weiterhin experimentell. Der vollständige, separat geprüfte Browserbuild und sein Starter liegen im selben Downloadpaket.

## Wiederherstellung

Ein Rendererabbruch wird nun nativ behandelt. Wenn das Spiel nach 45 Sekunden keine erfolgreiche Startbestätigung sendet, erscheint ebenfalls eine Wiederherstellungsansicht. Sie bietet:

- **Im Kompatibilitätsmodus starten:** verwendet Canvas und merkt sich die Wahl für weitere App-Starts.
- **Normal erneut starten:** versucht die normale Grafik und nimmt die Canvas-Vorauswahl zurück.
- **Schließen:** legt die App in den Hintergrund; auch die Zurücktaste funktioniert in dieser Ansicht.

Gespeicherte lokale Spielstände werden dabei nicht gelöscht. Bei einem normalen Start beendet die JavaScript-Startbestätigung den Zeitwächter. Canvas ersetzt WebGL, behebt jedoch keinen Absturz der System-WebView selbst. In diesem Fall die System-WebView auf dem Gerät aktualisieren und die Browserfassung als geprüfte Alternative verwenden.

## Bauen

Voraussetzungen: Node.js 22.12+, Java 21 mit Compiler-Modul, Python 3, Android SDK Platform 35 und Build Tools 35.0.0. Die SDK-Pakete wurden aus Googles offiziellem Repository bezogen und gegen die dort veröffentlichten Prüfsummen geprüft. Für die Nutzung des SDK gelten dessen Lizenzbedingungen.

```bash
npm ci
ANDROID_SDK_ROOT=/pfad/zum/android-sdk npm run build:android
```

Das Skript verwendet `aapt2`, den Java-Compiler, `d8`, `zipalign` und `apksigner`. Zusätzliche Frameworks oder Gradle-Abhängigkeiten sind nicht erforderlich. Ergebnis:

`android/build/Pocket-Civilization-0.4.1-debug.apk`

Die Signatur wird nach dem Build verifiziert. Der lokale Debug-Schlüssel liegt außerhalb des Repositorys, standardmäßig in `/workspace/.pocket-signing/`; mit `POCKET_SIGNING_DIR` lässt sich der Ordner ändern. Er nutzt die üblichen Android-Debug-Zugangsdaten und ist ausschließlich für Testfassungen bestimmt. Für Updates derselben Testinstallation muss derselbe Schlüssel erhalten bleiben. Kein privater Schlüssel wird im Downloadpaket oder im Repository mitgeliefert.

```bash
adb install -r android/build/Pocket-Civilization-0.4.1-debug.apk
adb shell am start -n app.pocketcivilization.game/.MainActivity
```

Alternativ die APK auf dem Gerät öffnen und für den verwendeten Dateimanager die Installation dieser Testdatei erlauben. Der Paketname ist `app.pocketcivilization.game`. Browserstände zunächst als JSON exportieren und in der App importieren; beide haben getrennte lokale Speicher.

## Implementierter nativer Ablauf

- Gebündelte Dateien werden durch die WebView aus den APK-Assets geladen, auch beim ersten Start ohne Netz.
- Navigation zu externen Ursprüngen sowie direkter Dateizugriff sind gesperrt.
- Lokale Spielstände verwenden denselben geprüften Speichermechanismus wie die Browserfassung.
- Export und Import öffnen Androids Storage Access Framework. Dateien sind auf 5 MB begrenzt und werden anschließend durch die Spielstandprüfung validiert.
- Beim Pausieren wird gespeichert. Bei Rückkehr wird optional der begrenzte Abwesenheitsfortschritt nachgeholt.
- Die Zurücktaste bricht zuerst einen Bestätigungsdialog ab, schließt danach das offene Menü oder den Platzierungsmodus und führt ins Spielhauptmenü. Ein weiterer Druck legt die App in den Hintergrund und zeigt den Android-Startbildschirm.
- Systemleisten und Displayaussparungen erhalten eigene Abstände; beide Ausrichtungen bleiben erlaubt.
- WebView-Debugging ist nur für die ausdrücklich als Debug markierte Test-App aktiv.
- Lizenztexte und Versionsangaben der Laufzeitbibliotheken liegen auch in der APK unter `assets/licenses/`.

## Vor Store-Veröffentlichung

Die enthaltene APK ist keine Store-Freigabe. Google Play benötigt unter anderem eine regulär signierte Release-/Bundle-Pipeline; Huawei eigene Store-Metadaten. Ein privater Release-Schlüssel und Entwicklerkonten müssen vom Eigentümer kommen. Die spätere Veröffentlichung benötigt dessen ausdrücklichen Auftrag.

Vorher bleiben reale Geräteprüfungen, Langzeittests, aktuelle Store-Vorgaben, Datenschutz-/Altersangaben, Support-Kontakt und finale Screenshots zu erledigen. Die eigene Grafikverfeinerung ist in 0.3.0 enthalten. Mindestanforderung „Android 8“ beschreibt die SDK-Kompatibilität, keinen bereits erbrachten Test auf jeder Android-Version.
