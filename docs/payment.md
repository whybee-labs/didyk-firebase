# Payment Integration (Razorpay)

---

## Overview

After all outputs are delivered (preview video, image, etc.), the user receives a Razorpay payment link as a CTA button. When the user pays, Razorpay calls our webhook, which marks the conversation complete and sends a confirmation message.

```
Fulfillment → createPaymentLink() → sendCTAButton("Complete Payment") → status: "awaiting_payment"
                                                         ↓
                                            user pays on Razorpay
                                                         ↓
                                       POST /razorpayWebhook
                                       verify signature
                                       look up conversation by paymentData.linkId
                                       set paymentData.paidAt, status: "completed"
                                       send "✅ Payment confirmed! Here's your content:"
```

---

## Creating a Payment Link

**File:** `services/payment/createPaymentLink.ts`

```ts
createPaymentLink(phone, conversationId, amount, description)
  → { id: string, shortUrl: string }
```

- Calls Razorpay API with Basic Auth (`key_id:key_secret`)
- `amount` is in **INR** — converted to paise (× 100) internally
- `reference_id` is set to `${conversationId}-${Date.now()}` (decorative — used for tracing in Razorpay dashboard; must be unique per link)
- `notify: { sms: false, email: false }` — Whybee sends the link manually via WhatsApp
- Returns `{ id, shortUrl }`:
  - `shortUrl` is sent to the user as a CTA button
  - `id` (the Razorpay payment link ID) is stored in `paymentData.linkId` on the conversation

---

## Storing Payment Data

After `createPaymentLink()` succeeds, `fulfillment.ts` writes:

```ts
await db.collection("conversations").doc(cid).update({
  status: "awaiting_payment",
  paymentData: {
    linkId: id,              // Razorpay payment link ID
    amount: config.pricing.amount,  // in INR
    createdAt: new Date(),
  },
});
```

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

Payload path to the payment link entity:
```
req.body.payload.payment_link.entity.id   ← the payment link ID (not reference_id)
```

Steps:
1. Extract `entity.id` (Razorpay payment link ID)
2. Query `conversations` where `paymentData.linkId == entity.id` (limit 1)
3. Get `phone` from the conversation document
4. Send `"✅ Payment confirmed! Here's your content:"` via WhatsApp
5. Send stub content (currently: a stub video URL)
6. Update conversation: `status: "completed"`, `paymentData.paidAt: new Date()`

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
# Get the payment link ID from Firestore: conversations/{id}.paymentData.linkId
LINK_ID="plink_abc123"
SECRET=$(firebase functions:secrets:access RAZORPAY_WEBHOOK_SECRET --project=<project-id>)

PAYLOAD="{\"event\":\"payment_link.paid\",\"payload\":{\"payment_link\":{\"entity\":{\"id\":\"${LINK_ID}\"}}}}"

SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

curl -X POST https://YOUR_FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIG" \
  -d "$PAYLOAD"
```
