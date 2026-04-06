export interface ParsedMessage {
  phone: string;
  name?: string;
  messageId: string;
  timestamp: string;
  type: "text" | "image" | "video" | "audio" | "document" | "button_reply" | "list_reply" | "form_reply" | "unknown";
  text?: string;
  mediaId?: string;
  buttonId?: string;
  listId?: string;
  formData?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawPayload = any;

export function parseWebhookPayload(payload: unknown): ParsedMessage | null {
  const message: RawPayload = (payload as RawPayload)
    ?.entry?.[0]
    ?.changes?.[0]
    ?.value
    ?.messages?.[0];

  if (!message) return null;

  const name: string | undefined = (payload as RawPayload)
    ?.entry?.[0]
    ?.changes?.[0]
    ?.value
    ?.contacts?.[0]
    ?.profile
    ?.name;

  const base = {
    phone: message.from as string,
    ...(name ? { name } : {}),
    messageId: message.id as string,
    timestamp: message.timestamp as string,
  };

  switch (message.type) {
    case "text":
      return { ...base, type: "text", text: message.text?.body };

    case "image":
      return { ...base, type: "image", mediaId: message.image?.id, text: message.image?.caption };

    case "video":
      return { ...base, type: "video", mediaId: message.video?.id };

    case "audio":
      return { ...base, type: "audio", mediaId: message.audio?.id };

    case "document":
      return { ...base, type: "document", mediaId: message.document?.id };

    case "interactive": {
      const interactive = message.interactive;

      if (interactive?.type === "nfm_reply") {
        let formData: Record<string, unknown> = {};
        try {
          formData = JSON.parse(interactive.nfm_reply?.response_json ?? "{}");
        } catch {
          formData = {};
        }
        return { ...base, type: "form_reply", formData };
      }

      if (interactive?.type === "button_reply") {
        return {
          ...base,
          type: "button_reply",
          buttonId: interactive.button_reply?.id,
          text: interactive.button_reply?.title,
        };
      }

      if (interactive?.type === "list_reply") {
        return {
          ...base,
          type: "list_reply",
          listId: interactive.list_reply?.id,
          text: interactive.list_reply?.title,
        };
      }

      return { ...base, type: "unknown" };
    }

    default:
      return { ...base, type: "unknown" };
  }
}
