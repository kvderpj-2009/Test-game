#!/usr/bin/env python3
"""Build a debug-signed offline APK using Android SDK 35 and JDK 21 (no Gradle)."""
import os, pathlib, shutil, subprocess, zipfile
root=pathlib.Path(__file__).resolve().parent.parent
sdk=pathlib.Path(os.environ.get('ANDROID_SDK_ROOT','/workspace/.android-sdk'))
bt=sdk/'build-tools/35.0.0'
platform=sdk/'platforms/android-35/android.jar'
if not platform.exists() or not (bt/'aapt2').exists():raise SystemExit('Install Android SDK platform 35 and build-tools 35.0.0. Set ANDROID_SDK_ROOT.')
if not (root/'dist/index.html').exists():raise SystemExit('Run npm run build first.')
out=root/'android/build'
if out.exists():shutil.rmtree(out)
(out/'classes').mkdir(parents=True)
(out/'assets/game').mkdir(parents=True)
shutil.copytree(root/'dist',out/'assets/game',dirs_exist_ok=True)
def run(*args):subprocess.run([str(a) for a in args],cwd=root,check=True)
run(bt/'aapt2','compile','--dir',root/'android/res','-o',out/'resources.zip')
run(bt/'aapt2','link','-o',out/'unsigned.apk','-I',platform,'--manifest',root/'android/AndroidManifest.xml','-A',out/'assets',out/'resources.zip')
run('java','-m','jdk.compiler/com.sun.tools.javac.Main','-source','8','-target','8','-bootclasspath',platform,'-d',out/'classes',*list((root/'android/src').rglob('*.java')))
run(bt/'d8','--lib',platform,'--min-api','26','--output',out,*list((out/'classes').rglob('*.class')))
with zipfile.ZipFile(out/'unsigned.apk','a',zipfile.ZIP_DEFLATED) as apk:apk.write(out/'classes.dex','classes.dex')
run(bt/'zipalign','-f','-p','4',out/'unsigned.apk',out/'aligned.apk')
keydir=pathlib.Path(os.environ.get('POCKET_SIGNING_DIR','/workspace/.pocket-signing'))
keydir.mkdir(parents=True,exist_ok=True)
key=keydir/'debug.keystore'
if not key.exists():run('keytool','-genkeypair','-keystore',key,'-storepass','android','-keypass','android','-alias','androiddebugkey','-dname','CN=Android Debug,O=Pocket Civilization,C=DE','-keyalg','RSA','-keysize','2048','-validity','10000')
run(bt/'apksigner','sign','--ks',key,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',out/'Pocket-Civilization-0.2.0-debug.apk',out/'aligned.apk')
run(bt/'apksigner','verify','--verbose',out/'Pocket-Civilization-0.2.0-debug.apk')
run(bt/'zipalign','-c','4',out/'Pocket-Civilization-0.2.0-debug.apk')
print('APK:',out/'Pocket-Civilization-0.2.0-debug.apk')
