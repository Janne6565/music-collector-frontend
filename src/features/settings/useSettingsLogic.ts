import type { CurrencyCode } from "@/domain/currency";
import { useStore } from "@/local/StoreProvider";
import {
  type AppLanguage,
  clearRecentSearches,
  readAppLanguage,
  readDefaultCurrency,
  readDocumentLanguage,
  readLastSyncedAt,
  readRecentSearches,
  readSyncEnabled,
  writeAppLanguage,
  writeDefaultCurrency,
  writeDocumentLanguage,
  writeSyncEnabled,
} from "@/local/settings";
import { useAppSelector } from "@/store/hooks";
import type { LegalLanguage } from "@janne6565/music-collector-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Screen 20a — the three preferences the account menu has been pointing at since 19a,
 * plus the two device toggles that came over from Account (20f).
 *
 * Every value here is device-local and deliberately unsynced: a preference is a statement
 * about *this* browser, and syncing "sync is off on this laptop" would switch it off
 * everywhere — including, absurdly, disabling the sync that would carry the change back.
 * The page says so once, in the header, rather than warning per row.
 */

/**
 * What one row is currently doing.
 *
 * Per row rather than per page, because the rows save independently and a single "saving"
 * flag would light up the whole card when one picker moved. `saved` is transient: it is the
 * only acknowledgement there is, since 20a has no Save button and no toast.
 */
export type RowState = "idle" | "saved" | "failed";

/** How long "Saved" stays next to a control before fading (20b), and "N cleared" (20c). */
const ACKNOWLEDGEMENT_MS = 4_000;

export interface SettingsValues {
  readonly appLanguage: AppLanguage;
  readonly documentLanguage: LegalLanguage;
  readonly currency: CurrencyCode;
  readonly syncEnabled: boolean;
  readonly lastSyncedAt: number | null;
  readonly recentSearches: number;
}

export function useSettingsLogic() {
  const { store } = useStore();
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const signedIn = useAppSelector((state) => state.auth.status === "signedIn");
  const copies = useQuery({ queryKey: ["stats"], queryFn: () => store.stats() });

  const values = useQuery<SettingsValues>({
    queryKey: ["settings"],
    queryFn: async () => ({
      appLanguage: await readAppLanguage(store),
      documentLanguage: await readDocumentLanguage(store, i18n.language),
      currency: await readDefaultCurrency(store),
      syncEnabled: await readSyncEnabled(store),
      lastSyncedAt: await readLastSyncedAt(store),
      recentSearches: (await readRecentSearches(store)).length,
    }),
  });

  /**
   * Which rows are showing an acknowledgement, and which failed.
   *
   * Keyed by row so two pickers moved in quick succession each get their own answer. The
   * failure keeps the *name of the value that is actually in force* rather than the one
   * that was asked for — a control that kept showing the rejected choice would be lying
   * about what new copies will do (20b).
   */
  const [states, setStates] = useState<Readonly<Record<string, RowState>>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const acknowledge = useCallback((row: string, state: RowState) => {
    setStates((current) => ({ ...current, [row]: state }));
    const existing = timers.current.get(row);
    if (existing !== undefined) clearTimeout(existing);
    // A failure stays until the next attempt: it is not news that expires, it is the
    // current state of the setting.
    if (state !== "saved") return;
    timers.current.set(
      row,
      setTimeout(() => setStates((current) => ({ ...current, [row]: "idle" })), ACKNOWLEDGEMENT_MS),
    );
  }, []);

  // Nothing should fire into an unmounted page — the acknowledgement outlives most visits.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
    };
  }, []);

  /**
   * One save path for every row.
   *
   * Writes go to IndexedDB, which genuinely fails — a full disk, or a private window with
   * storage blocked. The query is refetched either way, so on failure the control snaps
   * back to whatever is actually stored rather than keeping the value that did not save.
   */
  const save = useMutation({
    mutationFn: async ({ row, write }: { row: string; write: () => Promise<void> }) => {
      await write();
      return row;
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      acknowledge(row, "saved");
    },
    onError: (_error, { row }) => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      acknowledge(row, "failed");
    },
  });

  const setAppLanguage = useCallback(
    (language: AppLanguage) => {
      save.mutate({
        row: "appLanguage",
        write: async () => {
          await writeAppLanguage(store, language);
          // Applied straight away rather than on the next reload: a language picker that
          // needs a refresh to take effect reads as one that did not work.
          await i18n.changeLanguage(language === "system" ? browserLanguage() : language);
        },
      });
    },
    [save.mutate, store, i18n],
  );

  const setDocumentLanguage = useCallback(
    (language: LegalLanguage) => {
      save.mutate({
        row: "documentLanguage",
        write: () => writeDocumentLanguage(store, language),
      });
    },
    [save.mutate, store],
  );

  const setCurrency = useCallback(
    (currency: CurrencyCode) => {
      save.mutate({ row: "currency", write: () => writeDefaultCurrency(store, currency) });
    },
    [save.mutate, store],
  );

  const setSyncEnabled = useCallback(
    (enabled: boolean) => {
      save.mutate({ row: "sync", write: () => writeSyncEnabled(store, enabled) });
    },
    [save.mutate, store],
  );

  /**
   * Clearing the searches, with the acknowledgement standing in for the button (20c).
   *
   * No confirmation: six remembered strings are not worth a dialog, and one here would
   * teach people to dismiss dialogs on this page. What replaces it is that the row does not
   * simply go quiet — it says how many went, then settles into the empty wording with no
   * control at all, so there is never a button that does nothing.
   */
  const [cleared, setCleared] = useState<number | null>(null);
  const clearSearches = useMutation({
    mutationFn: async () => {
      const going = (await readRecentSearches(store)).length;
      await clearRecentSearches(store);
      return going;
    },
    onSuccess: async (going) => {
      setCleared(going);
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await queryClient.invalidateQueries({ queryKey: ["recentSearches"] });
      acknowledge("searches", "saved");
      setTimeout(() => setCleared(null), ACKNOWLEDGEMENT_MS);
    },
    onError: () => acknowledge("searches", "failed"),
  });

  return {
    signedIn,
    /** Values are unknown for a moment; the rows keep their titles and shimmer only these. */
    loading: values.isLoading,
    values: values.data,
    /** For the sidebar, which draws the same shelf counts on every screen. */
    stats: copies.data,
    copyCount: copies.data?.copyCount ?? 0,
    state: (row: string): RowState => states[row] ?? "idle",
    /** What is actually in force, for a row that has to say so after a failed write. */
    inForce: values.data,
    setAppLanguage,
    setDocumentLanguage,
    setCurrency,
    setSyncEnabled,
    clearSearches: () => clearSearches.mutate(),
    clearing: clearSearches.isPending,
    /** How many were cleared, for the few seconds the row says so. */
    cleared,
    retry: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  };
}

/** What "Follow my browser" resolves to. The app ships two languages; everything else is German. */
export function browserLanguage(): "en" | "de" {
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "de";
}

/**
 * Roughly how much the offline copy is using, for the "Keep a local copy" row.
 *
 * `navigator.storage.estimate()` reports the whole origin rather than this database alone,
 * which is close enough for a line that exists to say "this is not nothing" — and it is
 * absent in some browsers and in private windows, where the row simply omits the size
 * rather than printing a zero.
 */
export function useStorageEstimate(): number | null {
  const [bytes, setBytes] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    void navigator.storage
      ?.estimate?.()
      .then((estimate) => {
        if (!cancelled && estimate.usage !== undefined) setBytes(estimate.usage);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return bytes;
}
