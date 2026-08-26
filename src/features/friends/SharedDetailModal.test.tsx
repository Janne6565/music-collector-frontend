// The sheet is mostly translated strings, so the real bundle is what it is rendered with.
import "@/i18n/config";
import type { SharedDetailItem } from "@/features/friends/SharedDetailModal";
import { SharedDetailModal } from "@/features/friends/SharedDetailModal";
import type { SharedDetail } from "@/features/friends/useSharedDetailLogic";
import { render, screen } from "@testing-library/react";
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

const COPY: SharedDetailItem = {
  title: "Remain in Light",
  artistName: "Talking Heads",
  art: null,
  facts: [
    { key: "year", label: "Year", value: "1980" },
    { key: "format", label: "Format", value: "Vinyl" },
    { key: "media", label: "Media", value: "VG+", chip: true },
  ],
  phoneFacts: [{ key: "year", label: "Year", value: "1980" }],
  phoneFootnote: "Added March 2024",
  note: "Janne's copy",
};

function detail(over: Partial<SharedDetail> = {}): SharedDetail {
  return {
    index: 6,
    open: true,
    total: 42,
    hasPrev: true,
    hasNext: true,
    prev: vi.fn(),
    next: vi.fn(),
    close: vi.fn(),
    swipe: { onTouchStart: vi.fn(), onTouchEnd: vi.fn() },
    ...over,
  };
}

describe("SharedDetailModal", () => {
  it("draws the record, its facts and where it sits on the shelf", () => {
    render(<SharedDetailModal item={COPY} detail={detail()} />);

    expect(screen.getByRole("heading", { name: "Remain in Light" })).toBeDefined();
    expect(screen.getByText("Talking Heads")).toBeDefined();
    expect(screen.getByText("VG+")).toBeDefined();
    expect(screen.getByText("7 of 42")).toBeDefined();
    expect(screen.getByText("Janne's copy")).toBeDefined();
  });

  it("shows nothing where a field is missing", () => {
    // The whole point of the optional grid: no dash, no empty label, no hole.
    const onlyYear = COPY.facts.filter((fact) => fact.key === "year");
    render(<SharedDetailModal item={{ ...COPY, facts: onlyYear }} detail={detail()} />);

    expect(screen.queryByText("Format")).toBeNull();
    expect(screen.queryByText("Paid")).toBeNull();
  });

  it("keeps the arrows in place at the ends of the shelf, disabled", () => {
    render(<SharedDetailModal item={COPY} detail={detail({ hasPrev: false })} />);

    const back = screen.getByLabelText("Previous record") as HTMLButtonElement;
    expect(back.disabled).toBe(true);
    expect((screen.getByLabelText("Next record") as HTMLButtonElement).disabled).toBe(false);
  });
});
