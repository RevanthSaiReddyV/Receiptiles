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

### Phase 4: "Platform Moat" (Weeks 10-12)
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

4. **Smart Receipt OCR v2**
   - On-device ML for instant parsing (no API call)
   - Support for non-English receipts
   - Handwritten receipt support

---

## Pricing Strategy (Free-first with Data API monetization)

### Consumer App — FREE
All features free. No premium tier needed because:
- More users = more data = more Data API revenue
- Revenue from B2B data partnerships >> consumer subscriptions
- Network effects: household features drive organic growth

### Data API — B2B Revenue
| Tier | Price | Limits |
|------|-------|--------|
| Trial | Free | 1,000 req/mo, 90-day data |
| Standard | $500/mo | 50K req/mo, 2-year data, merchant-level |
| Enterprise | Custom | Unlimited, item-level, real-time, custom segments |

Target customers: hedge funds, market research, CPG brands, retailers, ad platforms

### Optional Premium (if needed)
- $2.99/mo for export/CSV, priority support, custom categories
- Keep it cheap enough that the comparison to $15/mo Monarch is stark

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

| Metric | Target (6 months) |
|--------|-------------------|
| Monthly Active Users | 50K |
| Receipts processed/month | 500K |
| Retailer parsers (email) | 100+ |
| Retailer direct connections | 15+ |
| Cards in database | 75+ |
| Data API customers | 10+ |
| Revenue (Data API) | $15K MRR |

---

## Competitive Advantage Summary

| vs Monarch | vs MaxRewards | vs Rocket Money | vs YNAB |
|-----------|---------------|-----------------|---------|
| Free (they're $15/mo) | Rewards + budgeting combined | Item-level receipt detail | Auto-everything (no manual entry) |
| Item-level data | Faster, more cards | Free subscription tracking | Receipt-based accuracy |
| Receipt images | Location-aware recs | Direct retailer connections | Real spending (not bank categories) |
| Hardware device | Widget at checkout | Price history tracking | Works without bank linking |
