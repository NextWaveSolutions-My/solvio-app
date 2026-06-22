export function normalizeMimeType(mimeType?: string | null): string {
  return (mimeType || "").trim().toLowerCase();
}

export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) return "";
  return filename.slice(lastDotIndex + 1).toLowerCase();
}

function isGenericMimeType(mimeType: string): boolean {
  return mimeType === "" || mimeType === "application/octet-stream";
}

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
  "text/plain": ["txt", "text", "log"],
  "application/zip": ["zip"],
  "application/x-zip-compressed": ["zip"],
};

export function resolveAllowedMimeType(params: {
  mimeType?: string | null;
  filename: string;
  allowedMimeTypes: string[];
}): string | null {
  const normalizedMimeType = normalizeMimeType(params.mimeType);
  const allowed = params.allowedMimeTypes
    .map((t) => normalizeMimeType(t))
    .filter(Boolean);

  if (normalizedMimeType && allowed.includes(normalizedMimeType)) {
    return normalizedMimeType;
  }

  const extension = getFileExtension(params.filename);
  if (!extension) return null;

  if (!isGenericMimeType(normalizedMimeType)) return null;

  for (const allowedMimeType of allowed) {
    const extensions = MIME_TO_EXTENSIONS[allowedMimeType];
    if (extensions?.includes(extension)) return allowedMimeType;
  }

  return null;
}

export function buildAcceptAttribute(allowedMimeTypes: string[]): string {
  const accept = new Set<string>();
  for (const mimeTypeRaw of allowedMimeTypes) {
    const mimeType = normalizeMimeType(mimeTypeRaw);
    if (!mimeType) continue;
    accept.add(mimeType);
    const extensions = MIME_TO_EXTENSIONS[mimeType];
    if (extensions) {
      for (const ext of extensions) {
        accept.add(`.${ext}`);
      }
    }
  }
  return Array.from(accept).join(",");
}
