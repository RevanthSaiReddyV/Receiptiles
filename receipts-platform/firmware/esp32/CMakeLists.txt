cmake_minimum_required(VERSION 3.16)

set(EXTRA_COMPONENT_DIRS
    components/escpos_parser
    components/nfc_driver
    components/api_client
    components/ota
)

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(receipt_interceptor)
