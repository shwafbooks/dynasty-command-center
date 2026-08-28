@echo off
setlocal
cd /d "%~dp0"

echo.
echo ================================================
echo   DYNASTY COMMAND CENTER - ONE CLICK START
echo ================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found.
  echo Attempting to install the Node.js LTS runtime with Windows Package Manager...
  where winget >nul 2>&1
  if errorlevel 1 (
    echo.
    echo Windows Package Manager (winget) is not available.
    echo Please install Node.js LTS from https://nodejs.org/ and run this file again.
    pause
    exit /b 1
  )
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  if errorlevel 1 (
    echo.
    echo Node.js installation failed or was cancelled.
    pause
    exit /b 1
  )
  echo.
  echo Node.js installed. Please close this window and double-click this launcher again.
  pause
  exit /b 0
)

set PORT=3000
set LEAGUE_ID=1389344338340761600

echo Starting the Command Center for Sleeper league %LEAGUE_ID%...
start "" http://localhost:%PORT%
node server.js

if errorlevel 1 (
  echo.
  echo The Command Center stopped unexpectedly.
  echo If port 3000 is already in use, close the other Command Center window and try again.
  pause
)
endlocal
