import OpenAI from "openai";
import { OPENAI_API_KEY } from "../../config/env";

const MODEL = "gpt-4.1-nano";

function getClient(): OpenAI {
  return new OpenAI({ apiKey: OPENAI_API_KEY.value() });
}

export async function callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content ?? "{}";
}
