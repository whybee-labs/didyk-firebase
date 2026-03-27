import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendText } from "services/whatsapp/sendText";
import { sendList } from "services/whatsapp/sendList";
import { callOpenAI } from "services/llm/openai";
import { OutputType, PLATFORM_ASPECT_RATIO } from "config/products/types";
import { intentsForType, buildDiscoveryMessage, genericIntentId, getIntent } from "config/intents";
import { Conversation } from "types/conversation";
import { t } from "utils/t";
import { logger } from "firebase-functions";
import { handleBriefing } from "services/conversation/briefing";

// Structured param collection steps per output type
const IMAGE_PLATFORMS = [
  { id: "instagram_post",    label: "📸 Instagram Post" },
  { id: "instagram_story",   label: "📱 Instagram Story" },
  { id: "whatsapp_status",   label: "💬 WhatsApp Status" },
  { id: "youtube_thumbnail", label: "▶️ YouTube Thumbnail" },
  { id: "general",           label: "🌐 General / Other" },
];

const VIDEO_PLATFORMS = [
  { id: "instagram_reel",  label: "📱 Instagram Reel" },
  { id: "youtube_shorts",  label: "▶️ YouTube Shorts" },
  { id: "whatsapp_status", label: "💬 WhatsApp Status" },
  { id: "youtube",         label: "🎬 YouTube" },
  { id: "general",         label: "🌐 General / Other" },
];

const IMAGE_STYLES = [
  { id: "photorealistic", label: "📷 Photorealistic" },
  { id: "illustrated",    label: "🎨 Illustrated" },
  { id: "cinematic",      label: "🎬 Cinematic" },
  { id: "minimal",        label: "⬜ Minimal" },
];

const VIDEO_STYLES = [
  { id: "cinematic",  label: "🎬 Cinematic" },
  { id: "animated",   label: "✨ Animated" },
  { id: "realistic",  label: "📷 Realistic" },
];

const AUDIO_GENRES = [
  { id: "rap",      label: "🎤 Rap / Hip-hop" },
  { id: "pop",      label: "🎵 Pop" },
  { id: "folk",     label: "🪕 Folk / Acoustic" },
  { id: "jingle",   label: "🔔 Jingle / Ad" },
  { id: "cinematic", label: "🎼 Cinematic" },
];

const AUDIO_MOODS = [
  { id: "energetic", label: "⚡ Energetic" },
  { id: "calm",      label: "🌊 Calm" },
  { id: "dramatic",  label: "🔥 Dramatic" },
  { id: "fun",       label: "😄 Fun" },
];

const VIDEO_DURATIONS = [
  { id: "5",  label: "5 seconds" },
  { id: "15", label: "15 seconds" },
  { id: "30", label: "30 seconds" },
  { id: "60", label: "60 seconds" },
];

export async function handleIntake(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;
  const sd = conversation.structuredData;

  // Step 1: No output type yet — show Image/Video/Audio buttons
  if (!sd.outputType) {
    if (message.type === "button_reply" && message.buttonId &&
        ["image", "video", "audio"].includes(message.buttonId)) {
      const outputType = message.buttonId as OutputType;
      const discovery = buildDiscoveryMessage(outputType);
      await db.collection("conversations").doc(cid).update({
        "structuredData.outputType": outputType,
        updatedAt: new Date(),
      });
      await sendText(cid, phone, discovery);
      await sendText(cid, phone, t("intake.describePrompt"));
      return;
    }
    // Show welcome
    await sendWelcome(cid, phone);
    return;
  }

  // Step 2: Have output type but no intent yet — classify from first message
  if (!conversation.intentId && message.type === "text" && message.text?.trim()) {
    const intentId = await classifyIntent(message.text, sd.outputType);
    // Save the initial description so the briefing LLM has context
    const initialEntry = { role: "user" as const, content: message.text.trim() };
    await db.collection("conversations").doc(cid).update({
      intentId,
      "unstructuredData._initialDescription": message.text.trim(),
      messageHistory: [initialEntry],
      updatedAt: new Date(),
    });
    conversation = {
      ...conversation,
      intentId,
      unstructuredData: { ...conversation.unstructuredData, _initialDescription: message.text.trim() },
      messageHistory: [initialEntry],
    };
    // Fall through to structured param collection
  }

  // Step 3: Collect structured params via buttons
  await collectStructuredParams(cid, phone, message, conversation);
}

async function collectStructuredParams(
  cid: string,
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const sd = conversation.structuredData;
  const outputType = sd.outputType!;

  // Process any incoming button/list selection
  const selectedId = message.type === "button_reply" ? message.buttonId :
                     message.type === "list_reply"   ? message.listId : null;

  if (selectedId) {
    // Platform
    if (!sd.platform && [...IMAGE_PLATFORMS, ...VIDEO_PLATFORMS].find(p => p.id === selectedId)) {
      const aspectRatio = PLATFORM_ASPECT_RATIO[selectedId] ?? "1:1";
      await db.collection("conversations").doc(cid).update({
        "structuredData.platform": selectedId,
        "structuredData.aspectRatio": aspectRatio,
        updatedAt: new Date(),
      });
      sd.platform = selectedId;
      sd.aspectRatio = aspectRatio;
    }
    // Image style
    else if (outputType === "image" && !sd.style && IMAGE_STYLES.find(s => s.id === selectedId)) {
      await db.collection("conversations").doc(cid).update({
        "structuredData.style": selectedId,
        updatedAt: new Date(),
      });
      sd.style = selectedId;
    }
    // Video style
    else if (outputType === "video" && !sd.style && VIDEO_STYLES.find(s => s.id === selectedId)) {
      await db.collection("conversations").doc(cid).update({
        "structuredData.style": selectedId,
        updatedAt: new Date(),
      });
      sd.style = selectedId;
    }
    // Video duration
    else if (outputType === "video" && !sd.duration && VIDEO_DURATIONS.find(d => d.id === selectedId)) {
      await db.collection("conversations").doc(cid).update({
        "structuredData.duration": Number(selectedId),
        updatedAt: new Date(),
      });
      sd.duration = Number(selectedId);
    }
    // Audio genre
    else if (outputType === "audio" && !sd.genre && AUDIO_GENRES.find(g => g.id === selectedId)) {
      await db.collection("conversations").doc(cid).update({
        "structuredData.genre": selectedId,
        updatedAt: new Date(),
      });
      sd.genre = selectedId;
    }
    // Audio mood
    else if (outputType === "audio" && !sd.mood && AUDIO_MOODS.find(m => m.id === selectedId)) {
      await db.collection("conversations").doc(cid).update({
        "structuredData.mood": selectedId,
        updatedAt: new Date(),
      });
      sd.mood = selectedId;
    }
    // Reference images choice
    else if (selectedId === "has_images") {
      await db.collection("conversations").doc(cid).update({
        status: "uploading",
        updatedAt: new Date(),
      });
      await sendText(cid, phone, t("intake.sendImagesNow"));
      return;
    }
    else if (selectedId === "no_images") {
      await transitionToBriefing(cid, phone, conversation);
      return;
    }
  }

  // Determine next missing param and prompt for it
  await promptNextParam(cid, phone, conversation);
}

async function promptNextParam(
  cid: string,
  phone: string,
  conversation: Conversation
): Promise<void> {
  const outputType = conversation.structuredData.outputType!;
  const sd = conversation.structuredData;

  if (outputType === "image") {
    if (!sd.platform) {
      await sendList(cid, phone, t("intake.platform"), t("intake.choose"), [{
        rows: IMAGE_PLATFORMS.map(p => ({ id: p.id, title: p.label })),
      }]);
      return;
    }
    if (!sd.style) {
      await sendList(cid, phone, t("intake.style"), t("intake.choose"), [{
        rows: IMAGE_STYLES.map(s => ({ id: s.id, title: s.label })),
      }]);
      return;
    }
  }

  if (outputType === "video") {
    if (!sd.platform) {
      await sendList(cid, phone, t("intake.platform"), t("intake.choose"), [{
        rows: VIDEO_PLATFORMS.map(p => ({ id: p.id, title: p.label })),
      }]);
      return;
    }
    if (!sd.style) {
      await sendList(cid, phone, t("intake.style"), t("intake.choose"), [{
        rows: VIDEO_STYLES.map(s => ({ id: s.id, title: s.label })),
      }]);
      return;
    }
    if (!sd.duration) {
      await sendList(cid, phone, t("intake.duration"), t("intake.choose"), [{
        rows: VIDEO_DURATIONS.map(d => ({ id: d.id, title: d.label })),
      }]);
      return;
    }
  }

  if (outputType === "audio") {
    if (!sd.genre) {
      await sendList(cid, phone, t("intake.genre"), t("intake.choose"), [{
        rows: AUDIO_GENRES.map(g => ({ id: g.id, title: g.label })),
      }]);
      return;
    }
    if (!sd.mood) {
      await sendList(cid, phone, t("intake.mood"), t("intake.choose"), [{
        rows: AUDIO_MOODS.map(m => ({ id: m.id, title: m.label })),
      }]);
      return;
    }
  }

  // Ask about reference images only if the intent supports it
  const intent = conversation.intentId
    ? (() => { try { return getIntent(conversation.intentId!); } catch { return null; } })()
    : null;
  const supportsRefImages = intent ? intent.supportsReferenceImages : outputType !== "audio";

  if (supportsRefImages) {
    const hint = intent?.referenceImagesHint ?? t("intake.hasImages");
    await sendButtons(cid, phone, hint, [
      { id: "has_images", title: t("intake.hasImagesYes") },
      { id: "no_images",  title: t("intake.hasImagesNo") },
    ]);
    return;
  }

  // All params collected — go to briefing
  await transitionToBriefing(cid, phone, conversation);
}

async function transitionToBriefing(cid: string, phone: string, conversation: Conversation): Promise<void> {
  await db.collection("conversations").doc(cid).update({
    status: "briefing",
    updatedAt: new Date(),
  });
  await handleBriefing(phone, { type: "text", text: "" } as ParsedMessage, {
    ...conversation,
    status: "briefing",
  });
}

async function classifyIntent(userMessage: string, outputType: OutputType): Promise<string> {
  const candidates = intentsForType(outputType).filter(i => i.id !== genericIntentId(outputType));

  if (candidates.length === 0) return genericIntentId(outputType);

  const intentList = candidates.map(i =>
    `- id: "${i.id}"\n  description: ${i.description}\n  examples: ${i.examples.join(", ")}`
  ).join("\n");

  const system = `You classify user messages into content creation intents.

Available intents for output type "${outputType}":
${intentList}

Respond ONLY with JSON: { "intentId": "<id>" }
If none match well, use: { "intentId": "${genericIntentId(outputType)}" }`;

  try {
    const raw = await callOpenAI(system, userMessage, true, []);
    const result = JSON.parse(raw) as { intentId?: string };
    const intentId = result.intentId ?? genericIntentId(outputType);
    // Validate the returned id exists
    try { getIntent(intentId); return intentId; } catch { return genericIntentId(outputType); }
  } catch (err) {
    logger.warn("Intent classification failed", { err });
    return genericIntentId(outputType);
  }
}

async function sendWelcome(cid: string, phone: string): Promise<void> {
  await sendButtons(cid, phone, t("welcome.body"), [
    { id: "image", title: t("welcome.button.image") },
    { id: "video", title: t("welcome.button.video") },
    { id: "audio", title: t("welcome.button.audio") },
  ]);
}

