import { useCallback, useEffect, useState } from "react";

/**
 * Carrying a row by its handle (screen 16g).
 *
 * A press on a handle and a row in the air are two different states, and this hook exists
 * because they were once one. `armed` is the handle being held: the row has to be
 * `draggable` *before* the browser's own dragstart fires, and dragstart never waits for a
 * click to finish, so arming happens on mouse-down. `lifted` is a drag that actually
 * began. Only the second one dims a row — with a single state, pressing a handle and
 * letting go without moving left the row faded as though it were still being carried,
 * because nothing had happened that could put it back down.
 */
export function useRowDrag(reorder: (from: number, to: number) => void) {
  const [armed, setArmed] = useState<number | null>(null);
  const [lifted, setLifted] = useState<number | null>(null);

  const putDown = useCallback(() => {
    setArmed(null);
    setLifted(null);
  }, []);

  /**
   * A press that never became a drag ends on the next pointer release, wherever it happens
   * — the handle, the row, or off the window entirely. A press that *did* become a drag is
   * put down by `dragend` instead, which fires even when the drop lands nowhere.
   */
  useEffect(() => {
    if (armed === null) return;
    const disarm = () => setArmed(null);
    window.addEventListener("pointerup", disarm);
    window.addEventListener("pointercancel", disarm);
    return () => {
      window.removeEventListener("pointerup", disarm);
      window.removeEventListener("pointercancel", disarm);
    };
  }, [armed]);

  return {
    /** Armed *or* already in the air: a drag must not lose its grip mid-flight. */
    isDraggable: (index: number) => armed === index || lifted === index,
    isLifted: (index: number) => lifted === index,
    arm: (index: number) => setArmed(index),
    lift: (index: number) => setLifted(index),
    putDown,
    dropOn: (index: number) => {
      if (lifted !== null && lifted !== index) reorder(lifted, index);
      putDown();
    },
  };
}
