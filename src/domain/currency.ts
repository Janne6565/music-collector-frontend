import type { Copy } from "@janne6565/rekordo-shared";

/**
 * Currency, which the app has always had and never let anybody choose.
 *
 * `currency` is a field on every `Copy` and always has been — a synced, mergeable one — but
 * every path that created a copy hardcoded "EUR". Turn 20 puts a picker on Settings, and
 * the thing that picker has to be honest about is its own scope: it seeds *new* copies and
 * cannot touch a saved one, because a saved copy's currency is a fact about that purchase.
 */

/** The five the picker offers (20h). Deliberately short: this is a shelf, not a bureau. */
export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY"] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "EUR";

/** The symbol the compact controls and the statistics tiles show. */
export const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "CHF",
  JPY: "¥",
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(value);
}

/**
 * "EUR €" — the code first, because the code is the unambiguous half.
 *
 * CHF has no distinct symbol and $ belongs to a dozen currencies, so a control showing only
 * the symbol would be guessing on the reader's behalf.
 */
export function currencyChipLabel(code: string): string {
  const symbol = CURRENCY_SYMBOLS[code];
  return symbol === undefined || symbol === code ? code : `${code} ${symbol}`;
}

export interface CurrencySpend {
  readonly currency: string;
  readonly totalCents: number;
  readonly copies: number;
}

/**
 * What was spent, split by the currency it was actually spent in.
 *
 * The statistics have always summed `pricePaidCents` across every copy and printed a euro
 * sign on the result, which was harmless only because nothing could produce a copy in
 * anything but euros. A picker makes mixed collections deliberate, and the same sum then
 * quietly adds dollars to euros.
 *
 * Nothing here converts. Converting would need a rate, a rate needs a date and a source,
 * and a total that silently depends on today's exchange rate is a worse answer than two
 * totals side by side (20d).
 *
 * Copies with no price are counted nowhere: a record with no price paid is not a purchase
 * in any currency, and including it would drag the average down towards zero.
 */
export function spendByCurrency(copies: readonly Copy[]): CurrencySpend[] {
  const totals = new Map<string, { totalCents: number; copies: number }>();
  for (const copy of copies) {
    if (copy.pricePaidCents === null) continue;
    const code = copy.currency === "" ? DEFAULT_CURRENCY : copy.currency;
    const entry = totals.get(code) ?? { totalCents: 0, copies: 0 };
    entry.totalCents += copy.pricePaidCents;
    entry.copies += 1;
    totals.set(code, entry);
  }
  return (
    [...totals.entries()]
      .map(([currency, entry]) => ({ currency, ...entry }))
      // Biggest spend first, so the currency the collection is mostly in leads the tile.
      .sort((a, b) => b.totalCents - a.totalCents || a.currency.localeCompare(b.currency))
  );
}

/** Whole units, matching the deck: "€3,120" — the cents are noise at tile size. */
export function formatMoney(cents: number, currency: string, language: string): string {
  return new Intl.NumberFormat(language, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
