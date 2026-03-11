import { generatePdf } from "services/generators/pdfGenerator";
import { ProductConfig } from "./types";

export const resumeProduct: ProductConfig = {
  id: "resume",
  name: "Resume",
  description: "A professional resume to land your next internship or job",
  waFlowId: "RESUME_FLOW_ID_PLACEHOLDER",
  openingPrompt:
    "Let's build your resume! 📄\n\nTell me: your full name, the role you're targeting (e.g. \"Software Engineer Intern\"), your education, and your key skills. Add any projects or experience too — the more you share in one go, the better your resume will be!",
  fields: [
    { key: "fullName",    type: "text", required: true,  label: "Full name" },
    { key: "targetRole",  type: "text", required: true,  label: "Target role or internship" },
    { key: "education",   type: "text", required: true,  label: "Education (degree, college, year)" },
    { key: "skills",      type: "text", required: true,  label: "Skills (languages, tools, frameworks)" },
    { key: "experience",  type: "text", required: false, label: "Work experience or internships" },
    { key: "projects",    type: "text", required: false, label: "Projects" },
  ],
  useCases: [
    {
      id: "uc-resume-modern",
      label: "Modern Resume",
      description: "Two-column design with a bold header — stands out visually",
      outputs: [{ type: "pdf", generate: (data) => generatePdf({ ...data, _template: "modern" }) }],
    },
    {
      id: "uc-resume-minimal",
      label: "Minimal Resume",
      description: "Clean single-column layout — best for ATS and online applications",
      outputs: [{ type: "pdf", generate: (data) => generatePdf({ ...data, _template: "minimal" }) }],
    },
  ],
  confirmationTemplate: (data) =>
    [
      "📄 *Resume Summary*",
      "",
      `👤 *Name:* ${data.fullName ?? "—"}`,
      `🎯 *Target role:* ${data.targetRole ?? "—"}`,
      `🎓 *Education:* ${data.education ?? "—"}`,
      `🛠 *Skills:* ${data.skills ?? "—"}`,
      ...(data.experience ? [`💼 *Experience:* ${data.experience}`] : []),
      ...(data.projects   ? [`🚀 *Projects:* ${data.projects}`]   : []),
      "",
      "Does this look right?",
    ].join("\n"),
  pricing: { INR: 89, USD: 2 },
};
