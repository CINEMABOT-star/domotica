$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pidPath = Join-Path $root "server-python\server.pid"

if (Test-Path $pidPath) {
  $pidValue = [int](Get-Content $pidPath -Raw)
  $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $pidValue -Force
    Remove-Item -LiteralPath $pidPath -Force
    Write-Host "Sistema domotica fermato." -ForegroundColor Green
    exit 0
  }
  Remove-Item -LiteralPath $pidPath -Force
}

Write-Host "Nessun server in background trovato. Se hai avviato AVVIA_DOMOTICA in una finestra, chiudi quella finestra o premi CTRL+C." -ForegroundColor Yellow
