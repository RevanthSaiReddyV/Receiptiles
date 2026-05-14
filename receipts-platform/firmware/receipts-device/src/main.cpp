#include <Arduino.h>
#include "config.h"
#include "virtual_printer.h"
#include "api_client.h"
#include "nfc_handler.h"

// ─── Global Instances ───────────────────────────────────────────────────────

VirtualPrinter printer;
ApiClient api;
NfcHandler nfc;

// ─── State ──────────────────────────────────────────────────────────────────

enum class AppMode {
    PROVISIONING,   // First boot — waiting for WiFi + API config via Serial
    RUNNING,        // Normal operation
    ERROR           // Unrecoverable error
};

AppMode appMode = AppMode::PROVISIONING;
String lastReceiptId = "";
unsigned long lastStatusLog = 0;

// ─── Receipt Callback ───────────────────────────────────────────────────────
// Called by VirtualPrinter when a complete receipt is parsed

void onReceiptCaptured(const ParsedReceipt& receipt, const uint8_t* raw, size_t rawLen) {
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.printf("  RECEIPT CAPTURED: %s\n", receipt.merchantName.c_str());
    Serial.printf("  Items: %d | Total: $%.2f | Payment: %s\n",
                  receipt.items.size(), receipt.total, receipt.paymentMethod.c_str());
    if (receipt.cardLast4.length() > 0) {
        Serial.printf("  Card: ****%s\n", receipt.cardLast4.c_str());
    }
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Serialize and upload to API
    // We need a temporary parser instance to get JSON
    // (the callback gives us the parsed struct directly)
    JsonDocument doc;
    doc["merchantName"] = receipt.merchantName;
    if (receipt.merchantLocation.length() > 0)
        doc["merchantLocation"] = receipt.merchantLocation;

    JsonArray items = doc["items"].to<JsonArray>();
    for (const auto& item : receipt.items) {
        JsonObject obj = items.add<JsonObject>();
        obj["name"] = item.name;
        obj["quantity"] = item.quantity;
        obj["unitPrice"] = item.unitPrice;
        obj["totalPrice"] = item.totalPrice;
    }

    doc["subtotal"] = receipt.subtotal;
    doc["tax"] = receipt.tax;
    if (receipt.tip > 0) doc["tip"] = receipt.tip;
    if (receipt.discount > 0) doc["discount"] = receipt.discount;
    doc["total"] = receipt.total;
    doc["currency"] = receipt.currency;
    doc["paymentMethod"] = receipt.paymentMethod;
    if (receipt.cardLast4.length() > 0) doc["cardLast4"] = receipt.cardLast4;
    if (receipt.transactionId.length() > 0) doc["transactionId"] = receipt.transactionId;
    if (receipt.timestamp.length() > 0) doc["timestamp"] = receipt.timestamp;

    // Base64 encode raw ESC/POS for the API
    // (omit for now to save bandwidth — can be enabled in config)

    String json;
    serializeJson(doc, json);

    // Upload (will batch/queue automatically)
    api.uploadReceipt(json);

    // Prepare NFC handover for tap-to-claim
    if (nfc.isReady()) {
        String claimUrl = api.requestNfcHandover("", receipt.transactionId);
        if (claimUrl.length() > 0) {
            nfc.setClaimUrl(claimUrl);
        }
    }

    // Blink activity LED
    digitalWrite(LED_ACTIVITY_PIN, HIGH);
    delay(100);
    digitalWrite(LED_ACTIVITY_PIN, LOW);
}

// ─── Serial Command Handler (for provisioning) ─────────────────────────────
// Send commands via Serial Monitor to configure the device:
//   WIFI:<ssid>:<password>
//   API:<url>
//   PROVISION:<key>
//   PASSTHROUGH:<printer_ip>
//   STATUS
//   RESET

void handleSerialCommand(const String& cmd) {
    if (cmd.startsWith("WIFI:")) {
        int sep = cmd.indexOf(':', 5);
        if (sep > 5) {
            String ssid = cmd.substring(5, sep);
            String pass = cmd.substring(sep + 1);
            api.setWiFiCredentials(ssid, pass);
            Serial.printf("[CMD] WiFi set: %s\n", ssid.c_str());
            api.connectWiFi();
        }
    }
    else if (cmd.startsWith("API:")) {
        String url = cmd.substring(4);
        url.trim();
        api.setApiUrl(url);
        Serial.printf("[CMD] API URL set: %s\n", url.c_str());
    }
    else if (cmd.startsWith("PROVISION:")) {
        String key = cmd.substring(10);
        key.trim();
        if (api.isWiFiConnected()) {
            api.provision(key);
        } else {
            Serial.println("[CMD] Connect to WiFi first (WIFI:<ssid>:<pass>)");
        }
    }
    else if (cmd.startsWith("PASSTHROUGH:")) {
        String ip = cmd.substring(12);
        ip.trim();
        if (ip == "off" || ip == "disable") {
            printer.disablePassthrough();
            Serial.println("[CMD] Pass-through disabled");
        } else {
            printer.setPassthrough(ip, 9100);
        }
    }
    else if (cmd == "STATUS") {
        Serial.println("\n╔══════════════════════════════════════════╗");
        Serial.println("║     RECEIPTS DEVICE STATUS               ║");
        Serial.println("╠══════════════════════════════════════════╣");
        Serial.printf("║ Serial:     %s\n", api.getSerial().c_str());
        Serial.printf("║ Device ID:  %s\n", api.getDeviceId().c_str());
        Serial.printf("║ Firmware:   %s\n", FW_VERSION);
        Serial.printf("║ WiFi:       %s\n", api.isWiFiConnected() ? "Connected" : "Disconnected");
        Serial.printf("║ IP:         %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("║ State:      %s\n",
            api.getState() == DeviceState::ONLINE ? "ONLINE" :
            api.getState() == DeviceState::OFFLINE ? "OFFLINE" :
            api.getState() == DeviceState::CONNECTING ? "CONNECTING" : "UNPROVISIONED");
        Serial.printf("║ Receipts:   %d captured\n", printer.getTotalReceived());
        Serial.printf("║ Pending:    %d in queue\n", api.getPendingCount());
        Serial.printf("║ Clients:    %d connected\n", printer.getActiveClients());
        Serial.printf("║ NFC:        %s\n", nfc.isReady() ? "Ready" : "Not found");
        Serial.printf("║ Free Heap:  %d bytes\n", ESP.getFreeHeap());
        Serial.println("╚══════════════════════════════════════════╝\n");
    }
    else if (cmd == "RESET") {
        Serial.println("[CMD] Restarting...");
        delay(500);
        ESP.restart();
    }
    else {
        Serial.println("[CMD] Unknown command. Available:");
        Serial.println("  WIFI:<ssid>:<password>");
        Serial.println("  API:<url>");
        Serial.println("  PROVISION:<key>");
        Serial.println("  PASSTHROUGH:<ip> | PASSTHROUGH:off");
        Serial.println("  STATUS");
        Serial.println("  RESET");
    }
}

// ─── Setup ──────────────────────────────────────────────────────────────────

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("╔══════════════════════════════════════════╗");
    Serial.println("║   UNIVERSAL RECEIPTS - POS CAPTURE v" FW_VERSION "  ║");
    Serial.println("║   Virtual Network Printer Mode          ║");
    Serial.println("╚══════════════════════════════════════════╝");
    Serial.println();

    // Init status LED
    pinMode(LED_ACTIVITY_PIN, OUTPUT);
    digitalWrite(LED_ACTIVITY_PIN, LOW);

    // Initialize API client (loads config from flash)
    if (api.begin()) {
        appMode = AppMode::RUNNING;
    } else {
        appMode = AppMode::PROVISIONING;
        Serial.println();
        Serial.println("┌─────────────────────────────────────────┐");
        Serial.println("│ FIRST BOOT — Device needs provisioning  │");
        Serial.println("│                                         │");
        Serial.println("│ 1. WIFI:<ssid>:<password>               │");
        Serial.println("│ 2. API:<your-server-url>  (optional)    │");
        Serial.println("│ 3. PROVISION:<provisioning-key>         │");
        Serial.println("└─────────────────────────────────────────┘");
        Serial.println();
        return;
    }

    // Initialize NFC module
    if (!nfc.begin()) {
        Serial.println("[MAIN] NFC disabled — continuing without tap-to-claim");
    }

    // Start virtual printer
    printer.onReceipt(onReceiptCaptured);
    printer.begin();

    Serial.println();
    Serial.println("[MAIN] ✓ Device ready — POS systems can now discover and print to this device");
    Serial.printf("[MAIN] ✓ Printer name: '%s' at %s:%d\n",
                  PRINTER_NAME, WiFi.localIP().toString().c_str(), PRINTER_TCP_PORT);
    Serial.println();
}

// ─── Main Loop ──────────────────────────────────────────────────────────────

void loop() {
    // Handle serial commands (provisioning + debug)
    if (Serial.available()) {
        String cmd = Serial.readStringUntil('\n');
        cmd.trim();
        if (cmd.length() > 0) {
            handleSerialCommand(cmd);
        }
    }

    // If not yet provisioned, just handle serial commands
    if (appMode == AppMode::PROVISIONING) {
        // Check if we got provisioned via serial commands
        if (api.isProvisioned() && api.isWiFiConnected()) {
            appMode = AppMode::RUNNING;
            nfc.begin();
            printer.onReceipt(onReceiptCaptured);
            printer.begin();
            Serial.println("[MAIN] ✓ Provisioning complete — entering run mode");
        }
        delay(100);
        return;
    }

    // Normal operation
    api.loop();       // Heartbeat, reconnection, batch uploads
    printer.loop();   // Accept POS connections, receive/parse ESC/POS
    nfc.loop();       // Poll for NFC taps

    // Periodic status log (every 60s)
    if (millis() - lastStatusLog > 60000) {
        lastStatusLog = millis();
        Serial.printf("[MAIN] Status: %d receipts | %d pending | %d clients | heap: %d\n",
                      printer.getTotalReceived(),
                      api.getPendingCount(),
                      printer.getActiveClients(),
                      ESP.getFreeHeap());
    }
}
