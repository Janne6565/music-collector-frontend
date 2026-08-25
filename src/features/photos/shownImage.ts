import type { PhotoTile } from "@/features/photos/usePhotoStripLogic";

/**
 * Which of a copy's images the large frame is showing.
 *
 * The catalogue's artwork is not a Photo and never will be — nobody uploaded it, and it
 * belongs to the release rather than to your copy. It is still one of the things the
 * frame can show, because "which picture am I looking at" is one question and answering
 * it should not depend on where the picture came from.
 */
export type ShownImage =
  | { readonly kind: "PHOTO"; readonly id: string }
  | { readonly kind: "CATALOG" };

/**
 * A selection, corrected against the list it points into.
 *
 * Nothing is selected until you click something, and a selection is dropped the moment
 * the image behind it goes away: a remembered id would outlive the photo it named and
 * strand the frame on a blank tile. With no valid selection the frame falls back to the
 * preview — the first photo, or the catalogue art when there are none.
 */
export function resolveShown(
  shown: ShownImage | null,
  tiles: readonly PhotoTile[],
  hasCatalog: boolean,
): ShownImage {
  const stillThere =
    shown !== null &&
    (shown.kind === "CATALOG" ? hasCatalog : tiles.some((tile) => tile.photo.id === shown.id));
  if (stillThere) return shown;

  const first = tiles[0];
  return first !== undefined ? { kind: "PHOTO", id: first.photo.id } : { kind: "CATALOG" };
}

/** Whether a resolved selection is the preview — the image every other screen shows. */
export function isPreview(shown: ShownImage, tiles: readonly PhotoTile[]): boolean {
  return shown.kind === "PHOTO" ? tiles[0]?.photo.id === shown.id : tiles.length === 0;
}
