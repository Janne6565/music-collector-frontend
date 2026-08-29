import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

/**
 * A person: their picture if they brought one, their initials if they did not.
 *
 * Turn 15 said nobody uploads a picture of themselves here and turn 27 keeps that almost
 * true — the picture is offered in one row on Account and asked for nowhere, so most people
 * in most lists are still initials. The tint is derived from the name, which makes a list of
 * twelve friends scannable without anybody choosing a colour.
 *
 * The two kinds are deliberately not distinguished (27g). Same circle, same geometry, same
 * inset hairline — ink at 8% on tint, 12% over a photo, which is the only difference and
 * exists because a light photograph without it reads as a hole rather than a face. No ring,
 * no shadow, no badge: a list where three of twelve have photographs should look like a mix,
 * not like nine broken rows.
 *
 * The initials are also the loading state (27j). Name and tint are already on the device, so
 * the circle is right-sized and named from the first frame and the photo cross-fades in over
 * it; a fetch that fails simply stays initials and says nothing. Nothing here is ever grey.
 */
export function Avatar({
  name,
  src,
  size = 34,
  className,
}: {
  readonly name: string;
  /** Where their picture is, or null/undefined for the ordinary case. */
  readonly src?: string | null;
  readonly size?: number;
  readonly className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const hue = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 360;
  const photo = usePhoto(src);
  const faded = useFadeIn(photo);

  return (
    <div
      aria-hidden
      className={cn("relative flex-none overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center font-semibold text-ink/70"
        style={{
          fontSize: Math.round(size * 0.36),
          // Low saturation and high lightness on purpose: these sit next to cover art, and a
          // wall of vivid circles would compete with the sleeves for attention.
          backgroundColor: `hsl(${hue} 32% 86%)`,
        }}
      >
        {initials || "?"}
      </div>
      {photo !== null && (
        <img
          // Keyed on the source so a replacement mounts a fresh element and fades in over
          // the one before it, rather than swapping the bytes underneath a settled picture.
          key={photo}
          src={photo}
          alt=""
          // Only ever fading in, never out. A replacement holds the picture it already has
          // until the new one has decoded (27j), so the circle never passes back through
          // initials on the way from one face to another.
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[220ms] ease-out"
          style={{ opacity: faded ? 1 : 0 }}
        />
      )}
      {/* Above both layers, so the hairline is drawn on the photograph rather than under it. */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: `inset 0 0 0 1px rgba(25,23,19,${photo === null ? 0.08 : 0.12})` }}
      />
    </div>
  );
}

/**
 * The picture, once it has actually decoded.
 *
 * An `<img>` pointed straight at the URL would paint a blank box in the moment between
 * layout and first byte, and the whole point of 27j is that there is no such moment: the
 * initials are already there and the photograph arrives over them. So the decode happens off
 * to one side and only a picture that succeeded is ever handed back.
 *
 * A failure returns null and stays null. There is nothing to tell the viewer — the circle
 * they are looking at is a correct drawing of that person either way.
 */
function usePhoto(src: string | null | undefined): string | null {
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (src === null || src === undefined || src === "") {
      setLoaded(null);
      return;
    }
    let cancelled = false;
    const image = new Image();
    const arrived = () => {
      if (!cancelled) setLoaded(src);
    };
    // Deliberately silent on failure. A picture that will not load is a person without one,
    // and the circle they are already looking at is a correct drawing of them either way.
    image.onload = arrived;
    image.src = src;
    // `decode` is the better signal — it resolves when the bitmap is ready to paint rather
    // than when the bytes have landed, which is what keeps the cross-fade from running over
    // a frame that is not there yet. It is not everywhere, so `onload` stands behind it.
    if (typeof image.decode === "function") {
      void image
        .decode()
        .then(arrived)
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
    // Not clearing `loaded` on the way in: while a replacement decodes, the circle keeps
    // the face it is already showing rather than dropping to initials and back.
  }, [src]);

  return loaded;
}

/**
 * False for exactly one frame after a picture appears, so the transition has something to
 * transition from. Base timing, 220ms (turn 13). No shimmer and no skeleton: shimmer belongs
 * to catalogue art, and a person is not a loading surface.
 */
function useFadeIn(photo: string | null): boolean {
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    if (photo === null) {
      setFaded(false);
      return;
    }
    const frame = requestAnimationFrame(() => setFaded(true));
    return () => cancelAnimationFrame(frame);
  }, [photo]);

  return faded;
}
