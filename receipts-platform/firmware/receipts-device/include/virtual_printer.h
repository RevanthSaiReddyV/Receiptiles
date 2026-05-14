#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <vector>
#include "config.h"
#include "escpos_parser.h"

// ─── Virtual Network Printer ────────────────────────────────────────────────
// Emulates a network receipt printer on TCP port 9100 (RAW/JetDirect protocol).
// POS systems (Square, Toast, Clover, Shopify POS) discover it via mDNS/Bonjour
// and send ESC/POS print jobs directly to it.
//
// Architecture:
//   POS Terminal → discovers "Receipts Capture" printer via mDNS
//   POS Terminal → sends ESC/POS data to TCP:9100
//   This device  → captures + parses receipt data
//   This device  → optionally forwards to real printer (pass-through)

class VirtualPrinter {
public:
    VirtualPrinter();

    bool begin();          // Start TCP server + mDNS advertisement
    void loop();           // Accept connections, receive data
    void stop();           // Shutdown

    // Callback when a complete receipt is received
    typedef void (*ReceiptCallback)(const ParsedReceipt& receipt, const uint8_t* raw, size_t rawLen);
    void onReceipt(ReceiptCallback cb) { _receiptCallback = cb; }

    // Stats
    uint32_t getTotalReceived() const { return _totalReceived; }
    int getActiveClients() const;

    // Pass-through config
    void setPassthrough(const String& ip, uint16_t port);
    void disablePassthrough();

private:
    WiFiServer _server;
    WiFiClient _clients[MAX_CLIENTS];
    EscPosParser _parsers[MAX_CLIENTS];
    bool _clientActive[MAX_CLIENTS];

    ReceiptCallback _receiptCallback;
    uint32_t _totalReceived;

    // Pass-through to real printer
    bool _passthroughEnabled;
    String _passthroughIp;
    uint16_t _passthroughPort;

    // mDNS advertisement
    bool _advertiseMdns();

    // Forward raw data to real printer
    void _forwardToRealPrinter(const uint8_t* data, size_t len);
};
