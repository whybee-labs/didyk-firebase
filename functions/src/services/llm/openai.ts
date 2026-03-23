import OpenAI from "openai";
import { OPENAI_API_KEY } from "config/env";

const MODEL = "gpt-4o-mini";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: OPENAI_API_KEY.value(),
    });
  }
  return client;
}

export async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  jsonMode = true,
  history?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const openai = getClient();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: MODEL,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    messages,
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content ?? (jsonMode ? "{}" : "");
}
