import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { sendButtons } from "services/whatsapp/sendButtons";
import { callOpenAI } from "services/llm/openai";
import { Conversation } from "types/conversation";
import { sendConfirmation } from "services/conversation/confirmation";
import { logger } from "firebase-functions";
import { t } from "utils/t";

export async function handlePlanning(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;

  // User approved the plan
  if (message.type === "button_reply" && message.buttonId === "plan_approved") {
    await db.collection("conversations").doc(cid).update({
      status: "confirming",
      updatedAt: new Date(),
    });
    await sendConfirmation(phone, { ...conversation, status: "confirming" });
    return;
  }

  // User wants to revise — go back to briefing
  if (message.type === "button_reply" && message.buttonId === "plan_revise") {
    await db.collection("conversations").doc(cid).update({
      status: "briefing",
      updatedAt: new Date(),
    });
    await sendText(cid, phone, t("planning.revisePrompt"));
    return;
  }

  // Generate scene plan from enriched prompt + structured data
  const enrichedPrompt = String(conversation.unstructuredData._enrichedPrompt ?? "");
  const plan = await generatePlan(enrichedPrompt, conversation);

  await db.collection("conversations").doc(cid).update({
    "unstructuredData._scenePlan": plan.scenePlan,
    "unstructuredData._musicDirection": plan.musicDirection,
    "unstructuredData._colourPalette": plan.colourPalette,
    updatedAt: new Date(),
  });

  const planText = formatPlanForUser(plan);
  await sendButtons(cid, phone, planText, [
    { id: "plan_approved", title: t("planning.approve") },
    { id: "plan_revise",   title: t("planning.revise") },
  ]);
}

interface Videoplan {
  scenePlan: Array<{ id: string; description: string; visualPrompt: string; durationSec: number }>;
  musicDirection: string;
  colourPalette: string;
}

async function generatePlan(enrichedPrompt: string, conversation: Conversation): Promise<Videoplan> {
  const sd = conversation.structuredData;
  const totalDuration = sd.duration ?? 30;

  const system = `You are a video director creating a production plan.

## Brief
${enrichedPrompt}

## Specs
- Duration: ${totalDuration} seconds
- Aspect ratio: ${sd.aspectRatio ?? "9:16"}
- Style: ${sd.style ?? "cinematic"}

Create a video plan with 3-5 scenes, music direction, and colour palette.

Respond ONLY with JSON:
{
  "scenePlan": [
    { "id": "scene_1", "description": "...", "visualPrompt": "...", "durationSec": 10 }
  ],
  "musicDirection": "...",
  "colourPalette": "..."
}`;

  let raw = "";
  try {
    raw = await callOpenAI(system, "", true, []);
    return JSON.parse(raw) as Videoplan;
  } catch (err) {
    logger.warn("Planning LLM failed", { err, raw: raw.slice(0, 300) });
    return {
      scenePlan: [{ id: "scene_1", description: enrichedPrompt, visualPrompt: enrichedPrompt, durationSec: totalDuration }],
      musicDirection: "Cinematic, atmospheric",
      colourPalette: "Natural, vibrant",
    };
  }
}

function formatPlanForUser(plan: Videoplan): string {
  const scenes = plan.scenePlan
    .map((s, i) => `*Scene ${i + 1}* (${s.durationSec}s): ${s.description}`)
    .join("\n");

  return [
    "🎬 *Here's my plan for your video:*",
    "",
    scenes,
    "",
    `🎵 *Music:* ${plan.musicDirection}`,
    `🎨 *Colour:* ${plan.colourPalette}`,
    "",
    "Does this look right?",
  ].join("\n");
}
