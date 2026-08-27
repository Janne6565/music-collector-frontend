import { getTracklist } from "@/api/generated/metadata/metadata";
import type { TrackMediumDto, TracklistDto } from "@/api/generated/rekordoAPI.schemas";

/**
 * The tracklist half of the catalogue (design 26).
 *
 * Fetched when a detail sheet opens and never stored: unlike the release row, a tracklist
 * is not something a copy needs in order to be drawn, and sync deliberately carries no
 * catalogue at all. The server holds the cache — it reads MusicBrainz once per release and
 * answers from its own table forever after — so the client's job is only to ask and to
 * render what comes back.
 */

export interface Track {
  /** The catalogue's own label: "1" on a CD, "A1" on vinyl, "C1" on the second LP. */
  readonly number: string;
  readonly title: string;
  /** Milliseconds, or null. Null is routine and is drawn as an empty cell, not a dash. */
  readonly lengthMs: number | null;
  /** Only set where it differs from the release credit — a compilation, and nothing else. */
  readonly artistName: string | null;
}

export interface TrackMedium {
  readonly position: number;
  readonly format: string | null;
  /** A named disc, which happens on box sets. Unnamed discs arrive as null. */
  readonly title: string | null;
  readonly tracks: readonly Track[];
}

/** Why there is no tracklist, when nothing will ever change that. */
export type TracklistAbsence = "HAND_ENTERED" | "DISCOGS" | "NOT_IN_CATALOGUE";

export interface Tracklist {
  /** What the release row knew before the titles did, so the header is true either way. */
  readonly trackCount: number | null;
  readonly discCount: number | null;
  readonly media: readonly TrackMedium[];
  readonly absence: TracklistAbsence | null;
}

function toMedium(dto: TrackMediumDto): TrackMedium {
  return {
    position: dto.position ?? 1,
    format: dto.format ?? null,
    title: dto.title ?? null,
    tracks: (dto.tracks ?? [])
      .filter((track) => track.number !== undefined && track.title !== undefined)
      .map((track) => ({
        number: track.number as string,
        title: track.title as string,
        // `?? null` and never `|| null`: a track can legitimately be 0 ms long in the
        // catalogue, and coercing that to "unknown" would be a different claim.
        lengthMs: track.lengthMs ?? null,
        artistName: track.artistName ?? null,
      })),
  };
}

export function toTracklist(dto: TracklistDto): Tracklist {
  return {
    trackCount: dto.trackCount ?? null,
    discCount: dto.discCount ?? null,
    media: (dto.media ?? []).map(toMedium).filter((medium) => medium.tracks.length > 0),
    absence: dto.unavailableReason ?? null,
  };
}

export async function fetchTracklist(releaseId: string): Promise<Tracklist> {
  return toTracklist(await getTracklist(releaseId));
}
