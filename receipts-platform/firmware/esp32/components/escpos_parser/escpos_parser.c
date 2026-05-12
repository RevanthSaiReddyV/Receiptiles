/**
 * ESC/POS Protocol Parser
 *
 * Parses the byte stream between POS and thermal printer to extract:
 * - Merchant name (usually first bold/centered line)
 * - Line items (pattern: name + price on same line or adjacent)
 * - Totals (SUBTOTAL, TAX, TOTAL, TIP keywords)
 * - Payment info (VISA, MC, AMEX, CASH + last 4 digits)
 * - Transaction ID, timestamp
 *
 * Receipt boundaries detected via GS V (paper cut) command.
 */

#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <stdio.h>
#include "escpos_parser.h"
#include "esp_log.h"

static const char *TAG = "escpos";

// ─── Helper: trim whitespace ─────────────────────────────────────────────────
static void trim(char *str) {
    char *end;
    while (isspace((unsigned char)*str)) str++;
    if (*str == 0) return;
    end = str + strlen(str) - 1;
    while (end > str && isspace((unsigned char)*end)) end--;
    end[1] = '\0';
}

// ─── Helper: check if line is likely a price ─────────────────────────────────
static bool looks_like_price(const char *str) {
    // Match patterns: $12.34, 12.34, $1,234.56
    while (*str && isspace((unsigned char)*str)) str++;
    if (*str == '$' || *str == '-') str++;
    bool has_dot = false;
    int digits = 0;
    while (*str) {
        if (isdigit((unsigned char)*str)) digits++;
        else if (*str == '.') has_dot = true;
        else if (*str != ',' && !isspace((unsigned char)*str)) return false;
        str++;
    }
    return digits > 0 && has_dot;
}

// ─── Helper: extract price from string ───────────────────────────────────────
static float extract_price(const char *str) {
    while (*str && !isdigit((unsigned char)*str) && *str != '-' && *str != '$') str++;
    bool negative = false;
    if (*str == '-') { negative = true; str++; }
    if (*str == '$') str++;
    if (*str == '-') { negative = true; str++; }

    char clean[32] = {0};
    int ci = 0;
    while (*str && ci < 30) {
        if (isdigit((unsigned char)*str) || *str == '.') {
            clean[ci++] = *str;
        }
        str++;
    }
    float val = atof(clean);
    return negative ? -val : val;
}

// ─── Helper: check for keyword match (case-insensitive) ─────────────────────
static bool contains_keyword(const char *line, const char *keyword) {
    char lower_line[ESCPOS_MAX_LINE_LEN];
    strncpy(lower_line, line, sizeof(lower_line) - 1);
    for (int i = 0; lower_line[i]; i++) lower_line[i] = tolower(lower_line[i]);

    char lower_key[32];
    strncpy(lower_key, keyword, sizeof(lower_key) - 1);
    for (int i = 0; lower_key[i]; i++) lower_key[i] = tolower(lower_key[i]);

    return strstr(lower_line, lower_key) != NULL;
}

// ─── Init ────────────────────────────────────────────────────────────────────
void escpos_parser_init(escpos_parser_t *parser) {
    memset(parser, 0, sizeof(escpos_parser_t));
}

void escpos_parser_reset(escpos_parser_t *parser) {
    parser->line_pos = 0;
    parser->line_count = 0;
    parser->in_escape = false;
    parser->in_gs = false;
    parser->escape_params_remaining = 0;
    parser->bold_active = false;
    parser->double_width = false;
    parser->double_height = false;
    parser->alignment = 0;
    parser->receipt_started = false;
}

// ─── Feed byte ───────────────────────────────────────────────────────────────
escpos_parse_result_t escpos_parser_feed(escpos_parser_t *parser, uint8_t byte) {
    // Handle ESC sequences (ESC + command + params)
    if (parser->in_escape) {
        parser->escape_cmd = byte;
        parser->in_escape = false;

        switch (byte) {
            case 'E': // ESC E n — Bold on/off (1 param)
                parser->escape_params_remaining = 1;
                break;
            case 'a': // ESC a n — Alignment (1 param)
                parser->escape_params_remaining = 1;
                break;
            case '!': // ESC ! n — Print mode (1 param, has bold/double flags)
                parser->escape_params_remaining = 1;
                break;
            case '@': // ESC @ — Initialize printer (receipt start)
                parser->receipt_started = true;
                parser->escape_params_remaining = 0;
                break;
            default:
                parser->escape_params_remaining = 0;
                break;
        }
        return ESCPOS_FEEDING;
    }

    // Handle remaining escape params
    if (parser->escape_params_remaining > 0) {
        parser->escape_params_remaining--;
        // Capture formatting state
        if (parser->escape_cmd == 'E') {
            parser->bold_active = (byte != 0);
        } else if (parser->escape_cmd == 'a') {
            parser->alignment = byte; // 0=left, 1=center, 2=right
        } else if (parser->escape_cmd == '!') {
            parser->bold_active = (byte & 0x08) != 0;
            parser->double_width = (byte & 0x20) != 0;
            parser->double_height = (byte & 0x10) != 0;
        }
        return ESCPOS_FEEDING;
    }

    // Handle GS sequences
    if (parser->in_gs) {
        parser->in_gs = false;
        if (byte == 'V' || byte == CUT) {
            // Paper cut = receipt complete
            // Flush current line if any
            if (parser->line_pos > 0 && parser->line_count < ESCPOS_MAX_LINES) {
                parser->line_buf[parser->line_pos] = '\0';
                strncpy(parser->lines[parser->line_count],
                        parser->line_buf, ESCPOS_MAX_LINE_LEN - 1);
                parser->line_count++;
                parser->line_pos = 0;
            }
            return ESCPOS_RECEIPT_COMPLETE;
        }
        // Other GS commands — skip param byte
        parser->escape_params_remaining = 1;
        return ESCPOS_FEEDING;
    }

    // Detect command prefixes
    if (byte == ESC) {
        parser->in_escape = true;
        return ESCPOS_FEEDING;
    }
    if (byte == GS) {
        parser->in_gs = true;
        return ESCPOS_FEEDING;
    }

    // Line endings
    if (byte == LF || byte == CR) {
        if (parser->line_pos > 0 && parser->line_count < ESCPOS_MAX_LINES) {
            parser->line_buf[parser->line_pos] = '\0';
            strncpy(parser->lines[parser->line_count],
                    parser->line_buf, ESCPOS_MAX_LINE_LEN - 1);
            parser->line_count++;
        }
        parser->line_pos = 0;
        return ESCPOS_FEEDING;
    }

    // Form feed = receipt boundary on some printers
    if (byte == FF) {
        if (parser->line_count > 3) {
            return ESCPOS_RECEIPT_COMPLETE;
        }
        return ESCPOS_FEEDING;
    }

    // Printable characters → accumulate
    if (byte >= 0x20 && byte < 0x7F) {
        if (parser->line_pos < ESCPOS_MAX_LINE_LEN - 1) {
            parser->line_buf[parser->line_pos++] = (char)byte;
        }
    }

    return ESCPOS_FEEDING;
}

// ─── Extract structured receipt from parsed lines ────────────────────────────
receipt_data_t *escpos_parser_get_receipt(escpos_parser_t *parser) {
    if (parser->line_count < 3) return NULL; // Too few lines

    receipt_data_t *receipt = calloc(1, sizeof(receipt_data_t));
    if (!receipt) return NULL;

    // ─── Pass 1: Identify merchant (usually first non-empty centered/bold line)
    for (int i = 0; i < parser->line_count && i < 5; i++) {
        char *line = parser->lines[i];
        trim(line);
        if (strlen(line) > 2 && strlen(line) < ESCPOS_MAX_MERCHANT_LEN) {
            // First substantial line is likely merchant name
            if (receipt->merchant_name[0] == '\0') {
                strncpy(receipt->merchant_name, line, ESCPOS_MAX_MERCHANT_LEN - 1);
            } else if (receipt->merchant_location[0] == '\0' &&
                       (strchr(line, ',') || isdigit((unsigned char)line[0]))) {
                // Second line with comma or starting with digit → address
                strncpy(receipt->merchant_location, line, ESCPOS_MAX_MERCHANT_LEN - 1);
            }
        }
    }

    // ─── Pass 2: Scan for totals, payment, items
    bool found_total = false;

    for (int i = 0; i < parser->line_count; i++) {
        char *line = parser->lines[i];
        trim(line);
        if (strlen(line) == 0) continue;

        // Check for total-related keywords
        if (contains_keyword(line, "subtotal") || contains_keyword(line, "sub total")) {
            receipt->subtotal = extract_price(line);
            continue;
        }
        if ((contains_keyword(line, "tax") || contains_keyword(line, "gst") ||
             contains_keyword(line, "hst")) && !contains_keyword(line, "pre-tax")) {
            receipt->tax = extract_price(line);
            continue;
        }
        if (contains_keyword(line, "tip") || contains_keyword(line, "gratuity")) {
            receipt->tip = extract_price(line);
            continue;
        }
        if (contains_keyword(line, "discount") || contains_keyword(line, "savings")) {
            receipt->discount = extract_price(line);
            if (receipt->discount > 0) receipt->discount = -receipt->discount; // Normalize to negative
            continue;
        }
        if ((contains_keyword(line, "total") || contains_keyword(line, "amount due") ||
             contains_keyword(line, "balance")) && !contains_keyword(line, "subtotal") &&
            !contains_keyword(line, "items")) {
            float price = extract_price(line);
            if (price > receipt->total) {
                receipt->total = price;
                found_total = true;
            }
            continue;
        }

        // Payment method detection
        if (contains_keyword(line, "visa") || contains_keyword(line, "mastercard") ||
            contains_keyword(line, "amex") || contains_keyword(line, "discover") ||
            contains_keyword(line, "debit") || contains_keyword(line, "credit")) {
            // Extract card type
            if (contains_keyword(line, "visa")) strncpy(receipt->payment_method, "VISA", 31);
            else if (contains_keyword(line, "mastercard") || contains_keyword(line, "mc"))
                strncpy(receipt->payment_method, "MASTERCARD", 31);
            else if (contains_keyword(line, "amex")) strncpy(receipt->payment_method, "AMEX", 31);
            else if (contains_keyword(line, "discover")) strncpy(receipt->payment_method, "DISCOVER", 31);
            else strncpy(receipt->payment_method, "CARD", 31);

            // Try to find last 4 digits (pattern: ****1234 or XXXX1234 or ...1234)
            const char *p = line;
            while (*p) {
                if ((*p == '*' || *p == 'X' || *p == 'x' || *p == '.') &&
                    isdigit((unsigned char)*(p + 1))) {
                    while (*p && !isdigit((unsigned char)*p)) p++;
                    if (strlen(p) >= 4) {
                        strncpy(receipt->card_last4, p, 4);
                        receipt->card_last4[4] = '\0';
                    }
                    break;
                }
                p++;
            }
            continue;
        }
        if (contains_keyword(line, "cash")) {
            strncpy(receipt->payment_method, "CASH", 31);
            continue;
        }

        // Transaction ID patterns
        if (contains_keyword(line, "trans") || contains_keyword(line, "ref") ||
            contains_keyword(line, "auth")) {
            // Extract alphanumeric ID after keyword
            char *colon = strchr(line, ':');
            char *hash = strchr(line, '#');
            char *start = colon ? colon + 1 : (hash ? hash + 1 : NULL);
            if (start) {
                while (*start && isspace((unsigned char)*start)) start++;
                strncpy(receipt->transaction_id, start, 63);
                trim(receipt->transaction_id);
            }
            continue;
        }

        // Date/time patterns (MM/DD/YY, YYYY-MM-DD, etc.)
        if ((contains_keyword(line, "/") && strlen(line) < 30) ||
            contains_keyword(line, "date") || contains_keyword(line, "time")) {
            if (receipt->timestamp[0] == '\0') {
                strncpy(receipt->timestamp, line, 31);
                trim(receipt->timestamp);
            }
            continue;
        }

        // ─── Line item detection ─────────────────────────────────────────────
        // Pattern: "Item Name         $X.XX" or "2 x Item Name    X.XX"
        if (receipt->item_count < ESCPOS_MAX_ITEMS && !found_total) {
            // Check if line has a price at the end
            char *last_space = strrchr(line, ' ');
            if (last_space && looks_like_price(last_space)) {
                float price = extract_price(last_space);
                if (price > 0 && price < 10000) { // Sanity check
                    receipt_item_t *item = &receipt->items[receipt->item_count];

                    // Extract name (everything before the price)
                    int name_len = (int)(last_space - line);
                    if (name_len > 0 && name_len < ESCPOS_MAX_ITEM_NAME) {
                        strncpy(item->name, line, name_len);
                        item->name[name_len] = '\0';
                        trim(item->name);

                        // Check for quantity prefix: "2 x " or "2x "
                        item->quantity = 1;
                        char *x_pos = strstr(item->name, " x ");
                        if (!x_pos) x_pos = strstr(item->name, "x ");
                        if (x_pos && x_pos - item->name <= 3) {
                            char qty_str[4] = {0};
                            strncpy(qty_str, item->name, x_pos - item->name);
                            int qty = atoi(qty_str);
                            if (qty > 0 && qty < 100) {
                                item->quantity = qty;
                                // Remove quantity prefix from name
                                memmove(item->name, x_pos + 3, strlen(x_pos + 3) + 1);
                                trim(item->name);
                            }
                        }

                        item->total_price = price;
                        item->unit_price = price / item->quantity;

                        if (strlen(item->name) > 1) {
                            receipt->item_count++;
                        }
                    }
                }
            }
        }
    }

    // ─── Fallback: if no total found, sum items
    if (!found_total && receipt->item_count > 0) {
        float sum = 0;
        for (int i = 0; i < receipt->item_count; i++) {
            sum += receipt->items[i].total_price;
        }
        receipt->total = sum + receipt->tax + receipt->tip + receipt->discount;
    }

    // Validate minimum receipt data
    if (receipt->merchant_name[0] == '\0' || receipt->total == 0) {
        // Try to salvage — use any non-empty line as merchant
        if (receipt->total > 0) {
            strncpy(receipt->merchant_name, "Unknown Merchant", ESCPOS_MAX_MERCHANT_LEN - 1);
        } else {
            free(receipt);
            return NULL;
        }
    }

    ESP_LOGI(TAG, "Parsed: merchant=%s, items=%d, total=$%.2f, payment=%s %s",
             receipt->merchant_name, receipt->item_count, receipt->total,
             receipt->payment_method, receipt->card_last4);

    return receipt;
}
