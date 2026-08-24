import { describe, expect, it } from "vitest";
import type { ReleaseDto } from "@/api/generated/musicCollectorAPI.schemas";
import { releaseDisambiguation, toRelease, toReleases } from "@/api/releases";

const complete: ReleaseDto = {
  mbid: "release-1",
  releaseGroupMbid: "group-1",
  title: "Remain in Light",
  artistName: "Talking Heads",
  year: 1980,
  format: "VINYL",
  label: "Sire",
  catalogNumber: "SRK 6095",
  country: "US",
  barcode: "075992609524",
  coverArtUrl: "https://example.test/front-500",
  coverTheme: { dominantColor: "#010000", accentColor: "#b93326", lightness: 0.001, dark: true },
};

describe("toRelease", () => {
  it("maps a complete payload", () => {
    const release = toRelease(complete, 1000);

    expect(release).toMatchObject({
      mbid: "release-1",
      title: "Remain in Light",
      format: "VINYL",
      year: 1980,
      cachedAt: 1000,
      coverTheme: { dominantColor: "#010000", dark: true },
    });
  });

  it("turns absent optional fields into explicit nulls", () => {
    const release = toRelease(
      { mbid: "r", releaseGroupMbid: "g", title: "T", artistName: "A" },
      1000,
    );

    expect(release).toMatchObject({
      year: null,
      label: null,
      catalogNumber: null,
      country: null,
      barcode: null,
      coverArtUrl: null,
      coverTheme: null,
    });
  });

  it.each(["mbid", "releaseGroupMbid", "title", "artistName"] as const)(
    "rejects a payload missing %s",
    (field) => {
      const broken = { ...complete };
      delete broken[field];

      expect(toRelease(broken, 1000)).toBeNull();
    },
  );

  it("falls back to OTHER for a format it does not know", () => {
    // Rather than crashing on a format the server learned about before this client did.
    const release = toRelease({ ...complete, format: "LASERDISC" as never }, 1000);

    expect(release?.format).toBe("OTHER");
  });

  it("drops a half-populated cover theme rather than rendering a broken one", () => {
    const release = toRelease({ ...complete, coverTheme: { dominantColor: "#fff" } }, 1000);

    expect(release?.coverTheme).toBeNull();
  });
});

describe("toReleases", () => {
  it("keeps the usable rows and drops the rest", () => {
    // One bad row in a search result should not empty the whole list.
    const releases = toReleases([complete, { title: "no ids" }, complete], 1000);

    expect(releases).toHaveLength(2);
  });
});

describe("releaseDisambiguation", () => {
  it("joins what is known and omits what is not", () => {
    const release = toRelease(complete, 0);
    expect(release && releaseDisambiguation(release)).toBe("Sire · SRK 6095 · US");

    const sparse = toRelease({ ...complete, catalogNumber: undefined, country: undefined }, 0);
    expect(sparse && releaseDisambiguation(sparse)).toBe("Sire");
  });
});
