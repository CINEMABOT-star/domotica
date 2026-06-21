$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$serverPath = Join-Path $root "server-python\server.py"
$configPath = Join-Path $root "server-python\config.json"

if (-not (Test-Path $configPath)) {
  throw "Manca server-python\config.json. Prima esegui PREPARA_DOMOTICA.bat"
}

Write-Host ""
Write-Host "Avvio sistema domotica..." -ForegroundColor Cyan
Write-Host "Quando vuoi fermarlo, chiudi questa finestra o premi CTRL+C."
Write-Host ""

if (Get-Command py -ErrorAction SilentlyContinue) {
  py -3 $serverPath
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  python $serverPath
} else {
  throw "Python non trovato. Installa Python 3 oppure aggiungilo al PATH."
}
