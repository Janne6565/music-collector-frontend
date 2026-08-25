import { useDebouncedSearch } from "@/lib/useDebouncedSearch";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useDebouncedSearch", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not filter until the typing stops", () => {
    const { result, rerender } = renderHook(({ term }) => useDebouncedSearch(term, 200), {
      initialProps: { term: "" },
    });

    rerender({ term: "m" });
    rerender({ term: "mi" });
    rerender({ term: "mil" });
    // Still nothing: each keystroke replaced the last one's timer.
    act(() => void vi.advanceTimersByTime(199));
    expect(result.current).toBe("");

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe("mil");
  });

  it("settles on the last thing typed, not the first", () => {
    const { result, rerender } = renderHook(({ term }) => useDebouncedSearch(term, 200), {
      initialProps: { term: "" },
    });

    rerender({ term: "miles" });
    act(() => void vi.advanceTimersByTime(150));
    rerender({ term: "milt" });
    act(() => void vi.advanceTimersByTime(200));

    expect(result.current).toBe("milt");
  });

  it("puts the whole shelf back the moment the box is cleared", () => {
    const { result, rerender } = renderHook(({ term }) => useDebouncedSearch(term, 200), {
      initialProps: { term: "" },
    });

    rerender({ term: "miles" });
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current).toBe("miles");

    // No wait on the way out: waiting to stop filtering reads as lag, not restraint.
    rerender({ term: "" });
    expect(result.current).toBe("");
  });

  it("starts from whatever it was given, without a delay", () => {
    const { result } = renderHook(() => useDebouncedSearch("bitches brew", 200));
    expect(result.current).toBe("bitches brew");
  });
});
