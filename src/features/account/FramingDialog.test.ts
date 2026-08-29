import type { AvatarCrop } from "@/api/avatar";
import { squareOf } from "@/features/account/FramingDialog";
import { describe, expect, it } from "vitest";

/**
 * Compared to nine decimal places rather than exactly. The arithmetic runs through a scale
 * and back, so a square that is right lands on 499.99999999999994 rather than on 500, and
 * the transport rounds to whole pixels before the server ever sees it.
 */
function expectSquare(crop: AvatarCrop, x: number, y: number, size: number): void {
  expect(crop.x).toBeCloseTo(x, 9);
  expect(crop.y).toBeCloseTo(y, 9);
  expect(crop.size).toBeCloseTo(size, 9);
}

/**
 * The crop the server is told about, checked against squares worked out by hand.
 *
 * Worth its own file because this is the one part of the dialog that can be wrong without
 * looking wrong: the stage draws from the same numbers either way, so a mistake here shows
 * up only later, as a saved picture of somewhere else.
 */
describe("squareOf", () => {
  const DIAMETER = 280;

  it("takes the whole of a square picture, unzoomed", () => {
    const crop = squareOf({
      picture: { width: 1000, height: 1000 },
      diameter: DIAMETER,
      zoom: 1,
      at: { x: 0, y: 0 },
    });
    expectSquare(crop, 0, 0, 1000);
  });

  it("takes the middle square of a tall picture, unzoomed", () => {
    const crop = squareOf({
      picture: { width: 1000, height: 2000 },
      diameter: DIAMETER,
      zoom: 1,
      at: { x: 0, y: 0 },
    });
    expectSquare(crop, 0, 500, 1000);
  });

  it("takes the middle square of a wide picture, unzoomed", () => {
    const crop = squareOf({
      picture: { width: 2000, height: 1000 },
      diameter: DIAMETER,
      zoom: 1,
      at: { x: 0, y: 0 },
    });
    expectSquare(crop, 500, 0, 1000);
  });

  it("halves the square at twice the zoom, still centred", () => {
    const crop = squareOf({
      picture: { width: 1000, height: 1000 },
      diameter: DIAMETER,
      zoom: 2,
      at: { x: 0, y: 0 },
    });
    expectSquare(crop, 250, 250, 500);
  });

  it("moves the square opposite the picture, which is the direction a drag reads", () => {
    // Dragging the picture right by a tenth of the circle moves the crop left by a tenth of
    // its own size: 500 wide at zoom 2, so 28 stage pixels are 50 picture pixels.
    const crop = squareOf({
      picture: { width: 1000, height: 1000 },
      diameter: DIAMETER,
      zoom: 2,
      at: { x: 28, y: 0 },
    });
    expect(crop.x).toBeCloseTo(200, 9);
    expect(crop.y).toBeCloseTo(250, 9);
  });

  it("never runs off the edge, however far the picture is pushed", () => {
    const crop = squareOf({
      picture: { width: 1000, height: 1000 },
      diameter: DIAMETER,
      zoom: 2,
      at: { x: -9999, y: 9999 },
    });
    expect(crop.x).toBeCloseTo(500, 9);
    expect(crop.y).toBeCloseTo(0, 9);
    expect(crop.x + crop.size).toBeCloseTo(1000, 9);
  });
});
