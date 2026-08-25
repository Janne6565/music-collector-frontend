import { cn } from "@/lib/utils";

/**
 * A person, drawn from their initials.
 *
 * Nobody uploads a picture of themselves in this app and nothing asks them to, so the
 * alternative to initials is the same grey circle for everybody. The tint is derived from
 * the name, which makes a list of twelve friends scannable without anybody choosing a colour.
 */
export function Avatar({
  name,
  size = 34,
  className,
}: { readonly name: string; readonly size?: number; readonly className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const hue = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 360;

  return (
    <div
      aria-hidden
      className={cn(
        "flex flex-none items-center justify-center rounded-full font-semibold text-ink/70",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        // Low saturation and high lightness on purpose: these sit next to cover art, and a
        // wall of vivid circles would compete with the sleeves for attention.
        backgroundColor: `hsl(${hue} 32% 86%)`,
      }}
    >
      {initials || "?"}
    </div>
  );
}
