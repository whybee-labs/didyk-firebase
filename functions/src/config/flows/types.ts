export interface FlowField {
  key: string;
  type: "text" | "media";
  required: boolean;
  label: string;       // shown in LLM prompts + confirmation summary
  formKey?: string;    // maps to nfm_reply response_json field name
}

export type OutputType = "video" | "image" | "pdf" | "audio" | "text";

export interface FlowOutput {
  type: OutputType;
  // For media types (video/image/pdf/audio): generate returns a publicly accessible URL
  // For "text" type: generate returns the message string to send
  generate: (data: Record<string, unknown>) => Promise<string>;
}

export interface FlowConfig {
  id: "birthday" | "shop" | "event";
  name: string;
  description: string;                                         // used in discovery intent detection
  waFlowId: string;                                            // Meta WhatsApp Flow ID (placeholder)
  fields: FlowField[];
  outputs: FlowOutput[];                                       // ordered — sent in sequence at fulfillment
  confirmationTemplate: (data: Record<string, unknown>) => string;
  pricing: { amount: number; currency: "INR" };                // amount in INR
}
