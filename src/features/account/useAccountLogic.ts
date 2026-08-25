import { setAccessToken } from "@/api/axios-instance";
import { deleteAccount, logout } from "@/api/generated/auth/auth";
import { toCsv } from "@/domain/csv";
import { useStore } from "@/local/StoreProvider";
import { readLastSyncedAt, readSyncEnabled, writeSyncEnabled } from "@/local/settings";
import { signedOut } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

/**
 * The account screen (7a on web, 8b on mobile).
 *
 * Everything destructive here is scoped as narrowly as the wording promises: signing out
 * and deleting the account both leave the local collection alone. The collection belongs
 * to the device, and an account is only ever a way to copy it to other devices.
 */
export function useAccountLogic() {
  const { store } = useStore();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useAppSelector((state) => state.auth);

  const stats = useQuery({ queryKey: ["stats"], queryFn: () => store.stats() });

  const syncState = useQuery({
    queryKey: ["syncState"],
    queryFn: async () => ({
      enabled: await readSyncEnabled(store),
      lastSyncedAt: await readLastSyncedAt(store),
    }),
  });

  const setSyncEnabled = useMutation({
    mutationFn: async (enabled: boolean) => writeSyncEnabled(store, enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["syncState"] });
    },
  });

  /**
   * Builds the file in the browser from the local store — no request, so it works offline
   * and works identically with no account at all.
   */
  const exportCsv = useMutation({
    mutationFn: async () => {
      const copies = await store.listCopies();
      const releases = await store.getReleases(copies.map((copy) => copy.releaseId));
      const blob = new Blob([toCsv(copies, releases)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `music-collector-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      // Revoked on the next tick: revoking synchronously can beat the download starting
      // in some browsers, and the file arrives empty.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      return copies.length;
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      await logout().catch(() => undefined);
      setAccessToken(null);
    },
    onSuccess: async () => {
      dispatch(signedOut());
      await queryClient.invalidateQueries();
      void navigate({ to: "/" });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      await deleteAccount();
      setAccessToken(null);
    },
    onSuccess: async () => {
      dispatch(signedOut());
      // The local collection is deliberately untouched, but the sync cursor is not: it
      // points into a change log that no longer exists, and leaving it would make a later
      // sign-in believe it had already pulled everything.
      await store.writeSyncCursor(0);
      await queryClient.invalidateQueries();
      void navigate({ to: "/" });
    },
  });

  return {
    status: auth.status,
    name: auth.user?.displayName ?? auth.user?.email ?? null,
    email: auth.user?.email ?? null,
    memberSince: auth.user?.createdAt ?? null,
    stats: stats.data,
    syncEnabled: syncState.data?.enabled ?? true,
    lastSyncedAt: syncState.data?.lastSyncedAt ?? null,
    setSyncEnabled: useCallback(
      (enabled: boolean) => setSyncEnabled.mutate(enabled),
      [setSyncEnabled.mutate],
    ),
    exportCsv: () => exportCsv.mutate(),
    exporting: exportCsv.isPending,
    signOut: () => signOut.mutate(),
    signingOut: signOut.isPending,
    deleteAccount: () => remove.mutate(),
    deleting: remove.isPending,
    deleteFailed: remove.isError,
  };
}
