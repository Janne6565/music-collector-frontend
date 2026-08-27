import type { PhotoTile } from "@/features/photos/usePhotoStripLogic";
import type { CatalogArtChoice } from "@janne6565/rekordo-shared";

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
 * Which image is this copy's preview — the one the grid and the hero draw.
 *
 * Two rules, because the catalogue's artwork is not in the photo order and cannot be:
 * starring it sets a flag, and starring a photo moves it to the front and clears that
 * flag. With neither, the front photo wins, and the catalogue stands in only where there
 * are no photos at all.
 */
export function previewImage(
  tiles: readonly PhotoTile[],
  catalogArt: CatalogArtChoice,
): ShownImage {
  const first = tiles[0];
  return catalogArt === "PREFERRED" || first === undefined
    ? { kind: "CATALOG" }
    : { kind: "PHOTO", id: first.photo.id };
}

/**
 * A selection, corrected against the list it points into.
 *
 * Nothing is selected until you click something, and a selection is dropped the moment
 * the image behind it goes away: a remembered id would outlive the photo it named and
 * strand the frame on a blank tile. With no valid selection the frame falls back to the
 * preview.
 */
export function resolveShown(
  shown: ShownImage | null,
  tiles: readonly PhotoTile[],
  hasCatalog: boolean,
  catalogArt: CatalogArtChoice,
): ShownImage {
  const stillThere =
    shown !== null &&
    (shown.kind === "CATALOG" ? hasCatalog : tiles.some((tile) => tile.photo.id === shown.id));
  if (stillThere) return shown;

  const preview = previewImage(tiles, catalogArt);
  // The catalogue is only a place to fall back to when there is artwork behind it.
  return preview.kind === "CATALOG" && !hasCatalog && tiles[0] !== undefined
    ? { kind: "PHOTO", id: tiles[0].photo.id }
    : preview;
}

/** Whether two selections name the same image. */
export function sameImage(a: ShownImage, b: ShownImage): boolean {
  return a.kind === "CATALOG" ? b.kind === "CATALOG" : b.kind === "PHOTO" && a.id === b.id;
}
