import { lookupByBarcode, searchReleases } from "@/api/releases";
import type { Release } from "@/domain/types";
import { useStore } from "@/local/StoreProvider";
import { createCopy } from "@/local/copyWrites";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

/** A bare run of 8–14 digits is a scanned or pasted barcode, not a title. */
const BARCODE = /^\d{8,14}$/;

export function useAddLogic() {
  const { store, clock } = useStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");

  const resultsQuery = useQuery({
    queryKey: ["releaseSearch", submitted],
    // Only runs once a search is actually submitted, so typing does not hammer the proxy.
    enabled: submitted.trim() !== "",
    queryFn: () => {
      const query = submitted.trim();
      return BARCODE.test(query) ? lookupByBarcode(query) : searchReleases(query);
    },
  });

  const addCopy = useMutation({
    mutationFn: async (release: Release) => {
      // Cache the release alongside the copy: the library and detail screens read release
      // metadata from the local store, and must keep working with no network at all.
      await store.cacheReleases([release]);
      const copy = createCopy(
        release,
        {
          condition: null,
          pricePaidCents: null,
          currency: "EUR",
          purchasedOn: null,
          purchasedAt: null,
          notes: null,
          rating: null,
        },
        clock,
        Date.now(),
        crypto.randomUUID(),
      );
      await store.putCopy(copy);
      return copy;
    },
    onSuccess: async (copy) => {
      await queryClient.invalidateQueries({ queryKey: ["copies"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
      void navigate({ to: "/copies/$copyId", params: { copyId: copy.id } });
    },
  });

  const submit = useCallback(() => setSubmitted(term), [term]);

  return {
    term,
    setTerm,
    submit,
    canSubmit: term.trim().length > 0,
    results: resultsQuery.data ?? [],
    searching: resultsQuery.isFetching,
    failed: resultsQuery.isError,
    hasSearched: submitted.trim() !== "",
    addRelease: (release: Release) => addCopy.mutate(release),
    addingMbid: addCopy.isPending ? addCopy.variables?.mbid : undefined,
  };
}
