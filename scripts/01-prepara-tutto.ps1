param(
  [string]$AdminUsername = "admin"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$serverPythonDir = Join-Path $root "server-python"
$configPath = Join-Path $serverPythonDir "config.json"
$panelPasswordPath = Join-Path $root "PASSWORD_PANNELLO_WEB.txt"
$deviceTokenPath = Join-Path $root "DEVICE_TOKEN_ESP32.txt"

function New-RandomSecret {
  param([int]$Bytes = 24)
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($buffer)
  $rng.Dispose()
  return [Convert]::ToBase64String($buffer).Replace("+", "A").Replace("/", "b").Replace("=", "")
}

function Get-Sha256 {
  param([string]$Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
  $hash = $sha.ComputeHash($bytes)
  return -join ($hash | ForEach-Object { $_.ToString("x2") })
}

Write-Host ""
Write-Host "Preparazione progetto domotica" -ForegroundColor Cyan
Write-Host "Creo password pannello e token ESP32. Non serve Docker e non serve broker MQTT."
Write-Host ""

if (Test-Path $configPath) {
  Write-Host "server-python\config.json esiste gia: non lo sovrascrivo." -ForegroundColor Yellow
  if (Test-Path $panelPasswordPath) {
    Write-Host ""
    Get-Content $panelPasswordPath
  }
  Write-Host ""
  Write-Host "Preparazione gia completata."
  exit 0
}

$adminPassword = New-RandomSecret 18
$deviceToken = New-RandomSecret 32
$passwordHash = Get-Sha256 $adminPassword

$config = [ordered]@{
  port = 8000
  admin_username = $AdminUsername
  admin_password_hash = $passwordHash
  device_token = $deviceToken
}

$config | ConvertTo-Json -Depth 4 | Set-Content -Path $configPath -Encoding utf8

@"
Credenziali pannello web:

URL: http://localhost:8000
Utente: $AdminUsername
Password: $adminPassword

Non pubblicare questo file.
"@ | Set-Content -Path $panelPasswordPath -Encoding ascii

@"
Token da usare nelle ESP32:

DEVICE_TOKEN=$deviceToken

Non pubblicare questo file.
"@ | Set-Content -Path $deviceTokenPath -Encoding ascii

Write-Host "Preparazione completata." -ForegroundColor Green
Write-Host ""
Get-Content $panelPasswordPath
Write-Host ""
Write-Host "Ora esegui AVVIA_DOMOTICA.bat"
