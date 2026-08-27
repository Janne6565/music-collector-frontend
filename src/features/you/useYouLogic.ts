import { useSidebarAccountLogic } from "@/features/auth/useSidebarAccountLogic";
import { useSharingLogic } from "@/features/friends/useSharingLogic";
import { useCollectionStats } from "@/features/library/useLibraryLogic";
import { useStore } from "@/local/StoreProvider";
import { readLastSyncedAt } from "@/local/settings";
import { useQuery } from "@tanstack/react-query";

/**
 * Everything the phone's fourth tab needs — screen 24a.
 *
 * It is deliberately a composition of hooks that already exist rather than a new set of
 * queries: the page is the sidebar's footer menu and its format counts, moved. A second
 * source for either would be a second answer to "how many records do I have".
 */
export function useYouLogic() {
  const account = useSidebarAccountLogic();
  const stats = useCollectionStats();
  const { store } = useStore();

  const signedIn = account.status === "signedIn";

  // Only when there is an account: the handle is a server-side claim, and asking for it
  // as a guest is a 401 on every visit to the tab.
  const sharing = useSharingLogic();

  const lastSyncedAt = useQuery({
    queryKey: ["settings", "lastSyncedAt"],
    queryFn: () => readLastSyncedAt(store),
    enabled: signedIn,
  }).data;

  return {
    status: account.status,
    signedIn,
    /**
     * The claimed handle, or the name, or the address — in that order.
     *
     * The handle is what the line is *for*: it is the address other people reach this
     * shelf at. Somebody who has not claimed one still needs the row to say whose account
     * this is, so it falls back rather than going blank.
     */
    handle: sharing.settings?.handle ?? null,
    name: account.name,
    email: account.email,
    stats,
    lastSyncedAt: lastSyncedAt ?? null,
    signOut: account.signOut,
    signingOut: account.signingOut,
  };
}
