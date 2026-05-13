# Monetization Strategy: Credit Card Affiliate Revenue

## Revenue Model

Credit card referrals operate on CPA (Cost Per Acquisition) — we earn $50-$200+ per approved card application when users apply through our tracking links.

## Revenue Flow

```
User browses cards in our app
  → Clicks "Apply" (our affiliate tracking link)
  → Redirected to bank's application page
  → User gets approved
  → We get paid ($50-$200+ per approval)
```

## Implementation Plan

### Phase 1: Join Affiliate Networks
- **Impact** (impact.com) — primary network, most major card issuers
- **CardRatings** (cardratings.com/affiliate.html) — credit card focused
- **Commission Junction** (cj.com) — backup network
- Apply for individual card programs: Chase, Amex, Capital One, Citi, Discover

### Phase 2: Integration
- Place unique tracking links behind "Apply Now" buttons on card detail pages
- Use server-to-server (S2S) postback tracking (not browser cookies) to avoid ad-blocker losses
- Open applications in in-app web view to maintain tracking session
- Implement "last click" optimization — encourage users to apply in one session

### Phase 3: Card Recommendation Engine (Already Built)
- Our 39-card database with reward rules already recommends the best card per purchase
- Add "Apply for this card" CTA when recommending a card the user doesn't have
- Show estimated annual rewards if they got the card: "You'd earn $X/year with this card"

### Phase 4: Featured Cards Section
- Dedicated "Explore Cards" page showing all cards with our affiliate links
- Sort by: best for dining, best for travel, best for cashback, etc.
- Personalized recommendations based on user's spending patterns
- "Cards you're missing out on" based on their receipt history

## Commission Models

| Model | Payment | Trigger | Typical Range |
|-------|---------|---------|---------------|
| CPA | Flat fee | Card approved | $50-$200+ |
| CPL | Lower flat fee | Pre-qualification form filled | $2-$10 |
| CPC | Per click | Rare in credit cards | N/A |

## Key Technical Considerations

- **Cookie duration**: 30-45 days typically. Server-side tracking preferred.
- **Cookie overwrite**: Last click wins. Optimize for single-session conversion.
- **S2S tracking**: Use Impact's server-to-server postback to avoid ad-blocker losses.
- **Web views vs native browser**: Web views maintain better tracking continuity.
- **Compliance**: Must disclose affiliate relationships (FTC guidelines).

## Revenue Projections

| Users | Cards Applied/Month | Approval Rate | Avg CPA | Monthly Revenue |
|-------|-------------------|---------------|---------|-----------------|
| 1,000 | 50 (5%) | 60% | $100 | $3,000 |
| 10,000 | 500 (5%) | 60% | $100 | $30,000 |
| 100,000 | 5,000 (5%) | 60% | $100 | $300,000 |

## Additional Revenue Streams (Future)

1. **Premium subscription** — advanced analytics, unlimited card tracking
2. **Merchant partnerships** — featured placement for POS-connected merchants
3. **Data insights** (anonymized) — spending trend reports for merchants
4. **White-label API** — receipt infrastructure for other fintech apps

## Target Audience

- **Prime consumers** (travel rewards, premium cards) — higher CPAs
- Focus on users who already track spending = high intent to optimize cards

## References

- Impact.com — primary affiliate network
- CardRatings — credit card affiliate program
- FTC affiliate disclosure guidelines
