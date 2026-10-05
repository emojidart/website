@echo off
setlocal
cd /d "%~dp0android"

if not exist settings.gradle (
  echo FEHLER: android\settings.gradle wurde nicht gefunden.
  pause
  exit /b 1
)

findstr /C:"include ':messenger'" settings.gradle >nul
if errorlevel 1 (
  echo include ':messenger'>>settings.gradle
  echo Messenger-Modul wurde in settings.gradle eingetragen.
)

call gradlew.bat :messenger:assembleDebug
if errorlevel 1 (
  echo.
  echo BUILD FEHLGESCHLAGEN.
  pause
  exit /b 1
)

if not exist "..\public\downloads" mkdir "..\public\downloads"

copy /Y "messenger\build\outputs\apk\debug\messenger-debug.apk" "..\public\downloads\emd-messenger.apk"

echo.
echo ==============================================
echo EMD Messenger APK wurde erstellt:
echo public\downloads\emd-messenger.apk
echo ==============================================
pause
