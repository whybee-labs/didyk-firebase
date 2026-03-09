// TODO: replace with real PDF generation service
const PLACEHOLDER_PDF_URL =
  "https://www.orimi.com/pdf-test.pdf";

export async function generatePdf(data: Record<string, unknown>): Promise<string> {
  void data; // will be used by real implementation
  return PLACEHOLDER_PDF_URL;
}
