import { useStore } from "@/local/StoreProvider";
import { readDocumentLanguage, writeDocumentLanguage } from "@/local/settings";
import type { LegalLanguage } from "@janne6565/music-collector-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * Which language the legal documents are read in, on this device.
 *
 * A device preference rather than a route parameter: a link to the Datenschutzerklärung
 * should land somebody on the version they read the last one in, and a `?lang=` in every
 * legal URL would make two different links to the same document.
 */
export function useLegalLanguage() {
  const { store } = useStore();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();

  const language = useQuery({
    queryKey: ["documentLanguage"],
    queryFn: () => readDocumentLanguage(store, i18n.language),
  });

  const choose = useMutation({
    mutationFn: async (next: LegalLanguage) => writeDocumentLanguage(store, next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documentLanguage"] });
    },
  });

  return {
    /**
     * German until the store answers. The documents are always rendered — a legal page that
     * flashes empty while a preference loads is a legal page somebody screenshots empty.
     */
    language: language.data ?? "de",
    choose: useCallback((next: LegalLanguage) => choose.mutate(next), [choose.mutate]),
  };
}
