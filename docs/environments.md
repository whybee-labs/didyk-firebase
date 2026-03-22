# Environments

## Overview

| Environment | Firebase Project | Branch | Razorpay | WhatsApp |
|-------------|-----------------|--------|----------|----------|
| **prod** | `didyk-30aa4` | `main` | Live mode | Real phone number |
| **staging** | `dharmawear-f2cc0` | `staging` | Test mode | Same creds as prod (see note) |

---

## Setup

### 1. Create the staging Firebase project (one-time)
```
firebase projects:create dharmawear-f2cc0 --display-name "Whybee Staging"
```

### 2. Set secrets on staging
```
firebase use staging
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN       # same as prod for now
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID    # same as prod for now
firebase functions:secrets:set GROQ_API_KEY
firebase functions:secrets:set RAZORPAY_KEY_ID             # test mode key
firebase functions:secrets:set RAZORPAY_KEY_SECRET         # test mode secret
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET     # test mode webhook secret
firebase functions:secrets:set RAZORPAY_OWNER_OFFER_ID     # test mode offer id
firebase functions:secrets:set OWNER_PHONES
```

### 3. Add GitHub Actions secrets (for CI/CD)
In GitHub repo → Settings → Secrets and variables → Actions:

| Secret | How to get it |
|--------|--------------|
| `FIREBASE_SERVICE_ACCOUNT_STAGING` | Firebase Console → `dharmawear-f2cc0` → Project Settings → Service Accounts → Generate new private key |
| `FIREBASE_SERVICE_ACCOUNT_PROD` | Firebase Console → `didyk-30aa4` → Project Settings → Service Accounts → Generate new private key |

---

## Deploying

### Via CI (recommended)
- Push to `staging` branch → auto-deploys to staging
- Push to `main` branch → auto-deploys to prod (uses GitHub `production` environment — add required reviewers there for an approval gate)

### Via CLI (manual)
```
npm run deploy:staging   # from functions/
npm run deploy:prod      # from functions/
```

---

## WhatsApp on Staging

Meta only supports one webhook URL per phone number. Staging shares the same WhatsApp credentials as prod.

- **Normal staging testing**: Use Firebase emulators (`npm run serve`) for full conversation flow locally
- **Razorpay webhooks**: Test against staging function URL using Razorpay test mode
- **WhatsApp E2E on staging** (rare): Temporarily update the webhook URL in Meta Dashboard → test → switch back to prod URL

Prod WhatsApp webhook URL: `https://us-central1-didyk-30aa4.cloudfunctions.net/whatsappWebhook`
Staging WhatsApp webhook URL: `https://us-central1-dharmawear-f2cc0.cloudfunctions.net/whatsappWebhook`
