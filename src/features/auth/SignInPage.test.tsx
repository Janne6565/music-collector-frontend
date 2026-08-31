// The page is mostly translated strings, so the real bundle is what it is rendered with.
import "@/i18n/config";
import { SignInPage } from "@/features/auth/SignInPage";
import type { useAuthLogic } from "@/features/auth/useAuthLogic";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ logic: vi.fn(), navigate: vi.fn(), search: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { readonly children: ReactNode }) => <a {...rest}>{children}</a>,
  useNavigate: () => mocked.navigate,
  useSearch: () => mocked.search(),
}));
vi.mock("@/features/auth/useAuthLogic", () => ({ useAuthLogic: mocked.logic }));

type Auth = { status: string; firstSyncPending: boolean };

function page(auth: Auth, search: Record<string, unknown> = {}) {
  mocked.search.mockReturnValue(search);
  mocked.logic.mockReturnValue({
    auth: { ...auth, user: null },
    mode: "SIGN_IN",
    setMode: vi.fn(),
    email: "",
    setEmail: vi.fn(),
    password: "",
    setPassword: vi.fn(),
    displayName: "",
    setDisplayName: vi.fn(),
    rememberMe: true,
    setRememberMe: vi.fn(),
    agreed: false,
    setAgreed: vi.fn(),
    ageConfirmed: false,
    setAgeConfirmed: vi.fn(),
    availableProviders: [],
    canSubmit: false,
    submit: vi.fn(),
    submitting: false,
    failed: [],
    signOut: vi.fn(),
    signingOut: false,
  } as unknown as ReturnType<typeof useAuthLogic>);
  render(<SignInPage />);
}

describe("the sign-in page when there is nothing to sign in to", () => {
  beforeEach(() => {
    mocked.navigate.mockClear();
  });

  it("hands a signed-in visitor their shelf instead of the form", () => {
    page({ status: "signedIn", firstSyncPending: false });

    expect(mocked.navigate).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  it("waits for the session to be restored rather than acting on 'not anonymous'", () => {
    // The refresh cookie is exchanged after the first paint; until it is, nobody is known.
    page({ status: "unknown", firstSyncPending: false });

    expect(mocked.navigate).not.toHaveBeenCalled();
  });

  it("sends a pending first sync to the library, which is where it is now asked", () => {
    // 29: the conflict dialogue is mounted above the router and drawn over the shelf, so
    // staying on this page would leave the question floating over a form nobody needs.
    page({ status: "signedIn", firstSyncPending: true });

    expect(mocked.navigate).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  it("does not sweep away a failed provider sign-in", () => {
    // It lands here to be told about, and the browser may still hold an older session.
    page({ status: "signedIn", firstSyncPending: false }, { oauthError: "true" });

    expect(mocked.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /Welcome back|Sign in/i })).toBeDefined();
  });
});
