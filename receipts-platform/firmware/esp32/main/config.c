/**
 * NVS-based configuration storage for device API key and settings.
 */

#include <string.h>
#include "nvs_flash.h"
#include "nvs.h"
#include "esp_log.h"
#include "config.h"

static const char *TAG = "config";
static const char *NVS_NAMESPACE = "receipt_cfg";
static const char *KEY_API_KEY = "api_key";

void config_load_api_key(char *out_key, size_t max_len) {
    nvs_handle_t handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &handle);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "NVS namespace not found (first boot?)");
        out_key[0] = '\0';
        return;
    }

    size_t required_size = max_len;
    err = nvs_get_str(handle, KEY_API_KEY, out_key, &required_size);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "No API key in NVS");
        out_key[0] = '\0';
    } else {
        ESP_LOGI(TAG, "Loaded API key (length: %d)", (int)strlen(out_key));
    }

    nvs_close(handle);
}

void config_save_api_key(const char *key) {
    nvs_handle_t handle;
    ESP_ERROR_CHECK(nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle));
    ESP_ERROR_CHECK(nvs_set_str(handle, KEY_API_KEY, key));
    ESP_ERROR_CHECK(nvs_commit(handle));
    nvs_close(handle);
    ESP_LOGI(TAG, "API key saved to NVS");
}
