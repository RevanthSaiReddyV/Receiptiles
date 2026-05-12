#pragma once

#include "esp_err.h"

/**
 * REYAX RYRR30D NFC Module Driver
 *
 * Communicates via UART AT commands to:
 * - Broadcast NDEF URL records (for phone tap → claim receipt)
 * - Detect phone proximity (field detection)
 * - Support Apple VAS / Google Smart Tap protocols
 */

/**
 * Initialize NFC module (UART2, configure for card emulation mode).
 */
esp_err_t nfc_init(void);

/**
 * Broadcast an NDEF URL record for the specified duration.
 * Phone tapping the module will open this URL.
 *
 * @param url       The claim URL to broadcast
 * @param duration_ms  How long to broadcast (0 = until stopped)
 */
esp_err_t nfc_broadcast_url(const char *url, uint32_t duration_ms);

/**
 * Stop any active NFC broadcast.
 */
esp_err_t nfc_stop_broadcast(void);

/**
 * Check if a phone is currently in NFC field.
 */
bool nfc_is_phone_present(void);

/**
 * Set the VAS/Smart Tap merchant identifier for passive mode.
 * When a phone with the matching wallet pass taps, the module
 * automatically triggers the handover.
 */
esp_err_t nfc_set_vas_merchant_id(const char *merchant_id);

/**
 * Get module firmware version.
 */
esp_err_t nfc_get_version(char *out_version, size_t max_len);
