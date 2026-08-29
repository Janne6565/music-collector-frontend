import { MAX_EDGE, scalePhoto, scaledSize } from "@/features/photos/scalePhoto";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("scaledSize", () => {
  it("caps the long edge and keeps the shape", () => {
    // A 12 MP phone photo, which is what most of these are.
    expect(scaledSize(4032, 3024)).toEqual({ width: MAX_EDGE, height: 1200 });
    expect(scaledSize(3024, 4032)).toEqual({ width: 1200, height: MAX_EDGE });
  });

  it("leaves a picture that is already small enough alone", () => {
    // Re-encoding it would still happen -- what must not happen is scaling it up.
    expect(scaledSize(1200, 800)).toEqual({ width: 1200, height: 800 });
    expect(scaledSize(MAX_EDGE, MAX_EDGE)).toEqual({ width: MAX_EDGE, height: MAX_EDGE });
  });
});

describe("scalePhoto", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hands back the original when the browser cannot decode the file", async () => {
    // A HEIC outside Safari. Dropping a picture somebody chose would be worse than
    // storing it at the size it came in, which is what this app did before scaling existed.
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(() => Promise.reject(new Error("unsupported"))),
    );
    const file = new File([new Uint8Array(64)], "sleeve.heic", { type: "image/heic" });

    const scaled = await scalePhoto(file);

    expect(scaled.blob).toBe(file);
    expect(scaled.contentType).toBe("image/heic");
  });
});
