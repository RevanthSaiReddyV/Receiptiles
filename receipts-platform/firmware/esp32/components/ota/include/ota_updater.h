#pragma once

#include "esp_err.h"

/**
 * OTA (Over-The-Air) Firmware Updater
 *
 * Checks for firmware updates from the receipts platform cloud,
 * downloads and applies them using ESP32 dual-partition OTA scheme.
 *
 * Flow:
 * 1. GET /api/device/firmware/check → returns latest version + download URL
 * 2. Compare with running firmware version
 * 3. If newer: download binary via HTTPS, write to inactive partition
 * 4. Validate checksum, set boot partition, restart
 * 5. On first boot after update: confirm good (or rollback on failure)
 */

/**
 * OTA update result codes
 */
typedef enum {
    OTA_RESULT_UP_TO_DATE,      // Already running latest version
    OTA_RESULT_UPDATED,         // Successfully updated, pending reboot
    OTA_RESULT_FAILED_CHECK,    // Failed to check for updates
    OTA_RESULT_FAILED_DOWNLOAD, // Failed to download firmware
    OTA_RESULT_FAILED_VALIDATE, // Downloaded firmware failed validation
    OTA_RESULT_FAILED_WRITE,    // Failed to write to OTA partition
} ota_result_t;

/**
 * Firmware version info from cloud
 */
typedef struct {
    char version[32];
    char download_url[256];
    char sha256[65];
    uint32_t size;
    bool force_update;
} ota_firmware_info_t;

/**
 * Initialize OTA subsystem.
 * Marks the current firmware as valid (confirms boot after update).
 */
esp_err_t ota_init(void);

/**
 * Check for available firmware update.
 * Queries the cloud API and populates info struct.
 *
 * @param api_key   Device API key for authentication
 * @param info      Output: available firmware info (if update exists)
 * @return true if an update is available, false otherwise
 */
bool ota_check_for_update(const char *api_key, ota_firmware_info_t *info);

/**
 * Perform OTA update with the given firmware info.
 * Downloads, validates, and writes to inactive partition.
 * Does NOT restart — caller should restart when safe.
 *
 * @param info  Firmware info from ota_check_for_update()
 * @return OTA result code
 */
ota_result_t ota_perform_update(const ota_firmware_info_t *info);

/**
 * Get the currently running firmware version string.
 */
const char *ota_get_running_version(void);

/**
 * Trigger a system restart to boot into new firmware.
 * Should be called after ota_perform_update() returns OTA_RESULT_UPDATED.
 */
void ota_restart(void);

/**
 * Rollback to previous firmware partition.
 * Only valid if the current boot is unconfirmed.
 */
esp_err_t ota_rollback(void);
