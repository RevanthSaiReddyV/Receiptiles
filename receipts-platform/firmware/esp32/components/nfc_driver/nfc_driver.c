/**
 * REYAX RYRR30D NFC Module Driver
 *
 * AT Command Protocol:
 * - AT+MODE=CE        → Card emulation mode
 * - AT+NDEF=<hex>     → Set NDEF message
 * - AT+FIELD?         → Query field detection
 * - AT+VAS=<id>       → Set VAS merchant ID
 * - AT+VERSION?       → Get firmware version
 *
 * NDEF URL Record format:
 * [D1] [01] [len] [55] [prefix_byte] [url_bytes]
 * prefix 0x04 = "https://"
 */

#include <string.h>
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/timers.h"
#include "driver/uart.h"
#include "esp_log.h"
#include "nfc_driver.h"

// Import pin config
#define NFC_UART_NUM    UART_NUM_2
#define NFC_TX_PIN      17
#define NFC_RX_PIN      18
#define NFC_BAUD        115200
#define NFC_BUF_SIZE    512

static const char *TAG = "nfc";
static TimerHandle_t broadcast_timer = NULL;
static bool broadcasting = false;

// ─── UART Helpers ────────────────────────────────────────────────────────────
static esp_err_t nfc_send_cmd(const char *cmd, char *response, size_t resp_len, int timeout_ms) {
    // Flush RX
    uart_flush_input(NFC_UART_NUM);

    // Send command + CRLF
    char full_cmd[256];
    snprintf(full_cmd, sizeof(full_cmd), "%s\r\n", cmd);
    uart_write_bytes(NFC_UART_NUM, full_cmd, strlen(full_cmd));

    // Read response
    int len = uart_read_bytes(NFC_UART_NUM, (uint8_t *)response, resp_len - 1,
                             pdMS_TO_TICKS(timeout_ms));
    if (len > 0) {
        response[len] = '\0';
        ESP_LOGD(TAG, "CMD: %s → %s", cmd, response);
        return ESP_OK;
    }

    response[0] = '\0';
    return ESP_ERR_TIMEOUT;
}

// ─── NDEF URL Record Builder ─────────────────────────────────────────────────
static int build_ndef_url(const char *url, uint8_t *out, size_t max_len) {
    // NDEF URL record: TNF=0x01 (well-known), Type="U"
    // URL prefixes: 0x00=none, 0x01=http://, 0x02=https://, 0x03=http://www.
    //              0x04=https://www.

    uint8_t prefix = 0x00;
    const char *url_body = url;

    if (strncmp(url, "https://www.", 12) == 0) {
        prefix = 0x04; url_body = url + 12;
    } else if (strncmp(url, "http://www.", 11) == 0) {
        prefix = 0x03; url_body = url + 11;
    } else if (strncmp(url, "https://", 8) == 0) {
        prefix = 0x02; url_body = url + 8;
    } else if (strncmp(url, "http://", 7) == 0) {
        prefix = 0x01; url_body = url + 7;
    }

    int url_len = strlen(url_body);
    int payload_len = 1 + url_len; // prefix byte + URL

    if (payload_len + 7 > (int)max_len) return -1;

    int pos = 0;

    // NDEF message header
    out[pos++] = 0xD1;          // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=001
    out[pos++] = 0x01;          // Type length = 1
    out[pos++] = payload_len;   // Payload length
    out[pos++] = 'U';           // Type = "U" (URI)
    out[pos++] = prefix;        // URL prefix code
    memcpy(&out[pos], url_body, url_len);
    pos += url_len;

    return pos;
}

// ─── Timer Callback ──────────────────────────────────────────────────────────
static void broadcast_timeout_cb(TimerHandle_t xTimer) {
    nfc_stop_broadcast();
}

// ─── Public API ──────────────────────────────────────────────────────────────
esp_err_t nfc_init(void) {
    uart_config_t uart_config = {
        .baud_rate = NFC_BAUD,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
    };

    ESP_ERROR_CHECK(uart_param_config(NFC_UART_NUM, &uart_config));
    ESP_ERROR_CHECK(uart_set_pin(NFC_UART_NUM, NFC_TX_PIN, NFC_RX_PIN,
                                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));
    ESP_ERROR_CHECK(uart_driver_install(NFC_UART_NUM, NFC_BUF_SIZE, NFC_BUF_SIZE,
                                        0, NULL, 0));

    // Wait for module boot
    vTaskDelay(pdMS_TO_TICKS(500));

    // Set card emulation mode
    char resp[128];
    nfc_send_cmd("AT+MODE=CE", resp, sizeof(resp), 1000);

    if (strstr(resp, "OK") == NULL) {
        ESP_LOGE(TAG, "Failed to set CE mode: %s", resp);
        return ESP_FAIL;
    }

    // Get version
    char version[64];
    if (nfc_get_version(version, sizeof(version)) == ESP_OK) {
        ESP_LOGI(TAG, "NFC module initialized: %s", version);
    } else {
        ESP_LOGI(TAG, "NFC module initialized (version unknown)");
    }

    // Create broadcast timer
    broadcast_timer = xTimerCreate("nfc_bc", pdMS_TO_TICKS(30000),
                                   pdFALSE, NULL, broadcast_timeout_cb);

    return ESP_OK;
}

esp_err_t nfc_broadcast_url(const char *url, uint32_t duration_ms) {
    if (!url || strlen(url) == 0) return ESP_ERR_INVALID_ARG;

    // Build NDEF record
    uint8_t ndef[256];
    int ndef_len = build_ndef_url(url, ndef, sizeof(ndef));
    if (ndef_len < 0) return ESP_ERR_INVALID_SIZE;

    // Convert to hex string for AT command
    char hex_cmd[600];
    int pos = snprintf(hex_cmd, sizeof(hex_cmd), "AT+NDEF=");
    for (int i = 0; i < ndef_len && pos < (int)sizeof(hex_cmd) - 3; i++) {
        pos += snprintf(hex_cmd + pos, sizeof(hex_cmd) - pos, "%02X", ndef[i]);
    }

    // Send NDEF to module
    char resp[128];
    esp_err_t err = nfc_send_cmd(hex_cmd, resp, sizeof(resp), 2000);
    if (err != ESP_OK || strstr(resp, "OK") == NULL) {
        ESP_LOGE(TAG, "Failed to set NDEF: %s", resp);
        return ESP_FAIL;
    }

    broadcasting = true;
    ESP_LOGI(TAG, "Broadcasting URL: %s (duration: %lums)", url, (unsigned long)duration_ms);

    // Set auto-stop timer
    if (duration_ms > 0 && broadcast_timer) {
        xTimerChangePeriod(broadcast_timer, pdMS_TO_TICKS(duration_ms), 0);
        xTimerStart(broadcast_timer, 0);
    }

    return ESP_OK;
}

esp_err_t nfc_stop_broadcast(void) {
    if (!broadcasting) return ESP_OK;

    char resp[128];
    nfc_send_cmd("AT+NDEF=", resp, sizeof(resp), 1000); // Clear NDEF
    broadcasting = false;

    if (broadcast_timer) {
        xTimerStop(broadcast_timer, 0);
    }

    ESP_LOGI(TAG, "NFC broadcast stopped");
    return ESP_OK;
}

bool nfc_is_phone_present(void) {
    char resp[128];
    if (nfc_send_cmd("AT+FIELD?", resp, sizeof(resp), 200) == ESP_OK) {
        return strstr(resp, "DETECTED") != NULL;
    }
    return false;
}

esp_err_t nfc_set_vas_merchant_id(const char *merchant_id) {
    char cmd[128];
    snprintf(cmd, sizeof(cmd), "AT+VAS=%s", merchant_id);

    char resp[128];
    esp_err_t err = nfc_send_cmd(cmd, resp, sizeof(resp), 1000);
    if (err == ESP_OK && strstr(resp, "OK")) {
        ESP_LOGI(TAG, "VAS merchant ID set: %s", merchant_id);
        return ESP_OK;
    }
    return ESP_FAIL;
}

esp_err_t nfc_get_version(char *out_version, size_t max_len) {
    char resp[128];
    if (nfc_send_cmd("AT+VERSION?", resp, sizeof(resp), 1000) == ESP_OK) {
        // Parse version from response
        char *ver = strstr(resp, "VERSION:");
        if (ver) {
            ver += 8;
            char *end = strstr(ver, "\r");
            if (end) *end = '\0';
            strncpy(out_version, ver, max_len - 1);
            return ESP_OK;
        }
    }
    return ESP_FAIL;
}
