import type { Condition, Format, ReviewableField } from "@janne6565/rekordo-shared";
import { CONDITION_LABELS, FORMAT_LABELS } from "@janne6565/rekordo-shared";

/**
 * One disputed value, as a line somebody can compare against the other one.
 *
 * Rendered rather than raw because the two sides are read side by side: `4` against `3`
 * says nothing about what the number means, and `VG_PLUS` against `NM` is a database's
 * answer to a question about a record. Both sides go through the same function, so the
 * comparison is never between a formatted value and a bare one.
 */
export function conflictValueText(
  field: ReviewableField,
  value: unknown,
  currency: string,
  language: string,
  empty: string,
): string {
  if (value === null || value === undefined || value === "") return empty;
  switch (field) {
    case "rating":
      return "★".repeat(Number(value)).padEnd(5, "☆");
    case "condition":
    case "sleeveCondition":
      return CONDITION_LABELS[value as Condition] ?? String(value);
    case "desiredFormat":
      return FORMAT_LABELS[value as Format] ?? String(value);
    case "pricePaidCents":
      return new Intl.NumberFormat(language, { style: "currency", currency }).format(
        Number(value) / 100,
      );
    case "purchasedOn":
      return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(
        new Date(String(value)),
      );
    default:
      return String(value);
  }
}
