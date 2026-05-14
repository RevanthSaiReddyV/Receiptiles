# Retailer Coverage Strategy

## Receipt Sources Per Retailer

### Priority 1: Email Receipts (Already Built)
These retailers send receipt emails that our Gmail parser can capture:
- Amazon, Walmart, Target, Costco, Apple, Best Buy, Uber, Lyft
- DoorDash, Instacart, Starbucks, Etsy, PayPal, Grubhub

### Priority 2: POS Webhooks (Built, needs merchant onboarding)
- Square merchants (connected to production)
- Shopify merchants (connector built)
- Clover merchants (connector built)
- Toast merchants (webhook receiver built)

### Priority 3: Browser-Based Receipt Scrapers (To Build)
Leverage existing open-source repos + build our own:

**Costco** — harrykhh/Costco-Receipt-Downloader approach
- Uses authenticated session (no credential storage needed)
- GraphQL API at ecom-api.costco.com
- Returns: warehouse name, items, prices, tax, tender, membership

**Amazon** — dcwangmit01/amazon-invoice-downloader approach
- Playwright-based headless browser
- Downloads official invoice PDFs
- Extracts line items, prices, tax, shipping

**Walmart** — Account order history scraping
- Authenticated session via browser extension
- Order history JSON extraction

### Priority 4: Bank Transaction Alerts (Built)
8 banks supported: Chase, Amex, BofA, Capital One, Citi, Wells Fargo, Discover, Apple Card

## Complete US Retailer Database

### Mass Merchants & Department Stores
| Retailer | Category | Receipt Method |
|---|---|---|
| Walmart | Shopping | Email + App + POS |
| Target | Shopping | Email + App + POS |
| Costco | Shopping | Browser scraper |
| Sam's Club | Shopping | App + Email |
| Meijer | Shopping | POS |
| TJ Maxx | Shopping | POS |
| Marshalls | Shopping | POS |
| Ross | Shopping | POS |
| Macy's | Shopping | Email + POS |
| Kohl's | Shopping | Email + POS |
| Nordstrom | Shopping | Email + POS |
| JCPenney | Shopping | Email + POS |
| Dollar General | Shopping | POS |
| Dollar Tree | Shopping | POS |

### Grocery
| Retailer | Category | Receipt Method |
|---|---|---|
| Kroger | Groceries | App + Email |
| Albertsons | Groceries | POS |
| Safeway | Groceries | POS |
| Publix | Groceries | POS |
| H-E-B | Groceries | POS |
| Whole Foods | Groceries | Amazon email |
| Trader Joe's | Groceries | POS only |
| Aldi | Groceries | POS |
| Sprouts | Groceries | POS |

### Dining
| Retailer | Category | Receipt Method |
|---|---|---|
| McDonald's | Dining | App |
| Starbucks | Dining | Email + App |
| Chipotle | Dining | Email + App |
| Panera | Dining | Email |
| Chick-fil-A | Dining | App |
| DoorDash | Dining | Email |
| Uber Eats | Dining | Email |
| Grubhub | Dining | Email |

### Gas Stations
| Retailer | Category | Receipt Method |
|---|---|---|
| Shell | Gas | App |
| Chevron | Gas | POS |
| BP | Gas | App |
| ExxonMobil | Gas | App |
| Costco Gas | Gas | Browser scraper |

### Electronics & Home
| Retailer | Category | Receipt Method |
|---|---|---|
| Best Buy | Electronics | Email |
| Apple Store | Electronics | Email |
| Home Depot | Shopping | Email + POS |
| Lowe's | Shopping | Email + POS |
| IKEA | Shopping | Email |

### Health & Beauty
| Retailer | Category | Receipt Method |
|---|---|---|
| CVS | Drugstores | Email + App |
| Walgreens | Drugstores | Email + App |
| Sephora | Shopping | Email |
| Ulta | Shopping | Email |

### E-Commerce
| Retailer | Category | Receipt Method |
|---|---|---|
| Amazon | Shopping | Email + Browser scraper |
| eBay | Shopping | Email |
| Etsy | Shopping | Email |
| Newegg | Electronics | Email |

## Browser Extension Strategy

Build a browser extension that:
1. Detects when user is on a supported retailer site
2. Uses their authenticated session (no credential storage)
3. Extracts order history via the retailer's own APIs
4. Sends structured data to our platform

Supported retailers for extension:
- Costco (GraphQL API)
- Amazon (Order history pages)
- Walmart (Account API)
- Target (Circle account)
- Best Buy (Order history)

## Open Source Repos to Reference

- harrykhh/Costco-Receipt-Downloader (Chrome extension, client-side)
- dcwangmit01/amazon-invoice-downloader (Playwright)
- TechStud/TCRDD (Costco dashboard)
- sanghviharshit/costco-spending-insights (Analytics)
- Achierius/amazon-transaction-scraper (CSV export)
