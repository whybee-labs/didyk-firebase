// TODO: replace with real PDF generation service
const PLACEHOLDER_PDF_URL =
  "https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf";

export async function generatePdf(data: Record<string, unknown>): Promise<string> {
  void data; // will be used by real implementation
  return PLACEHOLDER_PDF_URL;
}
