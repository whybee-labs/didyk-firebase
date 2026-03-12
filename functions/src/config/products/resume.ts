import { generatePdf } from "services/generators/pdfGenerator";
import { resumeTemplates } from "services/documents/templateRegistry";
import { ProductConfig } from "./types";

const useCases = Object.entries(resumeTemplates).map(([key, meta]) => ({
  id: `uc-resume-${key}`,
  label: `${meta.label} Resume`,
  description: meta.description,
  outputs: [{ type: "pdf" as const, generate: (data: Record<string, unknown>) => generatePdf({ ...data, _template: key }) }],
}));

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
    { key: "education",   type: "text", required: false, label: "Education (degree, college, year)" },
    { key: "skills",      type: "text", required: false, label: "Skills (languages, tools, frameworks)" },
    { key: "experience",  type: "text", required: false, label: "Work experience or internships" },
    { key: "projects",    type: "text", required: false, label: "Projects" },
    { key: "email",       type: "text", required: false, label: "Email address" },
    { key: "phone",       type: "text", required: false, label: "Phone number" },
    { key: "address",     type: "text", required: false, label: "Location / address" },
    { key: "primaryColor", type: "text", required: false, label: "Primary color (hex e.g. #1a2744)" },
  ],
  useCases,
  confirmationTemplate: (data) =>
    [
      "📄 *Resume Summary*",
      "",
      `👤 *Name:* ${data.fullName ?? "—"}`,
      `🎯 *Target role:* ${data.targetRole ?? "—"}`,
      ...(data.summary    ? [`📝 *Summary:* ${data.summary}`]    : []),
      ...(data.education  ? [`🎓 *Education:* ${data.education}`]  : []),
      ...(data.skills     ? [`🛠 *Skills:* ${data.skills}`]     : []),
      ...(data.experience ? [`💼 *Experience:* ${data.experience}`] : []),
      ...(data.projects   ? [`🚀 *Projects:* ${data.projects}`]   : []),
      ...(data.email      ? [`📧 *Email:* ${data.email}`]      : []),
      ...(data.phone      ? [`📱 *Phone:* ${data.phone}`]      : []),
      ...(data.address    ? [`📍 *Location:* ${data.address}`]    : []),
    ].join("\n"),
  pricing: { INR: 89, USD: 2 },
};
