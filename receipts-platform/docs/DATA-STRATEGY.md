# Data Strategy: Collection, Structure & Monetization

## Data We Collect (with user consent)

### Tier 1: Transaction Data (highest value)
| Data Point | Source | Structure |
|---|---|---|
| Purchase amount | Receipts, bank alerts | `{amount, currency, timestamp}` |
| Merchant name | Receipts, POS | `{rawName, canonicalName, category}` |
| Item-level SKU data | POS webhooks, email receipts | `{sku, name, qty, price, category}` |
| Purchase frequency | Calculated | `{merchant, frequency, avgAmount}` |
| Payment method | Receipts, cards | `{network, last4, type}` |
| Purchase location | POS, Google Maps | `{lat, lng, city, state, zip}` |

### Tier 2: Consumer Profile (medium value)
| Data Point | Source | Structure |
|---|---|---|
| Spending categories | Calculated from receipts | `{category, monthlyAvg, trend}` |
| Brand preferences | Receipt history | `{brand, visits, totalSpend, loyalty}` |
| Price sensitivity | Item price analysis | `{avgBasketSize, discountUsage, priceRange}` |
| Subscription list | Subscription detection | `{service, amount, frequency, active}` |
| Card portfolio | User input | `{cards[], networks[], rewardTypes[]}` |
| Shopping patterns | Time analysis | `{dayOfWeek, timeOfDay, seasonal}` |

### Tier 3: Behavioral Data (valuable for targeting)
| Data Point | Source | Structure |
|---|---|---|
| App usage patterns | Analytics | `{sessionsPerWeek, featuresUsed}` |
| Receipt scan frequency | Upload tracking | `{scansPerWeek, photoVsEmail}` |
| Card recommendation follows | Click tracking | `{recommended, used, switched}` |
| Offer engagement | Future feature | `{viewed, clicked, redeemed}` |
| Location patterns | GPS (with permission) | `{homeArea, workArea, frequentAreas}` |

## Data Buyers & Use Cases

### 1. Market Research Firms ($$$)
**What they want:** Anonymized consumer spending trends
**Data product:** Monthly aggregate reports
- Category spend trends by region
- Brand market share by demographic
- Price sensitivity indices
- Subscription adoption rates

### 2. CPG/Retail Brands ($$$$)
**What they want:** SKU-level purchase data
- Which products are bought together (basket analysis)
- Brand switching patterns
- Promotion effectiveness
- Competitive intelligence

### 3. Financial Services ($$$)
**What they want:** Card usage patterns
- Which cards people actually use vs own
- Reward optimization behavior
- Spending capacity indicators
- Card switching triggers

### 4. Real Estate / Location Intelligence ($$)
**What they want:** Foot traffic + spending patterns
- Spending by zip code
- Merchant popularity by area
- Consumer mobility patterns

### 5. Advertising / Targeting ($$$)
**What they want:** Purchase intent signals
- "Users who bought X are likely to buy Y"
- Category affinity scores
- Life event detection (new baby, moving, etc.)

## Privacy-First Approach

### Rules
1. **Always anonymized** — never sell individual user data
2. **Aggregated minimums** — reports require 100+ users per segment
3. **Opt-in only** — users must explicitly consent to data sharing
4. **Transparency** — show users what data is collected and how it's used
5. **Data deletion** — users can delete all data anytime
6. **No PII in reports** — no names, emails, card numbers, addresses

### Data Tiers for Users
- **Free tier:** Basic receipt tracking, we use anonymized data
- **Premium tier ($):** No data sharing, full privacy mode
- **Data contributor:** Opt-in to share data, earn extra reward points

## Database Schema for Structured Data

### Analytics Tables (add to Prisma schema)

```prisma
model SpendingSnapshot {
  id        String   @id @default(cuid())
  userId    String
  period    String   // "2026-05" (monthly)
  category  String
  total     Float
  count     Int
  avgAmount Float
  createdAt DateTime @default(now())

  @@unique([userId, period, category])
  @@index([period])
  @@index([category])
}

model MerchantVisit {
  id           String   @id @default(cuid())
  userId       String
  merchantName String
  category     String
  visitDate    DateTime
  amount       Float
  location     String?  // city, state
  dayOfWeek    Int      // 0-6
  hourOfDay    Int      // 0-23

  @@index([userId, merchantName])
  @@index([merchantName, visitDate])
  @@index([category, visitDate])
}

model BasketAnalysis {
  id        String   @id @default(cuid())
  receiptId String
  items     Json     // [{sku, name, category, price}]
  total     Float
  merchant  String
  category  String
  createdAt DateTime @default(now())

  @@index([merchant])
  @@index([category])
}

model LocationInsight {
  id        String   @id @default(cuid())
  userId    String
  lat       Float
  lng       Float
  merchant  String
  amount    Float
  timestamp DateTime

  @@index([userId])
  @@index([merchant])
}
```

## Revenue Projections from Data

| Data Product | Price per Report | Frequency | At 10K Users | At 100K Users |
|---|---|---|---|---|
| Consumer Spend Trends | $5,000/mo | Monthly | $5K/mo | $15K/mo |
| SKU-Level Insights | $10,000/mo | Monthly | $10K/mo | $30K/mo |
| Brand Intelligence | $8,000/report | Quarterly | $24K/yr | $96K/yr |
| Location Analytics | $3,000/mo | Monthly | $3K/mo | $10K/mo |
| Custom Research | $15,000+ | Per project | $30K/yr | $120K/yr |

**Combined with affiliate revenue ($50-200/card approval), total revenue potential:**
- 10K users: $15-30K/month
- 100K users: $100-300K/month
