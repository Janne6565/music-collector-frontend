import { hlcDecode, hlcEncode, hlcInitial, hlcTick } from "@/domain/hlc";
import type { LocalStore } from "@/local/LocalStore";
import type { ClockSource } from "@/local/copyWrites";
import { DexieLocalStore } from "@/local/dexieStore";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";

interface StoreContextValue {
  readonly store: LocalStore;
  readonly clock: ClockSource;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/**
 * Opens the local store and restores the device clock before rendering anything.
 *
 * The clock is loaded from disk rather than started fresh: an HLC that resets on every
 * page load would hand out stamps behind ones it has already issued, and those edits would
 * silently lose every future merge.
 */
export function StoreProvider({ children }: { readonly children: ReactNode }) {
  const [value, setValue] = useState<StoreContextValue | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const store = new DexieLocalStore();
      await store.open();
      const node = await store.deviceId();
      const persisted = await store.readClock();
      let current = persisted === undefined ? hlcInitial(node) : hlcDecode(persisted);

      const clock: ClockSource = {
        next() {
          current = hlcTick(current, Date.now());
          // Persisted optimistically: losing the very last stamp to an abrupt close is
          // harmless, because wall time will have moved on by the next start.
          void store.writeClock(hlcEncode(current));
          return current;
        },
      };

      if (!cancelled) setValue({ store, clock });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (value === null) {
    return null;
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const value = useContext(StoreContext);
  if (value === null) {
    throw new Error("useStore must be used inside a StoreProvider");
  }
  return value;
}
