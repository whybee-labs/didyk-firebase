import axios from "axios";
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "../../config/env";

export async function createPaymentLink(
  phone: string,
  conversationId: string,
  amount: number, // in INR
  description: string
): Promise<{ id: string; shortUrl: string }> {
  const auth = Buffer.from(
    `${RAZORPAY_KEY_ID.value()}:${RAZORPAY_KEY_SECRET.value()}`
  ).toString("base64");

  const { data } = await axios.post(
    "https://api.razorpay.com/v1/payment_link",
    {
      amount: amount * 100, // convert to paise
      currency: "INR",
      description,
      customer: { contact: phone },
      reference_id: conversationId,
      notify: { sms: false, email: false },
      reminder_enable: false,
    },
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    }
  );

  return { id: data.id, shortUrl: data.short_url };
}
