// The page is mostly translated strings, so the real bundle is what it is rendered with.
import "@/i18n/config";
import { FriendsPage } from "@/features/friends/FriendsPage";
import type { useFriendsLogic } from "@/features/friends/useFriendsLogic";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

/**
 * The shell and the router are not what these tests are about.
 *
 * `AppShell` puts the sidebar and the tab bar on screen, both of which are made of
 * `Link`s, and a real router would have to be given the whole route tree to render two
 * panes of one page. Everything the assertions touch is FriendsPage's own markup.
 */
vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { readonly children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/features/library/useLibraryLogic", () => ({ useCollectionStats: () => undefined }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { readonly children: ReactNode }) => <a {...rest}>{children}</a>,
}));

const mocked = vi.hoisted(() => ({ logic: vi.fn() }));
vi.mock("@/features/friends/useFriendsLogic", () => ({ useFriendsLogic: mocked.logic }));

/** Someone signed in with a handle, one search hit and one request waiting. */
function logicWith(overrides: Record<string, unknown> = {}): ReturnType<typeof useFriendsLogic> {
  return {
    signedIn: true,
    needsHandle: false,
    handle: "janne",
    sharing: undefined,
    query: "marta",
    setQuery: vi.fn(),
    results: [{ id: "p-1", handle: "martaknopf", displayName: "Marta Knopf", copyCount: 31 }],
    searching: false,
    queryTooShort: false,
    entries: [],
    loading: false,
    friends: [],
    outgoing: [],
    incoming: [
      {
        id: "inv-1",
        from: { handle: "lukas", displayName: "Lukas", copyCount: 12 },
        mutualFriends: 3,
      },
    ],
    ask: { mutate: vi.fn(), isPending: false, variables: undefined },
    acceptRequest: { mutate: vi.fn(), isPending: false, variables: undefined },
    declineRequest: { mutate: vi.fn(), isPending: false, variables: undefined },
    unfriend: { mutate: vi.fn(), isPending: false, variables: undefined },
    claimHandle: { mutate: vi.fn(), isPending: false },
    ...overrides,
  } as unknown as ReturnType<typeof useFriendsLogic>;
}

/**
 * Whether anything between the node and the page root hides it under 640px.
 *
 * The two panes of 24g are not mounted and unmounted — they are both in the document and
 * CSS picks, the way the profile's two grids are. So "is it on the phone's screen" is a
 * question about the classes of its ancestors, and `toBeVisible` cannot answer it: jsdom
 * applies no media queries at all.
 */
function hiddenOnPhone(node: HTMLElement): boolean {
  for (let current: HTMLElement | null = node; current !== null; current = current.parentElement) {
    if (current.className?.includes?.("max-sm:hidden")) return true;
  }
  return false;
}

/** The mirror of the above: hidden by `sm:hidden` somewhere on the way up. */
function hiddenOnDesktop(node: HTMLElement): boolean {
  for (let current: HTMLElement | null = node; current !== null; current = current.parentElement) {
    const name = current.className;
    if (typeof name === "string" && /(?:^|\s)sm:hidden(?:\s|$)/.test(name)) return true;
  }
  return false;
}

describe("FriendsPage under 640px", () => {
  it("shows what the search found in the pane that holds the search box", () => {
    // The regression this exists for: results rendered only into the Activity pane,
    // which is hidden exactly while Find — the only pane with a search box — is open.
    // Typing worked, the request fired, and nothing appeared.
    mocked.logic.mockReturnValue(logicWith());
    render(<FriendsPage />);

    const hits = screen.getAllByText("Marta Knopf");
    expect(hits.some((hit) => !hiddenOnPhone(hit))).toBe(true);
    expect(hits.some((hit) => !hiddenOnDesktop(hit))).toBe(true);
  });

  it("shows a pending request in the pane whose tab counts it", () => {
    // The badge on Find says how many people are waiting, so Find has to be where they
    // are — a count pointing at a pane that does not contain them is a dead end.
    mocked.logic.mockReturnValue(logicWith());
    render(<FriendsPage />);

    const cards = screen.getAllByText(/Lukas/);
    expect(cards.some((card) => !hiddenOnPhone(card))).toBe(true);
    expect(cards.some((card) => !hiddenOnDesktop(card))).toBe(true);
  });

  it("opens on Find while the feed is empty", () => {
    mocked.logic.mockReturnValue(logicWith({ entries: [], loading: false }));
    render(<FriendsPage />);

    const find = screen.getByRole("button", { name: /Find/ });
    expect(find.getAttribute("aria-current")).toBe("true");
  });
});
