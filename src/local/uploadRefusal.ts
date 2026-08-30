import type { LocalStore } from "@janne6565/rekordo-shared";

/**
 * Why the last photo upload was turned away, as the sync engine recorded it.
 *
 * The engine writes this (shared `sync/uploadRefusal.ts`); this reads it. Deliberately a
 * local copy of the key and the parse rather than an import, because the engine's half is
 * newer than the shared version this app installs. When the package next ships, this file
 * becomes a re-export and nothing else moves.
 *
 * There is no "seen" bookkeeping here as there is on the phone: the web says this in a
 * banner that lives beside the photos rather than in a sheet that interrupts, so it has
 * nothing to dismiss and nothing to remember.
 */
const PHOTO_UPLOAD_REFUSAL = "photo.upload.refusal";

export type UploadRefusalReason = "full" | "tooLarge";

export interface UploadRefusal {
  readonly reason: UploadRefusalReason;
  readonly photoId: string;
  readonly at: number;
}

export async function readUploadRefusal(store: LocalStore): Promise<UploadRefusal | null> {
  const raw = await store.readSetting(PHOTO_UPLOAD_REFUSAL);
  if (raw === undefined || raw === "") return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UploadRefusal>;
    if (parsed.reason !== "full" && parsed.reason !== "tooLarge") return null;
    if (typeof parsed.photoId !== "string" || typeof parsed.at !== "number") return null;
    return { reason: parsed.reason, photoId: parsed.photoId, at: parsed.at };
  } catch {
    return null;
  }
}
