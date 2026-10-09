@echo off
setlocal
cd /d "%~dp0"
if not exist "public\models" mkdir "public\models"
set "BASE=https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
for %%F in (tiny_face_detector_model-weights_manifest.json tiny_face_detector_model-shard1 face_landmark_68_model-weights_manifest.json face_landmark_68_model-shard1 face_recognition_model-weights_manifest.json face_recognition_model-shard1 face_recognition_model-shard2) do (
 echo Lade %%F ...
 curl.exe -fL --retry 3 --output "public\models\%%F" "%BASE%/%%F"
 if errorlevel 1 (echo DOWNLOAD FEHLGESCHLAGEN: %%F & pause & exit /b 1)
)
echo.
echo Alle 7 Dateien heruntergeladen. Nun Git-Befehle ausfuehren.
pause
