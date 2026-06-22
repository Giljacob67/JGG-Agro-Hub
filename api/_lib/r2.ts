/**
 * Cloudflare R2 file storage service.
 * Generates presigned URLs for direct browser-to-R2 uploads.
 *
 * Required env vars:
 *   R2_ACCOUNT_ID - Cloudflare account ID
 *   R2_ACCESS_KEY_ID - R2 API token access key
 *   R2_SECRET_ACCESS_KEY - R2 API token secret key
 *   R2_BUCKET_NAME - R2 bucket name (e.g., "jgg-agro-docs")
 *   R2_PUBLIC_URL - Public URL for accessing files (e.g., "https://pub-xxx.r2.dev")
 */

import { randomBytes } from "node:crypto";

const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

interface PresignedUrlResult {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

/**
 * Generate an S3 V4 presigned URL for PUT object.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<PresignedUrlResult> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.");
  }

  const date = new Date();
  const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = date.toISOString().slice(0, 19).replace(/:/g, "") + "Z";

  const credentialScope = `${dateStamp}/${bucket}/s3/aws4_request`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  // Create canonical request
  const host = `${bucket}.${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${key}`;
  const canonicalQueryString = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(`${accessKeyId}/${credentialScope}`)}&X-Amz-Date=${amzDate}&X-Amz-Expires=${expiresIn}&X-Amz-SignedHeaders=${encodeURIComponent(signedHeaders)}`;

  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // Create string to sign
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  // Calculate signature
  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, "auto");
  const kService = await hmacSha256(kRegion, "s3");
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = await hmacSha256Hex(kSigning, stringToSign);

  const uploadUrl = `${R2_ENDPOINT}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  const fileUrl = publicUrl ? `${publicUrl}/${key}` : `${R2_ENDPOINT}${canonicalUri}`;

  return { uploadUrl, fileUrl, key };
}

/**
 * Generate a unique file key for R2.
 *
 * `prefix` vem do cliente e é sanitizado: apenas segmentos `[a-zA-Z0-9_-]`
 * separados por `/`, sem path traversal (`..`) ou caracteres arbitrários.
 * O componente aleatório usa `crypto.randomBytes` (não `Math.random`).
 */
export function generateFileKey(originalName: string, prefix = "docs"): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString("hex");
  const safeName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 50);
  const safePrefix = sanitizePrefix(prefix);
  return `${safePrefix}/${timestamp}-${random}-${safeName}`;
}

/** Sanitiza prefixo de chave R2 vindo do cliente. */
function sanitizePrefix(prefix: string): string {
  const segments = String(prefix ?? "")
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32))
    .filter((segment) => segment.length > 0 && segment !== ".");
  // Remove segmentos ".." (path traversal) já coberto pelo filtro de chars,
  // mas garante explicitamente.
  const cleaned = segments.filter((segment) => segment !== "..").join("/");
  return cleaned || "docs";
}

/**
 * Check if R2 is configured.
 */
export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

// ── Crypto helpers ──────────────────────────────────────────────

async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

async function hmacSha256Hex(key: ArrayBuffer, message: string): Promise<string> {
  const signature = await hmacSha256(key, message);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
