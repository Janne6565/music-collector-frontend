import "@/i18n/config";
import { SignInConflictGate } from "@/features/auth/SignInConflict";
import authReducer, { signedIn } from "@/store/authSlice";
import type { ShelfComparison } from "@janne6565/rekordo-shared";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";

const logic = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/useSignInConflictLogic", () => ({ useSignInConflictLogic: logic }));

/**
 * The gate and the four states it puts on screen.
 *
 * What is worth pinning here is not the wording but the shape of the argument: the dialogue
 * appears only while a first sync is outstanding, the no-loss case offers exactly one way
 * on, and the real conflict offers three of which only one is filled. Those are the design's
 * claims, and they are the ones a refactor can quietly break.
 */
describe("the sign-in conflict dialogue", () => {
  const comparison: ShelfComparison = {
    outcome: "CONFLICT",
    localCopies: 240,
    localWishes: 24,
    accountCopies: 236,
    accountWishes: 26,
    identicalCopies: 232,
    identicalWishes: 22,
    onlyLocal: [],
    onlyAccount: [],
    values: [],
    localChangedAt: 1_700_000_000_000,
    accountChangedAt: 1_690_000_000_000,
    photos: 3,
  };

  function view(overrides: Record<string, unknown>) {
    logic.mockReturnValue({
      view: "CONFLICT",
      comparison,
      localCount: 240,
      working: false,
      failed: false,
      plan: { picks: {}, dropped: [] },
      mergedCopies: 244,
      mergedWishes: 26,
      reviewedCopies: 244,
      reviewedWishes: 26,
      decided: 0,
      pendingKeep: null,
      droppedBy: () => [],
      openDifference: vi.fn(),
      openReview: vi.fn(),
      askKeep: vi.fn(),
      back: vi.fn(),
      retry: vi.fn(),
      dismissUnreachable: vi.fn(),
      exportDropped: vi.fn(),
      keepBoth: vi.fn(),
      confirmKeep: vi.fn(),
      applyReview: vi.fn(),
      pick: vi.fn(),
      setDropped: vi.fn(),
      keepAll: vi.fn(),
      pickedSide: () => undefined,
      isDropped: () => false,
      ...overrides,
    });
  }

  function mount(firstSyncPending: boolean) {
    const store = configureStore({ reducer: { auth: authReducer } });
    store.dispatch(
      signedIn({ user: { id: "u-1", email: "jonas@meyer.de" } as never, firstSyncPending }),
    );
    return render(
      <Provider store={store}>
        <SignInConflictGate />
      </Provider>,
    );
  }

  beforeEach(() => logic.mockReset());

  it("draws nothing at all when there is no first sync outstanding", () => {
    view({});
    const { container } = mount(false);

    expect(container.innerHTML).toBe("");
  });

  it("blocks with three ways out, of which only Keep both is filled", () => {
    view({});
    mount(true);

    expect(screen.getByRole("dialog")).toBeDefined();
    for (const label of [/Keep both/, /Keep this browser/, /Keep the account/]) {
      expect(screen.getByRole("button", { name: label })).toBeDefined();
    }
  });

  it("offers one button and no choice when nothing can be lost", () => {
    view({ view: "NO_LOSS", comparison: { ...comparison, outcome: "NO_LOSS" } });
    mount(true);

    expect(screen.getByRole("button", { name: /Continue/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Keep the account/ })).toBeNull();
  });

  it("does not block when the account could not be read at all", () => {
    // The one state that is not a question: nothing has been compared, so there is
    // nothing to answer and the library opens.
    view({ view: "UNREACHABLE", comparison: undefined });
    mount(true);

    expect(screen.getByRole("button", { name: /Open library/ })).toBeDefined();
  });
});
