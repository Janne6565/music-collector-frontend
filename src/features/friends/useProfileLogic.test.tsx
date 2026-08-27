import type { UserDto } from "@/api/generated/rekordoAPI.schemas";
import { useProfileLogic } from "@/features/friends/useProfileLogic";
import authReducer, { signedIn, signedOut } from "@/store/authSlice";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";

const profile = vi.hoisted(() => vi.fn());
const collection = vi.hoisted(() => vi.fn());
const wishlist = vi.hoisted(() => vi.fn());

vi.mock("@/api/generated/profiles/profiles", () => ({ profile, collection, wishlist }));
vi.mock("@/api/generated/friends/friends", () => ({ request: vi.fn(), remove: vi.fn() }));

/** A fresh store per test, because the session state is what these tests are about. */
function freshStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

function wrap(store: ReturnType<typeof freshStore>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </Provider>
  );
}

/**
 * The profile endpoint is open to signed-out visitors, so an unauthenticated call is not
 * rejected — it is answered with a stranger's verdicts. Asking it before the refresh cookie
 * has been redeemed is how a friend opening `/friends/sem1006` directly was told the shelf
 * was locked, on a page that was correct whenever it was reached by navigation.
 */
describe("useProfileLogic", () => {
  beforeEach(() => {
    profile.mockReset();
    collection.mockReset();
    wishlist.mockReset();
  });

  it("asks nothing while the session is still being restored", async () => {
    profile.mockResolvedValue({ handle: "sem1006", canSeeCollection: false });

    const { result } = renderHook(() => useProfileLogic("sem1006"), {
      wrapper: wrap(freshStore()),
    });

    // "unknown" is the state of the very first paint, before the silent refresh returns.
    expect(profile).not.toHaveBeenCalled();
    // And the page must say nothing rather than say the wrong thing.
    expect(result.current.loading).toBe(true);
  });

  it("asks as the friend once the refresh has landed, not as a stranger", async () => {
    profile.mockResolvedValue({ handle: "sem1006", canSeeCollection: true });
    collection.mockResolvedValue({ copies: [{ id: "c-1" }], truncated: false });
    const store = freshStore();

    const { result } = renderHook(() => useProfileLogic("sem1006"), { wrapper: wrap(store) });
    act(() => {
      store.dispatch(signedIn({ user: { id: "u-1" } as UserDto, firstSyncPending: false }));
    });

    await waitFor(() => expect(result.current.person?.canSeeCollection).toBe(true));
    expect(profile).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.copies).toHaveLength(1));
  });

  it("asks anyway once the refresh says there is no session", async () => {
    profile.mockResolvedValue({ handle: "sem1006", canSeeCollection: false });
    const store = freshStore();

    const { result } = renderHook(() => useProfileLogic("sem1006"), { wrapper: wrap(store) });
    act(() => void store.dispatch(signedOut()));

    // A visitor with no account still gets the public page — the gate is on knowing, not
    // on being signed in.
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(profile).toHaveBeenCalledWith("sem1006");
    expect(result.current.signedIn).toBe(false);
  });
});
