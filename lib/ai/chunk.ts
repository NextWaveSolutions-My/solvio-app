/**
 * Split long plain text into embedding-sized chunks.
 *
 * Web pages are far larger than a single embedding's useful context, so we
 * break them into overlapping windows. Splitting happens on paragraph then
 * sentence boundaries where possible so a chunk rarely cuts mid-thought; the
 * overlap keeps context that straddles a boundary retrievable from either side.
 */

export interface ChunkOptions {
  /** Target maximum characters per chunk. */
  maxChars?: number;
  /** Characters of trailing context repeated at the start of the next chunk. */
  overlap?: number;
  /** Chunks shorter than this (after trimming) are dropped as noise. */
  minChars?: number;
}

const DEFAULT_MAX = 1400;
const DEFAULT_OVERLAP = 150;
const DEFAULT_MIN = 40;

/** Break `text` into segments no larger than `maxChars`, on natural boundaries. */
function splitToSegments(text: string, maxChars: number): string[] {
  // Paragraphs first; then over-long paragraphs by sentence; then hard-cut.
  const paragraphs = text
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const segments: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      segments.push(para);
      continue;
    }
    const sentences = para.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) ?? [para];
    let buf = "";
    for (const sentence of sentences) {
      const s = sentence.trim();
      if (!s) continue;
      if (s.length > maxChars) {
        if (buf) {
          segments.push(buf);
          buf = "";
        }
        for (let i = 0; i < s.length; i += maxChars) {
          segments.push(s.slice(i, i + maxChars));
        }
        continue;
      }
      if ((buf + " " + s).trim().length > maxChars) {
        if (buf) segments.push(buf);
        buf = s;
      } else {
        buf = buf ? `${buf} ${s}` : s;
      }
    }
    if (buf) segments.push(buf);
  }
  return segments;
}

/**
 * Trailing context to repeat at the start of the next chunk. Takes the last
 * `overlap` chars but drops a leading partial word so the overlap begins on a
 * word boundary (a raw slice can cut "embed|ding", which embeds poorly).
 */
function overlapTail(text: string, overlap: number): string {
  if (overlap <= 0) return "";
  return text.slice(-overlap).replace(/^\S*\s+/, "").trim();
}

export function chunkText(input: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;
  const minChars = options.minChars ?? DEFAULT_MIN;

  const text = input.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const segments = splitToSegments(text, maxChars);

  // Pack segments into chunks up to maxChars, carrying a small overlap tail
  // from the previous chunk so context spanning a boundary stays searchable.
  const chunks: string[] = [];
  let current = "";
  for (const seg of segments) {
    if (!current) {
      current = seg;
      continue;
    }
    if (`${current}\n\n${seg}`.length <= maxChars) {
      current = `${current}\n\n${seg}`;
    } else {
      chunks.push(current);
      const tail = overlapTail(current, overlap);
      current = tail ? `${tail}\n\n${seg}` : seg;
    }
  }
  if (current) chunks.push(current);

  return chunks.map((c) => c.trim()).filter((c) => c.length >= minChars);
}
