#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "config.h"
#include "escpos_parser.h"

// ─── Device State ───────────────────────────────────────────────────────────

enum class DeviceState {
    UNPROVISIONED,    // No API key — needs provisioning
    CONNECTING,       // Connecting to WiFi
    ONLINE,           // WiFi + API connected
    OFFLINE,          // WiFi lost — buffering receipts
    ERROR             // Unrecoverable error
};

// ─── API Client ─────────────────────────────────────────────────────────────

class ApiClient {
public:
    ApiClient();

    // Lifecycle
    bool begin();              // Load config from NVS, connect WiFi
    void loop();               // Heartbeat, reconnection, batch upload
    DeviceState getState() const { return _state; }

    // WiFi
    bool connectWiFi();
    bool isWiFiConnected();

    // Registration / Provisioning
    bool provision(const String& provisionKey);
    bool isProvisioned() const { return _apiKey.length() > 0; }

    // Receipt upload
    bool uploadReceipt(const String& receiptJson);
    bool uploadBatch(const std::vector<String>& receipts);
    int getPendingCount() const { return _pendingReceipts.size(); }

    // NFC handover
    String requestNfcHandover(const String& receiptId = "", const String& transactionId = "");

    // Heartbeat
    bool sendHeartbeat();

    // OTA check
    bool checkFirmwareUpdate();

    // Config
    void setWiFiCredentials(const String& ssid, const String& password);
    void setApiUrl(const String& url);
    String getDeviceId() const { return _deviceId; }
    String getSerial() const { return _serial; }

private:
    DeviceState _state;
    Preferences _prefs;

    // Credentials (persisted in NVS flash)
    String _wifiSsid;
    String _wifiPassword;
    String _apiUrl;
    String _apiKey;
    String _deviceId;
    String _serial;

    // Timing
    unsigned long _lastHeartbeat;
    unsigned long _lastUploadAttempt;
    unsigned long _lastReceiptTime;

    // Offline queue
    std::vector<String> _pendingReceipts;

    // Helpers
    String _post(const String& path, const String& body);
    String _get(const String& path);
    void _loadConfig();
    void _saveConfig();
    String _generateSerial();
};
