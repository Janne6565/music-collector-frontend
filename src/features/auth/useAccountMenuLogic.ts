import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Open/closed state for the sidebar's account menu, screen 19a.
 *
 * It has to close the way a disclosure does — a click anywhere else, or Escape. The menu
 * covers the navigation it opens over, and it now holds the only sign-out control and the
 * only legal links a signed-in screen has, so one that could be dismissed solely by the
 * button it came from would be a panel in the way.
 */
export function useAccountMenuLogic() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      // The trigger lives inside the block, so this deliberately ignores it: closing here
      // as well would race the button's own toggle and reopen on the next click.
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return {
    open,
    /** Goes on the whole footer block, not just the panel — see `onPointerDown` above. */
    root,
    toggle: useCallback(() => setOpen((value) => !value), []),
    close: useCallback(() => setOpen(false), []),
  };
}
