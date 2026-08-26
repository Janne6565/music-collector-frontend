/**
 * What a wish's own picture may be, in one place because two screens now ask.
 *
 * The add sheet asks while the entry is still being made, and the entry modal asks about
 * one that already exists. Both have to refuse exactly what the server refuses — a
 * rejection that arrives as a 413 after the upload is a worse sentence than the same one
 * said before it.
 */

/** What a file picker produces, matching the server's allowlist. */
export const ACCEPTED_IMAGES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/** The server's own cap. Refusing here makes it a sentence rather than a 413 later. */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** Why a file was refused, or null when it was not. */
export type ImageRejection = "type" | "size" | null;

export function rejectionFor(file: File): ImageRejection {
  if (!ACCEPTED_IMAGES.includes(file.type)) return "type";
  if (file.size > MAX_IMAGE_BYTES) return "size";
  return null;
}
