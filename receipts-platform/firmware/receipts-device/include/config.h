#pragma once

// ─── Pin Definitions ────────────────────────────────────────────────────────

// PN532 NFC Module (SPI)
#define NFC_SCK_PIN          12
#define NFC_MISO_PIN         13
#define NFC_MOSI_PIN         11
#define NFC_SS_PIN           10
#define NFC_IRQ_PIN          14

// Status LEDs (ESP32-S3-DevKitC-1 built-in RGB on GPIO48)
#define LED_STATUS_PIN       48
#define LED_ACTIVITY_PIN     47

// Legacy serial passthrough (Phase 2 — for older POS)
#define POS_SERIAL_RX_PIN   16  // From POS TX
#define POS_SERIAL_TX_PIN   17  // To real printer RX
#define POS_SERIAL_BAUD     9600

// ─── Virtual Printer Config ─────────────────────────────────────────────────

// TCP port 9100 = RAW/JetDirect — standard for network receipt printers
// POS systems auto-discover via mDNS and print here
#define PRINTER_TCP_PORT     9100
#define PRINTER_NAME         "Receipts Capture"
#define PRINTER_MODEL        "RP-100"   // Shows in POS printer list
#define MAX_CLIENTS          3          // Concurrent POS connections

// Pass-through: forward data to real printer after capture
#define PASSTHROUGH_ENABLED  true
#define PASSTHROUGH_IP       "0.0.0.0"  // Set during config (real printer IP)
#define PASSTHROUGH_PORT     9100

// ─── Network Config ─────────────────────────────────────────────────────────

#define WIFI_CONNECT_TIMEOUT_MS   15000
#define WIFI_RECONNECT_INTERVAL   5000
#define MDNS_HOSTNAME        "receipts-printer"  // receipts-printer.local

// ─── API Config ─────────────────────────────────────────────────────────────

#define API_BASE_URL         "https://receipts.app"
#define API_TIMEOUT_MS       10000
#define HEARTBEAT_INTERVAL   300000   // 5 minutes
#define BATCH_UPLOAD_SIZE    10
#define BATCH_UPLOAD_DELAY   5000     // 5s after last receipt before uploading

// ─── ESC/POS Parser Config ──────────────────────────────────────────────────

#define ESCPOS_BUFFER_SIZE   8192    // Max single receipt size
#define RECEIPT_TIMEOUT_MS   2000    // Silence = receipt complete
#define MAX_RECEIPT_ITEMS    100
#define MAX_QUEUED_RECEIPTS  50      // Offline ring buffer

// ─── Firmware Info ──────────────────────────────────────────────────────────

#define FW_VERSION           "1.0.0"
#define DEVICE_MODEL         "receipts-esp32s3-v1"
