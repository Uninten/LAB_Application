@echo off
setlocal

cd /d "%~dp0"

echo Starting local web server: http://localhost:8080
start "smart-lab-web-server" /min python -m http.server 8080

timeout /t 2 /nobreak >nul

set "URL=http://localhost:8080"
set "USER_DATA_DIR=%TEMP%\smart-lab-cors-browser"

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "smart-lab-chrome" "C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir="%USER_DATA_DIR%" "%URL%"
  goto :done
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
  start "smart-lab-chrome" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir="%USER_DATA_DIR%" "%URL%"
  goto :done
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
  start "smart-lab-edge" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --disable-web-security --user-data-dir="%USER_DATA_DIR%" "%URL%"
  goto :done
)

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "smart-lab-edge" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --disable-web-security --user-data-dir="%USER_DATA_DIR%" "%URL%"
  goto :done
)

echo Could not find Chrome or Edge. Please open %URL% manually in a browser with CORS disabled.
pause

:done
echo Opened %URL%
endlocal

