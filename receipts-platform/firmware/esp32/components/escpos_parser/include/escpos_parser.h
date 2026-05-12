#pragma once

#include <stdint.h>
#include <stdbool.h>

#define ESCPOS_MAX_MERCHANT_LEN  128
#define ESCPOS_MAX_ITEM_NAME     128
#define ESCPOS_MAX_ITEMS         64
#define ESCPOS_MAX_LINE_LEN      80
#define ESCPOS_MAX_LINES         200

// ─── ESC/POS Commands We Care About ─────────────────────────────────────────
#define ESC  0x1B
#define GS   0x1D
#define LF   0x0A
#define CR   0x0D
#define CUT  0x6D  // GS V (paper cut)
#define FF   0x0C  // Form feed (some printers use as receipt end)

// ─── Parse Results ───────────────────────────────────────────────────────────
typedef enum {
    ESCPOS_FEEDING,          // Still receiving data
    ESCPOS_RECEIPT_COMPLETE, // Full receipt parsed (cut command received)
    ESCPOS_ERROR,            // Parse error
} escpos_parse_result_t;

// ─── Receipt Item ────────────────────────────────────────────────────────────
typedef struct {
    char name[ESCPOS_MAX_ITEM_NAME];
    float quantity;
    float unit_price;
    float total_price;
} receipt_item_t;

// ─── Parsed Receipt ──────────────────────────────────────────────────────────
typedef struct {
    char merchant_name[ESCPOS_MAX_MERCHANT_LEN];
    char merchant_location[ESCPOS_MAX_MERCHANT_LEN];
    char transaction_id[64];
    char timestamp[32];    // ISO 8601 or raw from receipt

    receipt_item_t items[ESCPOS_MAX_ITEMS];
    int item_count;

    float subtotal;
    float tax;
    float tip;
    float discount;
    float total;

    char payment_method[32];  // "VISA", "MASTERCARD", "CASH", etc.
    char card_last4[5];

    int retry_count;       // For upload retry tracking
} receipt_data_t;

// ─── Parser State ────────────────────────────────────────────────────────────
typedef struct {
    // Raw line buffer
    char line_buf[ESCPOS_MAX_LINE_LEN];
    int line_pos;

    // All text lines extracted
    char lines[ESCPOS_MAX_LINES][ESCPOS_MAX_LINE_LEN];
    int line_count;

    // ESC/POS state machine
    bool in_escape;
    bool in_gs;
    uint8_t escape_cmd;
    int escape_params_remaining;

    // Text formatting state (helps identify headers/totals)
    bool bold_active;
    bool double_width;
    bool double_height;
    int alignment; // 0=left, 1=center, 2=right

    // Receipt boundary detection
    bool receipt_started;
    uint32_t last_byte_time;
    int idle_count;
} escpos_parser_t;

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Initialize parser state.
 */
void escpos_parser_init(escpos_parser_t *parser);

/**
 * Reset parser for next receipt.
 */
void escpos_parser_reset(escpos_parser_t *parser);

/**
 * Feed a single byte to the parser.
 * Returns ESCPOS_RECEIPT_COMPLETE when paper cut detected.
 */
escpos_parse_result_t escpos_parser_feed(escpos_parser_t *parser, uint8_t byte);

/**
 * Extract structured receipt from accumulated lines.
 * Returns heap-allocated receipt_data_t (caller must free).
 * Returns NULL if parsing fails.
 */
receipt_data_t *escpos_parser_get_receipt(escpos_parser_t *parser);
