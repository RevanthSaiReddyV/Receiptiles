"""
Generate training data for receipt parser fine-tuning.

Strategy: Teacher-Student Distillation
1. Use production receipts already parsed by Gemini/GPT-4o as ground truth
2. Generate synthetic receipts for underrepresented categories
3. Export as JSONL format compatible with the fine-tuning script

Data sources:
- Database: receipts with high confidence scores (>0.9) parsed by Gemini/GPT-4o
- Synthetic: generated templates for varied receipt formats

Usage:
    python scripts/generate_training_data.py --db-url $DATABASE_URL --output ../data/
    python scripts/generate_training_data.py --synthetic-only --output ../data/
"""

import argparse
import json
import os
import random
from datetime import datetime, timedelta
from pathlib import Path


CATEGORIES = [
    "Groceries", "Dining", "Shopping", "Transportation", "Travel",
    "Entertainment", "Healthcare", "Utilities", "Subscriptions",
    "Gas & Fuel", "Electronics", "Home & Garden", "Personal Care",
    "Education", "Gifts & Donations", "Business", "Uncategorized",
]

MERCHANTS_BY_CATEGORY = {
    "Groceries": [
        ("Whole Foods Market", "Whole Foods"),
        ("Trader Joe's", "Trader Joe's"),
        ("Costco Wholesale", "Costco"),
        ("Safeway", "Safeway"),
        ("Kroger", "Kroger"),
        ("Walmart Supercenter", "Walmart"),
        ("Target", "Target"),
        ("Aldi", "Aldi"),
    ],
    "Dining": [
        ("Chipotle Mexican Grill", "Chipotle"),
        ("Starbucks Coffee", "Starbucks"),
        ("McDonald's", "McDonald's"),
        ("The Cheesecake Factory", "Cheesecake Factory"),
        ("Panera Bread", "Panera"),
        ("Olive Garden Italian Restaurant", "Olive Garden"),
    ],
    "Shopping": [
        ("Amazon.com", "Amazon"),
        ("Nordstrom", "Nordstrom"),
        ("Nike Store", "Nike"),
        ("Apple Store", "Apple"),
        ("Home Depot", "Home Depot"),
        ("IKEA", "IKEA"),
    ],
    "Transportation": [
        ("Uber", "Uber"),
        ("Lyft", "Lyft"),
        ("Shell Gas Station", "Shell"),
        ("Chevron", "Chevron"),
    ],
    "Electronics": [
        ("Best Buy", "Best Buy"),
        ("Apple Store", "Apple"),
        ("Micro Center", "Micro Center"),
        ("B&H Photo Video", "B&H Photo"),
    ],
    "Subscriptions": [
        ("Netflix", "Netflix"),
        ("Spotify Premium", "Spotify"),
        ("Adobe Creative Cloud", "Adobe"),
        ("Amazon Prime", "Amazon Prime"),
    ],
    "Healthcare": [
        ("CVS Pharmacy", "CVS"),
        ("Walgreens", "Walgreens"),
        ("Kaiser Permanente", "Kaiser"),
    ],
    "Gas & Fuel": [
        ("Shell", "Shell"),
        ("Chevron", "Chevron"),
        ("76 Station", "76"),
        ("Costco Gas", "Costco Gas"),
    ],
}

GROCERY_ITEMS = [
    ("Organic Whole Milk 1 Gallon", "Whole Milk", 5.99),
    ("Bananas Bunch", "Bananas", 1.29),
    ("Chicken Breast Boneless Skinless 2lb", "Chicken Breast", 8.99),
    ("Avocados Hass 4ct", "Avocados", 4.99),
    ("Sourdough Bread Loaf", "Sourdough Bread", 4.49),
    ("Eggs Large Grade A 12ct", "Eggs", 3.99),
    ("Baby Spinach Organic 5oz", "Baby Spinach", 3.49),
    ("Greek Yogurt Plain 32oz", "Greek Yogurt", 5.49),
    ("Pasta Penne 16oz", "Pasta Penne", 1.99),
    ("Olive Oil Extra Virgin 500ml", "Olive Oil", 7.99),
    ("Cheddar Cheese Block 8oz", "Cheddar Cheese", 4.29),
    ("Ground Coffee Medium Roast 12oz", "Ground Coffee", 9.99),
    ("Orange Juice Not From Concentrate 52oz", "Orange Juice", 4.99),
    ("Salmon Fillet Atlantic 1lb", "Salmon Fillet", 12.99),
    ("Broccoli Crown", "Broccoli", 2.49),
]

DINING_ITEMS = [
    ("Chicken Burrito Bowl", "Burrito Bowl", 11.50),
    ("Guacamole Side", "Guacamole", 2.95),
    ("Large Fountain Drink", "Fountain Drink", 2.75),
    ("Grande Caffe Latte", "Caffe Latte", 5.95),
    ("Breakfast Sandwich", "Breakfast Sandwich", 4.95),
    ("Caesar Salad", "Caesar Salad", 12.99),
    ("Margherita Pizza", "Margherita Pizza", 16.99),
    ("Fish & Chips", "Fish & Chips", 18.99),
    ("Pad Thai", "Pad Thai", 14.50),
    ("Chicken Tikka Masala", "Tikka Masala", 17.99),
]

ELECTRONICS_ITEMS = [
    ("Apple AirPods Pro 2nd Gen", "AirPods Pro", 249.99),
    ("Samsung Galaxy S24 Case", "Phone Case", 29.99),
    ("Anker USB-C Charger 65W", "USB-C Charger", 35.99),
    ("Logitech MX Master 3S Mouse", "MX Master Mouse", 99.99),
    ("Sony WH-1000XM5 Headphones", "Sony Headphones", 349.99),
    ("Apple MacBook Pro 14in M3", "MacBook Pro", 1999.99),
    ("iPad Air 11in 256GB", "iPad Air", 749.99),
]


def generate_receipt_text(merchant_info: tuple, items: list, category: str) -> str:
    """Generate realistic OCR-style receipt text."""
    raw_name, canonical = merchant_info
    location = random.choice([
        "123 Main St, Seattle, WA 98101",
        "456 Broadway, New York, NY 10012",
        "789 Market St, San Francisco, CA 94103",
        "321 Oak Ave, Austin, TX 78701",
        None,
    ])

    date = datetime.now() - timedelta(days=random.randint(1, 365))
    date_str = date.strftime("%m/%d/%Y %I:%M %p")

    selected_items = random.sample(items, min(random.randint(2, 6), len(items)))
    for i in range(len(selected_items)):
        name, short, price = selected_items[i]
        qty = random.choice([1, 1, 1, 2, 3])
        price_variation = price * random.uniform(0.9, 1.1)
        selected_items[i] = (name, short, round(price_variation, 2), qty)

    subtotal = sum(price * qty for _, _, price, qty in selected_items)
    tax_rate = random.choice([0.0, 0.065, 0.075, 0.0825, 0.0875, 0.1025])
    tax = round(subtotal * tax_rate, 2)
    tip = round(subtotal * random.choice([0, 0, 0, 0.15, 0.18, 0.20]), 2) if category == "Dining" else 0
    total = round(subtotal + tax + tip, 2)

    card_last4 = f"{random.randint(1000, 9999)}"
    payment_method = random.choice(["card", "card", "card", "cash", "online"])

    # Generate OCR-style text (varied formats)
    format_style = random.choice(["thermal", "email", "invoice"])

    if format_style == "thermal":
        lines = [
            f"{'=' * 40}",
            f"  {raw_name}",
        ]
        if location:
            lines.append(f"  {location}")
        lines.extend([
            f"  {date_str}",
            f"{'=' * 40}",
            "",
        ])
        for name, short, price, qty in selected_items:
            if qty > 1:
                lines.append(f"  {name}")
                lines.append(f"    {qty} x ${price:.2f}    ${price * qty:.2f}")
            else:
                lines.append(f"  {name:<30} ${price:.2f}")
        lines.extend([
            f"{'─' * 40}",
            f"  Subtotal:{'':>20} ${subtotal:.2f}",
            f"  Tax:{'':>25} ${tax:.2f}",
        ])
        if tip > 0:
            lines.append(f"  Tip:{'':>25} ${tip:.2f}")
        lines.extend([
            f"{'─' * 40}",
            f"  TOTAL:{'':>23} ${total:.2f}",
            f"{'─' * 40}",
            f"  {payment_method.upper()} ****{card_last4}" if payment_method == "card" else f"  CASH",
            "",
            f"  Thank you for shopping!",
            f"{'=' * 40}",
        ])

    elif format_style == "email":
        lines = [
            f"Order Confirmation",
            f"",
            f"From: {raw_name}",
            f"Date: {date.strftime('%B %d, %Y')}",
            f"",
            f"Order Details:",
            f"─────────────────────────────────",
        ]
        for name, short, price, qty in selected_items:
            lines.append(f"  {name} (Qty: {qty}) — ${price * qty:.2f}")
        lines.extend([
            f"",
            f"Subtotal: ${subtotal:.2f}",
            f"Tax: ${tax:.2f}",
            f"Shipping: $0.00",
            f"Order Total: ${total:.2f}",
            f"",
            f"Payment: Visa ending in {card_last4}",
        ])

    else:  # invoice
        lines = [
            f"INVOICE",
            f"",
            f"{raw_name}",
            f"{'Location: ' + location if location else ''}",
            f"Date: {date.strftime('%Y-%m-%d')}",
            f"Invoice #: INV-{random.randint(10000, 99999)}",
            f"",
            f"{'Item':<35} {'Qty':<5} {'Price':<10} {'Total':<10}",
            f"{'─' * 65}",
        ]
        for name, short, price, qty in selected_items:
            lines.append(f"{name:<35} {qty:<5} ${price:<9.2f} ${price * qty:<9.2f}")
        lines.extend([
            f"{'─' * 65}",
            f"{'Subtotal:':<50} ${subtotal:.2f}",
            f"{'Tax:':<50} ${tax:.2f}",
            f"{'TOTAL DUE:':<50} ${total:.2f}",
            f"",
            f"Payment received: {'Visa ****' + card_last4 if payment_method == 'card' else 'Cash'}",
        ])

    receipt_text = "\n".join(lines)

    # Build expected output
    output = {
        "merchant": {
            "rawName": raw_name,
            "canonicalName": canonical,
            "category": category,
            "location": location,
        },
        "purchase": {
            "purchasedAt": date.isoformat() + "Z",
            "currency": "USD",
            "subtotal": round(subtotal, 2),
            "tax": tax,
            "tip": tip,
            "discount": 0,
            "fees": 0,
            "total": total,
        },
        "payment": {
            "method": payment_method,
            "cardId": None,
            "cardLast4": card_last4 if payment_method == "card" else None,
            "walletType": None,
            "entryMode": "chip" if format_style == "thermal" else "online",
        },
        "items": [
            {
                "rawName": name,
                "name": short,
                "quantity": qty,
                "unitPrice": price,
                "totalPrice": round(price * qty, 2),
                "category": category,
            }
            for name, short, price, qty in selected_items
        ],
        "metadata": {
            "confidence": 0.95,
            "requiresReview": False,
        },
    }

    return receipt_text, output


def generate_not_a_receipt_examples() -> list:
    """Generate negative examples (marketing emails, shipping updates, etc.)."""
    templates = [
        "Subject: 50% OFF SALE! Don't miss out!\n\nDear valued customer,\n\nWe're having our biggest sale of the year! Use code SAVE50 for 50% off everything.\n\nShop now at example.com\n\nUnsubscribe",
        "Your package has shipped!\n\nTracking Number: 1Z999AA10123456784\nEstimated Delivery: Thursday, March 15\n\nTrack your package at ups.com",
        "How was your recent purchase?\n\nWe'd love to hear your feedback on your recent order from Amazon.\n\nLeave a review and earn 50 bonus points!\n\nRate your experience: ★★★★★",
        "Your subscription will renew soon\n\nJust a heads up — your free trial ends in 3 days. After that, you'll be charged $9.99/month.\n\nManage subscription | Cancel",
        "Weekly Newsletter - Tech Updates\n\nTop stories this week:\n1. Apple announces new iPhone\n2. Google I/O highlights\n3. Best laptop deals\n\nRead more at technews.com",
    ]

    examples = []
    for template in templates:
        examples.append({
            "input": template,
            "output": {"not_a_receipt": True},
        })
    return examples


def generate_synthetic_dataset(num_samples: int = 5000) -> list:
    """Generate full synthetic training dataset."""
    examples = []
    samples_per_category = num_samples // len(MERCHANTS_BY_CATEGORY)

    for category, merchants in MERCHANTS_BY_CATEGORY.items():
        items_pool = GROCERY_ITEMS  # default
        if category == "Dining":
            items_pool = DINING_ITEMS
        elif category in ("Electronics", "Shopping"):
            items_pool = ELECTRONICS_ITEMS
        elif category == "Subscriptions":
            items_pool = [("Monthly Subscription", "Subscription", 9.99)]
        elif category in ("Transportation", "Gas & Fuel"):
            items_pool = [
                ("Regular Unleaded 12.5 GAL", "Gas Regular", 45.99),
                ("Premium Unleaded 10.2 GAL", "Gas Premium", 52.49),
                ("Ride - Downtown to Airport", "Ride", 34.50),
                ("Ride - Home to Office", "Ride", 18.75),
            ]
        elif category == "Healthcare":
            items_pool = [
                ("Ibuprofen 200mg 100ct", "Ibuprofen", 8.99),
                ("Vitamin D3 5000IU 120ct", "Vitamin D3", 12.99),
                ("Prescription Copay", "Rx Copay", 25.00),
                ("First Aid Kit Travel", "First Aid Kit", 15.99),
            ]

        for _ in range(samples_per_category):
            merchant = random.choice(merchants)
            text, output = generate_receipt_text(merchant, items_pool, category)
            examples.append({"input": text, "output": output})

    # Add negative examples (10% of dataset)
    negative_examples = generate_not_a_receipt_examples()
    num_negatives = num_samples // 10
    for _ in range(num_negatives):
        examples.append(random.choice(negative_examples))

    random.shuffle(examples)
    return examples


def export_from_database(db_url: str) -> list:
    """Export high-confidence receipts from production database as training data.

    Requires: pip install psycopg2-binary
    """
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("psycopg2 not installed. Run: pip install psycopg2-binary")
        return []

    conn = psycopg2.connect(db_url)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Fetch high-confidence receipts with their items
    cur.execute("""
        SELECT
            r.id, r."merchantRawName", r."merchantCanonicalName",
            r."merchantCategory", r."merchantLocation",
            r."purchasedAt", r.currency, r.subtotal, r.tax, r.tip,
            r.discount, r.fees, r.total,
            r."paymentMethod", r."cardLast4", r."walletType", r."entryMode",
            r.confidence, r."requiresReview", r.source
        FROM "Receipt" r
        WHERE r.confidence >= 0.9
        AND r.source IN ('UPLOAD', 'EMAIL')
        ORDER BY r."createdAt" DESC
        LIMIT 10000
    """)
    receipts = cur.fetchall()

    examples = []
    for receipt in receipts:
        cur.execute("""
            SELECT "rawName", name, quantity, "unitPrice", "totalPrice", category
            FROM "ReceiptItem"
            WHERE "receiptId" = %s
        """, (receipt["id"],))
        items = cur.fetchall()

        if not items:
            continue

        # Reconstruct what the OCR text might have looked like
        ocr_text = reconstruct_ocr_text(receipt, items)

        output = {
            "merchant": {
                "rawName": receipt["merchantRawName"],
                "canonicalName": receipt["merchantCanonicalName"],
                "category": receipt["merchantCategory"],
                "location": receipt["merchantLocation"],
            },
            "purchase": {
                "purchasedAt": receipt["purchasedAt"].isoformat() + "Z",
                "currency": receipt["currency"],
                "subtotal": float(receipt["subtotal"]),
                "tax": float(receipt["tax"]),
                "tip": float(receipt["tip"] or 0),
                "discount": float(receipt["discount"] or 0),
                "fees": float(receipt["fees"] or 0),
                "total": float(receipt["total"]),
            },
            "payment": {
                "method": receipt["paymentMethod"],
                "cardId": None,
                "cardLast4": receipt["cardLast4"],
                "walletType": receipt["walletType"],
                "entryMode": receipt["entryMode"],
            },
            "items": [
                {
                    "rawName": item["rawName"],
                    "name": item["name"],
                    "quantity": item["quantity"],
                    "unitPrice": float(item["unitPrice"]),
                    "totalPrice": float(item["totalPrice"]),
                    "category": item["category"],
                }
                for item in items
            ],
            "metadata": {
                "confidence": 0.95,
                "requiresReview": False,
            },
        }

        examples.append({"input": ocr_text, "output": output})

    conn.close()
    return examples


def reconstruct_ocr_text(receipt: dict, items: list) -> str:
    """Reconstruct plausible OCR text from structured receipt data."""
    lines = [
        receipt["merchantRawName"],
        receipt["merchantLocation"] or "",
        f"Date: {receipt['purchasedAt'].strftime('%m/%d/%Y')}",
        "",
    ]
    for item in items:
        qty = item["quantity"]
        if qty > 1:
            lines.append(f"{item['rawName']}  {qty} x ${float(item['unitPrice']):.2f}  ${float(item['totalPrice']):.2f}")
        else:
            lines.append(f"{item['rawName']}  ${float(item['totalPrice']):.2f}")

    lines.extend([
        "",
        f"Subtotal: ${float(receipt['subtotal']):.2f}",
        f"Tax: ${float(receipt['tax']):.2f}",
    ])
    if receipt["tip"]:
        lines.append(f"Tip: ${float(receipt['tip']):.2f}")
    lines.append(f"Total: ${float(receipt['total']):.2f}")

    if receipt["cardLast4"]:
        lines.append(f"VISA ****{receipt['cardLast4']}")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db-url", type=str, help="PostgreSQL connection URL")
    parser.add_argument("--synthetic-only", action="store_true", help="Only generate synthetic data")
    parser.add_argument("--output", type=str, default="../data/")
    parser.add_argument("--num-samples", type=int, default=5000)
    parser.add_argument("--eval-split", type=float, default=0.1)
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    all_examples = []

    # Generate synthetic data
    print(f"Generating {args.num_samples} synthetic training examples...")
    synthetic = generate_synthetic_dataset(args.num_samples)
    all_examples.extend(synthetic)
    print(f"  Generated {len(synthetic)} synthetic examples")

    # Export from database if URL provided
    if args.db_url and not args.synthetic_only:
        print("Exporting from production database...")
        db_examples = export_from_database(args.db_url)
        all_examples.extend(db_examples)
        print(f"  Exported {len(db_examples)} production examples")

    # Split into train/eval
    random.shuffle(all_examples)
    split_idx = int(len(all_examples) * (1 - args.eval_split))
    train_data = all_examples[:split_idx]
    eval_data = all_examples[split_idx:]

    # Write JSONL files
    train_file = output_dir / "train.jsonl"
    eval_file = output_dir / "eval.jsonl"

    with open(train_file, "w") as f:
        for example in train_data:
            f.write(json.dumps(example) + "\n")

    with open(eval_file, "w") as f:
        for example in eval_data:
            f.write(json.dumps(example) + "\n")

    print(f"\nDataset saved:")
    print(f"  Train: {train_file} ({len(train_data)} examples)")
    print(f"  Eval:  {eval_file} ({len(eval_data)} examples)")

    # Print category distribution
    categories = {}
    for ex in all_examples:
        if "not_a_receipt" in ex.get("output", {}):
            cat = "NOT_RECEIPT"
        else:
            cat = ex["output"]["merchant"]["category"]
        categories[cat] = categories.get(cat, 0) + 1

    print(f"\nCategory distribution:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat:<20} {count:>5} ({count/len(all_examples)*100:.1f}%)")


if __name__ == "__main__":
    main()
