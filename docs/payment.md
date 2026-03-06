# Payment Integration (Razorpay)

---

## Overview

After all outputs are delivered (preview video, image, etc.), the user receives a Razorpay payment link. When the user pays, Razorpay calls our webhook, which marks the conversation complete and sends a confirmation message.

```
Fulfillment → createPaymentLink() → send link to user → status: "awaiting_payment"
                                                               ↓
                                              user pays on Razorpay
                                                               ↓
                                         POST /razorpayWebhook
                                         verify signature
                                         look up conversation by reference_id
                                         status: "completed"
                                         send "✅ Payment received!" to user
```

---

## Creating a Payment Link

**File:** `services/payment/createPaymentLink.ts`

```ts
createPaymentLink(phone, conversationId, amount, description)
  → { id: string, shortUrl: string }
```

- Calls `POST https://api.razorpay.com/v1/payment_link` with Basic Auth (`key_id:key_secret`)
- `amount` is in **INR** — converted to paise (× 100) internally
- `reference_id` is set to `conversationId` so the webhook can look up the conversation without a secondary index
- `notify: { sms: false, email: false }` — Whybee sends the link manually via WhatsApp
- Returns `{ id, shortUrl }` — `shortUrl` is sent to the user, `id` is stored in `collectedData.paymentLinkId`

---

## Razorpay Webhook

**File:** `api/razorpayWebhook.ts`
**Firebase function:** `razorpayWebhook`

**Secrets required:**
- `RAZORPAY_WEBHOOK_SECRET` — for signature verification
- `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` — for sending the confirmation message

### Signature Verification

Razorpay sends `X-Razorpay-Signature` — a HMAC SHA256 of the raw request body using the webhook secret.

```ts
const expected = crypto
  .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET.value())
  .update(JSON.stringify(req.body))
  .digest("hex");

if (sig !== expected) return res.status(400).send("Invalid signature");
```

Requests with invalid signatures are rejected with 400.

### Response Strategy

The function responds 200 **immediately** before processing, so Razorpay doesn't retry if processing takes time (same pattern as the WhatsApp webhook).

### Handling `payment_link.paid`

Only `payment_link.paid` events are processed. Other events are ignored.

Payload path to `reference_id`:
```
req.body.payload.payment_link.entity.reference_id
```

Steps:
1. Extract `reference_id` (= `conversationId`)
2. Load `conversations/{conversationId}` → get `phone`
3. Update `status: "completed"`
4. Send `"✅ Payment received! Your video will be delivered shortly."` via WhatsApp

---

## Secrets Setup

```bash
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
```

Get these from the Razorpay dashboard:
- **Key ID / Key Secret** — Settings → API Keys
- **Webhook Secret** — Settings → Webhooks → Create webhook → copy secret

---

## Razorpay Dashboard Setup

1. Create a webhook pointing to your `razorpayWebhook` function URL
2. Enable the `payment_link.paid` event
3. Copy the webhook secret → set as `RAZORPAY_WEBHOOK_SECRET`

---

## Testing the Webhook

```bash
CONV_ID="<conversationId from Firestore>"
SECRET=$(firebase functions:secrets:access RAZORPAY_WEBHOOK_SECRET --project=<project-id>)

PAYLOAD="{\"event\":\"payment_link.paid\",\"payload\":{\"payment_link\":{\"entity\":{\"reference_id\":\"${CONV_ID}\"}}}}"

SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

curl -X POST https://YOUR_FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIG" \
  -d "$PAYLOAD"
```
