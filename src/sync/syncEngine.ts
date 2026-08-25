import type {
  SyncCopyDto,
  SyncPhotoDto,
  SyncWishDto,
} from "@/api/generated/musicCollectorAPI.schemas";
import { pull, push } from "@/api/generated/sync/sync";
import { downloadPhotoBytes, uploadPhotoBytes } from "@/api/photos";
import { mergeCopies, mergePhotos, mergeWishlistItems } from "@/domain/merge";
import type { Copy, Photo, WishlistItem } from "@/domain/types";
import type { LocalStore } from "@/local/LocalStore";
import { type ClockSource, tombstoneCopy } from "@/local/copyWrites";
import { markUploaded } from "@/local/photoWrites";
import { tombstoneWishlistItem } from "@/local/wishWrites";

/**
 * Reconciles the local store with the server.
 *
 * Sync is deliberately not in the read path: screens always read local, and this runs
 * alongside them. That is what lets the app work identically with and without an account —
 * and it is why turning sync off, or losing the network, changes nothing about what the
 * user can do.
 */

/** How the very first sync after signing in should treat the two collections. */
export type FirstSyncStrategy = "MERGE" | "KEEP_LOCAL" | "KEEP_ACCOUNT";

export interface SyncResult {
  readonly pulled: number;
  readonly pushed: number;
  readonly cursor: number;
}

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
    condition: copy.condition ?? undefined,
    sleeveCondition: copy.sleeveCondition ?? undefined,
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
    condition: (dto.condition ?? null) as Copy["condition"],
    sleeveCondition: (dto.sleeveCondition ?? null) as Copy["sleeveCondition"],
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

export class SyncEngine {
  constructor(
    private readonly store: LocalStore,
    private readonly clock: ClockSource,
  ) {}

  /**
   * Deletes go through the same stamped write path as any other edit. An unstamped
   * tombstone would lose every merge, and the copy would reappear on the next sync.
   */
  private async discard(copy: Copy, now: number): Promise<void> {
    await this.store.putCopy(tombstoneCopy(copy, this.clock, now));
  }

  /**
   * Signing in for the first time on a device that already has a collection.
   *
   * Nothing happens until the person chooses, because every option here is destructive in
   * one direction or another and none of them should be picked on their behalf.
   */
  async firstSync(strategy: FirstSyncStrategy): Promise<SyncResult> {
    if (strategy === "KEEP_ACCOUNT") {
      // Drop the local collection by tombstoning it, so the discard itself replicates
      // rather than leaving the records to come back from another device later.
      const now = Date.now();
      for (const copy of await this.store.listCopies()) {
        await this.discard(copy, now);
      }
      for (const wish of await this.store.listWishlist()) {
        await this.store.putWishlistItem(tombstoneWishlistItem(wish, this.clock, now));
      }
      await this.store.writePendingIds([]);
      return this.sync();
    }

    if (strategy === "KEEP_LOCAL") {
      // Snapshot what is local *before* pulling. Reading it afterwards would count the
      // account's records as local and keep exactly what this option is meant to discard.
      const localIds = new Set(await this.allCopyIds());

      const pulled = await this.pullAll();
      const now = Date.now();
      for (const copy of pulled.copies) {
        if (!localIds.has(copy.id) && copy.deletedAt === null) {
          await this.discard(copy, now);
        }
      }
      for (const wish of pulled.wishes) {
        if (!localIds.has(wish.id) && wish.deletedAt === null) {
          await this.store.putWishlistItem(tombstoneWishlistItem(wish, this.clock, now));
        }
      }
      await this.store.writePendingIds(await this.allCopyIds());
      return this.sync();
    }

    await this.store.writePendingIds(await this.allCopyIds());
    return this.sync();
  }

  /** A normal incremental sync: pull what is new, push what changed locally. */
  async sync(): Promise<SyncResult> {
    const pulled = await this.pullAll();
    await this.downloadMissingPhotoBytes(pulled.photos);
    const pushed = await this.pushPending();
    return {
      pulled: pulled.copies.length + pulled.wishes.length + pulled.photos.length,
      pushed,
      cursor: await this.store.readSyncCursor(),
    };
  }

  private async pullAll(): Promise<{ copies: Copy[]; wishes: WishlistItem[]; photos: Photo[] }> {
    const applied: Copy[] = [];
    const appliedWishes: WishlistItem[] = [];
    const appliedPhotos: Photo[] = [];
    let cursor = await this.store.readSyncCursor();
    let hasMore = true;

    while (hasMore) {
      const page = await pull({ since: cursor });
      for (const dto of page.photos ?? []) {
        const remote = photoFromDto(dto);
        if (remote === null) continue;
        const local = await this.store.getPhotoIncludingDeleted(remote.id);
        const merged = mergePhotos(local, remote);
        await this.store.adoptPhoto(merged);
        appliedPhotos.push(merged);
        // A photo deleted anywhere is not worth the space here either.
        if (merged.deletedAt !== null) await this.store.deletePhotoBytes(merged.id);
      }
      for (const dto of page.wishes ?? []) {
        const remote = wishFromDto(dto);
        if (remote === null) continue;
        const local = await this.store.getWishlistItemIncludingDeleted(remote.id);
        const merged = mergeWishlistItems(local, remote);
        await this.store.adoptWishlistItem(merged);
        appliedWishes.push(merged);
      }
      for (const dto of page.copies ?? []) {
        const remote = fromDto(dto);
        if (remote === null) continue;
        // Tombstones included. Looking this up with getCopy would hide a locally deleted
        // copy, make the server's live version look like a record we had never seen, and
        // adopt it wholesale — resurrecting every delete on the next sync.
        const local = await this.store.getCopyIncludingDeleted(remote.id);
        const merged = mergeCopies(local, remote);
        await this.store.adoptCopy(merged);
        applied.push(merged);
      }
      cursor = page.cursor ?? cursor;
      hasMore = page.hasMore === true;
      await this.store.writeSyncCursor(cursor);
    }
    return { copies: applied, wishes: appliedWishes, photos: appliedPhotos };
  }

  /**
   * Uploads the bytes of any photo that only exists on this device.
   *
   * Runs before the metadata push on purpose: a photo record with no storageKey is one
   * other devices can see but never fetch, so the bytes have to land first.
   */
  private async uploadPendingPhotos(): Promise<void> {
    for (const photo of await this.store.listPhotosAwaitingUpload()) {
      const bytes = await this.store.getPhotoBytes(photo.id);
      if (bytes === undefined) continue;
      try {
        const uploaded = await uploadPhotoBytes(photo.id, photo.copyId, bytes);
        if (uploaded === null) continue;
        await this.store.putPhoto(markUploaded(photo, uploaded.storageKey, this.clock));
      } catch {
        // Offline, too large, or storage is down. The photo stays local and the next sync
        // tries again; nothing is lost and the picture still shows on this device.
      }
    }
  }

  /** Fetches the bytes for photos this device knows about but has never held. */
  private async downloadMissingPhotoBytes(photos: readonly Photo[]): Promise<void> {
    for (const photo of photos) {
      if (photo.storageKey === null || photo.deletedAt !== null) continue;
      if ((await this.store.getPhotoBytes(photo.id)) !== undefined) continue;
      try {
        const bytes = await downloadPhotoBytes(photo.id);
        await this.store.putPhotoBytes(photo.id, await bytes.arrayBuffer(), photo.contentType);
      } catch {
        // Try again next sync. The strip shows a placeholder until then rather than
        // failing the whole reconciliation over one image.
      }
    }
  }

  private async pushPending(): Promise<number> {
    await this.uploadPendingPhotos();
    const pendingIds = await this.store.readPendingIds();
    if (pendingIds.length === 0) return 0;

    // One pending set covers both kinds, so a session that added a record and wished for
    // another sends a single request rather than racing two.
    const copies: Copy[] = [];
    const wishes: WishlistItem[] = [];
    const photos: Photo[] = [];
    for (const id of pendingIds) {
      const copy = await this.store.getCopyIncludingDeleted(id);
      if (copy !== undefined) {
        copies.push(copy);
        continue;
      }
      const wish = await this.store.getWishlistItemIncludingDeleted(id);
      if (wish !== undefined) {
        wishes.push(wish);
        continue;
      }
      const photo = await this.store.getPhotoIncludingDeleted(id);
      // A photo whose bytes never uploaded is not pushed: other devices would see a
      // record they can never fetch. It stays pending until the upload succeeds.
      if (photo !== undefined && (photo.storageKey !== null || photo.deletedAt !== null)) {
        photos.push(photo);
      }
    }
    if (copies.length === 0 && wishes.length === 0 && photos.length === 0) {
      await this.store.writePendingIds([]);
      return 0;
    }

    const response = await push({
      copies: copies.map(toDto),
      wishes: wishes.map(wishToDto),
      photos: photos.map(photoToDto),
    });
    // Adopt whatever the server decided, so the two sides are byte-identical afterwards
    // and the next push does not resend the same records.
    for (const dto of response.copies ?? []) {
      const merged = fromDto(dto);
      if (merged !== null) await this.store.adoptCopy(merged);
    }
    for (const dto of response.wishes ?? []) {
      const merged = wishFromDto(dto);
      if (merged !== null) await this.store.adoptWishlistItem(merged);
    }
    for (const dto of response.photos ?? []) {
      const merged = photoFromDto(dto);
      if (merged !== null) await this.store.adoptPhoto(merged);
    }
    if (response.cursor !== undefined && response.cursor > 0) {
      await this.store.writeSyncCursor(response.cursor);
    }
    await this.store.writePendingIds([]);
    return copies.length + wishes.length + photos.length;
  }

  /** Everything the device holds, of both kinds — they share one pending set. */
  private async allCopyIds(): Promise<string[]> {
    const copies = await this.store.listCopies();
    const wishes = await this.store.listWishlist();
    return [...copies.map((copy) => copy.id), ...wishes.map((wish) => wish.id)];
  }
}
