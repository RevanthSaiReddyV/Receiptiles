/// <reference path="./web-bluetooth.d.ts" />

/**
 * WalletMate 2 (ACR1255U-J1) Web Bluetooth driver
 *
 * Handles BLE connection, APDU framing, NFC polling, and NDEF reading
 * for the ACS ACR1255U-J1 contactless reader.
 *
 * Protocol reference:
 *   - BLE Service UUID: 0000fff0-0000-1000-8000-00805f9b34fb
 *   - Write Characteristic (TX): 0000fff1-0000-1000-8000-00805f9b34fb
 *   - Notify Characteristic (RX): 0000fff2-0000-1000-8000-00805f9b34fb
 */

const ACS_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const ACS_WRITE_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";
const ACS_NOTIFY_UUID = "0000fff2-0000-1000-8000-00805f9b34fb";

// ACR1255 escape command class byte
const ESCAPE_CLASS = 0xe0;

// APDU commands
const CMD_GET_FIRMWARE = new Uint8Array([0xe0, 0x00, 0x00, 0x18, 0x00]);
const CMD_POLL_CARD = new Uint8Array([0xff, 0x00, 0x00, 0x00, 0x04, 0xd4, 0x4a, 0x01, 0x00]);
const CMD_BUZZER_ON = (durationMs: number): Uint8Array => {
  // Duration in units of 10ms
  const units = Math.min(255, Math.max(1, Math.round(durationMs / 10)));
  return new Uint8Array([0xe0, 0x00, 0x00, 0x28, 0x01, units]);
};
const CMD_LED_STATUS = new Uint8Array([0xe0, 0x00, 0x00, 0x29, 0x00]);

// NDEF commands
const CMD_SELECT_NDEF_APP = new Uint8Array([
  0x00, 0xa4, 0x04, 0x00, 0x07, 0xd2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01, 0x00,
]);
const CMD_SELECT_NDEF_CC = new Uint8Array([0x00, 0xa4, 0x00, 0x0c, 0x02, 0xe1, 0x03]);
const CMD_SELECT_NDEF_FILE = new Uint8Array([0x00, 0xa4, 0x00, 0x0c, 0x02, 0xe1, 0x04]);
const CMD_READ_BINARY_SHORT = new Uint8Array([0x00, 0xb0, 0x00, 0x00, 0x00]); // Read full

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reading" | "error";

export interface WalletMateEvents {
  onStatusChange?: (status: ConnectionStatus) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onCardDetected?: (data: Uint8Array, ndefText?: string) => void;
  onError?: (error: Error) => void;
  onLog?: (message: string) => void;
}

export class WalletMateReader {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private responseBuffer: Uint8Array[] = [];
  private pendingResolve: ((data: Uint8Array) => void) | null = null;
  private _status: ConnectionStatus = "disconnected";
  private events: WalletMateEvents = {};

  constructor(events?: WalletMateEvents) {
    if (events) this.events = events;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === "connected" || this._status === "reading";
  }

  get deviceName(): string | null {
    return this.device?.name ?? null;
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.events.onStatusChange?.(status);
  }

  private log(msg: string) {
    this.events.onLog?.(msg);
  }

  /**
   * Check if Web Bluetooth is available in this browser
   */
  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  /**
   * Connect to the ACR1255U-J1 via Web Bluetooth
   */
  async connect(): Promise<void> {
    if (!WalletMateReader.isSupported()) {
      throw new Error("Web Bluetooth is not supported in this browser");
    }

    this.setStatus("connecting");
    this.log("Requesting BLE device...");

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: "ACR" },
          { services: [ACS_SERVICE_UUID] },
        ],
        optionalServices: [ACS_SERVICE_UUID],
      });

      if (!this.device) {
        throw new Error("No device selected");
      }

      this.log(`Device found: ${this.device.name ?? "Unknown"}`);

      // Listen for disconnection
      this.device.addEventListener("gattserverdisconnected", () => {
        this.handleDisconnect();
      });

      // Connect to GATT server
      this.log("Connecting to GATT server...");
      this.server = await this.device.gatt!.connect();

      // Get the ACS service
      this.log("Getting ACS service...");
      const service = await this.server.getPrimaryService(ACS_SERVICE_UUID);

      // Get characteristics
      this.writeChar = await service.getCharacteristic(ACS_WRITE_UUID);
      this.notifyChar = await service.getCharacteristic(ACS_NOTIFY_UUID);

      // Subscribe to notifications
      await this.notifyChar.startNotifications();
      this.notifyChar.addEventListener(
        "characteristicvaluechanged",
        this.handleNotification.bind(this)
      );

      this.setStatus("connected");
      this.log(`Connected to ${this.device.name ?? "ACR1255U-J1"}`);
      this.events.onConnect?.();

      // Get firmware version
      try {
        const fwResponse = await this.sendCommand(CMD_GET_FIRMWARE);
        const fwVersion = new TextDecoder().decode(fwResponse.slice(0, -2)); // trim SW1/SW2
        this.log(`Firmware: ${fwVersion}`);
      } catch {
        // Non-critical, continue
      }
    } catch (error) {
      this.setStatus("error");
      const err = error instanceof Error ? error : new Error(String(error));
      this.log(`Connection failed: ${err.message}`);
      this.events.onError?.(err);
      throw err;
    }
  }

  /**
   * Disconnect from the device
   */
  disconnect(): void {
    this.stopPolling();
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.handleDisconnect();
  }

  private handleDisconnect() {
    this.stopPolling();
    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.setStatus("disconnected");
    this.log("Disconnected");
    this.events.onDisconnect?.();
  }

  /**
   * Start continuous NFC polling
   */
  async startPolling(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected");
    }

    this.setStatus("reading");
    this.log("Starting NFC polling...");

    const poll = async () => {
      if (!this.isConnected) return;

      try {
        const response = await this.sendCommand(CMD_POLL_CARD);

        // Check if a card was detected
        // Successful InListPassiveTarget response: D5 4B 01 01 <ATQA> <SAK> <UID_LEN> <UID...>
        if (response.length > 6 && response[0] === 0xd5 && response[1] === 0x4b && response[2] >= 0x01) {
          const uidLength = response[6];
          const uid = response.slice(7, 7 + uidLength);

          this.log(`Card detected! UID: ${this.toHex(uid)}`);

          // Try to read NDEF data
          const ndefText = await this.readNDEF();

          this.events.onCardDetected?.(uid, ndefText ?? undefined);

          // Beep on success
          try {
            await this.buzzer(100);
          } catch {
            // Non-critical
          }

          // Wait a bit before next poll to avoid reading same card repeatedly
          await this.delay(2000);
        }
      } catch {
        // Poll timeout or no card - this is normal, continue polling
      }
    };

    // Poll every 500ms
    this.pollingInterval = setInterval(poll, 500);
    // Initial poll immediately
    poll();
  }

  /**
   * Stop NFC polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this._status === "reading") {
      this.setStatus("connected");
    }
    this.log("Polling stopped");
  }

  /**
   * Activate the buzzer for the specified duration (ms)
   */
  async buzzer(durationMs: number): Promise<void> {
    await this.sendCommand(CMD_BUZZER_ON(durationMs));
  }

  /**
   * Get the current LED status
   */
  async getLedStatus(): Promise<Uint8Array> {
    return this.sendCommand(CMD_LED_STATUS);
  }

  /**
   * Attempt to read NDEF message from the detected card
   */
  private async readNDEF(): Promise<string | null> {
    try {
      // Select NDEF Application
      let resp = await this.sendCommand(CMD_SELECT_NDEF_APP);
      if (!this.isSuccess(resp)) return null;

      // Select NDEF file
      resp = await this.sendCommand(CMD_SELECT_NDEF_FILE);
      if (!this.isSuccess(resp)) return null;

      // Read NDEF data
      resp = await this.sendCommand(CMD_READ_BINARY_SHORT);
      if (!this.isSuccess(resp) || resp.length < 4) return null;

      // Parse NDEF message
      return this.parseNDEFText(resp.slice(0, -2)); // Remove SW1/SW2
    } catch {
      return null;
    }
  }

  /**
   * Parse NDEF text record from raw bytes
   * Looks for Text (T) or URI (U) records containing the serial number
   */
  private parseNDEFText(data: Uint8Array): string | null {
    if (data.length < 4) return null;

    try {
      // NDEF message starts after 2-byte length prefix
      let offset = 2;
      if (data[0] === 0x00) offset = 2; // Length prefix

      while (offset < data.length - 3) {
        const tnf = data[offset] & 0x07;
        const isShort = (data[offset] & 0x10) !== 0;
        const typeLength = data[offset + 1];
        const payloadLength = isShort ? data[offset + 2] : 0;
        const headerSize = isShort ? 3 : 3;

        offset += headerSize;
        const type = data.slice(offset, offset + typeLength);
        offset += typeLength;
        const payload = data.slice(offset, offset + payloadLength);
        offset += payloadLength;

        // Text record (TNF=0x01, type="T")
        if (tnf === 0x01 && typeLength === 1 && type[0] === 0x54) {
          const langLength = payload[0] & 0x3f;
          return new TextDecoder().decode(payload.slice(1 + langLength));
        }

        // URI record (TNF=0x01, type="U")
        if (tnf === 0x01 && typeLength === 1 && type[0] === 0x55) {
          const prefixCode = payload[0];
          const uriPrefixes: Record<number, string> = {
            0x00: "",
            0x01: "http://www.",
            0x02: "https://www.",
            0x03: "http://",
            0x04: "https://",
          };
          const prefix = uriPrefixes[prefixCode] ?? "";
          return prefix + new TextDecoder().decode(payload.slice(1));
        }

        // External type (TNF=0x04) - could contain the serial
        if (tnf === 0x04) {
          return new TextDecoder().decode(payload);
        }
      }

      // Fallback: try to decode the whole thing as text
      const text = new TextDecoder().decode(data);
      const match = text.match(/rcpt_[a-zA-Z0-9]+/);
      return match ? match[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Send an APDU command and wait for the response
   */
  private async sendCommand(apdu: Uint8Array): Promise<Uint8Array> {
    if (!this.writeChar) {
      throw new Error("Not connected");
    }

    // Frame the APDU with ACR1255 BLE header
    const frame = this.frameAPDU(apdu);

    return new Promise<Uint8Array>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResolve = null;
        reject(new Error("Command timeout"));
      }, 3000);

      this.pendingResolve = (data: Uint8Array) => {
        clearTimeout(timeout);
        resolve(data);
      };

      this.writeChar!.writeValue(frame as unknown as BufferSource).catch((err: Error) => {
        clearTimeout(timeout);
        this.pendingResolve = null;
        reject(err);
      });
    });
  }

  /**
   * Frame an APDU for the ACR1255 BLE transport
   * Format: [Header(1)] [Length(2)] [Data(n)] [LRC(1)]
   */
  private frameAPDU(apdu: Uint8Array): Uint8Array {
    const header = 0x6f; // Data frame marker
    const len = apdu.length;
    const frame = new Uint8Array(4 + len);
    frame[0] = header;
    frame[1] = (len >> 8) & 0xff;
    frame[2] = len & 0xff;
    frame.set(apdu, 3);

    // LRC checksum (XOR of all bytes)
    let lrc = 0;
    for (let i = 0; i < frame.length - 1; i++) {
      lrc ^= frame[i];
    }
    frame[frame.length - 1] = lrc;

    return frame;
  }

  /**
   * Handle incoming BLE notifications (responses from reader)
   */
  private handleNotification(event: Event) {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    const data = new Uint8Array(value.buffer);

    // ACR1255 response frame: [Header(1)] [Length(2)] [Payload(n)] [LRC(1)]
    if (data.length >= 4 && data[0] === 0x6f) {
      const payloadLen = (data[1] << 8) | data[2];
      const payload = data.slice(3, 3 + payloadLen);

      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve(payload);
      }
    }
  }

  /**
   * Check if APDU response indicates success (SW1=90, SW2=00)
   */
  private isSuccess(response: Uint8Array): boolean {
    if (response.length < 2) return false;
    return response[response.length - 2] === 0x90 && response[response.length - 1] === 0x00;
  }

  /**
   * Convert bytes to hex string for display
   */
  private toHex(data: Uint8Array): string {
    return Array.from(data)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(":");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
