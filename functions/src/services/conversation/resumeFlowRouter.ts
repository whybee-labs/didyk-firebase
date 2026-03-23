import { db } from "utils/firestore";
import { getProductConfig } from "config/products";
import { sendText } from "services/whatsapp/sendText";
import { Conversation } from "services/conversation/handleIncomingMessage";
import { t } from "utils/t";

/**
 * Central resume flow router.
 *
 * Checks prerequisites in order and routes to the next unfilled step.
 * When all are met, generates the preview.
 *
 * Prerequisites (ordered):
 *   1. Template selected  (selectedUseCaseIds)
 *   2. Colour selected    (selectedPrimaryColor)
 *   3. Input method       (inputMethod)
 *   4. Required data      (firstName + lastName + targetRole)
 *   5. User confirmed     (dataConfirmed)
 */
export async function advanceResumeFlow(
  phone: string,
  conversation: Conversation,
): Promise<void> {
  const cid = conversation.conversationId;

  // 1. Template
  if (!conversation.selectedUseCaseIds?.length) {
    const { sendUseCaseSelection } = await import("services/conversation/useCaseSelection");
    await sendUseCaseSelection(phone, conversation);
    return;
  }

  // 2. Colour
  if (!conversation.selectedPrimaryColor) {
    await db.collection("conversations").doc(cid).update({
      status: "selecting_color",
      updatedAt: new Date(),
    });
    const { sendResumeColorOptions } = await import("services/conversation/resumeColorSelection");
    await sendResumeColorOptions(phone, { ...conversation, status: "selecting_color" });
    return;
  }

  // 3. Input method
  if (!conversation.inputMethod) {
    const { sendInputMethodPrompt } = await import("services/conversation/resumeInputMethod");
    await sendInputMethodPrompt(phone, conversation);
    return;
  }

  // 4. Required data collected
  if (!hasRequiredResumeData(conversation)) {
    if (conversation.inputMethod === "upload") {
      await db.collection("conversations").doc(cid).update({
        status: "waiting_for_pdf",
        updatedAt: new Date(),
      });
      await sendText(cid, phone, t("resume.upload.sendPdf"));
    } else {
      // "scratch" — send opening prompt, init messageHistory
      const config = getProductConfig("resume");
      await db.collection("conversations").doc(cid).update({
        status: "refining",
        messageHistory: [{ role: "assistant", content: config.openingPrompt }],
        updatedAt: new Date(),
      });
      await sendText(cid, phone, config.openingPrompt);
    }
    return;
  }

  // 5. User confirmed ("done")
  if (!conversation.dataConfirmed) {
    await db.collection("conversations").doc(cid).update({
      status: "reviewing_resume",
      updatedAt: new Date(),
    });
    const { sendResumeSectionsForReview } = await import("services/conversation/resumePdfUpload");
    await sendResumeSectionsForReview(cid, phone, conversation.collectedData);
    return;
  }

  // All prerequisites met → show confirmation
  const { sendConfirmation } = await import("services/conversation/confirmation");
  await sendConfirmation(phone, conversation);
}

function hasRequiredResumeData(conversation: Conversation): boolean {
  const d = conversation.collectedData;
  return !!(d.firstName && d.lastName && d.targetRole);
}
