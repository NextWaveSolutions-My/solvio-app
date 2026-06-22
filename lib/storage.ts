import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { resolveAllowedMimeType, normalizeMimeType } from "@/lib/file-type-utils";

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Validate R2 configuration
if (
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET_NAME
) {
  console.warn(
    "⚠️  Cloudflare R2 credentials not configured. File uploads will be disabled."
  );
}

// Create S3 client for R2 (R2 is S3-compatible)
const r2Client =
  R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: "auto", // R2 uses "auto" region
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      })
    : null;

// File upload configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "20971520"); // 20MB default
const ALLOWED_FILE_TYPES = (
  process.env.ALLOWED_FILE_TYPES ||
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/zip,application/x-zip-compressed"
)
  .split(",")
  .map((t) => normalizeMimeType(t))
  .filter(Boolean);

export interface UploadFileOptions {
  file: File;
  folder?: string; // e.g., "tickets", "avatars"
  userId: string;
  ticketId?: string;
  allowedTypes?: string[];
  maxFileSize?: number;
}

export interface UploadedFile {
  key: string; // S3 object key
  url: string; // Public URL
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

function sanitizeMetadataValue(value: string, maxLength: number = 150): string {
  const normalized = (value || "").normalize("NFKD");
  const ascii = normalized
    .replace(/[\r\n]+/g, " ")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  return (ascii || "file").slice(0, maxLength);
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options?: Pick<UploadFileOptions, "allowedTypes" | "maxFileSize">
): { valid: boolean; error?: string } {
  const maxFileSize = options?.maxFileSize ?? MAX_FILE_SIZE;
  const allowedTypes = (options?.allowedTypes ?? ALLOWED_FILE_TYPES)
    .map((type) => normalizeMimeType(type))
    .filter(Boolean);

  // Check file size
  if (file.size > maxFileSize) {
    const maxSizeMB = (maxFileSize / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  // Check file type
  const resolvedMimeType = resolveAllowedMimeType({
    mimeType: file.type,
    filename: file.name,
    allowedMimeTypes: allowedTypes,
  });
  if (!resolvedMimeType) {
    return {
      valid: false,
      error: `File type ${
        file.type || "unknown"
      } is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Generate a unique file key for R2 storage
 */
function generateFileKey(options: UploadFileOptions): string {
  const { folder = "attachments", userId, ticketId, file } = options;
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const sanitizedFilename = file.name
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 100);

  // Structure: folder/userId/ticketId/timestamp-random-filename.ext
  const parts = [folder, userId];
  if (ticketId) parts.push(ticketId);
  parts.push(`${timestamp}-${randomString}-${sanitizedFilename}`);

  return parts.join("/");
}

/**
 * Upload file to Cloudflare R2
 */
export async function uploadFile(
  options: UploadFileOptions
): Promise<UploadedFile> {
  if (!r2Client || !R2_BUCKET_NAME) {
    throw new Error("Cloudflare R2 is not configured");
  }

  const { file } = options;

  // Validate file
  const allowedTypes = options.allowedTypes
    ?.map((type) => normalizeMimeType(type))
    .filter(Boolean);
  const validation = validateFile(file, {
    allowedTypes,
    maxFileSize: options.maxFileSize,
  });
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const resolvedMimeType = resolveAllowedMimeType({
    mimeType: file.type,
    filename: file.name,
    allowedMimeTypes: allowedTypes ?? ALLOWED_FILE_TYPES,
  });
  if (!resolvedMimeType) {
    throw new Error("File type is not allowed");
  }

  // Generate unique key
  const key = generateFileKey(options);

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to R2
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: resolvedMimeType,
    ContentLength: file.size,
    Metadata: {
      originalFilename: sanitizeMetadataValue(file.name),
      uploadedBy: options.userId,
      ...(options.ticketId && { ticketId: options.ticketId }),
    },
  });

  try {
    await r2Client.send(command);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("Invalid character in header content") ||
      message.includes("x-amz-meta-originalfilename")
    ) {
      throw new Error(
        "Filename contains unsupported characters or is too long. Please rename the file and try again.",
      );
    }
    throw error;
  }

  // Generate public URL
  const url = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL}/${key}`
    : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;

  return {
    key,
    url,
    filename: file.name,
    size: file.size,
    mimeType: resolvedMimeType,
    uploadedAt: new Date(),
  };
}

/**
 * Delete file from Cloudflare R2
 */
export async function deleteFile(key: string): Promise<void> {
  if (!r2Client || !R2_BUCKET_NAME) {
    throw new Error("Cloudflare R2 is not configured");
  }

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Get signed URL for private file access (expires in 1 hour)
 */
export async function getSignedFileUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!r2Client || !R2_BUCKET_NAME) {
    throw new Error("Cloudflare R2 is not configured");
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Check if file exists in R2
 */
export async function fileExists(key: string): Promise<boolean> {
  if (!r2Client || !R2_BUCKET_NAME) {
    throw new Error("Cloudflare R2 is not configured");
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata from R2
 */
export async function getFileMetadata(key: string) {
  if (!r2Client || !R2_BUCKET_NAME) {
    throw new Error("Cloudflare R2 is not configured");
  }

  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);

  return {
    size: response.ContentLength,
    contentType: response.ContentType,
    lastModified: response.LastModified,
    metadata: response.Metadata,
  };
}

/**
 * Delete multiple files from R2
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  if (!r2Client || !R2_BUCKET_NAME) {
    throw new Error("Cloudflare R2 is not configured");
  }

  await Promise.all(keys.map((key) => deleteFile(key)));
}

/**
 * Check if file uploads are enabled
 */
export function isFileUploadsEnabled(): boolean {
  return (
    process.env.FILE_UPLOADS_ENABLED === "true" &&
    !!r2Client &&
    !!R2_BUCKET_NAME
  );
}

/**
 * Get file upload configuration
 */
export function getUploadConfig() {
  return {
    enabled: isFileUploadsEnabled(),
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: (MAX_FILE_SIZE / 1024 / 1024).toFixed(2),
    allowedFileTypes: ALLOWED_FILE_TYPES,
  };
}
