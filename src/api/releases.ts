import type { CoverThemeDto, ReleaseDto } from "@/api/generated/musicCollectorAPI.schemas";
import { findByBarcode, getRelease, search } from "@/api/generated/metadata/metadata";
import type { CoverTheme, Format, Release } from "@/domain/types";
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
    dto.mbid === undefined ||
    dto.releaseGroupMbid === undefined ||
    dto.title === undefined ||
    dto.artistName === undefined
  ) {
    return null;
  }
  return {
    mbid: dto.mbid,
    releaseGroupMbid: dto.releaseGroupMbid,
    title: dto.title,
    artistName: dto.artistName,
    year: dto.year ?? null,
    format: isFormat(dto.format) ? dto.format : "OTHER",
    label: dto.label ?? null,
    catalogNumber: dto.catalogNumber ?? null,
    country: dto.country ?? null,
    barcode: dto.barcode ?? null,
    coverArtUrl: dto.coverArtUrl ?? null,
    coverTheme: toCoverTheme(dto.coverTheme),
    cachedAt: now,
  };
}

export function toReleases(dtos: readonly ReleaseDto[], now: number): Release[] {
  return dtos.map((dto) => toRelease(dto, now)).filter((release): release is Release => release !== null);
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
