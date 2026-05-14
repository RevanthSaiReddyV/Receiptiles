#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <vector>
#include "config.h"

// ─── ESC/POS Command Constants ──────────────────────────────────────────────

#define ESC  0x1B
#define GS   0x1D
#define FS   0x1C
#define DLE  0x10
#define LF   0x0A
#define CR   0x0D
#define HT   0x09
#define CUT  0x1D  // GS V = cut paper

// Text emphasis modes
#define BOLD_ON      0x45  // ESC E 1
#define BOLD_OFF     0x45  // ESC E 0
#define DOUBLE_H     0x21  // ESC ! with bit flags
#define ALIGN_CENTER 0x61  // ESC a 1
#define ALIGN_LEFT   0x61  // ESC a 0
#define ALIGN_RIGHT  0x61  // ESC a 2

// ─── Parsed Receipt Structure ───────────────────────────────────────────────

struct ReceiptItem {
    String name;
    int quantity;
    float unitPrice;
    float totalPrice;
};

struct ParsedReceipt {
    String merchantName;
    String merchantLocation;
    std::vector<ReceiptItem> items;
    float subtotal;
    float tax;
    float tip;
    float discount;
    float total;
    String currency;
    String paymentMethod;
    String cardLast4;
    String transactionId;
    String timestamp;      // ISO 8601
    String rawBase64;      // Original ESC/POS data (base64)
    bool valid;
};

// ─── Parser Class ───────────────────────────────────────────────────────────

class EscPosParser {
public:
    EscPosParser();

    // Feed raw bytes from POS — returns true when a complete receipt is ready
    bool feed(const uint8_t* data, size_t len);

    // Check if receipt is complete (timeout-based)
    bool isComplete();

    // Get the parsed receipt (call after isComplete() returns true)
    ParsedReceipt getReceipt();

    // Serialize to JSON for API upload
    String toJson();

    // Reset parser state for next receipt
    void reset();

    // Get raw buffer (for pass-through to real printer)
    const uint8_t* getRawBuffer() const { return _buffer; }
    size_t getRawLength() const { return _bufferLen; }

private:
    // Raw byte buffer
    uint8_t _buffer[ESCPOS_BUFFER_SIZE];
    size_t _bufferLen;
    unsigned long _lastByteTime;
    bool _receiving;

    // Text extraction state
    String _currentLine;
    std::vector<String> _textLines;
    bool _isBold;
    bool _isDouble;
    uint8_t _alignment;  // 0=left, 1=center, 2=right

    // Parsing helpers
    void _extractTextLines();
    void _parseStructure();
    String _findMerchantName();
    String _findLocation();
    float _findTotal();
    float _findSubtotal();
    float _findTax();
    float _findTip();
    float _findDiscount();
    String _findPaymentMethod();
    String _findCardLast4();
    String _findTransactionId();
    std::vector<ReceiptItem> _findItems();
    float _parsePrice(const String& text);
    bool _isItemLine(const String& line);
    bool _isSeparatorLine(const String& line);

    ParsedReceipt _receipt;
};
