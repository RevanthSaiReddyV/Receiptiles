#include "api_client.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_system.h>

// ─── Constructor ────────────────────────────────────────────────────────────

ApiClient::ApiClient()
    : _state(DeviceState::UNPROVISIONED),
      _lastHeartbeat(0),
      _lastUploadAttempt(0),
      _lastReceiptTime(0) {}

// ─── Begin (called once in setup) ───────────────────────────────────────────

bool ApiClient::begin() {
    _loadConfig();

    if (_wifiSsid.length() == 0) {
        Serial.println("[API] No WiFi credentials configured");
        _state = DeviceState::UNPROVISIONED;
        return false;
    }

    if (!connectWiFi()) {
        _state = DeviceState::OFFLINE;
        return false;
    }

    if (_apiKey.length() == 0) {
        _state = DeviceState::UNPROVISIONED;
        Serial.println("[API] Device not provisioned — needs API key");
        return false;
    }

    _state = DeviceState::ONLINE;
    Serial.printf("[API] Online — Device: %s\n", _deviceId.c_str());
    return true;
}

// ─── Main Loop (non-blocking) ───────────────────────────────────────────────

void ApiClient::loop() {
    // Reconnect WiFi if lost
    if (!isWiFiConnected()) {
        if (_state == DeviceState::ONLINE) {
            _state = DeviceState::OFFLINE;
            Serial.println("[API] WiFi lost — buffering receipts");
        }
        static unsigned long lastReconnect = 0;
        if (millis() - lastReconnect > WIFI_RECONNECT_INTERVAL) {
            lastReconnect = millis();
            connectWiFi();
        }
        return;
    }

    if (_state == DeviceState::OFFLINE) {
        _state = DeviceState::ONLINE;
        Serial.println("[API] WiFi restored — flushing queue");
    }

    // Periodic heartbeat
    if (millis() - _lastHeartbeat > HEARTBEAT_INTERVAL) {
        sendHeartbeat();
        _lastHeartbeat = millis();
    }

    // Batch upload pending receipts
    if (_pendingReceipts.size() > 0) {
        bool shouldUpload = false;

        // Upload if batch is full
        if ((int)_pendingReceipts.size() >= BATCH_UPLOAD_SIZE) {
            shouldUpload = true;
        }
        // Or if enough time has passed since last receipt
        else if (_lastReceiptTime > 0 &&
                 millis() - _lastReceiptTime > BATCH_UPLOAD_DELAY) {
            shouldUpload = true;
        }

        if (shouldUpload) {
            uploadBatch(_pendingReceipts);
            _pendingReceipts.clear();
        }
    }
}

// ─── WiFi ───────────────────────────────────────────────────────────────────

bool ApiClient::connectWiFi() {
    Serial.printf("[API] Connecting to WiFi: %s\n", _wifiSsid.c_str());
    _state = DeviceState::CONNECTING;

    WiFi.mode(WIFI_STA);
    WiFi.begin(_wifiSsid.c_str(), _wifiPassword.c_str());

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED &&
           millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
        delay(250);
        Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[API] Connected — IP: %s\n", WiFi.localIP().toString().c_str());
        return true;
    }

    Serial.println("[API] WiFi connection failed");
    return false;
}

bool ApiClient::isWiFiConnected() {
    return WiFi.status() == WL_CONNECTED;
}

// ─── Device Provisioning ────────────────────────────────────────────────────

bool ApiClient::provision(const String& provisionKey) {
    if (_serial.length() == 0) {
        _serial = _generateSerial();
        _saveConfig();
    }

    JsonDocument doc;
    doc["serial"] = _serial;
    doc["firmware"] = FW_VERSION;
    doc["connectionType"] = "network";  // We're a virtual network printer

    String body;
    serializeJson(doc, body);

    HTTPClient http;
    String url = _apiUrl + "/api/device/register";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + provisionKey);
    http.setTimeout(API_TIMEOUT_MS);

    int code = http.POST(body);
    String response = http.getString();
    http.end();

    if (code == 201) {
        JsonDocument resp;
        deserializeJson(resp, response);
        _deviceId = resp["deviceId"].as<String>();
        _apiKey = resp["apiKey"].as<String>();
        _saveConfig();
        _state = DeviceState::ONLINE;
        Serial.printf("[API] Provisioned! Device ID: %s\n", _deviceId.c_str());
        return true;
    }

    Serial.printf("[API] Provisioning failed: %d — %s\n", code, response.c_str());
    return false;
}

// ─── Receipt Upload ─────────────────────────────────────────────────────────

bool ApiClient::uploadReceipt(const String& receiptJson) {
    _lastReceiptTime = millis();

    if (_state != DeviceState::ONLINE || !isWiFiConnected()) {
        // Buffer for later
        if ((int)_pendingReceipts.size() < MAX_QUEUED_RECEIPTS) {
            _pendingReceipts.push_back(receiptJson);
            Serial.printf("[API] Queued receipt (offline) — %d pending\n",
                          _pendingReceipts.size());
        } else {
            Serial.println("[API] Queue full — dropping receipt!");
        }
        return false;
    }

    // Add to batch queue
    _pendingReceipts.push_back(receiptJson);
    return true;
}

bool ApiClient::uploadBatch(const std::vector<String>& receipts) {
    if (receipts.empty()) return true;

    // Build batch JSON
    JsonDocument doc;
    JsonArray arr = doc["receipts"].to<JsonArray>();

    for (const auto& r : receipts) {
        JsonDocument item;
        deserializeJson(item, r);
        arr.add(item);
    }

    String body;
    serializeJson(doc, body);

    String response = _post("/api/device/receipts", body);
    if (response.length() > 0) {
        Serial.printf("[API] Batch uploaded: %d receipts\n", receipts.size());
        return true;
    }

    // Upload failed — re-queue
    Serial.println("[API] Batch upload failed — will retry");
    return false;
}

// ─── NFC Handover ───────────────────────────────────────────────────────────

String ApiClient::requestNfcHandover(const String& receiptId, const String& transactionId) {
    JsonDocument doc;
    if (receiptId.length() > 0) doc["receiptId"] = receiptId;
    if (transactionId.length() > 0) doc["transactionId"] = transactionId;

    String body;
    serializeJson(doc, body);

    String response = _post("/api/device/nfc-handover", body);
    if (response.length() > 0) {
        JsonDocument resp;
        deserializeJson(resp, response);
        String claimUrl = resp["claimUrl"].as<String>();
        Serial.printf("[API] NFC handover URL: %s\n", claimUrl.c_str());
        return claimUrl;
    }

    return "";
}

// ─── Heartbeat ──────────────────────────────────────────────────────────────

bool ApiClient::sendHeartbeat() {
    JsonDocument doc;
    doc["firmware"] = FW_VERSION;
    doc["uptime"] = millis() / 1000;
    doc["freeHeap"] = ESP.getFreeHeap();
    doc["wifiRssi"] = WiFi.RSSI();
    doc["pendingReceipts"] = _pendingReceipts.size();

    String body;
    serializeJson(doc, body);

    String response = _post("/api/device/heartbeat", body);
    return response.length() > 0;
}

// ─── Firmware Update Check ──────────────────────────────────────────────────

bool ApiClient::checkFirmwareUpdate() {
    String response = _get("/api/device/firmware/check?current=" + String(FW_VERSION));
    if (response.length() == 0) return false;

    JsonDocument doc;
    deserializeJson(doc, response);

    bool updateAvailable = doc["updateAvailable"] | false;
    if (updateAvailable) {
        String version = doc["version"].as<String>();
        String downloadUrl = doc["downloadUrl"].as<String>();
        Serial.printf("[API] Firmware update available: %s\n", version.c_str());
        // TODO: Implement OTA download
        return true;
    }

    return false;
}

// ─── HTTP Helpers ───────────────────────────────────────────────────────────

String ApiClient::_post(const String& path, const String& body) {
    if (!isWiFiConnected()) return "";

    HTTPClient http;
    String url = _apiUrl + path;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + _apiKey);
    http.setTimeout(API_TIMEOUT_MS);

    int code = http.POST(body);
    String response = "";

    if (code >= 200 && code < 300) {
        response = http.getString();
    } else {
        Serial.printf("[API] POST %s failed: %d\n", path.c_str(), code);
    }

    http.end();
    return response;
}

String ApiClient::_get(const String& path) {
    if (!isWiFiConnected()) return "";

    HTTPClient http;
    String url = _apiUrl + path;
    http.begin(url);
    http.addHeader("Authorization", "Bearer " + _apiKey);
    http.setTimeout(API_TIMEOUT_MS);

    int code = http.GET();
    String response = "";

    if (code >= 200 && code < 300) {
        response = http.getString();
    } else {
        Serial.printf("[API] GET %s failed: %d\n", path.c_str(), code);
    }

    http.end();
    return response;
}

// ─── Config Persistence (NVS Flash) ────────────────────────────────────────

void ApiClient::_loadConfig() {
    _prefs.begin("receipts", true);  // Read-only
    _wifiSsid = _prefs.getString("wifi_ssid", "");
    _wifiPassword = _prefs.getString("wifi_pass", "");
    _apiUrl = _prefs.getString("api_url", API_BASE_URL);
    _apiKey = _prefs.getString("api_key", "");
    _deviceId = _prefs.getString("device_id", "");
    _serial = _prefs.getString("serial", "");
    _prefs.end();

    if (_serial.length() == 0) {
        _serial = _generateSerial();
        _saveConfig();
    }
}

void ApiClient::_saveConfig() {
    _prefs.begin("receipts", false);  // Read-write
    _prefs.putString("wifi_ssid", _wifiSsid);
    _prefs.putString("wifi_pass", _wifiPassword);
    _prefs.putString("api_url", _apiUrl);
    _prefs.putString("api_key", _apiKey);
    _prefs.putString("device_id", _deviceId);
    _prefs.putString("serial", _serial);
    _prefs.end();
}

void ApiClient::setWiFiCredentials(const String& ssid, const String& password) {
    _wifiSsid = ssid;
    _wifiPassword = password;
    _saveConfig();
}

void ApiClient::setApiUrl(const String& url) {
    _apiUrl = url;
    _saveConfig();
}

// ─── Generate Unique Serial ─────────────────────────────────────────────────

String ApiClient::_generateSerial() {
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    char serial[20];
    snprintf(serial, sizeof(serial), "RP1-%02X%02X%02X%02X%02X%02X",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    return String(serial);
}
