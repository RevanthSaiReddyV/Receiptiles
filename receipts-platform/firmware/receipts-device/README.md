# Receipts Device Firmware

ESP32-S3 firmware that acts as a **virtual network printer**. Modern POS systems (Square, Toast, Clover, Shopify POS) discover it on the network and send receipt print jobs to it. The device captures, parses, and uploads the receipt data to the Receipts Platform API.

## How It Works

```
POS Terminal                    ESP32-S3 Device                Receipts API
    │                               │                              │
    │── mDNS discover printer ─────>│                              │
    │<── "Receipts Capture" ────────│                              │
    │                               │                              │
    │── TCP:9100 ESC/POS data ─────>│                              │
    │                               │── parse receipt ──>          │
    │                               │── POST /api/device/receipts ─>│
    │                               │                              │
    │                               │── NFC tap detected ──>       │
    │                               │── POST /nfc-handover ────────>│
    │                               │<── claim URL ────────────────│
    │                               │── write NDEF to phone        │
    │                               │                              │
    │   (optional pass-through)     │                              │
    │                               │── forward to real printer ──>│ Real Printer
```

## Hardware Required

### Essential
| Component | Model | Purpose | Amazon Search |
|-----------|-------|---------|--------------|
| MCU Board | **ESP32-S3-DevKitC-1** (N16R8) | Main processor, WiFi, USB | "ESP32-S3-DevKitC-1 N16R8" |
| NFC Module | **PN532 NFC RFID Module** (SPI/I2C) | Tap-to-claim handover | "PN532 NFC module SPI" |
| USB-C Cable | Any USB-C data cable | Programming + power | — |

### For Development
| Component | Model | Purpose | Amazon Search |
|-----------|-------|---------|--------------|
| Breadboard | 830-point | Prototyping | "breadboard 830" |
| Jumper Wires | M-F Dupont | Connecting modules | "dupont jumper wires" |
| Thermal Printer | **Epson TM-T20III** or any 58/80mm | Testing ESC/POS output | "58mm thermal receipt printer USB" |

### Phase 2 (Legacy Serial POS)
| Component | Model | Purpose | Amazon Search |
|-----------|-------|---------|--------------|
| RS232 Adapter | **MAX3232 module** | Serial tap for legacy POS | "MAX3232 TTL RS232 module" |
| DB9 Splitter | DB9 M-F-F Y-cable | Inline serial tap | "DB9 serial Y splitter" |

## Wiring Diagram

### PN532 NFC → ESP32-S3 (SPI Mode)

```
PN532          ESP32-S3
─────          ────────
VCC    ──────  3V3
GND    ──────  GND
SCK    ──────  GPIO 12
MISO   ──────  GPIO 13
MOSI   ──────  GPIO 11
SS     ──────  GPIO 10
IRQ    ──────  GPIO 14 (optional)

Note: Set PN532 DIP switches to SPI mode (SEL0=OFF, SEL1=ON)
```

### Activity LED

```
GPIO 47 ──── 220Ω resistor ──── LED (+) ──── GND
```

## Setup & Flashing

### Prerequisites
1. Install [PlatformIO](https://platformio.org/install)
2. Or install VS Code + PlatformIO extension

### Build & Flash
```bash
cd firmware/receipts-device

# Build
pio run

# Flash to device (connect via USB-C)
pio run --target upload

# Open serial monitor
pio device monitor
```

### First Boot Provisioning

After flashing, open Serial Monitor (115200 baud) and send:

```
WIFI:YourNetworkName:YourPassword
PROVISION:your-device-provision-key
```

Optional commands:
```
API:https://your-receipts-server.com    # Custom API URL
PASSTHROUGH:192.168.1.50                # Forward to real printer
STATUS                                   # Show device info
RESET                                    # Reboot
```

### Get Your Provisioning Key

Set `DEVICE_PROVISION_KEY` in your `.env.local` on the server side. This is a shared secret used only during device setup.

## POS Setup

Once the device is powered on and provisioned:

1. **Square POS**: Settings → Hardware → Printers → Add printer → Select "Receipts Capture"
2. **Toast**: Administration → Printer Setup → Add Network Printer → receipts-printer.local:9100
3. **Clover**: Settings → Printers → Add → Network → "Receipts Capture"
4. **Shopify POS**: Settings → Hardware → Receipt Printer → Add → LAN → Select "Receipts Capture"
5. **Any POS**: Add network printer at `<device-ip>:9100` or `receipts-printer.local:9100`

## Architecture

```
src/
├── main.cpp             # Orchestrator, setup/loop, serial commands
├── virtual_printer.cpp  # TCP:9100 server + mDNS advertisement
├── escpos_parser.cpp    # ESC/POS byte stream → structured receipt
├── api_client.cpp       # WiFi, API calls, offline queue, OTA
└── nfc_handler.cpp      # PN532 NFC tap-to-claim

include/
├── config.h             # Pin definitions, timing, buffer sizes
├── virtual_printer.h
├── escpos_parser.h
├── api_client.h
└── nfc_handler.h
```

## Pass-Through Mode

The device can forward all print data to a **real** thermal printer, so the merchant still gets their physical receipt while you capture a digital copy:

```
POS → ESP32 (capture) → Real Printer (physical receipt)
                ↓
         Receipts API (digital receipt)
```

Configure via serial: `PASSTHROUGH:192.168.1.50`

## OTA Updates

The device checks for firmware updates on every heartbeat (5 min intervals). New firmware binaries are served from `/firmware/receipts-esp32-v{version}.bin` on the API server.
