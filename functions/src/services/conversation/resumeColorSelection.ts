import { db } from "utils/firestore";
import { sendList } from "services/whatsapp/sendList";
import { sendText } from "services/whatsapp/sendText";
import { templateKeyFromUseCaseId, getResumeColorConfig } from "config/resumeColors";
import { Conversation } from "./handleIncomingMessage";
import { t } from "utils/t";
import { sendInputMethodPrompt } from "./resumeInputMethod";

/**
 * Send colour options (background or accent) after user picked a resume template.
 * Call when status is selecting_color (just set). Sends list then returns.
 */
export async function sendResumeColorOptions(phone: string, conversation: Conversation): Promise<void> {
  const ucId = conversation.selectedUseCaseIds?.[0];
  if (!ucId) {
    await sendText(conversation.conversationId, phone, t("errors.generic"));
    return;
  }
  const templateKey = templateKeyFromUseCaseId(ucId);
  const config = getResumeColorConfig(templateKey);
  if (!config || config.colors.length === 0) {
    await db.collection("conversations").doc(conversation.conversationId).update({
      status: "choose_input_method",
      updatedAt: new Date(),
    });
    await sendInputMethodPrompt(phone, { ...conversation, status: "choose_input_method", selectedPrimaryColor: undefined });
    return;
  }

  const intro = config.mode === "background" ? t("resume.color.bgIntro") : t("resume.color.textIntro");
  const rows = config.colors.map((opt) => ({ id: opt.id, title: opt.label, description: undefined }));
  const sections = [];
  const ROWS_PER_SECTION = 10;
  for (let i = 0; i < rows.length; i += ROWS_PER_SECTION) {
    sections.push({
      title: i === 0 ? "Pick a colour" : "More",
      rows: rows.slice(i, i + ROWS_PER_SECTION),
    });
  }

  await sendList(conversation.conversationId, phone, intro, "Colours", sections);
}

/**
 * Handle list_reply when in selecting_color: user picked a colour. Store hex and show Upload vs Scratch.
 */
export async function handleColorSelection(
  phone: string,
  listId: string,
  conversation: Conversation
): Promise<void> {
  const ucId = conversation.selectedUseCaseIds?.[0];
  if (!ucId) {
    await sendText(conversation.conversationId, phone, t("errors.generic"));
    return;
  }
  const templateKey = templateKeyFromUseCaseId(ucId);
  const { hexForColorOptionId } = await import("config/resumeColors");
  const hex = hexForColorOptionId(templateKey, listId);
  if (!hex) {
    await sendText(conversation.conversationId, phone, t("errors.generic"));
    await sendResumeColorOptions(phone, conversation);
    return;
  }

  await db.collection("conversations").doc(conversation.conversationId).update({
    selectedPrimaryColor: hex,
    status: "choose_input_method",
    updatedAt: new Date(),
  });

  await sendInputMethodPrompt(phone, { ...conversation, selectedPrimaryColor: hex, status: "choose_input_method" });
}
