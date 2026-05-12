/**
 * HTTPS API Client — communicates with receipts platform device endpoints.
 */

#include <string.h>
#include <stdio.h>
#include "esp_http_client.h"
#include "esp_log.h"
#include "esp_system.h"
#include "cJSON.h"
#include "api_client.h"

static const char *TAG = "api_client";

#ifndef CONFIG_API_BASE_URL
#define CONFIG_API_BASE_URL "https://receipts.app"
#endif

#ifndef CONFIG_DEVICE_PROVISION_KEY
#define CONFIG_DEVICE_PROVISION_KEY ""
#endif

#define API_TIMEOUT_MS 10000
#define MAX_RESPONSE_SIZE 2048

// ─── HTTP Response Buffer ────────────────────────────────────────────────────
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

// ─── Device Registration ─────────────────────────────────────────────────────
esp_err_t api_register_device(char *out_key, size_t key_len) {
    char url[256];
    snprintf(url, sizeof(url), "%s/api/device/register", CONFIG_API_BASE_URL);

    // Get device serial (MAC address as serial)
    uint8_t mac[6];
    esp_efuse_mac_get_default(mac);
    char serial[18];
    snprintf(serial, sizeof(serial), "%02X%02X%02X%02X%02X%02X",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

    // Build request body
    cJSON *body = cJSON_CreateObject();
    cJSON_AddStringToObject(body, "serial", serial);
    cJSON_AddStringToObject(body, "firmware", "1.0.0");
    cJSON_AddStringToObject(body, "posType", "thermal");
    cJSON_AddStringToObject(body, "connectionType", "serial");
    char *body_str = cJSON_PrintUnformatted(body);

    char response_buf[MAX_RESPONSE_SIZE] = {0};
    http_response_t resp = { .buffer = response_buf, .len = 0, .max_len = MAX_RESPONSE_SIZE };

    // Auth header with provisioning key
    char auth_header[128];
    snprintf(auth_header, sizeof(auth_header), "Bearer %s", CONFIG_DEVICE_PROVISION_KEY);

    esp_http_client_config_t config = {
        .url = url,
        .method = HTTP_METHOD_POST,
        .timeout_ms = API_TIMEOUT_MS,
        .event_handler = http_event_handler,
        .user_data = &resp,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_header(client, "Authorization", auth_header);
    esp_http_client_set_post_field(client, body_str, strlen(body_str));

    esp_err_t err = esp_http_client_perform(client);
    int status = esp_http_client_get_status_code(client);

    if (err == ESP_OK && status == 201) {
        // Parse response to get API key
        cJSON *json = cJSON_Parse(response_buf);
        if (json) {
            cJSON *api_key = cJSON_GetObjectItem(json, "apiKey");
            if (api_key && api_key->valuestring) {
                strncpy(out_key, api_key->valuestring, key_len - 1);
                ESP_LOGI(TAG, "Device registered, key prefix: %.10s...", out_key);
            }
            cJSON_Delete(json);
        }
    } else {
        ESP_LOGE(TAG, "Registration failed: status=%d, err=%d", status, err);
        err = ESP_FAIL;
    }

    esp_http_client_cleanup(client);
    cJSON_free(body_str);
    cJSON_Delete(body);
    return err;
}

// ─── Upload Receipt ──────────────────────────────────────────────────────────
api_upload_result_t api_upload_receipt(const char *api_key, const receipt_data_t *receipt) {
    api_upload_result_t result = { .success = false };

    char url[256];
    snprintf(url, sizeof(url), "%s/api/device/receipts", CONFIG_API_BASE_URL);

    // Build JSON body
    cJSON *body = cJSON_CreateObject();
    cJSON_AddStringToObject(body, "merchantName", receipt->merchant_name);
    if (receipt->merchant_location[0])
        cJSON_AddStringToObject(body, "merchantLocation", receipt->merchant_location);
    if (receipt->transaction_id[0])
        cJSON_AddStringToObject(body, "transactionId", receipt->transaction_id);
    if (receipt->timestamp[0])
        cJSON_AddStringToObject(body, "timestamp", receipt->timestamp);

    cJSON_AddNumberToObject(body, "subtotal", receipt->subtotal);
    cJSON_AddNumberToObject(body, "tax", receipt->tax);
    cJSON_AddNumberToObject(body, "tip", receipt->tip);
    cJSON_AddNumberToObject(body, "discount", receipt->discount);
    cJSON_AddNumberToObject(body, "total", receipt->total);

    if (receipt->payment_method[0])
        cJSON_AddStringToObject(body, "paymentMethod", receipt->payment_method);
    if (receipt->card_last4[0])
        cJSON_AddStringToObject(body, "cardLast4", receipt->card_last4);

    // Add items array
    cJSON *items = cJSON_CreateArray();
    for (int i = 0; i < receipt->item_count; i++) {
        cJSON *item = cJSON_CreateObject();
        cJSON_AddStringToObject(item, "name", receipt->items[i].name);
        cJSON_AddNumberToObject(item, "quantity", receipt->items[i].quantity);
        cJSON_AddNumberToObject(item, "unitPrice", receipt->items[i].unit_price);
        cJSON_AddNumberToObject(item, "totalPrice", receipt->items[i].total_price);
        cJSON_AddItemToArray(items, item);
    }
    cJSON_AddItemToObject(body, "items", items);

    char *body_str = cJSON_PrintUnformatted(body);

    char response_buf[MAX_RESPONSE_SIZE] = {0};
    http_response_t resp = { .buffer = response_buf, .len = 0, .max_len = MAX_RESPONSE_SIZE };

    char auth_header[128];
    snprintf(auth_header, sizeof(auth_header), "Bearer %s", api_key);

    esp_http_client_config_t config = {
        .url = url,
        .method = HTTP_METHOD_POST,
        .timeout_ms = API_TIMEOUT_MS,
        .event_handler = http_event_handler,
        .user_data = &resp,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_header(client, "Authorization", auth_header);
    esp_http_client_set_post_field(client, body_str, strlen(body_str));

    esp_err_t err = esp_http_client_perform(client);
    int status = esp_http_client_get_status_code(client);

    if (err == ESP_OK && status == 200) {
        cJSON *json = cJSON_Parse(response_buf);
        if (json) {
            cJSON *results = cJSON_GetObjectItem(json, "results");
            if (results && cJSON_IsArray(results) && cJSON_GetArraySize(results) > 0) {
                cJSON *first = cJSON_GetArrayItem(results, 0);
                cJSON *rid = cJSON_GetObjectItem(first, "receiptId");
                if (rid && rid->valuestring) {
                    strncpy(result.receipt_id, rid->valuestring, 63);
                }
                result.success = true;
            }
            cJSON_Delete(json);
        }
    } else {
        snprintf(result.error, sizeof(result.error), "HTTP %d (err=%d)", status, err);
    }

    esp_http_client_cleanup(client);
    cJSON_free(body_str);
    cJSON_Delete(body);
    return result;
}

// ─── NFC Handover ────────────────────────────────────────────────────────────
esp_err_t api_get_nfc_handover(const char *api_key, const char *receipt_id,
                               char *out_url, size_t url_len) {
    char url[256];
    snprintf(url, sizeof(url), "%s/api/device/nfc-handover", CONFIG_API_BASE_URL);

    cJSON *body = cJSON_CreateObject();
    cJSON_AddStringToObject(body, "receiptId", receipt_id);
    char *body_str = cJSON_PrintUnformatted(body);

    char response_buf[MAX_RESPONSE_SIZE] = {0};
    http_response_t resp = { .buffer = response_buf, .len = 0, .max_len = MAX_RESPONSE_SIZE };

    char auth_header[128];
    snprintf(auth_header, sizeof(auth_header), "Bearer %s", api_key);

    esp_http_client_config_t config = {
        .url = url,
        .method = HTTP_METHOD_POST,
        .timeout_ms = API_TIMEOUT_MS,
        .event_handler = http_event_handler,
        .user_data = &resp,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_header(client, "Authorization", auth_header);
    esp_http_client_set_post_field(client, body_str, strlen(body_str));

    esp_err_t err = esp_http_client_perform(client);
    int status = esp_http_client_get_status_code(client);

    if (err == ESP_OK && status == 200) {
        cJSON *json = cJSON_Parse(response_buf);
        if (json) {
            cJSON *claim_url = cJSON_GetObjectItem(json, "claimUrl");
            if (claim_url && claim_url->valuestring) {
                strncpy(out_url, claim_url->valuestring, url_len - 1);
                err = ESP_OK;
            }
            cJSON_Delete(json);
        }
    } else {
        err = ESP_FAIL;
    }

    esp_http_client_cleanup(client);
    cJSON_free(body_str);
    cJSON_Delete(body);
    return err;
}

// ─── Heartbeat ───────────────────────────────────────────────────────────────
esp_err_t api_send_heartbeat(const char *api_key, uint32_t free_heap,
                             uint32_t uptime_sec, int queue_depth) {
    char url[256];
    snprintf(url, sizeof(url), "%s/api/device/heartbeat", CONFIG_API_BASE_URL);

    cJSON *body = cJSON_CreateObject();
    cJSON_AddNumberToObject(body, "freeHeap", free_heap);
    cJSON_AddNumberToObject(body, "uptimeSeconds", uptime_sec);
    cJSON_AddNumberToObject(body, "queueDepth", queue_depth);
    cJSON_AddStringToObject(body, "firmware", "1.0.0");
    char *body_str = cJSON_PrintUnformatted(body);

    char auth_header[128];
    snprintf(auth_header, sizeof(auth_header), "Bearer %s", api_key);

    esp_http_client_config_t config = {
        .url = url,
        .method = HTTP_METHOD_POST,
        .timeout_ms = 5000,
        .event_handler = NULL,
        .user_data = NULL,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_header(client, "Authorization", auth_header);
    esp_http_client_set_post_field(client, body_str, strlen(body_str));

    esp_err_t err = esp_http_client_perform(client);

    esp_http_client_cleanup(client);
    cJSON_free(body_str);
    cJSON_Delete(body);
    return err;
}
