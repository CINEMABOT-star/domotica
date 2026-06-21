#pragma once

// Copia questo file in include/config.h e modifica i valori.

#define WIFI_SSID "NomeWiFi"
#define WIFI_PASSWORD "PasswordWiFi"

// Server domotica locale raggiungibile dalla ESP32.
// In casa usa l'IP del PC/Raspberry, es. "192.168.1.20".
#define SERVER_HOST "192.168.1.20"
#define SERVER_PORT 8000

// Token generato dallo script PREPARA_DOMOTICA.bat.
#define DEVICE_TOKEN "cambia_token_device"

// Deve essere unico per ogni scheda.
#define DEVICE_ID "luce_soggiorno"
#define DEVICE_NAME "Luce soggiorno"
#define ROOM_NAME "Soggiorno"

// ESP32-C3 SuperMini: scegli pin liberi e verifica la serigrafia della tua scheda.
// Usa un modulo rele 5V con ingresso comandabile a 3.3V, oppure un transistor/optoisolatore.
#define RELAY_PIN 4
#define SWITCH_PIN 3

// Molti moduli rele sono active-low: LOW accende, HIGH spegne.
#define RELAY_ACTIVE_LOW true

// Interruttore fisico verso GND con pull-up interno.
#define SWITCH_ACTIVE_LOW true

// Se true, l'interruttore fisico inverte lo stato a ogni pressione.
// Se false, lo stato della luce segue direttamente la posizione dell'interruttore.
#define SWITCH_TOGGLE_MODE true
