import { setAccessToken } from "@/api/axios-instance";
import { logout } from "@/api/generated/auth/auth";
import { signedOut } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/** Just enough for the sidebar's account block: who is signed in, and how to leave. */
export function useSidebarAccountLogic() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const auth = useAppSelector((state) => state.auth);

  const signOut = useMutation({
    mutationFn: async () => {
      // Best effort: the local session is cleared either way, so a failed call cannot
      // strand somebody half signed out.
      await logout().catch(() => undefined);
      setAccessToken(null);
    },
    onSuccess: async () => {
      dispatch(signedOut());
      // The local collection deliberately stays. Signing out returns the app to how it
      // behaves without an account; wiping someone's records would be a way to lose data.
      await queryClient.invalidateQueries();
    },
  });

  return {
    status: auth.status,
    email: auth.user?.email ?? null,
    /** Falls back to the e-mail: an account made before there was a name field has none,
     * and inventing one from the address would put a guess in front of the person. */
    name: auth.user?.displayName ?? auth.user?.email ?? null,
    /** Their picture, or null for almost everybody — 27i draws this chip at 28. */
    avatarUrl: auth.user?.avatarUrl ?? null,
    /**
     * Signed in, but the merge choice has not been made — which means sync is paused. A
     * reload lands on the library rather than the prompt, so without saying so here the
     * state would be entirely invisible.
     */
    firstSyncPending: auth.firstSyncPending,
    signOut: () => signOut.mutate(),
    signingOut: signOut.isPending,
  };
}
