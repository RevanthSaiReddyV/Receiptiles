#pragma once

#include <Arduino.h>
#include <Adafruit_PN532.h>
#include "config.h"

// ─── NFC Handler ────────────────────────────────────────────────────────────
// Manages PN532 NFC module for tap-to-claim receipt handover.
// When a phone taps, writes an NDEF URL record pointing to the claim endpoint.

class NfcHandler {
public:
    NfcHandler();

    bool begin();          // Initialize PN532
    void loop();           // Poll for NFC targets (non-blocking)

    // Set the URL to write on next tap (from API nfc-handover response)
    void setClaimUrl(const String& url);
    void clearClaimUrl();
    bool hasClaimUrl() const { return _claimUrl.length() > 0; }

    // Check if a tap just happened
    bool wasTapped();

    // Status
    bool isReady() const { return _initialized; }

private:
    Adafruit_PN532 _nfc;
    bool _initialized;
    String _claimUrl;
    bool _tapped;
    unsigned long _lastPoll;

    // Write NDEF URL record to target
    bool _writeNdefUrl(const String& url);

    // Build NDEF message bytes
    std::vector<uint8_t> _buildNdefUrlRecord(const String& url);
};
