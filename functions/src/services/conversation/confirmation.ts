import { db } from "utils/firestore";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendText } from "services/whatsapp/sendText";
import { t } from "utils/t";
import { Conversation } from "types/conversation";
import { handleBriefing } from "services/conversation/briefing";
import { startFulfillment } from "./fulfillment";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";

export async function sendConfirmation(phone: string, conversation: Conversation): Promise<void> {
  const cid = conversation.conversationId;
  const sd = conversation.structuredData;
  const ud = conversation.unstructuredData;

  const lines: string[] = ["📋 *Here's a summary of your request:*", ""];

  if (sd.outputType) lines.push(`*Type:* ${sd.outputType}`);
  if (sd.platform)   lines.push(`*Platform:* ${sd.platform}`);
  if (sd.style)      lines.push(`*Style:* ${sd.style}`);
  if (sd.duration)   lines.push(`*Duration:* ${sd.duration}s`);
  if (sd.genre)      lines.push(`*Genre:* ${sd.genre}`);
  if (sd.mood)       lines.push(`*Mood:* ${sd.mood}`);
  if (sd.referenceImageUrls.length > 0)
    lines.push(`*Reference images:* ${sd.referenceImageUrls.length}`);

  if (ud._enrichedPrompt) {
    lines.push("", `*Brief:* ${String(ud._enrichedPrompt)}`);
  }

  await db.collection("conversations").doc(cid).update({
    status: "confirming",
    updatedAt: new Date(),
  });

  await sendText(cid, phone, lines.join("\n"));
  await sendButtons(cid, phone, t("confirm.prompt"), [
    { id: "create", title: t("confirm.createButton") },
    { id: "edit",   title: t("confirm.editButton") },
  ]);
}

export async function handleConfirmation(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;

  if (message.type === "button_reply") {
    if (message.buttonId === "create") {
      await startFulfillment(phone, conversation);
      return;
    }
    if (message.buttonId === "edit") {
      await db.collection("conversations").doc(cid).update({
        status: "briefing",
        updatedAt: new Date(),
      });
      await sendText(cid, phone, t("confirm.editPrompt"));
      return;
    }
  }

  // Text = user wants to change something → back to briefing
  if (message.type === "text" && message.text?.trim()) {
    await db.collection("conversations").doc(cid).update({
      status: "briefing",
      updatedAt: new Date(),
    });
    await handleBriefing(phone, message, { ...conversation, status: "briefing" });
    return;
  }

  await sendText(cid, phone, t("confirm.nudge"));
}
