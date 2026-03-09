import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { callOpenAI } from "services/llm/openai";
import { getProductConfig, UseCase } from "config/products";
import { ProductField } from "config/products/types";
import { Conversation, HistoryEntry } from "services/conversation/handleIncomingMessage";
import { sendUseCaseSelection } from "services/conversation/useCaseSelection";
import { t } from "utils/t";

const MAX_HISTORY_PAIRS = 5;

function trimHistory(history: HistoryEntry[]): HistoryEntry[] {
  return history.slice(-(MAX_HISTORY_PAIRS * 2));
}

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
        await sendText(conversation.conversationId, phone, t("form.photo.progress", { current: updated.length, max: maxImages }));
      } else {
        await sendText(conversation.conversationId, phone, t("form.photo.done"));
      }
    }

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
        await sendText(conversation.conversationId, phone, t("form.photo.required"));
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
    const history = conversation.messageHistory ?? [];
    const extractedFields = await extractWithLLM(config.fields, collectedData, message.text, config.name, history);

    const firestoreUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(extractedFields)) {
      collectedData[key] = value;
      firestoreUpdates[`collectedData.${key}`] = value;
    }

    if (isComplete(config.fields, collectedData)) {
      if (Object.keys(firestoreUpdates).length > 0) {
        await db.collection("conversations").doc(conversation.conversationId).update({
          ...firestoreUpdates,
          updatedAt: new Date(),
        });
      }
      await onFormComplete(phone, { ...conversation, collectedData });
      return;
    }

    const nextField = getNextMissingField(config.fields, collectedData);
    const question = nextField ? t("form.field.ask", { label: nextField.label }) : null;

    const newHistory = trimHistory([
      ...history,
      { role: "user" as const, content: message.text },
      ...(question ? [{ role: "assistant" as const, content: question }] : []),
    ]);

    await db.collection("conversations").doc(conversation.conversationId).update({
      ...firestoreUpdates,
      messageHistory: newHistory,
      updatedAt: new Date(),
    });

    if (question) {
      await sendText(conversation.conversationId, phone, question);
    }
    return;
  }

  // Fallback — ask for next missing field (e.g. first question on flow start)
  const nextField = getNextMissingField(config.fields, collectedData);
  if (nextField) {
    const question = t("form.field.ask", { label: nextField.label });
    const newHistory = trimHistory([
      ...(conversation.messageHistory ?? []),
      { role: "assistant" as const, content: question },
    ]);
    await db.collection("conversations").doc(conversation.conversationId).update({
      messageHistory: newHistory,
      updatedAt: new Date(),
    });
    await sendText(conversation.conversationId, phone, question);
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

async function extractWithLLM(
  fields: ProductField[],
  collectedData: Record<string, unknown>,
  userMessage: string,
  productName: string,
  history: HistoryEntry[]
): Promise<Record<string, unknown>> {
  const fieldSummary = fields
    .filter((f) => f.type === "text")
    .map((f) => {
      const val = collectedData[f.key];
      return `- ${f.key} (${f.label}): ${val ?? "NOT FILLED"}`;
    })
    .join("\n");

  const system = `You are collecting information to create ${productName} content on WhatsApp.
Fields to collect:
${fieldSummary}

Based on the conversation history and the latest user message, extract any field values that match the fields above.
Only extract values for the listed fields. Ignore anything not in the list.
Use the conversation history to infer which field an ambiguous reply is answering.

Respond ONLY in JSON: { "extractedFields": { "fieldKey": "value" } }
If nothing can be extracted, respond with: { "extractedFields": {} }`;

  try {
    const raw = await callOpenAI(system, userMessage, true, history);
    const result = JSON.parse(raw) as { extractedFields: Record<string, unknown> };
    return result.extractedFields ?? {};
  } catch (err) {
    logger.warn("LLM extraction failed", { err });
    return {};
  }
}
