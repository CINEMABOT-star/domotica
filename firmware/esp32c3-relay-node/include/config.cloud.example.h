#pragma once

// Copia questo file in include/config.h e modifica i valori.

#define WIFI_SSID "NomeWiFi"
#define WIFI_PASSWORD "PasswordWiFi"

// URL della API Vercel, senza slash finale.
#define API_BASE_URL "https://TUO-PROGETTO.vercel.app"

// Deve essere uguale alla variabile DEVICE_TOKEN impostata su Vercel.
#define DEVICE_TOKEN "cambia-token-esp32"

// Deve essere unico per ogni scheda.
#define DEVICE_ID "luce_soggiorno"
#define DEVICE_NAME "Luce soggiorno"
#define ROOM_NAME "Soggiorno"

// ESP32-C3 SuperMini: scegli pin liberi e verifica la serigrafia della tua scheda.
#define RELAY_PIN 4
#define SWITCH_PIN 3

// Molti moduli rele sono active-low: LOW accende, HIGH spegne.
#define RELAY_ACTIVE_LOW true

// Interruttore fisico verso GND con pull-up interno.
#define SWITCH_ACTIVE_LOW true
#define SWITCH_TOGGLE_MODE true
