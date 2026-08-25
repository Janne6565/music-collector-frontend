import { useRowDrag } from "@/features/wishlist/useRowDrag";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/** What the browser does when a press is released without a drag ever starting. */
function releasePointer() {
  act(() => {
    window.dispatchEvent(new Event("pointerup"));
  });
}

describe("useRowDrag", () => {
  it("does not lift a row that was only pressed", () => {
    const { result } = renderHook(() => useRowDrag(vi.fn()));

    act(() => result.current.arm(0));

    // Draggable, so the browser *can* start a drag — but not in the air yet, which is what
    // the row draws as faded.
    expect(result.current.isDraggable(0)).toBe(true);
    expect(result.current.isLifted(0)).toBe(false);
  });

  it("lets go of a press that never became a drag", () => {
    const { result } = renderHook(() => useRowDrag(vi.fn()));

    act(() => result.current.arm(0));
    releasePointer();

    expect(result.current.isDraggable(0)).toBe(false);
    expect(result.current.isLifted(0)).toBe(false);
  });

  it("keeps its grip on a row already in the air", () => {
    const { result } = renderHook(() => useRowDrag(vi.fn()));

    act(() => result.current.arm(1));
    act(() => result.current.lift(1));
    // Chrome cancels the pointer stream the moment a native drag takes over; the row must
    // stay draggable through it.
    releasePointer();

    expect(result.current.isDraggable(1)).toBe(true);
    expect(result.current.isLifted(1)).toBe(true);
  });

  it("puts the row down when the drag ends nowhere", () => {
    const { result } = renderHook(() => useRowDrag(vi.fn()));

    act(() => result.current.arm(2));
    act(() => result.current.lift(2));
    act(() => result.current.putDown());

    expect(result.current.isLifted(2)).toBe(false);
    expect(result.current.isDraggable(2)).toBe(false);
  });

  it("reorders on a drop and puts the row down", () => {
    const reorder = vi.fn();
    const { result } = renderHook(() => useRowDrag(reorder));

    act(() => result.current.arm(3));
    act(() => result.current.lift(3));
    act(() => result.current.dropOn(0));

    expect(reorder).toHaveBeenCalledWith(3, 0);
    expect(result.current.isLifted(3)).toBe(false);
  });

  it("ignores a row dropped on itself", () => {
    const reorder = vi.fn();
    const { result } = renderHook(() => useRowDrag(reorder));

    act(() => result.current.arm(3));
    act(() => result.current.lift(3));
    act(() => result.current.dropOn(3));

    expect(reorder).not.toHaveBeenCalled();
  });

  it("reorders nothing when a drop arrives without a lift", () => {
    const reorder = vi.fn();
    const { result } = renderHook(() => useRowDrag(reorder));

    act(() => result.current.dropOn(1));

    expect(reorder).not.toHaveBeenCalled();
  });
});
