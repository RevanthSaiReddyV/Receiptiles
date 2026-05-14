#include "virtual_printer.h"

// ─── Constructor ────────────────────────────────────────────────────────────

VirtualPrinter::VirtualPrinter()
    : _server(PRINTER_TCP_PORT),
      _receiptCallback(nullptr),
      _totalReceived(0),
      _passthroughEnabled(false),
      _passthroughPort(9100) {
    for (int i = 0; i < MAX_CLIENTS; i++) {
        _clientActive[i] = false;
    }
}

// ─── Begin ──────────────────────────────────────────────────────────────────

bool VirtualPrinter::begin() {
    // Start TCP server on port 9100 (RAW/JetDirect protocol)
    _server.begin();
    _server.setNoDelay(true);
    Serial.printf("[PRINTER] TCP server listening on port %d\n", PRINTER_TCP_PORT);

    // Advertise via mDNS so POS systems can discover us
    if (!_advertiseMdns()) {
        Serial.println("[PRINTER] mDNS advertisement failed — POS must use IP directly");
    }

    return true;
}

// ─── mDNS Service Advertisement ─────────────────────────────────────────────
// POS systems discover printers via Bonjour/mDNS.
// We advertise as:
//   _pdl-datastream._tcp (RAW printing protocol)
//   _ipp._tcp (Internet Printing Protocol — some modern POS use this)

bool VirtualPrinter::_advertiseMdns() {
    if (!MDNS.begin(MDNS_HOSTNAME)) {
        return false;
    }

    // Primary: RAW/JetDirect protocol (port 9100)
    // This is what most POS thermal printer drivers look for
    MDNS.addService("pdl-datastream", "tcp", PRINTER_TCP_PORT);

    // Add TXT records for printer identification
    // These help POS systems show a friendly name
    MDNS.addServiceTxt("pdl-datastream", "tcp", "ty", PRINTER_NAME);    // Printer type/name
    MDNS.addServiceTxt("pdl-datastream", "tcp", "product", PRINTER_MODEL);
    MDNS.addServiceTxt("pdl-datastream", "tcp", "pdl", "application/vnd.epson.escpos");
    MDNS.addServiceTxt("pdl-datastream", "tcp", "note", "Digital Receipt Capture");
    MDNS.addServiceTxt("pdl-datastream", "tcp", "priority", "50");

    // Secondary: Also advertise as IPP printer (for modern POS like Square)
    MDNS.addService("ipp", "tcp", PRINTER_TCP_PORT);
    MDNS.addServiceTxt("ipp", "tcp", "ty", PRINTER_NAME);
    MDNS.addServiceTxt("ipp", "tcp", "rp", "ipp/print");
    MDNS.addServiceTxt("ipp", "tcp", "pdl", "application/vnd.epson.escpos");

    Serial.printf("[PRINTER] mDNS: %s.local — advertised as '%s'\n",
                  MDNS_HOSTNAME, PRINTER_NAME);
    return true;
}

// ─── Main Loop ──────────────────────────────────────────────────────────────

void VirtualPrinter::loop() {
    // Accept new connections
    if (_server.hasClient()) {
        // Find free slot
        int slot = -1;
        for (int i = 0; i < MAX_CLIENTS; i++) {
            if (!_clientActive[i] || !_clients[i].connected()) {
                slot = i;
                break;
            }
        }

        if (slot >= 0) {
            _clients[slot] = _server.accept();
            _clients[slot].setNoDelay(true);
            _clientActive[slot] = true;
            _parsers[slot].reset();
            Serial.printf("[PRINTER] Client %d connected from %s\n",
                          slot, _clients[slot].remoteIP().toString().c_str());
        } else {
            // No free slots — reject
            WiFiClient rejected = _server.accept();
            rejected.stop();
            Serial.println("[PRINTER] Max clients reached — rejected connection");
        }
    }

    // Read data from active clients
    for (int i = 0; i < MAX_CLIENTS; i++) {
        if (!_clientActive[i]) continue;

        if (!_clients[i].connected()) {
            // Client disconnected — check if we have a pending receipt
            if (_parsers[i].getRawLength() > 0) {
                // Force-complete the receipt
                _handleCompleteReceipt(i);
            }
            _clientActive[i] = false;
            Serial.printf("[PRINTER] Client %d disconnected\n", i);
            continue;
        }

        // Read available data
        while (_clients[i].available()) {
            uint8_t buf[512];
            int bytesRead = _clients[i].read(buf, sizeof(buf));

            if (bytesRead > 0) {
                // Feed to parser
                _parsers[i].feed(buf, bytesRead);

                // Forward to real printer if pass-through enabled
                if (_passthroughEnabled) {
                    _forwardToRealPrinter(buf, bytesRead);
                }
            }
        }

        // Check if receipt is complete (timeout or cut command)
        if (_parsers[i].isComplete()) {
            _handleCompleteReceipt(i);
        }
    }
}

// ─── Handle Complete Receipt ────────────────────────────────────────────────

void VirtualPrinter::_handleCompleteReceipt(int clientIdx) {
    ParsedReceipt receipt = _parsers[clientIdx].getReceipt();
    _totalReceived++;

    Serial.printf("[PRINTER] Receipt #%d complete — Merchant: %s, Total: $%.2f\n",
                  _totalReceived, receipt.merchantName.c_str(), receipt.total);

    // Fire callback to main app
    if (_receiptCallback && receipt.valid) {
        _receiptCallback(
            receipt,
            _parsers[clientIdx].getRawBuffer(),
            _parsers[clientIdx].getRawLength()
        );
    }

    // Reset parser for next receipt from same connection
    _parsers[clientIdx].reset();
}

// ─── Pass-through to Real Printer ───────────────────────────────────────────

void VirtualPrinter::_forwardToRealPrinter(const uint8_t* data, size_t len) {
    if (!_passthroughEnabled || _passthroughIp.length() == 0) return;

    WiFiClient printer;
    if (printer.connect(_passthroughIp.c_str(), _passthroughPort)) {
        printer.write(data, len);
        printer.flush();
        printer.stop();
    } else {
        Serial.println("[PRINTER] Pass-through: failed to connect to real printer");
    }
}

// ─── Configuration ──────────────────────────────────────────────────────────

void VirtualPrinter::setPassthrough(const String& ip, uint16_t port) {
    _passthroughIp = ip;
    _passthroughPort = port;
    _passthroughEnabled = true;
    Serial.printf("[PRINTER] Pass-through enabled → %s:%d\n", ip.c_str(), port);
}

void VirtualPrinter::disablePassthrough() {
    _passthroughEnabled = false;
}

int VirtualPrinter::getActiveClients() const {
    int count = 0;
    for (int i = 0; i < MAX_CLIENTS; i++) {
        if (_clientActive[i]) count++;
    }
    return count;
}

void VirtualPrinter::stop() {
    for (int i = 0; i < MAX_CLIENTS; i++) {
        if (_clientActive[i]) {
            _clients[i].stop();
            _clientActive[i] = false;
        }
    }
    _server.stop();
    Serial.println("[PRINTER] Server stopped");
}
