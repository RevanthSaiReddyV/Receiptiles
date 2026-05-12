idf_component_register(
    SRCS "main.c" "config.c"
    INCLUDE_DIRS "."
    REQUIRES
        escpos_parser
        nfc_driver
        api_client
        ota
        nvs_flash
        esp_wifi
        esp_event
        esp_netif
        esp_http_client
        driver
)
