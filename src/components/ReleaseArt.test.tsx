import { ReleaseArt } from "@/components/ReleaseArt";
import type { Release } from "@/domain/types";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function release(overrides: Partial<Release> = {}): Release {
  return {
    mbid: "rel-1",
    releaseGroupMbid: "rg-1",
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

  it("waits again when it is handed a different release", () => {
    // The caller does not re-key these — the library grid reuses rows as filters change —
    // so a loaded flag that survived the swap would show the old cover's state.
    const { container, rerender } = render(<ReleaseArt release={release()} />);
    fireEvent.load(cover(container));
    expect(cover(container).className).toContain("opacity-100");

    rerender(
      <ReleaseArt
        release={release({ mbid: "rel-2", coverArtUrl: "https://covers.example/2.jpg" })}
      />,
    );

    expect(cover(container).className).toContain("opacity-0");
    expect(container.querySelector(".mc-sweep")).not.toBeNull();
  });
});
