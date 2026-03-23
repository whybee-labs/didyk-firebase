import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { resumeTemplates } from "services/documents/templateRegistry";
import { ResumeData } from "services/documents/templates/resume/helpers";

export function registerFonts(doc: PDFKit.PDFDocument): void {
  const dir = path.resolve(process.cwd(), "fonts");
  doc.registerFont("Inter",           path.join(dir, "Inter-Regular.otf"));
  doc.registerFont("Inter-Medium",    path.join(dir, "Inter-Medium.otf"));
  doc.registerFont("Inter-SemiBold",  path.join(dir, "Inter-SemiBold.otf"));
  doc.registerFont("Inter-Bold",      path.join(dir, "Inter-Bold.otf"));
  doc.registerFont("Inter-Italic",    path.join(dir, "Inter-Italic.otf"));
  doc.registerFont("NotoSerif",       path.join(dir, "NotoSerif-Regular.ttf"));
  doc.registerFont("NotoSerif-Bold",  path.join(dir, "NotoSerif-Bold.ttf"));
  doc.registerFont("NotoSerif-Italic", path.join(dir, "NotoSerif-Italic.ttf"));
}

export const SAMPLE_DATA: ResumeData = {
  fullName: "Samantha Williams",
  targetRole: "Senior Business Analyst",
  // primaryColor: "#1a2744", // optional: uncomment to override template default (hex e.g. #1a2744)
  summary:
    "Results-driven Senior Business Analyst with 12+ years of experience transforming complex data into actionable business strategies. Proven track record of driving $4M+ in annual savings through process optimization, predictive modeling, and cross-functional stakeholder alignment. Adept at leading analytics teams, building executive dashboards, and translating technical findings into clear recommendations for C-suite leadership.",
  email: "samantha.williams@example.com",
  phone: "(555) 789-1234",
  address: "New York, NY 10001",
  linkedin: "linkedin.com/in/samanthawilliams",
  github: "github.com/samwilliams",
  website: "samanthawilliams.com",
  experience: [
    {
      title: "Senior Business Analyst",
      company: "Loom & Lantern Co.",
      location: "New York, NY",
      startDate: "Jul 2021",
      endDate: "Present",
      url: "https://loomlantern.com",
      bullets: [
        "Spearhead enterprise-wide data analysis and reporting for 5 business units, identifying trends that improved revenue by 18% YoY.",
        "Built a real-time KPI dashboard used daily by 40+ executives, reducing report generation time from 3 days to 15 minutes.",
        "Led cross-functional team of 8 analysts to deliver a customer segmentation model that increased targeted marketing ROI by 35%.",
        "Developed predictive churn models using logistic regression, saving $1.2M annually in customer retention costs.",
      ],
    },
    {
      title: "Business Analyst",
      company: "Willow & Wren Ltd.",
      location: "New York, NY",
      startDate: "Aug 2017",
      endDate: "May 2021",
      bullets: [
        "Analyzed and interpreted datasets of 10M+ records to identify business opportunities and recommend process improvements, leading to a 20% reduction in operational costs.",
        "Created detailed financial models and dashboards to track KPIs, enabling data-driven decision-making across departments.",
        "Worked closely with product managers to define requirements and translate business needs into technical specifications.",
        "Automated 12 recurring manual reports using Python and SQL, freeing 25 hours per week of analyst capacity.",
      ],
    },
    {
      title: "Junior Data Analyst",
      company: "Meridian Analytics Group",
      location: "Boston, MA",
      startDate: "Jun 2014",
      endDate: "Jul 2017",
      bullets: [
        "Supported senior analysts in building forecasting models for retail and consumer goods clients.",
        "Designed and maintained ETL pipelines processing 500K+ daily transactions from multiple data sources.",
        "Conducted A/B testing analyses for marketing campaigns, contributing to a 12% uplift in conversion rates.",
      ],
    },
    {
      title: "Analytics Intern",
      company: "Beacon Strategy Partners",
      location: "Boston, MA",
      startDate: "Jan 2014",
      endDate: "May 2014",
      bullets: [
        "Assisted in competitive landscape analysis for Fortune 500 clients using Tableau and Excel pivot tables.",
        "Compiled and cleaned survey data from 2,000+ respondents, preparing datasets for statistical analysis.",
      ],
    },
  ],
  education: [
    {
      degree: "Master of Science in Business Analytics",
      school: "Columbia University",
      location: "New York, NY",
      startYear: "2019",
      endYear: "2021",
      details: "GPA 3.9 / 4.0 — Dean's List, Graduate Analytics Fellowship recipient",
    },
    {
      degree: "Bachelor of Science in Economics",
      school: "New York University",
      location: "New York, NY",
      startYear: "2010",
      endYear: "2014",
      details: "Magna Cum Laude — Minor in Statistics, President of Data Science Club",
    },
  ],
  skills: [
    "SQL & Advanced Excel",
    "Python (pandas, scikit-learn)",
    "Tableau & Power BI",
    "Financial Modeling",
    "Predictive Analytics",
    "Stakeholder Management",
    "Agile / Scrum",
    "Data Warehousing",
    "Statistical Modeling",
    "Project Management",
  ],
  projects: [
    {
      name: "Enterprise KPI Dashboard Platform",
      description: "Designed and deployed a company-wide analytics dashboard serving 200+ users across 5 departments.",
      url: "https://github.com/samwilliams/kpi-dashboard",
      bullets: [
        "Integrated data from Salesforce, SAP, and internal APIs into a unified data warehouse.",
        "Reduced executive reporting cycle from weekly to real-time, enabling faster strategic decisions.",
        "Won internal Innovation Award for most impactful technology initiative of 2023.",
      ],
    },
    {
      name: "Customer Churn Prediction Engine",
      description: "Built an ML pipeline to predict at-risk customers 90 days before churn with 87% accuracy.",
      url: "https://github.com/samwilliams/churn-engine",
      bullets: [
        "Trained logistic regression and gradient boosting models on 3 years of behavioral data.",
        "Integrated predictions into CRM workflows, enabling proactive retention outreach.",
        "Saved $1.2M in annual revenue through targeted intervention campaigns.",
      ],
    },
    {
      name: "Automated Financial Reporting Suite",
      description: "Replaced 12 manual Excel-based reports with an automated Python pipeline.",
      bullets: [
        "Designed modular report templates with parameterized SQL queries and Jinja2 rendering.",
        "Deployed on AWS Lambda with scheduled triggers, delivering reports to Slack and email.",
        "Freed 25+ hours per week of analyst time, redirected toward strategic initiatives.",
      ],
    },
  ],
  volunteer: [
    {
      role: "Data Literacy Mentor",
      organization: "Code for America",
      startDate: "Jan 2022",
      endDate: "Present",
      bullets: [
        "Mentored 15+ junior analysts from underrepresented backgrounds in SQL, Python, and data visualization best practices.",
        "Designed a 6-week curriculum on business analytics fundamentals adopted by 3 local community colleges.",
      ],
    },
    {
      role: "Pro Bono Analyst",
      organization: "Habitat for Humanity NYC",
      startDate: "Mar 2019",
      endDate: "Dec 2021",
      bullets: [
        "Built donor segmentation models that increased fundraising email conversion by 22%.",
        "Created an interactive Tableau dashboard tracking volunteer hours and project milestones across 8 NYC boroughs.",
      ],
    },
  ],
  certifications: [
    {
      name: "AWS Certified Data Analytics — Specialty",
      issuer: "Amazon Web Services",
      date: "Sep 2024",
      url: "https://aws.amazon.com/certification/certified-data-analytics-specialty/",
    },
    {
      name: "Tableau Desktop Specialist",
      issuer: "Tableau (Salesforce)",
      date: "Mar 2023",
    },
  ],
  awards: [
    {
      title: "Innovation Award — Most Impactful Technology Initiative",
      issuer: "Loom & Lantern Co.",
      date: "2023",
      description: "Recognized for the Enterprise KPI Dashboard Platform that transformed executive decision-making across 5 departments.",
    },
    {
      title: "Rising Star in Analytics",
      issuer: "NYC Data Council",
      date: "2020",
      description: "Awarded to analysts under 30 demonstrating exceptional impact in data-driven business transformation.",
    },
  ],
  languages: [
    { language: "English", proficiency: "Native" },
    { language: "Spanish", proficiency: "Professional" },
    { language: "French", proficiency: "Conversational" },
  ],
  interests: [
    "Open-source data tools",
    "Marathon running",
    "Behavioral economics",
    "Board games",
    "Urban gardening",
    "Podcast hosting",
  ],
  organizations: [
    {
      name: "Women in Data Science (WiDS)",
      role: "NYC Chapter Lead",
      startDate: "2021",
      endDate: "Present",
    },
    {
      name: "INFORMS — Institute for Operations Research",
      role: "Member",
      startDate: "2017",
      endDate: "Present",
    },
  ],
  achievements: [
    {
      title: "Published research on predictive churn modeling in Harvard Business Review Analytics Quarterly",
      description: "Co-authored a peer-reviewed case study on applying gradient boosting to SaaS retention, cited 40+ times.",
      url: "https://hbr.org/analytics/churn-modeling-saas",
    },
    {
      title: "Speaker at Strata Data Conference 2023 — Building Real-Time KPI Dashboards at Scale",
      url: "https://conferences.oreilly.com/strata/samantha-williams",
    },
  ],
  conferences: [
    {
      name: "Strata Data Conference",
      role: "Speaker",
      date: "Oct 2023",
      url: "https://conferences.oreilly.com/strata",
    },
    {
      name: "PyData NYC",
      role: "Panelist — MLOps for Business Analytics",
      date: "Nov 2022",
    },
  ],
  causes: [
    "Data literacy education",
    "Diversity in STEM",
    "Climate data transparency",
    "Digital privacy rights",
    "Open data advocacy",
  ],
};

async function renderOne(
  name: string,
  renderFn: (doc: PDFKit.PDFDocument, data: Record<string, unknown>) => void,
): Promise<string> {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  registerFonts(doc);
  const previewDir = path.join(process.cwd(), "preview");
  if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });

  const outPath = path.join(previewDir, `${name}.pdf`);
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  renderFn(doc, SAMPLE_DATA as unknown as Record<string, unknown>);
  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  return outPath;
}

async function main() {
  const filter = process.argv[2];

  const entries = filter
    ? [[filter, resumeTemplates[filter]] as const].filter(([, v]) => v)
    : Object.entries(resumeTemplates);

  // eslint-disable-next-line no-console
  console.log(`Generating ${entries.length} resume PDF(s)...\n`);

  for (const [name, meta] of entries) {
    const p = await renderOne(name, meta.render);
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${meta.label.padEnd(12)} → ${p}`);
  }

  // eslint-disable-next-line no-console
  console.log("\nDone. Open preview/index.html to browse.");
}

if (typeof require !== "undefined" && require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}
