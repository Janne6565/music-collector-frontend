import type { SharedWishDto } from "@/api/generated/musicCollectorAPI.schemas";
import { useSharedWishCovers } from "@/features/friends/useSharedWishCovers";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupAlbumCovers = vi.hoisted(() => vi.fn());
const lookupPressingCovers = vi.hoisted(() => vi.fn());

vi.mock("@/api/releases", async (original) => ({
  ...(await original<typeof import("@/api/releases")>()),
  lookupAlbumCovers,
  lookupPressingCovers,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

/**
 * Somebody else's wishlist, drawn for a signed-out visitor.
 *
 * The rows come off the wire, and the generated DTO types every field optional while the
 * server sends an explicit null — so what arrives here is the one shape the types say is
 * impossible.
 */
describe("useSharedWishCovers", () => {
  beforeEach(() => {
    lookupAlbumCovers.mockReset();
    lookupPressingCovers.mockReset();
  });

  it("survives a wish that names no pressing", async () => {
    // Exactly what /api/v1/profiles/janne/wishlist returns: four entries carrying a
    // pressing and four carrying null. The null ones used to reach startsWith and take
    // the whole public page down with a TypeError.
    const wishes = [
      { id: "1", albumId: "discogs:4613", releaseId: "discogs:19920967", title: "A" },
      { id: "2", albumId: "discogs:3545980", releaseId: null, title: "B" },
      { id: "3", albumId: "discogs:534303", releaseId: null, title: "C" },
    ] as unknown as SharedWishDto[];
    lookupAlbumCovers.mockResolvedValue(new Map([["discogs:4613", "https://covers/a.jpg"]]));
    lookupPressingCovers.mockResolvedValue(new Map());

    const { result } = renderHook(() => useSharedWishCovers(wishes), { wrapper });

    await waitFor(() => expect(result.current.size).toBeGreaterThan(0));
    expect(result.current.get("discogs:4613")).toBe("https://covers/a.jpg");
    // Only the pressing that exists is ever asked about.
    expect(lookupPressingCovers).toHaveBeenCalledWith(["discogs:19920967"]);
  });

  it("asks about no pressings at all when none of the wishes name one", async () => {
    const wishes = [
      { id: "1", albumId: "discogs:534303", releaseId: null, title: "C" },
    ] as unknown as SharedWishDto[];
    lookupAlbumCovers.mockResolvedValue(new Map([["discogs:534303", null]]));
    lookupPressingCovers.mockResolvedValue(new Map());

    const { result } = renderHook(() => useSharedWishCovers(wishes), { wrapper });

    await waitFor(() => expect(result.current.has("discogs:534303")).toBe(true));
    expect(lookupPressingCovers).not.toHaveBeenCalled();
    expect(result.current.get("discogs:534303")).toBeNull();
  });
});
