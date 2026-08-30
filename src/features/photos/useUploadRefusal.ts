import { useStore } from "@/local/StoreProvider";
import { type UploadRefusal, readUploadRefusal } from "@/local/uploadRefusal";
import { useQuery } from "@tanstack/react-query";

/**
 * The last refusal the sync engine recorded, or null when uploads are going through.
 *
 * A query rather than a one-off read because a sync ends by invalidating everything: this
 * appears the moment a pass records a refusal, and leaves by itself the moment one uploads
 * something, which is exactly what 28e promises about the chip.
 */
export function useUploadRefusal(): UploadRefusal | null {
  const { store } = useStore();
  const query = useQuery({
    queryKey: ["uploadRefusal"],
    queryFn: async () => await readUploadRefusal(store),
  });
  return query.data ?? null;
}
