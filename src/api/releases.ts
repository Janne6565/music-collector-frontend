import {
  albumsOfArtist,
  findByBarcode,
  getRelease,
  releasesInGroup,
  search,
  searchArtists,
} from "@/api/generated/metadata/metadata";
import type {
  AlbumDto,
  ArtistDto,
  CoverThemeDto,
  ReleaseDto,
} from "@/api/generated/musicCollectorAPI.schemas";
import type { Album, Artist, CoverTheme, Format, Release } from "@/domain/types";
import { FORMATS } from "@/domain/types";

/**
 * The boundary between the generated client and the domain.
 *
 * springdoc emits every property as optional, so the generated `ReleaseDto` has `?` on
 * fields the server always sends. Rather than let that optionality leak into every screen
 * as `!` assertions, payloads are validated once here and anything unusable is dropped —
 * a search that returns one malformed row should show the other nine, not fail.
 */

function toCoverTheme(dto: CoverThemeDto | undefined): CoverTheme | null {
  if (
    dto?.dominantColor === undefined ||
    dto.accentColor === undefined ||
    dto.lightness === undefined ||
    dto.dark === undefined
  ) {
    return null;
  }
  return {
    dominantColor: dto.dominantColor,
    accentColor: dto.accentColor,
    lightness: dto.lightness,
    dark: dto.dark,
  };
}

function isFormat(value: string | undefined): value is Format {
  return value !== undefined && (FORMATS as readonly string[]).includes(value);
}

export function toRelease(dto: ReleaseDto, now: number): Release | null {
  // Without these four there is nothing to show and nothing to key a copy on.
  if (
    dto.id === undefined ||
    dto.albumId === undefined ||
    dto.title === undefined ||
    dto.artistName === undefined
  ) {
    return null;
  }
  return {
    id: dto.id,
    albumId: dto.albumId,
    title: dto.title,
    artistName: dto.artistName,
    year: dto.year ?? null,
    format: isFormat(dto.format) ? dto.format : "OTHER",
    label: dto.label ?? null,
    catalogNumber: dto.catalogNumber ?? null,
    country: dto.country ?? null,
    barcode: dto.barcode ?? null,
    releaseDate: dto.releaseDate ?? null,
    trackCount: dto.trackCount ?? null,
    discCount: dto.discCount ?? null,
    coverArtUrl: dto.coverArtUrl ?? null,
    coverTheme: toCoverTheme(dto.coverTheme),
    cachedAt: now,
  };
}

export function toReleases(dtos: readonly ReleaseDto[], now: number): Release[] {
  return dtos
    .map((dto) => toRelease(dto, now))
    .filter((release): release is Release => release !== null);
}

/** The subtitle under each search result on the add screen: "Sire · SRK 6095 · US". */
export function releaseDisambiguation(release: Release): string {
  return [release.label, release.catalogNumber, release.country]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join(" · ");
}

export async function searchReleases(query: string, limit = 25): Promise<Release[]> {
  return toReleases(await search({ q: query, limit }), Date.now());
}

export async function lookupByBarcode(barcode: string): Promise<Release[]> {
  return toReleases(await findByBarcode(barcode), Date.now());
}

export async function lookupRelease(mbid: string): Promise<Release | null> {
  return toRelease(await getRelease(mbid), Date.now());
}

/** Every pressing of one album. Bitches Brew has 47, so this is paged, not exhaustive. */
export async function lookupPressings(albumId: string, limit = 25): Promise<Release[]> {
  return toReleases(await releasesInGroup(albumId, { limit }), Date.now());
}

function toArtist(dto: ArtistDto): Artist | null {
  // Without these two there is nothing to show and nothing to open a discography with.
  if (dto.mbid === undefined || dto.name === undefined) return null;
  return {
    mbid: dto.mbid,
    name: dto.name,
    disambiguation: dto.disambiguation ?? "",
    type: dto.type ?? null,
    country: dto.country ?? null,
    beganIn: dto.beganIn ?? null,
    endedIn: dto.endedIn ?? null,
    score: dto.score ?? null,
  };
}

export async function findArtists(query: string, limit = 5): Promise<Artist[]> {
  return (await searchArtists({ q: query, limit }))
    .map(toArtist)
    .filter((artist): artist is Artist => artist !== null);
}

function toAlbum(dto: AlbumDto): Album | null {
  if (dto.albumId === undefined || dto.title === undefined) return null;
  return {
    albumId: dto.albumId,
    title: dto.title,
    artistName: dto.artistName ?? "",
    year: dto.year ?? null,
    primaryType: dto.primaryType ?? null,
    coverArtUrl: dto.coverArtUrl ?? null,
  };
}

export interface Discography {
  readonly albums: Album[];
  /**
   * How many the query matched upstream, not how many arrived. A chip reading "Albums 51"
   * is telling the truth on a page of 25.
   */
  readonly total: number;
}

export async function lookupDiscography(
  artistMbid: string,
  primaryType: string | null,
  limit = 25,
): Promise<Discography> {
  const dto = await albumsOfArtist(artistMbid, {
    ...(primaryType === null ? {} : { type: primaryType }),
    limit,
  });
  return {
    albums: (dto.albums ?? []).map(toAlbum).filter((album): album is Album => album !== null),
    total: dto.total ?? 0,
  };
}

/**
 * The line under an artist's name: "Group · GB · 2010–present".
 *
 * Built here rather than in the component so the mobile app can mirror it exactly.
 */
export function artistSubtitle(artist: Artist): string {
  const years =
    artist.beganIn === null
      ? null
      : `${artist.beganIn.slice(0, 4)}–${artist.endedIn === null ? "" : artist.endedIn.slice(0, 4)}`;
  return [artist.type, artist.country, years]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join(" · ");
}
