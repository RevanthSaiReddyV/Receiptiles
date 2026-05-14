#include "nfc_handler.h"

// ─── NDEF URL Prefix Codes (NFC Forum) ──────────────────────────────────────
// These compress common URL prefixes into a single byte
static const char* NDEF_URL_PREFIXES[] = {
    "",                    // 0x00
    "http://www.",         // 0x01
    "https://www.",        // 0x02
    "http://",            // 0x03
    "https://",           // 0x04
};

// ─── Constructor ────────────────────────────────────────────────────────────

NfcHandler::NfcHandler()
    : _nfc(NFC_SS_PIN),  // SPI with SS pin
      _initialized(false),
      _tapped(false),
      _lastPoll(0) {}

// ─── Initialize ─────────────────────────────────────────────────────────────

bool NfcHandler::begin() {
    _nfc.begin();

    uint32_t versiondata = _nfc.getFirmwareVersion();
    if (!versiondata) {
        Serial.println("[NFC] PN532 not found — check wiring");
        _initialized = false;
        return false;
    }

    Serial.printf("[NFC] PN532 found — firmware v%d.%d\n",
                  (versiondata >> 24) & 0xFF, (versiondata >> 16) & 0xFF);

    // Configure for NFC peer-to-peer and tag writing
    _nfc.SAMConfig();
    _nfc.setPassiveActivationRetries(1);  // Don't block long on poll

    _initialized = true;
    return true;
}

// ─── Main Loop (non-blocking poll) ──────────────────────────────────────────

void NfcHandler::loop() {
    if (!_initialized) return;

    // Poll every 200ms (non-blocking duty cycle)
    if (millis() - _lastPoll < 200) return;
    _lastPoll = millis();

    // Only poll if we have a URL ready to write
    if (!hasClaimUrl()) return;

    // Check for an NFC target (phone)
    uint8_t uid[7];
    uint8_t uidLength;

    // inListPassiveTarget with short timeout — returns quickly if no target
    bool success = _nfc.readPassiveTargetID(
        PN532_MIFARE_ISO14443A, uid, &uidLength, 100  // 100ms timeout
    );

    if (success) {
        Serial.printf("[NFC] Target detected — UID: ");
        for (uint8_t i = 0; i < uidLength; i++) {
            Serial.printf("%02X ", uid[i]);
        }
        Serial.println();

        // Write the NDEF URL to the phone
        if (_writeNdefUrl(_claimUrl)) {
            Serial.printf("[NFC] Wrote claim URL: %s\n", _claimUrl.c_str());
            _tapped = true;
            clearClaimUrl();  // One-time use
        } else {
            Serial.println("[NFC] Failed to write NDEF — phone may need to be held closer");
        }
    }
}

// ─── Write NDEF URL Record ──────────────────────────────────────────────────

bool NfcHandler::_writeNdefUrl(const String& url) {
    std::vector<uint8_t> ndef = _buildNdefUrlRecord(url);

    if (ndef.empty()) {
        Serial.println("[NFC] Failed to build NDEF record");
        return false;
    }

    // For Type 2 tags (and phone emulated tags), write NDEF to pages
    // Page 4 onwards = user data area
    // TLV format: 0x03 (NDEF TLV) + length + NDEF message + 0xFE (terminator)

    std::vector<uint8_t> tlv;
    tlv.push_back(0x03);  // NDEF Message TLV

    if (ndef.size() < 255) {
        tlv.push_back(ndef.size());
    } else {
        tlv.push_back(0xFF);
        tlv.push_back((ndef.size() >> 8) & 0xFF);
        tlv.push_back(ndef.size() & 0xFF);
    }

    // Append NDEF message
    tlv.insert(tlv.end(), ndef.begin(), ndef.end());
    tlv.push_back(0xFE);  // Terminator TLV

    // Write 4 bytes at a time (page write for NTAG/Type2)
    uint8_t page = 4;  // Start at page 4
    for (size_t i = 0; i < tlv.size(); i += 4) {
        uint8_t data[4] = {0, 0, 0, 0};
        for (size_t j = 0; j < 4 && (i + j) < tlv.size(); j++) {
            data[j] = tlv[i + j];
        }

        if (!_nfc.ntag2xx_WritePage(page, data)) {
            return false;
        }
        page++;
    }

    return true;
}

// ─── Build NDEF URL Record ──────────────────────────────────────────────────

std::vector<uint8_t> NfcHandler::_buildNdefUrlRecord(const String& url) {
    std::vector<uint8_t> record;

    // Determine URL prefix code
    uint8_t prefixCode = 0x00;  // No prefix
    String payload = url;

    for (uint8_t i = 4; i >= 1; i--) {  // Check longest prefixes first
        String prefix = NDEF_URL_PREFIXES[i];
        if (url.startsWith(prefix)) {
            prefixCode = i;
            payload = url.substring(prefix.length());
            break;
        }
    }

    // NDEF Record Header
    // Flags: MB=1, ME=1, CF=0, SR=1, IL=0, TNF=001 (Well-Known)
    uint8_t header = 0xD1;  // 1101 0001

    // Type = "U" (URI)
    uint8_t typeLength = 1;
    uint8_t payloadLength = 1 + payload.length();  // prefix byte + URL

    record.push_back(header);
    record.push_back(typeLength);
    record.push_back(payloadLength);
    record.push_back('U');  // Type: URI

    // Payload: prefix code + URL string
    record.push_back(prefixCode);
    for (size_t i = 0; i < payload.length(); i++) {
        record.push_back(payload[i]);
    }

    return record;
}

// ─── Public Helpers ─────────────────────────────────────────────────────────

void NfcHandler::setClaimUrl(const String& url) {
    _claimUrl = url;
    _tapped = false;
    Serial.printf("[NFC] Ready for tap — URL: %s\n", url.c_str());
}

void NfcHandler::clearClaimUrl() {
    _claimUrl = "";
}

bool NfcHandler::wasTapped() {
    if (_tapped) {
        _tapped = false;
        return true;
    }
    return false;
}
