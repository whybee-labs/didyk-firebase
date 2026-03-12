import { generatePdf } from "services/generators/pdfGenerator";
import { resumeTemplates } from "services/documents/templateRegistry";
import { ProductConfig } from "./types";

const useCases = Object.entries(resumeTemplates).map(([key, meta]) => ({
  id: `uc-resume-${key}`,
  label: `${meta.label} Resume`,
  description: meta.description,
  outputs: [{ type: "pdf" as const, generate: (data: Record<string, unknown>) => generatePdf({ ...data, _template: key }) }],
}));

// ── Confirmation formatting helpers ──────────────────────────────────────────

function fmtExperience(val: unknown): string | null {
  if (!val) return null;
  if (Array.isArray(val) && val.length > 0) {
    return val.map((j: any) => {
      const dates = [j.startDate, j.endDate].filter(Boolean).join(" – ");
      return `  • ${j.title} at ${j.company}${dates ? ` (${dates})` : ""}`;
    }).join("\n");
  }
  return typeof val === "string" ? val : null;
}

function fmtProjects(val: unknown): string | null {
  if (!val) return null;
  if (Array.isArray(val) && val.length > 0) {
    return val.map((p: any) => `  • ${p.name}${p.description ? ` — ${p.description}` : ""}`).join("\n");
  }
  return typeof val === "string" ? val : null;
}

function fmtEducation(val: unknown): string | null {
  if (!val) return null;
  if (Array.isArray(val) && val.length > 0) {
    return val.map((e: any) => {
      const years = [e.startYear, e.endYear].filter(Boolean).join(" – ");
      return `  • ${e.degree} — ${e.school}${years ? ` (${years})` : ""}`;
    }).join("\n");
  }
  return typeof val === "string" ? val : null;
}

function fmtSkills(val: unknown): string | null {
  if (!val) return null;
  if (Array.isArray(val)) return val.join(", ");
  return typeof val === "string" ? val : null;
}

// ── Product config ────────────────────────────────────────────────────────────

export const resumeProduct: ProductConfig = {
  id: "resume",
  name: "Resume",
  description: "A professional resume to land your next internship or job",
  waFlowId: "RESUME_FLOW_ID_PLACEHOLDER",
  openingPrompt:
    "Let's build your resume! 📄\n\nTell me: your full name, the role you're targeting, a brief professional summary, your education, key skills, and any experience or projects.\n\nYou can also share your email, phone, and location if you want them on the resume. The more you share, the better it'll look!",
  fields: [
    { key: "fullName",    type: "text", required: true,  label: "Full name" },
    { key: "targetRole",  type: "text", required: true,  label: "Target role or internship" },
    { key: "summary",     type: "text", required: false, label: "Professional summary (2-3 sentences)" },
    {
      key: "education", type: "text", required: false, label: "Education (degree, college, year)",
      schema: '[{"degree":"B.Tech Computer Science","school":"IIT Delhi","startYear":"2021","endYear":"2025"}]',
    },
    {
      key: "skills", type: "text", required: false, label: "Skills (languages, tools, frameworks)",
      schema: '["Python","React","Node.js","SQL"]',
    },
    {
      key: "experience", type: "text", required: false, label: "Work experience or internships",
      schema: '[{"title":"Software Intern","company":"Google","startDate":"Jun 2024","endDate":"Aug 2024","bullets":["Built X feature","Improved performance by 20%"]}]',
    },
    {
      key: "projects", type: "text", required: false, label: "Projects",
      schema: '[{"name":"Portfolio Website","description":"Personal site built with React","bullets":["Used Next.js","Deployed on Vercel"]}]',
    },
    { key: "email",       type: "text", required: false, label: "Email address" },
    { key: "phone",       type: "text", required: false, label: "Phone number" },
    { key: "address",     type: "text", required: false, label: "Location / address" },
    { key: "primaryColor", type: "text", required: false, label: "Primary color (hex e.g. #1a2744)" },
  ],
  useCases,
  confirmationTemplate: (data) => {
    const exp  = fmtExperience(data.experience);
    const proj = fmtProjects(data.projects);
    const edu  = fmtEducation(data.education);
    const skills = fmtSkills(data.skills);
    return [
      "📄 *Resume Summary*",
      "",
      `👤 *Name:* ${data.fullName ?? "—"}`,
      `🎯 *Target role:* ${data.targetRole ?? "—"}`,
      ...(data.summary ? [`📝 *Summary:* ${data.summary}`]    : []),
      ...(edu          ? [`🎓 *Education:*\n${edu}`]           : []),
      ...(skills       ? [`🛠 *Skills:* ${skills}`]            : []),
      ...(exp          ? [`💼 *Experience:*\n${exp}`]          : []),
      ...(proj         ? [`🚀 *Projects:*\n${proj}`]           : []),
      ...(data.email   ? [`📧 *Email:* ${data.email}`]         : []),
      ...(data.phone   ? [`📱 *Phone:* ${data.phone}`]         : []),
      ...(data.address ? [`📍 *Location:* ${data.address}`]    : []),
    ].join("\n");
  },
  pricing: { INR: 89, USD: 2 },
};
