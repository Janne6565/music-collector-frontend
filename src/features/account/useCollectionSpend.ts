import { type CurrencySpend, spendByCurrency } from "@/domain/currency";
import { useStore } from "@/local/StoreProvider";
import { useQuery } from "@tanstack/react-query";

/**
 * What the collection cost, split by the currency it was paid in (20d).
 *
 * Its own query rather than a field on `CollectionStats`, because the statistics contract
 * is shared with the mobile app and the server, and this is a question the account page
 * asks about the copies it can already see. Reading them is a local index scan.
 *
 * Almost always one entry. The split only appears once somebody has actually bought a
 * record in a second currency, which the picker on Settings now makes possible.
 */
export function useCollectionSpend(): readonly CurrencySpend[] {
  const { store } = useStore();
  const spend = useQuery({
    queryKey: ["collectionSpend"],
    queryFn: async () => spendByCurrency(await store.listCopies()),
  });
  return spend.data ?? [];
}
