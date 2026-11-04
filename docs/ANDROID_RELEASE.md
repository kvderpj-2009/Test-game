# Android-Testfassung 0.2.0

Das native Projekt liegt in `android/`. Eine kleine Java-Activity lädt den vollständigen Produktionsbuild aus dem APK über einen lokalen HTTPS-Ursprung. Sie verwendet die Android-System-WebView. Es gibt keine Netzwerkberechtigung, externe Serveradresse, Werbung oder verpflichtenden Konten. Die Anwendung benötigt Android 8 oder neuer sowie eine aktuelle System-WebView mit WebGL; die bislang geprüften Android-Versionen stehen im Entwicklungsbericht.

## Ergebnis des nativen Startversuchs

Die APK ließ sich auf dem Android-35-Testsystem installieren. Der App-Start ist dort **nicht bestanden**: Android-System-WebView 124 blieb zunächst leer und ihr Renderer stürzte anschließend mit `SIGTRAP` ab. Der Emulator hatte keine KVM-Beschleunigung; außerdem meldete er Einschränkungen bei der Grafikunterstützung. Die genaue Ursache ist noch offen. Die APK deshalb nur experimentell verwenden; die getestete Browserfassung liegt im selben Paket. Ein erfolgreicher physischer Gerätetest liegt nicht vor.

## Bauen

Voraussetzungen: Node.js 22.12+, Java 21 mit Compiler-Modul, Python 3, Android SDK Platform 35 und Build Tools 35.0.0. Die SDK-Pakete wurden aus Googles offiziellem Repository bezogen und gegen die dort veröffentlichten Prüfsummen geprüft. Für die Nutzung des SDK gelten dessen Lizenzbedingungen.

```bash
npm ci
ANDROID_SDK_ROOT=/pfad/zum/android-sdk npm run build:android
```

Das Skript verwendet `aapt2`, den Java-Compiler, `d8`, `zipalign` und `apksigner`. Zusätzliche Frameworks oder Gradle-Abhängigkeiten sind nicht erforderlich. Ergebnis:

`android/build/Pocket-Civilization-0.2.0-debug.apk`

Die Signatur wird nach dem Build verifiziert. Der lokale Debug-Schlüssel liegt außerhalb des Repositorys, standardmäßig in `/workspace/.pocket-signing/`; mit `POCKET_SIGNING_DIR` lässt sich der Ordner ändern. Er nutzt die üblichen Android-Debug-Zugangsdaten und ist ausschließlich für Testfassungen bestimmt. Für Updates derselben Testinstallation muss derselbe Schlüssel erhalten bleiben. Kein privater Schlüssel wird im Downloadpaket oder im Repository mitgeliefert.

```bash
adb install -r android/build/Pocket-Civilization-0.2.0-debug.apk
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

## Vor Store-Veröffentlichung

Die enthaltene APK ist keine Store-Freigabe. Google Play benötigt unter anderem eine regulär signierte Release-/Bundle-Pipeline; Huawei eigene Store-Metadaten. Ein privater Release-Schlüssel und Entwicklerkonten müssen vom Eigentümer kommen. Die spätere Veröffentlichung benötigt dessen ausdrücklichen Auftrag.

Vorher bleiben reale Geräteprüfungen, Langzeittests, aktuelle Store-Vorgaben, Datenschutz-/Altersangaben, Support-Kontakt und finale Screenshots zu erledigen. Die Grafiken werden auf Wunsch erst im nächsten Schritt verfeinert. Mindestanforderung „Android 8“ beschreibt die SDK-Kompatibilität, keinen bereits erbrachten Test auf jeder Android-Version.
