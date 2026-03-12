export interface ProductField {
  key: string;
  type: "text" | "media";
  required: boolean;
  label: string;       // shown in LLM prompts + confirmation summary
  formKey?: string;    // maps to nfm_reply response_json field name
}

export type OutputType = "video" | "image" | "pdf" | "audio" | "text";

export interface UseCaseOutput {
  type: OutputType;
  // For media types (video/image/pdf/audio): generate returns a publicly accessible URL
  // For "text" type: generate returns the message string to send
  generate: (data: Record<string, unknown>) => Promise<string>;
}

export interface CatalogUseCase {
  id: string;
  label: string;
  description: string;
  outputs: UseCaseOutput[];
}

export interface ProductConfig {
  id: "birthday" | "business" | "event" | "resume" | "wedding" | "engagement" | "party";
  name: string;
  description: string;
  waFlowId: string;                                            // Meta WhatsApp Flow ID (placeholder)
  openingPrompt: string;
  fields: ProductField[];
  useCases: CatalogUseCase[];
  confirmationTemplate: (data: Record<string, unknown>) => string;
  pricing: { INR: number; USD: number };
}
