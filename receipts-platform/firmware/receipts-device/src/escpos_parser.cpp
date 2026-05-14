#include "escpos_parser.h"
#include <base64.h>

// ─── Constructor & Reset ────────────────────────────────────────────────────

EscPosParser::EscPosParser() {
    reset();
}

void EscPosParser::reset() {
    _bufferLen = 0;
    _lastByteTime = 0;
    _receiving = false;
    _currentLine = "";
    _textLines.clear();
    _isBold = false;
    _isDouble = false;
    _alignment = 0;
    _receipt = ParsedReceipt{};
    _receipt.valid = false;
    _receipt.currency = "USD";
    _receipt.subtotal = 0;
    _receipt.tax = 0;
    _receipt.tip = 0;
    _receipt.discount = 0;
    _receipt.total = 0;
    _receipt.quantity = 1;
}

// ─── Feed Raw Bytes ─────────────────────────────────────────────────────────

bool EscPosParser::feed(const uint8_t* data, size_t len) {
    _receiving = true;
    _lastByteTime = millis();

    for (size_t i = 0; i < len && _bufferLen < ESCPOS_BUFFER_SIZE; i++) {
        _buffer[_bufferLen++] = data[i];
    }

    return false;  // Receipt completeness is time-based
}

// ─── Completeness Check (call in loop) ──────────────────────────────────────

bool EscPosParser::isComplete() {
    if (!_receiving || _bufferLen == 0) return false;

    // Receipt is complete when no new data for RECEIPT_TIMEOUT_MS
    // OR we see a paper cut command (GS V)
    if (millis() - _lastByteTime >= RECEIPT_TIMEOUT_MS) {
        return true;
    }

    // Check for cut command in recent bytes (GS V 0/1/65/66)
    if (_bufferLen >= 3) {
        size_t end = _bufferLen;
        for (size_t i = (end > 20 ? end - 20 : 0); i < end - 2; i++) {
            if (_buffer[i] == GS && _buffer[i + 1] == 'V') {
                return true;
            }
        }
    }

    return false;
}

// ─── Extract Printable Text Lines from ESC/POS Stream ───────────────────────

void EscPosParser::_extractTextLines() {
    _textLines.clear();
    _currentLine = "";

    size_t i = 0;
    while (i < _bufferLen) {
        uint8_t b = _buffer[i];

        if (b == ESC && i + 1 < _bufferLen) {
            // ESC command — skip based on command type
            uint8_t cmd = _buffer[i + 1];
            switch (cmd) {
                case '@':  // ESC @ — Initialize printer
                    i += 2; break;
                case 'E':  // ESC E n — Bold
                    _isBold = (i + 2 < _bufferLen) ? _buffer[i + 2] : 0;
                    i += 3; break;
                case 'a':  // ESC a n — Alignment
                    _alignment = (i + 2 < _bufferLen) ? _buffer[i + 2] : 0;
                    i += 3; break;
                case '!':  // ESC ! n — Print mode (font, bold, double)
                    if (i + 2 < _bufferLen) {
                        uint8_t mode = _buffer[i + 2];
                        _isBold = (mode & 0x08) != 0;
                        _isDouble = (mode & 0x10) != 0;
                    }
                    i += 3; break;
                case 'd':  // ESC d n — Print and feed n lines
                    i += 3; break;
                case 'J':  // ESC J n — Print and feed n dots
                    i += 3; break;
                case 'M':  // ESC M n — Select character font
                    i += 3; break;
                case 'R':  // ESC R n — Select international charset
                    i += 3; break;
                case 't':  // ESC t n — Select character code table
                    i += 3; break;
                case 'p':  // ESC p — Pulse (cash drawer)
                    i += 5; break;
                default:
                    i += 2; break;
            }
        } else if (b == GS && i + 1 < _bufferLen) {
            // GS command
            uint8_t cmd = _buffer[i + 1];
            switch (cmd) {
                case 'V':  // GS V — Cut paper
                    i += 3; break;
                case '!':  // GS ! — Character size
                    i += 3; break;
                case 'H':  // GS H — HRI position for barcode
                    i += 3; break;
                case 'h':  // GS h — Barcode height
                    i += 3; break;
                case 'w':  // GS w — Barcode width
                    i += 3; break;
                case 'k': { // GS k — Print barcode (variable length)
                    if (i + 3 < _bufferLen) {
                        uint8_t type = _buffer[i + 2];
                        if (type >= 65) {
                            // Format 2: GS k m n data
                            uint8_t n = (i + 3 < _bufferLen) ? _buffer[i + 3] : 0;
                            i += 4 + n;
                        } else {
                            // Format 1: GS k m data NUL
                            i += 3;
                            while (i < _bufferLen && _buffer[i] != 0) i++;
                            i++; // skip NUL
                        }
                    } else {
                        i += 3;
                    }
                    break;
                }
                case '(': { // GS ( — Multi-byte commands (QR code etc)
                    if (i + 4 < _bufferLen) {
                        uint16_t pLen = _buffer[i + 3] | (_buffer[i + 4] << 8);
                        i += 5 + pLen;
                    } else {
                        i += 3;
                    }
                    break;
                }
                default:
                    i += 3; break;
            }
        } else if (b == FS && i + 1 < _bufferLen) {
            // FS command (Kanji/CJK)
            i += 3;
        } else if (b == DLE && i + 1 < _bufferLen) {
            // DLE command (real-time)
            i += 4;
        } else if (b == LF || b == CR) {
            // End of line — save if non-empty
            _currentLine.trim();
            if (_currentLine.length() > 0) {
                _textLines.push_back(_currentLine);
            }
            _currentLine = "";
            i++;
        } else if (b == HT) {
            // Tab — replace with spaces for alignment
            _currentLine += "    ";
            i++;
        } else if (b >= 0x20 && b <= 0x7E) {
            // Printable ASCII
            _currentLine += (char)b;
            i++;
        } else if (b >= 0x80) {
            // Extended ASCII (accented chars etc)
            _currentLine += (char)b;
            i++;
        } else {
            // Skip non-printable control chars
            i++;
        }
    }

    // Don't forget last line
    _currentLine.trim();
    if (_currentLine.length() > 0) {
        _textLines.push_back(_currentLine);
    }
}

// ─── Parse Receipt Structure from Text Lines ────────────────────────────────

void EscPosParser::_parseStructure() {
    _receipt.merchantName = _findMerchantName();
    _receipt.merchantLocation = _findLocation();
    _receipt.items = _findItems();
    _receipt.subtotal = _findSubtotal();
    _receipt.tax = _findTax();
    _receipt.tip = _findTip();
    _receipt.discount = _findDiscount();
    _receipt.total = _findTotal();
    _receipt.paymentMethod = _findPaymentMethod();
    _receipt.cardLast4 = _findCardLast4();
    _receipt.transactionId = _findTransactionId();
    _receipt.timestamp = _getTimestamp();

    // Receipt is valid if we at least got a merchant name and total
    _receipt.valid = (_receipt.merchantName.length() > 0 && _receipt.total > 0);
}

// ─── Merchant Name: Usually first bold/centered/double-height line ──────────

String EscPosParser::_findMerchantName() {
    // Strategy: First non-trivial line is usually merchant name
    // (POS systems print merchant name first, often bold/centered)
    for (size_t i = 0; i < _textLines.size() && i < 5; i++) {
        String line = _textLines[i];
        line.trim();
        if (line.length() >= 3 && !_isSeparatorLine(line)) {
            // Skip common non-merchant lines
            if (line.indexOf("RECEIPT") >= 0 || line.indexOf("COPY") >= 0) continue;
            if (line.indexOf("ORDER") == 0) continue;
            return line;
        }
    }
    return "Unknown Merchant";
}

// ─── Location: Address-like line near the top ───────────────────────────────

String EscPosParser::_findLocation() {
    for (size_t i = 1; i < _textLines.size() && i < 8; i++) {
        String line = _textLines[i];
        // Address heuristic: contains digits + common address words
        if ((line.indexOf("St") >= 0 || line.indexOf("Ave") >= 0 ||
             line.indexOf("Blvd") >= 0 || line.indexOf("Dr") >= 0 ||
             line.indexOf("Rd") >= 0 || line.indexOf(",") >= 0) &&
            _hasDigit(line)) {
            return line;
        }
        // City, State ZIP pattern
        if (line.length() > 5 && line.indexOf(",") >= 0 &&
            _hasDigit(line) && i < 6) {
            return line;
        }
    }
    return "";
}

// ─── Total: Look for "TOTAL" line with a price ──────────────────────────────

float EscPosParser::_findTotal() {
    // Scan backwards — TOTAL is usually near the bottom
    for (int i = _textLines.size() - 1; i >= 0; i--) {
        String upper = _textLines[i];
        upper.toUpperCase();
        if ((upper.indexOf("TOTAL") >= 0 || upper.indexOf("AMOUNT DUE") >= 0 ||
             upper.indexOf("BALANCE DUE") >= 0) &&
            upper.indexOf("SUB") < 0 && upper.indexOf("SUBTOTAL") < 0) {
            float price = _parsePrice(_textLines[i]);
            if (price > 0) return price;
        }
    }
    return 0;
}

float EscPosParser::_findSubtotal() {
    for (int i = _textLines.size() - 1; i >= 0; i--) {
        String upper = _textLines[i];
        upper.toUpperCase();
        if (upper.indexOf("SUBTOTAL") >= 0 || upper.indexOf("SUB TOTAL") >= 0 ||
            upper.indexOf("SUB-TOTAL") >= 0) {
            float price = _parsePrice(_textLines[i]);
            if (price > 0) return price;
        }
    }
    return 0;
}

float EscPosParser::_findTax() {
    for (int i = _textLines.size() - 1; i >= 0; i--) {
        String upper = _textLines[i];
        upper.toUpperCase();
        if (upper.indexOf("TAX") >= 0 && upper.indexOf("TOTAL") < 0) {
            float price = _parsePrice(_textLines[i]);
            if (price > 0) return price;
        }
    }
    return 0;
}

float EscPosParser::_findTip() {
    for (int i = _textLines.size() - 1; i >= 0; i--) {
        String upper = _textLines[i];
        upper.toUpperCase();
        if (upper.indexOf("TIP") >= 0 || upper.indexOf("GRATUITY") >= 0) {
            float price = _parsePrice(_textLines[i]);
            if (price > 0) return price;
        }
    }
    return 0;
}

float EscPosParser::_findDiscount() {
    for (int i = _textLines.size() - 1; i >= 0; i--) {
        String upper = _textLines[i];
        upper.toUpperCase();
        if (upper.indexOf("DISCOUNT") >= 0 || upper.indexOf("PROMO") >= 0 ||
            upper.indexOf("COUPON") >= 0) {
            float price = _parsePrice(_textLines[i]);
            if (price > 0) return price;
        }
    }
    return 0;
}

// ─── Payment Method ─────────────────────────────────────────────────────────

String EscPosParser::_findPaymentMethod() {
    for (size_t i = 0; i < _textLines.size(); i++) {
        String upper = _textLines[i];
        upper.toUpperCase();
        if (upper.indexOf("VISA") >= 0) return "visa";
        if (upper.indexOf("MASTERCARD") >= 0 || upper.indexOf("MC") >= 0) return "mastercard";
        if (upper.indexOf("AMEX") >= 0 || upper.indexOf("AMERICAN EXPRESS") >= 0) return "amex";
        if (upper.indexOf("DISCOVER") >= 0) return "discover";
        if (upper.indexOf("DEBIT") >= 0) return "debit";
        if (upper.indexOf("CASH") >= 0) return "cash";
        if (upper.indexOf("APPLE PAY") >= 0) return "apple_pay";
        if (upper.indexOf("GOOGLE PAY") >= 0) return "google_pay";
    }
    return "card";
}

// ─── Card Last 4 ────────────────────────────────────────────────────────────

String EscPosParser::_findCardLast4() {
    for (size_t i = 0; i < _textLines.size(); i++) {
        String line = _textLines[i];
        // Look for patterns like **** 1234, XXXX1234, ****1234
        int starIdx = line.indexOf("****");
        if (starIdx < 0) starIdx = line.indexOf("XXXX");
        if (starIdx < 0) starIdx = line.indexOf("xxxx");

        if (starIdx >= 0) {
            // Get 4 digits after the stars
            int numStart = starIdx + 4;
            while (numStart < (int)line.length() && !isdigit(line[numStart])) numStart++;
            if (numStart + 4 <= (int)line.length()) {
                String last4 = line.substring(numStart, numStart + 4);
                bool allDigits = true;
                for (int j = 0; j < 4; j++) {
                    if (!isdigit(last4[j])) { allDigits = false; break; }
                }
                if (allDigits) return last4;
            }
        }
    }
    return "";
}

// ─── Transaction ID ─────────────────────────────────────────────────────────

String EscPosParser::_findTransactionId() {
    for (size_t i = 0; i < _textLines.size(); i++) {
        String upper = _textLines[i];
        upper.toUpperCase();
        if (upper.indexOf("TRANS") >= 0 || upper.indexOf("REF") >= 0 ||
            upper.indexOf("AUTH") >= 0 || upper.indexOf("ORDER #") >= 0 ||
            upper.indexOf("ORDER#") >= 0 || upper.indexOf("TXN") >= 0) {
            // Extract the ID value (usually after a colon or space)
            String line = _textLines[i];
            int colonIdx = line.indexOf(':');
            if (colonIdx >= 0) {
                String val = line.substring(colonIdx + 1);
                val.trim();
                if (val.length() > 0) return val;
            }
            // Try after #
            int hashIdx = line.indexOf('#');
            if (hashIdx >= 0) {
                String val = line.substring(hashIdx + 1);
                val.trim();
                if (val.length() > 0) return val;
            }
        }
    }
    return "";
}

// ─── Line Items ─────────────────────────────────────────────────────────────

std::vector<ReceiptItem> EscPosParser::_findItems() {
    std::vector<ReceiptItem> items;

    // Find the "items section" — between header and subtotal/total
    int startIdx = -1;
    int endIdx = _textLines.size();

    // Items usually start after a separator or after address block
    for (size_t i = 2; i < _textLines.size(); i++) {
        if (_isSeparatorLine(_textLines[i])) {
            startIdx = i + 1;
            break;
        }
    }
    if (startIdx < 0) startIdx = 4;  // Default: skip first few header lines

    // Items end before subtotal/total
    for (size_t i = startIdx; i < _textLines.size(); i++) {
        String upper = _textLines[i];
        upper.toUpperCase();
        if (upper.indexOf("SUBTOTAL") >= 0 || upper.indexOf("SUB TOTAL") >= 0 ||
            (upper.indexOf("TOTAL") >= 0 && upper.indexOf("ITEM") < 0)) {
            endIdx = i;
            break;
        }
    }

    // Parse item lines
    for (int i = startIdx; i < endIdx && (int)items.size() < MAX_RECEIPT_ITEMS; i++) {
        if (_isSeparatorLine(_textLines[i])) continue;
        if (_isItemLine(_textLines[i])) {
            ReceiptItem item;
            String line = _textLines[i];

            float price = _parsePrice(line);
            if (price <= 0) continue;

            // Extract quantity if present (e.g., "2x Latte" or "2 Latte")
            item.quantity = 1;
            int xIdx = line.indexOf('x');
            if (xIdx > 0 && xIdx < 4 && isdigit(line[0])) {
                item.quantity = line.substring(0, xIdx).toInt();
                line = line.substring(xIdx + 1);
                line.trim();
            } else if (isdigit(line[0]) && line[1] == ' ') {
                item.quantity = line.substring(0, 1).toInt();
                line = line.substring(2);
                line.trim();
            }

            // Name is everything before the price
            // Find where numbers start from the right
            int priceStart = line.length() - 1;
            while (priceStart > 0 && (isdigit(line[priceStart]) || line[priceStart] == '.' ||
                   line[priceStart] == '$' || line[priceStart] == ' ' || line[priceStart] == '-')) {
                priceStart--;
            }
            item.name = line.substring(0, priceStart + 1);
            item.name.trim();

            if (item.name.length() == 0) continue;

            item.totalPrice = price;
            item.unitPrice = price / item.quantity;
            items.push_back(item);
        }
    }

    return items;
}

// ─── Utility Helpers ────────────────────────────────────────────────────────

float EscPosParser::_parsePrice(const String& text) {
    // Find price pattern: $XX.XX or XX.XX at end of line
    float price = 0;
    int len = text.length();

    // Scan from right for a number
    int end = len - 1;
    while (end >= 0 && text[end] == ' ') end--;

    if (end < 0) return 0;

    // Find the rightmost decimal number
    int numEnd = end;
    int numStart = numEnd;
    bool foundDot = false;

    while (numStart >= 0) {
        char c = text[numStart];
        if (isdigit(c)) {
            numStart--;
        } else if (c == '.' && !foundDot) {
            foundDot = true;
            numStart--;
        } else if (c == '$' || c == '-') {
            numStart--;
            break;
        } else {
            break;
        }
    }
    numStart++;

    if (numStart <= numEnd) {
        String numStr = text.substring(numStart, numEnd + 1);
        numStr.replace("$", "");
        price = numStr.toFloat();
    }

    return price;
}

bool EscPosParser::_isItemLine(const String& line) {
    if (line.length() < 3) return false;
    if (_isSeparatorLine(line)) return false;

    // An item line typically has text AND a price (number with decimal)
    bool hasText = false;
    bool hasNumber = false;

    for (size_t i = 0; i < line.length(); i++) {
        if (isalpha(line[i])) hasText = true;
        if (isdigit(line[i]) && line.indexOf('.') > 0) hasNumber = true;
    }

    // Skip known non-item lines
    String upper = line;
    upper.toUpperCase();
    if (upper.indexOf("DATE") >= 0 || upper.indexOf("TIME") >= 0 ||
        upper.indexOf("CASHIER") >= 0 || upper.indexOf("SERVER") >= 0 ||
        upper.indexOf("TABLE") >= 0 || upper.indexOf("CHECK") >= 0 ||
        upper.indexOf("THANK") >= 0 || upper.indexOf("RECEIPT") >= 0) {
        return false;
    }

    return hasText && hasNumber;
}

bool EscPosParser::_isSeparatorLine(const String& line) {
    if (line.length() < 3) return false;
    int dashCount = 0;
    int eqCount = 0;
    int starCount = 0;
    for (size_t i = 0; i < line.length(); i++) {
        if (line[i] == '-') dashCount++;
        if (line[i] == '=') eqCount++;
        if (line[i] == '*') starCount++;
    }
    return (dashCount > line.length() / 2) ||
           (eqCount > line.length() / 2) ||
           (starCount > line.length() / 2);
}

bool EscPosParser::_hasDigit(const String& line) {
    for (size_t i = 0; i < line.length(); i++) {
        if (isdigit(line[i])) return true;
    }
    return false;
}

String EscPosParser::_getTimestamp() {
    // Try to find date/time in receipt, otherwise use current time
    for (size_t i = 0; i < _textLines.size(); i++) {
        String upper = _textLines[i];
        upper.toUpperCase();
        if (upper.indexOf("DATE") >= 0 || upper.indexOf("/") >= 0) {
            // Check for date pattern MM/DD/YYYY or similar
            String line = _textLines[i];
            int slashCount = 0;
            for (size_t j = 0; j < line.length(); j++) {
                if (line[j] == '/') slashCount++;
            }
            if (slashCount >= 2) {
                // Found a date line, return raw (API will parse)
                int colonIdx = line.indexOf(':');
                if (colonIdx > 0 && colonIdx < 6) {
                    // "Date: MM/DD/YYYY" format
                    return line.substring(colonIdx + 1);
                }
                return line;
            }
        }
    }
    return "";  // API will use server time
}

// ─── Get Parsed Receipt ─────────────────────────────────────────────────────

ParsedReceipt EscPosParser::getReceipt() {
    _extractTextLines();
    _parseStructure();

    // Encode raw data as base64
    _receipt.rawBase64 = base64::encode(_buffer, _bufferLen);

    return _receipt;
}

// ─── Serialize to JSON ──────────────────────────────────────────────────────

String EscPosParser::toJson() {
    ParsedReceipt r = getReceipt();

    JsonDocument doc;
    doc["merchantName"] = r.merchantName;
    if (r.merchantLocation.length() > 0)
        doc["merchantLocation"] = r.merchantLocation;

    JsonArray items = doc["items"].to<JsonArray>();
    for (const auto& item : r.items) {
        JsonObject obj = items.add<JsonObject>();
        obj["name"] = item.name;
        obj["quantity"] = item.quantity;
        obj["unitPrice"] = item.unitPrice;
        obj["totalPrice"] = item.totalPrice;
    }

    doc["subtotal"] = r.subtotal;
    doc["tax"] = r.tax;
    if (r.tip > 0) doc["tip"] = r.tip;
    if (r.discount > 0) doc["discount"] = r.discount;
    doc["total"] = r.total;
    doc["currency"] = r.currency;
    doc["paymentMethod"] = r.paymentMethod;
    if (r.cardLast4.length() > 0) doc["cardLast4"] = r.cardLast4;
    if (r.transactionId.length() > 0) doc["transactionId"] = r.transactionId;
    if (r.timestamp.length() > 0) doc["timestamp"] = r.timestamp;
    if (r.rawBase64.length() > 0) doc["rawEscPos"] = r.rawBase64;

    String output;
    serializeJson(doc, output);
    return output;
}
