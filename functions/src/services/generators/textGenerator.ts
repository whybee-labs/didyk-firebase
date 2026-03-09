import { callOpenAI } from "../llm/openai";

export async function generateText(data: Record<string, unknown>): Promise<string> {
  const system = `You are a creative writer. Based on the provided data, generate a short, warm,
personalized message (2-4 sentences) to send to the customer via WhatsApp.
Respond with only the message text — no quotes, no labels, no JSON.`;

  const user = `Data: ${JSON.stringify(data)}`;

  return callOpenAI(system, user, false);
}
