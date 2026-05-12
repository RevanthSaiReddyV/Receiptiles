idf_component_register(
    SRCS "ota_updater.c"
    INCLUDE_DIRS "include"
    REQUIRES esp_https_ota esp_http_client app_update mbedtls cJSON json nvs_flash
)
