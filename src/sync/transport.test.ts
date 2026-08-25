import { createSyncTransport } from "@/sync/transport";
import type { LocalStore } from "@janne6565/music-collector-shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pull = vi.fn();
const push = vi.fn();
vi.mock("@/api/generated/sync/sync", () => ({
  pull: (...args: unknown[]) => pull(...args),
  push: (...args: unknown[]) => push(...args),
}));

/**
 * The transport is where a server record stops being optional-everything and becomes a
 * domain record — so this is the only place that can drop a malformed one. The engine
 * behind it takes what it is given, and its own behaviour is tested in the shared package.
 */
describe("the web sync transport", () => {
  const store = {} as LocalStore;

  beforeEach(() => {
    pull.mockReset();
    push.mockReset();
  });

  it("drops a record missing the fields the store cannot do without", async () => {
    pull.mockResolvedValue({ copies: [{ id: "broken" }], cursor: 3, hasMore: false });

    const page = await createSyncTransport(store).pull(0);

    expect(page.copies).toEqual([]);
    expect(page.cursor).toBe(3);
  });

  it("keeps a complete record, filling the optional fields with nulls", async () => {
    pull.mockResolvedValue({
      copies: [
        {
          id: "copy-1",
          releaseId: "rel-1",
          currency: "EUR",
          createdAt: 1000,
          fieldClocks: {},
        },
      ],
      cursor: 4,
      hasMore: false,
    });

    const page = await createSyncTransport(store).pull(0);

    expect(page.copies).toHaveLength(1);
    expect(page.copies[0]?.rating).toBeNull();
    expect(page.copies[0]?.deletedAt).toBeNull();
  });

  it("keeps the cursor it was given when the server sends none", async () => {
    pull.mockResolvedValue({ copies: [], hasMore: false });

    expect((await createSyncTransport(store).pull(7)).cursor).toBe(7);
  });
});
