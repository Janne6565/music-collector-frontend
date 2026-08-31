import { accept, decline, remove, request } from "@/api/generated/friends/friends";
import { collection, profile, wishlist } from "@/api/generated/profiles/profiles";
import { useAppSelector } from "@/store/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useCallback } from "react";

/**
 * Somebody else's shelf — 15h on the web, and the same hook behind the public page 15i.
 *
 * The profile resolves whether or not any list behind it is readable: 15d is a screen the
 * design deliberately draws, with a name on it, a total and a way to ask. So the lists are
 * fetched only once the profile has said they are visible, rather than fetched hopefully
 * and rescued from a 403.
 */
export function useProfileLogic(handle: string) {
  const status = useAppSelector((state) => state.auth.status);
  const signedIn = status === "signedIn";
  const queryClient = useQueryClient();
  const clean = handle.replace(/^@/, "");

  /*
   * The session is restored from the refresh cookie after the first paint, so on a direct
   * load of this URL the access token is still null for a moment. This endpoint is open to
   * signed-out visitors, so an early call is not rejected — it is answered, with the
   * verdicts a stranger gets, and a friend is told the shelf is locked. Nothing corrects it
   * afterwards either: no 401 means no silent refresh, and the key does not name the viewer.
   * So the question waits until we know who is asking.
   */
  const knownViewer = status !== "unknown";

  const person = useQuery({
    queryKey: ["profile", clean],
    queryFn: async () => await profile(clean),
    retry: false,
    enabled: knownViewer,
  });

  const copies = useQuery({
    queryKey: ["profile", clean, "collection"],
    queryFn: async () => await collection(clean),
    enabled: person.data?.canSeeCollection === true,
  });

  const wishes = useQuery({
    queryKey: ["profile", clean, "wishlist"],
    queryFn: async () => await wishlist(clean),
    enabled: person.data?.canSeeWishlist === true,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["profile", clean] });
    await queryClient.invalidateQueries({ queryKey: ["friends"] });
  }, [queryClient, clean]);

  const ask = useMutation({
    mutationFn: async () => request({ handle: clean }),
    onSuccess: refresh,
  });

  /*
   * Answering from the shelf you are already looking at.
   *
   * Both name the request rather than the person, which is why the profile carries
   * `pendingRequestId` at all — a handle is what got you here, and it is not what the
   * endpoints take.
   */
  const acceptRequest = useMutation({
    mutationFn: async (id: string) => accept(id),
    onSuccess: refresh,
  });

  const declineRequest = useMutation({
    mutationFn: async (id: string) => decline(id),
    onSuccess: refresh,
  });

  const unfriend = useMutation({
    mutationFn: async (userId: string) => remove(userId),
    onSuccess: refresh,
  });

  return {
    signedIn,
    handle: clean,
    person: person.data,
    loading: !knownViewer || person.isLoading,
    /** 404 rather than an error banner: nobody goes by this handle. */
    notFound: (person.error as AxiosError | null)?.response?.status === 404,
    copies: copies.data?.copies ?? [],
    copiesTruncated: copies.data?.truncated ?? false,
    wishes: wishes.data?.wishes ?? [],
    loadingLists: copies.isLoading || wishes.isLoading,
    ask,
    acceptRequest,
    declineRequest,
    unfriend,
  };
}
