import { findArtists } from "@/api/releases";
import type { Artist } from "@/domain/types";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

/** How many artist rows show before the disclosure, per screens 10a and 10b. */
export const ARTISTS_SHOWN = 3;

/**
 * The artists half of a search (screens 10a/10b).
 *
 * A separate query from the releases one, deliberately. They are two upstream requests and
 * MusicBrainz allows us one per second, so they cannot be parallel — and a list that shows
 * artists the moment they land reads as faster than one that waits to render both at once.
 *
 * A barcode never runs this: a number identifies a pressing, and no artist is named 602537.
 */
export function useArtistSearchLogic(query: string, enabled: boolean) {
  const [expanded, setExpanded] = useState(false);

  const artists = useQuery({
    queryKey: ["artistSearch", query],
    enabled: enabled && query !== "",
    queryFn: () => findArtists(query, 8),
  });

  const all = artists.data ?? [];
  return {
    /** Everything matched, so the count on the section header is honest. */
    total: all.length,
    shown: expanded ? all : all.slice(0, ARTISTS_SHOWN),
    hidden: Math.max(0, all.length - ARTISTS_SHOWN),
    expanded,
    expand: () => setExpanded(true),
    /**
     * True only while artists are still coming. The releases query has its own wait, and
     * conflating the two would hold back whichever landed first.
     */
    loading: artists.isFetching,
    /**
     * A failed artist lookup is not a failed search. MusicBrainz times out under load
     * often enough that letting it take the releases down with it would be the wrong
     * trade — the section simply does not appear.
     */
    failed: artists.isError,
    /** Reset when a new search starts, or the second search opens pre-expanded. */
    collapse: () => setExpanded(false),
  };
}

/** The subtitle line under an artist's name, e.g. "Group · GB · 2010–". */
export function artistMeta(artist: Artist): string {
  const years =
    artist.beganIn === null
      ? null
      : `${artist.beganIn.slice(0, 4)}–${artist.endedIn === null ? "" : artist.endedIn.slice(0, 4)}`;
  return [artist.type, artist.country, years]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join(" · ");
}
