import { searchReleases } from "@/api/releases";
import type { LocalStore } from "@/local/LocalStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/releases", async (original) => ({
  ...(await original<typeof import("@/api/releases")>()),
  searchReleases: vi.fn(async () => []),
  lookupByBarcode: vi.fn(async () => []),
}));

const settings = new Map<string, string>();

const store = {
  listCopies: async () => [],
  readSetting: async (key: string) => settings.get(key),
  writeSetting: async (key: string, value: string) => {
    settings.set(key, value);
  },
} as unknown as LocalStore;

vi.mock("@/local/StoreProvider", () => ({
  useStore: () => ({ store, clock: { next: () => "" } }),
}));

// Imported after the mocks above are registered, so the hook picks them up.
const { useAddDialogLogic } = await import("@/features/add/useAddDialogLogic");

function harness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderHook(() => useAddDialogLogic(vi.fn()), {
    wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
  });
}

/**
 * Lets the debounce fire and the query that follows it settle.
 *
 * Twice: the first pass fires the timer, and the request it schedules only goes out on
 * the re-render that `act` flushes on its way out.
 */
async function settle() {
  for (let pass = 0; pass < 2; pass += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
  }
}

/** Types a term the way a person does, one keystroke at a time. */
async function type(result: { current: ReturnType<typeof useAddDialogLogic> }, term: string) {
  for (let index = 1; index <= term.length; index += 1) {
    const soFar = term.slice(0, index);
    await act(async () => {
      result.current.setTerm(soFar);
      await vi.advanceTimersByTimeAsync(40);
    });
  }
}

describe("useAddDialogLogic", () => {
  beforeEach(() => {
    settings.clear();
    vi.mocked(searchReleases).mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("searches without being asked, once the field stands still", async () => {
    const { result } = harness();

    await type(result, "brian eno");
    expect(searchReleases).not.toHaveBeenCalled();

    await settle();

    // Nine keystrokes, one request — the whole point of the debounce.
    expect(searchReleases).toHaveBeenCalledTimes(1);
    expect(searchReleases).toHaveBeenCalledWith("brian eno");
  });

  it("shows the wait from the keystroke, not from the request", async () => {
    // The skeletons stand in for the whole wait. If `searching` only turned on when the
    // request went out, the debounce would read as a list that had stopped responding.
    const { result } = harness();

    await type(result, "eno");

    expect(result.current.searching).toBe(true);
    expect(result.current.hasSearched).toBe(true);
  });

  it("does not send a term too short to mean anything", async () => {
    const { result } = harness();

    await type(result, "e");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(searchReleases).not.toHaveBeenCalled();
    expect(result.current.searching).toBe(false);
  });

  it("only sends a barcode once it is complete", async () => {
    const { result } = harness();
    await act(async () => result.current.setTab("BARCODE"));

    await type(result, "5099");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(searchReleases).not.toHaveBeenCalled();
  });

  it("runs straight away on Enter", async () => {
    const { result } = harness();

    await act(async () => result.current.setTerm("brian eno"));
    await act(async () => result.current.submit());

    expect(searchReleases).toHaveBeenCalledTimes(1);
  });

  it("drops the results when the field is emptied", async () => {
    const { result } = harness();

    await type(result, "brian eno");
    await settle();
    expect(result.current.searching).toBe(false);

    await act(async () => result.current.setTerm(""));

    // Back to the recent searches, rather than the last results left stranded under a box
    // that no longer says what produced them.
    expect(result.current.hasSearched).toBe(false);
  });

  it("remembers a search somebody pressed for, not every prefix on the way", async () => {
    const { result } = harness();

    await type(result, "brian eno");
    await settle();

    expect(settings.get("recentSearches")).toBeUndefined();

    await act(async () => result.current.submit());
    await settle();
    expect(settings.get("recentSearches")).toBe('["brian eno"]');
  });
});
