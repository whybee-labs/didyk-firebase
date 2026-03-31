import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendCTAButton } from "services/whatsapp/sendCTAButton";
import { sendVideo } from "services/whatsapp/sendVideo";
import { sendImage } from "services/whatsapp/sendImage";
import { sendAudio } from "services/whatsapp/sendAudio";
import { OutputType } from "config/products/types";
import { Conversation } from "types/conversation";
import { generateImage } from "services/generators/imageGenerator";
import { generateVideo } from "services/generators/videoGenerator";
import { generateAudio } from "services/generators/audioGenerator";
import { uploadFile } from "services/storage/uploadFile";
import { preparePreview } from "services/media/watermark";
import { checkPreviewAllowed, incrementPreviewCount } from "services/previewGate";
import { createPaymentLink } from "services/payment/createPaymentLink";
import { PREVIEW_POLICY } from "config/previewPolicy";
import { t } from "utils/t";

// Prices in INR — placeholder until real pricing is defined
const PRICES: Record<OutputType, number> = {
  image: 99,
  video: 299,
  audio: 149,
};

export async function startFulfillment(phone: string, conversation: Conversation): Promise<void> {
  logger.info("Fulfillment started", {
    phone,
    conversationId: conversation.conversationId,
    outputType: conversation.structuredData.outputType,
    intentId: conversation.intentId,
  });

  const cid = conversation.conversationId;
  const outputType = conversation.structuredData.outputType!;
  const enrichedPrompt = String(conversation.unstructuredData._enrichedPrompt ?? "");

  await db.collection("conversations").doc(cid).update({
    status: "generating",
    updatedAt: new Date(),
  });

  try {
    let cleanUrl: string;
    let previewUrl: string;

    if (outputType === "image") {
      // Generate once — upload clean original + a watermarked/low-res preview
      const buffer = await generateImage({ structuredData: conversation.structuredData, enrichedPrompt });
      cleanUrl = await uploadFile(buffer, "image/png", "images");
      const previewBuffer = await preparePreview(buffer);
      previewUrl = await uploadFile(previewBuffer, "image/png", "previews");
    } else if (outputType === "video") {
      // Video watermarking not yet implemented — clean and preview are the same
      cleanUrl = await generateVideo({ structuredData: conversation.structuredData, enrichedPrompt, unstructuredData: conversation.unstructuredData });
      previewUrl = cleanUrl;
    } else {
      // Audio watermarking not applicable — clean and preview are the same
      cleanUrl = await generateAudio({ structuredData: conversation.structuredData, enrichedPrompt });
      previewUrl = cleanUrl;
    }

    // Persist both URLs — post-payment delivery reads cleanUrl directly, no re-generation
    await db.collection("conversations").doc(cid).update({ cleanUrl, previewUrl });

    // Create payment link before deciding whether to show preview
    const amount = PRICES[outputType];
    const { id: linkId, shortUrl } = await createPaymentLink(
      phone,
      cid,
      amount,
      t("fulfillment.paymentDescription", { outputType })
    );

    await db.collection("conversations").doc(cid).update({
      status: "awaiting_payment",
      paymentData: { linkId, amount, currency: "INR", createdAt: new Date() },
      updatedAt: new Date(),
    });

    const previewAllowed = await checkPreviewAllowed(phone);

    if (previewAllowed) {
      await sendText(cid, phone, t("fulfillment.previewLabel"));
      await dispatchOutput(cid, phone, outputType, previewUrl);
      await incrementPreviewCount(phone);

      await sendCTAButton(
        cid,
        phone,
        t("fulfillment.paymentPrompt"),
        t("fulfillment.payNowButton", { amount: String(amount) }),
        shortUrl
      );

      // Offer refinement if the user still has refinements left
      const refinementCount = conversation.refinementCount ?? 0;
      if (refinementCount < PREVIEW_POLICY.maxRefinementsPerConversation) {
        await sendButtons(cid, phone, t("fulfillment.refinePrompt"), [
          { id: "refine_brief", title: t("fulfillment.refineButton") },
        ]);
      }
    } else {
      // Cap hit — content is generated and stored; user must pay to receive it
      await sendCTAButton(
        cid,
        phone,
        t("fulfillment.capHitMessage"),
        t("fulfillment.payNowButton", { amount: String(amount) }),
        shortUrl
      );
    }
  } catch (err) {
    logger.error("Fulfillment failed", { err });
    await sendText(cid, phone, t("errors.outputFailed"));
    await db.collection("conversations").doc(cid).update({
      status: "briefing",
      updatedAt: new Date(),
    });
  }
}

export async function dispatchOutput(
  conversationId: string,
  phone: string,
  type: OutputType,
  value: string
): Promise<void> {
  switch (type) {
    case "video": return sendVideo(conversationId, phone, value);
    case "image": return sendImage(conversationId, phone, value);
    case "audio": return sendAudio(conversationId, phone, value);
  }
}
