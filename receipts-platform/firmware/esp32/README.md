# ESP32-S3 Receipt Interceptor Firmware

## Overview

Inline device that sits between a POS system and its receipt printer. Sniffs ESC/POS
protocol data, parses receipt content in real-time, and delivers digital receipts to
consumers via NFC (REYAX RYRR30D module).

## Hardware

| Component | Part | Interface |
|-----------|------|-----------|
| MCU | ESP32-S3-WROOM-1 (N16R8) | — |
| NFC | REYAX RYRR30D | UART2 (GPIO17 TX, GPIO18 RX) |
| POS Input | DB25/RJ12 adapter | UART1 (GPIO15 RX, sniff-only) |
| Printer Output | Passthrough | GPIO16 TX (relay) |
| Status LED | WS2812B | GPIO48 |
| Config Button | Momentary | GPIO0 |

## Architecture

```
POS ──[serial]──► UART1 RX ──► ESC/POS Parser ──► Receipt Queue
                      │                                    │
                      ▼                                    ▼
               UART1 TX ──► Printer              WiFi API Upload
               (passthrough)                           │
                                                       ▼
                                              NFC Handover Token
                                                       │
                                                       ▼
                                              RYRR30D ──► Phone
```

## Build (ESP-IDF v5.2+)

```bash
idf.py set-target esp32s3
idf.py menuconfig   # Set WiFi credentials, API endpoint
idf.py build
idf.py flash monitor
```

## Components

- **escpos_parser** — Parses ESC/POS byte stream into structured receipt
- **nfc_driver** — REYAX RYRR30D UART driver + NDEF URL record generation
- **api_client** — HTTPS client for device registration, receipt upload, NFC handover
- **ota** — Over-the-air firmware updates from cloud

## Configuration (menuconfig)

- `CONFIG_WIFI_SSID` / `CONFIG_WIFI_PASSWORD`
- `CONFIG_API_BASE_URL` (default: https://receipts.app)
- `CONFIG_DEVICE_API_KEY` (provisioned on first boot)
- `CONFIG_NFC_ENABLED` (default: y)
- `CONFIG_PRINTER_BAUD` (default: 9600)
- `CONFIG_OTA_URL` (firmware update endpoint)
