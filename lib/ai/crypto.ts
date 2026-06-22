import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getSecret(): string {
  const secret =
    process.env.AI_ENCRYPTION_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AI_ENCRYPTION_SECRET (or BETTER_AUTH_SECRET) must be set to store AI API keys"
    );
  }
  return secret;
}

export function encryptApiKey(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(getSecret(), "ai-settings-salt", 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decryptApiKey(cipherText: string): string {
  if (!cipherText || !cipherText.includes(":")) return "";
  try {
    const [ivHex, encryptedHex] = cipherText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const key = crypto.scryptSync(getSecret(), "ai-settings-salt", 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}

export function isLikelyValidApiKey(key: string): boolean {
  return !!key && key.startsWith("sk-") && key.length > 20;
}
