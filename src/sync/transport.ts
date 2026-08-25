import type {
  SyncCopyDto,
  SyncPhotoDto,
  SyncWishDto,
} from "@/api/generated/musicCollectorAPI.schemas";
import { pull, push } from "@/api/generated/sync/sync";
import { downloadPhotoBytes, uploadPhotoBytes } from "@/api/photos";
import type {
  ClockSource,
  Copy,
  LocalStore,
  Photo,
  PushResult,
  SyncPage,
  SyncTransport,
  WishlistItem,
} from "@janne6565/music-collector-shared";
import { SyncEngine } from "@janne6565/music-collector-shared";

/**
 * The web app's half of sync: the Orval client, and the DTO shapes it speaks.
 *
 * springdoc types every field optional, so a record coming back from the server is
 * validated here before it is allowed anywhere near the store — a malformed row is
 * dropped rather than written. The reconciliation itself is in the shared package, which
 * only ever sees domain records; this file is the seam between the two.
 */

function wishToDto(item: WishlistItem): SyncWishDto {
  return {
    id: item.id,
    albumId: item.albumId,
    title: item.title,
    artistName: item.artistName,
    year: item.year ?? undefined,
    desiredFormat: item.desiredFormat ?? undefined,
    note: item.note ?? undefined,
    createdAt: item.createdAt,
    deletedAt: item.deletedAt ?? undefined,
    fieldClocks: item.fieldClocks,
  };
}

function photoToDto(photo: Photo): SyncPhotoDto {
  return {
    id: photo.id,
    copyId: photo.copyId,
    storageKey: photo.storageKey ?? undefined,
    contentType: photo.contentType,
    byteSize: photo.byteSize,
    sortIndex: photo.sortIndex,
    createdAt: photo.createdAt,
    deletedAt: photo.deletedAt ?? undefined,
    fieldClocks: photo.fieldClocks,
  };
}

export function photoFromDto(dto: SyncPhotoDto): Photo | null {
  if (
    dto.id === undefined ||
    dto.copyId === undefined ||
    dto.createdAt === undefined ||
    dto.fieldClocks === undefined
  ) {
    return null;
  }
  return {
    id: dto.id,
    copyId: dto.copyId,
    storageKey: dto.storageKey ?? null,
    contentType: dto.contentType ?? "image/jpeg",
    byteSize: dto.byteSize ?? 0,
    sortIndex: dto.sortIndex ?? 0,
    createdAt: dto.createdAt,
    deletedAt: dto.deletedAt ?? null,
    fieldClocks: dto.fieldClocks as Photo["fieldClocks"],
  };
}

export function wishFromDto(dto: SyncWishDto): WishlistItem | null {
  if (
    dto.id === undefined ||
    dto.albumId === undefined ||
    dto.title === undefined ||
    dto.artistName === undefined ||
    dto.createdAt === undefined ||
    dto.fieldClocks === undefined
  ) {
    return null;
  }
  return {
    id: dto.id,
    albumId: dto.albumId,
    title: dto.title,
    artistName: dto.artistName,
    year: dto.year ?? null,
    desiredFormat: (dto.desiredFormat ?? null) as WishlistItem["desiredFormat"],
    note: dto.note ?? null,
    createdAt: dto.createdAt,
    deletedAt: dto.deletedAt ?? null,
    fieldClocks: dto.fieldClocks as WishlistItem["fieldClocks"],
  };
}

function toDto(copy: Copy): SyncCopyDto {
  return {
    id: copy.id,
    releaseId: copy.releaseId,
    manualTitle: copy.manualTitle ?? undefined,
    manualArtist: copy.manualArtist ?? undefined,
    manualYear: copy.manualYear ?? undefined,
    manualLabel: copy.manualLabel ?? undefined,
    manualCatalogNumber: copy.manualCatalogNumber ?? undefined,
    manualFormat: copy.manualFormat ?? undefined,
    condition: copy.condition ?? undefined,
    sleeveCondition: copy.sleeveCondition ?? undefined,
    // Always sent, unlike the nullable fields: false is a real answer here, and dropping
    // it would leave a server that had been told `true` never hearing it undone.
    catalogArt: copy.catalogArt,
    pricePaidCents: copy.pricePaidCents ?? undefined,
    currency: copy.currency,
    purchasedOn: copy.purchasedOn ?? undefined,
    purchasedAt: copy.purchasedAt ?? undefined,
    notes: copy.notes ?? undefined,
    notesConflict: copy.notesConflict ?? undefined,
    rating: copy.rating ?? undefined,
    createdAt: copy.createdAt,
    deletedAt: copy.deletedAt ?? undefined,
    fieldClocks: copy.fieldClocks,
  };
}

/**
 * The server types every field optional, so a record is validated here before it is
 * allowed anywhere near the local store — a malformed row should be dropped, not written.
 */
export function fromDto(dto: SyncCopyDto): Copy | null {
  if (
    dto.id === undefined ||
    dto.releaseId === undefined ||
    dto.currency === undefined ||
    dto.createdAt === undefined ||
    dto.fieldClocks === undefined
  ) {
    return null;
  }
  return {
    id: dto.id,
    releaseId: dto.releaseId,
    manualTitle: dto.manualTitle ?? null,
    manualArtist: dto.manualArtist ?? null,
    manualYear: dto.manualYear ?? null,
    manualLabel: dto.manualLabel ?? null,
    manualCatalogNumber: dto.manualCatalogNumber ?? null,
    manualFormat: (dto.manualFormat ?? null) as Copy["manualFormat"],
    condition: (dto.condition ?? null) as Copy["condition"],
    sleeveCondition: (dto.sleeveCondition ?? null) as Copy["sleeveCondition"],
    // Absent means a server older than the field, which is the same as not preferring it.
    catalogArt: (dto.catalogArt ?? "AUTO") as Copy["catalogArt"],
    pricePaidCents: dto.pricePaidCents ?? null,
    currency: dto.currency,
    purchasedOn: dto.purchasedOn ?? null,
    purchasedAt: dto.purchasedAt ?? null,
    notes: dto.notes ?? null,
    notesConflict: dto.notesConflict ?? null,
    rating: dto.rating ?? null,
    createdAt: dto.createdAt,
    deletedAt: dto.deletedAt ?? null,
    fieldClocks: dto.fieldClocks as Copy["fieldClocks"],
  };
}

function toPage(
  page: {
    copies?: SyncCopyDto[];
    wishes?: SyncWishDto[];
    photos?: SyncPhotoDto[];
    cursor?: number;
    hasMore?: boolean;
  },
  cursor: number,
): SyncPage {
  return {
    copies: (page.copies ?? []).map(fromDto).filter((copy): copy is Copy => copy !== null),
    wishes: (page.wishes ?? [])
      .map(wishFromDto)
      .filter((wish): wish is WishlistItem => wish !== null),
    photos: (page.photos ?? []).map(photoFromDto).filter((photo): photo is Photo => photo !== null),
    cursor: page.cursor ?? cursor,
    hasMore: page.hasMore === true,
  };
}

export function createSyncTransport(store: LocalStore): SyncTransport {
  return {
    async pull(cursor: number): Promise<SyncPage> {
      return toPage(await pull({ since: cursor }), cursor);
    },

    async push(copies, wishes, photos): Promise<PushResult> {
      const response = await push({
        copies: copies.map(toDto),
        wishes: wishes.map(wishToDto),
        photos: photos.map(photoToDto),
      });
      const page = toPage(response, 0);
      return {
        copies: page.copies,
        wishes: page.wishes,
        photos: page.photos,
        cursor: response.cursor ?? 0,
      };
    },

    /**
     * Null rather than a throw when the bytes are not on this device: that is not a
     * failure, it is a photo whose turn has not come, and the next sync tries again.
     */
    async uploadPhoto(photo) {
      const bytes = await store.getPhotoBytes(photo.id);
      if (bytes === undefined) return null;
      return uploadPhotoBytes(photo.id, photo.copyId, bytes);
    },

    async downloadPhoto(photo) {
      const bytes = await downloadPhotoBytes(photo.id);
      await store.putPhotoBytes(photo.id, await bytes.arrayBuffer(), photo.contentType);
    },
  };
}

/** The engine, wired to this app's transport. Every caller goes through here. */
export function createSyncEngine(store: LocalStore, clock: ClockSource): SyncEngine {
  return new SyncEngine(store, clock, createSyncTransport(store));
}
