import { logger } from "firebase-functions";
import { callOpenAI } from "services/llm/openai";
import { buildCreativeDirectorPrompt, CreativeDirectorPromptInput } from "config/prompts/creativeDirector";
import { OutputType } from "config/products/types";
import { HistoryEntry } from "types/conversation";

export interface CreativeDirectorInput {
  userMessage: string;
  history: HistoryEntry[];
  referenceImageCount: number;
  outputType: OutputType;
  previousDraft?: CreativeDirectorPromptInput["previousDraft"];
}

interface QuestionOption {
  id: string;
  label: string;
}

export interface CreativeDirectorReady {
  ready: true;
  title: string;
  enrichedPrompt: string;
  style: string;
  mood: string;
  aspectRatio: string;
}

export interface CreativeDirectorQuestion {
  ready: false;
  question: {
    text: string;
    type: "buttons" | "list" | "text";
    options?: QuestionOption[];
  };
}

export type CreativeDirectorOutput = CreativeDirectorReady | CreativeDirectorQuestion;

const VALID_ASPECT_RATIOS = ["1:1", "9:16", "16:9"];

export async function callCreativeDirector(input: CreativeDirectorInput): Promise<CreativeDirectorOutput> {
  const systemPrompt = buildCreativeDirectorPrompt({
    outputType: input.outputType,
    referenceImageCount: input.referenceImageCount,
    previousDraft: input.previousDraft,
  });

  const historyForLLM = input.history.map((h) => ({
    role: h.role as "user" | "assistant",
    content: h.content,
  }));

  let raw = "";
  try {
    raw = await callOpenAI(systemPrompt, input.userMessage, true, historyForLLM, 0.7);
    const parsed = JSON.parse(raw);

    if (parsed.ready === true) {
      return {
        ready: true,
        title: String(parsed.title || "Untitled").slice(0, 50),
        enrichedPrompt: String(parsed.enrichedPrompt || "").slice(0, 600),
        style: String(parsed.style || "Photorealistic"),
        mood: String(parsed.mood || ""),
        aspectRatio: VALID_ASPECT_RATIOS.includes(parsed.aspectRatio) ? parsed.aspectRatio : "1:1",
      };
    }

    // ready=false — validate question structure
    const q = parsed.question;
    if (!q?.text || !q?.type) {
      throw new Error("Missing question.text or question.type in response");
    }

    const type = ["buttons", "list", "text"].includes(q.type) ? q.type : "text";

    return {
      ready: false,
      question: {
        text: String(q.text),
        type,
        ...(q.options?.length ? { options: q.options.map((o: QuestionOption) => ({ id: String(o.id), label: String(o.label).slice(0, 20) })) } : {}),
      },
    };
  } catch (err) {
    logger.warn("Creative Director LLM failed", { err, raw: raw.slice(0, 300) });
    return {
      ready: false,
      question: {
        text: "Tell me more about what you'd like to create — what's the idea?",
        type: "text",
      },
    };
  }
}
