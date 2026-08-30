import { storage } from "@/api/generated/account/account";
import { type StorageReading, readStorage } from "@/features/account/storageReading";
import { useAppSelector } from "@/store/hooks";
import { useQuery } from "@tanstack/react-query";

/**
 * The one number on this page that is not this browser's to know (design 28c).
 *
 * Everything else on Account is read from the local store, because the collection lives
 * here. The allowance does not: it is the server's count of what it is holding, and it is
 * the number uploads are refused by, so re-deriving it from local rows would produce a
 * meter that disagrees with the refusal.
 *
 * That is also why a failure is a reading rather than an error. The app works offline by
 * design, and the honest thing for a figure that cannot be fetched is to say so and keep
 * the row where it was, not to hide it or draw a stale bar as if it were live.
 */
export function useStorageMeter(): StorageReading {
  const signedIn = useAppSelector((state) => state.auth.status === "signedIn");

  const query = useQuery({
    queryKey: ["accountStorage"],
    queryFn: async () => await storage(),
    enabled: signedIn,
    // A photo added on this device changes the answer, and nothing here is told about it.
    // Cheap enough to ask again whenever the page is looked at.
    staleTime: 30_000,
  });

  if (query.isPending) return { kind: "loading" };
  if (query.data === undefined) return { kind: "offline" };
  return readStorage(query.data);
}
