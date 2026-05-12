# Universal Receipts Platform

## Architecture

Turborepo monorepo: Expo (mobile) + Next.js 15 (web/API) + shared packages.

```
apps/web       — Next.js 15 App Router (API + Web UI)
apps/mobile    — Expo React Native (iOS + Android)
packages/shared — Canonical types, Zod schemas, constants
packages/db     — Prisma schema + client
```

## Stack

- TypeScript throughout
- Next.js 15 App Router, Tailwind CSS v4
- NextAuth v5 (credentials + Google OAuth)
- Prisma + PostgreSQL (Neon)
- Vercel `waitUntil()` for background processing
- Vercel Cron for periodic auto-sync (every 6 hours)
- OpenAI GPT-4o for receipt OCR/parsing (last-resort fallback only)
- Cheerio + regex for $0-cost email parsing of known retailers
- Cloudflare R2 for file storage
- Expo SDK 52 + Expo Router for mobile

## Setup

```bash
corepack enable
pnpm install
cp .env.example .env.local   # fill in secrets
pnpm db:generate
pnpm db:push
pnpm dev
```

## Key Patterns

- Server Actions for mutations (signup, upload, disconnect)
- `waitUntil()` from `@vercel/functions` for non-blocking background processing
- Shared Zod schemas validate both API input and GPT-4o output
- All receipt sources normalize to the canonical schema in `packages/shared/src/types/receipt.ts`
- Tiered parsing: code parsers ($0) for known retailers → GPT-4o (~$0.01) for unknowns only

## Processing Pipeline

Upload → Store file → IngestionJob → waitUntil(processReceiptJob) → GPT-4o parse → Normalize → Save Receipt

Email → Gmail API fetch → Code parser (cheerio/regex) → Save Receipt (no AI cost for known formats)

POS/Customer → OAuth sync → Connector normalize → Dedup → Save Receipt

## Data Sources

### Email (primary, hands-free)
- Gmail OAuth connection with auto-sync
- Code-based parsers for: Amazon, Walmart, Target, Costco, Instacart, DoorDash, Uber Eats, Uber, Lyft, Apple, Best Buy, Starbucks, Etsy, PayPal, Grubhub
- Generic fallback parser for unknown formats
- GPT-4o only when code parsers fail completely

### POS Connectors (merchant-side)
- Square, Shopify, Clover
- OAuth2 flow → fetch orders → normalize to receipt schema

### Customer Connectors (consumer-side)
- PayPal, Shopify Customer
- OAuth2 flow → fetch transactions → normalize

### Upload (manual fallback)
- Image upload → R2 storage → GPT-4o OCR → structured receipt

## Auto-Sync

- On sign-in: `syncAllSources(userId)` triggered via NextAuth events hook
- Cron: `/api/cron/sync` runs every 6 hours for all users with active connections
- Manual: `/api/mobile/sync` POST endpoint

## POS Hardware & Webhook Integration

### Webhook Receivers (cloud POS → platform)
- `POST /api/webhooks/square` — Square payment.completed events (HMAC-SHA256 verified)
- `POST /api/webhooks/toast` — Toast ORDER_PAID/ORDER_CLOSED events
- `POST /api/webhooks/shopify` — Shopify orders/paid events (HMAC-SHA256 verified)
- All webhooks: verify signature → resolve merchant → dedup → create receipt

### Device API (ESP32 hardware → platform)
- `POST /api/device/register` — Provision new device (returns dk_<key>)
- `POST /api/device/heartbeat` — Device health check
- `POST /api/device/receipts` — Publish parsed ESC/POS data (single or batch)
- `GET /api/device/receipts` — Query recent receipts from device
- `POST /api/device/nfc-handover` — Generate NFC claim token for tap handover

### NFC Claim Flow
1. ESP32 parses printer data → publishes to `/api/device/receipts`
2. NFC tap detected → device calls `/api/device/nfc-handover` → gets claim URL
3. Phone opens Universal Link → `/claim/<token>` screen in mobile app
4. Mobile app calls `POST /api/mobile/claim` → receipt linked to user

### Wallet Pass (Apple VAS / Google Smart Tap)
- `GET /api/wallet/apple` — Generate Master Receipt Pass (Apple Wallet)
- `GET /api/wallet/google` — Generate Master Receipt Pass (Google Wallet)
- Pass updates automatically when new receipts arrive
- NFC protocol handlers for contactless receipt delivery at terminals

## Database

Prisma schema at `packages/db/prisma/schema.prisma`. Core tables:
User, Receipt, ReceiptItem, IngestionJob, EmailConnection, MerchantConnection, CustomerConnection, UserCard, CardRewardRule, Device, WebhookEvent, WalletPass

## Deduplication

All import paths deduplicate on: userId + merchantCanonicalName + purchasedAt (date) + total
