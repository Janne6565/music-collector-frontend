import { useEffect, useState } from "react";

/**
 * A search term that lags behind the field it is typed into.
 *
 * Returns the value to filter *by*, which trails the value that is typed. Splitting the
 * two is the point: the box itself stays instant, because a search field that lags behind
 * the keyboard is worse than any amount of churn in the results, while whatever the term
 * drives — a query, a re-sort, a re-render of a whole grid — waits for the typing to stop.
 *
 * Emptying the field is not debounced. Waiting to *stop* filtering reads as lag rather
 * than restraint, and it is the one edit after which nothing else is about to be typed.
 */
export function useDebouncedSearch(value: string, delayMs: number): string {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    if (value === settled) return;
    if (value === "") {
      setSettled("");
      return;
    }
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, settled, delayMs]);

  return settled;
}
