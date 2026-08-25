import { useStore } from "@/local/StoreProvider";
import { useAppSelector } from "@/store/hooks";
import type { Condition, Release } from "@janne6565/music-collector-shared";
import { applyCopyPatch, parseIsoDate, parseMoneyToCents } from "@janne6565/music-collector-shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export interface DetailFields {
  condition: Condition | null;
  sleeveCondition: Condition | null;
  price: string;
  purchasedOn: string;
  purchasedAt: string;
  rating: number | null;
  notes: string;
}

/** The queries that read a copy out of the local store, and so change when one is saved. */
const LOCAL_KEYS = ["copy", "copyDetails", "copies", "stats", "wishlist", "cover-photos"];

const BLANK: DetailFields = {
  condition: null,
  sleeveCondition: null,
  price: "",
  purchasedOn: "",
  purchasedAt: "",
  rating: null,
  notes: "",
};

/**
 * The copy details step (screen 8d).
 *
 * It edits a copy that already exists, through the same `applyCopyPatch` every other edit
 * goes through — so a field left blank here is never restamped, and does not start winning
 * merges against a value another device actually set.
 */
export function useCopyDetailsLogic(copyId: string, onSaved: () => void) {
  const { store, clock } = useStore();
  const queryClient = useQueryClient();
  const signedIn = useAppSelector((state) => state.auth.status === "signedIn");

  const [fields, setFields] = useState<DetailFields>(BLANK);
  /**
   * What the form looked like when it opened.
   *
   * Kept so a backdrop click can tell an accidental one from a deliberate abandonment: a
   * sheet with nothing typed into it closes, a sheet holding edits nudges instead.
   */
  const [baseline, setBaseline] = useState<DetailFields>(BLANK);
  const [priceInvalid, setPriceInvalid] = useState(false);
  const [dateInvalid, setDateInvalid] = useState(false);

  const query = useQuery({
    queryKey: ["copyDetails", copyId],
    queryFn: async () => {
      const copy = await store.getCopy(copyId);
      if (copy === undefined) return null;
      const release: Release | undefined = await store.getRelease(copy.releaseId);
      return { copy, release };
    },
  });

  const copy = query.data?.copy;
  useEffect(() => {
    // A copy reached from "Add and edit details" is blank, but the same step opens on a
    // copy that already has details when it is reopened; either way the form starts from
    // what is stored.
    if (copy === undefined) return;
    const loaded: DetailFields = {
      condition: copy.condition,
      sleeveCondition: copy.sleeveCondition,
      price: copy.pricePaidCents === null ? "" : (copy.pricePaidCents / 100).toFixed(2),
      purchasedOn: copy.purchasedOn ?? "",
      purchasedAt: copy.purchasedAt ?? "",
      rating: copy.rating,
      notes: copy.notes ?? "",
    };
    setFields(loaded);
    setBaseline(loaded);
  }, [copy]);

  /** Whether anything has been typed since the sheet opened. */
  const dirty = (Object.keys(fields) as (keyof DetailFields)[]).some(
    (key) => fields[key] !== baseline[key],
  );

  const save = useMutation({
    mutationFn: async () => {
      const current = await store.getCopy(copyId);
      if (current === undefined) return;
      await store.putCopy(
        applyCopyPatch(
          current,
          {
            condition: fields.condition,
            sleeveCondition: fields.sleeveCondition,
            pricePaidCents: fields.price.trim() === "" ? null : parseMoneyToCents(fields.price),
            purchasedOn: fields.purchasedOn.trim() === "" ? null : parseIsoDate(fields.purchasedOn),
            purchasedAt: fields.purchasedAt.trim() === "" ? null : fields.purchasedAt.trim(),
            rating: fields.rating,
            notes: fields.notes.trim() === "" ? null : fields.notes,
          },
          clock,
        ),
      );
    },
    onSuccess: async () => {
      // Only what reads the copy. A bare invalidateQueries() also refetched the release
      // search still mounted behind this sheet — every add ended in a second round trip to
      // Discogs for results nobody had asked for again, out of a quota measured per minute.
      await Promise.all(
        LOCAL_KEYS.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      );
      onSaved();
    },
  });

  const set = useCallback(<K extends keyof DetailFields>(key: K, value: DetailFields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
    if (key === "price") setPriceInvalid(false);
    if (key === "purchasedOn") setDateInvalid(false);
  }, []);

  return {
    release: query.data?.release,
    fields,
    dirty,
    set,
    priceInvalid,
    dateInvalid,
    signedIn,
    save: () => {
      // A blank price means "not recorded", which is different from an unparseable one —
      // the second is a mistake worth surfacing rather than silently discarding.
      if (fields.price.trim() !== "" && parseMoneyToCents(fields.price) === null) {
        setPriceInvalid(true);
        return;
      }
      if (fields.purchasedOn.trim() !== "" && parseIsoDate(fields.purchasedOn) === null) {
        setDateInvalid(true);
        return;
      }
      save.mutate();
    },
    saving: save.isPending,
  };
}
