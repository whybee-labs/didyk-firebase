import { render as astralis }        from "./templates/resume/astralis";
import { render as eclipse }         from "./templates/resume/eclipse";
import { render as comet }           from "./templates/resume/comet";
import { render as nebula }          from "./templates/resume/nebula";
import { render as cosmos }          from "./templates/resume/cosmos";
import { render as celestial }       from "./templates/resume/celestial";
import { render as galaxy }          from "./templates/resume/galaxy";
import { render as astral }          from "./templates/resume/astral";
import { render as lunar }           from "./templates/resume/lunar";
import { render as aurora }          from "./templates/resume/aurora";
import { render as solstice }        from "./templates/resume/solstice";
import { render as ats }              from "./templates/resume/ats";
import { render as eventInvite }     from "./templates/events/event-invite";
import { render as birthdayInvite }  from "./templates/birthday/birthday-invite";
import { render as businessPromo }   from "./templates/business/business-promo";

export type TemplateFn = (doc: PDFKit.PDFDocument, data: Record<string, unknown>) => void;

export const resumeTemplates: Record<string, { render: TemplateFn; label: string; description: string }> = {
  astralis:  { render: astralis,  label: "Astralis",  description: "Two-column with green accent and skill badges" },
  eclipse:   { render: eclipse,   label: "Eclipse",    description: "Clean single-column with centered serif name" },
  comet:     { render: comet,     label: "Comet",      description: "Yellow header band with black badge labels" },
  nebula:    { render: nebula,    label: "Nebula",     description: "Navy header block with light sidebar" },
  cosmos:    { render: cosmos,    label: "Cosmos",     description: "Dark charcoal header, single-column below" },
  celestial: { render: celestial, label: "Celestial",  description: "Full-height navy sidebar with white main area" },
  galaxy:    { render: galaxy,    label: "Galaxy",     description: "Formal serif with centered headings and rules" },
  astral:    { render: astral,    label: "Astral",     description: "Photo area with two-column and gold accent" },
  lunar:     { render: lunar,     label: "Lunar",      description: "Boxed name header, sidebar details, clean layout" },
  aurora:    { render: aurora,    label: "Aurora",     description: "Pink/blush gradient header, two-column body" },
  solstice:  { render: solstice,  label: "Solstice",   description: "Ultra-minimal serif, centered, no color" },
  ats:       { render: ats,       label: "ATS",       description: "Single-column, standard headings, ATS-optimized" },
};

export const templateRegistry: Record<string, TemplateFn> = {
  ...Object.fromEntries(Object.entries(resumeTemplates).map(([k, v]) => [k, v.render])),
  "event-invite":    eventInvite,
  "birthday-invite": birthdayInvite,
  "business-promo":  businessPromo,
};
