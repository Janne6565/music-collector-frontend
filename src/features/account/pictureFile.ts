/**
 * Turning whatever came out of the file picker into something the framing step can draw and
 * the server can render.
 *
 * Everything the browser can decode is re-encoded here, at full size, before it goes
 * anywhere. That is not thrift — it is what makes the preview and the result the same
 * picture. A phone JPEG carries an EXIF orientation flag that every gallery applies and the
 * server's decoder ignores, so a picture framed upright would arrive lying on its side;
 * drawing it through a canvas bakes the rotation in and drops the EXIF block with it, which
 * on a picture this public also takes the place it was taken along with it.
 */

/** What the picker offers. HEIC is in the list because a phone's camera roll is full of it. */
export const PICTURE_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

/** The server's ceiling, checked here so that nothing is sent that cannot be accepted. */
export const MAX_PICTURE_BYTES = 15_728_640;

const READABLE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export interface ChosenPicture {
  readonly name: string;
  /** The size of the file the person picked, which is what 27d reports. */
  readonly bytes: number;
  readonly width: number;
  readonly height: number;
  /** An object URL for the framing step to drag around. Revoke it when the step closes. */
  readonly previewUrl: string;
  /** Upright, re-encoded, full size: what actually goes up. */
  readonly upload: Blob;
}

export type PictureProblem =
  | { readonly kind: "type"; readonly name: string }
  | { readonly kind: "size"; readonly name: string; readonly bytes: number };

export class PictureRejected extends Error {
  constructor(readonly problem: PictureProblem) {
    super(problem.kind);
  }
}

/**
 * Reads the chosen file, or throws {@link PictureRejected} with the reason 27d has a
 * sentence for.
 *
 * The type and the size are both known here, before a byte is sent — which is why the two
 * failure rows can name the file and the number rather than repeating what a server said.
 * A file the browser turns out not to be able to decode (a HEIC outside Safari, most often)
 * is reported as the same problem as a file that was never a picture: from where the person
 * is standing, it is one.
 */
export async function readPicture(file: File): Promise<ChosenPicture> {
  if (!READABLE_TYPES.has(file.type.toLowerCase())) {
    throw new PictureRejected({ kind: "type", name: file.name });
  }
  if (file.size > MAX_PICTURE_BYTES) {
    throw new PictureRejected({ kind: "size", name: file.name, bytes: file.size });
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PictureRejected({ kind: "type", name: file.name });
  }

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (context === null) throw new PictureRejected({ kind: "type", name: file.name });
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const upload = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob === null
          ? reject(new PictureRejected({ kind: "type", name: file.name }))
          : resolve(blob),
      "image/jpeg",
      // High enough that the picture the server crops from is not the bottleneck, and the
      // server re-encodes at its own quality afterwards anyway.
      0.92,
    );
  });

  return {
    name: file.name,
    bytes: file.size,
    width: canvas.width,
    height: canvas.height,
    previewUrl: URL.createObjectURL(upload),
    upload,
  };
}
