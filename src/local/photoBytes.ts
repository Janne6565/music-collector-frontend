import type { LocalStore } from "@janne6565/music-collector-shared";

/**
 * The browser's half of the archive's byte seam.
 *
 * The store hands photos back as `Blob`s, which is what an `<img>` wants; the archive
 * wants the bytes. Each app gets at them its own way — a phone reads the file it keeps on
 * disk, the browser reads the row Dexie already holds — which is why `exportMcArchive`
 * asks for a reader rather than calling the store itself.
 */

/**
 * The one thing this needs beyond `LocalStore`, asked for the way `OriginJournal` is:
 * structurally, so a store that does not keep raw buffers is not excluded from the
 * contract shared with mobile.
 */
interface RawPhotoBytes {
  photoBuffer(id: string): Promise<ArrayBuffer | undefined>;
}

export async function readPhotoBytes(
  store: LocalStore,
  photoId: string,
): Promise<Uint8Array | undefined> {
  const raw = store as Partial<RawPhotoBytes>;
  if (typeof raw.photoBuffer === "function") {
    const buffer = await raw.photoBuffer(photoId);
    return buffer === undefined ? undefined : new Uint8Array(buffer);
  }
  const blob = await store.getPhotoBytes(photoId);
  return blob === undefined ? undefined : new Uint8Array(await blob.arrayBuffer());
}
