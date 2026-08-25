import { pull } from "@/api/generated/sync/sync";
import { toCsv } from "@/domain/csv";
import { useStore } from "@/local/StoreProvider";
import { firstSyncResolved } from "@/store/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { createSyncEngine, fromDto } from "@/sync/transport";
import type { FirstSyncStrategy } from "@janne6565/music-collector-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

/**
 * The one-time choice when someone signs in on a device that already has a collection
 * (screen 8a).
 *
 * The counts come first and the outcome is spelled out before anything happens, because
 * "merge" and "keep" mean very different things depending on how much is on each side —
 * and the person is the only one who knows which collection they actually care about.
 */
export function useFirstSyncLogic() {
  const { store, clock } = useStore();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<FirstSyncStrategy>("MERGE");

  const preview = useQuery({
    queryKey: ["firstSync", "preview"],
    queryFn: async () => {
      const local = await store.listCopies();
      // A peek, not a sync: nothing is written locally until a choice is made.
      const account = (await pull({ since: 0 })).copies ?? [];
      const accountIds = new Set(
        account
          .map((dto) => fromDto(dto))
          .filter((copy) => copy !== null && copy.deletedAt === null)
          .map((copy) => (copy as { id: string }).id),
      );
      // "Already there" is by copy id, which is the only thing the merge keys on. Two
      // separate copies of the same pressing are two records on purpose, so counting them
      // as duplicates would promise a deduplication that will not happen.
      const alreadyThere = local.filter((copy) => accountIds.has(copy.id)).length;
      return {
        localCount: local.length,
        accountCount: accountIds.size,
        willAdd: local.length - alreadyThere,
        alreadyThere,
      };
    },
  });

  /**
   * The escape hatch beside the choice: whichever way it goes, the local collection can
   * be on disk as a file first.
   */
  const exportCsv = useMutation({
    mutationFn: async () => {
      const copies = await store.listCopies();
      const releases = await store.getReleases(copies.map((copy) => copy.releaseId));
      const blob = new Blob([toCsv(copies, releases)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `music-collector-local-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
  });

  const confirm = useMutation({
    mutationFn: async () => createSyncEngine(store, clock).firstSync(choice),
    onSuccess: async () => {
      dispatch(firstSyncResolved());
      await queryClient.invalidateQueries();
      void navigate({ to: "/" });
    },
  });

  return {
    localCount: preview.data?.localCount ?? 0,
    accountCount: preview.data?.accountCount ?? 0,
    willAdd: preview.data?.willAdd ?? 0,
    alreadyThere: preview.data?.alreadyThere ?? 0,
    loading: preview.isLoading,
    choice,
    setChoice,
    exportCsv: () => exportCsv.mutate(),
    exporting: exportCsv.isPending,
    confirm: () => confirm.mutate(),
    working: confirm.isPending,
    failed: confirm.isError,
    /**
     * "Decide later" — the app is usable while the choice is outstanding, it just does not
     * sync. The sidebar footer says so, so this is not a state anyone gets lost in.
     */
    decideLater: () => void navigate({ to: "/" }),
  };
}
