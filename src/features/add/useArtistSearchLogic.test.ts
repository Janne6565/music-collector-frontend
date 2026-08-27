import { artistMeta } from "@/features/add/useArtistSearchLogic";
import type { Artist } from "@janne6565/rekordo-shared";
import { describe, expect, it } from "vitest";

function artist(overrides: Partial<Artist> = {}): Artist {
  return {
    mbid: "a1ced3e5-476c-4046-bd74-d428f419989b",
    name: "Daughter",
    disambiguation: "UK indie folk band fronted by Elena Tonra",
    type: "Group",
    country: "GB",
    beganIn: "2010",
    endedIn: null,
    score: 100,
    ...overrides,
  };
}

describe("artistMeta", () => {
  it("reads as one line for a band that is still going", () => {
    expect(artistMeta(artist())).toBe("Group · GB · 2010–");
  });

  it("closes the range for one that ended", () => {
    const miles = artist({
      name: "Miles Davis",
      type: "Person",
      country: "US",
      beganIn: "1926-05-26",
      endedIn: "1991-09-28",
    });
    expect(artistMeta(miles)).toBe("Person · US · 1926–1991");
  });

  it("omits what the archive does not know rather than leaving dangling separators", () => {
    // Plenty of artists have no type, no country, or no dates — a row that rendered
    // "· ·" for them would look broken rather than incomplete.
    expect(artistMeta(artist({ type: null, country: null }))).toBe("2010–");
    expect(artistMeta(artist({ beganIn: null }))).toBe("Group · GB");
    expect(artistMeta(artist({ type: null, country: null, beganIn: null }))).toBe("");
  });

  it("cuts a full date down to its year", () => {
    // MusicBrainz life spans are as precise as somebody made them, and a header showing
    // "1926-05-26–1991-09-28" is unreadable.
    expect(artistMeta(artist({ beganIn: "2010-03-01" }))).toBe("Group · GB · 2010–");
  });
});
