/**
 * What a chosen picture is cut down to before it is ever stored.
 *
 * Until now the file the picker handed over was written to IndexedDB byte for byte and
 * uploaded the same way, so a photo off a phone was three or four megabytes and one off a
 * camera was fifteen. Against a 20 MB allowance that is six pictures, and none of those
 * megabytes were ever drawn: the largest a sleeve photo is ever shown is the full-width
 * hero on a phone at three times density, which is about 1170px.
 *
 * So {@link MAX_EDGE} is that, with room for a pinch, and the difference from the original
 * is invisible at every size the app draws. A normal sleeve photo comes out around 300 kB.
 *
 * Scaled here rather than on the server for the same reason the profile picture is framed
 * here: what is stored is what the device already has, so the copy in IndexedDB and the
 * copy in the bucket are the same picture, and sync never has to reconcile two versions of
 * one photo id.
 */

/** The long edge a stored photo is cut to. See above for where the number comes from. */
export const MAX_EDGE = 1600;

/**
 * High enough that the flat colour and small type on a record sleeve survive it, low
 * enough that the file is a fraction of a megabyte. Below about 0.75 the lettering on a
 * spine starts to ring.
 */
export const JPEG_QUALITY = 0.82;

/**
 * The size a picture of these dimensions is stored at: the long edge capped at
 * {@link MAX_EDGE}, the aspect ratio kept, and anything already small enough left alone.
 */
export function scaledSize(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE) return { width, height };
  const scale = MAX_EDGE / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface ScaledPhoto {
  readonly blob: Blob;
  readonly contentType: string;
}

/**
 * The picture at storable size, or the original file when the browser cannot decode it.
 *
 * A HEIC outside Safari is the case that matters: `createImageBitmap` refuses it, and
 * handing back the original keeps exactly the behaviour this app had before scaling
 * existed rather than dropping a picture somebody chose.
 */
export async function scalePhoto(file: File): Promise<ScaledPhoto> {
  let bitmap: ImageBitmap;
  try {
    // `from-image` bakes in the EXIF rotation flag a phone writes. Every gallery applies it
    // and a canvas does not, so without this a picture drawn from the stored bytes would
    // lie on its side.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { blob: file, contentType: file.type };
  }

  try {
    const target = scaledSize(bitmap.width, bitmap.height);

    const blob = await encode(bitmap, target);
    if (blob === null) return { blob: file, contentType: file.type };

    // A picture already smaller than the ceiling can come out of the encoder larger than it
    // went in — an optimised JPEG re-encoded is not a saving. Nothing was scaled in that
    // case, so the original is the better of two identical pictures.
    const untouched = target.width === bitmap.width && target.height === bitmap.height;
    if (untouched && blob.size >= file.size) return { blob: file, contentType: file.type };
    return { blob, contentType: "image/jpeg" };
  } finally {
    bitmap.close();
  }
}

/**
 * Halved down to the target rather than dropped to it in one draw.
 *
 * A single bilinear step from 4032px to 1600px reads eight source pixels in every sixty-four
 * and turns fine lettering into noise. Halving first costs a few milliseconds — the same
 * reasoning the profile picture's renderer uses on the server.
 */
async function encode(
  bitmap: ImageBitmap,
  target: { width: number; height: number },
): Promise<Blob | null> {
  let canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  let context = canvas.getContext("2d");
  if (context === null) return null;
  context.drawImage(bitmap, 0, 0);

  while (canvas.width / 2 > target.width) {
    const next = document.createElement("canvas");
    next.width = Math.max(1, Math.round(canvas.width / 2));
    next.height = Math.max(1, Math.round(canvas.height / 2));
    const nextContext = next.getContext("2d");
    if (nextContext === null) return null;
    nextContext.imageSmoothingQuality = "high";
    nextContext.drawImage(canvas, 0, 0, next.width, next.height);
    canvas = next;
    context = nextContext;
  }

  if (canvas.width !== target.width) {
    const last = document.createElement("canvas");
    last.width = target.width;
    last.height = target.height;
    const lastContext = last.getContext("2d");
    if (lastContext === null) return null;
    lastContext.imageSmoothingQuality = "high";
    lastContext.drawImage(canvas, 0, 0, target.width, target.height);
    canvas = last;
  }

  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
}
