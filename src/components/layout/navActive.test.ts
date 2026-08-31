import { useSectionActive } from "@/components/layout/navActive";
import { describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { pathname: mocked.pathname } }),
}));

function activeAt(pathname: string, prefixes: readonly string[]) {
  mocked.pathname = pathname;
  return useSectionActive(prefixes);
}

describe("which nav entry the page belongs to", () => {
  it("keeps Library lit while a record from it is open", () => {
    expect(activeAt("/copies/abc", ["/", "/copies"])).toBe(true);
  });

  it("still lights the shelf itself", () => {
    expect(activeAt("/", ["/", "/copies"])).toBe(true);
  });

  it("does not light Library from another section", () => {
    // Which is why "/" cannot simply be matched loosely: it is a prefix of every route.
    expect(activeAt("/wishlist", ["/", "/copies"])).toBe(false);
    expect(activeAt("/friends/janne2", ["/", "/copies"])).toBe(false);
  });

  it("matches whole segments only", () => {
    expect(activeAt("/copies-of-mine", ["/copies"])).toBe(false);
  });
});
