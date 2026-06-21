param(
  [string]$AdminUsername = "admin"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outPath = Join-Path $root "CLOUD_SECRETS_DA_INSERIRE_SU_VERCEL.txt"

function New-RandomSecret {
  param([int]$Bytes = 24)
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($buffer)
  $rng.Dispose()
  return [Convert]::ToBase64String($buffer).Replace("+", "A").Replace("/", "b").Replace("=", "")
}

$adminPassword = New-RandomSecret 18
$jwtSecret = New-RandomSecret 48
$deviceToken = New-RandomSecret 32

@"
COPIA QUESTE VARIABILI IN VERCEL

MONGODB_URI=incolla-qui-la-stringa-di-connessione-mongodb
MONGODB_DB=domotica
ADMIN_USERNAME=$AdminUsername
ADMIN_PASSWORD=$adminPassword
JWT_SECRET=$jwtSecret
DEVICE_TOKEN=$deviceToken
FRONTEND_ORIGIN=https://TUO-UTENTE.github.io

NOTE
- MONGODB_URI la prendi da MongoDB Atlas: Connect > Drivers.
- FRONTEND_ORIGIN va cambiato dopo aver pubblicato GitHub Pages.
- DEVICE_TOKEN deve essere lo stesso che userai nel firmware ESP32.
- Non caricare questo file su GitHub.
"@ | Set-Content -Path $outPath -Encoding ascii

Write-Host "File creato: $outPath" -ForegroundColor Green
Write-Host "Non pubblicarlo su GitHub."
