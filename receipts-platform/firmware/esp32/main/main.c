/**
 * Receipt Interceptor — ESP32-S3 Main Application
 *
 * Sits inline between POS and thermal printer. Sniffs ESC/POS protocol,
 * parses receipts, uploads to cloud API, and delivers to consumers via NFC.
 */

#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "esp_log.h"
#include "esp_system.h"
#include "nvs_flash.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "driver/uart.h"
#include "driver/gpio.h"

#include "config.h"
#include "escpos_parser.h"
#include "nfc_driver.h"
#include "api_client.h"
#include "ota_updater.h"

static const char *TAG = "receipt_main";

// ─── Global State ────────────────────────────────────────────────────────────
static QueueHandle_t receipt_queue;
static bool wifi_connected = false;
static char device_api_key[96] = {0};

// ─── WiFi Event Handler ──────────────────────────────────────────────────────
static void wifi_event_handler(void *arg, esp_event_base_t event_base,
                               int32_t event_id, void *event_data) {
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        wifi_connected = false;
        ESP_LOGW(TAG, "WiFi disconnected, reconnecting...");
        esp_wifi_connect();
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        ESP_LOGI(TAG, "Connected! IP: " IPSTR, IP2STR(&event->ip_info.ip));
        wifi_connected = true;
    }
}

static void wifi_init(void) {
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, &instance_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, &instance_got_ip));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = CONFIG_WIFI_SSID,
            .password = CONFIG_WIFI_PASSWORD,
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "WiFi initialized, connecting to %s", CONFIG_WIFI_SSID);
}

// ─── POS UART Sniff Task ─────────────────────────────────────────────────────
// Reads raw bytes from POS, passes through to printer, feeds parser
static void pos_sniff_task(void *pvParameters) {
    // Configure UART1 for POS sniffing
    uart_config_t uart_config = {
        .baud_rate = POS_UART_BAUD,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
    };
    ESP_ERROR_CHECK(uart_param_config(POS_UART_NUM, &uart_config));
    ESP_ERROR_CHECK(uart_set_pin(POS_UART_NUM, PIN_PRINTER_TX, PIN_POS_RX,
                                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));
    ESP_ERROR_CHECK(uart_driver_install(POS_UART_NUM, POS_UART_BUF_SIZE * 2,
                                        POS_UART_BUF_SIZE, 0, NULL, 0));

    uint8_t buf[256];
    escpos_parser_t parser;
    escpos_parser_init(&parser);

    ESP_LOGI(TAG, "POS sniff task started (baud: %d)", POS_UART_BAUD);

    while (1) {
        int len = uart_read_bytes(POS_UART_NUM, buf, sizeof(buf), 20 / portTICK_PERIOD_MS);
        if (len > 0) {
            // Pass through to printer (transparent relay)
            uart_write_bytes(POS_UART_NUM, buf, len);

            // Feed bytes to parser
            for (int i = 0; i < len; i++) {
                escpos_parse_result_t result = escpos_parser_feed(&parser, buf[i]);

                if (result == ESCPOS_RECEIPT_COMPLETE) {
                    // Receipt fully parsed — extract and queue
                    receipt_data_t *receipt = escpos_parser_get_receipt(&parser);
                    if (receipt != NULL) {
                        ESP_LOGI(TAG, "Receipt parsed: %s, $%.2f, %d items",
                                 receipt->merchant_name, receipt->total, receipt->item_count);

                        if (xQueueSend(receipt_queue, &receipt, 0) != pdPASS) {
                            ESP_LOGW(TAG, "Receipt queue full, dropping oldest");
                            receipt_data_t *dropped;
                            xQueueReceive(receipt_queue, &dropped, 0);
                            free(dropped);
                            xQueueSend(receipt_queue, &receipt, 0);
                        }
                    }
                    escpos_parser_reset(&parser);
                }
            }
        }
    }
}

// ─── Upload Task ─────────────────────────────────────────────────────────────
// Dequeues parsed receipts and uploads to cloud API
static void upload_task(void *pvParameters) {
    receipt_data_t *receipt;

    ESP_LOGI(TAG, "Upload task started");

    while (1) {
        if (xQueueReceive(receipt_queue, &receipt, portMAX_DELAY) == pdPASS) {
            if (!wifi_connected) {
                ESP_LOGW(TAG, "No WiFi — re-queueing receipt");
                xQueueSend(receipt_queue, &receipt, 0);
                vTaskDelay(pdMS_TO_TICKS(5000));
                continue;
            }

            // Upload to API
            api_upload_result_t result = api_upload_receipt(device_api_key, receipt);

            if (result.success) {
                ESP_LOGI(TAG, "Receipt uploaded: %s (id: %s)",
                         receipt->merchant_name, result.receipt_id);

                // Trigger NFC handover
                if (result.receipt_id[0] != '\0') {
                    char claim_url[256];
                    if (api_get_nfc_handover(device_api_key, result.receipt_id,
                                            claim_url, sizeof(claim_url)) == ESP_OK) {
                        nfc_broadcast_url(claim_url, NFC_BROADCAST_MS);
                        ESP_LOGI(TAG, "NFC broadcasting: %s", claim_url);
                    }
                }
            } else {
                ESP_LOGE(TAG, "Upload failed: %s", result.error);
                // Retry logic
                if (receipt->retry_count < UPLOAD_RETRY_MAX) {
                    receipt->retry_count++;
                    vTaskDelay(pdMS_TO_TICKS(UPLOAD_RETRY_DELAY));
                    xQueueSend(receipt_queue, &receipt, 0);
                    continue;
                }
            }

            free(receipt);
        }
    }
}

// ─── Heartbeat Task ──────────────────────────────────────────────────────────
static void heartbeat_task(void *pvParameters) {
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(HEARTBEAT_INTERVAL));

        if (wifi_connected && device_api_key[0] != '\0') {
            api_send_heartbeat(device_api_key,
                              esp_get_free_heap_size(),
                              xTaskGetTickCount() * portTICK_PERIOD_MS / 1000,
                              uxQueueMessagesWaiting(receipt_queue));
        }
    }
}

// ─── OTA Check Task ──────────────────────────────────────────────────────────
static void ota_task(void *pvParameters) {
    // Wait for initial network connection
    vTaskDelay(pdMS_TO_TICKS(30000));

    while (1) {
        if (wifi_connected) {
            ESP_LOGI(TAG, "Checking for OTA updates...");
            ota_check_and_update();
        }
        vTaskDelay(pdMS_TO_TICKS(OTA_CHECK_INTERVAL));
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────
void app_main(void) {
    ESP_LOGI(TAG, "=== Receipt Interceptor v1.0.0 ===");
    ESP_LOGI(TAG, "Free heap: %lu bytes", esp_get_free_heap_size());

    // Initialize NVS (for WiFi credentials + device key)
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    // Load or provision device API key
    config_load_api_key(device_api_key, sizeof(device_api_key));

    // Create receipt queue
    receipt_queue = xQueueCreate(RECEIPT_QUEUE_SIZE, sizeof(receipt_data_t *));
    assert(receipt_queue != NULL);

    // Initialize WiFi
    wifi_init();

    // Wait for WiFi before provisioning
    int wait_count = 0;
    while (!wifi_connected && wait_count < 100) {
        vTaskDelay(pdMS_TO_TICKS(100));
        wait_count++;
    }

    // If no API key stored, register with cloud
    if (device_api_key[0] == '\0' && wifi_connected) {
        ESP_LOGI(TAG, "No API key found — provisioning device...");
        if (api_register_device(device_api_key, sizeof(device_api_key)) == ESP_OK) {
            config_save_api_key(device_api_key);
            ESP_LOGI(TAG, "Device provisioned successfully");
        } else {
            ESP_LOGE(TAG, "Provisioning failed — will retry on next boot");
        }
    }

    // Initialize NFC module
    nfc_init();

    // Start tasks
    xTaskCreatePinnedToCore(pos_sniff_task, "pos_sniff", 8192, NULL, 5, NULL, 0);
    xTaskCreatePinnedToCore(upload_task, "upload", 8192, NULL, 4, NULL, 1);
    xTaskCreate(heartbeat_task, "heartbeat", 4096, NULL, 2, NULL);
    xTaskCreate(ota_task, "ota", 8192, NULL, 1, NULL);

    ESP_LOGI(TAG, "All tasks started. Monitoring POS traffic...");
}
