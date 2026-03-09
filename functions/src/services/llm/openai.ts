import OpenAI from "openai";
import { GROQ_API_KEY } from "../../config/env";

const MODEL = "llama-3.1-8b-instant";

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: GROQ_API_KEY.value(),
    baseURL: "https://api.groq.com/openai/v1",
  });
}

export async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  jsonMode = true
): Promise<string> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: MODEL,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content ?? (jsonMode ? "{}" : "");
}
