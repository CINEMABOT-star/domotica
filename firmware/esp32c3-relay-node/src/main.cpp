#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFi.h>

#include "config.h"

static const unsigned long WIFI_RETRY_MS = 5000;
static const unsigned long STATE_PUSH_MS = 10000;
static const unsigned long COMMAND_POLL_MS = 1000;
static const unsigned long DEBOUNCE_MS = 45;

bool relayOn = false;
bool lastRawSwitch = false;
bool stableSwitch = false;
bool lastStableSwitch = false;
unsigned long lastSwitchChangeMs = 0;
unsigned long lastWifiAttemptMs = 0;
unsigned long lastStatePushMs = 0;
unsigned long lastCommandPollMs = 0;

String serverBase;
WiFiClientSecure secureClient;

bool readSwitchActive()
{
  const bool raw = digitalRead(SWITCH_PIN) == HIGH;
  return SWITCH_ACTIVE_LOW ? !raw : raw;
}

void writeRelay(bool on)
{
  relayOn = on;
  const bool outputHigh = RELAY_ACTIVE_LOW ? !on : on;
  digitalWrite(RELAY_PIN, outputHigh ? HIGH : LOW);
}

bool postState(const char *reason)
{
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  JsonDocument doc;
  doc["id"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["room"] = ROOM_NAME;
  doc["type"] = "light";
  doc["state"] = relayOn ? "on" : "off";
  doc["reason"] = reason;
  doc["rssi"] = WiFi.RSSI();
  doc["uptimeMs"] = millis();

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
#ifdef API_BASE_URL
  const String url = serverBase + "/api/device-state";
#else
  const String url = serverBase + "/api/device/state";
#endif
  if (url.startsWith("https://")) {
    http.begin(secureClient, url);
  } else {
    http.begin(url);
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  const int status = http.POST(payload);
  http.end();

  return status >= 200 && status < 300;
}

void applyCommand(const char *state)
{
  if (strcmp(state, "on") == 0) {
    writeRelay(true);
    postState("server");
  } else if (strcmp(state, "off") == 0) {
    writeRelay(false);
    postState("server");
  } else if (strcmp(state, "toggle") == 0) {
    writeRelay(!relayOn);
    postState("server");
  }
}

void pollCommand()
{
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
#ifdef API_BASE_URL
  const String url = serverBase + "/api/device-poll?id=" + String(DEVICE_ID);
#else
  const String url = serverBase + "/api/device/poll?id=" + String(DEVICE_ID);
#endif
  if (url.startsWith("https://")) {
    http.begin(secureClient, url);
  } else {
    http.begin(url);
  }
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  const int status = http.GET();

  if (status == 200) {
    JsonDocument doc;
    const String body = http.getString();
    if (!deserializeJson(doc, body)) {
      const char *state = doc["state"] | "none";
      applyCommand(state);
    }
  }

  http.end();
}

void connectWifi()
{
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  const unsigned long now = millis();
  if (now - lastWifiAttemptMs < WIFI_RETRY_MS) {
    return;
  }
  lastWifiAttemptMs = now;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void handleSwitch()
{
  const bool raw = readSwitchActive();
  const unsigned long now = millis();

  if (raw != lastRawSwitch) {
    lastRawSwitch = raw;
    lastSwitchChangeMs = now;
  }

  if ((now - lastSwitchChangeMs) < DEBOUNCE_MS) {
    return;
  }

  stableSwitch = raw;
  if (stableSwitch == lastStableSwitch) {
    return;
  }

  lastStableSwitch = stableSwitch;
  if (SWITCH_TOGGLE_MODE) {
    if (stableSwitch) {
      writeRelay(!relayOn);
      postState("switch");
    }
  } else {
    writeRelay(stableSwitch);
    postState("switch");
  }
}

void setup()
{
  Serial.begin(115200);
  delay(200);

#ifdef API_BASE_URL
  serverBase = String(API_BASE_URL);
#else
  serverBase = String("http://") + SERVER_HOST + ":" + String(SERVER_PORT);
#endif
  secureClient.setInsecure();

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  writeRelay(false);

  lastRawSwitch = readSwitchActive();
  stableSwitch = lastRawSwitch;
  lastStableSwitch = stableSwitch;

  WiFi.setAutoReconnect(true);
  connectWifi();
}

void loop()
{
  connectWifi();
  handleSwitch();

  const unsigned long now = millis();
  if (now - lastCommandPollMs >= COMMAND_POLL_MS) {
    lastCommandPollMs = now;
    pollCommand();
  }

  if (now - lastStatePushMs >= STATE_PUSH_MS) {
    lastStatePushMs = now;
    postState("heartbeat");
  }
}
