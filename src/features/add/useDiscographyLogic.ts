import { type Discography, lookupDiscography, lookupPressings } from "@/api/releases";
import type { Album, Artist, Release } from "@janne6565/music-collector-shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

/**
 * The primary types the artist screen offers, in the order the deck lists them.
 *
 * MusicBrainz's own vocabulary, not ours — the value is sent straight to the query, so
 * renaming one here would silently return nothing.
 */
export const PRIMARY_TYPES = ["Album", "EP", "Single", "Broadcast", "Other"] as const;
export type PrimaryType = (typeof PRIMARY_TYPES)[number];

/**
 * One artist's discography (screens 10c and 10d).
 *
 * Only the selected type is fetched. The deck puts a count on every chip, but each count
 * is its own upstream query and MusicBrainz allows one request per second — drawing all
 * five would cost five seconds before the first album appeared. The chip you are looking
 * at always shows the true total; the others fill in as you visit them, and the counts
 * already learned are remembered so going back is free.
 */
export function useDiscographyLogic(artist: Artist) {
  const [type, setType] = useState<PrimaryType>("Album");
  const [filter, setFilter] = useState("");
  const [expandedAlbum, setExpandedAlbum] = useState<string | null>(null);

  const discography = useQuery({
    queryKey: ["discography", artist.mbid, type],
    queryFn: () => lookupDiscography(artist.mbid, type, 100),
    // A discography does not change while a modal is open, and each fetch costs a second.
    staleTime: 5 * 60_000,
  });

  /**
   * Counts for the chips already visited, read out of the query cache rather than tracked
   * in state — the cache is already the record of what has been fetched, and keeping a
   * second copy is how the two drift.
   */
  const queryClient = useQueryClient();
  const totals = Object.fromEntries(
    PRIMARY_TYPES.map((primaryType) => [
      primaryType,
      queryClient.getQueryData<Discography>(["discography", artist.mbid, primaryType])?.total ??
        null,
    ]),
  ) as Record<PrimaryType, number | null>;

  const albums = discography.data?.albums ?? [];
  const term = filter.trim().toLowerCase();
  const visible = useMemo(
    () => (term === "" ? albums : albums.filter((a) => a.title.toLowerCase().includes(term))),
    [albums, term],
  );

  const pressings = useQuery({
    queryKey: ["pressings", expandedAlbum],
    enabled: expandedAlbum !== null,
    queryFn: () => lookupPressings(expandedAlbum as string, 100),
    staleTime: 5 * 60_000,
  });

  return {
    type,
    setType: (next: PrimaryType) => {
      setType(next);
      setExpandedAlbum(null);
    },
    filter,
    setFilter,
    albums: visible,
    /** What MusicBrainz says exists of this type, not what fitted in the page. */
    total: discography.data?.total ?? 0,
    /** Per-chip counts, null for a type nobody has opened yet. */
    totals,
    /** How many of them the filter is showing, for "3 of 51 albums match". */
    matching: visible.length,
    filtering: term !== "",
    loading: discography.isFetching,
    failed: discography.isError,

    expandedAlbum,
    toggleAlbum: (album: Album) =>
      setExpandedAlbum((current) => (current === album.albumId ? null : album.albumId)),
    pressings: (pressings.data ?? []) as Release[],
    pressingsLoading: pressings.isFetching,
    pressingsFailed: pressings.isError,
  };
}
