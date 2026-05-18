import { PrismaClient, ReceiptSource, DeviceStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  await prisma.$transaction(async (tx) => {
    // ─── Test User ──────────────────────────────────────────────────────────
    const user = await tx.user.upsert({
      where: { email: "test@receiptiles.com" },
      update: { name: "Test User" },
      create: {
        email: "test@receiptiles.com",
        name: "Test User",
        passwordHash: "$2a$10$placeholder_hash_for_seed_data_only",
      },
    });

    console.log(`  User: ${user.email} (${user.id})`);

    // ─── Sample Receipts ────────────────────────────────────────────────────
    const receipts = [
      {
        sourceId: "seed-starbucks-2026-05-15-12.45",
        merchantRawName: "Starbucks #12345",
        merchantCanonicalName: "starbucks",
        merchantCategory: "Coffee & Tea",
        merchantLocation: "123 Main St, San Francisco, CA",
        purchasedAt: new Date("2026-05-15T08:32:00Z"),
        subtotal: 10.45,
        tax: 0.94,
        total: 11.39,
        paymentMethod: "apple_pay",
        cardLast4: "4242",
        confidence: 0.98,
        source: ReceiptSource.EMAIL,
        items: [
          { rawName: "Iced Oat Latte Grd", name: "Iced Oat Milk Latte", quantity: 1, unitPrice: 6.45, totalPrice: 6.45, category: "Coffee" },
          { rawName: "Blueberry Muffin", name: "Blueberry Muffin", quantity: 1, unitPrice: 3.95, totalPrice: 3.95, category: "Bakery" },
        ],
      },
      {
        sourceId: "seed-amazon-2026-05-12-89.97",
        merchantRawName: "Amazon.com",
        merchantCanonicalName: "amazon",
        merchantCategory: "Shopping",
        merchantLocation: null,
        purchasedAt: new Date("2026-05-12T14:22:00Z"),
        subtotal: 89.97,
        tax: 7.42,
        total: 97.39,
        paymentMethod: "credit_card",
        cardLast4: "1234",
        confidence: 0.95,
        source: ReceiptSource.EMAIL,
        items: [
          { rawName: "Anker USB-C Hub 7-in-1", name: "Anker USB-C Hub 7-in-1", quantity: 1, unitPrice: 34.99, totalPrice: 34.99, category: "Electronics" },
          { rawName: "Sony WH-1000XM5 Ear Pads", name: "Sony WH-1000XM5 Replacement Ear Pads", quantity: 1, unitPrice: 24.99, totalPrice: 24.99, category: "Electronics" },
          { rawName: "Kindle Paperwhite Case", name: "Kindle Paperwhite Leather Case", quantity: 1, unitPrice: 29.99, totalPrice: 29.99, category: "Accessories" },
        ],
      },
      {
        sourceId: "seed-target-2026-05-10-54.23",
        merchantRawName: "Target T-2847",
        merchantCanonicalName: "target",
        merchantCategory: "Groceries",
        merchantLocation: "456 Market St, San Francisco, CA",
        purchasedAt: new Date("2026-05-10T17:45:00Z"),
        subtotal: 51.18,
        tax: 3.05,
        total: 54.23,
        paymentMethod: "debit_card",
        cardLast4: "7890",
        confidence: 0.92,
        source: ReceiptSource.UPLOAD,
        items: [
          { rawName: "GV Organic Milk 1gal", name: "Good & Gather Organic Whole Milk 1 Gallon", quantity: 1, unitPrice: 6.49, totalPrice: 6.49, category: "Dairy" },
          { rawName: "Bananas Organic Bunch", name: "Organic Bananas", quantity: 2, unitPrice: 1.29, totalPrice: 2.58, category: "Produce" },
          { rawName: "KIND Bar Variety 12pk", name: "KIND Bar Variety Pack (12 ct)", quantity: 1, unitPrice: 15.99, totalPrice: 15.99, category: "Snacks" },
          { rawName: "Tide Pods 42ct", name: "Tide PODS Laundry Detergent (42 ct)", quantity: 1, unitPrice: 13.99, totalPrice: 13.99, category: "Household" },
          { rawName: "Paper Towels 6pk", name: "Up & Up Paper Towels (6 rolls)", quantity: 1, unitPrice: 12.13, totalPrice: 12.13, category: "Household" },
        ],
      },
      {
        sourceId: "seed-costco-2026-05-08-187.54",
        merchantRawName: "COSTCO WHSE #0143",
        merchantCanonicalName: "costco",
        merchantCategory: "Wholesale",
        merchantLocation: "1600 El Camino Real, South San Francisco, CA",
        purchasedAt: new Date("2026-05-08T11:15:00Z"),
        subtotal: 178.61,
        tax: 8.93,
        total: 187.54,
        paymentMethod: "credit_card",
        cardLast4: "4242",
        confidence: 0.88,
        source: ReceiptSource.RETAILER,
        items: [
          { rawName: "KS Organic Eggs 2dz", name: "Kirkland Signature Organic Eggs (2 dozen)", quantity: 1, unitPrice: 8.99, totalPrice: 8.99, category: "Dairy" },
          { rawName: "Rotisserie Chicken", name: "Kirkland Signature Rotisserie Chicken", quantity: 1, unitPrice: 4.99, totalPrice: 4.99, category: "Deli" },
          { rawName: "KS Olive Oil 2L", name: "Kirkland Signature Extra Virgin Olive Oil (2L)", quantity: 1, unitPrice: 16.99, totalPrice: 16.99, category: "Pantry" },
          { rawName: "Charmin Ultra 30pk", name: "Charmin Ultra Soft Toilet Paper (30 rolls)", quantity: 1, unitPrice: 28.99, totalPrice: 28.99, category: "Household" },
          { rawName: "KS Almond Butter 27oz", name: "Kirkland Signature Almond Butter (27 oz)", quantity: 1, unitPrice: 9.99, totalPrice: 9.99, category: "Pantry" },
          { rawName: "Air Filter 3pk", name: "3M Filtrete Air Filter (3 pack)", quantity: 1, unitPrice: 42.99, totalPrice: 42.99, category: "Home" },
          { rawName: "KS Sparkling Water 35pk", name: "Kirkland Signature Sparkling Water (35 pack)", quantity: 2, unitPrice: 13.49, totalPrice: 26.98, category: "Beverages" },
          { rawName: "Starbucks K-Cups 72ct", name: "Starbucks Pike Place K-Cup Pods (72 ct)", quantity: 1, unitPrice: 38.69, totalPrice: 38.69, category: "Coffee" },
        ],
      },
      {
        sourceId: "seed-uber-2026-05-14-28.73",
        merchantRawName: "Uber Trip",
        merchantCanonicalName: "uber",
        merchantCategory: "Transportation",
        merchantLocation: "San Francisco, CA",
        purchasedAt: new Date("2026-05-14T22:10:00Z"),
        subtotal: 22.50,
        tax: 0,
        fees: 4.23,
        tip: 2.00,
        total: 28.73,
        paymentMethod: "credit_card",
        cardLast4: "1234",
        confidence: 0.99,
        source: ReceiptSource.EMAIL,
        items: [
          { rawName: "UberX Trip", name: "UberX - Mission District to SFO Airport", quantity: 1, unitPrice: 22.50, totalPrice: 22.50, category: "Ride" },
        ],
      },
    ];

    for (const receipt of receipts) {
      const { items, ...receiptData } = receipt;
      const created = await tx.receipt.upsert({
        where: {
          receipt_source_dedup: {
            userId: user.id,
            sourceId: receiptData.sourceId!,
          },
        },
        update: {},
        create: {
          userId: user.id,
          ...receiptData,
          fees: receiptData.fees ?? 0,
          tip: receiptData.tip ?? 0,
          discount: 0,
          items: {
            create: items,
          },
        },
      });
      console.log(`  Receipt: ${created.merchantCanonicalName} - $${created.total}`);
    }

    // ─── Email Connection ───────────────────────────────────────────────────
    await tx.emailConnection.upsert({
      where: {
        userId_email: {
          userId: user.id,
          email: "test@receiptiles.com",
        },
      },
      update: {},
      create: {
        userId: user.id,
        provider: "gmail",
        email: "test@receiptiles.com",
        accessToken: "seed_access_token_placeholder",
        refreshToken: "seed_refresh_token_placeholder",
        isActive: true,
        lastSyncAt: new Date("2026-05-15T09:00:00Z"),
      },
    });
    console.log("  Email connection: Gmail (connected)");

    // ─── Device ─────────────────────────────────────────────────────────────
    await tx.device.upsert({
      where: { deviceSerial: "SEED-ESP32-001" },
      update: {},
      create: {
        deviceSerial: "SEED-ESP32-001",
        name: "Front Counter POS Tap",
        firmware: "v2.1.4",
        status: DeviceStatus.ACTIVE,
        apiKey: "dk_seed_device_key_0001",
        posType: "epson",
        connectionType: "usb",
        lastSeenAt: new Date("2026-05-15T10:30:00Z"),
        metadata: {
          location: "Counter 1",
          storeId: "store-sf-main",
        },
      },
    });
    console.log("  Device: SEED-ESP32-001 (active)");

    // ─── Waitlist Entries ───────────────────────────────────────────────────
    const waitlistEmails = [
      { email: "early.adopter@gmail.com", source: "landing" },
      { email: "product.hunt.fan@hey.com", source: "producthunt" },
      { email: "tech.blogger@substack.com", source: "referral" },
    ];

    for (const entry of waitlistEmails) {
      await tx.waitlistEntry.upsert({
        where: { email: entry.email },
        update: {},
        create: entry,
      });
    }
    console.log(`  Waitlist entries: ${waitlistEmails.length} created`);
  });

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
