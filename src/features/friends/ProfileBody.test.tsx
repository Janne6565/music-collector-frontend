// The shelf is mostly translated strings, so the real bundle is what it is rendered with.
import "@/i18n/config";
import type { SharedCopyDto } from "@/api/generated/rekordoAPI.schemas";
import { ProfileBody } from "@/features/friends/ProfilePage";
import type { useProfileLogic } from "@/features/friends/useProfileLogic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  // jsdom knows the <dialog> element but not the top layer.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

const COPIES: SharedCopyDto[] = [
  {
    id: "one",
    title: "Remain in Light",
    artistName: "Talking Heads",
    year: 1980,
    format: "VINYL",
    condition: "VG_PLUS",
    sleeveCondition: "NM",
    pricePaidCents: 2400,
    currency: "EUR",
    createdAt: Date.UTC(2024, 2, 4),
  },
  { id: "two", title: "Lanquidity", artistName: "Sun Ra", format: "VINYL" },
];

/**
 * A profile that is entirely readable, seen by its owner.
 *
 * SELF because every other relationship puts a router `Link` in the header, and this test
 * is about the shelf underneath it.
 */
function logicFor(pricesVisible: boolean): ReturnType<typeof useProfileLogic> {
  return {
    signedIn: true,
    handle: "janne",
    person: {
      handle: "janne",
      displayName: "Janne",
      relationship: "SELF",
      canSeeCollection: true,
      canSeeWishlist: true,
      copyCount: 42,
      wishlistCount: 18,
      pricesVisible,
    },
    loading: false,
    notFound: false,
    copies: pricesVisible ? COPIES : COPIES.map(({ pricePaidCents, currency, ...rest }) => rest),
    copiesTruncated: false,
    wishes: [],
    loadingLists: false,
  } as unknown as ReturnType<typeof useProfileLogic>;
}

function shelf(openId: string | undefined, onOpen = vi.fn(), pricesVisible = true) {
  // A hidden shelf arrives with no amounts on it at all, which is what the server does.
  const view = render(
    <QueryClientProvider client={new QueryClient()}>
      <ProfileBody
        logic={logicFor(pricesVisible)}
        tab="collection"
        onTab={vi.fn()}
        openId={openId}
        onOpen={onOpen}
      />
    </QueryClientProvider>,
  );
  return { ...view, onOpen };
}

describe("the public shelf", () => {
  it("opens a record by address rather than by remembering a click", () => {
    const { onOpen } = shelf(undefined);

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Remain in Light/ }));

    expect(onOpen).toHaveBeenCalledWith("one");
  });

  it("draws the sheet for whichever record the address names", () => {
    shelf("two");

    expect(screen.getByRole("heading", { name: "Lanquidity" })).toBeDefined();
    // Second of two, and the only two facts it has.
    expect(screen.getByText("2 of 2")).toBeDefined();
    expect(screen.queryByText("Year")).toBeNull();
  });

  it("shows condition and price on somebody else's copy", () => {
    // Which contradicts the footnote on 15i: the public page used to say condition and
    // price are never shown, and turn 23 overrules it for the sheet.
    shelf("one");
    const sheet = within(screen.getByRole("dialog"));

    // Both grids are in the document — the wide one and 23e's phone one, which CSS picks
    // between — so each fact is found twice.
    expect(sheet.getAllByText("VG+").length).toBeGreaterThan(0);
    expect(sheet.getAllByText(/NM/).length).toBeGreaterThan(0);
    // The locale decides where the symbol goes; what matters is that the amount is there.
    expect(sheet.getAllByText(/24[.,]00/).length).toBeGreaterThan(0);
    expect(sheet.getByText("Janne's copy")).toBeDefined();
  });

  it("obeys the owner's switch on prices", () => {
    // 15f is the owner's decision about the whole shelf, and the sheet is not a way round
    // it — the server strips the amount, and the sheet drops the field rather than ruling
    // an empty row for it.
    shelf("one", vi.fn(), false);
    const sheet = within(screen.getByRole("dialog"));

    expect(sheet.queryAllByText("Paid")).toHaveLength(0);
    expect(sheet.getByText("prices hidden")).toBeDefined();
  });

  it("stays shut when the link names a record that is not here", () => {
    shelf("gone");

    expect(screen.queryByRole("heading", { name: "Remain in Light" })).toBeNull();
  });
});
