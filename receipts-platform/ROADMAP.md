# Feature Roadmap — Universal Receipts Platform

## Vision
Combine the best of **Monarch** (budgeting/insights), **MaxRewards** (card optimization), **Rocket Money** (subscription management), and **Copilot** (beautiful UX) into one platform — free for consumers, monetized through the Data API.

---

## Current State (What's Built)

### Receipt Capture ✅
- Gmail email parsing (14 retailers: Amazon, Walmart, Target, Costco, etc.)
- AI-generated parsers for unknown retailers (RetailerParser model)
- Manual image upload → GPT-4o OCR
- POS webhooks (Square, Toast, Shopify)
- ESP32 hardware device (virtual network printer)
- NFC tap-to-claim handover

### Card Rewards ✅ (MaxRewards equivalent — partial)
- 30+ cards in reward database (Chase, Amex, Capital One, Citi, Discover, etc.)
- Card optimizer: best card per purchase
- Missed rewards calculator
- 500+ merchant-to-category mapping
- Card scanner (camera)
- Benefit tracker
- Nearby card recommendations (location-based)

### Analytics ✅ (Monarch equivalent — partial)
- Spending stats API (group by category/merchant/month)
- SpendingSnapshot (monthly category aggregates)
- MerchantVisit tracking (location, time-of-day patterns)
- LocationInsight (geo-tagged spending)
- Insights page with charts

### Subscription Tracking ✅ (Rocket Money equivalent — partial)
- Auto-detection from receipt patterns
- Renewal alerts (upcoming, price increase, missed charge)
- Active/Paused/Cancelled status
- Monthly/annual cost summaries

### Data API (B2B Monetization) ✅
- Aggregate spending data endpoints
- Merchant trends
- Category breakdowns
- API key management with tiers (Trial/Standard/Enterprise)
- Usage logging

### Retailer Connections ✅ (partial)
- Costco (GraphQL API — warehouse receipts)
- RetailerConnection model ready for more

---

## Gap Analysis: What Top Apps Have That We Don't

### From Monarch Money ($14.99/mo — 500K+ users)
| Feature | Status | Priority |
|---------|--------|----------|
| Budget creation & tracking (per-category limits) | ❌ MISSING | P0 |
| Net worth tracking (linked bank/investment accounts) | ❌ MISSING | P1 |
| Cash flow forecasting (upcoming income/bills) | ❌ MISSING | P1 |
| Bill calendar with due dates | ❌ MISSING | P1 |
| Financial goals (save for X) | ❌ MISSING | P2 |
| Custom spending categories & rules | ⚠️ Partial (categories exist but no user customization) | P1 |
| Household sharing (multi-user accounts) | ❌ MISSING | P2 |
| Investment tracking & performance | ❌ MISSING | P2 |
| Recurring transaction patterns | ✅ Subscription detection | — |
| Transaction search & filters | ⚠️ Basic | P1 |
| Spending trends over time | ✅ SpendingSnapshot | — |
| Plaid bank linking | ❌ MISSING | P0 |

### From MaxRewards ($4.99/mo — 200K+ users)
| Feature | Status | Priority |
|---------|--------|----------|
| Auto-activate rotating categories | ❌ MISSING | P0 |
| Real-time "which card to use" at checkout | ⚠️ Have optimizer but no push/widget | P0 |
| Annual fee analysis (is card worth keeping?) | ❌ MISSING | P1 |
| Reward point balances (pull from issuer) | ❌ MISSING | P1 |
| Signup bonus tracker (spend $X in Y months) | ❌ MISSING | P0 |
| Credit card recommendation engine | ❌ MISSING | P1 |
| Cashback calendar (quarterly rotations) | ❌ MISSING | P1 |
| Perk/credit usage reminders | ⚠️ Benefit tracker exists | P1 |
| Wallet widget (iOS/Android) | ❌ MISSING | P0 |
| Credit score monitoring | ❌ MISSING | P2 |
| Multi-card portfolio optimization | ⚠️ findBestCard exists but basic | P1 |

### From Rocket Money ($6-12/mo — 5M+ users)
| Feature | Status | Priority |
|---------|--------|----------|
| Subscription cancellation assistance | ❌ MISSING | P1 |
| Bill negotiation | ❌ MISSING | P2 |
| Price drop alerts | ❌ MISSING | P1 |
| Duplicate charge detection | ❌ MISSING | P1 |
| Spending "scorecards" & streaks | ❌ MISSING | P2 |
| Push notifications for unusual spending | ❌ MISSING | P0 |

### From Copilot ($10.99/mo — design leader)
| Feature | Status | Priority |
|---------|--------|----------|
| Beautiful, minimal UI (Apple-quality design) | ⚠️ Functional but not polished | P0 |
| Real-time transaction feed | ❌ MISSING (batch only) | P1 |
| Smart categorization with AI learning | ⚠️ Static mapping only | P1 |
| Merchant logo enrichment | ❌ MISSING | P1 |
| Dark mode | ❌ MISSING | P2 |

### Reddit Feedback (common complaints about competitors)
Based on r/personalfinance, r/CreditCards, r/ynab discussions:

**What users love:**
- "MaxRewards auto-activates my rotating categories — saves me $200+/year"
- "Monarch's cash flow forecast is the one feature I'd pay for"
- "Copilot's UI makes me actually want to check my spending"
- "Being told which card to use at checkout changed my life"

**What users hate:**
- "Monarch is $15/mo just to see my own data" → OPPORTUNITY: free tier
- "MaxRewards is slow and crashes" → OPPORTUNITY: native performance
- "YNAB is too complicated for beginners" → OPPORTUNITY: auto-everything
- "None of them combine rewards + budgeting" → YOUR UNIQUE VALUE
- "I don't trust apps with my bank login" → YOUR ADVANTAGE (receipt-based, no Plaid required)

---

## Retailer Expansion Plan

### Current Email Parsers (14)
Amazon, Walmart, Target, Uber, Lyft, DoorDash, Instacart, Apple, Best Buy, Starbucks, + generic + bank-alerts

### Priority Retailers to Add (sorted by US market share)

**Tier 1 — Top 20 by transaction volume (add next):**
1. Costco (online orders — email parser, complement to GraphQL)
2. Home Depot
3. Kroger / Kroger family (Ralphs, Fred Meyer, King Soopers)
4. CVS
5. Walgreens
6. Lowe's
7. Publix
8. Aldi
9. Dollar General / Dollar Tree
10. McDonald's
11. Chick-fil-A
12. Chipotle
13. Grubhub
14. Etsy
15. Nike
16. Sephora / Ulta
17. Petco / PetSmart / Chewy
18. Costco.com (online — different email format)
19. Sam's Club
20. Trader Joe's

**Tier 2 — Direct retailer API connections (OAuth/scraping):**
| Retailer | Method | Notes |
|----------|--------|-------|
| Amazon | Order history scraping (post-login) | Biggest ROI — 60% of US households |
| Walmart | Walmart+ API / receipt lookup | walmart.com/receipt |
| Target | Circle account API | target.com/circle |
| Costco | ✅ Already built (GraphQL) | |
| Kroger | Kroger API (developer.kroger.com) | Official OAuth API |
| Instacart | Order history (auth cookie) | No official API |
| DoorDash | Order history (auth cookie) | No official API |
| Uber/Uber Eats | Uber Developer API | Official OAuth |
| Starbucks | Starbucks Rewards API | Card-linked |
| Chick-fil-A | Chick-fil-A One API | Loyalty integration |
| Chipotle | Chipotle Rewards API | Loyalty integration |

**AI-Generated Parser Strategy (already built — scale it):**
- RetailerParser model already supports auto-generation
- When email from unknown sender arrives → AI generates extraction rules
- Success/failure tracking already built in
- Goal: auto-support 500+ retailers without manual code

---

## Implementation Priority (Phases)

### Phase 1: "Why Pay Monarch?" (Weeks 1-3)
Make the free tier competitive with Monarch's $15/mo paid tier.

1. **Budget System** — create budgets per category with monthly limits
   - Schema: Budget model (userId, category, monthlyLimit, period)
   - UI: budget creation, progress bars, over-budget alerts
   - API: `/api/mobile/budgets`

2. **Plaid Integration** — link bank accounts for automatic transaction import
   - Use Plaid Link for account connection
   - Pull transactions daily (or via webhooks)
   - Categorize & merge with receipt data
   - This alone makes the app 10x more useful

3. **Push Notifications**
   - Over-budget alerts
   - Large transaction alerts
   - Weekly spending summary
   - Subscription renewal reminders (already have data)

4. **Wallet Widget (iOS/Android)**
   - Show "Best card for this store" on home screen
   - Requires location permission + merchant detection
   - iOS: WidgetKit, Android: Glance/AppWidget

### Phase 2: "Why Pay MaxRewards?" (Weeks 4-6)
Beat MaxRewards with better card optimization.

1. **Auto-activate Rotating Categories**
   - Chase Freedom Flex, Discover it — quarterly activation
   - Scrape/API call to activate on user's behalf
   - Push reminder if auto-activate fails

2. **Signup Bonus Tracker**
   - Schema: SignupBonusGoal (cardId, targetSpend, deadline, currentSpend)
   - Calculate from receipts: "You've spent $2,400 / $4,000 — 23 days left"
   - Push alerts: "Spend $53/day to hit your Chase Sapphire bonus"

3. **Annual Fee Analyzer**
   - Calculate total rewards earned per card vs annual fee
   - Recommendation: keep, downgrade, or cancel
   - Factor in perks used/unused

4. **Cashback Calendar**
   - Visual calendar showing which cards earn bonus in which months
   - Rotating category schedule for Freedom Flex, Discover it, etc.
   - Push notification when new quarter starts

5. **Reward Balance Tracking**
   - Pull point/mile balances from issuer apps/sites
   - Total portfolio value (all points converted to $)
   - Redemption recommendations

### Phase 3: "Beautiful & Smart" (Weeks 7-9)
Match Copilot's UX quality.

1. **Merchant Logo Enrichment**
   - Use Clearbit Logo API or build scraper
   - Show merchant logos in transaction feed
   - Visual receipt timeline

2. **AI-Powered Categorization**
   - Replace static MERCHANT_CATEGORIES with ML model
   - Learn from user corrections
   - Handle edge cases (is "Shell" gas or grocery?)

3. **Cash Flow Forecasting**
   - Predict upcoming bills from subscription data
   - Predict income from paycheck patterns
   - Show "safe to spend" balance
   - 30/60/90 day cash flow forecast

4. **Duplicate Charge Detection**
   - Flag same-merchant same-amount charges
   - "Did you mean to pay Netflix twice?"
   - Push alert + one-tap dispute

5. **Price Drop Alerts**
   - Track item prices from receipts
   - Alert when same item is cheaper elsewhere
   - Partner with price comparison APIs

### Phase 4: "AI Moat — On-Device & API Monetization" (Weeks 10-14)
Fine-tuned AI models that parse receipts on-device (zero cloud) and sell as an API.

#### 4A. Fine-Tuned Receipt Parser (Cloud API)
Revenue: B2B API-as-a-Service

1. **Train Text Parser (Phi-3.5-mini, 3.8B)**
   - Fine-tune on 5K+ receipt examples using QLoRA
   - Teacher-student distillation from existing Gemini/GPT-4o parses
   - Target: 94% accuracy, 400ms latency, $0.001/receipt
   - Pipeline: `services/receipt-ml/training/finetune.py --mode text`

2. **Train Vision Parser (Qwen2.5-VL-7B)**
   - Fine-tune on receipt images (beats GPT-4o-mini on OCR: 864 vs 785)
   - No separate OCR step — image directly to structured JSON
   - Pipeline: `services/receipt-ml/training/finetune.py --mode vision`

3. **Deploy Receipt Parsing API**
   - FastAPI + vLLM serving with continuous batching
   - 3-tier fallback in app: Fine-tuned → Gemini → OpenAI
   - API key management, usage metering, rate limiting
   - Pricing: Free (100/mo), Starter $19/mo, Pro $79/mo, Enterprise custom
   - Target customers: expense management apps, accounting SaaS, fintech startups

4. **Batch API**
   - Process up to 50 receipts in one call
   - 5-10x throughput via vLLM continuous batching
   - No competitor offers this natively

**Competitive Position vs Incumbents:**

| Competitor | Price/Receipt | Our Price | We Win By |
|-----------|--------------|-----------|-----------|
| Veryfi | $0.08 | $0.001 | 80x cheaper |
| Taggun | $0.04-0.08 | $0.001 | 40x cheaper |
| Mindee | €0.035-0.05 | $0.001 | 35x cheaper |
| Google Document AI | $0.01 | $0.001 | 10x cheaper |
| AWS Textract | $0.01 | $0.001 | 10x cheaper |

**Revenue Target:** $6K/mo MRR on $1.1K/mo infra cost (80%+ margin)

---

#### 4B. On-Device Parsing (Zero Cloud — THE Differentiator)
Revenue: App subscription + SDK licensing

**The killer feature nobody else has: receipts NEVER leave the device.**

5. **On-Device Text Model (SmolLM-1.7B fine-tuned)**
   - Fine-tune SmolLM-1.7B on receipt text → JSON (same training data)
   - Export to GGUF format (llama.cpp compatible)
   - Model size: ~1GB (Q4 quantized)
   - Runs on: iPhone 12+, any Android 2020+, any laptop
   - Speed: ~3 seconds per receipt on-device

6. **On-Device Vision Pipeline (Phone)**
   ```
   Camera → Apple VisionKit / Google ML Kit (free, on-device OCR)
         → SmolLM-1.7B GGUF (on-device text → JSON)
         → Stored locally. Never leaves phone.
   ```
   - Zero network required — works on airplane, in subway, anywhere
   - No API cost — unlimited parsing after model download
   - No privacy risk — HIPAA/GDPR compliant by architecture

7. **Desktop/Laptop Local Mode**
   - Bundle Phi-3.5-mini Q4 (GGUF, ~2.2GB one-time download)
   - Run as local server: `receiptile serve --local`
   - CLI tool: `receiptile parse receipt.jpg` → JSON output
   - Also serves as local API for developers (localhost:8000)

8. **Browser Extension (WebGPU)**
   - SmolLM-360M runs entirely in-browser via WebGPU
   - Chrome/Firefox extension: right-click any receipt → parse locally
   - Zero server, zero cost, zero privacy concern
   - Or: detect order confirmation emails in Gmail → auto-parse in-browser

9. **React Native Integration (Expo)**
   - `react-native-llama` or ONNX Runtime Mobile
   - Model downloaded on first launch (~1GB, cached)
   - Background processing: snap receipt → parse while you pocket phone
   - Optional cloud sync (encrypted, user-controlled)

**On-Device Monetization:**

| Revenue Stream | Price | Target |
|---|---|---|
| Consumer app (subscription) | $4.99/mo or $49/yr | Privacy-conscious users |
| One-time purchase (lifetime) | $9.99 | Users who hate subscriptions |
| SDK License (B2B) | $499/mo | Companies embedding in their app |
| Enterprise SDK + custom model | $2,000-5,000/mo | Fortune 500, healthcare, government |
| Model weights (developer) | $199 one-time | Developers self-integrating |

**Who pays for privacy:**
- Healthcare workers (HIPAA — receipts with patient info)
- Government/military (classified purchase data)
- European consumers (GDPR — won't send data to US cloud)
- Corporate security teams (vendor/pricing data is competitive intel)
- Enterprise on-prem (Fortune 500 won't send expense data to startups)
- Privacy-conscious consumers (growing market post-AI backlash)

**On-Device vs Every Competitor:**

| Feature | Veryfi | Taggun | Mindee | **Receiptile** |
|---------|--------|--------|--------|----------------|
| Data leaves device | Yes | Yes | Yes | **No** |
| Works offline | No | No | No | **Yes** |
| HIPAA-ready | Needs BAA | No | No | **Yes (by design)** |
| Per-receipt cost | $0.04-0.08 | $0.04-0.08 | €0.035 | **$0 after download** |
| Latency | 2-3s (network) | 2-3s (network) | 2-3s | **1-3s (local)** |
| Works on airplane | No | No | No | **Yes** |

---

#### 4C. Model Improvement Flywheel

10. **User Corrections → Retraining Loop**
    - When user corrects a parsed field, store correction as training signal
    - Monthly retrain with accumulated corrections (active learning)
    - Each user makes the model better for everyone (with consent)

11. **Multi-Language Expansion**
    - Start: English only
    - Phase 2: Spanish, French, German (European market for GDPR positioning)
    - Phase 3: Japanese, Korean, Chinese (Asian e-commerce receipts)
    - Train per-language adapters sharing the same base model

12. **Fraud Detection Add-On**
    - Train a classifier: real vs fake/duplicate receipts
    - Sell as premium feature to loyalty/rewards platforms
    - Taggun charges extra for this — match them but cheaper

---

### Phase 5: "Platform Moat" (Weeks 15-18)
Features that create lock-in and network effects.

1. **Household Sharing**
   - Link family members
   - Combined budget view
   - Individual + household spending

2. **Financial Goals**
   - "Save $5,000 for vacation by August"
   - Track progress via reduced spending
   - Gamification (streaks, achievements)

3. **Retailer API Expansion**
   - Add 10+ retailer direct connections
   - Automated receipt import from loyalty accounts
   - No email access needed for supported retailers

4. **Multi-Language Receipt Support**
   - Leverage fine-tuned models with language-specific adapters
   - Support non-English receipts natively (on-device + cloud)

---

## Pricing Strategy (Multi-Revenue)

### Revenue Stream 1: Consumer App — FREEMIUM
| Tier | Price | What You Get |
|------|-------|-------------|
| Free | $0 | Cloud parsing (100/mo), basic analytics, 1 card |
| Pro | $4.99/mo | **On-device parsing (unlimited, offline)**, all cards, budgets, widgets |
| Lifetime | $49.99 once | Everything in Pro, forever |

### Revenue Stream 2: Receipt Parsing API — B2B SaaS
| Tier | Price | Requests/mo | Target Customer |
|------|-------|-------------|----------------|
| Free | $0 | 100 | Developers trying it |
| Starter | $19/mo | 5,000 | Side projects, MVPs |
| Pro | $79/mo | 50,000 | Production apps |
| Self-Host | $199/mo | Unlimited (their GPU) | Privacy-first companies |
| Enterprise | Custom | Unlimited | Fortune 500 |

Target: expense management apps, accounting SaaS, fintech, corporate tools, tax prep
Competitive edge: 30-80x cheaper than Veryfi/Taggun/Mindee

### Revenue Stream 3: Data API — B2B Intelligence
| Tier | Price | Limits |
|------|-------|--------|
| Trial | Free | 1,000 req/mo, 90-day data |
| Standard | $500/mo | 50K req/mo, 2-year data, merchant-level |
| Enterprise | Custom | Unlimited, item-level, real-time, custom segments |

Target: hedge funds, market research, CPG brands, retailers, ad platforms

### Revenue Stream 4: SDK Licensing
| Tier | Price | What They Get |
|------|-------|--------------|
| Developer | $199 one-time | Model weights (GGUF) for self-integration |
| SDK License | $499/mo | Mobile SDK + model + updates |
| Enterprise SDK | $2,000-5,000/mo | Custom fine-tuned model + on-prem + support |

Target: companies building expense/receipt features into their own apps

### Revenue Projections (12-month)
| Stream | Conservative | Optimistic |
|--------|-------------|-----------|
| Consumer Pro subscriptions | $3K/mo | $15K/mo |
| Parsing API (B2B) | $6K/mo | $25K/mo |
| Data API | $5K/mo | $30K/mo |
| SDK Licensing | $2K/mo | $10K/mo |
| **Total MRR** | **$16K/mo** | **$80K/mo** |

### Why This Works
- **Free app** drives user growth → more data → better models → better API
- **On-device** is the wedge (nobody else has it) → justifies Pro subscription
- **API** is the cash cow (recurring, high-margin, scales with zero marginal cost)
- **Data API** is the long-game (more users = more valuable aggregate data)
- **SDK** is the enterprise play (companies pay to avoid building ML infra)

---

## Technical Decisions

### Plaid vs Receipt-Only
**Recommendation: Both.** Receipts give item-level detail no bank can. Plaid gives complete transaction coverage. Together they're unbeatable.

- Phase 1: Add Plaid for bank linking (shows all transactions)
- Merge: Match Plaid transactions to receipts for enrichment
- Result: Every transaction has BOTH bank-level metadata AND item-level detail

### Mobile Architecture
- Keep Expo/React Native (already built)
- Add WidgetKit extension (Swift) for iOS widget
- Add Glance for Android widget
- Background location for "at checkout" card suggestions

### Notifications
- Already have `pushToken` on User model
- Use Expo Push Notifications service
- Add notification preferences & quiet hours

---

## Success Metrics

| Metric | 3 Months | 6 Months | 12 Months |
|--------|----------|----------|-----------|
| Monthly Active Users | 5K | 50K | 200K |
| Receipts processed/month | 50K | 500K | 2M |
| Retailer parsers (email) | 50+ | 100+ | 200+ |
| Retailer direct connections | 5 | 15+ | 30+ |
| Cards in database | 50+ | 75+ | 100+ |
| **Parsing API customers** | 10 | 50 | 200 |
| **On-device model accuracy** | 90% | 94% | 96% |
| **Languages supported** | 1 (EN) | 3 | 8 |
| **Total MRR** | $3K | $16K | $50K+ |

### AI/ML Milestones
| Milestone | Target Date |
|-----------|------------|
| Text parser (Phi-3.5) fine-tuned & deployed | Week 11 |
| Vision parser (Qwen2.5-VL) fine-tuned & deployed | Week 12 |
| Parsing API live with paying customers | Week 13 |
| SmolLM-1.7B on-device model exported (GGUF) | Week 14 |
| React Native on-device integration working | Week 15 |
| Browser extension (WebGPU) MVP | Week 16 |
| Multi-language (ES, FR, DE) adapters | Week 18 |
| Fraud detection classifier | Week 20 |

---

## Competitive Advantage Summary

### vs Consumer Apps
| vs Monarch | vs MaxRewards | vs Rocket Money | vs YNAB |
|-----------|---------------|-----------------|---------|
| Free (they're $15/mo) | Rewards + budgeting combined | Item-level receipt detail | Auto-everything (no manual entry) |
| Item-level data | Faster, more cards | Free subscription tracking | Receipt-based accuracy |
| Receipt images | Location-aware recs | Direct retailer connections | Real spending (not bank categories) |
| Hardware device | Widget at checkout | Price history tracking | Works without bank linking |
| **On-device AI (privacy)** | **Offline-first** | **No bank login needed** | **AI categorization** |

### vs Receipt Parsing APIs
| vs Veryfi | vs Taggun | vs Mindee | vs Google/AWS |
|-----------|-----------|-----------|---------------|
| 80x cheaper | 40x cheaper | 35x cheaper | 10x cheaper |
| On-device option | On-device option | On-device option | Self-hostable |
| Sub-500ms latency | Batch API (50/call) | Open model weights | Higher accuracy (94%) |
| No $500/mo minimum | Privacy (no cloud) | SDK for mobile | No vendor lock-in |

### The Moat Nobody Can Copy Quickly
1. **On-device models** — Veryfi/Taggun's entire business model requires cloud. They can't pivot.
2. **Fine-tuned accuracy** — Trained specifically on receipts, not general documents. Better at the one thing that matters.
3. **Flywheel** — More users → more corrections → better model → more users. Competitors start from zero.
4. **Price** — We self-host open models. They use expensive proprietary systems. Our cost floor is 10-100x lower.
5. **Privacy positioning** — In a post-AI-paranoia world, "your data never leaves your device" is an emotional sell competitors can't match.
