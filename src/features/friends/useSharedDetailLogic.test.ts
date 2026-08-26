import { useSharedDetailLogic } from "@/features/friends/useSharedDetailLogic";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const SHELF = ["a", "b", "c"];

/** What the browser sends while somebody is holding an arrow key on the open sheet. */
function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key }));
  });
}

/** One flick across the sheet, in CSS pixels from where the finger landed. */
function swipe(
  result: { current: ReturnType<typeof useSharedDetailLogic> },
  dx: number,
  dy: number,
) {
  const touch = (x: number, y: number) => ({ clientX: x, clientY: y }) as Touch;
  act(() => {
    result.current.swipe.onTouchStart({ touches: [touch(200, 400)] } as never);
    result.current.swipe.onTouchEnd({ changedTouches: [touch(200 + dx, 400 + dy)] } as never);
  });
}

describe("useSharedDetailLogic", () => {
  it("is closed when the address names no record", () => {
    const { result } = renderHook(() => useSharedDetailLogic(SHELF, undefined, vi.fn()));

    expect(result.current.open).toBe(false);
    expect(result.current.index).toBe(-1);
  });

  it("stays closed for a record that is not on this shelf", () => {
    // A link to a copy the owner has since taken down, or one hidden from this visitor:
    // the page behind it is still perfectly readable, so nothing is lifted and nothing
    // says anything went wrong.
    const { result } = renderHook(() => useSharedDetailLogic(SHELF, "gone", vi.fn()));

    expect(result.current.open).toBe(false);
  });

  it("flips to the neighbours", () => {
    const onOpen = vi.fn();
    const { result } = renderHook(() => useSharedDetailLogic(SHELF, "b", onOpen));

    act(() => result.current.next());
    expect(onOpen).toHaveBeenCalledWith("c");

    act(() => result.current.prev());
    expect(onOpen).toHaveBeenCalledWith("a");
  });

  it("stops at both ends instead of wrapping", () => {
    const onOpen = vi.fn();
    const first = renderHook(() => useSharedDetailLogic(SHELF, "a", onOpen));
    expect(first.result.current.hasPrev).toBe(false);
    act(() => first.result.current.prev());

    const last = renderHook(() => useSharedDetailLogic(SHELF, "c", onOpen));
    expect(last.result.current.hasNext).toBe(false);
    act(() => last.result.current.next());

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("flips with the arrow keys while it is open", () => {
    const onOpen = vi.fn();
    renderHook(() => useSharedDetailLogic(SHELF, "b", onOpen));

    press("ArrowRight");
    expect(onOpen).toHaveBeenCalledWith("c");
    press("ArrowLeft");
    expect(onOpen).toHaveBeenCalledWith("a");
  });

  it("leaves the arrow keys alone once it is closed", () => {
    // Otherwise the shelf behind the dismissed sheet would keep answering keys nobody is
    // aiming at it any more.
    const onOpen = vi.fn();
    renderHook(() => useSharedDetailLogic(SHELF, undefined, onOpen));

    press("ArrowRight");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("closes by clearing the address", () => {
    const onOpen = vi.fn();
    const { result } = renderHook(() => useSharedDetailLogic(SHELF, "b", onOpen));

    act(() => result.current.close());

    expect(onOpen).toHaveBeenCalledWith(undefined);
  });

  it("flips on a sideways swipe and closes on a downward one", () => {
    const onOpen = vi.fn();
    const { result } = renderHook(() => useSharedDetailLogic(SHELF, "b", onOpen));

    swipe(result, -80, 4);
    expect(onOpen).toHaveBeenLastCalledWith("c");

    swipe(result, 80, -6);
    expect(onOpen).toHaveBeenLastCalledWith("a");

    swipe(result, 10, 90);
    expect(onOpen).toHaveBeenLastCalledWith(undefined);
  });

  it("ignores a gesture too short to have meant anything", () => {
    // A finger that moved 12px was reading, not flipping — and a sheet that jumps to the
    // next record when somebody starts to scroll it is unusable.
    const onOpen = vi.fn();
    const { result } = renderHook(() => useSharedDetailLogic(SHELF, "b", onOpen));

    swipe(result, -12, 8);

    expect(onOpen).not.toHaveBeenCalled();
  });
});
