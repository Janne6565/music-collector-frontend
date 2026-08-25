import { ReleaseArt } from "@/components/ReleaseArt";
import type { Release } from "@janne6565/music-collector-shared";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function release(overrides: Partial<Release> = {}): Release {
  return {
    id: "rel-1",
    albumId: "rg-1",
    title: "Ambient 1: Music for Airports",
    artistName: "Brian Eno",
    year: 1978,
    format: "VINYL",
    coverArtUrl: "https://covers.example/rel-1.jpg",
    ...overrides,
  } as Release;
}

/** The cover is the only <img> the component ever renders. */
function cover(container: HTMLElement): HTMLImageElement {
  const image = container.querySelector("img");
  if (image === null) throw new Error("no cover element rendered");
  return image;
}

describe("ReleaseArt", () => {
  it("holds the frame with the placeholder until the cover has loaded", () => {
    const { container } = render(<ReleaseArt release={release()} />);

    // Requested from the first render — the point is that it is not *shown* yet, not that
    // it is not being fetched.
    expect(cover(container).getAttribute("src")).toBe("https://covers.example/rel-1.jpg");
    expect(cover(container).className).toContain("opacity-0");
    expect(container.querySelector(".mc-sweep")).not.toBeNull();

    fireEvent.load(cover(container));

    expect(cover(container).className).toContain("opacity-100");
  });

  it("stops the sweep and keeps the placeholder when there is no cover behind the URL", () => {
    // Around four releases in ten have no bytes at the address the server built, and a
    // frame that swept forever would promise artwork that is never coming.
    const { container } = render(<ReleaseArt release={release()} />);

    fireEvent.error(cover(container));

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".mc-sweep")).toBeNull();
  });

  it("shows the placeholder outright for a release with no cover at all", () => {
    const { container } = render(<ReleaseArt release={release({ coverArtUrl: null })} />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".mc-sweep")).toBeNull();
  });

  it("draws the cover into the sleeve, not over the whole tile", () => {
    // A record sticks out past its cover and a CD sits in front of one. Covering the tile
    // would bury the silhouette — the only thing saying which of the four formats this
    // copy is, in the one view where a release appears once per format.
    const { container } = render(<ReleaseArt release={release()} />);

    expect(cover(container).parentElement?.className).toContain("w-[88%]");
  });

  it("fills the frame edge to edge on the item detail", () => {
    // Screens 3a and 1j draw the hero as the cover and nothing else — no sleeve, no
    // record, no format furniture.
    const { container } = render(<ReleaseArt release={release()} variant="bleed" />);

    expect(cover(container).parentElement?.className).not.toContain("w-[88%]");
  });

  it("shows the copy's own photo when the release has no cover", () => {
    // Nothing in the archive, but the owner photographed the sleeve: that picture is the
    // best answer we have, and it belongs in the frame instead of the placeholder.
    const { container } = render(
      <ReleaseArt release={release({ coverArtUrl: null })} previewSrc="blob:photo-1" />,
    );

    expect(cover(container).getAttribute("src")).toBe("blob:photo-1");
  });

  it("puts the preview ahead of the catalogue's own artwork", () => {
    // Turn 11: the images of a copy are one ordered list and starring one puts it first.
    // Ranking the archive above it would make that gesture do nothing on every record the
    // archive happens to have — which is most of them.
    const { container } = render(<ReleaseArt release={release()} previewSrc="blob:photo-1" />);

    expect(cover(container).getAttribute("src")).toBe("blob:photo-1");
  });

  it("drops back to the catalogue cover when the preview cannot be shown", () => {
    // A copy pulled from another device has photo records before it has their bytes.
    const { container } = render(<ReleaseArt release={release()} previewSrc="blob:photo-1" />);

    fireEvent.error(cover(container));

    expect(cover(container).getAttribute("src")).toBe("https://covers.example/rel-1.jpg");
  });

  it("settles on the placeholder when the photo fails too", () => {
    // Two addresses in play: forgetting the first failure once the second one fails would
    // swap the two forever.
    const { container } = render(<ReleaseArt release={release()} previewSrc="blob:photo-1" />);

    fireEvent.error(cover(container));
    fireEvent.error(cover(container));

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".mc-sweep")).toBeNull();
  });

  it("waits again when it is handed a different release", () => {
    // The caller does not re-key these — the library grid reuses rows as filters change —
    // so a loaded flag that survived the swap would show the old cover's state.
    const { container, rerender } = render(<ReleaseArt release={release()} />);
    fireEvent.load(cover(container));
    expect(cover(container).className).toContain("opacity-100");

    rerender(
      <ReleaseArt
        release={release({ id: "rel-2", coverArtUrl: "https://covers.example/2.jpg" })}
      />,
    );

    expect(cover(container).className).toContain("opacity-0");
    expect(container.querySelector(".mc-sweep")).not.toBeNull();
  });
});
