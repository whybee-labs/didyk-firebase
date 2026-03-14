import { db } from "utils/firestore";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendText } from "services/whatsapp/sendText";
import { flowEngine } from "./flowEngine";
import { Conversation } from "./handleIncomingMessage";
import { t } from "utils/t";

/**
 * Send "Upload your PDF" vs "Build from scratch" (button titles fit WhatsApp 20-char limit).
 */
export async function sendInputMethodPrompt(phone: string, conversation: Conversation): Promise<void> {
  await db.collection("conversations").doc(conversation.conversationId).update({
    status: "choose_input_method",
    updatedAt: new Date(),
  });

  await sendButtons(
    conversation.conversationId,
    phone,
    t("resume.inputMethod.prompt"),
    [
      { id: "upload_pdf", title: t("resume.inputMethod.uploadButton") },
      { id: "from_scratch", title: t("resume.inputMethod.scratchButton") },
    ]
  );
}

/**
 * Handle button_reply when in choose_input_method. Either go to waiting_for_pdf or to refining (scratch).
 */
export async function handleInputMethodSelection(
  phone: string,
  buttonId: string,
  conversation: Conversation
): Promise<void> {
  if (buttonId === "from_scratch") {
    await db.collection("conversations").doc(conversation.conversationId).update({
      inputMethod: "scratch",
      status: "refining",
      collectedData: {},
      messageHistory: [],
      updatedAt: new Date(),
    });
    await flowEngine(
      phone,
      { type: "text", phone, messageId: "", timestamp: "", text: "" },
      { ...conversation, inputMethod: "scratch", status: "refining", collectedData: {}, messageHistory: [] }
    );
    return;
  }

  if (buttonId === "upload_pdf") {
    await db.collection("conversations").doc(conversation.conversationId).update({
      inputMethod: "upload",
      status: "waiting_for_pdf",
      updatedAt: new Date(),
    });
    await sendText(conversation.conversationId, phone, t("resume.upload.sendPdf"));
    return;
  }

  await sendInputMethodPrompt(phone, conversation);
}
