import { render as modern }         from "./templates/resume/modern";
import { render as minimal }         from "./templates/resume/minimal";
import { render as eventInvite }     from "./templates/events/event-invite";
import { render as birthdayInvite }  from "./templates/birthday/birthday-invite";
import { render as businessPromo }   from "./templates/business/business-promo";

export type TemplateFn = (doc: PDFKit.PDFDocument, data: Record<string, unknown>) => void;

export const templateRegistry: Record<string, TemplateFn> = {
  "modern":           modern,
  "minimal":          minimal,
  "event-invite":     eventInvite,
  "birthday-invite":  birthdayInvite,
  "business-promo":   businessPromo,
};
