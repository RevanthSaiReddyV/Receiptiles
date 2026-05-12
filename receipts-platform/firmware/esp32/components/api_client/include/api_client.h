#pragma once

#include "esp_err.h"
#include "escpos_parser.h"

/**
 * API Client for communicating with the Receipts Platform cloud.
 */

typedef struct {
    bool success;
    char receipt_id[64];
    char error[128];
} api_upload_result_t;

/**
 * Register this device with the cloud (first-boot provisioning).
 * Stores the returned API key in out_key.
 */
esp_err_t api_register_device(char *out_key, size_t key_len);

/**
 * Upload a parsed receipt to the cloud.
 */
api_upload_result_t api_upload_receipt(const char *api_key, const receipt_data_t *receipt);

/**
 * Request NFC handover token for a receipt.
 * Returns the claim URL in out_url.
 */
esp_err_t api_get_nfc_handover(const char *api_key, const char *receipt_id,
                               char *out_url, size_t url_len);

/**
 * Send heartbeat to cloud (device health check).
 */
esp_err_t api_send_heartbeat(const char *api_key, uint32_t free_heap,
                             uint32_t uptime_sec, int queue_depth);
