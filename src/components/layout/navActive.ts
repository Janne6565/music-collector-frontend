import { useRouterState } from "@tanstack/react-router";

/**
 * Whether the section a nav entry stands for is the one being looked at.
 *
 * The router's own `activeProps` can only match the link's own path, and a record lives at
 * `/copies/<id>` rather than under `/`. So opening one from the shelf put the Library entry
 * out — which reads as having left the section, when the record *is* the section.
 *
 * Prefixes match a whole segment, never half of one: `/copy-of-something` is not `/copies`.
 */
export function useSectionActive(prefixes: readonly string[]): boolean {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
