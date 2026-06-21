$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$firmwareDir = Join-Path $root "firmware\esp32c3-relay-node"
$configPath = Join-Path $firmwareDir "include\config.h"
$secretsPath = Join-Path $root "CLOUD_SECRETS_DA_INSERIRE_SU_VERCEL.txt"

function Read-Required {
  param([string]$Prompt)
  do {
    $value = Read-Host $Prompt
  } while ([string]::IsNullOrWhiteSpace($value))
  return $value.Trim()
}

function Escape-CString {
  param([string]$Value)
  return $Value.Replace("\", "\\").Replace('"', '\"')
}

Write-Host ""
Write-Host "Configurazione ESP32-C3 per cloud" -ForegroundColor Cyan
Write-Host ""

$wifiSsid = Read-Required "Nome Wi-Fi"
$wifiPassword = Read-Required "Password Wi-Fi"
$apiBaseUrl = Read-Required "URL API Vercel senza slash finale (es. https://domotica.vercel.app)"
$deviceId = Read-Required "ID dispositivo senza spazi (es. luce_soggiorno)"
$deviceName = Read-Required "Nome visibile (es. Luce soggiorno)"
$roomName = Read-Required "Stanza (es. Soggiorno)"
$relayPin = Read-Host "Pin rele [4]"
if ([string]::IsNullOrWhiteSpace($relayPin)) { $relayPin = "4" }
$switchPin = Read-Host "Pin interruttore [3]"
if ([string]::IsNullOrWhiteSpace($switchPin)) { $switchPin = "3" }
$relayActiveLow = Read-Host "Rele active-low? scrivi true o false [true]"
if ([string]::IsNullOrWhiteSpace($relayActiveLow)) { $relayActiveLow = "true" }

$deviceToken = ""
if (Test-Path $secretsPath) {
  $match = [regex]::Match((Get-Content $secretsPath -Raw), "DEVICE_TOKEN=(.+)")
  if ($match.Success) {
    $deviceToken = $match.Groups[1].Value.Trim()
  }
}
if (-not $deviceToken) {
  $deviceToken = Read-Required "DEVICE_TOKEN impostato su Vercel"
}

@"
#pragma once

#define WIFI_SSID "$(Escape-CString $wifiSsid)"
#define WIFI_PASSWORD "$(Escape-CString $wifiPassword)"

#define API_BASE_URL "$(Escape-CString $apiBaseUrl)"
#define DEVICE_TOKEN "$(Escape-CString $deviceToken)"

#define DEVICE_ID "$(Escape-CString $deviceId)"
#define DEVICE_NAME "$(Escape-CString $deviceName)"
#define ROOM_NAME "$(Escape-CString $roomName)"

#define RELAY_PIN $relayPin
#define SWITCH_PIN $switchPin
#define RELAY_ACTIVE_LOW $relayActiveLow
#define SWITCH_ACTIVE_LOW true
#define SWITCH_TOGGLE_MODE true
"@ | Set-Content -Path $configPath -Encoding ascii

Write-Host ""
Write-Host "config.h cloud creato." -ForegroundColor Green
Write-Host "Ora carica il firmware con PlatformIO."
