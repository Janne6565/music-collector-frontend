import { AppShell } from "@/components/layout/AppShell";
import { useDetailLogic } from "@/features/detail/useDetailLogic";
import { useCollectionStats } from "@/features/library/useLibraryLogic";
import { Absent, Rows, Skeleton, Unreachable } from "@/features/tracklist/Tracklist";
import { durationParts, knownDurationMs, trackTotal } from "@/features/tracklist/tracklistFormat";
import { useTracklistLogic } from "@/features/tracklist/useTracklistLogic";
import { markBackNavigation } from "@/lib/motion";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Screen 25e — a long tracklist, on a page of its own.
 *
 * The app keeps every tracklist inline at the bottom of the copy; a phone-width browser
 * cannot, because the rows share their sheet with a pinned save bar and twenty-six titles
 * behind a scroll leave nothing readable on screen at once. Past ten rows the list moves
 * here, where the whole screen is the list.
 *
 * Own URL, so a tracklist survives being shared. The release is named in the header for
 * the same reason: somebody arriving from a link has no sheet behind them to say which
 * record these titles belong to.
 *
 * Nothing here is editable and nothing here is this copy's. Sides and durations come from
 * the catalogue and are the same for every copy of the release, which the line at the foot
 * of the list says once so that no row has to imply it.
 */
export function TracklistPage({ copyId }: { readonly copyId: string }) {
  const { t } = useTranslation();
  const stats = useCollectionStats();
  const detail = useDetailLogic(copyId);
  const release = detail.data?.release;
  const { tracklist, loading, unreachable, retry } = useTracklistLogic(release?.id);

  const media = tracklist?.media ?? [];
  const tracks = trackTotal(media) || (tracklist?.trackCount ?? null);
  const totalMs = knownDurationMs(media);

  return (
    // No tab bar: this is a level below the four destinations, the same as the copy it was
    // reached from.
    <AppShell stats={stats} phoneBottom="none">
      <header className="flex flex-none items-center gap-3 border-b border-line px-4 py-3 sm:px-7">
        <Link
          to="/copies/$copyId"
          params={{ copyId }}
          viewTransition
          onClick={markBackNavigation}
          aria-label={t("common.back")}
          className="-ml-2.5 flex size-11 flex-none items-center justify-center"
        >
          <ChevronLeft size={20} strokeWidth={1.9} aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{release?.title ?? "…"}</div>
          <div className="mt-px truncate text-[11px] text-ink-muted">
            {[release?.artistName, release?.year]
              .filter((part) => part != null && part !== "")
              .join(" · ")}
          </div>
        </div>
        <Summary tracks={tracks} totalMs={totalMs} />
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-4 pt-1 pb-8 sm:px-7">
        <div className="max-w-[560px]">
          {/*
           * The same four states the inline section has, because this page can be arrived
           * at cold — from a shared link, or on a reload — and a header over a blank
           * screen is the one answer that says nothing at all.
           */}
          {loading ? (
            <Skeleton rows={tracks ?? 8} />
          ) : unreachable ? (
            <Unreachable shared={false} onRetry={retry} />
          ) : tracklist === undefined || tracklist.absence !== null ? (
            <Absent tracklist={tracklist} />
          ) : (
            <>
              {/* Expanded, always: the 30-row cap exists so a box set cannot bury a
                  sheet's footer, and there is no footer here to bury. */}
              <Rows media={media} expanded onExpand={() => {}} />
              <p className="mt-3.5 text-[11.5px] leading-[1.6] text-ink-subtle text-pretty">
                {t("tracklist.fromCatalogue")}
              </p>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/** "10 · 36 MIN" — the same two facts the sheet's own summary leads with. */
function Summary({
  tracks,
  totalMs,
}: { readonly tracks: number | null; readonly totalMs: number | null }) {
  const { t } = useTranslation();
  if (tracks === null) return null;

  const parts = [String(tracks)];
  if (totalMs !== null) {
    const { hours, minutes } = durationParts(totalMs);
    parts.push(
      hours > 0
        ? t("tracklist.hoursMinutes", { hours, minutes })
        : t("tracklist.minutes", { count: minutes }),
    );
  }
  return (
    <span className="flex-none font-mono text-[11px] text-ink-subtle uppercase">
      {parts.join(" · ")}
    </span>
  );
}
