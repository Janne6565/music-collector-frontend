import type { ActivityEntryDto } from "@/api/generated/rekordoAPI.schemas";
import { ReleaseArt } from "@/components/ReleaseArt";
import { Skeleton } from "@/components/ui";
import { formatRelativeTime } from "@/domain/relativeTime";
import { Avatar } from "@/features/friends/Avatar";
import { FORMAT_LABELS } from "@janne6565/rekordo-shared";
import { Link } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";

/**
 * The activity half of 15a and 15g.
 *
 * Grouped under day headings rather than shown as one undifferentiated stream: a feed of a
 * dozen records is read as "what happened yesterday", not as a timeline.
 */
export function ActivityFeed({
  entries,
  loading,
}: { readonly entries: readonly ActivityEntryDto[]; readonly loading: boolean }) {
  const { t, i18n } = useTranslation();

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center">
        <p className="text-[13px] font-medium text-ink">{t("friends.feedEmpty.title")}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
          {t("friends.feedEmpty.body")}
        </p>
      </div>
    );
  }

  const days = groupByDay(entries, i18n.language);
  return (
    <div className="flex flex-col gap-5">
      {days.map(([label, rows]) => (
        <section key={label}>
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
            {label}
          </h2>
          <div className="flex flex-col gap-2">
            {rows.map((entry) => (
              <Entry key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Entry({ entry }: { readonly entry: ActivityEntryDto }) {
  const { t, i18n } = useTranslation();
  const name = entry.actor?.displayName ?? entry.actor?.handle ?? "";
  const count = entry.copyCount ?? 1;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
      {count > 1 ? (
        <CoverStack covers={entry.collapsedCovers ?? []} />
      ) : (
        <Cover url={entry.coverArtUrl} format={entry.format} />
      )}
      <Avatar name={name} size={26} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-ink">
          <Sentence entry={entry} name={name} count={count} />
        </p>
        <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
          {[
            entry.artistName,
            entry.format ? FORMAT_LABELS[entry.format] : undefined,
            entry.year?.toString(),
            entry.occurredAt
              ? formatRelativeTime(new Date(entry.occurredAt).getTime(), i18n.language)
              : undefined,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {count > 1 && (
          <span className="mt-1 inline-block text-[11.5px] font-medium text-accent">
            {t("friends.seeAll", { count })}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The line itself. Written with Trans rather than assembled from fragments so that German
 * can put the name, the verb and the title in German order.
 */
function Sentence({
  entry,
  name,
  count,
}: { readonly entry: ActivityEntryDto; readonly name: string; readonly count: number }) {
  const handle = entry.actor?.handle ?? "";
  const person = (
    <Link
      to="/friends/$handle"
      params={{ handle }}
      className="font-semibold text-ink no-underline hover:underline"
    >
      {name}
    </Link>
  );
  const title = <span className="font-semibold text-ink">{entry.title}</span>;

  if (count > 1) {
    return (
      <Trans
        i18nKey="friends.line.addedMany"
        values={{ name, count }}
        components={{ person, title: <span /> }}
      />
    );
  }
  switch (entry.type) {
    case "WISH_ADDED":
      return (
        <Trans
          i18nKey="friends.line.wishAdded"
          values={{ name, title: entry.title }}
          components={{ person, title }}
        />
      );
    case "WISH_FULFILLED":
      return (
        <Trans
          i18nKey="friends.line.wishFulfilled"
          values={{ name, title: entry.title }}
          components={{ person, title }}
        />
      );
    case "FRIENDSHIP_ACCEPTED":
      return (
        <Trans
          i18nKey="friends.line.accepted"
          values={{ name }}
          components={{ person, title: <span /> }}
        />
      );
    default:
      return (
        <Trans
          i18nKey="friends.line.added"
          values={{ name, title: entry.title }}
          components={{ person, title }}
        />
      );
  }
}

function Cover({
  url,
  format,
}: { readonly url: string | undefined; readonly format: ActivityEntryDto["format"] }) {
  return (
    // Never a bare img: four covers in ten are a 404 at the archive, so this falls back to
    // the format silhouette the same way every other tile in the app does.
    <ReleaseArt
      release={{ coverArtUrl: url ?? null, format }}
      className="h-10 w-10 flex-none"
      loading="lazy"
    />
  );
}

/** The little fan of sleeves beside a collapsed burst. */
function CoverStack({ covers }: { readonly covers: readonly string[] }) {
  return (
    <div className="flex h-10 w-10 flex-none">
      {covers.slice(0, 3).map((url, index) => (
        <div
          key={url}
          className="h-10 w-10 overflow-hidden rounded-md border border-surface bg-line"
          style={{ marginLeft: index === 0 ? 0 : -26, zIndex: 3 - index }}
        >
          <ReleaseArt release={{ coverArtUrl: url }} className="h-full w-full" loading="lazy" />
        </div>
      ))}
      {covers.length === 0 && <div className="h-10 w-10 rounded-md bg-line" />}
    </div>
  );
}

/**
 * Day buckets, from the viewer's own clock.
 *
 * Deliberately not computed on the server: "today" depends on where the person reading is,
 * and a feed served from UTC would put a European's evening into tomorrow.
 */
function groupByDay(
  entries: readonly ActivityEntryDto[],
  language: string,
): [string, ActivityEntryDto[]][] {
  const days = new Map<string, ActivityEntryDto[]>();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();

  for (const entry of entries) {
    const when = entry.occurredAt ? new Date(entry.occurredAt) : new Date();
    const stamp = when.toDateString();
    const label =
      stamp === today
        ? labelFor("today", language)
        : stamp === yesterday
          ? labelFor("yesterday", language)
          : when.toLocaleDateString(language, { day: "numeric", month: "long" });
    days.set(label, [...(days.get(label) ?? []), entry]);
  }
  return [...days.entries()];
}

function labelFor(which: "today" | "yesterday", language: string): string {
  const relative = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const parts = relative.formatToParts(which === "today" ? 0 : -1, "day");
  const literal = parts.map((part) => part.value).join("");
  return literal.charAt(0).toUpperCase() + literal.slice(1);
}
