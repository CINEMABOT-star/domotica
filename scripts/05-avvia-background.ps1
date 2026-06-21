$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$serverPath = Join-Path $root "server-python\server.py"
$configPath = Join-Path $root "server-python\config.json"
$pidPath = Join-Path $root "server-python\server.pid"
$outLog = Join-Path $root "server-python\server.out.log"
$errLog = Join-Path $root "server-python\server.err.log"

if (-not (Test-Path $configPath)) {
  throw "Manca server-python\config.json. Prima esegui PREPARA_DOMOTICA.bat"
}

if (Test-Path $pidPath) {
  $pidValue = [int](Get-Content $pidPath -Raw)
  if (Get-Process -Id $pidValue -ErrorAction SilentlyContinue) {
    Write-Host "Sistema domotica gia avviato: http://localhost:8000" -ForegroundColor Green
    exit 0
  }
  Remove-Item -LiteralPath $pidPath -Force
}

if (Get-Command py -ErrorAction SilentlyContinue) {
  $process = Start-Process -FilePath "py" -ArgumentList @("-3", $serverPath) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $process = Start-Process -FilePath "python" -ArgumentList @($serverPath) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
} else {
  throw "Python non trovato. Installa Python 3 oppure aggiungilo al PATH."
}

$process.Id | Set-Content -Path $pidPath -Encoding ascii
Start-Sleep -Milliseconds 800
Write-Host "Sistema domotica avviato: http://localhost:8000" -ForegroundColor Green
