import Razorpay from "razorpay";
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "config/env";

function getClient(): Razorpay {
  return new Razorpay({
    key_id: RAZORPAY_KEY_ID.value(),
    key_secret: RAZORPAY_KEY_SECRET.value(),
  });
}

export async function createPaymentLink(
  phone: string,
  conversationId: string,
  amount: number, // in major currency unit (INR or USD)
  description: string,
  currency: "INR" | "USD" = "INR"
): Promise<{ id: string; shortUrl: string }> {
  const client = getClient();

  const link = await client.paymentLink.create({
    amount: amount * 100, // convert to smallest unit (paise / cents)
    currency,
    description,
    customer: { contact: phone },
    reference_id: `${conversationId}-${Date.now()}`,
    notify: { sms: false, email: false },
    reminder_enable: false,
  });

  return { id: link.id, shortUrl: link.short_url };
}
