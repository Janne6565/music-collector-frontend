import { useAccountMenuLogic } from "@/features/auth/useAccountMenuLogic";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

/**
 * Since 19a this menu holds the only sign-out control and the only legal links a
 * signed-in screen has, and it opens on top of the navigation it came from. A menu that
 * only the button it came from could close would sit over the sidebar.
 */
describe("useAccountMenuLogic", () => {
  // jsdom has no PointerEvent constructor; only the type and the target matter here.
  function openMenu() {
    const block = document.createElement("div");
    document.body.append(block);
    const hook = renderHook(() => useAccountMenuLogic());
    act(() => {
      // The trigger lives inside the block, so the hook has to ignore pointerdowns there.
      (hook.result.current.root as { current: HTMLDivElement | null }).current = block;
      hook.result.current.toggle();
    });
    return { ...hook, block };
  }

  it("closes on a click anywhere outside the footer block", () => {
    const { result, block } = openMenu();
    expect(result.current.open).toBe(true);

    act(() => {
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(result.current.open).toBe(false);
    block.remove();
  });

  it("ignores a click on its own trigger, which does its own toggling", () => {
    const { result, block } = openMenu();

    act(() => {
      block.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(result.current.open).toBe(true);
    block.remove();
  });

  it("closes on Escape", () => {
    const { result, block } = openMenu();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(result.current.open).toBe(false);
    block.remove();
  });

  it("closes when a menu item navigates — the sidebar itself never unmounts", () => {
    const { result, block } = openMenu();

    act(() => result.current.close());
    expect(result.current.open).toBe(false);
    block.remove();
  });
});
