$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    Write-Host "Node.js was installed. Close this window and run the launcher again."
    Read-Host "Press Enter to exit"
    exit
  }
  throw "Node.js is not installed and winget is unavailable. Install Node.js LTS from https://nodejs.org/"
}
$env:PORT='3000'
$env:LEAGUE_ID='1389344338340761600'
Start-Process 'http://localhost:3000'
node .\server.js
