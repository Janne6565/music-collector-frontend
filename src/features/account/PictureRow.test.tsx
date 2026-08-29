// The row is almost entirely its seven sentences, so the real bundle is what it renders with.
import "@/i18n/config";
import { PictureRow } from "@/features/account/PictureRow";
import type { ProfilePictureLogic } from "@/features/account/useProfilePictureLogic";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  // jsdom knows the <dialog> element but not the top layer the remove sheet opens into.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

function logicWith(overrides: Partial<ProfilePictureLogic> = {}): ProfilePictureLogic {
  return {
    state: { kind: "idle" },
    url: null,
    justUpdated: false,
    confirmingRemove: false,
    pick: vi.fn(),
    chose: vi.fn(),
    cancelFraming: vi.fn(),
    confirmFraming: vi.fn(),
    askRemove: vi.fn(),
    cancelRemove: vi.fn(),
    confirmRemove: vi.fn(),
    retry: vi.fn(),
    cancelUpload: vi.fn(),
    inputRef: { current: null },
    ...overrides,
  };
}

function draw(logic: ProfilePictureLogic) {
  render(<PictureRow logic={logic} name="Jonas Meyer" handle="jonasmeyer" />);
}

describe("the picture row", () => {
  it("offers one verb and says the initials are standing in", () => {
    draw(logicWith());

    expect(screen.getByText(/Not set/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });

  /** The one thing the person needs to know about a picture that is already up. */
  it("names where the picture is public once there is one", () => {
    draw(logicWith({ url: "/api/v1/avatar/u?v=1" }));

    expect(screen.getByText(/Anyone who opens/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Replace" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();
  });

  it("counts the bytes while they are going up, and offers the way out", () => {
    draw(logicWith({ state: { kind: "uploading", sent: 7_900_000, total: 12_600_000 } }));

    expect(screen.getByText(/7\.9 of 12\.6 MB/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("names the file it could not use, and what it would take", () => {
    draw(logicWith({ state: { kind: "wrongType", name: "liner-notes.pdf" } }));

    expect(screen.getByText(/liner-notes\.pdf/)).toBeTruthy();
    expect(screen.getByText(/JPEG, PNG, WebP or HEIC/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose another file" })).toBeTruthy();
  });

  it("names the size and the ceiling", () => {
    draw(logicWith({ state: { kind: "tooLarge", name: "IMG_8804.heic", bytes: 23_400_000 } }));

    expect(screen.getByText(/IMG_8804\.heic is 23\.4 MB/)).toBeTruthy();
  });

  /**
   * The scoping is the whole point of this state: a picture feature being down must never
   * read as the app being broken, and the picture already on the account is untouched.
   */
  it("scopes a storage failure and keeps the picture that is already there", () => {
    draw(logicWith({ state: { kind: "unavailable" }, url: "/api/v1/avatar/u?v=1" }));

    expect(screen.getByText(/Everything else is working/)).toBeTruthy();
    expect(screen.getByText(/your current picture is unchanged/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  /** 27e draws the answer: the picture, an arrow, and the initials it goes back to. */
  it("asks before removing, and says where it comes off", () => {
    draw(logicWith({ url: "/api/v1/avatar/u?v=1", confirmingRemove: true }));

    expect(screen.getByText("Remove your picture?")).toBeTruthy();
    expect(screen.getByText(/goes back to your initials/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Keep it" })).toBeTruthy();
  });
});
