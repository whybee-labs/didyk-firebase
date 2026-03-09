import { callOpenAI } from "services/llm/openai";

export async function generateText(data: Record<string, unknown>): Promise<string> {
  const system = `You are a creative writer. Write a short, warm, personalized WhatsApp message (2-4 sentences) based on the data provided.
Output ONLY the plain message text. Do NOT use JSON, markdown, bullet points, labels, or any formatting. Just the message itself.`;

  const user = `Data: ${JSON.stringify(data)}`;

  return callOpenAI(system, user, false);
}
