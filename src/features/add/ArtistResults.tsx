import { Skeleton } from "@/components/ui";
import type { Artist } from "@/domain/types";
import { useArtistImage } from "@/features/add/useArtistImage";
import { artistMeta, type useArtistSearchLogic } from "@/features/add/useArtistSearchLogic";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * An artist's portrait, or the striped disc they get until there is one.
 *
 * The stripes are the deck's own answer, and they stay the floor rather than a stopgap:
 * an artist has no cover art, borrowing one of their albums' would make a row look like a
 * release, and plenty of artists have no picture in Discogs at all. The initial keeps the
 * row recognisably the same family of art while being unmistakably a different kind of
 * thing, and it is what a row shows before its portrait lands, when there is none, and if
 * the image fails to load.
 *
 * Rendered underneath the image rather than swapped for it, so the circle never blinks
 * empty between the two and a broken URL degrades to the initial with no extra state.
 */
function ArtistAvatar({
  name,
  size,
  mbid,
}: { readonly name: string; readonly size: number; readonly mbid?: string }) {
  return (
    <div
      aria-hidden
      className="relative flex flex-none items-center justify-center overflow-hidden rounded-full font-mono text-ink-subtle shadow-[inset_0_0_0_1px_rgba(25,23,19,.1)]"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size / 3),
        background: "repeating-linear-gradient(135deg,#e3ded4 0 5px,#eae6de 5px 10px)",
      }}
    >
      {name.slice(0, 1).toUpperCase()}
      {mbid !== undefined && <ArtistPortrait mbid={mbid} />}
    </div>
  );
}

/**
 * Split from the avatar so the query only runs where a portrait was asked for, and so the
 * initial underneath never re-renders when the picture arrives.
 */
function ArtistPortrait({ mbid }: { readonly mbid: string }) {
  const src = useArtistImage(mbid);
  const [failed, setFailed] = useState(false);
  if (src === null || failed) return null;

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

export { ArtistAvatar };

interface ArtistResultsProps {
  readonly logic: ReturnType<typeof useArtistSearchLogic>;
  readonly onOpen: (artist: Artist) => void;
}

/** Screen 10b — the artists section above the releases in the add dialog. */
export function ArtistResults({ logic, onOpen }: ArtistResultsProps) {
  const { t } = useTranslation();

  // A failed artist lookup takes the section away, not the search. Releases are still
  // useful on their own, and MusicBrainz times out often enough that this matters.
  if (logic.failed) return null;
  if (logic.loading) return <ArtistSkeletons />;
  if (logic.total === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between pt-3 pb-1.5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
          {t("artists.sectionCount", { count: logic.total })}
        </h3>
        <span className="text-[11.5px] font-medium text-ink-subtle">{t("artists.sortedBy")}</span>
      </div>

      {logic.shown.map((artist) => (
        <ArtistRow key={artist.mbid} artist={artist} onOpen={() => onOpen(artist)} />
      ))}

      {!logic.expanded && logic.hidden > 0 && (
        <button
          type="button"
          onClick={logic.expand}
          className="flex w-full items-center gap-2.5 border-t border-line py-2.75 text-left text-xs font-medium text-ink-muted hover:text-ink"
        >
          <ChevronDown size={15} strokeWidth={1.9} className="flex-none" aria-hidden />
          {t("artists.showMore", { count: logic.hidden })}
        </button>
      )}
    </section>
  );
}

function ArtistRow({ artist, onOpen }: { readonly artist: Artist; readonly onOpen: () => void }) {
  const { t } = useTranslation();
  const meta = artistMeta(artist);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3.5 border-t border-line py-3 text-left hover:bg-canvas/50"
    >
      <ArtistAvatar name={artist.name} size={46} mbid={artist.mbid} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-semibold leading-tight">{artist.name}</span>
          <span className="flex-none rounded bg-ink/7 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
            {t("artists.badge")}
          </span>
        </div>
        {/* The line that tells two artists of the same name apart. MusicBrainz holds at
            least three called "Daughter"; without this the rows are identical. */}
        {artist.disambiguation !== "" && (
          <div className="truncate text-[11.5px] leading-snug text-ink-muted">
            {artist.disambiguation}
          </div>
        )}
        {meta !== "" && (
          <div className="truncate font-mono text-[10px] leading-snug text-ink-subtle">{meta}</div>
        )}
      </div>
      <span className="flex h-8 flex-none items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink/75">
        {t("artists.discography")}
        <ChevronRight size={14} strokeWidth={2} aria-hidden />
      </span>
    </button>
  );
}

/** The same row shape, while the artist request is still out (the rule from turn 9). */
function ArtistSkeletons() {
  const { t } = useTranslation();
  return (
    <section>
      <h3 className="pt-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
        {t("artists.searching")}
      </h3>
      {["58%", "44%"].map((width) => (
        <div key={width} className="flex items-center gap-3.5 border-t border-line py-3">
          <Skeleton className="h-[46px] w-[46px] flex-none rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
            <Skeleton className="h-[11px] rounded-[3px]" style={{ width }} />
            <Skeleton tone="soft" className="h-[9px] rounded-[3px]" style={{ width: "66%" }} />
          </div>
          <div className="h-8 w-[104px] flex-none rounded-lg bg-ink/5" aria-hidden />
        </div>
      ))}
    </section>
  );
}
