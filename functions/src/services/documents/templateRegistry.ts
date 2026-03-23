import { render as astralis }        from "./templates/resume/astralis";
import { render as eclipse }         from "./templates/resume/eclipse";
import { render as comet }           from "./templates/resume/comet";
import { render as nebula }          from "./templates/resume/nebula";
import { render as galaxy }          from "./templates/resume/galaxy";
import { render as lunar }           from "./templates/resume/lunar";
import { render as aurora }          from "./templates/resume/aurora";
import { render as pulsar }          from "./templates/resume/pulsar";
import { render as ats }             from "./templates/resume/ats";
import { render as eventInvite }     from "./templates/events/event-invite";
import { render as eventModern }     from "./templates/events/event-modern";
import { render as birthdayInvite }  from "./templates/birthday/birthday-invite";
import { render as birthdayGolden }  from "./templates/birthday/birthday-golden";
import { render as weddingIvory }    from "./templates/wedding/wedding-ivory";
import { render as weddingMidnight } from "./templates/wedding/wedding-midnight";
import { render as engagementRose }  from "./templates/engagement/engagement-rose";
import { render as partyVivid }      from "./templates/party/party-vivid";
import { render as businessPromo }   from "./templates/business/business-promo";
import { render as businessClean }   from "./templates/business/business-clean";

export type TemplateFn = (doc: PDFKit.PDFDocument, data: Record<string, unknown>) => void;

export const resumeTemplates: Record<string, { render: TemplateFn; label: string; description: string }> = {
  mercury:  { render: ats,       label: "Mercury",  description: "Best for online applications, optimized for applicant tracking systems" },
  venus:    { render: aurora,    label: "Venus",    description: "Eye-catching design for creative and design roles" },
  earth:    { render: pulsar,    label: "Earth",    description: "Clean modern layout, perfect all-rounder for any industry" },
  mars:     { render: comet,     label: "Mars",     description: "Bold and distinctive, stands out for sales & marketing roles" },
  jupiter:  { render: galaxy,    label: "Jupiter",  description: "Formal and elegant, ideal for executive and leadership positions" },
  saturn:   { render: nebula,    label: "Saturn",   description: "Structured sidebar layout, great for experienced professionals" },
  uranus:   { render: astralis,  label: "Uranus",   description: "Skill-focused two-column, ideal for tech and engineering roles" },
  neptune:  { render: lunar,     label: "Neptune",  description: "Organized and detailed, perfect for consulting and finance" },
  pluto:    { render: eclipse,   label: "Pluto",    description: "Minimalist and refined, great for academic and research roles" },
};

export const templateRegistry: Record<string, TemplateFn> = {
  // Resume
  ...Object.fromEntries(Object.entries(resumeTemplates).map(([k, v]) => [k, v.render])),

  // Events
  "event-invite":     eventInvite,
  "event-modern":     eventModern,

  // Birthday
  "birthday-invite":  birthdayInvite,
  "birthday-golden":  birthdayGolden,

  // Wedding
  "wedding-ivory":    weddingIvory,
  "wedding-midnight": weddingMidnight,

  // Engagement
  "engagement-rose":  engagementRose,

  // Party
  "party-vivid":      partyVivid,

  // Business
  "business-promo":   businessPromo,
  "business-clean":   businessClean,
};
