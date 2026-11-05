"""Collect installed runtime notices, with checksum-checked copies for omitted npm notices."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess


def copy_notices(repo: Path, destination: Path):
    destination.mkdir(parents=True, exist_ok=True)
    fallbacks = json.loads((repo / 'third_party/licenses.json').read_text())
    packages = subprocess.check_output(
        ['npm', 'ls', '--omit=dev', '--parseable', '--all'], cwd=repo, text=True
    ).splitlines()
    for package in sorted(set(packages)):
        folder = Path(package)
        if folder == repo:
            continue
        meta = json.loads((folder / 'package.json').read_text())
        prefix = meta['name'].replace('/', '__')
        shutil.copy2(folder / 'package.json', destination / (prefix + '.package.json'))
        notices = [
            f for f in folder.iterdir()
            if f.is_file() and f.name.lower().startswith(('license', 'licence', 'copying', 'notice'))
        ]
        if not notices:
            fallback = fallbacks.get(meta['name'] + '@' + meta['version'])
            if not fallback:
                raise SystemExit('Check missing license file: ' + str(folder))
            notice = repo / 'third_party' / fallback['file']
            if hashlib.sha256(notice.read_bytes()).hexdigest() != fallback['sha256']:
                raise SystemExit('Bundled license checksum mismatch: ' + str(notice))
            notices = [notice]
        for notice in notices:
            shutil.copy2(notice, destination / (prefix + '-' + notice.name))
    shutil.copy2(repo / 'third_party/licenses.json', destination / 'Quellen.json')
    (destination / 'README.txt').write_text(
        'Lizenztexte und Versionsangaben der installierten Laufzeitbibliotheken.\n'
        'Die eigenen Spielgrafiken werden im Projekt prozedural gezeichnet.\n'
        'Quellen ergänzter Lizenztexte und deren Prüfsummen: Quellen.json.\n', encoding='utf-8'
    )
