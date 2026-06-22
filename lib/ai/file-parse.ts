import { htmlToText } from "@/lib/ai/html-to-text";

/**
 * Convert an uploaded file's bytes into plain/markdown text for embedding.
 *
 * Each supported type is normalized to readable text so the shared
 * chunk → embed → index pipeline can treat every source identically. Parsers
 * are lazy-imported so a deployment that never uploads PDFs doesn't pay to load
 * the PDF engine.
 */

export type ParsedFileKind = "pdf" | "spreadsheet" | "document" | "text";

export interface ParsedFile {
  kind: ParsedFileKind;
  text: string;
}

const TEXT_EXT = new Set(["txt", "md", "markdown", "text", "log"]);
const SPREADSHEET_EXT = new Set(["xlsx", "xls", "xlsm", "csv", "tsv"]);

export function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

/** Human-facing source kind from the extension, for display + storage. */
export function classifyFile(filename: string): ParsedFileKind | "unsupported" {
  const ext = fileExtension(filename);
  if (ext === "pdf") return "pdf";
  if (SPREADSHEET_EXT.has(ext)) return "spreadsheet";
  if (ext === "docx" || ext === "doc") return "document";
  if (TEXT_EXT.has(ext)) return "text";
  return "unsupported";
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
}

async function parseSpreadsheet(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    // CSV keeps headers + rows compact; the chunker splits large sheets.
    const csv = XLSX.utils.sheet_to_csv(sheet).trim();
    if (csv) parts.push(`## Sheet: ${name}\n\n${csv}`);
  }
  return parts.join("\n\n");
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  // HTML preserves headings/lists; htmlToText then flattens to clean text.
  const { value } = await mammoth.convertToHtml({ buffer });
  return htmlToText(value);
}

export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedFile> {
  const kind = classifyFile(filename);
  if (kind === "unsupported") {
    throw new Error(
      `Unsupported file type "${fileExtension(filename) || "unknown"}". ` +
        "Supported: PDF, Excel/CSV, Word (.docx), and text/markdown."
    );
  }

  let text = "";
  if (kind === "pdf") text = await parsePdf(buffer);
  else if (kind === "spreadsheet") text = await parseSpreadsheet(buffer);
  else if (kind === "document") text = await parseDocx(buffer);
  else text = buffer.toString("utf8");

  text = text.replace(/\r\n/g, "\n").trim();
  if (!text) {
    throw new Error(
      "No readable text could be extracted. The file may be empty, " +
        "image-only (scanned), or password-protected."
    );
  }
  return { kind, text };
}
