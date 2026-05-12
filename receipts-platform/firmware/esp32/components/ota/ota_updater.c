/**
 * OTA Firmware Updater — dual-partition scheme with rollback support.
 *
 * Uses ESP-IDF's native OTA APIs to safely update firmware:
 * - esp_ota_begin / esp_ota_write / esp_ota_end for writing
 * - esp_ota_set_boot_partition to switch active partition
 * - esp_ota_mark_app_valid_cancel_rollback to confirm good boot
 *
 * SHA-256 integrity verification ensures corrupted downloads are rejected.
 */

#include <string.h>
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_ota_ops.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include "esp_system.h"
#include "esp_app_format.h"
#include "mbedtls/sha256.h"
#include "cJSON.h"
#include "ota_updater.h"

static const char *TAG = "ota";

#define FIRMWARE_VERSION "1.0.0"
#define OTA_BUF_SIZE 4096

#ifndef CONFIG_API_BASE_URL
#define CONFIG_API_BASE_URL "https://receipts.app"
#endif

// ─── Version Comparison ─────────────────────────────────────────────────────
static int compare_versions(const char *v1, const char *v2) {
    int major1 = 0, minor1 = 0, patch1 = 0;
    int major2 = 0, minor2 = 0, patch2 = 0;

    sscanf(v1, "%d.%d.%d", &major1, &minor1, &patch1);
    sscanf(v2, "%d.%d.%d", &major2, &minor2, &patch2);

    if (major1 != major2) return major1 - major2;
    if (minor1 != minor2) return minor1 - minor2;
    return patch1 - patch2;
}

// ─── HTTP Response Buffer ───────────────────────────────────────────────────
typedef struct {
    char *buffer;
    int len;
    int max_len;
} http_response_t;

static esp_err_t http_event_handler(esp_http_client_event_t *evt) {
    http_response_t *resp = (http_response_t *)evt->user_data;
    if (!resp) return ESP_OK;

    switch (evt->event_id) {
        case HTTP_EVENT_ON_DATA:
            if (resp->len + evt->data_len < resp->max_len) {
                memcpy(resp->buffer + resp->len, evt->data, evt->data_len);
                resp->len += evt->data_len;
                resp->buffer[resp->len] = '\0';
            }
            break;
        default:
            break;
    }
    return ESP_OK;
}

// ─── Init ───────────────────────────────────────────────────────────────────
esp_err_t ota_init(void) {
    // Mark current firmware as valid (cancel rollback timer)
    const esp_partition_t *running = esp_ota_get_running_partition();
    esp_ota_img_states_t ota_state;

    if (esp_ota_get_state_partition(running, &ota_state) == ESP_OK) {
        if (ota_state == ESP_OTA_IMG_PENDING_VERIFY) {
            ESP_LOGI(TAG, "First boot after OTA — confirming firmware valid");
            esp_ota_mark_app_valid_cancel_rollback();
        }
    }

    ESP_LOGI(TAG, "OTA subsystem initialized, running: %s", FIRMWARE_VERSION);
    return ESP_OK;
}

// ─── Check for Update ───────────────────────────────────────────────────────
bool ota_check_for_update(const char *api_key, ota_firmware_info_t *info) {
    if (!api_key || !info) return false;

    char url[256];
    snprintf(url, sizeof(url), "%s/api/device/firmware/check?current=%s",
             CONFIG_API_BASE_URL, FIRMWARE_VERSION);

    char response_buf[1024] = {0};
    http_response_t resp = { .buffer = response_buf, .len = 0, .max_len = 1024 };

    char auth_header[128];
    snprintf(auth_header, sizeof(auth_header), "Bearer %s", api_key);

    esp_http_client_config_t config = {
        .url = url,
        .method = HTTP_METHOD_GET,
        .timeout_ms = 10000,
        .event_handler = http_event_handler,
        .user_data = &resp,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Authorization", auth_header);

    esp_err_t err = esp_http_client_perform(client);
    int status = esp_http_client_get_status_code(client);
    esp_http_client_cleanup(client);

    if (err != ESP_OK || status != 200) {
        ESP_LOGW(TAG, "Update check failed: status=%d err=%d", status, err);
        return false;
    }

    // Parse response
    cJSON *json = cJSON_Parse(response_buf);
    if (!json) return false;

    cJSON *available = cJSON_GetObjectItem(json, "updateAvailable");
    if (!available || !cJSON_IsTrue(available)) {
        cJSON_Delete(json);
        return false;
    }

    // Extract firmware info
    cJSON *version = cJSON_GetObjectItem(json, "version");
    cJSON *download = cJSON_GetObjectItem(json, "downloadUrl");
    cJSON *sha256 = cJSON_GetObjectItem(json, "sha256");
    cJSON *size = cJSON_GetObjectItem(json, "size");
    cJSON *force = cJSON_GetObjectItem(json, "forceUpdate");

    if (!version || !download || !version->valuestring || !download->valuestring) {
        cJSON_Delete(json);
        return false;
    }

    // Verify it's actually newer
    if (compare_versions(version->valuestring, FIRMWARE_VERSION) <= 0) {
        ESP_LOGI(TAG, "Server version %s not newer than %s",
                 version->valuestring, FIRMWARE_VERSION);
        cJSON_Delete(json);
        return false;
    }

    strncpy(info->version, version->valuestring, sizeof(info->version) - 1);
    strncpy(info->download_url, download->valuestring, sizeof(info->download_url) - 1);

    if (sha256 && sha256->valuestring) {
        strncpy(info->sha256, sha256->valuestring, sizeof(info->sha256) - 1);
    }
    if (size) {
        info->size = (uint32_t)size->valuedouble;
    }
    info->force_update = (force && cJSON_IsTrue(force));

    ESP_LOGI(TAG, "Update available: %s → %s (%lu bytes)",
             FIRMWARE_VERSION, info->version, (unsigned long)info->size);

    cJSON_Delete(json);
    return true;
}

// ─── Perform OTA Update ─────────────────────────────────────────────────────
ota_result_t ota_perform_update(const ota_firmware_info_t *info) {
    if (!info || !info->download_url[0]) return OTA_RESULT_FAILED_DOWNLOAD;

    ESP_LOGI(TAG, "Starting OTA: downloading %s", info->version);

    // Find next OTA partition
    const esp_partition_t *update_partition = esp_ota_get_next_update_partition(NULL);
    if (!update_partition) {
        ESP_LOGE(TAG, "No OTA partition available");
        return OTA_RESULT_FAILED_WRITE;
    }

    ESP_LOGI(TAG, "Writing to partition: %s (offset 0x%lx)",
             update_partition->label, (unsigned long)update_partition->address);

    // Begin OTA
    esp_ota_handle_t ota_handle = 0;
    esp_err_t err = esp_ota_begin(update_partition, OTA_WITH_SEQUENTIAL_WRITES, &ota_handle);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "esp_ota_begin failed: %s", esp_err_to_name(err));
        return OTA_RESULT_FAILED_WRITE;
    }

    // Set up HTTPS download
    esp_http_client_config_t http_config = {
        .url = info->download_url,
        .timeout_ms = 30000,
    };

    esp_http_client_handle_t client = esp_http_client_init(&http_config);
    err = esp_http_client_open(client, 0);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "HTTP open failed: %s", esp_err_to_name(err));
        esp_ota_abort(ota_handle);
        esp_http_client_cleanup(client);
        return OTA_RESULT_FAILED_DOWNLOAD;
    }

    int content_length = esp_http_client_fetch_headers(client);
    if (content_length <= 0) {
        ESP_LOGE(TAG, "Invalid content length: %d", content_length);
        esp_ota_abort(ota_handle);
        esp_http_client_cleanup(client);
        return OTA_RESULT_FAILED_DOWNLOAD;
    }

    // Download + write in chunks, computing SHA-256
    mbedtls_sha256_context sha_ctx;
    mbedtls_sha256_init(&sha_ctx);
    mbedtls_sha256_starts(&sha_ctx, 0); // 0 = SHA-256 (not 224)

    char *buf = malloc(OTA_BUF_SIZE);
    if (!buf) {
        esp_ota_abort(ota_handle);
        esp_http_client_cleanup(client);
        mbedtls_sha256_free(&sha_ctx);
        return OTA_RESULT_FAILED_DOWNLOAD;
    }

    int total_read = 0;
    int last_progress = -1;
    bool download_ok = true;

    while (total_read < content_length) {
        int read_len = esp_http_client_read(client, buf, OTA_BUF_SIZE);
        if (read_len < 0) {
            ESP_LOGE(TAG, "Read error at offset %d", total_read);
            download_ok = false;
            break;
        }
        if (read_len == 0) {
            // Connection closed early
            if (total_read < content_length) {
                ESP_LOGE(TAG, "Premature connection close: %d/%d", total_read, content_length);
                download_ok = false;
            }
            break;
        }

        // Write chunk to OTA partition
        err = esp_ota_write(ota_handle, buf, read_len);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "OTA write failed at offset %d: %s", total_read, esp_err_to_name(err));
            download_ok = false;
            break;
        }

        // Update SHA-256
        mbedtls_sha256_update(&sha_ctx, (unsigned char *)buf, read_len);

        total_read += read_len;

        // Progress log every 10%
        int progress = (total_read * 100) / content_length;
        if (progress / 10 != last_progress / 10) {
            ESP_LOGI(TAG, "OTA progress: %d%% (%d/%d)", progress, total_read, content_length);
            last_progress = progress;
        }
    }

    free(buf);
    esp_http_client_close(client);
    esp_http_client_cleanup(client);

    if (!download_ok) {
        esp_ota_abort(ota_handle);
        mbedtls_sha256_free(&sha_ctx);
        return OTA_RESULT_FAILED_DOWNLOAD;
    }

    // Verify SHA-256 if provided
    if (info->sha256[0]) {
        unsigned char sha_result[32];
        mbedtls_sha256_finish(&sha_ctx, sha_result);
        mbedtls_sha256_free(&sha_ctx);

        char sha_hex[65];
        for (int i = 0; i < 32; i++) {
            snprintf(sha_hex + (i * 2), 3, "%02x", sha_result[i]);
        }

        if (strcasecmp(sha_hex, info->sha256) != 0) {
            ESP_LOGE(TAG, "SHA-256 mismatch!");
            ESP_LOGE(TAG, "  Expected: %s", info->sha256);
            ESP_LOGE(TAG, "  Got:      %s", sha_hex);
            esp_ota_abort(ota_handle);
            return OTA_RESULT_FAILED_VALIDATE;
        }

        ESP_LOGI(TAG, "SHA-256 verified OK");
    } else {
        mbedtls_sha256_free(&sha_ctx);
    }

    // Finalize OTA
    err = esp_ota_end(ota_handle);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "esp_ota_end failed: %s", esp_err_to_name(err));
        return OTA_RESULT_FAILED_VALIDATE;
    }

    // Set boot partition
    err = esp_ota_set_boot_partition(update_partition);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set boot partition: %s", esp_err_to_name(err));
        return OTA_RESULT_FAILED_WRITE;
    }

    ESP_LOGI(TAG, "OTA update successful! Version %s ready. Restart to apply.", info->version);
    return OTA_RESULT_UPDATED;
}

// ─── Get Running Version ────────────────────────────────────────────────────
const char *ota_get_running_version(void) {
    return FIRMWARE_VERSION;
}

// ─── Restart ────────────────────────────────────────────────────────────────
void ota_restart(void) {
    ESP_LOGW(TAG, "Restarting to apply OTA update...");
    vTaskDelay(pdMS_TO_TICKS(1000)); // Brief delay for log flush
    esp_restart();
}

// ─── Rollback ───────────────────────────────────────────────────────────────
esp_err_t ota_rollback(void) {
    ESP_LOGW(TAG, "Rolling back to previous firmware...");

    esp_err_t err = esp_ota_mark_app_invalid_rollback_and_reboot();
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Rollback failed: %s", esp_err_to_name(err));
    }
    return err;
}
