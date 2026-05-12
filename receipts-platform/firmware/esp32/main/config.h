#pragma once

// ─── Hardware Pins ───────────────────────────────────────────────────────────
#define PIN_POS_RX          15   // UART1 RX - POS data input (sniff)
#define PIN_PRINTER_TX      16   // UART1 TX - Printer passthrough
#define PIN_NFC_TX          17   // UART2 TX - RYRR30D commands
#define PIN_NFC_RX          18   // UART2 RX - RYRR30D responses
#define PIN_STATUS_LED      48   // WS2812B status LED
#define PIN_CONFIG_BUTTON   0    // Boot button for config mode

// ─── UART Configuration ──────────────────────────────────────────────────────
#define POS_UART_NUM        UART_NUM_1
#define POS_UART_BAUD       9600     // Most thermal printers use 9600/19200
#define POS_UART_BUF_SIZE   4096

#define NFC_UART_NUM        UART_NUM_2
#define NFC_UART_BAUD       115200
#define NFC_UART_BUF_SIZE   512

// ─── Receipt Queue ───────────────────────────────────────────────────────────
#define RECEIPT_QUEUE_SIZE  10       // Max queued receipts before upload
#define RECEIPT_MAX_ITEMS   64       // Max line items per receipt
#define RECEIPT_MAX_LEN     8192     // Max raw ESC/POS bytes per receipt

// ─── Network ─────────────────────────────────────────────────────────────────
#define API_BASE_URL        CONFIG_API_BASE_URL
#define API_TIMEOUT_MS      10000
#define HEARTBEAT_INTERVAL  30000    // 30s heartbeat
#define UPLOAD_RETRY_MAX    3
#define UPLOAD_RETRY_DELAY  5000     // 5s between retries

// ─── NFC ─────────────────────────────────────────────────────────────────────
#define NFC_BROADCAST_MS    30000    // Broadcast NDEF for 30s after receipt
#define NFC_POLL_INTERVAL   100      // Check for phone tap every 100ms

// ─── OTA ─────────────────────────────────────────────────────────────────────
#define OTA_CHECK_INTERVAL  3600000  // Check for updates every hour
#define OTA_URL             CONFIG_OTA_URL
