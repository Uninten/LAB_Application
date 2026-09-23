@echo off
setlocal

cd /d "%~dp0"

set "URL=https://uninten.github.io/LAB_Application/"
set "USER_DATA_DIR=%TEMP%\smart-lab-cors-demo-browser"

if /i "%~1"=="local" (
  echo Starting local web server: http://localhost:8080
  start "smart-lab-web-server" /min python -m http.server 8080
  timeout /t 2 /nobreak >nul
  set "URL=http://localhost:8080"
)

echo Opening demo page: %URL%
echo WARNING: Use the browser window opened by this script only for this demo.

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "smart-lab-chrome" "C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --disable-extensions --disable-background-mode --user-data-dir="%USER_DATA_DIR%" --no-first-run --no-default-browser-check --app="%URL%"
  goto :done
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
  start "smart-lab-chrome" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --disable-web-security --disable-extensions --disable-background-mode --user-data-dir="%USER_DATA_DIR%" --no-first-run --no-default-browser-check --app="%URL%"
  goto :done
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
  start "smart-lab-edge" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --disable-web-security --disable-extensions --disable-background-mode --user-data-dir="%USER_DATA_DIR%" --no-first-run --no-default-browser-check --app="%URL%"
  goto :done
)

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "smart-lab-edge" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --disable-web-security --disable-extensions --disable-background-mode --user-data-dir="%USER_DATA_DIR%" --no-first-run --no-default-browser-check --app="%URL%"
  goto :done
)

echo Could not find Chrome or Edge in a standard installation directory.
echo Install Chrome or Edge, then run this script again.
pause

:done
echo Opened %URL%
echo Close this special browser window after the demonstration.
endlocal

