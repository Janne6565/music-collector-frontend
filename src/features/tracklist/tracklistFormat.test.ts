import type { TrackMedium } from "@/api/tracklist";
import {
  TRACK_ROW_CAP,
  capMedia,
  durationParts,
  knownDurationMs,
  trackDuration,
  trackTotal,
} from "@/features/tracklist/tracklistFormat";
import { describe, expect, it } from "vitest";

function medium(position: number, count: number, lengthMs: number | null = 200_000): TrackMedium {
  return {
    position,
    format: '12" Vinyl',
    title: null,
    tracks: Array.from({ length: count }, (_, index) => ({
      number: `${String.fromCharCode(64 + position)}${index + 1}`,
      title: `Track ${index + 1}`,
      lengthMs,
      artistName: null,
    })),
  };
}

describe("trackDuration", () => {
  it("pads the seconds so a column of times lines up", () => {
    expect(trackDuration(419_000)).toBe("6:59");
    expect(trackDuration(329_000)).toBe("5:29");
    expect(trackDuration(63_000)).toBe("1:03");
  });

  it("is empty for a length nobody knows, so the cell stays blank rather than showing a dash", () => {
    expect(trackDuration(null)).toBe("");
  });

  it("keeps a genuinely short track rather than rounding it away", () => {
    expect(trackDuration(4_000)).toBe("0:04");
  });
});

describe("knownDurationMs", () => {
  it("adds up only what is known", () => {
    const mixed: TrackMedium = {
      ...medium(1, 2),
      tracks: [
        { number: "A1", title: "One", lengthMs: 60_000, artistName: null },
        { number: "A2", title: "Two", lengthMs: null, artistName: null },
      ],
    };
    expect(knownDurationMs([mixed])).toBe(60_000);
  });

  it("is null when nothing is timed, rather than claiming a release lasts no time at all", () => {
    expect(knownDurationMs([medium(1, 5, null)])).toBeNull();
  });
});

describe("durationParts", () => {
  it("splits a long box set into hours and minutes", () => {
    expect(durationParts(33_120_000)).toEqual({ hours: 9, minutes: 12 });
  });

  it("leaves an album under the hour", () => {
    expect(durationParts(4_860_000)).toEqual({ hours: 1, minutes: 21 });
    expect(durationParts(2_460_000)).toEqual({ hours: 0, minutes: 41 });
  });
});

describe("capMedia", () => {
  it("leaves an album alone", () => {
    const album = [medium(1, 13)];
    expect(capMedia(album).hidden).toBe(0);
    expect(trackTotal(capMedia(album).shown)).toBe(13);
  });

  it("cuts a box set at the cap and says how much is left", () => {
    const boxSet = Array.from({ length: 8 }, (_, index) => medium(index + 1, 15));
    const { shown, hidden } = capMedia(boxSet);

    expect(trackTotal(shown)).toBe(TRACK_ROW_CAP);
    expect(hidden).toBe(120 - TRACK_ROW_CAP);
    // The cut falls mid-release, so the media that survive come with their headings and
    // the ones past it are simply not there.
    expect(shown).toHaveLength(2);
  });

  it("cuts a single 40-track disc too, which is the release the cap exists for", () => {
    const { shown, hidden } = capMedia([medium(1, 40)]);
    expect(trackTotal(shown)).toBe(TRACK_ROW_CAP);
    expect(hidden).toBe(10);
  });

  it("keeps the catalogue's own numbering on the rows it shows", () => {
    const { shown } = capMedia([medium(1, 40)]);
    expect(shown[0].tracks[0].number).toBe("A1");
    expect(shown[0].tracks[29].number).toBe("A30");
  });
});
