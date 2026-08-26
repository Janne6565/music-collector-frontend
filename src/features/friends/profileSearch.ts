/**
 * The record a shelf has lifted, as an address (23a).
 *
 * `?copy=` on the collection half and `?wish=` on the wishlist half rather than one
 * neutral name: these links get pasted into messages, and the parameter is the only part
 * of the URL that says what is being pointed at.
 */
export interface CopySearch {
  readonly copy?: string;
}

export interface WishSearch {
  readonly wish?: string;
}

export function validateCopySearch(search: Record<string, unknown>): CopySearch {
  return { copy: typeof search.copy === "string" ? search.copy : undefined };
}

export function validateWishSearch(search: Record<string, unknown>): WishSearch {
  return { wish: typeof search.wish === "string" ? search.wish : undefined };
}

/**
 * Whether opening the next record replaces the current history entry.
 *
 * Opening one is a destination, so it pushes and Back closes the sheet. Flipping to the
 * neighbour and closing again are not: without this, leaving a shelf someone flipped
 * through twenty times would mean twenty presses of Back, and closing would push an entry
 * whose only effect is to reopen what was just dismissed.
 */
export function replacesHistory(open: string | undefined): boolean {
  return open !== undefined;
}
