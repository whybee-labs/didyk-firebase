import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendList } from "services/whatsapp/sendList";
import { callOpenAI } from "services/llm/openai";
import { getIntent, genericIntentId } from "config/intents";
import { PendingQuestion } from "config/products/types";
import { Conversation, HistoryEntry } from "types/conversation";
import { handlePlanning } from "services/conversation/planning";
import { startFulfillment } from "services/conversation/fulfillment";
import { t } from "utils/t";

export async function handleBriefing(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;
  let unstructuredData = { ...conversation.unstructuredData };
  // Last 5 pairs — logOutbound and handleIncomingMessage keep messageHistory updated
  const history = (conversation.messageHistory ?? []).slice(-10);

  // If there's a pending question, map the user's reply to unstructuredData
  if (conversation.pendingQuestion) {
    const { key, type } = conversation.pendingQuestion;
    let answer: unknown = null;

    if (type === "boolean") {
      if (message.type === "button_reply") {
        answer = message.buttonId === "yes";
      }
    } else if (type === "list") {
      if (message.type === "list_reply") {
        answer = message.listId;
      }
    } else if (type === "text") {
      if (message.type === "text") {
        answer = message.text?.trim();
      }
    }

    if (answer !== null) {
      unstructuredData[key] = answer;
      await db.collection("conversations").doc(cid).update({
        [`unstructuredData.${key}`]: answer,
        pendingQuestion: null,
        updatedAt: new Date(),
      });
    }
  }

  // User approved the enriched prompt
  if (message.type === "button_reply" && message.buttonId === "brief_approved") {
    await transitionFromBriefing(cid, phone, conversation);
    return;
  }

  // User wants to add more detail — continue loop
  if (message.type === "button_reply" && message.buttonId === "brief_more") {
    await sendText(cid, phone, t("briefing.addMoreDetail"));
    return;
  }

  // Call LLM to get next question or ready signal
  const intentId = conversation.intentId ?? genericIntentId(conversation.structuredData.outputType ?? "image");
  const intent = (() => { try { return getIntent(intentId); } catch { return null; } })();

  const result = await callBriefingLLM(
    conversation.structuredData,
    unstructuredData,
    intent?.requiredFields ?? [],
    intent?.briefingInstructions ?? "",
    history
  );

  if (result.ready) {
    const preview = t("briefing.readyPrompt", { enrichedPrompt: result.enrichedPrompt });
    await sendButtons(cid, phone, preview, [
      { id: "brief_approved", title: t("briefing.readyYes") },
      { id: "brief_more",     title: t("briefing.readyNo") },
    ]);
    await db.collection("conversations").doc(cid).update({
      "unstructuredData._enrichedPrompt": result.enrichedPrompt,
      updatedAt: new Date(),
    });
    return;
  }

  // Ask the next question
  const q = result.question;
  const pending: PendingQuestion = { key: q.key, type: q.type };

  await db.collection("conversations").doc(cid).update({
    pendingQuestion: pending,
    updatedAt: new Date(),
  });

  if (q.type === "boolean") {
    await sendButtons(cid, phone, q.text, [
      { id: "yes", title: "✅ Yes" },
      { id: "no",  title: "❌ No" },
    ]);
  } else if (q.type === "list" && q.options?.length) {
    await sendList(cid, phone, q.text, t("intake.choose"), [{
      rows: q.options.map(o => ({ id: o.id, title: o.label })),
    }]);
  } else {
    await sendText(cid, phone, q.text);
  }
}

async function callBriefingLLM(
  structuredData: Conversation["structuredData"],
  unstructuredData: Conversation["unstructuredData"],
  requiredFields: string[],
  briefingInstructions: string,
  history: HistoryEntry[]
): Promise<
  | { ready: false; question: { key: string; type: "list" | "boolean" | "text"; text: string; options?: { id: string; label: string }[] } }
  | { ready: true; enrichedPrompt: string }
> {
  const missingRequired = requiredFields.filter(f => !unstructuredData[f]);

  const system = `You are a creative director helping gather information to create ${structuredData.outputType} content.

## What we know
Structured params: ${JSON.stringify(structuredData)}
Context gathered so far: ${JSON.stringify(unstructuredData)}

## Required fields still missing
${missingRequired.length > 0 ? missingRequired.join(", ") : "none — all required fields are collected"}

## Your instructions
${briefingInstructions || "Understand what the user wants to create. Ask targeted questions to gather enough creative context."}

## Rules
- Ask ONE question at a time — the most important missing piece
- If all required fields are collected AND you have enough creative context, set ready:true
- For list questions, provide 3-5 options max
- Keep questions short and conversational

Respond ONLY with JSON in one of these formats:
{ "ready": false, "question": { "key": "fieldName", "type": "text"|"boolean"|"list", "text": "question", "options": [{"id":"...","label":"..."}] } }
{ "ready": true, "enrichedPrompt": "rich creative brief paragraph" }`;

  let raw = "";
  try {
    raw = await callOpenAI(system, "", true, history);
    return JSON.parse(raw);
  } catch (err) {
    logger.warn("Briefing LLM failed", { err, raw: raw.slice(0, 300) });
    return {
      ready: false,
      question: { key: "additionalContext", type: "text", text: "Tell me more about what you have in mind." },
    };
  }
}

async function transitionFromBriefing(cid: string, phone: string, conversation: Conversation): Promise<void> {
  const outputType = conversation.structuredData.outputType;
  const nextStatus = outputType === "video" ? "planning" : "generating";

  await db.collection("conversations").doc(cid).update({
    status: nextStatus,
    updatedAt: new Date(),
  });

  if (nextStatus === "planning") {
    await handlePlanning(phone, { type: "text", text: "" } as ParsedMessage, {
      ...conversation,
      status: "planning",
    });
  } else {
    await startFulfillment(phone, { ...conversation, status: "generating" });
  }
}
