import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "crypto";

/**
 * Upload a Buffer to Firebase Storage and return a public download URL.
 *
 * Uses Firebase's download token mechanism — no signed URL or IAM setup needed.
 * The URL is non-expiring but token-protected (only accessible with the token).
 *
 * @param buffer    - file bytes
 * @param mimeType  - e.g. "application/pdf", "image/png", "video/mp4"
 * @param folder    - storage folder, e.g. "documents", "images", "videos"
 * @returns         publicly accessible download URL
 */
export async function uploadFile(
  buffer: Buffer,
  mimeType: string,
  folder = "uploads"
): Promise<string> {
  const token = randomUUID();
  const ext   = mimeType.split("/")[1] ?? "bin";
  const path  = `${folder}/${Date.now()}-${token.slice(0, 8)}.${ext}`;
  const file  = getStorage().bucket().file(path);

  await file.save(buffer, {
    contentType: mimeType,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });

  const encoded = encodeURIComponent(path);
  const bucket  = file.bucket.name;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media&token=${token}`;
}
