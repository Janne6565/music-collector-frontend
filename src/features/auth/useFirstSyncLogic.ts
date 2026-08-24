import { pull } from "@/api/generated/sync/sync";
import { useStore } from "@/local/StoreProvider";
import { firstSyncResolved } from "@/store/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { type FirstSyncStrategy, SyncEngine } from "@/sync/syncEngine";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

/**
 * The one-time choice when someone signs in on a device that already has a collection.
 *
 * Both counts are shown before anything happens, because "merge" and "keep" mean very
 * different things depending on how much is on each side, and the person is the only one
 * who knows which collection they actually care about.
 */
export function useFirstSyncLogic() {
  const { store, clock } = useStore();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const localCount = useQuery({
    queryKey: ["firstSync", "local"],
    queryFn: async () => (await store.listCopies()).length,
  });

  const accountCount = useQuery({
    queryKey: ["firstSync", "account"],
    // A peek, not a sync: nothing is written locally until a choice is made.
    queryFn: async () => (await pull({ since: 0 })).copies?.length ?? 0,
  });

  const choose = useMutation({
    mutationFn: async (strategy: FirstSyncStrategy) => {
      const engine = new SyncEngine(store, clock);
      return engine.firstSync(strategy);
    },
    onSuccess: async () => {
      dispatch(firstSyncResolved());
      await queryClient.invalidateQueries();
      void navigate({ to: "/" });
    },
  });

  return {
    localCount: localCount.data ?? 0,
    accountCount: accountCount.data ?? 0,
    loading: localCount.isLoading || accountCount.isLoading,
    choose: (strategy: FirstSyncStrategy) => choose.mutate(strategy),
    working: choose.isPending ? choose.variables : undefined,
    failed: choose.isError,
  };
}
