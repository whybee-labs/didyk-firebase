export type OutputType = "image" | "video" | "audio";

export interface BriefingQuestion {
  key: string;
  type: "list" | "boolean" | "text";
  text: string;
  options?: Array<{ id: string; label: string }>;
}

export type BriefingLLMResponse =
  | { ready: false; question: BriefingQuestion }
  | { ready: true; enrichedPrompt: string };

export interface Intent {
  id: string;
  label: string;              // shown in dynamic discovery message
  outputType: OutputType;
  description: string;        // for LLM classification
  examples: string[];         // for LLM classification
  requiredFields: string[];   // LLM must collect all before ready:true
  briefingInstructions: string;
  supportsReferenceImages: boolean;
  referenceImagesHint?: string; // custom copy for the "share images?" question
}
