import { remove, request } from "@/api/generated/friends/friends";
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
  const signedIn = useAppSelector((state) => state.auth.status === "signedIn");
  const queryClient = useQueryClient();
  const clean = handle.replace(/^@/, "");

  const person = useQuery({
    queryKey: ["profile", clean],
    queryFn: async () => await profile(clean),
    retry: false,
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

  const unfriend = useMutation({
    mutationFn: async (userId: string) => remove(userId),
    onSuccess: refresh,
  });

  return {
    signedIn,
    handle: clean,
    person: person.data,
    loading: person.isLoading,
    /** 404 rather than an error banner: nobody goes by this handle. */
    notFound: (person.error as AxiosError | null)?.response?.status === 404,
    copies: copies.data?.copies ?? [],
    copiesTruncated: copies.data?.truncated ?? false,
    wishes: wishes.data?.wishes ?? [],
    loadingLists: copies.isLoading || wishes.isLoading,
    ask,
    unfriend,
  };
}
