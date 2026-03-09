import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { callOpenAI } from "services/llm/openai";
import { getProductConfig, UseCase } from "config/products";
import { ProductField } from "config/products/types";
import { Conversation } from "services/conversation/handleIncomingMessage";
import { sendUseCaseSelection } from "services/conversation/useCaseSelection";

async function onFormComplete(phone: string, conversation: Conversation): Promise<void> {
  await sendUseCaseSelection(phone, conversation);
}

export async function flowEngine(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const config = getProductConfig(conversation.useCase as UseCase);
  let collectedData = { ...conversation.collectedData };

  // Handle media uploads directly — no LLM needed
  if (message.type === "image" && message.mediaId) {
    const mediaField = config.fields.find((f) => f.type === "media");
    if (mediaField) {
      const existing = (collectedData[mediaField.key] as string[] | undefined) ?? [];
      const updated = [...existing, message.mediaId];
      collectedData[mediaField.key] = updated;

      await db.collection("conversations").doc(conversation.conversationId).update({
        [`collectedData.${mediaField.key}`]: updated,
        updatedAt: new Date(),
      });

      const maxImages = 3;
      if (updated.length < maxImages) {
        const msg = `Got it! (${updated.length}/${maxImages}) Send more photos or type *done* when ready.`;
        await sendText(conversation.conversationId, phone, msg);
      } else {
        const msg = "Perfect, that's all the photos we need!";
        await sendText(conversation.conversationId, phone, msg);
      }
    }

    // Check if all fields complete after this image
    if (isComplete(config.fields, collectedData)) {
      await onFormComplete(phone, { ...conversation, collectedData });
    }
    return;
  }

  // "done" with images
  if (message.type === "text" && message.text?.toLowerCase().trim() === "done") {
    const mediaField = config.fields.find((f) => f.type === "media");
    if (mediaField) {
      const images = (collectedData[mediaField.key] as string[] | undefined) ?? [];
      if (mediaField.required && images.length === 0) {
        const msg = "Please send at least one photo first.";
        await sendText(conversation.conversationId, phone, msg);
        return;
      }
    }
    if (isComplete(config.fields, collectedData)) {
      await onFormComplete(phone, { ...conversation, collectedData });
      return;
    }
  }

  // LLM extracts any remaining text fields from the message
  if (message.type === "text" && message.text) {
    const result = await extractWithLLM(config.fields, collectedData, message.text, config.name);
    if (result.extractedFields && Object.keys(result.extractedFields).length > 0) {
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(result.extractedFields)) {
        collectedData[key] = value;
        updates[`collectedData.${key}`] = value;
      }
      await db.collection("conversations").doc(conversation.conversationId).update({
        ...updates,
        updatedAt: new Date(),
      });
    }

    if (isComplete(config.fields, collectedData)) {
      await onFormComplete(phone, { ...conversation, collectedData });
      return;
    }

    if (result.nextQuestion) {
      await sendText(conversation.conversationId, phone, result.nextQuestion);
    }
    return;
  }

  // Fallback — ask for next missing field
  const nextField = getNextMissingField(config.fields, collectedData);
  if (nextField) {
    const msg = `Please share: ${nextField.label}`;
    await sendText(conversation.conversationId, phone, msg);
  }
}

function isComplete(fields: ProductField[], data: Record<string, unknown>): boolean {
  return fields.every((f) => {
    if (!f.required) return true;
    if (f.type === "media") {
      const arr = data[f.key] as string[] | undefined;
      return Array.isArray(arr) && arr.length > 0;
    }
    return !!data[f.key];
  });
}

function getNextMissingField(fields: ProductField[], data: Record<string, unknown>): ProductField | null {
  return (
    fields.find((f) => {
      if (!f.required) return false;
      if (f.type === "media") {
        const arr = data[f.key] as string[] | undefined;
        return !Array.isArray(arr) || arr.length === 0;
      }
      return !data[f.key];
    }) ?? null
  );
}

interface LLMResult {
  extractedFields: Record<string, unknown>;
  nextQuestion: string;
  isComplete: boolean;
}

async function extractWithLLM(
  fields: ProductField[],
  collectedData: Record<string, unknown>,
  userMessage: string,
  productName: string
): Promise<LLMResult> {
  const fieldSummary = fields
    .filter((f) => f.type === "text")
    .map((f) => {
      const val = collectedData[f.key];
      return `- ${f.key} (${f.label}): ${val ?? "NOT FILLED"}`;
    })
    .join("\n");

  const system = `You are collecting information to create ${productName} content on WhatsApp.
Current field state:
${fieldSummary}

From the user's message, extract any field values present.
Then determine the next question to ask for the next missing required field.
Respond in JSON: { "extractedFields": { "fieldKey": "value" }, "nextQuestion": "...", "isComplete": false }
isComplete = true only when all text fields above are filled (ignore media fields, those are handled separately).`;

  try {
    const raw = await callOpenAI(system, userMessage);
    const result = JSON.parse(raw) as LLMResult;
    return result;
  } catch (err) {
    logger.warn("LLM extraction failed", { err });
    return { extractedFields: {}, nextQuestion: "", isComplete: false };
  }
}
