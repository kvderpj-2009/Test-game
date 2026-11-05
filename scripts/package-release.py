#!/usr/bin/env python3
"""Package the verified build, debug APK, tracked source and installed runtime licenses."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import re
import subprocess
import zipfile
from collect_licenses import copy_notices

repo = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--out', type=Path, default=repo / 'exports')
parser.add_argument('--example', type=Path, help='Optional exported campaign save')
args = parser.parse_args()
version = json.loads((repo / 'package.json').read_text())['version']
name = 'Pocket-Civilization-' + version
apk = repo / 'android/build' / (name + '-debug.apk')
if not (repo / 'dist/index.html').exists() or not apk.exists():
    raise SystemExit('Run npm run build:android before packaging.')
root = args.out.resolve() / name
if root.exists():
    raise SystemExit(str(root) + ' already exists; choose another --out directory.')
root.mkdir(parents=True)
shutil.copytree(repo / 'dist', root / 'Spiel')
files = subprocess.check_output(['git', 'ls-files', '-z'], cwd=repo).decode().split('\0')
for filename in filter(None, files):
    source = repo / filename
    if source.is_file():
        target = root / 'Quellcode' / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
for filename in ['start.mjs', 'Start-Spiel.bat']:
    shutil.copy2(repo / 'scripts/launcher' / filename, root / filename)
for source, target in [('GAME_GUIDE.md', 'SPIELHILFE.md'), ('ANDROID_RELEASE.md', 'ANDROID-HINWEISE.md'), ('GRAPHICS.md', 'GRAFIK.md')]:
    document = (repo / 'docs' / source).read_text()
    # The copied guides live beside Spiel/, while evidence stays in Quellcode/docs/.
    document = re.sub(r'\]\(([^():#]+)\)', lambda match: '](' + ('Quellcode/docs/' if (repo / 'docs' / match.group(1)).is_file() else '') + match.group(1) + ')', document)
    (root / target).write_text(document)

shutil.copy2(apk, root / apk.name)
if args.example:
    shutil.copy2(args.example, root / 'Beispielspielstand-Raumfahrt.json')
copy_notices(repo, root / 'Drittlizenzen')
(root / 'ZUERST-LESEN.txt').write_text(f'''POCKET CIVILIZATION {version}

WINDOWS / MAC / LINUX
1. Das gesamte ZIP in einen normalen Ordner entpacken.
2. Node.js 22.12 oder neuer installieren, falls noch nicht vorhanden.
3. Unter Windows Start-Spiel.bat doppelt anklicken.
   Unter macOS/Linux im entpackten Ordner: node start.mjs
4. Die angezeigte lokale Adresse im Browser öffnen.
   Spiel/ enthält den fertigen Build. npm install ist zum Spielen nicht nötig.
   index.html nicht per Doppelklick als file:// öffnen.

ANDROID
{apk.name} ist eine signierte, experimentelle Testfassung, keine Store-Version.
Sie enthält das vollständige Spiel und benötigt keine Internetberechtigung.
Den tatsächlichen Android-Teststand und Installationshinweise zuerst in ANDROID-HINWEISE.md lesen.
Die geprüfte Browserfassung ist über den mitgelieferten Starter verfügbar.

SPIELSTÄNDE
In der alten Version zuerst Einstellungen > Spielstände > Export wählen.
In der neuen Version über Import wieder laden. Bei gleicher Browseradresse und gleichem
Profil werden lokale Spielstände übernommen. Browser und APK haben getrennte Speicher.
APK-Updates über die vorhandene Installation installieren, damit lokale Daten erhalten bleiben.
Ein optional mitgelieferter Beispielspielstand wurde mit regulärer Produktion erspielt.
Sein Import ersetzt nach Bestätigung den aktiven Stand; dieser wird zuvor manuell gesichert.

INHALT
Alle elf Epochen, mehrere Siedlungen, Warenrouten, Versorgung, Truppen und Kampagnensieg.
Schmale Kopfleiste, Symbole rechts, schließbare Fenster und Minikarte unten links.
Forschungshütte direkt im Forschungsfenster bauen oder finden. Eigene Steinzeitgebäude.
SPIELHILFE.md erklärt den Fortschritt; GRAFIK.md den Kompatibilitätsmodus.
Quellcode/ enthält das bearbeitbare Projekt und seine automatisierten Prüfungen.
Drittlizenzen/ enthält die Lizenzhinweise der tatsächlich verwendeten Bibliotheken.
PAKET.json enthält Dateigrößen und SHA-256-Prüfsummen.
''', encoding='utf-8')
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
manifest = {'version': version, 'sourceCommit': commit, 'files': {}}
for file in sorted(root.rglob('*')):
    if file.is_file():
        manifest['files'][file.relative_to(root).as_posix()] = {'bytes': file.stat().st_size, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
(root / 'PAKET.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
archive = root.parent / (name + '.zip')
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zipped:
    for file in sorted(root.rglob('*')):
        if file.is_file():
            zipped.write(file, file.relative_to(root.parent))
with zipfile.ZipFile(archive) as zipped:
    assert zipped.testzip() is None
    for filename, details in manifest['files'].items():
        data = zipped.read(name + '/' + filename)
        assert len(data) == details['bytes']
        assert hashlib.sha256(data).hexdigest() == details['sha256']
print(json.dumps({'archive': str(archive), 'bytes': archive.stat().st_size, 'files': len(manifest['files']), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'sourceCommit': commit}))
