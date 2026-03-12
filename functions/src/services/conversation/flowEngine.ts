import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { callOpenAI } from "services/llm/openai";
import { getProductConfig, UseCase } from "config/products";
import { ProductField } from "config/products/types";
import { Conversation, HistoryEntry } from "services/conversation/handleIncomingMessage";
import { sendConfirmation } from "services/conversation/confirmation";
import { t } from "utils/t";

const MAX_HISTORY_PAIRS = 5;

function trimHistory(history: HistoryEntry[]): HistoryEntry[] {
  return history.slice(-(MAX_HISTORY_PAIRS * 2));
}

async function onFormComplete(phone: string, conversation: Conversation): Promise<void> {
  await sendConfirmation(phone, conversation);
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

    const question = buildFollowUpQuestion(config.fields, collectedData);

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

  // Fallback — first time entering refining: send the open invitation
  const isFirstEntry = !conversation.messageHistory || conversation.messageHistory.length === 0;
  if (isFirstEntry) {
    const openingPrompt = config.openingPrompt;
    const newHistory: HistoryEntry[] = [{ role: "assistant", content: openingPrompt }];
    await db.collection("conversations").doc(conversation.conversationId).update({
      messageHistory: newHistory,
      updatedAt: new Date(),
    });
    await sendText(conversation.conversationId, phone, openingPrompt);
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

function buildFollowUpQuestion(fields: ProductField[], data: Record<string, unknown>): string | null {
  const missingText = fields.filter((f) => f.type === "text" && f.required && !data[f.key]);
  if (missingText.length === 1) return t("form.followup.single", { field: missingText[0].label });
  if (missingText.length > 1) return t("form.followup.many", { fields: missingText.map((f) => f.label).join(", ") });

  const requiredMedia = fields.find((f) => f.type === "media" && f.required);
  if (requiredMedia) {
    const arr = data[requiredMedia.key] as string[] | undefined;
    if (!Array.isArray(arr) || arr.length === 0) return t("form.photo.request");
  }

  return null;
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
      const schemaHint = f.schema ? ` [schema: ${f.schema}]` : "";
      return `- ${f.key} (${f.label})${schemaHint}: ${val ?? "NOT FILLED"}`;
    })
    .join("\n");

  const system = `You are collecting information to create ${productName} content on WhatsApp.
Fields to collect:
${fieldSummary}

Based on the conversation history and the latest user message, extract any field values that match the fields above.
Only extract values for the listed fields. Ignore anything not in the list.
Use the conversation history to infer which field an ambiguous reply is answering.

For fields marked with [schema: ...], extract as a JSON array matching the schema — reformat and structure the user's input, do not preserve raw text.
For plain text fields (no schema), extract as a plain string.

Respond ONLY in JSON: { "extractedFields": { "fieldKey": value } }
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
