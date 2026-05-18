# Receiptiles Infrastructure Setup Guide

## Table of Contents

- [Neon Database Branching](#neon-database-branching)
- [Sentry Error Monitoring](#sentry-error-monitoring)
- [UptimeRobot Monitoring](#uptimerobot-monitoring)
- [Resend Email Configuration](#resend-email-configuration)
- [Vercel Environment Variables](#vercel-environment-variables)

---

## Neon Database Branching

Neon supports Git-like branching for databases, allowing isolated staging/preview environments without duplicating data.

### Creating a Staging Branch

1. **Log in to the Neon Console**: https://console.neon.tech
2. **Select the project** (receipts)
3. **Navigate to Branches** in the sidebar
4. **Click "Create Branch"**:
   - Name: `staging`
   - Parent branch: `main`
   - Include data: Yes (creates a copy-on-write snapshot)
   - Compute size: 0.25 CU (sufficient for staging)
5. **Copy the connection string** from the branch dashboard

### Setting DATABASE_URL per Environment

| Environment | DATABASE_URL Source |
|---|---|
| Production | Neon `main` branch pooled connection string |
| Preview | Neon `staging` branch pooled connection string |
| Development | Local PostgreSQL or Neon `dev` branch |

Connection string format:
```
postgresql://<user>:<password>@<host>.neon.tech/<database>?sslmode=require
```

For pooled connections (recommended for serverless):
```
postgresql://<user>:<password>@<host>-pooler.region.aws.neon.tech/<database>?sslmode=require
```

### Running Migrations Against Staging

```bash
# Set the staging DATABASE_URL
export DATABASE_URL="postgresql://...@staging-host.neon.tech/neondb?sslmode=require"

# Generate Prisma client
pnpm db:generate

# Push schema changes (development only, no migration history)
pnpm db:push

# Or create and apply a migration (production workflow)
npx prisma migrate dev --name <migration-name>

# Apply pending migrations (CI/CD)
npx prisma migrate deploy
```

### Best Practices

- Create a new branch for each feature/PR that requires schema changes
- Delete branches after merging to avoid compute costs
- Use `prisma migrate deploy` (not `db push`) in production pipelines
- Neon branches are copy-on-write; they share storage with parent until modified

---

## Sentry Error Monitoring

### Initial Setup

1. **Create a Sentry account**: https://sentry.io/signup/
2. **Create an organization**: `receiptiles`
3. **Create a project**:
   - Platform: Next.js
   - Project name: `receiptiles-web`
4. **Get your DSN** from: Settings > Projects > receiptiles-web > Client Keys (DSN)

### Configuration

1. Install the Sentry SDK:
   ```bash
   pnpm add @sentry/nextjs --filter=@receipts/web
   ```

2. Run the Sentry wizard:
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```

3. Set environment variables in Vercel:
   ```bash
   # DSN (all environments)
   npx vercel env add NEXT_PUBLIC_SENTRY_DSN production --value "https://xxx@xxx.ingest.sentry.io/xxx"
   
   # Auth token for source maps (production + preview)
   npx vercel env add SENTRY_AUTH_TOKEN production --value "sntrys_xxx"
   ```

4. The following are already configured:
   - `SENTRY_ORG` = `receiptiles`
   - `SENTRY_PROJECT` = `receiptiles-web`

### Verifying Sentry

After deployment, trigger a test error:
```typescript
// Temporarily add to any page
throw new Error("Sentry test error - delete after confirming");
```

Check the Sentry dashboard for the error within 30 seconds.

---

## UptimeRobot Monitoring

### Setup (Free Tier)

1. **Create an account**: https://uptimerobot.com/
2. **Add a new monitor**:
   - Monitor Type: HTTP(s)
   - Friendly Name: `Receiptiles - Health`
   - URL: `https://receipts-platform.vercel.app/api/health`
   - Monitoring Interval: 5 minutes
3. **Configure alerts**:
   - Add your email as an alert contact
   - Optionally add a Slack/Discord webhook
4. **Add a keyword monitor** (optional):
   - Monitor Type: Keyword
   - URL: Same as above
   - Keyword: `"status":"ok"`
   - Keyword Type: Keyword Exists

### Recommended Monitors

| Monitor | URL | Type | Interval |
|---|---|---|---|
| Health Check | `/api/health` | HTTP(s) | 5 min |
| Homepage | `/` | HTTP(s) | 5 min |
| API Response | `/api/health` | Keyword (`"status":"ok"`) | 5 min |

### Status Page (Optional)

UptimeRobot offers a free public status page:
1. Go to "My Settings" > "Status Pages"
2. Create a page: `status.receiptiles.com`
3. Add your monitors
4. Point a CNAME record to the provided URL

---

## Resend Email Configuration

### Setup

1. **Create an account**: https://resend.com/signup
2. **Add and verify your domain**:
   - Go to Domains > Add Domain
   - Enter: `receiptiles.com` (or your domain)
   - Add the DNS records Resend provides:
     - SPF (TXT record)
     - DKIM (3 CNAME records)
     - DMARC (TXT record, optional but recommended)
3. **Wait for verification** (usually 5-30 minutes)
4. **Generate an API key**:
   - Go to API Keys > Create API Key
   - Name: `production`
   - Permission: Sending access
   - Domain: Your verified domain

### Update Vercel Environment Variable

```bash
# Replace placeholder with real key
npx vercel env rm RESEND_API_KEY production
printf "re_your_real_api_key_here" | npx vercel env add RESEND_API_KEY production --force
```

### Test Email Sending

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Receiptiles <noreply@receiptiles.com>",
    "to": "your-email@example.com",
    "subject": "Test Email",
    "text": "If you received this, Resend is configured correctly."
  }'
```

### Rate Limits (Free Tier)

- 100 emails/day
- 3,000 emails/month
- 1 custom domain

---

## Vercel Environment Variables

### Management Commands

```bash
# List all environment variables
npx vercel env ls

# Add a variable (interactive)
npx vercel env add VARIABLE_NAME

# Add a variable (non-interactive, production)
printf "value" | npx vercel env add VARIABLE_NAME production --force

# Add to multiple environments via API
curl -X POST "https://api.vercel.com/v10/projects/prj_6d83Vc6CVnjouRDtcv5CF4N6iHhI/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"NAME","value":"VALUE","type":"encrypted","target":["production","preview"]}'

# Pull env vars to .env.local for local development
npx vercel env pull .env.local

# Remove a variable
npx vercel env rm VARIABLE_NAME production
```

### Current Environment Variables

| Variable | Production | Preview | Development | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | Set | Set | Set | Neon pooled connection |
| `NEXTAUTH_SECRET` | Set | - | - | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Set | - | - | `https://receipts-platform.vercel.app` |
| `GOOGLE_CLIENT_ID` | Set | - | - | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Set | - | - | Google OAuth |
| `OPENAI_API_KEY` | Set | - | - | GPT-4o fallback parsing |
| `GEMINI_API_KEY` | Set | - | - | Gemini Flash primary parser |
| `RESEND_API_KEY` | Placeholder | - | - | Email notifications |
| `CRON_SECRET` | Set | - | - | Protects cron endpoints |
| `NEXT_PUBLIC_SENTRY_DSN` | Empty | Empty | Empty | Set after Sentry project creation |
| `SENTRY_ORG` | Set | Set | - | `receiptiles` |
| `SENTRY_PROJECT` | Set | Set | - | `receiptiles-web` |
| `LOG_LEVEL` | `warn` | `info` | `debug` | Controls logging verbosity |
| `BLOB_READ_WRITE_TOKEN` | Set | - | - | Vercel Blob storage |
| `SQUARE_APP_ID` | Set | - | - | Square POS integration |
| `SQUARE_APP_SECRET` | Set | - | - | Square POS integration |

### Adding a New Secret

1. Generate or obtain the secret value
2. Add to Vercel:
   ```bash
   printf "secret_value" | npx vercel env add SECRET_NAME production --force
   ```
3. Pull to local:
   ```bash
   npx vercel env pull .env.local
   ```
4. Add to `.env.example` with a placeholder description (never commit real values)
5. Redeploy if the variable is needed immediately:
   ```bash
   npx vercel --prod
   ```

---

## Quick Reference: Post-Setup Checklist

- [ ] Neon staging branch created
- [ ] DATABASE_URL set for all environments
- [ ] Sentry project created and DSN configured
- [ ] UptimeRobot monitors active
- [ ] Resend domain verified and API key set
- [ ] All placeholder env vars replaced with real values
- [ ] Cron jobs verified (check Vercel dashboard > Crons tab)
- [ ] Health endpoint returns 200 in production
